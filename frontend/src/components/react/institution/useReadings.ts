import { useEffect, useState } from "react";

import type { ReadingsPeriod, SensorReading } from "../../../data/institution";
import { InstitutionApiError, fetchReadings } from "../../../store/institution";

export type ReadingsState =
  | { status: "loading" }
  | { status: "ready"; readings: SensorReading[] }
  /** The endpoint is not deployed (404): every particle block hides. */
  | { status: "unavailable" }
  | { status: "error" };

// One request per sensor and period for the life of the page: the Summary
// and the Analysis read the same week, and switching pages back and forth
// should not refetch it. Promises rather than results, so two components
// asking at once share the request in flight.
const cache = new Map<string, Promise<SensorReading[]>>();

const finite = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * Keeps only well-formed hours. A reading the panel cannot place in time would
 * throw inside the date arithmetic, and a non-number would print as `NaN`.
 */
const sanitize = (readings: unknown): SensorReading[] =>
  (Array.isArray(readings) ? readings : []).flatMap((item) => {
    const ts = (item as { ts?: unknown })?.ts;
    if (typeof ts !== "string" || Number.isNaN(new Date(ts).getTime())) {
      return [];
    }
    return [
      {
        ts,
        pm25: finite((item as { pm25?: unknown }).pm25),
        pm10: finite((item as { pm10?: unknown }).pm10),
      },
    ];
  });

const load = (station: number, period: ReadingsPeriod) => {
  const key = `${station}:${period}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = fetchReadings(station, period).then((payload) =>
      sanitize(payload?.readings),
    );
    // A failure is not cached: a retry, or the next visit to the page, asks
    // again rather than replaying the error.
    pending.catch(() => cache.delete(key));
    cache.set(key, pending);
  }
  return pending;
};

/**
 * Hourly particles for one sensor and period. With no sensor (`null`) it stays
 * loading and asks for nothing.
 */
export function useReadings(
  station: number | null,
  period: ReadingsPeriod,
): ReadingsState {
  const [state, setState] = useState<ReadingsState>({ status: "loading" });

  useEffect(() => {
    if (station == null) return;
    let active = true;
    setState({ status: "loading" });
    load(station, period)
      .then((readings) => {
        if (active) setState({ status: "ready", readings });
      })
      .catch((error) => {
        if (!active) return;
        setState(
          error instanceof InstitutionApiError && error.code === "unavailable"
            ? { status: "unavailable" }
            : { status: "error" },
        );
      });
    return () => {
      active = false;
    };
  }, [station, period]);

  return state;
}
