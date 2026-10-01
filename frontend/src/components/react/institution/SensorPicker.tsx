import type { DashboardAvailableSensor } from "../../../data/institution";
import type { Lang } from "../../../i18n/config";
import { useInstitutionCopy } from "../../../i18n/institution";
import { FieldLabel, Select } from "./ui";

/**
 * Chooses which of the institution's sensors the panel is about (RES-459).
 *
 * Renders nothing below two sensors. An institution leasing one has no choice
 * to make, and drawing a select with a single option would add a control that
 * does nothing — the panel it had before multi-sensor support is the panel it
 * keeps.
 *
 * A plain `<select>` rather than tabs: the list is as long as the institution
 * has sensors, which is unbounded, and a select handles ten as well as two
 * while staying one tab stop and bringing the mobile wheel picker for free.
 */
export function SensorPicker({
  sensors,
  selected,
  onSelect,
  busy = false,
  lang,
}: {
  sensors: DashboardAvailableSensor[];
  selected: number;
  onSelect: (stationId: number) => void;
  /** A switch is in flight: the control locks rather than queueing changes. */
  busy?: boolean;
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);

  if (sensors.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-col gap-1">
        <FieldLabel htmlFor="institution-sensor">
          {copy.sensorPickerLabel}
        </FieldLabel>
        <div className="w-full sm:w-[280px]">
          <Select
            id="institution-sensor"
            value={String(selected)}
            disabled={busy}
            onChange={(value) => onSelect(Number(value))}
          >
            {sensors.map((sensor) => (
              <option key={sensor.id} value={sensor.id}>
                {sensor.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {/* `aria-live` so a screen reader hears the switch happen: the panel
          below changes wholesale, and without this the only cue is visual. */}
      <p aria-live="polite" className="self-end pb-2 text-xs text-gray">
        {busy ? copy.sensorPickerLoading : copy.sensorPickerHint}
      </p>
    </div>
  );
}
