# Django Admin — Password Management

This document covers the password-related parts of the Django Admin backoffice:
password validation, password reset email configuration, and the operational
behavior of the bootstrap superuser flow.

All referenced settings live in `backend/backend/settings.py` unless noted
otherwise.

## Password validation

The admin login uses Django's standard password validation pipeline via
`AUTH_PASSWORD_VALIDATORS`.

Configured validators:

| Validator | Env var(s) | Default | Purpose |
| --------- | ---------- | ------- | ------- |
| `UserAttributeSimilarityValidator` | — | Django default behavior | Rejects passwords too similar to user attributes such as email. |
| `MinimumLengthValidator` | `BACKEND_PASSWORD_MIN_LENGTH` | `10` | Enforces a minimum password length. |
| `CommonPasswordValidator` | — | Django default behavior | Rejects common and easily guessed passwords. |
| `NumericPasswordValidator` | — | Django default behavior | Rejects passwords made only of digits. |
| `accounts.validators.ComplexityValidator` | `BACKEND_PASSWORD_REQUIRE_SPECIAL` | `true` | Requires at least one letter and one digit, plus a special character unless explicitly disabled. |

Notes:

- `BACKEND_PASSWORD_MIN_LENGTH` is optional. If it is unset or blank, the
  backend uses the default value `10`.
- `BACKEND_PASSWORD_REQUIRE_SPECIAL=false` relaxes only the special-character
  requirement. A letter and a digit are still required.

Covered by `backend/accounts/tests_security.py::PasswordPolicyTests`.

## Password reset / recovery

The project uses Django's built-in email-based password reset flow. No custom
token or password storage logic is added in this repository: both entry points
below issue and verify tokens with `django.contrib.auth.tokens.default_token_generator`
and enforce `AUTH_PASSWORD_VALIDATORS` through `validate_password`.

There are two entry points, for two audiences.

### Backoffice (admin / staff)

Django ships the reset views but does not route them — `admin.site.urls` only
wires *password change* — so `backend/backend/urls.py` registers the four
patterns explicitly:

| URL name | Path | View |
| -------- | ---- | ---- |
| `admin_password_reset` | `/admin/password_reset/` | `PasswordResetView` |
| `password_reset_done` | `/admin/password_reset/done/` | `PasswordResetDoneView` |
| `password_reset_confirm` | `/admin/reset/<uidb64>/<token>/` | `PasswordResetConfirmView` |
| `password_reset_complete` | `/admin/reset/done/` | `PasswordResetCompleteView` |

Two consequences worth knowing:

- Registering the name `admin_password_reset` is what makes the admin login
  template render its "Forgotten your password or username?" link. The template
  hides the link when the name does not resolve.
- Every path lives under `/admin/` because the reverse proxy only forwards
  `/admin/`, `/api/` and `/static/` to Django (`proxy/nginx.conf.template`).
  Django's documented root-level `reset/<uidb64>/…` would be handed to the Astro
  frontend and 404. It also means these pages sit behind the same admin IP
  allowlist as the rest of the backoffice: an administrator who cannot reach
  `/admin/` from where they are cannot open the emailed link either.

### Institutional panel

Institutional users recover through the API, which the public reset pages call:

| Method | Endpoint | Body | Answers |
| ------ | -------- | ---- | ------- |
| `POST` | `/api/institution/password-reset/` | `{"email": …}` | `204` always |
| `POST` | `/api/institution/password-reset/confirm/` | `{"uid": …, "token": …, "new_password": …}` | `204`, or `400` |

- The request endpoint answers `204` for a registered address, an unregistered
  one and an inactive account alike, so it cannot be used to enumerate accounts.
  Mail is only sent in the first case, via `PasswordResetForm`.
- The confirm endpoint returns `400` with `non_field_errors` for an expired,
  malformed, tampered-with or already-spent link — one message for all of them —
  and `400` with `new_password` plus `new_password_codes` when the password
  fails validation. The codes (`password_too_short`, `password_not_complex`, …)
  exist so a client can show its own localised copy; Django's own messages are
  always English.
