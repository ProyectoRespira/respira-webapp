// "Choose a new password" — step two of two.
//
// Reached only through the link in the reset email, which carries `uid` and
// `token` as query parameters. Neither is secret to this component: they are
// checked server-side on submit, so the page renders the form for any pair and
// lets the backend be the one that says a link is spent or expired.

import { useId, useState, type FormEvent } from "react";

import { institutionCopy as copy } from "../../../i18n/institution";
import {
  confirmPasswordReset,
  InstitutionApiError,
} from "../../../store/institution";
import {
  INSTITUTION_FORGOT_PASSWORD_PATH,
  INSTITUTION_LOGIN_PATH,
} from "../../../utils/institution-session";
import { Button, FieldLabel, fieldClassName } from "./ui";

/**
 * Spanish copy for the password rules the backend enforces.
 *
 * The backend returns `new_password_codes` next to Django's own messages
 * precisely so this mapping can exist: those messages are always English, and
 * the codes are stable across Django versions.
 */
const RULE_MESSAGES: Record<string, string> = {
  password_too_short: copy.resetRuleTooShort,
  password_too_common: copy.resetRuleTooCommon,
  password_entirely_numeric: copy.resetRuleAllNumbers,
  password_too_similar: copy.resetRuleTooSimilar,
  password_not_complex: copy.resetRuleNotComplex,
};

type Outcome =
  | { state: "editing" }
  /** The link itself is unusable — a new one has to be requested. */
  | { state: "linkDead" }
  | { state: "done" };

export function ResetPasswordForm({
  uid,
  token,
}: {
  uid: string;
  token: string;
}) {
  const passwordId = useId();
  const confirmId = useId();
  const rulesId = useId();

  // A link with a piece missing can never succeed, so say so up front rather
  // than making the visitor fill the form to find out.
  const linkLooksComplete = Boolean(uid && token);

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(
    linkLooksComplete ? { state: "editing" } : { state: "linkDead" },
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFailure = (caught: unknown) => {
    if (!(caught instanceof InstitutionApiError)) {
      setErrors([copy.resetErrorUnexpected]);
      return;
    }
    if (caught.status === 429) {
      setErrors([copy.resetErrorThrottled]);
      return;
    }
    if (caught.code !== "invalid") {
      setErrors([copy.resetErrorUnexpected]);
      return;
    }

    // A rejected password keeps the link alive (the backend validates before
    // touching the account), so only the link errors switch screens.
    const codes = caught.fieldErrors.new_password_codes ?? [];
    const passwordErrors = caught.fieldErrors.new_password ?? [];
    if (codes.length || passwordErrors.length) {
      const mapped = codes
        .map((code) => RULE_MESSAGES[code])
        .filter((message): message is string => Boolean(message));
      setErrors(mapped.length ? mapped : [copy.resetRuleGeneric]);
      return;
    }

    setOutcome({ state: "linkDead" });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (password !== confirmation) {
      setErrors([copy.resetMismatch]);
      return;
    }

    setSubmitting(true);
    setErrors([]);

    try {
      await confirmPasswordReset(uid, token, password);
      setOutcome({ state: "done" });
    } catch (caught) {
      handleFailure(caught);
    } finally {
      setSubmitting(false);
    }
  };

  if (outcome.state === "done") {
    return (
      <div className="flex flex-col items-start gap-4">
        <div>
          <h1 className="font-serif text-xl font-bold">
            {copy.resetDoneTitle}
          </h1>
          <p className="mt-1 text-[13px] text-gray">{copy.resetDoneBody}</p>
        </div>
        <a
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-green_dark px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-green_darker focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green_dark"
          href={INSTITUTION_LOGIN_PATH}
        >
          {copy.resetGoToLogin}
        </a>
      </div>
    );
  }

  if (outcome.state === "linkDead") {
    return (
      <div className="flex flex-col items-start gap-4" role="alert">
        <div>
          <h1 className="font-serif text-xl font-bold">
            {copy.resetInvalidTitle}
          </h1>
          <p className="mt-1 text-[13px] text-gray">{copy.resetInvalidBody}</p>
        </div>
        <a
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-green_dark px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-green_darker focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green_dark"
          href={INSTITUTION_FORGOT_PASSWORD_PATH}
        >
          {copy.resetRequestAnother}
        </a>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div>
        <h1 className="font-serif text-xl font-bold">{copy.resetTitle}</h1>
        <p className="mt-1 text-[13px] text-gray">{copy.resetSubtitle}</p>
      </div>

      {errors.length > 0 && (
        <div
          role="alert"
          className="flex gap-2 rounded-md border border-aqi-red-light bg-aqi-red-light/30 px-3 py-3 text-[13px] text-near_black"
        >
          <span aria-hidden="true">⚠</span>
          {errors.length === 1 ? (
            <span>{errors[0]}</span>
          ) : (
            <ul className="list-disc space-y-1 pl-4">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={passwordId}>{copy.resetPassword}</FieldLabel>
        <input
          id={passwordId}
          className={fieldClassName}
          type="password"
          name="new-password"
          autoComplete="new-password"
          required
          aria-describedby={rulesId}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={submitting}
        />
        <p id={rulesId} className="text-xs text-lightgray">
          {copy.resetRules}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={confirmId}>{copy.resetPasswordConfirm}</FieldLabel>
        <input
          id={confirmId}
          className={fieldClassName}
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          disabled={submitting}
        />
      </div>

      <Button type="submit" block disabled={submitting}>
        {submitting ? copy.resetSubmitting : copy.resetSubmit}
      </Button>
    </form>
  );
}
