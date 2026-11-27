// "Choose a new password" — step two of two.
//
// Reached only through the link in the reset email, which carries `uid` and
// `token` as query parameters. Neither is secret to this component: they are
// checked server-side on submit, so the page renders the form for any pair and
// lets the backend be the one that says a link is spent or expired.
//
// The same form serves the invitation link (first access): `mode="create"`
// swaps the words — "create your password" rather than "choose a new one" —
// and where a dead link sends the visitor for another. The submit does not
// change: the confirm endpoint takes an account that never had a password.

import { useId, useState, type FormEvent } from "react";

import type { Lang } from "../../../i18n/config";
import {
  useInstitutionCopy,
  type InstitutionCopyKey,
} from "../../../i18n/institution";
import {
  confirmPasswordReset,
  InstitutionApiError,
} from "../../../store/institution";
import {
  INSTITUTION_ACTIVATE_PATH,
  INSTITUTION_FORGOT_PASSWORD_PATH,
  INSTITUTION_LOGIN_PATH,
} from "../../../utils/institution-session";
import { Button, FieldLabel, fieldClassName } from "./ui";

/**
 * Copy keys for the password rules the backend enforces.
 *
 * The backend returns `new_password_codes` next to Django's own messages
 * precisely so this mapping can exist: those messages are always English, and
 * the codes are stable across Django versions. Keys rather than strings, so the
 * message is resolved in whatever language the visitor is reading.
 */
const RULE_KEYS: Record<string, InstitutionCopyKey> = {
  password_too_short: "resetRuleTooShort",
  password_too_common: "resetRuleTooCommon",
  password_entirely_numeric: "resetRuleAllNumbers",
  password_too_similar: "resetRuleTooSimilar",
  password_not_complex: "resetRuleNotComplex",
};

export type ResetPasswordMode = "reset" | "create";

/**
 * The words that differ between the two modes, as copy keys. Everything else
 * (password rules, mismatch, throttling) reads the same either way.
 */
const MODE_COPY = {
  reset: {
    title: "resetTitle",
    subtitle: "resetSubtitle",
    password: "resetPassword",
    submit: "resetSubmit",
    submitting: "resetSubmitting",
    doneTitle: "resetDoneTitle",
    doneBody: "resetDoneBody",
    invalidTitle: "resetInvalidTitle",
    invalidBody: "resetInvalidBody",
    requestAnother: "resetRequestAnother",
  },
  create: {
    title: "createTitle",
    subtitle: "createSubtitle",
    password: "createPassword",
    submit: "createSubmit",
    submitting: "createSubmitting",
    doneTitle: "createDoneTitle",
    doneBody: "createDoneBody",
    invalidTitle: "createInvalidTitle",
    invalidBody: "createInvalidBody",
    requestAnother: "createRequestAnother",
  },
} as const satisfies Record<
  ResetPasswordMode,
  Record<string, InstitutionCopyKey>
>;

/**
 * Where a dead link sends the visitor for a new one. Not the same page for
 * both: the recovery form only mails accounts that already have a password,
 * so an invitee asks again from "¿Sos nuevo en la plataforma?".
 */
const REQUEST_ANOTHER_HREF: Record<ResetPasswordMode, string> = {
  reset: INSTITUTION_FORGOT_PASSWORD_PATH,
  create: INSTITUTION_ACTIVATE_PATH,
};

type Outcome =
  | { state: "editing" }
  /** The link itself is unusable — a new one has to be requested. */
  | { state: "linkDead" }
  | { state: "done" };

export function ResetPasswordForm({
  uid,
  token,
  mode = "reset",
  lang,
}: {
  uid: string;
  token: string;
  mode?: ResetPasswordMode;
  lang: Lang;
}) {
  const copy = useInstitutionCopy(lang);
  const keys = MODE_COPY[mode];
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
        .map((code) => RULE_KEYS[code])
        .filter((key): key is InstitutionCopyKey => Boolean(key))
        .map((key) => copy[key]);
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
            {copy[keys.doneTitle]}
          </h1>
          <p className="mt-1 text-[13px] text-gray">{copy[keys.doneBody]}</p>
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
            {copy[keys.invalidTitle]}
          </h1>
          <p className="mt-1 text-[13px] text-gray">{copy[keys.invalidBody]}</p>
        </div>
        <a
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-green_dark px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-green_darker focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green_dark"
          href={REQUEST_ANOTHER_HREF[mode]}
        >
          {copy[keys.requestAnother]}
        </a>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div>
        <h1 className="font-serif text-xl font-bold">{copy[keys.title]}</h1>
        <p className="mt-1 text-[13px] text-gray">{copy[keys.subtitle]}</p>
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
        <FieldLabel htmlFor={passwordId}>{copy[keys.password]}</FieldLabel>
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
        {submitting ? copy[keys.submitting] : copy[keys.submit]}
      </Button>
    </form>
  );
}