- The emailed link's scheme and host come from the request being served, so it
  resolves to whichever environment asked for it. Only the path is configured
  (`BACKEND_INSTITUTION_PASSWORD_RESET_URL`), and it must stay in step with
  `INSTITUTION_RESET_PASSWORD_PATH` in
  `frontend/src/utils/institution-session.ts`.
- Both endpoints are throttled per client IP
  (`BACKEND_PASSWORD_RESET_THROTTLE`, `BACKEND_PASSWORD_RESET_CONFIRM_THROTTLE`).

The endpoint is not restricted to accounts with an institution linked: an
administrator may recover through it too. Restricting it would not add security
— the response is identical either way — and would leave a working account
unable to use the only self-service flow it can reach.

### Token lifetime and single use

`PASSWORD_RESET_TIMEOUT` (`BACKEND_PASSWORD_RESET_TIMEOUT_HOURS`, default 24)
bounds how long a link is valid. Django's token also hashes the user's current
password and `last_login`, which means a link stops working as soon as any of
these happens, whichever comes first:

- the link is used (the password changes),
- the account logs in with the old password,
- another reset is requested and completed.

Changing the password also invalidates every session the account had open:
Django stores a hash of the password in the session and `auth.get_user` rejects
a session whose hash no longer matches.

Covered by `backend/api/tests_institution_password_reset.py`.

Relevant settings:

| Setting | Env var | Default | Meaning |
| ------- | ------- | ------- | ------- |
| `EMAIL_BACKEND` | `BACKEND_EMAIL_BACKEND` | console backend in dev, SMTP backend otherwise | Selects how password reset emails are delivered. |
| `EMAIL_HOST` | `BACKEND_EMAIL_HOST` | `""` | SMTP host. |
| `EMAIL_PORT` | `BACKEND_EMAIL_PORT` | `587` | SMTP port. Blank values fall back to `587`. |
| `EMAIL_HOST_USER` | `BACKEND_EMAIL_HOST_USER` | `""` | SMTP username. |
| `EMAIL_HOST_PASSWORD` | `BACKEND_EMAIL_HOST_PASSWORD` | `""` | SMTP password. |
| `EMAIL_USE_TLS` | `BACKEND_EMAIL_USE_TLS` | `true` | Enables STARTTLS for SMTP. |
| `DEFAULT_FROM_EMAIL` | `BACKEND_DEFAULT_FROM_EMAIL` | `no-reply@proyectorespira.net` | Sender shown on password reset emails. |
| `PASSWORD_RESET_TIMEOUT` | `BACKEND_PASSWORD_RESET_TIMEOUT_HOURS` | `24` (hours) | How long a reset link stays valid. |
| `INSTITUTION_PASSWORD_RESET_URL` | `BACKEND_INSTITUTION_PASSWORD_RESET_URL` | `/institucion/restablecer-clave` | Page the institutional reset email points at. |

Behavior by environment:

- In development (`BACKEND_DEBUG=true`), the default email backend is Django's
  console backend, so password reset emails are printed to stdout.
- In non-debug environments, the default email backend is Django's SMTP
  backend. To make password reset work in staging/production, provide a real
  SMTP host and credentials.
- Optional email settings can be left unset or blank; documented defaults are
  applied where relevant.

## Bootstrap superuser

The backend entrypoint runs `python manage.py bootstrap_superuser` after
migrations. This command is intended for staging/production bootstrap only.

Relevant env vars:

| Env var | Required | Meaning |
| ------- | -------- | ------- |
| `BACKEND_SUPERUSER_EMAIL` | No | Email for the initial admin account. |
| `BACKEND_SUPERUSER_PASSWORD` | No | Password for the initial admin account. |

Behavior:

- If either value is unset or blank, the command is a no-op.
- If both are set, the command creates the superuser if it does not already
  exist.
- The command is idempotent: rerunning it does not reset the password of an
  existing account.

Covered by `backend/accounts/tests_bootstrap.py`.

## Operational guidance

- Use a long, unique `BACKEND_SECRET_KEY` and strong admin passwords in any
  non-local environment.
- Do not commit real SMTP credentials or bootstrap passwords into `.env` files.
- After first login with a bootstrap superuser in staging/production, rotate the
  bootstrap password or remove the bootstrap env vars entirely.
