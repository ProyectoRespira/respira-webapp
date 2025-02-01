import React, { useMemo, useState } from "react";
import { ResponsiveLine, type CustomLayerProps } from "@nivo/line";
import { useStore } from "@nanostores/react";
import {
  errorHistoricForecast,
  historicForecastData,
  loadingHistoricForecast,
} from "../../../store/statistics";
import { useAnimatedPath } from "@nivo/core";
import { type LegendProps } from "@nivo/legends";

import { animated } from "@react-spring/web";
type SymbolProps = Exclude<
  LegendProps["symbolShape"],
  "circle" | "diamond" | "square" | "triangle" | undefined
> extends React.FC<infer P>
  ? P & { opacity?: number }
  : never;

const SymbolLine = ({ x, y, size, fill, id }: SymbolProps) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <line
        x1={-size}
        y1="5"
        x2={size}
        y2="5"
        strokeDasharray={id === "Medición real" ? "" : "4"}
        style={{
          stroke: fill,
          strokeWidth: 4,
          pointerEvents: "none",
        }}
      />
    </g>
  );
};

type LinesItemProps = Pick<CustomLayerProps, "lineGenerator"> & {
  color: string;
  points: Record<"x" | "y", number>[];
  thickness: number;
  dashed: boolean;
};


function LinesItem({
  lineGenerator,
  points,
  color: stroke,
  thickness: strokeWidth,
  dashed,
}: LinesItemProps) {
  const [styles, setStyles] = useState({
    stroke,
    strokeWidth,
    strokeDasharray: dashed ? "6" : "",
  });

  const path = useMemo(() => lineGenerator(points), [lineGenerator, points]);
  if (!path) return [];
  const animatedPath = useAnimatedPath(path);

  return (
    <animated.path
      d={animatedPath}
      fill="none"
      {...styles}
    />
  );
}

function Lines({ lineGenerator, lineWidth, series }: CustomLayerProps) {
  return series
    .slice(0)
    .map(({ id, data, color }, index) => (
      <LinesItem
        key={id}
        points={data.map((d) => d.position)}
        lineGenerator={lineGenerator}
        color={color ?? "black"}
        thickness={lineWidth ?? 5}
        dashed={index > 0}
      />
    ));
}

export const HistoricLineChart = () => {
  const data = useStore(historicForecastData);
  const error = useStore(errorHistoricForecast);
  const loading = useStore(loadingHistoricForecast);
  const formattedData = React.useMemo(() => {
    if (!data) {
      return undefined;
    }
    const filler = data.aqi_level[data.aqi_level.length - 1];
    return [
      {
        color: "hsla(43, 84%, 49%)",
        id: "Medición real",
        data: data.aqi_level.map((d) => ({
          x: d.timestamp,
          y: d.value,
          color: "hsla(43, 84%, 49%, 1)",
        })),
      },
      {
        color: "hsla(126, 72%, 45%)",
        id: "Predicción 6 horas",
        data: [{ x: filler.timestamp, y: filler.value }].concat(
          data.forecast_6h.map((d) => ({ x: d.timestamp, y: d.value }))
        ),
      },
      {
        color: "hsla(194, 62%, 53%)",
        id: "Predicción 12 horas",
        data: [{ x: filler.timestamp, y: filler.value }].concat(
          data.forecast_12h.map((d) => ({ x: d.timestamp, y: d.value }))
        ),
      },
    ];
  }, [data]);

  return (
    <>
      {loading && !data && !error &&  (
        <div className="grid min-h-[140px] h-full w-full place-items-center overflow-x-scroll rounded-lg p-6 lg:overflow-visible">
          <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-gray-300" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
          </svg>
          <span className="sr-only">Cargando...</span>
        </div>
      )}
      {!loading && !data && error && (
        <div className="grid min-h-[140px] h-full w-full place-items-center overflow-x-scroll rounded-lg p-6 lg:overflow-visible">
          <p>Error cargando el gráfico</p>
        </div>
      )}
      {formattedData && (
        <ResponsiveLine
          colors={["#E5AA14", "#21C731", "#3BADD1"]}
          data={formattedData}
          animate
          margin={{ top: 150, right: 110, bottom: 50, left: 60 }}
          enablePoints={false}
          yScale={{
            type: "linear",
            min: 0,
            max: "auto",
            stacked: false,
            reverse: false,
          }}
          enableGridX={false}
          enableSlices="x"
          axisBottom={{
            format: "%H %M",
            legendOffset: -12,
            tickValues: "every 2 hour",
          }}
          curve="linear"
          xFormat="time:%Y-%m-%d"
          xScale={{
            format: "%Y-%m-%dT%H:%M:%S",
            precision: "hour",
            type: "time",
            useUTC: false,
            min: "auto",
            max: "auto",
          }}
          axisTop={null}
          axisRight={null}
          axisLeft={{
            tickSize: 0,
            tickPadding: 5,
            tickRotation: 0,
            legend: "AQI",
            legendOffset: -40,
            legendPosition: "middle",
            truncateTickAt: 0,
          }}
          pointSize={10}
          pointColor={{ theme: "background" }}
          pointBorderWidth={2}
          pointBorderColor={{ from: "serieColor" }}
          pointLabel="data.yFormatted"
          pointLabelYOffset={-12}
          enableTouchCrosshair={true}
          useMesh={true}
          layers={[
            // includes all default layers
            "grid",
            "markers",
            "axes",
            "areas",
            "crosshair",
            "slices",
            Lines,
            "mesh",
            "legends",
          ]}
          legends={[
            {
              anchor: "top-right",
              direction: "column",
              justify: false,
              translateX: 0,
              translateY: -100,
              itemsSpacing: 0,
              itemDirection: "left-to-right",
              itemWidth: 80,
              itemHeight: 20,
              itemOpacity: 0.75,
              symbolSize: 12,
              symbolShape: SymbolLine,
              symbolBorderColor: "rgba(0, 0, 0, .5)",
              effects: [
                {
                  on: "hover",
                  style: {
                    itemBackground: "rgba(0, 0, 0, .03)",
                    itemOpacity: 1,
                  },
                },
              ],
            },
          ]}
        />
      )}
    </>
  );
};
