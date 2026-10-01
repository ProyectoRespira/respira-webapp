import { useEffect, useId, useState } from "react";
import { useStore } from "@nanostores/react";

import { useClientTranslations } from "../../../i18n/client";
import { statisticsSelectedStation } from "../../../store/statistics";
import {
  PublicExportError,
  downloadStationExport,
  type ExportFormat,
} from "../../../store/public-export";
import {
  Button,
  Card,
  CardHead,
  CardTitle,
  DateField,
  DownloadIcon,
  HelpDisclosure,
  Select,
} from "../ui";

/**
 * Mirrors `FREE_TIER_DAYS` in `api/public_exports.py`.
 *
 * Duplicated rather than fetched, for the same reason the panel duplicates its
 * own export cap: it is a stable boundary, and knowing it here lets the picker
 * refuse an out-of-range date instead of spending a round trip on a request the
 * server will reject. The server stays the authority — this only moves the
 * explanation earlier.
 */
const FREE_TIER_DAYS = 92;

/** Where the picker opens: a month back, like the backend's own default. */
const DEFAULT_RANGE_DAYS = 30;

/** Today in Asunción as `YYYY-MM-DD` — the latest date worth offering. */
const todayInAsuncion = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Asuncion",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const addDays = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  // Noon, so a DST shift cannot roll the date over. Paraguay has no DST since
  // 2024, but this runs in the visitor's own zone, which may well have it.
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const daysBetween = (from: string, to: string): number =>
  (new Date(`${to}T12:00:00`).getTime() -
    new Date(`${from}T12:00:00`).getTime()) /
    86_400_000 +
  1;

/**
 * The free-tier data export on a sensor's public page (RES-439).
 *
 * The citizen-facing counterpart of the panel's raw export: same shape — a date
 * range, a format, a button — but open to anyone, and capped at the last three
 * months.
 *
 * Renders nothing at all for a sensor that has no public export, rather than
 * explaining its absence the way the panel does. The panel's reader is an
 * institution that may have seen the download elsewhere and is owed an account
 * of why it is missing; a passer-by reading about a FIUNA sensor is owed no
 * explanation of a product tier they were never offered, and a paragraph about
 * it would be noise on a page about air quality.
 */
