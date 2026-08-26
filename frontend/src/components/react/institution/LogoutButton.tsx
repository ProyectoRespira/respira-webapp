import { useState } from "react";

import { institutionCopy as copy } from "../../../i18n/institution";
import { logout } from "../../../store/institution";
import { INSTITUTION_LOGIN_PATH } from "../../../utils/institution-session";

/**
 * Ends the Django session and returns to the login page.
 *
 * Only navigates when the session was actually ended. Navigating on failure
 * looks like the button is broken: the login page's guard redirects a visitor
 * who still has a valid session straight back to the dashboard, so a failed
 * logout would silently bounce them where they started with nothing to explain
 * it. Saying so is the honest outcome.
 */
export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await logout();
      window.location.assign(INSTITUTION_LOGIN_PATH);
    } catch (error) {
      console.error("Could not end the institutional session", error);
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {failed && (
        <span
          role="alert"
          className="hidden text-xs text-aqi-red-light sm:block"
        >
          {copy.logoutFailed}
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="rounded-md border border-gray px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-bg-gray transition-colors hover:border-basedark hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green disabled:opacity-60"
      >
        {busy ? copy.loggingOut : failed ? copy.retry : copy.logout}
      </button>
    </div>
  );
}
