import { useState, type KeyboardEvent, type MouseEvent } from "react";

import type { Lang } from "../../../i18n/config";
import {
  format,
  useInstitutionCopy,
  type InstitutionCopyKey,
} from "../../../i18n/institution";
import {
  EMPTY_CELL,
  LEVEL_COLORS,
  PARTICLE_SCALES,
  chartMax,
  formatDayLabel,
  formatHour,
  formatNumber,
  mean,
  particleLevel,
  type HeatRow,
  type Particle,
} from "../../../utils/institution-readings";

/** One bar: an hour, or a day's average on the 30-day view. */
export type ChartBar = {
  ts: string;
  value: number | null;
  /** What the tooltip says the bar is: `lun 17/11 · 09:00`. */
  when: string;
};

export type ChartTick = { index: number; label: string };

const PLOT_HEIGHT = 280;
const UNIT = "µg/m³";

/**
 * Bars over time with the MADES limit and the average drawn across (#329).
 *
 * Plain elements rather than a chart library: the design is a column of
 * coloured bars, two reference lines and a tooltip, and owning the markup is
 * what lets every bar take its level colour and the plot follow the panel's
 * type and spacing without overriding a library's theme.
 *
 * Reachable by keyboard: the plot takes focus and the arrow keys walk the
 * bars, announcing each one through a polite live region.
 */
