// Pure computations behind the panel's particle blocks (#329): levels and
// colours, daily and hourly aggregates, mean and median.
//
// Everything here is plain data in, plain data out — no copy and no React — so
// the components stay about layout and the arithmetic can be read on its own.
// Helpers return level *indexes* and copy *keys*, never strings: the language
// is the caller's.

import type { Lang } from "../i18n/config";
import type { SensorReading } from "../data/institution";
import { getAQIIndex, isValidAqi } from "../utils";

export type Particle = "pm25" | "pm10";

export const PARTICLES: Particle[] = ["pm25", "pm10"];

// --- Colours ----------------------------------------------------------------

/** The six AQI bands, as the panel draws them (Dirección 4). */
export const AQI_SCALE = [
  "#B1F2A8",
  "#F6E66B",
  "#F6A55A",
  "#E84A4A",
  "#9B4DB3",
  "#7A1F2B",
] as const;

/**
 * Level colours for charts: good, moderate, unhealthy for sensitive groups,
 * unhealthy. Stronger than the AQI band fills so a thin bar still reads.
 */
export const LEVEL_COLORS = ["#6FCF6A", "#F3D34A", "#F59A3C", "#E5484D"];

/** A light wash of each level colour, for surfaces that carry text. */
export const LEVEL_TINTS = ["#E3F8DF", "#FCF3CC", "#FDE6D1", "#FBDADB"];

/** Fill for an hour with no reading. */
export const EMPTY_CELL = "#EFEAE6";

/** The AQI band (0–5) of a value, or null when it cannot be rated. */
export const aqiBand = (aqi: number | null | undefined): number | null =>
  isValidAqi(aqi) ? getAQIIndex(aqi) : null;

/** Ink on an AQI band fill: the two darkest bands need white for contrast. */
export const aqiInk = (band: number | null): string =>
  band != null && band >= 4 ? "#FFFFFF" : "#1B1B1A";

/**
 * Where a value sits on the six-band bar, as a percentage of its width.
 * Each band takes a sixth whatever its AQI span, like the bar itself.
 */
export const aqiPinPosition = (aqi: number): number => {
  const bounds = [0, 51, 101, 151, 201, 301, 501];
  const band = getAQIIndex(aqi);
  const low = bounds[band];
  const high = bounds[band + 1];
  const within = Math.min(1, Math.max(0, (aqi - low) / (high - low)));
  return ((band + within) / 6) * 100;
};

// --- Particle scales --------------------------------------------------------

type ParticleScale = {
  /** Upper bound of good, moderate and sensitive; above the last is unhealthy. */
  cuts: [number, number, number];
  /** The chart never scales below this, so a clean week does not look alarming. */
  minChartMax: number;
  decimals: number;
};

/** EPA AQI breakpoints, in µg/m³. */
export const PARTICLE_SCALES: Record<Particle, ParticleScale> = {
  pm25: { cuts: [12, 35.4, 55.4], minChartMax: 40, decimals: 1 },
  pm10: { cuts: [54, 154, 254], minChartMax: 80, decimals: 0 },
};

/** Level 0–3 of a concentration. */
export const particleLevel = (particle: Particle, value: number): number => {
  const [good, moderate, sensitive] = PARTICLE_SCALES[particle].cuts;
  if (value <= good) return 0;
  if (value <= moderate) return 1;
  if (value <= sensitive) return 2;
  return 3;
};

// Gridline steps the axis may use: the chart draws four, so the maximum is
// four times one of these and every label is a round number.
const AXIS_STEPS = [2.5, 5, 10, 15, 20, 25, 50, 75, 100, 150, 200, 250, 500];

/** A round axis maximum that fits every value and the limit line. */
export const chartMax = (
  particle: Particle,
  values: (number | null)[],
  limit: number | null,
): number => {
  const peak = Math.max(
    PARTICLE_SCALES[particle].minChartMax,
    ...values.filter((value): value is number => value != null),
    limit != null ? limit * 1.1 : 0,
  );
  const step =
    AXIS_STEPS.find((candidate) => candidate * 4 >= peak) ??
    Math.ceil(peak / 4 / 500) * 500;
  return step * 4;
};

// --- Statistics -------------------------------------------------------------

const present = (values: (number | null | undefined)[]): number[] =>
  values.filter(
    (value): value is number => value != null && Number.isFinite(value),
  );

export const mean = (values: (number | null | undefined)[]): number | null => {
  const xs = present(values);
  return xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : null;
};

export const median = (
  values: (number | null | undefined)[],
): number | null => {
  const xs = present(values).sort((a, b) => a - b);
  if (!xs.length) return null;
  const middle = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[middle] : (xs[middle - 1] + xs[middle]) / 2;
};

// --- Paraguay time ----------------------------------------------------------

// Paraguay abolished daylight saving in 2024 and keeps UTC−3 all year. The
// offset is applied by hand rather than through `America/Asuncion` because a
// browser with older time-zone data would still shift by an hour in summer.
const PY_OFFSET_MS = -3 * 3_600_000;

/** A reading's moment, shifted so its UTC fields read as Paraguayan time. */
const pyClock = (ts: string): Date =>
  new Date(new Date(ts).getTime() + PY_OFFSET_MS);

/** `YYYY-MM-DD` of the Paraguayan calendar day a reading falls on. */
const pyDayKey = (ts: string): string => pyClock(ts).toISOString().slice(0, 10);

