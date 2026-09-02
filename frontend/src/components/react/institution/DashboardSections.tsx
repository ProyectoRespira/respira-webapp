import { useState } from "react";

import type {
  InstitutionContract,
  InstitutionDashboard,
} from "../../../data/institution";
import { institutionCopy as copy } from "../../../i18n/institution";
import {
  InstitutionApiError,
  fetchDashboard,
} from "../../../store/institution";
import { INSTITUTION_LOGIN_PATH } from "../../../utils/institution-session";
import { ActionLogPanel } from "./ActionLogPanel";
import { AirQualityPanel } from "./AirQualityPanel";
import { AlertConfigCard } from "./AlertConfigCard";
import { DownloadCard } from "./DownloadCard";
import { HistoryChart } from "./HistoryChart";
import { SensorStatusCard } from "./SensorStatusCard";
import { Button, Card, CardSkeleton, ErrorState, StateBlock } from "./ui";

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
  contactMail,
}: {
  initial: InitialDashboardState;
  contract: InstitutionContract | null;
  contactMail: string;
}) {
  const [state, setState] = useState<
    InitialDashboardState | { status: "loading" } | { status: "expired" }
  >(initial);

  const retry = async () => {
    setState({ status: "loading" });
    try {
      setState({ status: "ready", dashboard: await fetchDashboard() });
    } catch (error) {
      if (error instanceof InstitutionApiError) {
        if (error.code === "not_found") {
          setState({ status: "no-sensor" });
          return;
        }
        if (error.code === "unauthenticated") {
          setState({ status: "expired" });
          return;
        }
      }
      setState({ status: "error" });
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

  return (
    <div className="flex flex-col gap-5">
      {/* Today first: what the air is doing, and whether the sensor saying so
          is actually reporting. The two have to be read together. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <AirQualityPanel airQuality={dashboard.air_quality} />
        </div>
        <div className="lg:col-span-4">
          <SensorStatusCard sensor={dashboard.sensor} contract={contract} />
        </div>
      </div>

      <HistoryChart
        history={dashboard.history}
        threshold={dashboard.alert_config.alert_threshold}
      />

      <ActionLogPanel
        stationId={dashboard.sensor.id}
        stationName={dashboard.sensor.name}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <AlertConfigCard
          alertConfig={dashboard.alert_config}
          contactMail={contactMail}
        />
        <DownloadCard />
      </div>
    </div>
  );
}
