import { useEffect, useId, useState, type ReactNode } from "react";

import type {
  DashboardSensor,
  InstitutionContract,
} from "../../../data/institution";
import type { Lang } from "../../../i18n/config";
import { useInstitutionCopy } from "../../../i18n/institution";
import {
  InstitutionApiError,
  downloadInstitutionFile,
  fetchReportMonths,
  type DownloadKind,
  type ReportMonth,
} from "../../../store/institution";
import { formatMonthName } from "../../../utils/institution-format";
import { INSTITUTION_LOGIN_PATH } from "../../../utils/institution-session";
import {
  Button,
  Card,
  CardHead,
  CardTitle,
  DateField,
  DownloadIcon,
  HelpDisclosure,
  Select,
  Skeleton,
} from "./ui";

/**
 * Mirrors `MAX_EXPORT_DAYS` in `api/exports.py`.
 *
 * Duplicated rather than fetched: it is a stable guard, and knowing it here
 * lets the panel explain an over-long range before spending a round trip on a
 * request the server will refuse. The server stays the authority — this only
 * moves the message earlier.
 */
const MAX_EXPORT_DAYS = 366;

/**
 * The two-column split, keyed to the card's width rather than the window's.
 *
 * Plain CSS because Tailwind 3.4 has no container-query utilities without the
 * `@tailwindcss/container-queries` plugin, and one card does not justify adding
 * a build dependency. Scoped by class names so it cannot reach other cards.
 */
const DOWNLOAD_COLUMNS_CSS = `
.downloads-card { container-type: inline-size; }
@container (min-width: 560px) {
  .downloads-grid { grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .downloads-second {
    border-top: 0;
    padding-top: 0;
    /* The literal bg-gray token, since this rule is outside Tailwind. */
    border-left: 1px solid #DBD3D0;
    padding-left: 1.5rem;
  }
}
`;

/**
 * The two file exports, side by side (RES-433).
 *
 * They answer different questions — "how was last month?" against "give me the
 * numbers to work on myself" — and stacked they read as one long form whose
 * second half is merely more of the first. Two columns put them in parallel,
 * where the pair of headings and the pair of notes can be compared at a glance,
 * and each download plainly owns its own selector.
 *
 * Each button resolves its own 404 into "not available yet" and says so under
 * itself. State is per-button rather than per-card: a failing report must not
 * disable the spreadsheet, and vice versa.
 *
 * The raw export is read live from the sensor API, so it is slower than the
 * report and can come back with gaps; both cases surface under the button that
 * caused them.
 *
 * The raw column is dropped entirely for a sensor that has no raw history to
 * serve — see `supports_raw_export`. Hidden rather than disabled: a greyed-out
 * download invites the reader to work out what would enable it, and nothing
 * they can do would. The monthly report is built from the warehouse and works
 * for every network, so that half of the card is unaffected.
 */
