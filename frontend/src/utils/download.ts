/**
 * Handing a fetched file to the browser as a download.
 *
 * Extracted from `store/institution.ts` when the public sensor pages grew their
 * own export (RES-439): the awkward parts here — WebViews that refuse blob
 * URLs, the two spellings of `Content-Disposition`, the revoke that must not
 * happen too early — were each found the hard way, and a second copy would
 * have been a second place to rediscover them.
 *
 * Deliberately knows nothing about *which* endpoint produced the file: it takes
 * a `Response` somebody else fetched. That keeps the institutional panel's
 * session handling and the public pages' error handling in their own stores,
 * where they differ, and shares only the part where they do not.
 */

/**
 * Saves a `Response`'s body as a file, named by its `Content-Disposition`.
 *
 * @param fallbackFilename used when the response carries no usable name.
 */
export const saveResponseAsFile = async (
  response: Response,
  fallbackFilename: string,
): Promise<void> => {
  const blob = await response.blob();
  const filename = filenameFromResponse(response, fallbackFilename);

  // `msSaveOrOpenBlob` is the only path that works in embedded WebViews which
  // block navigation to blob: URLs (VS Code's Simple Browser among them); the
  // anchor click below silently does nothing there.
  const legacySave = (
    navigator as Navigator & {
      msSaveOrOpenBlob?: (blob: Blob, filename: string) => boolean;
    }
  ).msSaveOrOpenBlob;
  if (typeof legacySave === "function") {
    legacySave.call(navigator, blob, filename);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  // `rel=noopener` matters for the fallback below, where a blocked download can
  // fall back to opening the blob in a tab.
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking in the same tick can invalidate the URL before the browser has
  // started reading it — the download then fails silently, with no error to
  // catch. One minute is far longer than any handoff needs and still bounds the
  // memory the blob holds.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/**
 * The filename the server asked for, or `fallback` when it named none.
 *
 * Not exported: `saveResponseAsFile` is the whole of this module's surface,
 * and a caller reading the name without also saving the file has no use for it.
 */
const filenameFromResponse = (response: Response, fallback: string): string => {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  // Prefer RFC 5987 (`filename*=UTF-8''…`) when present; fall back to the plain
  // `filename="…"` form, and to a sensible default when the header is absent.
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      // Malformed percent-encoding: fall through to the plain form.
    }
  }
  const plain = disposition.match(/filename="?([^";]+)"?/i);
  if (plain) return plain[1];
  return fallback;
};
