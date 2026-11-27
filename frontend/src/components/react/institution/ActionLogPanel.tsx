import { useCallback, useEffect, useId, useState, type FormEvent } from "react";

import {
  ACTION_NOTE_MAX_LENGTH,
  type ActionLog,
  type InstitutionAlert,
  type InstitutionKind,
  type InstitutionRole,
} from "../../../data/institution";
import type { Lang } from "../../../i18n/config";
import { useInstitutionCopy } from "../../../i18n/institution";
import {
  InstitutionApiError,
  createActionLog,
  fetchActionLogs,
  fetchInstitutionAlerts,
} from "../../../store/institution";
import {
  formatAqi,
  formatDate,
  formatShortDate,
  formatTime,
} from "../../../utils/institution-format";
import {
  AQI_SCALE,
  aqiBand,
  aqiInk,
} from "../../../utils/institution-readings";
import { INSTITUTION_LOGIN_PATH } from "../../../utils/institution-session";
import { PanelButton, PanelCard, PanelNotice, PanelTitle } from "./panel-ui";
import { HelpDisclosure, Skeleton } from "./ui";

// Loaded in the browser rather than during SSR: the list is paginated and
// changes as the visitor adds to it, so it owns its own state from the start.
type ListState =
  | { status: "loading" }
  | { status: "ready"; items: ActionLog[]; hasMore: boolean; page: number }
  | { status: "error" }
  | { status: "expired" }
  /** RES-370 is not deployed yet — `/action-logs/` answers 404. */
  | { status: "unavailable" };

const stateForError = (error: unknown): ListState => {
  if (error instanceof InstitutionApiError) {
    if (error.code === "unavailable") return { status: "unavailable" };
    if (error.code === "unauthenticated") return { status: "expired" };
  }
  return { status: "error" };
};

const FIELD =
  "w-full rounded-[10px] border-2 border-[#1B1B1A] bg-white px-3.5 py-3 text-[15px] text-[#1B1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1B1A] disabled:opacity-60";

/**
 * Bitácora: the form to log an action, and the history beside it.
 *
 * A member reads the history but cannot write to it (#328): the form is
 * replaced by a line saying so. The backend enforces the same rule; hiding the
 * form only spares a member a button that would be refused.
 */
export function ActionLogPanel({
  stationId,
  stationName,
  role,
  kind,
  lang,
}: {
  /**
   * The sensor this panel is about: the one the form records against, and the
   * one the history is limited to.
   */
  stationId: number | null;
  stationName: string;
  role: InstitutionRole;
  kind: InstitutionKind;
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  // Alerts are optional context for the form, so a failure to load them is not
  // an error state: the selector simply offers nothing and a note can still be
  // saved without one.
  const [alerts, setAlerts] = useState<InstitutionAlert[]>([]);
  const canWrite = role === "admin";

  const load = useCallback(async () => {
    setList({ status: "loading" });
    try {
      // Reloaded from page one whenever the sensor changes: paging on into a
      // list built for another sensor would interleave the two histories.
      const page = await fetchActionLogs(1, undefined, stationId);
      setList({
        status: "ready",
        items: page.results,
        hasMore: Boolean(page.next),
        page: 1,
      });
    } catch (error) {
      setList(stateForError(error));
    }
  }, [stationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canWrite) return;
    // Asked for by sensor rather than filtered client-side: with several
    // sensors the unfiltered first page could be filled by another sensor's
    // alerts, leaving this one's selector empty though it has events.
    fetchInstitutionAlerts(undefined, stationId)
      .then(setAlerts)
      .catch((error) => {
        console.error("Could not load the institution's alerts", error);
      });
  }, [stationId, canWrite]);

  const loadMore = async () => {
    if (list.status !== "ready" || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await fetchActionLogs(list.page + 1, undefined, stationId);
      setList({
        status: "ready",
        items: [...list.items, ...next.results],
        hasMore: Boolean(next.next),
        page: list.page + 1,
      });
    } catch (error) {
      setList(stateForError(error));
    } finally {
      setLoadingMore(false);
    }
  };

  // A new entry goes straight to the top of the list the visitor is looking at,
  // which is also where the API would put it (`-timestamp, -id`).
  const prepend = (created: ActionLog) => {
    setList((current) =>
      current.status === "ready"
        ? { ...current, items: [created, ...current.items] }
        : current,
    );
  };

  return (
    <div className="flex flex-wrap items-start gap-5">
      {/* The form comes first (RES-434): you write the action, then it
          appears in the history beside it. Each card keeps the height its
          content needs. */}
      <div className="min-w-0 flex-[1_1_340px]">
        {canWrite ? (
          <ActionLogForm
            stationId={stationId}
            stationName={stationName}
            alerts={alerts}
            disabled={list.status === "unavailable"}
            onCreated={prepend}
            kind={kind}
            lang={lang}
          />
        ) : (
          <p className="m-0 rounded-[18px] bg-[#F6F2EF] px-6 py-5 text-[14px] leading-[1.5]">
            {copy.logMemberNotice}
          </p>
        )}
      </div>
      <div className="min-w-0 flex-[2_1_520px]">
        <ActionLogList
          state={list}
          onRetry={load}
          onLoadMore={loadMore}
          loadingMore={loadingMore}
          lang={lang}
        />
      </div>
    </div>
  );
}

