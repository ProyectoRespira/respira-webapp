import React from "react";
import { getColorRange, isValidAqi } from "../../utils";
import { ResponsiveBar } from "@nivo/bar";
import { timeFormat } from "d3-time-format";
import { scaleTime } from "d3-scale";
import { DateTime } from "luxon";

const customTooltip = ({ value }: { value: number }) => (
  <div className="flex flex-col rounded bg-black p-2 font-serif text-white">
    <p className="text-xs">{Math.round(value)}</p>
  </div>
);

type BarDatum = {
  timestamp: string;
  value: number;
};

const formatter = timeFormat("%-I:%M %p");

const formatDateToTimezone = (date: Date) => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzOffset = DateTime.fromJSDate(date).setZone(tz).offset; // minutes
  return new Date(date.getTime() + (tzOffset - 60) * 60000);
};

export const BarChart = ({
  data,
  emptyLabel,
}: {
  data?: BarDatum[];
  emptyLabel?: string;
}) => {
  // Regions and stations without readings have no forecast series at all.
  // Reading `data[0].timestamp` off an empty or absent series throws, so bail
  // out before any of the derived scales are built.
  const points = React.useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const hasData = points.length > 0;

  const maxValue = React.useMemo(() => {
    if (points.length === 0) return 0;
    return Math.max(...points.map((d: BarDatum) => d.value));
  }, [points]);

  const timeScaleTicks: string[] = React.useMemo(() => {
    if (points.length === 0) return [];
    const scale = scaleTime().domain([
      new Date(points[0].timestamp),
      new Date(points[points.length - 1].timestamp),
    ]);
    const ticks = scale.ticks(points.length > 6 ? 6 : 10);
    return ticks.map((tick) => formatter(formatDateToTimezone(tick)));
  }, [points]);

  if (!hasData) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-[#ECECEC]">
        <p className="text-center font-sans text-xs text-lightgray">
          {emptyLabel ?? "—"}
        </p>
      </div>
    );
  }

  return (
    <ResponsiveBar
      data={points}
      motionConfig="wobbly"
      keys={["value"]}
      indexBy="timestamp"
      padding={0.05}
      enableGridY={false}
      colors={(datum) =>
        getColorRange(isValidAqi(datum.value) ? datum.value : 0)
      }
      enableLabel={false}
      margin={{ top: maxValue > 300 ? 30 : 15, right: 0, bottom: 25, left: 0 }}
      axisLeft={null}
      minValue={0}
      maxValue={maxValue}
      enableTotals={true}
      totalsOffset={10}
      tooltip={(d) => customTooltip(d)}
      valueScale={{
        type: "symlog",
        min: 0,
        max: 400,
      }}
      valueFormat={(value) => Math.round(value).toString()}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        format: (val) => {
          const formatted = formatter(formatDateToTimezone(new Date(val)));
          return timeScaleTicks.includes(formatted) ? formatted : "";
        },
      }}
      theme={{
        text: {
          fontSize: 12,
          fill: "#A1A1A1",
        },
        axis: {
          domain: {
            line: {
              stroke: "#ECECEC",
              strokeWidth: 2,
            },
          },
        },
      }}
    />
  );
};
