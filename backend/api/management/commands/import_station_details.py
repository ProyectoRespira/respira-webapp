"""One-time import of the Sensor Registry spreadsheet into ``station_details``.

Takes a CSV export of the sheet (File > Download > Comma-separated values).
Nothing here writes to ``stations``: that table is owned by the dbt gold
pipeline, and the import only ever creates or updates the backend-owned
``StationDetails`` record hanging off it.
"""

import csv
import unicodedata
from datetime import datetime
from itertools import takewhile

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import StationDetails, Stations


def normalise(text):
    """Fold a header for matching: lowercase, no accents, no ordinal marks or
    periods, collapsed spaces.

    The sheet is maintained by hand, so "N° de serie", "Nro. de Serie" and
    "No de serie " all have to resolve to the same column.
    """
    stripped = "".join(
        char
        for char in unicodedata.normalize("NFD", text or "")
        if unicodedata.category(char) != "Mn"
    )
    for noise in ("°", "º", "."):
        stripped = stripped.replace(noise, "")
    return " ".join(stripped.split()).lower()


# Spreadsheet header -> StationDetails field. Keys are already normalised.
COLUMN_MAP = {
    normalise(header): field
    for header, field in {
        "N° de serie": "serial_number",
        "No de serie": "serial_number",
        "Nro de serie": "serial_number",
        "Número de serie": "serial_number",
        "Serial": "serial_number",
        "Tipo de Sensor": "sensor_type",
        "Modelo": "model",
        "Ciudad": "city",
        "Ubicación específica": "specific_location",
        "Localidad": "locality",
        "Tipo de entorno": "environment_type",
        "Conectividad": "connectivity",
        "Energía": "power_source",
        "Fecha instalación": "installation_date",
        "Fecha de instalación": "installation_date",
        "Responsable": "responsible",
        "Contacto": "contact_info",
        "Notas": "notes",
    }.items()
}

# Columns that can identify the station a row describes, in the order they are
# tried. The sheet has no single one: the FIUNA rows carry "Estación 1"… in
# "ID Sensor" and the real name in "Localidad", while the newer sensors put the
# site name in "ID Sensor" and a sub-location in "Localidad".
STATION_HEADERS = tuple(
    normalise(header)
    for header in (
        "ID Sensor",
        "Estación",
        "Estacion",
        "Station",
        "Nombre",
        "Localidad",
    )
)

# In the sheet with no home in StationDetails. Listed so they are skipped
# quietly instead of reported as unmapped columns.
IGNORED_HEADERS = tuple(
    normalise(header)
    for header in ("Prioridad", "Estado", "Anterior", "Departamento", "Fecha apagado")
)

# The sheet is filled in by hand, so accept the formats operators actually use.
DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y")