export function DownloadCard({
  lang,
  contract,
  sensor,
}: {
  lang: Lang;
  contract?: InstitutionContract | null;
  sensor?: DashboardSensor | null;
}) {
  const copy = useInstitutionCopy(lang);
  // Absent on a backend that predates the field: keep offering the download
  // rather than hiding it from every panel the moment the frontend ships first.
  const hasRawExport = sensor?.supports_raw_export !== false;

  if (!hasRawExport) {
    return (
      <Card className="downloads-card">
        <CardHead>
          <CardTitle>{copy.downloadsTitle}</CardTitle>
        </CardHead>
        {/* One download left, so no grid and no dividing rule — the container
            query below exists to split a pair, and a lone column needs neither
            the split nor the border that separates it from a neighbour. */}
        <MonthlyReport lang={lang} />
      </Card>
    );
  }

  return (
    <Card className="downloads-card">
      <CardHead>
        <CardTitle>{copy.downloadsTitle}</CardTitle>
      </CardHead>
      {/* One column, splitting into two once the *card* is wide enough — a
          container query rather than a `md:` breakpoint, because what has to
          fit is the card, not the window. Screenshotting this at 1280px inside
          a narrow column showed why: viewport breakpoints split a 420px card
          into two columns on a wide screen, leaving each date field ~130px and
          rendering "08/1". The card is full width on the dashboard today, so
          only a future move would hit that — this makes the component correct
          wherever it is put, instead of correct only where it currently sits.

          560px is where two date fields, their labels and the gutter stop being
          cramped. Browsers without container-query support keep the stacked
          single column, which is the safe way to be wrong.

          A rule between the two rather than more whitespace: each download owns
          its own selector, so they need a visible boundary to stop one reading
          as if it applied to both. It turns with the layout — a top border when
          they are stacked, a left one when they sit side by side. */}
      <style>{DOWNLOAD_COLUMNS_CSS}</style>
      <div className="downloads-grid grid grid-cols-1 gap-4">
        <MonthlyReport lang={lang} />
        {/* `h-full` so the column inside can measure against the grid row —
            without it `mt-auto` has no slack to take up and the buttons stop
            lining up. */}
        <div className="downloads-second h-full border-t border-bg-gray pt-4">
          <RawExport lang={lang} contract={contract} />
        </div>
      </div>
    </Card>
  );
}

/**
 * The shared shape of a download column: heading, explanatory line, selector,
 * then the button pinned to the bottom.
 *
 * `h-full` with `mt-auto` on the button is what keeps the two buttons on one
 * line when the notes wrap to different heights — without it the shorter column
 * ends higher and the pair reads as two unrelated blocks.
 */
function DownloadColumn({
  title,
  note,
  help,
  helpToggle,
  children,
}: {
  title: string;
  note: string;
  help: string;
  helpToggle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        {/* A heading, not a `<label>` (RES-435): every field inside now carries
            its own — "Mes a reportar" here, "Desde"/"Hasta" in the export — and
            a heading that also labelled one of them made a screen reader
            announce the control as "Reporte mensual (PDF) Mes a reportar". It
            names the download; the fields below name themselves. */}
        <h3 className="m-0 text-xs font-semibold text-gray">{title}</h3>
        <p className="text-[12px] leading-snug text-gray">{note}</p>
        {/* The note above says what the file is; this says what is actually
            inside it — what someone deciding between the two downloads needs,
            and what someone about to open a 24-column spreadsheet wants first.

            `overlay` because the two downloads share a grid row: expanded in
            the normal flow, opening one grew the row, stretching the other
            column and pushing both buttons down. Floating, reading about one
            file leaves the other untouched. */}
        <HelpDisclosure toggle={helpToggle} body={help} overlay />
      </div>
      {children}
    </div>
  );
}

/** Today in Asunción, as `YYYY-MM-DD` — the latest date worth offering. */
const todayInAsuncion = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Asuncion",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const addDays = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

/**
 * The raw sensor export, over a date range the visitor picks.
 *
 * Defaults to the last 30 days — short enough to arrive quickly, since every 10
 * days of range is another upstream call. The bounds are enforced by the inputs
 * themselves (`min`/`max`) rather than only by validation on submit: a date the
 * export could never serve should not be pickable in the first place.
 */
