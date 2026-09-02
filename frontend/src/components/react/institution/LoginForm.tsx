import { useId, useState, type FormEvent } from "react";

import { institutionCopy as copy } from "../../../i18n/institution";
import { InstitutionApiError, login } from "../../../store/institution";
import {
  INSTITUTION_DASHBOARD_PATH,
  INSTITUTION_FORGOT_PASSWORD_PATH,
} from "../../../utils/institution-session";
import { Button, FieldLabel, fieldClassName } from "./ui";

/**
 * Maps a failed login onto one message.
 *
 * The three cases the backend distinguishes are worth distinguishing here too:
 * bad credentials (400) is the user's to fix, a valid account with no
 * institution (403) is not, and a lockout (429, from django-axes) means waiting
 * rather than retrying. Beyond that we never say *which* field was wrong.
 */
const messageForError = (error: unknown): string => {
  if (!(error instanceof InstitutionApiError)) return copy.loginErrorUnexpected;
  if (error.status === 400) return copy.loginErrorCredentials;
  if (error.status === 403) return copy.loginErrorNoInstitution;
  if (error.status === 429) return copy.loginErrorThrottled;
  return copy.loginErrorUnexpected;
};

/**
 * `guideHref` arrives as a prop rather than being imported from `data/menu`:
 * this component ships to the browser, and that module pulls in the whole `ui`
 * dictionary for `INSTITUTION_ACCESS.title`. The page hands the route down the
 * same way it hands down `contactMail`.
 */
export function LoginForm({
  contactMail,
  guideHref,
}: {
  contactMail: string;
  guideHref: string;
}) {
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(undefined);

    try {
      await login(email, password);
      // A full navigation rather than a client-side route change: the dashboard
      // is server-rendered behind the session guard, and this is what makes the
      // browser send the cookie Django just set.
      window.location.assign(INSTITUTION_DASHBOARD_PATH);
    } catch (caught) {
      setError(messageForError(caught));
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div>
        <h1 className="font-serif text-xl font-bold">{copy.loginTitle}</h1>
        <p className="mt-1 text-[13px] text-gray">{copy.loginSubtitle}</p>
      </div>

      {error && (
        // `alert` announces the message on change without moving focus away
        // from the field the visitor is about to correct.
        <p
          role="alert"
          className="flex gap-2 rounded-md border border-aqi-red-light bg-aqi-red-light/30 px-3 py-3 text-[13px] text-near_black"
        >
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={emailId}>{copy.loginEmail}</FieldLabel>
        <input
          id={emailId}
          className={fieldClassName}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={passwordId}>{copy.loginPassword}</FieldLabel>
        <input
          id={passwordId}
          className={fieldClassName}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={submitting}
        />
      </div>

      <Button type="submit" block disabled={submitting}>
        {submitting ? copy.loginSubmitting : copy.loginSubmit}
      </Button>

      {/*
        Below the button rather than beside the password label: recovery is the
        exception, and putting it in the field's tab order competes with the
        password manager most institutions use to fill this form.
      */}
      <a
        className="text-[13px] font-semibold text-green_dark hover:underline"
        href={INSTITUTION_FORGOT_PASSWORD_PATH}
      >
        {copy.forgotLink}
      </a>

      <p className="text-xs text-lightgray">
        {copy.loginGuide}{" "}
        <a
          className="font-semibold text-green_dark hover:underline"
          href={guideHref}
        >
          {copy.loginGuideLink}
        </a>
        .
      </p>

      {contactMail && (
        <p className="text-xs text-lightgray">
          {copy.loginHelp}{" "}
          <a
            className="font-semibold text-green_dark hover:underline"
            href={`mailto:${contactMail}`}
          >
            {contactMail}
          </a>
        </p>
      )}
    </form>
  );
}
