// "I forgot my password" — step one of two.
//
// The whole point of this screen is that it tells the visitor nothing about
// whether the address they typed belongs to an account. The backend answers 204
// either way (see `InstitutionViewSet.password_reset`), and so the success
// state here is worded as a conditional: "if that address has an account…".
// Anything more helpful would turn the form into a way to enumerate customers.

import { useId, useState, type FormEvent } from "react";

import { institutionCopy as copy } from "../../../i18n/institution";
import {
  InstitutionApiError,
  requestPasswordReset,
} from "../../../store/institution";
import { INSTITUTION_LOGIN_PATH } from "../../../utils/institution-session";
import { Button, FieldLabel, fieldClassName } from "./ui";

const messageForError = (error: unknown): string => {
  if (!(error instanceof InstitutionApiError))
    return copy.forgotErrorUnexpected;
  // The endpoint is rate limited per IP; waiting is the only fix, so say so.
  if (error.status === 429) return copy.forgotErrorThrottled;
  return copy.forgotErrorUnexpected;
};

export function ForgotPasswordForm() {
  const emailId = useId();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(undefined);

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (caught) {
      setError(messageForError(caught));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-serif text-xl font-bold">
            {copy.forgotSentTitle}
          </h1>
          <p className="mt-1 text-[13px] text-gray">{copy.forgotSentBody}</p>
        </div>
        <p className="text-xs text-lightgray">{copy.forgotSentHint}</p>
        <a
          className="text-[13px] font-semibold text-green_dark hover:underline"
          href={INSTITUTION_LOGIN_PATH}
        >
          {copy.forgotBackToLogin}
        </a>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div>
        <h1 className="font-serif text-xl font-bold">{copy.forgotTitle}</h1>
        <p className="mt-1 text-[13px] text-gray">{copy.forgotSubtitle}</p>
      </div>

      {error && (
        <p
          role="alert"
          className="flex gap-2 rounded-md border border-aqi-red-light bg-aqi-red-light/30 px-3 py-3 text-[13px] text-near_black"
        >
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={emailId}>{copy.forgotEmail}</FieldLabel>
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

      <Button type="submit" block disabled={submitting}>
        {submitting ? copy.forgotSubmitting : copy.forgotSubmit}
      </Button>

      <a
        className="text-xs font-semibold text-green_dark hover:underline"
        href={INSTITUTION_LOGIN_PATH}
      >
        {copy.forgotBackToLogin}
      </a>
    </form>
  );
}
