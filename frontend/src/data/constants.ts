export const AQI_RANGES: [number, number][] = [
  [0, 50],
  [51, 100],
  [101, 150],
  [151, 200],
  [201, 300],
  [301, 400],
];
export const AQI_COLORS: string[] = [
  "#AFFAAF",
  "#FFEB7F",
  "#FBC189",
  "#F27474",
  "#B179B6",
  "#98334F",
];

export const EXCLUDED_STATIONS: number[] = [101];

export const MAP_FALLBACK = {
  center: { longitude: -57.65, latitude: -25.28 },
  zoom: 10.5,
  minZoom: 5.5,
  maxBounds: [
    [-67.0435297482847, -28.42576579802394],
    [-45.05865460568049, -17.608237804262302],
  ] as [[number, number], [number, number]],
};
