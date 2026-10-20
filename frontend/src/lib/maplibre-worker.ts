// maplibre-gl v6 loads its worker from a file next to its own module
// (import.meta.url). Once Vite bundles maplibre that sibling file no longer
// exists, so the map fails with "Worker failed to load". Bundle the worker as
// a self-contained Vite worker entry and point maplibre at it instead.
// Import this module (for its side effect) before rendering any map.
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);
