// Server-side session resolution for the institutional area (RES-328).
//
// The dashboard is private, so the decision "may this visitor see the page?"
// is made during SSR, before any markup is sent — not in a React island after
// the shell has already rendered. Django owns the session; Astro asks it who
// the caller is by forwarding the request's `Cookie` header to
// `/institution/me/`, which is also the call that supplies the institution name
// and contract the shell needs.

import type { Institution } from "../data/institution";
import { InstitutionApiError, fetchInstitution } from "../store/institution";

export const INSTITUTION_LOGIN_PATH = "/institucion/login";
export const INSTITUTION_DASHBOARD_PATH = "/institucion/dashboard";
export const INSTITUTION_FORGOT_PASSWORD_PATH = "/institucion/recuperar-clave";
/**
 * Where the reset email points. Must stay in step with
 * `INSTITUTION_PASSWORD_RESET_URL` in `backend/backend/settings.py`, which is
 * what builds the link: the backend only supplies the path, and the scheme and
 * host come from the request, so the same link works in every environment.
 */
export const INSTITUTION_RESET_PASSWORD_PATH = "/institucion/restablecer-clave";

export type InstitutionSession =
  /** A valid session belonging to an institution. */
  | { status: "authenticated"; institution: Institution }
  /** No session, an expired one, or an account with no institution linked. */
  | { status: "anonymous" }
  /**
   * The backend could not answer. Distinct from `anonymous` on purpose: a
   * backend hiccup must not log a visitor out or bounce them to the login page,
   * where they would type valid credentials into a backend that is still down.
   */
  | { status: "error"; message: string };

/**
 * Resolves the institutional session for an incoming SSR request.
 *
 * Never throws: callers get one of the three states above and decide what to
 * render, so a backend failure degrades into an error state instead of a 500.
 */
export const resolveInstitutionSession = async (
  request: Request,
): Promise<InstitutionSession> => {
  const cookie = request.headers.get("cookie") ?? "";

  // No cookie at all cannot be a session; skip the round trip to the backend.
  if (!cookie.includes("sessionid=")) {
    return { status: "anonymous" };
  }

  try {
    const institution = await fetchInstitution(cookie);
    return { status: "authenticated", institution };
  } catch (error) {
    if (error instanceof InstitutionApiError) {
      if (error.code === "unauthenticated" || error.code === "forbidden") {
        return { status: "anonymous" };
      }
      return { status: "error", message: error.message };
    }
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Unknown session failure",
    };
  }
};
