"""Public historical export for Respira's own sensors (RES-439).

One download, open to anyone: from a sensor's public page a visitor picks a date
range and gets its raw measurements as a spreadsheet or as JSON, with no account
and no institutional contract. It is the free tier of the historical-data
offering, which is why the range it will serve is capped — see
``FREE_TIER_DAYS``.

Kept apart from ``exports.py`` on purpose. That module serves the institutional
panel, where the CSV deliberately clones AirGradient's own portal format so an
institution's two files are interchangeable. Nothing here may disturb that, so
this module *imports* its helpers and never edits them; the two exports differ in
audience, in format and in what they are allowed to reveal, and pushing them
through one code path would have meant one set of compromises for both.

Measurements are read live from the sensor API rather than from
``station_readings_gold``: gold keeps only the particulate columns the forecast
needs, and a citizen asking for "the data" should get CO2, temperature, humidity
and the VOC/NOx indices too — the same reasoning that put the institutional
export on the same source.

**On what this endpoint reveals.** The browser only ever talks to us; the
provider's token stays on the server. So the files this module writes use
Respira's own vocabulary — our station id, our column names — and never name the
upstream provider, in a header, a filename or an error message. What a reader
can see is that Respira publishes Respira's data. Note that this is about not
volunteering an implementation detail, not a security boundary: the endpoint is
unauthenticated by design, and what actually bounds abuse is the throttle on it
(``public_export`` in ``settings.DEFAULT_THROTTLE_RATES``) plus the free-tier
window enforced below against the server's clock.
"""

from __future__ import annotations

import io
import json
import logging
from datetime import datetime, timedelta
from datetime import timezone as dt_timezone
from typing import Any

from django.utils import timezone
from django.utils.text import slugify
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font
from openpyxl.utils import get_column_letter
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .airgradient import AirGradientError, fetch_past_measures, location_id_for_station
from .exports import (
    REPORT_TIME_ZONE,
    _attachment,
    _localise,
    _number,
    _parse_date,
    _range_bounds,
    _stamp_rows,
)
from .models import Stations

logger = logging.getLogger(__name__)

# How far back the free tier reaches: "the last 3 months".
#
# 92 days rather than 90, because the promise is three *calendar* months and the
# longest of those runs to 92 days (July + August + a 31-day neighbour). Rounding
# to 90 would have made the picker refuse two days a visitor was told they could
# have, which reads as a bug rather than as a tier boundary.
FREE_TIER_DAYS = 92

# A single file cannot cover more than the window it is drawn from, so the two
# are the same number. Kept as its own constant because they answer different
# questions — "how far back may you reach" against "how much may one file carry"
# — and a paid tier reaching further back would still want a per-file cap.
MAX_PUBLIC_EXPORT_DAYS = FREE_TIER_DAYS

# Where the picker opens when the caller names no range. Short enough to arrive
# quickly — every 10 days of range is another upstream call — and a month is the
# span most people seem to want first.
DEFAULT_PUBLIC_EXPORT_DAYS = 30

FORMAT_XLSX = "xlsx"
FORMAT_JSON = "json"
SUPPORTED_FORMATS = (FORMAT_XLSX, FORMAT_JSON)

# The query parameter naming the file format.
#
# Not `format`: DRF reserves that name for content negotiation
# (`URL_FORMAT_OVERRIDE`), so `?format=csv` was resolved as a renderer lookup
# and answered 404 before this view's own validation ever ran. `output` is ours
# and reaches the view untouched.
FORMAT_PARAM = "output"

XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

# Always present, so the frontend can tell "the sensor reported nothing in this
# period" from "the export failed" without parsing the file it just downloaded.
ROW_COUNT_HEADER = "X-Respira-Export-Rows"

# Counts sub-ranges the provider could not serve. Same name and meaning as the
# institutional export's, so a reader of either endpoint learns it once.
PARTIAL_HEADER = "X-Respira-Partial-Export"


# --- rows -------------------------------------------------------------------

# Column titles and the API field behind each, in file order. Deliberately our
# own names and our own units rather than the provider's labels.
#
# Oldest row first, unlike the institutional CSV: that one is newest-first only
# because AirGradient's export is, and here nothing has to match. Ascending time
# is what a chart or a dataframe wants without being told to sort.
_COLUMNS: list[tuple[str, str]] = [
    ("PM1 (µg/m³)", "pm01"),
    ("PM2.5 (µg/m³)", "pm02"),
    ("PM10 (µg/m³)", "pm10"),
    ("CO2 (ppm)", "rco2"),
    ("Temperatura (°C)", "atmp"),
    ("Humedad (%)", "rhum"),
    ("Índice VOC", "tvocIndex"),
    ("Índice NOx", "noxIndex"),
]

