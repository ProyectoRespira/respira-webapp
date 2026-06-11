import React from "react";
import { useStore } from "@nanostores/react";

import { statisticsSelectedStation } from "../../../store/statistics";
import { useClientTranslations } from "../../../i18n/client";

const CharacteristicsStation = () => {
  const station = useStore(statisticsSelectedStation);
  const t = useClientTranslations();
  return (
    <>
      {station && (
        <div className="flex flex-col col-span-2">
          <h4 className="font-serif text-[1.5rem] font-bold">
            {t("stats.characteristics")}
          </h4>
          <div className="grid md:grid-cols-3 grid-cols-2 space-y-3 mt-4 col-span-2">
            <h6 className="font-serif col-span-1 font-bold">
              {t("stats.locality")}
            </h6>
            <p className="md:col-span-2">{station?.name}</p>
            <h6 className="font-serif col-span-1 font-bold">
              {t("stats.region")}
            </h6>
            <p className="md:col-span-2">{station?.region.name}</p>
            <h6 className="font-serif col-span-1 font-bold">
              {t("stats.status")}
            </h6>
            <div className="bg-aqi-green-dark w-fit px-2 rounded-lg md:col-span-2">
              {t("stats.active")}
            </div>
            <h6 className="font-serif col-span-1 font-bold">
              {t("stats.lastAqi")}
            </h6>
            <p className="md:col-span-2">{station?.aqi_pm2_5}</p>
          </div>
        </div>
      )}
    </>
  );
};

export { CharacteristicsStation };
