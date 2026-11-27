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
import { PanelButton, PanelCard, PanelTitle } from "./panel-ui";
import { DownloadIcon, HelpDisclosure, Skeleton } from "./ui";

/** The panel's field look: black 2 px edge, 44 px tall. */
const FIELD =
  "min-h-[44px] w-full rounded-[10px] border-2 border-[#1B1B1A] bg-white px-3 text-[14px] text-[#1B1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1B1A] disabled:cursor-not-allowed disabled:opacity-60";

const LABEL = "text-[13px] font-bold text-[#1B1B1A]";

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
 * Descargas: the two file exports as two cards, side by side (RES-433, #338).
 *
 * They answer different questions — "how was last month?" against "give me the
 * numbers to work on myself" — so each is its own card with its own selector,
 * and the pair wraps to one column on a phone. The cards stretch to one height
 * so the two buttons line up.
 *
 * Each button resolves its own 404 into "not available yet" and says so under
 * itself. State is per-button rather than per-card: a failing report must not
 * disable the spreadsheet, and vice versa.
 *
 * The raw export is read live from the sensor API, so it is slower than the
 * report and can come back with gaps; both cases surface under the button that
 * caused them.
 *
 * For a sensor with no raw history to serve — see `supports_raw_export` — the
 * card stays where it is and only its controls are replaced by a line saying
 * why: dropping it left the report alone against empty space, which read as a
 * layout bug, and gave no account of a download the reader may have seen
 * elsewhere.
 */
export function DownloadCard({
  lang,
  contract,
  sensor,
  stationId,
}: {
  lang: Lang;
  contract?: InstitutionContract | null;
  sensor?: DashboardSensor | null;
  /**
   * The selected sensor, when the institution leases several: both downloads
   * cover it rather than whichever sensor the backend would default to.
   */
  stationId?: number;
}) {
  // Absent on a backend that predates the field: keep offering the download
  // rather than hiding it from every panel the moment the frontend ships first.
  const hasRawExport = sensor?.supports_raw_export !== false;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-5">
      <MonthlyReport lang={lang} stationId={stationId} />
      {hasRawExport ? (
        <RawExport lang={lang} contract={contract} stationId={stationId} />
      ) : (
        <RawExportUnsupported lang={lang} />
      )}
    </div>
  );
}

/**
 * The shared shape of a download card: heading, explanatory line, selector,
 * then the button pinned to the bottom (`mt-auto`), so the two buttons stay on
 * one line when the notes wrap to different heights.
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
    <PanelCard className="h-full">
      {/* A heading, not a `<label>` (RES-435): every field inside carries
          its own, and a heading that also labelled one of them made a screen
          reader announce the control twice. */}
      <PanelTitle>{title}</PanelTitle>
      <p className="m-0 text-[14px] leading-[1.5] text-[#3E3A36]">{note}</p>
      <HelpDisclosure toggle={helpToggle} body={help} />
      {children}
    </PanelCard>
  );
}

/** Today in Asunción, as `YYYY-MM-DD` — the latest date worth offering. */
const todayInAsuncion = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    // Paraguay's fixed UTC−3; see `utils/institution-format.ts`.
    timeZone: "Etc/GMT+3",
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
 * The raw column for a sensor whose readings cannot be exported.
 *
 * Same heading and same note as the working column, so the reader sees what the
 * download *is* before being told they cannot have it; only the pickers and the
 * button are replaced, by a line naming the reason. The "what's in this file?"
 * disclosure is dropped: there is no file to describe here, and leaving it would
 * offer detail about something unobtainable.
 */