class Command(BaseCommand):
    help = (
        "Import the Sensor Registry spreadsheet into station_details from a CSV "
        "export. Rows are matched to a station by name. Idempotent: re-running "
        "updates in place, and a blank cell never clears a stored value, so a "
        "partially filled sheet can be imported repeatedly. Use --dry-run first "
        "to review the station matching without writing anything."
    )

    def add_arguments(self, parser):
        parser.add_argument("csv_path", help="CSV export of the sheet.")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing anything.",
        )

    def handle(self, *args, **options):
        all_rows = self._read(options["csv_path"])
        if not all_rows:
            raise CommandError("The CSV has no data rows.")
        self._report_unmapped_columns(all_rows[0])

        # The sheet ends with a legend block ("Sensores", "Open Air Max",
        # "Referencias"…) separated from the data by blank rows. Stopping at the
        # first blank row is the spreadsheet convention and, unlike keying on
        # some particular column, does not care which columns the export has.
        rows = list(takewhile(lambda row: not self._is_blank(row), all_rows))
        trailing = len(all_rows) - len(rows)
        if trailing:
            self.stdout.write(
                f"Stopped at the first blank row; ignored {trailing} trailing row(s)."
            )
        if not rows:
            raise CommandError("The CSV has no data rows before the first blank row.")

        created = updated = skipped = 0
        with transaction.atomic():
            for line_number, row in enumerate(rows, start=2):
                station = self._match_station(row, line_number)
                if station is None:
                    skipped += 1
                    continue
                name = self._candidate_names(row)[0]

                values = self._values(row, line_number)
                details = StationDetails.objects.filter(station=station).first()
                if details is None:
                    StationDetails.objects.create(station=station, **values)
                    created += 1
                    action = "create"
                else:
                    for field, value in values.items():
                        setattr(details, field, value)
                    details.save()
                    updated += 1
                    action = "update"

                if options["dry_run"]:
                    self.stdout.write(
                        f"  line {line_number}: {name!r} -> {station.name} "
                        f"({action}, {len(values)} field(s))"
                    )

            if options["dry_run"]:
                # Roll back rather than skipping the writes, so the report above
                # reflects exactly what a real run would do.
                transaction.set_rollback(True)

        summary = (
            f"{created} created, {updated} updated, {skipped} skipped "
            f"of {len(rows)} data row(s)."
        )
        if options["dry_run"]:
            self.stdout.write(f"Dry run — nothing written. Would be: {summary}")
        else:
            self.stdout.write(self.style.SUCCESS(summary))

    def _read(self, csv_path):
        try:
            # utf-8-sig: Google Sheets exports carry a BOM.
            with open(csv_path, encoding="utf-8-sig", newline="") as handle:
                return list(csv.DictReader(handle))
        except OSError as exc:
            raise CommandError(f"Cannot read {csv_path}: {exc}") from exc

    @staticmethod
    def _by_header(row):
        return {
            normalise(header): (value or "").strip() for header, value in row.items()
        }

    @staticmethod
    def _is_blank(row):
        return not any((value or "").strip() for value in row.values())

    def _candidate_names(self, row):
        cells = self._by_header(row)
        return [cells[header] for header in STATION_HEADERS if cells.get(header)]

    def _match_station(self, row, line_number):
        """Resolve a sheet row to a station, or report why it could not be.

        Each identifier column is tried in turn, since no single one holds the
        station name for every row. The gold pipeline also prefixes names by
        source ("MADES: Costanera") while the sheet carries the bare name, so an
        exact match is tried first and a suffix match second.
        """
        names = self._candidate_names(row)
        if not names:
            self.stderr.write(f"line {line_number}: no station name; skipped.")
            return None

        for name in names:
            matches = list(Stations.objects.filter(name__iexact=name)) or list(
                Stations.objects.filter(name__iendswith=f": {name}")
            )
            if len(matches) == 1:
                return matches[0]
            if len(matches) > 1:
                # Guessing here would attach metadata to the wrong station.
                self.stderr.write(
                    f"line {line_number}: {name!r} matches "
                    + ", ".join(station.name for station in matches)
                    + "; skipped."
                )
                return None

        self.stderr.write(
            f"line {line_number}: no station matches "
            + " or ".join(repr(name) for name in names)
            + "; skipped."
        )
        return None

    def _values(self, row, line_number):
        values = {}
        for header, value in row.items():
            field = COLUMN_MAP.get(normalise(header))
            if field is None:
                continue
            cleaned = (value or "").strip()
            # A blank cell means "the sheet doesn't know", not "clear it".
            if not cleaned:
                continue
            if field == "installation_date":
                cleaned = self._parse_date(cleaned, line_number)
                if cleaned is None:
                    continue
            values[field] = cleaned
        return values

    def _parse_date(self, value, line_number):
        for date_format in DATE_FORMATS:
            try:
                return datetime.strptime(value, date_format).date()
            except ValueError:
                continue
        # Worth importing the rest of the row rather than losing it to one cell.
        self.stderr.write(
            f"line {line_number}: cannot read installation date {value!r}; "
            "left unchanged."
        )
        return None

    def _report_unmapped_columns(self, row):
        known = set(COLUMN_MAP) | set(STATION_HEADERS) | set(IGNORED_HEADERS)
        unmapped = [header for header in row if normalise(header) not in known]
        if unmapped:
            self.stdout.write(
                "Columns with no matching field (ignored): "
                + ", ".join(sorted(unmapped))
            )
