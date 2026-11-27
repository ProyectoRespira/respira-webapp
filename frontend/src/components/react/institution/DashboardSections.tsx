import { useCallback, useEffect, useRef, useState } from "react";

import type {
  Institution,
  InstitutionDashboard,
} from "../../../data/institution";
import {
  contractForStation,
  dashboardSensors,
  institutionKind,
  institutionName,
  institutionRole,
  institutionUserLabel,
} from "../../../data/institution";
import type { Lang } from "../../../i18n/config";
import { useInstitutionCopy } from "../../../i18n/institution";
import {
  InstitutionApiError,
  fetchDashboard,
  fetchInstitutionAlerts,
} from "../../../store/institution";
import { formatStamp } from "../../../utils/institution-readings";
import { INSTITUTION_LOGIN_PATH } from "../../../utils/institution-session";
import { ActionLogPanel } from "./ActionLogPanel";
import { AlertsPage } from "./AlertsPage";
import { AnalysisPage } from "./AnalysisPage";
import { DownloadCard } from "./DownloadCard";
import { PanelSidebar } from "./PanelSidebar";
import { SummaryPage, type AlertsFeed } from "./SummaryPage";
import {
  PANEL_PAGES,
  PAGE_TITLE,
  pageFromHash,
  type PanelPage,
} from "./panel-pages";
import { PanelButton, PanelNotice } from "./panel-ui";
import { Skeleton } from "./ui";
import { useReadings } from "./useReadings";

/**
 * Writes the selected sensor into the URL, without a navigation.
 *
 * `replaceState` rather than a push: switching sensors is changing what you
 * are looking at, not moving somewhere new, so Back should leave the panel
 * rather than walk through every sensor visited. The id lives in the query
 * string so a reload reopens the panel on the same sensor; the SSR path reads
 * it back on the way in.
 */
const rememberSensorInUrl = (stationId: number) => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("station", String(stationId));
  window.history.replaceState(window.history.state, "", url);
};

/** How the page arrived: the server already tried to load the dashboard. */
export type InitialDashboardState =
  | { status: "ready"; dashboard: InstitutionDashboard }
  /** The institution has no contract, so no sensor — a real, expected state. */
  | { status: "no-sensor" }
  | { status: "error" };

type State =
  | InitialDashboardState
  | { status: "loading" }
  | { status: "expired" };

const WEEK_MS = 7 * 24 * 3_600_000;

/**
 * The institutional panel (#338): a menu of pages on the left, one page on
 * the right.
 *
 * The dashboard payload is fetched during SSR so the page arrives complete;
 * this island only fetches on its own to switch sensors or to retry after a
 * failure. The page on show is kept in the URL hash, so a page can be linked
 * to and Back returns to the previous one. The server cannot see the hash, so
 * a link to a page other than the summary renders the summary first and
 * switches once the island hydrates.
 */