export function ParticleBars({
  particle,
  label,
  title,
  bars,
  ticks,
  limit,
  lang,
}: {
  particle: Particle;
  label: string;
  title: string;
  bars: ChartBar[];
  ticks: ChartTick[];
  /**
   * The MADES 24 h limit: a number draws the line, `null` names it as
   * pending without a line, `undefined` (no limits from the backend) omits it.
   */
  limit: number | null | undefined;
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);
  const [hover, setHover] = useState<number | null>(null);

  const values = bars.map((bar) => bar.value);
  const max = chartMax(particle, values, limit ?? null);
  const average = mean(values);
  const peak = Math.max(
    0,
    ...values.filter((value): value is number => value != null),
  );
  const decimals = PARTICLE_SCALES[particle].decimals;
  const top = (value: number) =>
    PLOT_HEIGHT - (Math.min(value, max) / max) * PLOT_HEIGHT;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((share) => max * share);
  const n = bars.length;

  const indexAt = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.max(
      0,
      Math.min(
        n - 1,
        Math.floor(((event.clientX - rect.left) / rect.width) * n),
      ),
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    if (event.key in step) {
      event.preventDefault();
      setHover((current) =>
        Math.max(0, Math.min(n - 1, (current ?? n - 1) + step[event.key])),
      );
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setHover(event.key === "Home" ? 0 : n - 1);
    }
  };

  const hovered = hover != null && hover < n ? bars[hover] : null;
  const hoveredLevel =
    hovered?.value != null ? particleLevel(particle, hovered.value) : null;
  const describe = (bar: ChartBar) =>
    `${bar.when}: ${
      bar.value != null
        ? `${formatNumber(bar.value, decimals, lang)} ${UNIT} · ${
            copy[
              `particleLevel${particleLevel(particle, bar.value)}` as InstitutionCopyKey
            ]
          }`
        : copy.chartNoReading
    }`;

  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-2 md:grid-cols-[52px_minmax(0,1fr)] md:gap-x-2.5">
      <div
        aria-hidden="true"
        className="relative"
        style={{ height: PLOT_HEIGHT }}
      >
        {yTicks.map((value) => (
          <span
            key={value}
            className="absolute right-0 -translate-y-1/2 text-[12px] text-[#5C5752]"
            style={{ top: top(value) }}
          >
            {formatNumber(value, 0, lang)}
          </span>
        ))}
      </div>

      <div
        tabIndex={0}
        role="group"
        aria-label={format(copy.chartSummary, {
          title,
          avg: average != null ? formatNumber(average, decimals, lang) : "—",
          max: formatNumber(peak, decimals, lang),
        })}
        onMouseMove={(event) => setHover(indexAt(event))}
        onMouseLeave={() => setHover(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setHover(null)}
        className="relative cursor-crosshair border-b-2 border-[#1B1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B1B1A]"
        style={{ height: PLOT_HEIGHT }}
      >
        {yTicks.slice(1, -1).map((value) => (
          <span
            key={value}
            aria-hidden="true"
            className="absolute inset-x-0 h-px bg-[#EEE8E3]"
            style={{ top: top(value) }}
          />
        ))}

        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-end"
          style={{ gap: n > 100 ? 1 : n > 30 ? 3 : 6 }}
        >
          {bars.map((bar, index) => (
            <span
              key={bar.ts}
              className="min-w-0 flex-1 rounded-t-[2px]"
              style={{
                height:
                  bar.value == null
                    ? 0
                    : `${Math.max(0.5, (Math.min(bar.value, max) / max) * 100)}%`,
                backgroundColor:
                  bar.value != null
                    ? LEVEL_COLORS[particleLevel(particle, bar.value)]
                    : "transparent",
                opacity: hover === null || hover === index ? 1 : 0.5,
              }}
            />
          ))}
        </div>

        {limit != null && (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 border-t-2 border-dashed border-[#3B6FB6]"
            style={{ top: top(limit) }}
          />
        )}
        {limit !== undefined && (
          <span
            aria-hidden="true"
            className="absolute left-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#DCE8F8] px-2 py-[3px] text-[11px] font-extrabold text-[#1F4A86]"
            style={{ top: limit != null ? top(limit) : 14 }}
          >
            {limit != null
              ? format(copy.chartLimit, { value: formatNumber(limit, 0, lang) })
              : copy.chartLimitPending}
          </span>
        )}

        {average != null && (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-x-0 border-t-2 border-dotted border-[#1B1B1A]"
              style={{ top: top(average) }}
            />
            <span
              aria-hidden="true"
              className="absolute right-0 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#1B1B1A] px-2.5 py-[3px] text-[11px] font-extrabold text-white"
              style={{ top: top(average) }}
            >
              {format(copy.chartAverage, {
                value: `${formatNumber(average, decimals, lang)} ${UNIT}`,
              })}
            </span>
          </>
        )}

        {hovered && hover != null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-2.5 z-10 flex min-w-[150px] flex-col gap-[3px] rounded-[10px] border-2 border-[#1B1B1A] bg-white px-3 py-2.5"
            style={{
              left: `${((hover + 0.5) / n) * 100}%`,
              transform:
                (hover + 0.5) / n > 0.6
                  ? "translateX(calc(-100% - 10px))"
                  : "translateX(10px)",
            }}
          >
            <span className="text-[12px] text-[#5C5752]">{hovered.when}</span>
            <span className="font-serif text-[19px] font-black">
              {hovered.value != null
                ? `${formatNumber(hovered.value, decimals, lang)} ${UNIT}`
                : copy.chartNoReading}
            </span>
            {hoveredLevel != null && (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold">
                <span
                  className="h-2.5 w-2.5 rounded-[3px]"
                  style={{ backgroundColor: LEVEL_COLORS[hoveredLevel] }}
                />
                {copy[`particleLevel${hoveredLevel}` as InstitutionCopyKey]}
              </span>
            )}
          </div>
        )}
        <p aria-live="polite" className="sr-only">
          {hovered ? `${label} · ${describe(hovered)}` : ""}
        </p>
      </div>

      <div />
      <div aria-hidden="true" className="relative h-[26px]">
        {/* With more than five labels every other one hides on a phone,
            where seven day names would run into each other. */}
        {ticks.map((tick, position) => (
          <span
            key={tick.index}
            className={`absolute top-2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-[#4A4541] md:text-[12px] ${
              ticks.length > 5 && position % 2 ? "hidden sm:block" : ""
            }`}
            style={{ left: `${((tick.index + 0.5) / n) * 100}%` }}
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The last seven days as a 7 × 24 grid, one square per hour, coloured by
 * level (#329). A CSS grid rather than a heat-map package: Nivo's heatmap is
 * not installed, and the grid is a few lines.
 *
 * Scrolls sideways inside its own box on a phone, where 24 columns would
 * otherwise shrink below a tappable size.
 */
export function ParticleHeatMap({
  particle,
  label,
  rows,
  lang,
}: {
  particle: Particle;
  label: string;
  rows: HeatRow[];
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);
  const decimals = PARTICLE_SCALES[particle].decimals;
  const hourLabels = Array.from({ length: 24 }, (_, hour) =>
    hour % 6 === 0 ? `${hour} h` : hour === 23 ? "23" : "",
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div
          role="img"
          aria-label={format(copy.heatSummary, { measure: label })}
          className="grid min-w-[520px] grid-cols-[64px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-[5px]"
        >
          <span />
          <div
            aria-hidden="true"
            className="grid text-[11px] font-bold text-[#5C5752]"
            style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
          >
            {hourLabels.map((text, hour) => (
              <span key={hour}>{text}</span>
            ))}
          </div>
          {rows.map((row) => {
            const day = formatDayLabel(row.ts, lang);
            return (
              <div key={row.ts} className="contents">
                <span className="text-[13px] font-bold">{day}</span>
                <div
                  className="grid gap-[3px]"
                  style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
                >
                  {row.cells.map((value, hour) => (
                    <span
                      key={hour}
                      title={`${day} · ${formatHour(hour)}: ${
                        value != null
                          ? `${formatNumber(value, decimals, lang)} ${UNIT}`
                          : copy.chartNoReading
                      }`}
                      className="h-8 rounded-[5px]"
                      style={{
                        backgroundColor:
                          value != null
                            ? LEVEL_COLORS[particleLevel(particle, value)]
                            : EMPTY_CELL,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="m-0 text-[13px] text-[#4A4541]">{copy.heatNote}</p>
    </div>
  );
}