export const pyHour = (ts: string): number => pyClock(ts).getUTCHours();

const LOCALES: Record<Lang, string> = {
  es: "es-PY",
  en: "en-GB",
  pt: "pt-BR",
};

/** Weekday names come from Intl, formatted in UTC over the shifted clock. */
const weekdayShort = (date: Date, lang: Lang): string =>
  new Intl.DateTimeFormat(LOCALES[lang], { weekday: "short", timeZone: "UTC" })
    .format(date)
    .replace(".", "");

/** `lun 17` — a day label under a bar. */
export const formatDayLabel = (ts: string, lang: Lang): string => {
  const clock = pyClock(ts);
  return `${weekdayShort(clock, lang)} ${clock.getUTCDate()}`;
};

const pad = (value: number) => String(value).padStart(2, "0");

/** `17/11` */
export const formatDayMonth = (ts: string): string => {
  const clock = pyClock(ts);
  return `${pad(clock.getUTCDate())}/${pad(clock.getUTCMonth() + 1)}`;
};

/** `09:00` */
export const formatHour = (hour: number): string => `${pad(hour)}:00`;

/** `lun 17/11 · 09:00` — a moment in a tooltip. */
export const formatReadingMoment = (ts: string, lang: Lang): string => {
  const clock = pyClock(ts);
  return `${weekdayShort(clock, lang)} ${formatDayMonth(ts)} · ${formatHour(clock.getUTCHours())}`;
};

/** `lun 17/11` — a day in a tooltip. */
export const formatReadingDay = (ts: string, lang: Lang): string =>
  `${weekdayShort(pyClock(ts), lang)} ${formatDayMonth(ts)}`;

/** `23/11 · 09:00` — the page header's "updated" stamp. */
export const formatStamp = (ts: string): string => {
  const clock = pyClock(ts);
  return `${formatDayMonth(ts)} · ${pad(clock.getUTCHours())}:${pad(clock.getUTCMinutes())}`;
};

/** A concentration in the reader's number format: `5,4` / `5.4`. */
export const formatNumber = (
  value: number,
  decimals: number,
  lang: Lang,
): string =>
  new Intl.NumberFormat(LOCALES[lang], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

// --- Aggregates -------------------------------------------------------------

/** One Paraguayan calendar day of a series. */
export type DayBucket = {
  /** The first reading of the day, for labelling it. */
  ts: string;
  values: (number | null)[];
  average: number | null;
};

/**
 * The series grouped by Paraguayan day, oldest first, keeping only the last
 * `days`. A seven-day window of hours straddles eight calendar days, so the
 * oldest, partial one is what gets dropped.
 */
export const dailyBuckets = (
  readings: SensorReading[],
  particle: Particle,
  days = 7,
): DayBucket[] => {
  const byDay = new Map<string, DayBucket>();
  for (const reading of readings) {
    const key = pyDayKey(reading.ts);
    const bucket = byDay.get(key) ?? {
      ts: reading.ts,
      values: [],
      average: null,
    };
    bucket.values.push(reading[particle]);
    byDay.set(key, bucket);
  }
  const buckets = [...byDay.values()].slice(-days);
  for (const bucket of buckets) bucket.average = mean(bucket.values);
  return buckets;
};

/** The average of each hour of the day (0–23) across the series. */
export const hourlyProfile = (
  readings: SensorReading[],
  particle: Particle,
): (number | null)[] => {
  const hours: (number | null)[][] = Array.from({ length: 24 }, () => []);
  for (const reading of readings) {
    hours[pyHour(reading.ts)].push(reading[particle]);
  }
  return hours.map(mean);
};

/** The best and worst hour of the day by average, or null with no data. */
export const bestAndWorstHour = (
  profile: (number | null)[],
): { best: number; worst: number } | null => {
  let best: number | null = null;
  let worst: number | null = null;
  profile.forEach((value, hour) => {
    if (value == null) return;
    if (best == null || value < (profile[best] as number)) best = hour;
    if (worst == null || value > (profile[worst] as number)) worst = hour;
  });
  return best == null || worst == null ? null : { best, worst };
};

/** The readings in the last 24 hours before the newest one. */
export const lastDay = (readings: SensorReading[]): SensorReading[] => {
  const newest = readings.at(-1);
  if (!newest) return [];
  const cutoff = new Date(newest.ts).getTime() - 24 * 3_600_000;
  return readings.filter((reading) => new Date(reading.ts).getTime() > cutoff);
};

/** One row of the 7 × 24 heat map: a day and its value at each hour. */
export type HeatRow = { ts: string; cells: (number | null)[] };

export const heatRows = (
  readings: SensorReading[],
  particle: Particle,
): HeatRow[] => {
  const byDay = new Map<string, HeatRow>();
  for (const reading of readings) {
    const key = pyDayKey(reading.ts);
    const row = byDay.get(key) ?? {
      ts: reading.ts,
      cells: Array.from({ length: 24 }, () => null),
    };
    row.cells[pyHour(reading.ts)] = reading[particle];
    byDay.set(key, row);
  }
  return [...byDay.values()].slice(-7);
};

/** The newest non-null value of a particle in the series. */
export const latestValue = (
  readings: SensorReading[],
  particle: Particle,
): number | null => {
  for (let index = readings.length - 1; index >= 0; index -= 1) {
    const value = readings[index][particle];
    if (value != null) return value;
  }
  return null;
};
