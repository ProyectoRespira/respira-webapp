import { atom } from "nanostores";
import {
  fetchRegions,
  getDefaultRegionId,
  nearestRegion,
  rememberRegionId,
  selectedRegionId,
  setSelectedRegion,
} from "./map";

// Set once the user manually picks a region, so automatic geolocation
// detection never overrides an explicit choice.
export const regionManuallySet = atom<boolean>(false);

export const selectRegionManually = (id: string) => {
  regionManuallySet.set(true);
  rememberRegionId(id);
  setSelectedRegion(id);
};

const getCurrentPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 8000,
      maximumAge: 5 * 60 * 1000,
    });
  });

// Detects the user's region from their location and selects it.
// Falls back to the default region (no-op) on any failure: permission
// denied, geolocation unavailable, timeout, or no matching region.
// Re-runs silently when permission is already granted, so a user who moves
// gets the right region without being prompted again.
export const detectNearestRegion = async (): Promise<void> => {
  // Don't override an explicit manual choice.
  if (regionManuallySet.get()) return;

  // SSR / insecure context / unsupported browser.
  if (typeof navigator === "undefined" || !navigator.geolocation) return;

  try {
    // Avoid prompting if the user already denied permission.
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: "geolocation" });
      if (status.state === "denied") return;
    }

    const position = await getCurrentPosition();
    if (regionManuallySet.get()) return;

    const { latitude, longitude } = position.coords;
    const regions = await fetchRegions();
    const match = nearestRegion(regions, longitude, latitude);

    const nextId = match?.id ?? (await getDefaultRegionId());
    // Remember it so the next reload lands here directly, even when the region
    // is unchanged this time.
    rememberRegionId(nextId);
    if (nextId !== selectedRegionId.get()) {
      setSelectedRegion(nextId);
    }
  } catch {
    // Any failure keeps the default region (fallback behavior).
  }
};

// Runs the initial detection and keeps watching the geolocation permission, so
// granting access later (via the prompt, the map's locate button, or browser
// settings) selects the user's region without needing a page reload.
// Returns a cleanup function.
export const initRegionDetection = (): (() => void) => {
  detectNearestRegion();

  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return () => {};
  }

  let status: PermissionStatus | undefined;
  const onChange = () => {
    if (status?.state === "granted") {
      detectNearestRegion();
    }
  };

  navigator.permissions
    .query({ name: "geolocation" })
    .then((s) => {
      status = s;
      s.addEventListener("change", onChange);
    })
    .catch(() => {});

  return () => {
    status?.removeEventListener("change", onChange);
  };
};
