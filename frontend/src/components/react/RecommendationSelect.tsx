import { AQI } from "../../data/cards";
import { AQICard } from "./AQICardReactive";
import React, { useMemo } from "react";
import { Select, Option } from "@material-tailwind/react";

export function RecommendationSelect() {
  const data = AQI;
  const [selectedCard, setSelectedCard] = React.useState<string>(data[0].color);
  const card = useMemo(() => {
    return AQI.find((val) => val.color === selectedCard);
  }, [selectedCard]);
  return (
    <>
      <Select
        placeholder={"Seleccionar nivel"}
        label="Seleccionar nivel"
        value={card?.color}
        size="lg"
        labelProps={{ className: "font-bold md:hidden " }}
        className="block md:hidden bg-white text-md "
        onChange={(val) => setSelectedCard(val ?? data[0].color)}
      >
        {data.map((d) => (
          <Option key={d.color} value={d.color}>
            {d.title}
          </Option>
        ))}
      </Select>
      <div className="my-4">
        <AQICard card={card || AQI[0]} variant="recommendations" />
      </div>
    </>
  );
}