export function HistoryExport() {
  const t = useClientTranslations();
  const station = useStore(statisticsSelectedStation);
  const fromId = useId();
  const toId = useId();
  const formatId = useId();

  const today = todayInAsuncion();
  const earliest = addDays(today, -(FREE_TIER_DAYS - 1));

  const [to, setTo] = useState(today);
  const [from, setFrom] = useState(() =>
    addDays(today, -(DEFAULT_RANGE_DAYS - 1)),
  );
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [tone, setTone] = useState<"error" | "notice">("error");

  // A range chosen for one sensor stays on screen when the visitor navigates to
  // another; clearing the outcome keeps a stale "no measurements" from reading
  // as if it were about the sensor now shown.
  useEffect(() => {
    setMessage(undefined);
  }, [station?.id]);

  // Nothing to export from, and nothing to say about it.
  if (!station) return null;
  if (station.supports_public_export !== true) return null;

  // Clearing a date input leaves an empty string, which dates as `Invalid Date`
  // — every comparison against it is false, so an unguarded range reads as
  // valid. Missing is its own state: not inverted, not out of range, just not
  // answerable yet.
  const incomplete = !from || !to;
  const inverted = !incomplete && from > to;
  const tooOld = !incomplete && from < earliest;
  const invalid = incomplete || inverted || tooOld;

  const spanDays = invalid ? 0 : Math.round(daysBetween(from, to));

  const blockedMessage = incomplete
    ? t("stats.export.rangeIncomplete")
    : inverted
      ? t("stats.export.rangeInverted")
      : tooOld
        ? t("stats.export.rangeTooOld").replace(
            "{days}",
            String(FREE_TIER_DAYS),
          )
        : undefined;

  const handleDownload = async () => {
    setBusy(true);
    setMessage(undefined);
    try {
      const { rowCount, missingRanges } = await downloadStationExport(
        station.id,
        { from, to, format },
      );
      if (rowCount === 0) {
        // The file still downloaded — the server answered 200 and the browser
        // has it — but an empty spreadsheet explains nothing on its own, so the
        // reason is said here rather than left to be inferred.
        setTone("notice");
        setMessage(t("stats.export.noData"));
      } else if (missingRanges > 0) {
        setTone("notice");
        setMessage(t("stats.export.partial"));
      }
    } catch (error) {
      setTone("error");
      if (error instanceof PublicExportError) {
        setMessage(
          error.code === "throttled"
            ? t("stats.export.throttled")
            : error.code === "invalid-range"
              ? t("stats.export.rangeTooOld").replace(
                  "{days}",
                  String(FREE_TIER_DAYS),
                )
              : t("stats.export.error"),
        );
      } else {
        setMessage(t("stats.export.error"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    // Centred, and deliberately narrower than the page's gutters allow: 56rem
    // is about where three short fields and a button fill the row with nothing
    // left over. Full width was tried and reverted — the controls stop growing
    // well before the page does, so the remainder was empty space to their
    // right, and the card read as a blank panel rather than a generous one.
    // The charts below genuinely use the width; this does not.
    <Card tone="main" className="mx-auto w-full max-w-4xl">
      <CardHead>
        <CardTitle level="main">{t("stats.export.title")}</CardTitle>
      </CardHead>

      {/* `gap-2` here and on the notes block below, matching each other: the
          card separates its own blocks with `gap-5`, and an inner rhythm of 6px
          against that 20px made the jump read as uneven. 8px inside, 20px
          between, is a ratio the eye reads as deliberate. */}
      <div className="flex flex-col gap-2">
        <p className="m-0 text-sm leading-snug text-gray">
          {t("stats.export.subtitle")}
        </p>
        <HelpDisclosure
          toggle={t("stats.export.helpToggle")}
          body={t("stats.export.help")}
        />
      </div>

      {/* Flex-wrap rather than a grid: fixed columns would divide the row
          evenly whatever its width, which on a wide card stretches a date
          input past any useful size and on a narrow one squeezes it below
          legibility. `basis-52` with `flex-1` instead lets each control share
          the row at middling widths, stop growing at `sm:max-w-xs`, and drop
          to one per line on a phone — where 13rem still clears the ~320px of
          the narrowest screens, so nothing scrolls sideways. */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 basis-52 flex-col gap-1 sm:max-w-xs">
          <label
            htmlFor={fromId}
            className="text-[11px] uppercase tracking-wide text-lightgray"
          >
            {t("stats.export.from")}
          </label>
          {/* `min`/`max` make a date outside the free tier unpickable rather
              than merely rejected once submitted. */}
          <DateField
            id={fromId}
            value={from}
            onChange={setFrom}
            min={earliest}
            max={today}
          />
        </div>
        <div className="flex flex-1 basis-52 flex-col gap-1 sm:max-w-xs">
          <label
            htmlFor={toId}
            className="text-[11px] uppercase tracking-wide text-lightgray"
          >
            {t("stats.export.to")}
          </label>
          <DateField
            id={toId}
            value={to}
            onChange={setTo}
            min={from || earliest}
            max={today}
          />
        </div>
        <div className="flex flex-1 basis-52 flex-col gap-1 sm:max-w-xs">
          <label
            htmlFor={formatId}
            className="text-[11px] uppercase tracking-wide text-lightgray"
          >
            {t("stats.export.format")}
          </label>
          <Select
            id={formatId}
            value={format}
            onChange={(value) => setFormat(value as ExportFormat)}
          >
            <option value="xlsx">{t("stats.export.formatXlsx")}</option>
            <option value="json">{t("stats.export.formatJson")}</option>
          </Select>
        </div>

        {/* In the same row as the fields, so the card reads as one line of
            controls rather than as a form with its button orphaned below, but
            behind a rule: flush against them it read as a fourth field instead
            of as the action the other three lead up to. A margin would not do
            the same job — the fields grow to fill the row, so there is no
            slack left for one to take.

            Mobile-first (`w-full`, then `sm:w-auto`): on a phone it wraps to
            its own line with the full-width tap target the fields have, and on
            a wider screen it takes only the width of its own label. */}
        <div className="w-full sm:ml-1 sm:w-auto sm:border-l sm:border-bg-gray sm:pl-4">
          <Button
            variant="color"
            block
            onClick={handleDownload}
            disabled={busy || invalid}
          >
            <DownloadIcon />
            {busy ? t("stats.export.preparing") : t("stats.export.download")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* One line, not two. The chosen range and the tier's ceiling were
            separate notes of the same size and colour, stacked — which read as
            a single grey block the eye skims rather than as two facts. Joined
            by a middot, the range leads and the limit sits behind it as the
            secondary detail it is, and it still explains why the calendar
            stops where it does before anyone runs into that edge. */}
        {blockedMessage ? (
          <span role="alert" className="text-[12px] text-gray">
            {blockedMessage}
          </span>
        ) : (
          <span className="text-[12px] text-lightgray">
            {(spanDays === 1
              ? t("stats.export.rangeDaysOne")
              : t("stats.export.rangeDays").replace("{days}", String(spanDays))
            ).replace("{max}", String(FREE_TIER_DAYS))}
          </span>
        )}

        {message && (
          <span
            role="alert"
            className={
              // A finished download with nothing in it, or with gaps, is not a
              // failure: it reads in the muted tone rather than the error red.
              tone === "notice"
                ? "text-[12px] text-gray"
                : "text-[12px] text-aqi-red-dark"
            }
          >
            {message}
          </span>
        )}
      </div>
    </Card>
  );
}
