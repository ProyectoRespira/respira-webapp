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
token or password storage logic is added in this repository.

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
