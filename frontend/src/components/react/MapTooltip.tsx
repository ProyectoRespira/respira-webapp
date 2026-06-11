import * as React from "react";
import { getAQIIndex } from "../../utils";
import { AQI } from "../../data/cards";
import { useStore } from "@nanostores/react";
import { region } from "../../store/map";
import { toggleRecommendationsModal } from "../../store/modals";
import { useClientTranslations } from "../../i18n/client";
import { type UIKey } from "../../i18n/ui";

export const MapTooltip = () => {
  const data = useStore(region);
  const t = useClientTranslations();
  const card = React.useMemo(() => {
    if (!data) {
      return undefined;
    }
    return AQI[getAQIIndex(data.aqi)];
  }, [data]);
  return (
    <>
      {card ? (
        <div className="bg-[#535353] absolute bottom-5 left-5 md:top-10 md:right-10 md:left-auto  w-fit h-fit rounded-lg  p-2 md:p-3 flex md:flex-col md:space-x-0 space-x-2">
          <div className="flex flex-row space-x-2 items-center">
            <p className="text-white text-sm">
              {t("map.mean")}: {t(`aqi.${card.id}.title` as UIKey)}
            </p>
            <div className={`bg-${card.color} h-4 w-4`} />
          </div>
          {data.aqi >= 50 && (
            <button
              type="button"
              onClick={() => toggleRecommendationsModal(true)}
              className="text-white underline text-sm bg-transparent border-none p-0 m-0 cursor-pointer"
            >
              {t("common.recommendations")}
            </button>
          )}
        </div>
      ) : undefined}
    </>
  );
};
