// The public historical export (RES-439).
//
// Deliberately separate from `store/institution.ts`: that module normalises
// every failure against a session — "you are logged out" is one of its codes —
// and this endpoint has no session at all. Sharing it would have meant teaching
// it about a caller that can never be authenticated.
//
// What the two do share is the file-handoff mechanics, which live in
// `utils/download.ts`.

import { getBackendUrl } from "./runtime-config";
import { saveResponseAsFile } from "../utils/download";

/** The formats the endpoint serves. */
export type ExportFormat = "xlsx" | "json";

/**
 * Why an export did not happen, in the terms the page explains to a visitor.
 *
 * `ineligible` and `invalid-range` are answers the server gave; the page also
 * checks the range itself, but only to explain it sooner. `throttled` is its
 * own code because the remedy is different from every other failure — wait,
 * rather than change anything about the request.
 */
export type PublicExportErrorCode =
  | "ineligible"
  | "invalid-range"
  | "throttled"
  | "unavailable";

export class PublicExportError extends Error {
  code: PublicExportErrorCode;

  // The code is the whole payload: what the visitor reads is a translated
  // string the page picks from it, never a message passed up from here, so
  // there is nothing for a `message` argument to carry.
  constructor(code: PublicExportErrorCode) {
    super(code);
    this.name = "PublicExportError";
    this.code = code;
  }
}

export type ExportOutcome = {
  /**
   * How many measurements the file holds, from `X-Respira-Export-Rows`.
   *
   * Zero is a success with nothing in it — the sensor reported no data in the
   * period — and the page says so rather than leaving someone to open an empty
   * spreadsheet and wonder whether the download broke.
   */
  rowCount: number;
  /**
   * Sub-ranges the backend could not fetch, from `X-Respira-Partial-Export`.
   * Zero for a complete file.
   */
  missingRanges: number;
};

/**
 * The query parameter naming the format.
 *
 * Not `format`: DRF reserves that one for content negotiation, and a request
 * carrying it is answered by its renderer machinery instead of by the view.
 * Mirrors `FORMAT_PARAM` in `api/public_exports.py`.
 */
const FORMAT_PARAM = "output";

const FALLBACK_FILENAME: Record<ExportFormat, string> = {
  xlsx: "historial-mediciones.xlsx",
  json: "historial-mediciones.json",
};

/**
 * Downloads a sensor's measurements for a date range.
 *
 * The bounds are the server's to enforce — it re-checks the free-tier window
 * and the sensor's eligibility whatever this sends — so the failures below are
 * about *explaining* an answer, never about deciding it.
 */
export const downloadStationExport = async (
  stationId: number,
  options: { from: string; to: string; format: ExportFormat },
): Promise<ExportOutcome> => {
  const backendUrl = await getBackendUrl();
  const params = new URLSearchParams({
    from: options.from,
    to: options.to,
    [FORMAT_PARAM]: options.format,
  });

  let response: Response;
  try {
    response = await fetch(
      `${backendUrl}/stations/${stationId}/export/?${params}`,
    );
  } catch {
    // Network-level failure: nothing was answered, so nothing more specific
    // can be said than "not right now".
    throw new PublicExportError("unavailable");
  }

  if (!response.ok) {
    if (response.status === 404) throw new PublicExportError("ineligible");
    if (response.status === 429) throw new PublicExportError("throttled");
    if (response.status === 400) throw new PublicExportError("invalid-range");
    throw new PublicExportError("unavailable");
  }

  const rowCount = Number(response.headers.get("X-Respira-Export-Rows") ?? 0);
  const missingRanges = Number(
    response.headers.get("X-Respira-Partial-Export") ?? 0,
  );

  await saveResponseAsFile(response, FALLBACK_FILENAME[options.format]);

  return {
    rowCount: Number.isFinite(rowCount) ? rowCount : 0,
    missingRanges: Number.isFinite(missingRanges) ? missingRanges : 0,
  };
};
