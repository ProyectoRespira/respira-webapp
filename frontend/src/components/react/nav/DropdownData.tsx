import React from "react";
import { useStore } from "@nanostores/react";

import { loadingStations, stations } from "../../../store/map";
import type { DynamicMenuItem } from "../../../data/menu";
import type { STATION } from "../../../store/map";

const DropdownData = ({
  baseRoute,
  titleKey,
  subtitleKey,
}: DynamicMenuItem) => {
  const data = useStore(stations);
  const loading = useStore(loadingStations);

  return (
    <>
      {loading && (
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-10 w-full bg-basedark rounded"></div>
          <div className="h-10 w-full bg-basedark rounded"></div>
          <div className="h-10 w-full bg-basedark rounded"></div>
        </div>
      )}
      {!loading &&
        data &&
        data.map((val: STATION) => {
          const valueMap = val as Record<string, unknown>;
          return (
            <a href={baseRoute + "/" + val.id} key={val.id} className="py-2">
              <li>
                <p className="font-serif font-bold text-[1rem] text-black">
                  Estación {String(valueMap[titleKey] ?? "")}
                </p>
                <p className="font-sans text-[0.75rem] text-black">
                  {String(valueMap[subtitleKey] ?? "")}
                </p>
              </li>
            </a>
          );
        })}
    </>
  );
};

export { DropdownData };