// --- List -------------------------------------------------------------------

function ActionLogList({
  state,
  onRetry,
  onLoadMore,
  loadingMore,
  lang,
}: {
  state: ListState;
  onRetry: () => void;
  onLoadMore: () => void;
  loadingMore: boolean;
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);
  return (
    <PanelCard labelledBy="panel-log-history">
      <PanelTitle id="panel-log-history">{copy.logHistoryTitle}</PanelTitle>

      {state.status === "loading" && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
          <span className="sr-only">{copy.loading}</span>
        </div>
      )}

      {state.status === "error" && (
        <div role="alert" className="flex flex-col items-start gap-3">
          <PanelNotice title={copy.errorTitle} body={copy.errorBody} />
          <PanelButton variant="secondary" onClick={onRetry}>
            {copy.retry}
          </PanelButton>
        </div>
      )}

      {state.status === "expired" && (
        <div className="flex flex-col items-start gap-3">
          <PanelNotice
            title={copy.sessionExpiredTitle}
            body={copy.sessionExpiredBody}
          />
          <PanelButton
            variant="secondary"
            onClick={() => window.location.assign(INSTITUTION_LOGIN_PATH)}
          >
            {copy.goToLogin}
          </PanelButton>
        </div>
      )}

      {state.status === "unavailable" && (
        <PanelNotice
          title={copy.actionsUnavailableTitle}
          body={copy.actionsUnavailableBody}
        />
      )}

      {state.status === "ready" &&
        (state.items.length === 0 ? (
          <PanelNotice
            title={copy.actionsEmptyTitle}
            body={copy.actionsEmptyBody}
          />
        ) : (
          /* Capped and scrollable: the history only grows, and past a point it
             should not be what decides how tall the page is. */
          <div className="-mx-1 max-h-[34rem] overflow-y-auto overscroll-contain px-1">
            <ul className="m-0 flex list-none flex-col p-0">
              {state.items.map((item) => (
                <ActionRow key={item.id} item={item} lang={lang} />
              ))}
            </ul>
            {state.hasMore && (
              <div className="pt-3">
                <PanelButton
                  variant="secondary"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="w-full"
                >
                  {loadingMore ? copy.actionsLoadingMore : copy.actionsLoadMore}
                </PanelButton>
              </div>
            )}
          </div>
        ))}
    </PanelCard>
  );
}

