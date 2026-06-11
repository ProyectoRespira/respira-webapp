import React from "react";
import { useStore } from "@nanostores/react";

import { statisticsSelectedStation } from "../../../store/statistics";
import { useClientTranslations } from "../../../i18n/client";

const HeaderStatistics = () => {
  const station = useStore(statisticsSelectedStation);
  const t = useClientTranslations();
  return (
    <>
      {station && (
        <>
          <h2 className="font-serif font-bold text-[2.1rem] text-black">
            {t("stats.station")} {station?.id}
          </h2>
          <h3 className="font-normal font-sans  text-[1.875rem] text-black">
            {t("stats.station")} {station?.name}
          </h3>
        </>
      )}
    </>
  );
};

export { HeaderStatistics };