function RawExportUnsupported({ lang }: { lang: Lang }) {
  const copy = useInstitutionCopy(lang);

  return (
    <PanelCard className="h-full">
      <PanelTitle>{copy.downloadRaw}</PanelTitle>
      <p className="m-0 text-[14px] leading-[1.5] text-[#3E3A36]">
        {copy.downloadRawNote}
      </p>
      {/* Dashed and muted: it reads as a space that stays empty, not as a
          control that failed to load. Not `role="alert"` — nothing just went
          wrong, it is the standing state of this sensor. */}
      <p className="m-0 rounded-[10px] border-2 border-dashed border-[#B9AFA8] px-3 py-2.5 text-[13px] leading-snug text-[#3E3A36]">
        {copy.downloadRawUnsupported}
      </p>
    </PanelCard>
  );
}

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
  stationId,
}: {
  lang: Lang;
  contract?: InstitutionContract | null;
  stationId?: number;
}) {
  const copy = useInstitutionCopy(lang);
  const fromId = useId();
  const toId = useId();

  const today = todayInAsuncion();
  // Readings before the contract are not this institution's history, so the
  // picker cannot reach past it.
  const earliest = contract?.start_date ?? undefined;

  const defaultFrom = () => {
    const thirtyDaysAgo = addDays(today, -29);
    return earliest && earliest > thirtyDaysAgo ? earliest : thirtyDaysAgo;
  };

  const [to, setTo] = useState(today);
  const [from, setFrom] = useState(defaultFrom);

  // Each sensor is leased from its own date, so switching to one contracted
  // later can leave `from` before that sensor's contract — a date its own
  // `min` now forbids, which the input shows as valid until it is submitted.
  // Pulling it forward is what keeps the range answerable for the sensor on
  // screen; `useState`'s initialiser only runs on the first render and cannot
  // do this.
  useEffect(() => {
    if (earliest && from && from < earliest) setFrom(earliest);
    // `from` is deliberately not a dependency: this corrects the range when the
    // *sensor* changes, and must not fight the visitor as they type a date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earliest]);

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
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={fromId} className={LABEL}>
            {copy.rangeFrom}
          </label>
          <input
            id={fromId}
            type="date"
            className={FIELD}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            min={earliest}
            max={today}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={toId} className={LABEL}>
            {copy.rangeTo}
          </label>
          <input
            id={toId}
            type="date"
            className={FIELD}
            value={to}
            onChange={(event) => setTo(event.target.value)}
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
        variant="secondary"
        lang={lang}
        from={from}
        to={to}
        stationId={stationId}
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
function MonthlyReport({
  lang,
  stationId,
}: {
  lang: Lang;
  stationId?: number;
}) {
  const copy = useInstitutionCopy(lang);
  const selectId = useId();
  const [months, setMonths] = useState<ReportMonth[] | undefined>();
  const [selected, setSelected] = useState<string>("");
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    // Refetched per sensor: the months on offer are the ones *that* sensor
    // recorded, and they start at its own contract date, so a sensor added
    // later has a shorter list than the one it replaced in the selector.
    setMonths(undefined);
    setLoadFailed(false);
    fetchReportMonths(undefined, stationId)
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
  }, [stationId]);

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
        <label htmlFor={selectId} className={LABEL}>
          {copy.reportMonthLabel}
        </label>

        {loading && (
          <>
            {/* Matches the select's height so the card does not reflow. */}
            <Skeleton className="h-[44px] w-full" />
            <span className="sr-only">{copy.reportMonthsLoading}</span>
          </>
        )}

        {hasMonths && (
          <select
            id={selectId}
            className={`${FIELD} cursor-pointer`}
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {[...months].reverse().map((month) => (
              <option key={month.month} value={month.month}>
                {formatMonthName(month.month, lang, month.label)}
              </option>
            ))}
          </select>
        )}

        {noMonths && (
          // Same height as the select it stands in for, so a card with no
          // months lines up with its neighbours in the grid instead of running
          // taller. The message is short enough to fit on one line at this
          // width; `truncate` is the guard for a longer translation.
          <p
            className="m-0 flex h-[44px] items-center truncate rounded-[10px] border-2 border-dashed border-[#B9AFA8] px-3 text-[13px] text-[#3E3A36]"
            title={copy.reportNoMonths}
          >
            {copy.reportNoMonths}
          </p>
        )}

        {loadFailed && (
          <p className="m-0 text-[12px] text-[#5C5752]">
            {copy.reportMonthsError}
          </p>
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
        variant="primary"
        lang={lang}
        month={selected || undefined}
        stationId={stationId}
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
  stationId,
  disabled = false,
  blockedMessage,
  className = "",
}: {
  kind: DownloadKind;
  label: string;
  note?: string;
  variant: "primary" | "secondary";
  lang: Lang;
  month?: string;
  from?: string;
  to?: string;
  /** The sensor the file covers; omitted, the backend picks the default one. */
  stationId?: number;
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
        station: stationId,
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
      <PanelButton
        variant={variant}
        onClick={handleClick}
        disabled={busy || disabled}
        className="self-start"
      >
        <DownloadIcon />
        {busy ? copy.downloadPreparing : label}
      </PanelButton>
      {note && <span className="text-[12px] text-[#5C5752]">{note}</span>}
      {(blockedMessage ?? message) && (
        <span
          role="alert"
          className={
            // A blocked range is guidance, not a failure: it reads in the muted
            // tone, like a partial download, rather than in the error red.
            blockedMessage || tone === "warning"
              ? "text-[12px] text-[#5C5752]"
              : "text-[12px] font-semibold text-[#A3262A]"
          }
        >
          {blockedMessage ?? message}
        </span>
      )}
    </div>
  );
}