function RawExport({
  lang,
  contract,
}: {
  lang: Lang;
  contract?: InstitutionContract | null;
}) {
  const copy = useInstitutionCopy(lang);
  const fromId = useId();
  const toId = useId();

  const today = todayInAsuncion();
  // Readings before the contract are not this institution's history, so the
  // picker cannot reach past it.
  const earliest = contract?.start_date ?? undefined;

  const [to, setTo] = useState(today);
  const [from, setFrom] = useState(() => {
    const thirtyDaysAgo = addDays(today, -29);
    return earliest && earliest > thirtyDaysAgo ? earliest : thirtyDaysAgo;
  });

  // Clearing a date input leaves the empty string, which dates as `Invalid
  // Date`: every comparison against it is false, so an unguarded range read as
  // valid and the note rendered "Rango de NaN días" over an enabled button.
  // Missing is its own state — not inverted, not too long, just not answerable
  // yet — so the button waits and the note says which date is missing.
  const incomplete = !from || !to;
  const inverted = !incomplete && from > to;
  // Calendar length of the range, which is all the panel can know before the
  // request: how many days actually hold readings is only apparent once the
  // provider answers. `rangeDays` therefore says "range of N days" rather than
  // "N days of measurements" — a sensor offline for a fortnight would make the
  // latter a lie in exactly the case that matters most.
  const spanDays = incomplete
    ? 0
    : (new Date(`${to}T12:00:00`).getTime() -
        new Date(`${from}T12:00:00`).getTime()) /
        86_400_000 +
      1;
  const tooLong = spanDays > MAX_EXPORT_DAYS;
  const invalid = incomplete || inverted || tooLong;

  return (
    <DownloadColumn
      title={copy.downloadRaw}
      note={copy.downloadRawNote}
      help={copy.downloadRawHelp}
      helpToggle={copy.downloadHelpToggle}
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={fromId}
            className="text-[11px] uppercase tracking-wide text-lightgray"
          >
            {copy.rangeFrom}
          </label>
          <DateField
            id={fromId}
            value={from}
            onChange={setFrom}
            min={earliest}
            max={today}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor={toId}
            className="text-[11px] uppercase tracking-wide text-lightgray"
          >
            {copy.rangeTo}
          </label>
          <DateField
            id={toId}
            value={to}
            onChange={setTo}
            min={from || earliest}
            max={today}
          />
        </div>
      </div>

      <DownloadButton
        className="mt-auto"
        kind="rawExport"
        label={copy.reportDownloadCsv}
        note={
          invalid
            ? undefined
            : Math.round(spanDays) === 1
              ? copy.rangeDaysOne
              : copy.rangeDays.replace("{days}", String(Math.round(spanDays)))
        }
        variant="void"
        lang={lang}
        from={from}
        to={to}
        disabled={invalid}
        blockedMessage={
          incomplete
            ? copy.rangeIncomplete
            : inverted
              ? copy.rangeInverted
              : tooLong
                ? copy.rangeTooLong.replace("{max}", String(MAX_EXPORT_DAYS))
                : undefined
        }
      />
    </DownloadColumn>
  );
}

/**
 * The monthly report, with the month to report on.
 *
 * Only months the sensor actually recorded are offered: the report endpoint
 * will render any month asked of it, so a free-form picker would hand back
 * empty PDFs for months the institution had no sensor. While the list loads a
 * skeleton holds the selector's exact height, so the button underneath does not
 * jump once it arrives.
 */
