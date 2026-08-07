import { atom, computed, task, type Task } from "nanostores";
import { isBackendAvailable } from "./store";
import { EXCLUDED_STATIONS } from "../data/constants";
import { getBackendUrl, getRegionDefaultId } from "./runtime-config";

export type FORECAST = {
  value: number;
  timestamp: string;
};
export type STATION = {
  id: number;
  name: string;
  coordinates: number[];
  is_station_on: boolean;
  aqi_pm2_5: number;
  region: {
    name: string;
  };
};

export type STATION_FORECAST = {
  aqi: number;
  forecast_6h: FORECAST[];
  forecast_12h: FORECAST[];
};
// Region ids exceed Number.MAX_SAFE_INTEGER, so they must stay strings
// end-to-end — `Number(id)` rounds them and breaks the backend lookups.
const buildDefaultRegionId = import.meta.env.PUBLIC_REGION_DEFAULT_ID;
export const DEFAULT_REGION_ID =
  typeof buildDefaultRegionId === "string" ? buildDefaultRegionId.trim() : "";

// Remembers the user's region across reloads so a returning visitor lands
// directly on their region instead of the configured default. Only the
// geolocation result and explicit manual choices are stored here — not map
// panning — so the remembered region stays the user's "home" region.
//
// This is only a seed for the first paint, never a pin: live geolocation runs
// on every load and overrides it (gliding to the new region and re-saving), so
// a user who changes location is moved to the correct region. The stored value
// only matters when geolocation is unavailable, and it expires after the TTL so
// a long-absent visitor who may have moved doesn't open on a stale region.
const REGION_STORAGE_KEY = "respira:last-region";
const REGION_MEMORY_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const getStoredRegionId = (): string => {
  if (typeof localStorage === "undefined") return "";
  try {
    const raw = localStorage.getItem(REGION_STORAGE_KEY);
    if (!raw) return "";
    const { id, ts } = JSON.parse(raw) as { id?: unknown; ts?: unknown };
    if (typeof id !== "string" || !id.trim()) return "";
    if (typeof ts !== "number" || Date.now() - ts > REGION_MEMORY_TTL_MS) {
      return "";
    }
    return id.trim();
  } catch {
    return "";
  }
};

export const rememberRegionId = (id: string): void => {
  if (typeof localStorage === "undefined" || !id.trim()) return;
  try {
    localStorage.setItem(
      REGION_STORAGE_KEY,
      JSON.stringify({ id, ts: Date.now() }),
    );
  } catch {
    // Storage unavailable (private mode, quota) — just fall back next load.
  }
};

// Currently selected region. Seeds from the last remembered region so a reload
// lands on the user's region with no flash of the default; otherwise the
// configured default. May be updated by geolocation detection or a manual
// change.
export const selectedRegionId = atom<string>(
  getStoredRegionId() || DEFAULT_REGION_ID,
);

export const getDefaultRegionId = async (): Promise<string> =>
  DEFAULT_REGION_ID || (await getRegionDefaultId());

const getActiveRegionId = async (regionId: string): Promise<string> => {
  if (regionId.trim()) return regionId;

  const defaultRegionId = await getDefaultRegionId();
  if (!selectedRegionId.get().trim()) {
    selectedRegionId.set(defaultRegionId);
  }
  return defaultRegionId;
};

export const setSelectedRegion = (id: string) => {
  selectedRegionId.set(id);
};

export const errorRegion = atom<string | undefined>(undefined);
export const loadingRegion = atom<boolean>(false);

export type REGION_AQI = {
  aqi: number;
  forecast_6h: FORECAST[];
  forecast_12h: FORECAST[];
};

const isForecastSeries = (value: unknown): value is FORECAST[] =>
  Array.isArray(value) &&
  value.every(
    (point) =>
      !!point &&
      typeof point === "object" &&
      typeof (point as FORECAST).value === "number" &&
      Number.isFinite((point as FORECAST).value),
  );

// The endpoint answers 404 with an `{ error }` body for a region with no
// readings. That body is a truthy object, so it used to flow downstream as if
// it were region data and blew up on the first `data.aqi` read. Anything that
// isn't a complete, usable payload becomes `undefined` here instead.
const parseRegionPayload = (payload: unknown): REGION_AQI | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const { aqi, forecast_6h, forecast_12h } = payload as Record<string, unknown>;
  if (typeof aqi !== "number" || !Number.isFinite(aqi) || aqi < 0) {
    return undefined;
  }
  if (!isForecastSeries(forecast_6h) || !isForecastSeries(forecast_12h)) {
    return undefined;
  }
  return { aqi, forecast_6h, forecast_12h };
};

