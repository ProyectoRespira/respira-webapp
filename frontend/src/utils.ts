import { AQI_COLORS } from "./data/constants";

// `getAQIIndex` throws on anything that isn't a usable AQI. Regions with no
// active stations have no AQI at all, so every render path that can receive an
// absent value must narrow it with this guard first — a throw inside render
// unmounts the whole island (that is how a sensorless region blanked the map).
export const isValidAqi = (aqi: unknown): aqi is number =>
  typeof aqi === "number" && Number.isFinite(aqi) && aqi >= 0;

export const getAQIIndex = (aqi: number): number => {
  const ranges: [number, number][] = [
    [0, 50],
    [51, 100],
    [101, 150],
    [151, 200],
    [201, 300],
    [301, 400],
  ];
  let AQIIndex = 5;

  if (aqi === null || aqi === undefined || Number.isNaN(aqi)) {
    throw SyntaxError("getAQIIndex: 'aqi' is not defined");
  }
  if (aqi < 0) {
    throw SyntaxError("getAQIIndex: 'aqi' is not a valid number; must be >= 0");
  }

  const roundedAqi = Math.round(aqi);
  for (const [index, r] of ranges.entries()) {
    if (roundedAqi >= r[0] && roundedAqi <= r[1]) {
      AQIIndex = index;
      break;
    }
  }
  return AQIIndex;
};

export const getColorRange = (aqi: number) => AQI_COLORS[getAQIIndex(aqi)];

export type LngLatBounds = [[number, number], [number, number]];

export const parseBbox = (bbox?: string | null): LngLatBounds | undefined => {
  if (!bbox) {
    return undefined;
  }
  const parts = bbox.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return undefined;
  }
  const [minLon, minLat, maxLon, maxLat] = parts;
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
};

export const expandBounds = (
  bounds: LngLatBounds,
  factor: number,
): LngLatBounds => {
  const [[minLon, minLat], [maxLon, maxLat]] = bounds;
  const lonPad = ((maxLon - minLon) * factor) / 2;
  const latPad = ((maxLat - minLat) * factor) / 2;
  return [
    [minLon - lonPad, minLat - latPad],
    [maxLon + lonPad, maxLat + latPad],
  ];
};

export const getTextColor = (bg: string) => {
  const darks = ["aqi-red-dark", "aqi-purple-dark", "aqi-vermellion-dark"];
  if (darks.includes(bg)) {
    return "white";
  }
  return "black";
};
