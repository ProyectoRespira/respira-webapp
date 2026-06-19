import { atom, computed, task, type Task } from "nanostores";
import { isBackendAvailable } from "./store";
import { BACKEND_URL, EXCLUDED_STATIONS } from "../data/constants";

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
export const DEFAULT_REGION_ID = String(
  import.meta.env.PUBLIC_REGION_DEFAULT_ID,
);

// Currently selected region. Defaults to the configured region and may be
// updated by geolocation detection or a manual change.
export const selectedRegionId = atom<string>(DEFAULT_REGION_ID);

export const setSelectedRegion = (id: string) => {
  selectedRegionId.set(id);
};

export const errorRegion = atom<string | undefined>(undefined);
export const loadingRegion = atom<boolean>(false);

export const fetchRegion = async (regionId: string) => {
  loadingRegion.set(true);
  try {
    const response = await fetch(
      BACKEND_URL + `/map?entity=region&id=${regionId}`,
    );
    loadingRegion.set(false);
    return response.json();
  } catch {
    loadingRegion.set(false);
    errorRegion.set("There has been an error getting the region.");
    return undefined;
  }
};

export const region = computed(
  [isBackendAvailable, selectedRegionId],
  (backendAvailable, regionId) =>
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
  const response = await fetch(BACKEND_URL + `/regions/`);
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

export const errorRegionMeta = atom<string | undefined>(undefined);
export const loadingRegionMeta = atom<boolean>(false);

export const fetchRegionMeta = async (
  regionId: string,
): Promise<REGION_META | undefined> => {
  loadingRegionMeta.set(true);
  try {
    const regions = await fetchRegions();
    loadingRegionMeta.set(false);
    if (regions.length === 0) {
      return undefined;
    }
    return regions.find((r) => r.id === regionId) ?? regions[0];
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

export const fetchStations = async () => {
  loadingStations.set(true);
  try {
    const stationsPromise = await fetch(
      import.meta.env.PUBLIC_BACKEND_URL + `/stations`,
    );
    const s = await stationsPromise.json();
    const availableStations = s.filter(
      (v: STATION) => v.is_station_on && !EXCLUDED_STATIONS.includes(v.id),
    );
    loadingStations.set(false);

    return availableStations;
  } catch (err) {
    loadingStations.set(false);
    console.log("Error on fetching station data", err);
    errorStations.set("Error getting the stations");
    return undefined;
  }
};

export const stations = computed(
  isBackendAvailable,
  (backendAvailable): Task<STATION[]> =>
    task(async () => {
      if (!backendAvailable) {
        return undefined;
      }
      return fetchStations();
    }),
);

export const fetchForecast = async (id: number) => {
  try {
    const forecast = await fetch(BACKEND_URL + `/map?entity=station&id=${id}`);
    if (forecast.status !== 200) {
      return undefined;
    }
    return forecast.json();
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
  (backendAvailable, id, stations): Task<STATION & STATION_FORECAST> =>
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
      const stationForecast = await fetchForecast(id);
      if (!stationForecast) {
        selectedStationError.set(true);
        return undefined;
      }
      const station = stations.filter((s: STATION) => s.id === id)[0];
      return { ...station, ...stationForecast };
    }),
);
