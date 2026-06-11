import { AQI } from "../../data/cards";
import { AQICard } from "./AQICardReactive";
import React, { useMemo } from "react";
import { Select, Option } from "@material-tailwind/react";
import { useClientTranslations } from "../../i18n/client";
import { type UIKey } from "../../i18n/ui";

export function RecommendationSelect() {
  const data = AQI;
  const t = useClientTranslations();
  const [selectedCard, setSelectedCard] = React.useState<string>(data[0].color);
  const card = useMemo(() => {
    return AQI.find((val) => val.color === selectedCard);
  }, [selectedCard]);
  return (
    <>
      <Select
        placeholder={t("recommendations.selectLevel")}
        label={t("recommendations.selectLevel")}
        value={card?.color}
        size="lg"
        labelProps={{ className: "font-bold md:hidden " }}
        className="block md:hidden bg-white text-md "
        onChange={(val) => setSelectedCard(val ?? data[0].color)}
      >
        {data.map((d) => (
          <Option key={d.color} value={d.color}>
            {t(`aqi.${d.id}.title` as UIKey)}
          </Option>
        ))}
      </Select>
      <div className="my-4">
        <AQICard card={card || AQI[0]} variant="recommendations" />
      </div>
    </>
  );
}
