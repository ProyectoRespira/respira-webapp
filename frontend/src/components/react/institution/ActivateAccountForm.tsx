// "¿Sos nuevo en la plataforma?" — the login page's first-access section.
//
// For someone whose organization gave them dashboard access but who never
// created a password, or let the invitation link expire: they type their email
// and the backend (`POST /api/auth/activate/`) mails the invitation again.
//
// Same rule as `ForgotPasswordForm`: the screen never says whether the address
// was set up. The backend answers 204 either way, so there is one success
// message, worded as a conditional, for every address.
//
// Collapsed by default — most visitors to the login page already have a
// password — and rendered as its own form next to `LoginForm` rather than
// inside it, since forms cannot nest.

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import type { Lang } from "../../../i18n/config";
import {
  useInstitutionCopy,
  type InstitutionCopyKey,
} from "../../../i18n/institution";
import {
  InstitutionApiError,
  requestAccountActivation,
} from "../../../store/institution";
import { Button, FieldLabel, fieldClassName } from "./ui";

const errorKeyFor = (error: unknown): InstitutionCopyKey => {
  if (!(error instanceof InstitutionApiError)) return "activateErrorUnexpected";
  // Rate limited per IP; waiting is the only fix.
  if (error.status === 429) return "activateErrorThrottled";
  return "activateErrorUnexpected";
};

export function ActivateAccountForm({
  lang,
  defaultOpen = false,
}: {
  lang: Lang;
  /** Expanded on arrival: a dead invitation link sends the visitor here. */
  defaultOpen?: boolean;
}) {
  const copy = useInstitutionCopy(lang);
  const emailId = useId();
  const panelId = useId();
  const emailRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(defaultOpen);
  // Only a click moves focus into the field; arriving with the section already
  // open leaves focus where the browser puts it (the login form comes first).
  const [focusOnOpen, setFocusOnOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && focusOnOpen) emailRef.current?.focus();
  }, [open, focusOnOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(undefined);

    try {
      await requestAccountActivation(email);
      setSent(true);
    } catch (caught) {
      setError(copy[errorKeyFor(caught)]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-8 border-t border-basedark pt-6">
      <p className="text-[13px] text-gray">
        {copy.activateToggle}{" "}
        <button
          type="button"
          className="font-semibold text-green_dark hover:underline"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setFocusOnOpen(true);
            setOpen((value) => !value);
          }}
        >
          {copy.activateToggleAction}
        </button>
      </p>

      <div id={panelId} hidden={!open} className="mt-4">
        {sent ? (
          // `status` so a screen reader announces the swap from form to message.
          <div className="flex flex-col gap-2" role="status">
            <h2 className="font-serif text-lg font-bold">
              {copy.activateSentTitle}
            </h2>
            <p className="text-[13px] text-gray">{copy.activateSentBody}</p>
            <p className="text-xs text-lightgray">{copy.activateSentHint}</p>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit}
            noValidate
          >
            <div>
              <h2 className="font-serif text-lg font-bold">
                {copy.activateTitle}
              </h2>
              <p className="mt-1 text-[13px] text-gray">
                {copy.activateSubtitle}
              </p>
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
              <FieldLabel htmlFor={emailId}>{copy.activateEmail}</FieldLabel>
              <input
                ref={emailRef}
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

            <Button type="submit" variant="void" block disabled={submitting}>
              {submitting ? copy.activateSubmitting : copy.activateSubmit}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