# The JSON keys for the same measurements: snake_case, ASCII, unit-free, since a
# consumer reads these in code rather than on a screen.
_JSON_KEYS: dict[str, str] = {
    "pm01": "pm1",
    "pm02": "pm2_5",
    "pm10": "pm10",
    "rco2": "co2",
    "atmp": "temperature",
    "rhum": "humidity",
    "tvocIndex": "voc_index",
    "noxIndex": "nox_index",
}

_SHEET_COLUMNS = ["Sensor", "Sensor ID", "Fecha/Hora (local)", "Fecha/Hora (UTC)"] + [
    title for title, _ in _COLUMNS
]


def _utc_stamp(moment: datetime | None) -> str:
    if moment is None:
        return ""
    return moment.astimezone(dt_timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _local_stamp(moment: datetime | None) -> str:
    local = _localise(moment)
    return local.strftime("%Y-%m-%d %H:%M:%S") if local else ""


def build_public_export_xlsx(station, rows: list[dict[str, Any]]) -> bytes:
    """The measurements as a spreadsheet.

    Timestamps are written as text, not as Excel dates: a serial date renders
    through the reader's own locale and timezone settings, which silently turns
    a Paraguayan reading into some other hour on a machine configured
    elsewhere. Text says exactly what was measured when, and the column headers
    say which zone each one is in.
    """
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Mediciones"

    sheet.append(_SHEET_COLUMNS)
    header = Font(bold=True)
    for cell in sheet[1]:
        cell.font = header
        cell.alignment = Alignment(vertical="center")
    # So the headers stay put while scrolling a quarter of 5-minute readings.
    sheet.freeze_panes = "A2"

    name = station.name or ""
    for row in rows:
        moment = row.get("_moment")
        sheet.append(
            [
                name,
                station.id,
                _local_stamp(moment),
                _utc_stamp(moment),
                *(_number(row.get(field)) for _, field in _COLUMNS),
            ]
        )

    for index, title in enumerate(_SHEET_COLUMNS, start=1):
        # Room for the header itself plus a little slack; the timestamp columns
        # are the widest content and still fit inside their own titles.
        sheet.column_dimensions[get_column_letter(index)].width = max(
            len(title) + 2, 12
        )

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def build_public_export_json(station, rows: list[dict[str, Any]], start, end) -> bytes:
    """The measurements as JSON, with enough context to stand on their own.

    The envelope names the sensor, the range and the zone its local timestamps
    are in, so a file that has been moved, renamed or mailed on can still be
    read correctly. Every measurement carries both timestamps for the same
    reason the spreadsheet does.
    """
    details = getattr(station, "details", None)
    payload = {
        "sensor": {
            "id": station.id,
            "name": station.name,
            "city": getattr(details, "city", None) if details else None,
        },
        "range": {
            "from": start.isoformat(),
            "to": end.isoformat(),
            "timezone": str(REPORT_TIME_ZONE),
        },
        "measurement_count": len(rows),
        "measurements": [
            {
                "timestamp_local": _local_stamp(row.get("_moment")),
                "timestamp_utc": _utc_stamp(row.get("_moment")),
                **{key: _number(row.get(field)) for field, key in _JSON_KEYS.items()},
            }
            for row in rows
        ],
    }
    # `ensure_ascii=False` so accented sensor names stay readable in the file.
    return json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")


def _filename(station, start, end, extension: str) -> str:
    """A filename naming the sensor and the range, e.g.
    ``respira-villa-morra-2026-07-01-2026-07-31.xlsx``.

    Most of the fleet is already named "Respira: <somewhere>", which prefixed
    naively gives ``respira-respira-villa-morra-…`` — the same stutter the
    institutional filenames drop for station names that repeat their
    institution. The prefix is what marks the file as ours once it has been
    saved and mailed on, so it is the duplicate that goes, not the prefix.
    """
    slug = slugify(station.name or "") or f"sensor-{station.id}"
    if slug.startswith("respira-"):
        slug = slug[len("respira-") :]
    return f"respira-{slug}-{start.isoformat()}-{end.isoformat()}.{extension}"


# --- view -------------------------------------------------------------------


@extend_schema(
    tags=["Public data"],
    summary="Download a Respira sensor's recent measurement history",
    description=(
        "Every measurement a Respira sensor recorded in the requested range, "
        "as a spreadsheet or as JSON. Open to anyone: no account is needed. "
        "The free tier serves the last "
        f"{FREE_TIER_DAYS} days; an earlier `from` is refused. With no range "
        f"given it returns the last {DEFAULT_PUBLIC_EXPORT_DAYS} days. Returns "
        "404 when the sensor does not exist or does not offer a public export, "
        "400 when the range is invalid or reaches past the free tier, and 429 "
        "when the caller has requested too many exports. An "
        f"`{ROW_COUNT_HEADER}` header counts the measurements in the file, so "
        "an empty period is distinguishable from a failure."
    ),
    parameters=[
        OpenApiParameter(
            name="from",
            type=OpenApiTypes.DATE,
            location=OpenApiParameter.QUERY,
            required=False,
            description=(
                "First day to include (YYYY-MM-DD). Defaults to "
                f"{DEFAULT_PUBLIC_EXPORT_DAYS} days before the end date."
            ),
        ),
        OpenApiParameter(
            name="to",
            type=OpenApiTypes.DATE,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Last day to include (YYYY-MM-DD, inclusive). Defaults to today.",
        ),
        OpenApiParameter(
            name=FORMAT_PARAM,
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            required=False,
            enum=list(SUPPORTED_FORMATS),
            description="File format. Defaults to xlsx.",
        ),
    ],
    responses={(200, XLSX_CONTENT_TYPE): OpenApiTypes.BINARY},
)
class PublicStationExportView(APIView):
    """The free-tier historical export, open to anyone.

    Unauthenticated by design, so every limit it has to enforce is enforced
    here rather than in the page that calls it: a hand-written URL gets the
    same answer the picker would have allowed. The frontend repeats these
    bounds in its date inputs only to explain them earlier, never to enforce
    them.
    """

    permission_classes = [AllowAny]
    http_method_names = ["get"]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_export"

    def get(self, request, station_id: int, *args, **kwargs):
        station = Stations.objects.filter(pk=station_id).first()
        if station is None:
            raise NotFound("No such sensor.")

        # Eligibility, checked on the server rather than trusted from the page:
        # only sensors Respira operates are exported, which today means the ones
        # carrying a provider identity. A sensor from another network reaches
        # gold through the pipeline but has no raw history we can serve.
        try:
            location_id = location_id_for_station(station)
        except AirGradientError:
            raise NotFound("This sensor does not offer a public data export.")

        export_format = (request.query_params.get(FORMAT_PARAM) or FORMAT_XLSX).lower()
        if export_format not in SUPPORTED_FORMATS:
            raise ValidationError(
                {
                    FORMAT_PARAM: (
                        "Unsupported format. Choose one of: "
                        f"{', '.join(SUPPORTED_FORMATS)}."
                    )
                }
            )

        today = timezone.now().astimezone(REPORT_TIME_ZONE).date()
        end = _parse_date(request.query_params.get("to"), "to") or today
        start = _parse_date(request.query_params.get("from"), "from") or (
            end - timedelta(days=DEFAULT_PUBLIC_EXPORT_DAYS - 1)
        )

        if end < start:
            raise ValidationError({"to": "The end date cannot precede the start date."})

        # The free-tier floor, measured from the server's clock so it cannot be
        # moved by anything the caller sends.
        earliest = today - timedelta(days=FREE_TIER_DAYS - 1)
        if start < earliest:
            raise ValidationError(
                {
                    "from": (
                        f"The public export covers the last {FREE_TIER_DAYS} days. "
                        f"Choose a start date on or after {earliest.isoformat()}."
                    )
                }
            )
        # A future `to` is not an error — a range ending tomorrow simply has
        # nothing yet in its tail — but it must not be a way to widen the
        # window, so it is clamped before the span is measured.
        if end > today:
            end = today

        span = (end - start).days + 1
        if span > MAX_PUBLIC_EXPORT_DAYS:
            raise ValidationError(
                {
                    "from": (
                        f"The selected range covers {span} days, over the "
                        f"{MAX_PUBLIC_EXPORT_DAYS} a single export may carry."
                    )
                }
            )

        # `end` is inclusive for the caller; the fetch bound is exclusive.
        lower, upper = _range_bounds(start, end + timedelta(days=1))

        try:
            result = fetch_past_measures(location_id, lower, upper)
        except AirGradientError:
            logger.exception(
                "Public export could not reach the measurement provider for station %s",
                station.pk,
            )
            # Deliberately says nothing about who the provider is, and nothing
            # about tokens or configuration: this message is read by the public.
            raise ValidationError(
                {
                    "detail": (
                        "The measurement data is unavailable right now. Please "
                        "try again in a few minutes."
                    )
                }
            )

        rows = [
            row
            for row in _stamp_rows(result.rows)
            if row.get("_moment") is not None and lower <= row["_moment"] < upper
        ]

        if export_format == FORMAT_JSON:
            content = build_public_export_json(station, rows, start, end)
            content_type = "application/json; charset=utf-8"
        else:
            content = build_public_export_xlsx(station, rows)
            content_type = XLSX_CONTENT_TYPE

        response = _attachment(
            content, _filename(station, start, end, export_format), content_type
        )
        # Always set, including on an empty period: it is how the page tells
        # "no measurements" from "something went wrong".
        response[ROW_COUNT_HEADER] = str(len(rows))
        if result.failed_windows:
            # Served anyway — a partial history beats an error page — with the
            # gap stated rather than left to be noticed.
            response[PARTIAL_HEADER] = str(result.failed_windows)
        return response
