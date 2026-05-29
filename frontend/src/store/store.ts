import { atom, task, onMount } from "nanostores";
import { getBackendUrl } from "./runtime-config";

export const backendHealthCheck = async () => {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    const backendUrl = await getBackendUrl();
    const response = await fetch(backendUrl + "/health/");
    if (response.status !== 200) {
      return false;
    }
    return true;
  } catch {
    console.log("Backend not available");
    return false;
  }
};

export const isBackendAvailable = atom<boolean | undefined>(undefined);

onMount(isBackendAvailable, () => {
  task(async () => {
    isBackendAvailable.set(await backendHealthCheck());
  });
});

isBackendAvailable.listen(() => {});
