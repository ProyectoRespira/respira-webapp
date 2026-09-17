import type { DashboardAirQuality } from "../../../data/institution";
import {
  emojiForCategory,
  levelIdForCategory,
} from "../../../data/institution";
import type { Lang } from "../../../i18n/config";
import { useInstitutionCopy } from "../../../i18n/institution";
import { aqiRecommendations, type UIKey } from "../../../i18n/ui";
import { useTranslations } from "../../../i18n/utils";
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
  lang,
}: {
  airQuality: DashboardAirQuality | null;
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);
  const t = useTranslations(lang);
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

  // `category_label`, `message` and `recommendations` come from the API in
  // Spanish whatever the reader's language, so translate them here off the
  // category key. An unknown category keeps the API's own text.
  const levelId = levelIdForCategory(airQuality.category);
  const categoryLabel = levelId
    ? t(`aqi.${levelId}.title` as UIKey)
    : airQuality.category_label;
  const message = levelId
    ? t(`aqi.${levelId}.description` as UIKey)
    : airQuality.message;
  const recommendations = levelId
    ? aqiRecommendations[lang][levelId]
    : airQuality.recommendations;

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
          <h2 className="m-0 font-serif text-xl font-bold">{categoryLabel}</h2>
          <p className="m-0 mt-1 max-w-[46ch] text-[13.5px]">{message}</p>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="flex flex-col gap-3 px-6 pb-6 pt-5">
          <CardTitle>{copy.recommendationsTitle}</CardTitle>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {recommendations.map((recommendation) => (
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