export const fetchRegion = async (
  regionId: string,
): Promise<REGION_AQI | undefined> => {
  loadingRegion.set(true);
  // Reset per-request so moving from a sensorless region back to a populated
  // one clears the previous error instead of latching it.
  errorRegion.set(undefined);
  try {
    const backendUrl = await getBackendUrl();
    const activeRegionId = await getActiveRegionId(regionId);
    const response = await fetch(
      backendUrl + `/map?entity=region&id=${activeRegionId}`,
    );

    // 404 is how the endpoint reports a region with zero active stations, so it
    // is an expected empty result and not worth recording as an error.
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      errorRegion.set("There has been an error getting the region.");
      return undefined;
    }

    // An incomplete payload is treated as "nothing to show" rather than being
    // passed on — that is the bug this whole path exists to prevent.
    return parseRegionPayload(await response.json());
  } catch {
    errorRegion.set("There has been an error getting the region.");
    return undefined;
  } finally {
    loadingRegion.set(false);
  }
};

export const region = computed(
  [isBackendAvailable, selectedRegionId],
  (backendAvailable, regionId): Task<REGION_AQI | undefined> =>
    task(async () => {
      if (!backendAvailable) {
        return undefined;
      }
      return fetchRegion(regionId);
    }),
);

export type REGION_META = {
  id: string;
  name: string;
  region_code: string;
  bbox: string | null;
};

// Fetches all regions, keeping `id` as a string. JSON.parse would round the
// huge ids, so they are quoted before parsing.
export const fetchRegions = async (): Promise<REGION_META[]> => {
  const backendUrl = await getBackendUrl();
  const response = await fetch(backendUrl + `/regions/`);
  const text = await response.text();
  const safe = text.replace(/("id":\s*)(\d+)/g, '$1"$2"');
  const regions = JSON.parse(safe);
  return Array.isArray(regions) ? regions : [];
};

// All regions, loaded once — used to resolve which region a point belongs to.
export const allRegions = computed(isBackendAvailable, (backendAvailable) =>
  task(async (): Promise<REGION_META[]> => {
    if (!backendAvailable) {
      return [];
    }
    try {
      return await fetchRegions();
    } catch {
      return [];
    }
  }),
);

// bbox is "minLon,minLat,maxLon,maxLat".
const isInsideBbox = (
  bbox: string | null,
  lon: number,
  lat: number,
): boolean => {
  if (!bbox) return false;
  const parts = bbox.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [minLon, minLat, maxLon, maxLat] = parts;
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
};

// Returns the region whose bbox contains the point, or undefined when the
// point falls outside every region.
export const regionForCoords = (
  regions: REGION_META[],
  lon: number,
  lat: number,
): REGION_META | undefined =>
  regions.find((r) => isInsideBbox(r.bbox, lon, lat));

// A located point farther than this from every region's bbox is treated as
// "not near any region" so the default (Asunción, via PUBLIC_REGION_DEFAULT_ID)
// is used instead. Configurable via PUBLIC_REGION_MAX_DISTANCE_KM so it can be
// tuned per deployment without a code change — wide enough to absorb slightly
// miscalibrated bboxes (e.g. a city center sitting just outside its own
// rectangle), but narrow enough that someone in another country isn't pulled
// into a Paraguayan region. Defaults to ~100 km.
const DEFAULT_MAX_NEAREST_REGION_KM = 100;
const KM_PER_DEGREE = 111.32; // at the equator; good enough for a threshold.

const resolveMaxNearestRegionKm = (): number => {
  const raw = import.meta.env.PUBLIC_REGION_MAX_DISTANCE_KM;
  const parsed = typeof raw === "string" ? Number(raw.trim()) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_MAX_NEAREST_REGION_KM;
};

const MAX_NEAREST_REGION_DEGREES = resolveMaxNearestRegionKm() / KM_PER_DEGREE;

// Squared distance from a point to a bbox rectangle, 0 when inside. Longitude is
// scaled by cos(latitude) so a degree of longitude and a degree of latitude are
// roughly the same real distance at Paraguay's latitudes. Returns undefined for
// an unusable bbox.
const squaredDistanceToBbox = (
  bbox: string | null,
  lon: number,
  lat: number,
): number | undefined => {
  if (!bbox) return undefined;
  const parts = bbox.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n)))
    return undefined;
  const [minLon, minLat, maxLon, maxLat] = parts;
  // Closest point of the rectangle to (lon, lat); equals (lon, lat) when inside.
  const nearestLon = Math.min(Math.max(lon, minLon), maxLon);
  const nearestLat = Math.min(Math.max(lat, minLat), maxLat);
  const lonScale = Math.cos((lat * Math.PI) / 180);
  const dLon = (lon - nearestLon) * lonScale;
  const dLat = lat - nearestLat;
  return dLon * dLon + dLat * dLat;
};

// Returns the region whose bbox is closest to the point — the region containing
// it (distance 0) when there is one, otherwise the nearest within
// MAX_NEAREST_REGION_DEGREES. Used for geolocation so a slightly miscalibrated
// bbox still resolves to the right region instead of silently falling back.
export const nearestRegion = (
  regions: REGION_META[],
  lon: number,
  lat: number,
): REGION_META | undefined => {
  let best: REGION_META | undefined;
  let bestDistance = MAX_NEAREST_REGION_DEGREES * MAX_NEAREST_REGION_DEGREES;
  for (const r of regions) {
    const distance = squaredDistanceToBbox(r.bbox, lon, lat);
    if (distance === undefined) continue;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = r;
    }
  }
  return best;
};