function ActionRow({ item, lang }: { item: ActionLog; lang: Lang }) {
  const copy = useInstitutionCopy(lang);
  // The AQI of the moment (#335): absent on an older backend, which drops the
  // circle; null on an entry written before it was recorded.
  const hasAqi = item.aqi !== undefined;
  const band = aqiBand(item.aqi);

  return (
    <li
      className={`grid gap-3 border-t border-[#EEE8E3] py-3 ${
        hasAqi ? "grid-cols-[44px_minmax(0,1fr)]" : "grid-cols-1"
      }`}
    >
      {hasAqi && (
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#1B1B1A] text-[12px] font-extrabold"
          style={{
            backgroundColor: band != null ? AQI_SCALE[band] : "#EFEAE6",
            color: aqiInk(band),
          }}
        >
          {item.aqi != null ? (
            <>
              <span className="sr-only">AQI </span>
              {formatAqi(item.aqi)}
            </>
          ) : (
            <>
              <span aria-hidden="true">—</span>
              <span className="sr-only">{copy.logNoAqi}</span>
            </>
          )}
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-[3px]">
        <p className="m-0 whitespace-pre-line text-[15px] leading-[1.45]">
          {item.note}
        </p>
        <p className="m-0 text-[12px] text-[#5C5752]">
          {formatShortDate(item.timestamp)} · {formatTime(item.timestamp)}
          {item.alert != null &&
            (item.alert_detail
              ? ` · ${copy.actionsRespondsToAlert} ${formatShortDate(
                  item.alert_detail.triggered_at,
                )} (${formatAqi(item.alert_detail.aqi_value)} AQI)`
              : ` · ${copy.actionsRespondsToAlertPlain}`)}
        </p>
      </div>
    </li>
  );
}

// --- Form -------------------------------------------------------------------

/**
 * One line in the alert selector: `24/08/2026 · 128 AQI · umbral 100`.
 *
 * The full date, not the list's `dd/mm`: an option has to be identifiable on
 * its own, and the alerts on offer can span more than a year.
 */
function alertOptionLabel(
  alert: InstitutionAlert,
  copy: ReturnType<typeof useInstitutionCopy>,
): string {
  const base =
    alert.alert_threshold == null
      ? copy.actionFormAlertOptionNoThreshold
      : copy.actionFormAlertOption.replace(
          "{threshold}",
          String(alert.alert_threshold),
        );
  return base
    .replace("{date}", formatDate(alert.triggered_at))
    .replace("{aqi}", formatAqi(alert.aqi_value));
}

function ActionLogForm({
  stationId,
  stationName,
  alerts,
  disabled,
  onCreated,
  kind,
  lang,
}: {
  stationId: number | null;
  stationName: string;
  alerts: InstitutionAlert[];
  disabled: boolean;
  onCreated: (created: ActionLog) => void;
  kind: InstitutionKind;
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);
  const noteId = useId();
  const noteHelpId = useId();
  const alertId = useId();
  const alertHelpId = useId();
  const [note, setNote] = useState("");
  // "" means no alert. Kept as a string because that is what a <select> value
  // is; it becomes a number only on the way out.
  const [alert, setAlert] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  // The backend rejects an alert raised on a station other than the one being
  // acted on, so the selector never offers that combination in the first place.
  const selectableAlerts = alerts.filter((item) => item.station === stationId);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || stationId == null) return;

    const trimmed = note.trim();
    // Mirrors the serializer's own checks so the common mistakes are caught
    // without a round trip; the server stays the authority either way.
    if (!trimmed) {
      setError(copy.actionFormNoteRequired);
      return;
    }
    if (trimmed.length > ACTION_NOTE_MAX_LENGTH) {
      setError(copy.actionFormNoteTooLong);
      return;
    }

    setSubmitting(true);
    setError(undefined);
    setSaved(false);

    try {
      const created = await createActionLog({
        station: stationId,
        note: trimmed,
        alert: alert ? Number(alert) : null,
      });
      onCreated(created);
      setNote("");
      setAlert("");
      setSaved(true);
    } catch (caught) {
      if (caught instanceof InstitutionApiError) {
        if (caught.code === "unauthenticated") {
          window.location.assign(INSTITUTION_LOGIN_PATH);
          return;
        }
        if (caught.code === "unavailable") {
          setError(copy.actionsUnavailableTitle);
        } else {
          // Prefer the server's own field message when it sent one.
          setError(caught.fieldErrors.note?.[0] ?? copy.actionFormError);
        }
      } else {
        setError(copy.actionFormError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (stationId == null) {
    return (
      <PanelCard>
        <PanelTitle>{copy.actionFormTitle}</PanelTitle>
        <p className="m-0 text-[14px] text-[#3E3A36]">
          {copy.actionFormNoStation}
        </p>
      </PanelCard>
    );
  }

  return (
    <PanelCard labelledBy="panel-log-form">
      <PanelTitle id="panel-log-form">{copy.actionFormTitle}</PanelTitle>
      <p className="m-0 text-[14px] leading-[1.5] text-[#3E3A36]">
        {copy.logIntro}
      </p>
      {/* What comes back in the monthly PDF is what makes the minute worth it;
          kept folded so the form stays short for the people who know. */}
      <HelpDisclosure
        toggle={copy.actionFormHelpToggle}
        body={copy.actionFormHelp}
      />

      <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
        <p className="m-0 flex items-baseline gap-2.5 rounded-[10px] bg-[#F6F2EF] px-3 py-2 text-[13px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.8px] text-[#5C5752]">
            {copy.actionFormSensor}
          </span>
          <span className="font-semibold">{stationName}</span>
        </p>

        {selectableAlerts.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={alertId} className="text-[14px] font-bold">
              {copy.actionFormAlertLabel}{" "}
              <span className="font-normal text-[#5C5752]">
                {copy.actionFormAlertOptional}
              </span>
            </label>
            <select
              id={alertId}
              className={FIELD}
              value={alert}
              onChange={(event) => setAlert(event.target.value)}
              disabled={disabled || submitting}
              aria-describedby={alertHelpId}
            >
              <option value="">{copy.actionFormAlertNone}</option>
              {selectableAlerts.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {alertOptionLabel(item, copy)}
                </option>
              ))}
            </select>
            <span id={alertHelpId} className="text-[12px] text-[#5C5752]">
              {copy.actionFormAlertHelp}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor={noteId} className="text-[14px] font-bold">
            {copy.actionFormNoteLabel}
          </label>
          <textarea
            id={noteId}
            rows={4}
            className={`${FIELD} resize-y`}
            value={note}
            maxLength={ACTION_NOTE_MAX_LENGTH}
            placeholder={
              kind === "colegio"
                ? copy.logPlaceholderColegio
                : copy.logPlaceholderIndustria
            }
            aria-describedby={noteHelpId}
            onChange={(event) => {
              setNote(event.target.value);
              setSaved(false);
            }}
            disabled={disabled || submitting}
            required
          />
          <span id={noteHelpId} className="text-[12px] text-[#5C5752]">
            {copy.actionFormNoteHelp}
          </span>
        </div>

        {error && (
          <p
            role="alert"
            className="m-0 text-[13px] font-semibold text-[#A3262A]"
          >
            {error}
          </p>
        )}
        {saved && (
          <p
            role="status"
            className="m-0 text-[13px] font-semibold text-[#245C2A]"
          >
            {copy.actionFormSaved}
          </p>
        )}

        <PanelButton
          type="submit"
          disabled={disabled || submitting}
          className="self-start"
        >
          {submitting ? copy.actionFormSubmitting : copy.actionFormSubmit}
        </PanelButton>
      </form>
    </PanelCard>
  );
}
