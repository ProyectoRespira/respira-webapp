import {
  Tabs,
  TabsHeader,
  TabsBody,
  Tab,
  TabPanel,
} from "@material-tailwind/react";
import { AQI } from "../../data/cards";
import { getTextColor } from "../../utils";
import { AQICard } from "./AQICardReactive";
import { useClientTranslations } from "../../i18n/client";
import { type UIKey } from "../../i18n/ui";

export function RecommendationTabs() {
  const data = AQI;
  const t = useClientTranslations();

  return (
    <Tabs value={AQI[0].color} className="hidden md:block">
      <TabsHeader
        placeholder="HEADER"
        className="bg-transparent rounded-xl overflow-clip"
        indicatorProps={{
          className: "border-2 bg-transparent text-black first:rounded-l-xl",
        }}
      >
        {data.map(({ id, color }) => (
          <Tab
            key={color}
            value={color}
            placeholder={""}
            className={`bg-${color} min-h-16 text-${getTextColor(color)} font-semibold first:rounded-l-xl last:rounded-r-xl `}
          >
            {t(`aqi.${id}.title` as UIKey)}
          </Tab>
        ))}
      </TabsHeader>
      <TabsBody placeholder={""}>
        {data.map((card) => (
          <TabPanel key={card.color} value={card.color}>
            <AQICard card={card} variant="recommendations" />
          </TabPanel>
        ))}
      </TabsBody>
    </Tabs>
  );
}