export const errorRegionMeta = atom<string | undefined>(undefined);
export const loadingRegionMeta = atom<boolean>(false);

export const fetchRegionMeta = async (
  regionId: string,
): Promise<REGION_META | undefined> => {
  loadingRegionMeta.set(true);
  try {
    const activeRegionId = await getActiveRegionId(regionId);
    const regions = await fetchRegions();
    loadingRegionMeta.set(false);
    if (regions.length === 0) {
      return undefined;
    }
    return regions.find((r) => r.id === activeRegionId) ?? regions[0];
  } catch {
    loadingRegionMeta.set(false);
    errorRegionMeta.set("There has been an error getting the region metadata.");
    return undefined;
  }
};

export const regionMeta = computed(
  [isBackendAvailable, selectedRegionId],
  (backendAvailable, regionId) =>
    task(async () => {
      if (!backendAvailable) {
        return undefined;
      }
      return fetchRegionMeta(regionId);
    }),
);

export const errorStations = atom<string | undefined>(undefined);
export const loadingStations = atom<boolean>(false);

// A station is only mappable with a finite lat/lon pair; anything else would
// hand NaN to maplibre, which throws and takes the map down with it.
const isMappableStation = (station: unknown): station is STATION => {
  if (!station || typeof station !== "object") return false;
  const { coordinates } = station as STATION;
  return (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    coordinates
      .slice(0, 2)
      .every((n) => typeof n === "number" && Number.isFinite(n))
  );
};

export const fetchStations = async (): Promise<STATION[] | undefined> => {
  loadingStations.set(true);
  errorStations.set(undefined);
  try {
    const backendUrl = await getBackendUrl();
    const stationsPromise = await fetch(backendUrl + `/stations`);
    if (!stationsPromise.ok) {
      errorStations.set("Error getting the stations");
      return undefined;
    }
    const s = await stationsPromise.json();
    // An empty list is a valid answer (every region may be offline) — only a
    // non-list is a failure.
    if (!Array.isArray(s)) {
      errorStations.set("Error getting the stations");
      return undefined;
    }
    return s.filter(
      (v: STATION) =>
        isMappableStation(v) &&
        v.is_station_on &&
        !EXCLUDED_STATIONS.includes(v.id),
    );
  } catch (err) {
    console.log("Error on fetching station data", err);
    errorStations.set("Error getting the stations");
    return undefined;
  } finally {
    loadingStations.set(false);
  }
};

export const stations = computed(
  isBackendAvailable,
  (backendAvailable): Task<STATION[] | undefined> =>
    task(async () => {
      if (!backendAvailable) {
        return undefined;
      }
      return fetchStations();
    }),
);

export const fetchForecast = async (
  id: number,
): Promise<STATION_FORECAST | undefined> => {
  try {
    const backendUrl = await getBackendUrl();
    const forecast = await fetch(backendUrl + `/map?entity=station&id=${id}`);
    // The endpoint uses 4xx for every "nothing to report" case — no readings,
    // no forecast, station manually shut down. Those are expected, so they
    // return empty without being recorded as errors.
    if (forecast.status >= 400 && forecast.status < 500) {
      return undefined;
    }
    if (!forecast.ok) {
      errorStations.set(`Error getting forecast of station ${id}`);
      return undefined;
    }
    // Same shape as the region payload — reject partial responses so the card
    // never renders an AQI or a chart from missing values.
    return parseRegionPayload(await forecast.json());
  } catch (err) {
    console.log("Error on fetching forecast data", err);
    errorStations.set(`Error getting forecast of station ${id}`);
    return undefined;
  }
};
export const selectedStationId = atom<number | undefined>(undefined);

export const setSelectedStation = (station_id: number | undefined) => {
  selectedStationId.set(station_id);
};

export const selectedStationError = atom<boolean>(false);

export const selectedStation = computed(
  [isBackendAvailable, selectedStationId, stations],
  (
    backendAvailable,
    id,
    stations,
  ): Task<(STATION & STATION_FORECAST) | undefined> =>
    task(async () => {
      selectedStationError.set(false);

      if (!backendAvailable) {
        selectedStationError.set(true);
        return undefined;
      }
      if (!id || !stations) {
        selectedStationError.set(true);
        return undefined;
      }
      // The station may have gone offline since it was selected, in which case
      // it is no longer in the active list — fall back rather than merging a
      // forecast onto a missing station. That is an expected gap, not a fault.
      const station = stations.find((s: STATION) => s.id === id);
      if (!station) {
        selectedStationError.set(true);
        return undefined;
      }
      const stationForecast = await fetchForecast(id);
      if (!stationForecast) {
        selectedStationError.set(true);
        return undefined;
      }
      return { ...station, ...stationForecast };
    }),
);