function MonthlyReport({ lang }: { lang: Lang }) {
  const copy = useInstitutionCopy(lang);
  const selectId = useId();
  const [months, setMonths] = useState<ReportMonth[] | undefined>();
  const [selected, setSelected] = useState<string>("");
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchReportMonths()
      .then((data) => {
        if (!active) return;
        setMonths(data.months);
        // The backend's `default` is the month to land on: the last *complete*
        // one, since a month still in progress gives a different report on
        // every download.
        setSelected(data.default ?? data.months.at(-1)?.month ?? "");
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const loading = months === undefined && !loadFailed;
  const hasMonths = months !== undefined && months.length > 0;
  const noMonths = months !== undefined && months.length === 0;

  return (
    <DownloadColumn
      title={copy.downloadMonthly}
      note={copy.downloadMonthlyNote}
      help={copy.downloadMonthlyHelp}
      helpToggle={copy.downloadHelpToggle}
    >
      <div className="flex flex-col gap-1.5">
        {/* The column heading names the file; this names the choice (RES-435).
            Without it the month sat unlabelled under "Reporte mensual (PDF)"
            and the reader had to infer that picking it changed what the report
            covered. Rendered whatever the state, so the selector, the skeleton
            and the "no months yet" placeholder all arrive labelled and the
            column does not reflow as the list loads. */}
        <label
          htmlFor={selectId}
          className="text-[11px] uppercase tracking-wide text-lightgray"
        >
          {copy.reportMonthLabel}
        </label>

        {loading && (
          <>
            {/* Matches the select's height so the card does not reflow. */}
            <Skeleton className="h-[38px] w-full" />
            <span className="sr-only">{copy.reportMonthsLoading}</span>
          </>
        )}

        {hasMonths && (
          <Select id={selectId} value={selected} onChange={setSelected}>
            {[...months].reverse().map((month) => (
              <option key={month.month} value={month.month}>
                {formatMonthName(month.month, lang, month.label)}
              </option>
            ))}
          </Select>
        )}

        {noMonths && (
          // Same height as the select it stands in for, so a card with no
          // months lines up with its neighbours in the grid instead of running
          // taller. The message is short enough to fit on one line at this
          // width; `truncate` is the guard for a longer translation.
          <p
            className="flex h-[38px] items-center truncate rounded-md border border-dashed border-basedark px-3 text-[12.5px] text-gray"
            title={copy.reportNoMonths}
          >
            {copy.reportNoMonths}
          </p>
        )}

        {loadFailed && (
          <p className="text-[11.5px] text-gray">{copy.reportMonthsError}</p>
        )}
      </div>

      {/* The button keeps a fixed label. Naming the month on it was tried and
          reverted: "Descargar septiembre de 2026" wraps to two lines in this
          column, so the card changed height as the selector changed — the
          layout jumping while you pick is worse than the redundancy it saved.
          The selector directly above already states the month. */}
      <DownloadButton
        className="mt-auto"
        kind="monthlyReport"
        label={copy.reportDownloadPdf}
        variant="color"
        lang={lang}
        month={selected || undefined}
        disabled={loading || noMonths}
      />
    </DownloadColumn>
  );
}

function DownloadButton({
  kind,
  label,
  note,
  variant,
  lang,
  month,
  from,
  to,
  disabled = false,
  blockedMessage,
  className = "",
}: {
  kind: DownloadKind;
  label: string;
  note?: string;
  variant: "color" | "void";
  lang: Lang;
  month?: string;
  from?: string;
  to?: string;
  disabled?: boolean;
  /** Why the button is disabled — shown in place of any download error. */
  blockedMessage?: string;
  /** Placement within the column — `mt-auto` to pin it to the bottom. */
  className?: string;
}) {
  const copy = useInstitutionCopy(lang);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  // A partial file is a warning, not a failure: it downloaded, so it reads in
  // the muted tone the notes use rather than in the error red.
  const [tone, setTone] = useState<"error" | "warning">("error");

  const handleClick = async () => {
    setBusy(true);
    setMessage(undefined);
    try {
      const { missingRanges } = await downloadInstitutionFile(kind, {
        month,
        from,
        to,
      });
      if (missingRanges > 0) {
        setTone("warning");
        setMessage(copy.downloadPartial);
      }
    } catch (error) {
      setTone("error");
      if (error instanceof InstitutionApiError) {
        if (error.code === "unauthenticated") {
          window.location.assign(INSTITUTION_LOGIN_PATH);
          return;
        }
        setMessage(
          error.code === "unavailable"
            ? copy.downloadUnavailable
            : copy.downloadError,
        );
      } else {
        setMessage(copy.downloadError);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Button
        variant={variant}
        block
        onClick={handleClick}
        disabled={busy || disabled}
      >
        <DownloadIcon />
        {busy ? copy.downloadPreparing : label}
      </Button>
      {note && <span className="text-[11.5px] text-lightgray">{note}</span>}
      {(blockedMessage ?? message) && (
        <span
          role="alert"
          className={
            // A blocked range is guidance, not a failure: it reads in the muted
            // tone, like a partial download, rather than in the error red.
            blockedMessage || tone === "warning"
              ? "text-[11.5px] text-gray"
              : "text-[11.5px] text-aqi-red-dark"
          }
        >
          {blockedMessage ?? message}
        </span>
      )}
    </div>
  );
}
