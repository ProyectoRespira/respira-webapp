import { useState } from "react";

import type {
  Institution,
  InstitutionContract,
  InstitutionDashboard,
} from "../../../data/institution";
import {
  contractForStation,
  dashboardSensors,
} from "../../../data/institution";
import type { Lang } from "../../../i18n/config";
import { useInstitutionCopy } from "../../../i18n/institution";
import {
  InstitutionApiError,
  fetchDashboard,
} from "../../../store/institution";
import { INSTITUTION_LOGIN_PATH } from "../../../utils/institution-session";
import { ActionLogPanel } from "./ActionLogPanel";
import { AirQualityPanel } from "./AirQualityPanel";
import { DownloadCard } from "./DownloadCard";
import { HistoryChart } from "./HistoryChart";
import { NotificationsPanel } from "./NotificationsPanel";
import { SensorPicker } from "./SensorPicker";
import { SensorStatusCard } from "./SensorStatusCard";
import { Button, Card, CardSkeleton, ErrorState, StateBlock } from "./ui";

/**
 * Writes the selected sensor into the URL, without a navigation.
 *
 * `replaceState` rather than a push: switching sensors is changing what you
 * are looking at, not moving somewhere new, so Back should leave the panel
 * rather than walk through every sensor visited. The id lives in the query
 * string so a reload — or a link pasted to a colleague — reopens the panel on
 * the same sensor, and the SSR path reads it back on the way in.
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

/**
 * The dashboard's data sections.
 *
 * The payload is fetched during SSR so the page arrives complete rather than
 * flashing skeletons at a visitor whose data was already available. This island
 * takes it as a prop and only fetches on its own when the visitor retries after
 * a failure — which is why loading, error and empty states all live here even
 * though the happy path never renders the first one on load.
 */
export function DashboardSections({
  initial,
  contract,
  institution = null,
  lang,
}: {
  initial: InitialDashboardState;
  contract: InstitutionContract | null;
  /**
   * The caller's institution, for the contract line under the selected sensor.
   * Optional so a page that has not got it still renders, falling back to the
   * single `contract` prop.
   */
  institution?: Institution | null;
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);
  const [state, setState] = useState<
    InitialDashboardState | { status: "loading" } | { status: "expired" }
  >(initial);
  // Separate from `state` so the panel keeps showing the sensor it has while
  // the next one loads: blanking the whole page to a skeleton on every switch
  // would lose the reader's place for a request that usually takes a moment.
  const [switching, setSwitching] = useState(false);

  /**
   * Loads one sensor's dashboard, or the default one when given nothing.
   *
   * The single path both the retry button and the sensor selector take, so a
   * failure is reported the same way whichever of the two caused it.
   */
  const load = async (stationId?: number) => {
    try {
      const dashboard = await fetchDashboard(undefined, stationId);
      setState({ status: "ready", dashboard });
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

  const selectSensor = async (stationId: number) => {
    setSwitching(true);
    try {
      // The URL is updated only once the sensor actually loaded: writing it
      // first would leave a reload pointing at a sensor the panel could not
      // show.
      if (await load(stationId)) rememberSensorInUrl(stationId);
    } finally {
      setSwitching(false);
    }
  };

  if (state.status === "loading") {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <CardSkeleton lines={5} />
        </div>
        <div className="lg:col-span-4">
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (state.status === "expired") {
    return (
      <Card>
        <StateBlock
          title={copy.sessionExpiredTitle}
          body={copy.sessionExpiredBody}
          action={
            <Button
              variant="void"
              onClick={() => window.location.assign(INSTITUTION_LOGIN_PATH)}
            >
              {copy.goToLogin}
            </Button>
          }
        />
      </Card>
    );
  }

  if (state.status === "no-sensor") {
    return (
      <Card>
        <StateBlock title={copy.noSensorTitle} body={copy.noSensorBody} />
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card>
        <ErrorState
          title={copy.errorTitle}
          body={copy.errorBody}
          onRetry={retry}
          retryLabel={copy.retry}
        />
      </Card>
    );
  }

  const { dashboard } = state;
  const sensors = dashboardSensors(dashboard);
  // The contract of the sensor on show, not the institution's first one —
  // with several sensors those differ, and the status card names a term.
  const selectedContract =
    contractForStation(institution, dashboard.sensor.id) ?? contract;

  return (
    <div className="flex flex-col gap-8">
      {/* Above everything, because it governs everything below it: each
          section reads as "for the selected sensor", which only holds if the
          selector is read first. It renders nothing with one sensor. */}
      <SensorPicker
        sensors={sensors}
        selected={dashboard.sensor.id}
        onSelect={selectSensor}
        busy={switching}
        lang={lang}
      />

      {/* `gap-8` between sections, against the `gap-5` used *inside* a row: an
          even rhythm throughout gave the page no grouping, so a pair meant to
          be read together sat as far apart as two unrelated sections. The wider
          outer gap is what separates one subject from the next.

          Today first: what the air is doing, and whether the sensor saying so
          is actually reporting — the standing facts about the sensor, read
          together. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <AirQualityPanel airQuality={dashboard.air_quality} lang={lang} />
        </div>
        <div className="flex flex-col gap-5 lg:col-span-4">
          <SensorStatusCard
            sensor={dashboard.sensor}
            contract={selectedContract}
            lang={lang}
          />
        </div>
      </div>

      {/* Full width rather than beside the AQI panel (RES-433): the two exports
          now sit in two columns, and in the 4-column slot they had before there
          was no room for that — the date range alone wants the better part of
          it. On its own row each download gets a readable column, and the pair
          can be compared side by side. */}
      <DownloadCard
        lang={lang}
        contract={selectedContract}
        sensor={dashboard.sensor}
        stationId={dashboard.sensor.id}
      />

      <HistoryChart
        history={dashboard.history}
        threshold={dashboard.alert_config.alert_threshold}
        lang={lang}
      />

      <ActionLogPanel
        stationId={dashboard.sensor.id}
        stationName={dashboard.sensor.name}
        lang={lang}
      />

      {/* What the platform sent about the sensor, as against what the action
          log holds — what the institution did about it. The alert rule behind
          those notifications is not restated here: institutions cannot change
          it from the dashboard, and it already reaches them as the threshold
          line on the history chart above. */}
      <NotificationsPanel lang={lang} stationId={dashboard.sensor.id} />
    </div>
  );
}