export function DashboardSections({
  initial,
  institution,
  contactMail,
  lang,
}: {
  initial: InitialDashboardState;
  institution: Institution | null;
  /** Shown as the footer contact; empty hides it. */
  contactMail: string;
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);
  const [state, setState] = useState<State>(initial);
  // Separate from `state` so the panel keeps showing the sensor it has while
  // the next one loads.
  const [switching, setSwitching] = useState(false);
  const [page, setPage] = useState<PanelPage>("resumen");
  const [alerts, setAlerts] = useState<AlertsFeed>("loading");
  const [recentAlerts, setRecentAlerts] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const role = institutionRole(institution);
  const kind = institutionKind(institution);
  const dashboard = state.status === "ready" ? state.dashboard : null;
  const stationId = dashboard?.sensor.id ?? null;

  // --- Page in the URL -----------------------------------------------------

  useEffect(() => {
    const sync = () => setPage(pageFromHash(window.location.hash));
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  const navigate = useCallback((next: PanelPage) => {
    if (window.location.hash !== `#${next}`) {
      window.history.pushState(null, "", `#${next}`);
    }
    setPage(next);
    // A page change replaces the whole main column: move focus to its title
    // so a keyboard or screen-reader user lands at the start of what changed.
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    });
  }, []);

  // --- Data ----------------------------------------------------------------

  const load = async (requested?: number) => {
    try {
      const next = await fetchDashboard(undefined, requested);
      setState({ status: "ready", dashboard: next });
      return true;
    } catch (error) {
      if (error instanceof InstitutionApiError) {
        if (error.code === "not_found") {
          setState({ status: "no-sensor" });
          return false;
        }
        if (error.code === "unauthenticated") {
          setState({ status: "expired" });
          return false;
        }
      }
      setState({ status: "error" });
      return false;
    }
  };

  const retry = async () => {
    setState({ status: "loading" });
    await load();
  };

  const selectSensor = async (id: number) => {
    setSwitching(true);
    try {
      // The URL is updated only once the sensor actually loaded.
      if (await load(id)) rememberSensorInUrl(id);
    } finally {
      setSwitching(false);
    }
  };

  // The alerts feed drives the menu badge and the summary's latest alert.
  useEffect(() => {
    if (stationId == null) return;
    let active = true;
    setAlerts("loading");
    setRecentAlerts(0);
    fetchInstitutionAlerts(undefined, stationId)
      .then((items) => {
        if (!active) return;
        const now = Date.now();
        setAlerts(
          [...items].sort(
            (a, b) =>
              new Date(b.triggered_at).getTime() -
              new Date(a.triggered_at).getTime(),
          ),
        );
        setRecentAlerts(
          items.filter(
            (alert) => now - new Date(alert.triggered_at).getTime() <= WEEK_MS,
          ).length,
        );
      })
      .catch(() => {
        // Not deployed or failing: the badge and the entry simply stay out.
        if (active) setAlerts("unavailable");
      });
    return () => {
      active = false;
    };
  }, [stationId]);

  // Asked for here as well as on the pages that draw it, so the menu knows
  // whether there is an analysis to offer. Shared through the hook's cache.
  const week = useReadings(stationId, "7d");
  const pages = PANEL_PAGES.filter(
    (id) => id !== "analisis" || week.status !== "unavailable",
  );

  const name = institution ? institutionName(institution) : copy.panelName;

  return (
    <div className="flex min-h-screen flex-col bg-[#F1ECE9] text-[#1B1B1A] lg:flex-row">
      <PanelSidebar
        institutionName={name}
        pages={dashboard ? pages : []}
        page={page}
        onNavigate={navigate}
        alertsBadge={recentAlerts}
        sensors={dashboard ? dashboardSensors(dashboard) : []}
        selectedSensor={stationId}
        onSelectSensor={selectSensor}
        switching={switching}
        role={role}
        userLabel={institutionUserLabel(institution)}
        lang={lang}
      />

      <main className="flex min-w-0 flex-1 flex-col gap-5 px-4 pb-12 pt-6 md:px-[30px] md:pt-[26px]">
        <header className="flex flex-col gap-1.5">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="m-0 font-serif text-[26px] font-black leading-tight outline-none md:text-[30px]"
          >
            {dashboard ? copy[PAGE_TITLE[page]] : copy.panelName}
          </h1>
          {dashboard && (
            <p className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-[#4A4541]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      dashboard.sensor.status === "online"
                        ? "#2E9E46"
                        : "#A3262A",
                  }}
                />
                {dashboard.sensor.status === "online"
                  ? copy.sensorOnline
                  : copy.sensorOffline}
              </span>
              <span>
                {dashboard.sensor.name}
                {dashboard.sensor.model ? ` · ${dashboard.sensor.model}` : ""}
              </span>
              {dashboard.sensor.last_measurement_at && (
                <span>
                  {copy.updatedAt}{" "}
                  {formatStamp(dashboard.sensor.last_measurement_at)}
                </span>
              )}
              {switching && (
                <span aria-live="polite">{copy.sensorPickerLoading}</span>
              )}
            </p>
          )}
        </header>

        {state.status === "loading" && (
          <>
            <Skeleton className="h-[260px] w-full rounded-[22px]" />
            <span className="sr-only">{copy.loading}</span>
          </>
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

        {state.status === "no-sensor" && (
          <PanelNotice title={copy.noSensorTitle} body={copy.noSensorBody} />
        )}

        {state.status === "error" && (
          <div role="alert" className="flex flex-col items-start gap-3">
            <PanelNotice title={copy.errorTitle} body={copy.errorBody} />
            <PanelButton variant="secondary" onClick={retry}>
              {copy.retry}
            </PanelButton>
          </div>
        )}

        {dashboard && (
          <div className="flex flex-col gap-5">
            {page === "resumen" && (
              <SummaryPage
                stationId={dashboard.sensor.id}
                airQuality={dashboard.air_quality}
                limits={institution?.limits}
                kind={kind}
                alerts={alerts}
                onNavigate={navigate}
                lang={lang}
              />
            )}
            {page === "analisis" && (
              <AnalysisPage
                stationId={dashboard.sensor.id}
                current={dashboard.current}
                limits={institution?.limits}
                kind={kind}
                lang={lang}
              />
            )}
            {page === "bitacora" && (
              <ActionLogPanel
                stationId={dashboard.sensor.id}
                stationName={dashboard.sensor.name}
                role={role}
                kind={kind}
                lang={lang}
              />
            )}
            {page === "alertas" && (
              <AlertsPage
                config={dashboard.alert_config}
                stationId={dashboard.sensor.id}
                lang={lang}
              />
            )}
            {page === "descargas" && (
              <DownloadCard
                lang={lang}
                contract={contractForStation(institution, dashboard.sensor.id)}
                sensor={dashboard.sensor}
                stationId={dashboard.sensor.id}
              />
            )}
          </div>
        )}

        {contactMail && (
          <footer className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-5 text-[13px] text-[#5C5752]">
            <span>{copy.contactTitle}:</span>
            <a
              className="font-semibold text-[#245C2A] hover:text-[#163A1A] hover:underline"
              href={`mailto:${contactMail}`}
            >
              {contactMail}
            </a>
            <span className="sm:ml-auto">{copy.contactHint}</span>
          </footer>
        )}
      </main>
    </div>
  );
}
