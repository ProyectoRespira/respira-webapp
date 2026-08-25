import type { ReactNode } from "react";

import type {
  DashboardSensor,
  InstitutionContract,
} from "../../../data/institution";
import { institutionCopy as copy } from "../../../i18n/institution";
import {
  formatCoordinates,
  formatDate,
  formatDateTime,
} from "../../../utils/institution-format";
import { Card, CardHead, CardTitle, Pill } from "./ui";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 text-[13px]">
      <dt className="w-28 shrink-0 text-gray">{label}</dt>
      <dd className="m-0 tabular-nums">{children}</dd>
    </div>
  );
}

const contractLine = (
  contract: InstitutionContract | null,
): string | undefined => {
  if (!contract || contract.contract_status !== "active") return undefined;
  return contract.end_date
    ? `${copy.contractActiveUntil} ${formatDate(contract.end_date)}`
    : copy.contractNoEnd;
};

/**
 * The institution's assigned sensor and whether it is reporting.
 *
 * Sits beside the AQI panel rather than below it on purpose: an offline sensor
 * puts the AQI reading next to it in question, so the two have to be readable
 * at the same time.
 */
export function SensorStatusCard({
  sensor,
  contract,
}: {
  sensor: DashboardSensor;
  contract: InstitutionContract | null;
}) {
  const online = sensor.status === "online";
  const coordinates = formatCoordinates(
    sensor.location.latitude,
    sensor.location.longitude,
  );
  const contractText = contractLine(contract);

  return (
    <Card>
      <CardHead>
        <CardTitle>{copy.sensorTitle}</CardTitle>
        <span className="ml-auto">
          <Pill tone={online ? "on" : "off"} dot>
            {online ? copy.sensorOnline : copy.sensorOffline}
          </Pill>
        </span>
      </CardHead>

      <p className="m-0 font-serif text-lg font-bold">{sensor.name}</p>

      <dl className="flex flex-col gap-2.5">
        {sensor.location.specific_location && (
          <Row label={copy.sensorLocation}>
            {sensor.location.specific_location}
          </Row>
        )}
        {sensor.location.city && (
          <Row label={copy.sensorCity}>{sensor.location.city}</Row>
        )}
        {coordinates && <Row label={copy.sensorCoordinates}>{coordinates}</Row>}
        <Row label={copy.sensorLastReading}>
          {formatDateTime(sensor.last_measurement_at, copy.sensorNoReading)}
        </Row>
        {contractText && <Row label={copy.sensorContract}>{contractText}</Row>}
      </dl>

      {!online && (
        <p className="text-xs text-lightgray">{copy.sensorOfflineHint}</p>
      )}
    </Card>
  );
}
