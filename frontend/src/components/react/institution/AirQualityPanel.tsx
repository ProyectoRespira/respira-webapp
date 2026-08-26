import type { DashboardAirQuality } from "../../../data/institution";
import { emojiForCategory } from "../../../data/institution";
import { institutionCopy as copy } from "../../../i18n/institution";
import { formatAqi } from "../../../utils/institution-format";
import { getColorRange, isValidAqi } from "../../../utils";
import { Card, CardHead, CardTitle, Pill, StateBlock } from "./ui";

/**
 * Today's reading and what to do about it — the one actionable thing on the page.
 *
 * The band colour comes from `getColorRange`, the same table the public map and
 * the AQI cards use, so a given value is never a different colour in the
 * institutional panel than it is on the public site. Colour never carries the
 * meaning alone: the category label and emoji ride along with it.
 */
export function AirQualityPanel({
  airQuality,
}: {
  airQuality: DashboardAirQuality | null;
}) {
  if (!airQuality) {
    return (
      <Card>
        <CardHead>
          <CardTitle>{copy.airQualityTitle}</CardTitle>
          <span className="ml-auto">
            <Pill>{copy.sensorNoReading}</Pill>
          </span>
        </CardHead>
        <StateBlock
          title={copy.airQualityEmptyTitle}
          body={copy.airQualityEmptyBody}
        />
      </Card>
    );
  }

  // A reading outside the classifiable range would make `getColorRange` throw
  // inside render, which unmounts the island; fall back to the neutral surface.
  const bandColor = isValidAqi(airQuality.aqi)
    ? getColorRange(airQuality.aqi)
    : undefined;

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-bg-gray bg-white">
      <div
        className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center"
        style={bandColor ? { backgroundColor: bandColor } : undefined}
      >
        <div className="flex items-center gap-5">
          <span
            className="font-emoji text-[44px] leading-none"
            aria-hidden="true"
          >
            {emojiForCategory(airQuality.category)}
          </span>
          <div>
            <p className="m-0 font-serif text-5xl font-bold leading-none tabular-nums">
              {formatAqi(airQuality.aqi)}
            </p>
            <p className="m-0 mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gray">
              {copy.aqiUnit}
            </p>
          </div>
        </div>
        <div>
          <h2 className="m-0 font-serif text-xl font-bold">
            {airQuality.category_label}
          </h2>
          <p className="m-0 mt-1 max-w-[46ch] text-[13.5px]">
            {airQuality.message}
          </p>
        </div>
      </div>

      {airQuality.recommendations.length > 0 && (
        <div className="flex flex-col gap-3 px-6 pb-6 pt-5">
          <CardTitle>{copy.recommendationsTitle}</CardTitle>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {airQuality.recommendations.map((recommendation) => (
              <li
                key={recommendation}
                className="flex items-start gap-2.5 text-[13.5px]"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 block h-1.5 w-1.5 shrink-0 rounded-full bg-green_dark"
                />
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
