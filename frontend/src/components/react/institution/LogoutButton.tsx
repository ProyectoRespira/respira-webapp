import { useState } from "react";

import type { Lang } from "../../../i18n/config";
import { useInstitutionCopy } from "../../../i18n/institution";
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
 *
 * Drawn as a link-weight button, the way the sidebar's user card shows it: it
 * is an action, so it stays a `<button>` rather than a link to `#salir`.
 */
export function LogoutButton({ lang }: { lang: Lang }) {
  const copy = useInstitutionCopy(lang);
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
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="min-h-[32px] rounded text-[12px] font-bold text-[#245C2A] underline-offset-2 hover:text-[#163A1A] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245C2A] disabled:opacity-60"
      >
        {busy ? copy.loggingOut : failed ? copy.retry : copy.logout}
      </button>
      {failed && (
        <span role="alert" className="text-[12px] text-[#A3262A]">
          {copy.logoutFailed}
        </span>
      )}
    </div>
  );
}
