import { FAQ_SEED_CATEGORIES, type FaqCategory } from "../data/faq";
import { getBackendUrl } from "./runtime-config";

// FAQ content is edited in the Django Admin, so the page fetches it on render.
// Two things soften that dependency:
//
//   * an in-process cache, so a burst of requests hits the backend once per
//     window instead of once per page view;
//   * a fallback to the bundled seed, so a backend outage renders the last
//     known-good content instead of an empty page.
//
// The API returns the same shape as the seed (`{ id, label, questions }` with a
// `{ es, en, pt }` map per string), which is what makes the two interchangeable.

const CACHE_TTL_MS = 5 * 60 * 1000;

// Keep the render fast when the backend is slow or hanging: past this the page
// falls back to the seed rather than making the visitor wait.
const REQUEST_TIMEOUT_MS = 3000;

type CacheEntry = {
  categories: FaqCategory[];
  expiresAt: number;
};

let cache: CacheEntry | undefined;

// Concurrent renders share one in-flight request instead of each firing their own.
let inFlight: Promise<FaqCategory[]> | undefined;

const isLocalized = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  ["es", "en", "pt"].every(
    (lang) => typeof (value as Record<string, unknown>)[lang] === "string",
  );

// The response crosses a process boundary, so validate its shape rather than
// trusting it: a malformed payload should fall back to the seed, not render
// `undefined` into the page.
const isFaqCategoryArray = (value: unknown): value is FaqCategory[] =>
  Array.isArray(value) &&
  value.every(
    (category) =>
      typeof category?.id === "string" &&
      isLocalized(category?.label) &&
      Array.isArray(category?.questions) &&
      category.questions.every(
        (question: unknown) =>
          isLocalized((question as FaqCategory["questions"][number])?.q) &&
          isLocalized((question as FaqCategory["questions"][number])?.a),
      ),
  );

const fetchFaqCategories = async (): Promise<FaqCategory[]> => {
  const backendUrl = await getBackendUrl();
  const response = await fetch(`${backendUrl}/faq/`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`FAQ request failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isFaqCategoryArray(payload)) {
    throw new Error("FAQ response did not match the expected shape");
  }
  return payload;
};

/**
 * Returns the FAQ categories for the public page.
 *
 * Never rejects: on any failure it serves the stale cache if there is one, and
 * the bundled seed otherwise, so the page always renders something.
 */
export const getFaqCategories = async (): Promise<FaqCategory[]> => {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.categories;
  }

  if (!inFlight) {
    inFlight = fetchFaqCategories()
      .then((categories) => {
        // An empty list means every category is unpublished, which is a valid
        // editorial state — cache it rather than treating it as a failure.
        cache = { categories, expiresAt: Date.now() + CACHE_TTL_MS };
        return categories;
      })
      .catch((error) => {
        console.error("Could not load FAQ from the backend", error);
        // Serve whatever we last had; the seed is the floor.
        return cache?.categories ?? FAQ_SEED_CATEGORIES;
      })
      .finally(() => {
        inFlight = undefined;
      });
  }

  return inFlight;
};
