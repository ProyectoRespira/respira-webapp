# Django Admin — Security Hardening

This document covers the security measures protecting the Django Admin
authentication flow and administrative environment: brute-force protection,
password policy, transport/cookie security, and how to validate a
deployment. All settings referenced live in `backend/backend/settings.py`.

## Login rate limiting (django-axes)

[django-axes](https://django-axes.readthedocs.io/) blocks brute-force
attempts against the admin login page by tracking failed logins and locking
out the offending username/IP combination after too many failures — even if
the correct password is eventually entered.

How it's wired in:

- `INSTALLED_APPS += "axes"` — registers the app and its tables
  (`AccessAttempt`, `AccessLog`, `AccessFailureLog`) that record login
  attempts.
- `AUTHENTICATION_BACKENDS` — `axes.backends.AxesStandaloneBackend` is listed
  **before** `django.contrib.auth.backends.ModelBackend`, so a locked-out
  identity is rejected before Django even checks the password.
- `MIDDLEWARE` — `axes.middleware.AxesMiddleware` is the **last** entry in
  the stack, since it needs to observe the final result of authentication to
  record it correctly.

Configuration:

| Setting                                         | Env var                         | Default                        | Meaning                                                                                                                                                                                                                 |
| ----------------------------------------------- | ------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AXES_ENABLED`                                  | `BACKEND_AXES_ENABLED`          | `true`                         | Master on/off switch.                                                                                                                                                                                                   |
| `AXES_FAILURE_LIMIT`                            | `BACKEND_AXES_FAILURE_LIMIT`    | `5`                            | Failed attempts allowed before lockout.                                                                                                                                                                                 |
| `AXES_COOLOFF_TIME`                             | `BACKEND_AXES_COOLOFF_HOURS`    | `1` (hour)                     | How long a lockout lasts before it auto-resets.                                                                                                                                                                         |
| `AXES_RESET_ON_SUCCESS`                         | — (fixed)                       | `true`                         | A successful login before hitting the limit clears the failure counter.                                                                                                                                                 |
| `AXES_LOCKOUT_PARAMETERS`                       | — (fixed)                       | `[["username", "ip_address"]]` | Lockout key: the username+IP **combination**. The nested list matters: in axes 6.x a flat `["username", "ip_address"]` is two independent criteria, so failures for any username locked out every user on that IP.     |
| `AXES_RESET_COOL_OFF_ON_FAILURE_DURING_LOCKOUT` | — (fixed)                       | `false`                        | Attempts made while locked out don't restart the cool-off, so retrying can't keep an account locked indefinitely.                                                                                                       |
| `AXES_CLIENT_IP_CALLABLE`                       | `BACKEND_TRUST_PROXY_IP_HEADER` | `backend.client_ip.get_client_ip` | Resolves the real client IP from nginx's `X-Real-IP`; see below.                                                                                                                                                     |
| `AXES_LOCKOUT_TEMPLATE`                         | — (fixed)                       | `None`                         | No custom lockout page; axes' default response is used (HTTP 403).                                                                                                                                                      |

Behavior: after `AXES_FAILURE_LIMIT` failed attempts for the same
username+IP, further attempts from that pair — including ones with the
correct password — are rejected with a `403`/`429` response until
`AXES_COOLOFF_TIME` elapses or an operator clears the record. The same
username from another IP, and other usernames from the same IP, are
unaffected.

### Client IP behind the proxy

Every request reaches Django from the nginx container, so `REMOTE_ADDR` is
that container's Docker address for every client. Keying lockouts on it
would put everyone in the same bucket.

`backend/backend/client_ip.py` reads `X-Real-IP` instead. nginx sets it with
`proxy_set_header X-Real-IP $remote_addr` in every location, which
**replaces** any value the client sent — it always holds exactly the address
nginx saw. `X-Forwarded-For` is deliberately not used: nginx builds it with
`$proxy_add_x_forwarded_for`, which *appends* to the client's own header, so
its leftmost entries are whatever the client wants. (axes' built-in
`AXES_IPWARE_*` settings only take effect when `django-ipware` is installed,
which it isn't.)

This assumes nginx is the only hop and the backend port is not reachable
from outside the Docker network (in `docker-compose.yml` the backend
publishes no ports). If a deployment exposes Django directly, set
`BACKEND_TRUST_PROXY_IP_HEADER=false`, or clients could choose their IP. If
another proxy or CDN is ever put in front of nginx, nginx's `$remote_addr`
becomes that proxy and must be fixed there with `set_real_ip_from` /
`real_ip_header`.

After deploying a change to this configuration, clear old records — they
were keyed on the proxy address — with `python manage.py axes_reset`.

Covered by `backend/accounts/tests_security.py::LoginRateLimitTests`,
`LockoutScopeTests`, `ClientIpTests` and
`SecuritySettingsTests::test_axes_configured`.

## Password policy

See [`admin-password-management.md`](./admin-password-management.md) for the
full validator table (`AUTH_PASSWORD_VALIDATORS`). In short: minimum length
(`BACKEND_PASSWORD_MIN_LENGTH`, default 10), common-password rejection,
non-numeric-only, and a custom complexity check
(`accounts.validators.ComplexityValidator`) requiring a letter, a digit, and
— unless `BACKEND_PASSWORD_REQUIRE_SPECIAL=false` — a special character.

## Session & cookie security

- `SESSION_COOKIE_HTTPONLY = True` (always) — the session cookie is never
  readable from client-side JavaScript, mitigating XSS-based session theft.
- `SESSION_COOKIE_SECURE` / `CSRF_COOKIE_SECURE` default to `true` whenever
  `BACKEND_DEBUG=false`, so cookies are only ever sent over HTTPS in
  staging/production; overridable per environment via
  `BACKEND_SESSION_COOKIE_SECURE` / `BACKEND_CSRF_COOKIE_SECURE`.
- `SESSION_COOKIE_SAMESITE` / `CSRF_COOKIE_SAMESITE` default to `Lax`.

Full detail and env var table in
[`admin-auth-configuration.md`](./admin-auth-configuration.md).

## CSRF protection

`django.middleware.csrf.CsrfViewMiddleware` is active globally — every
authenticated admin write (login, logout, add/change/delete, password
change) requires a valid CSRF token. `CSRF_TRUSTED_ORIGINS`
(`BACKEND_CSRF_TRUSTED_ORIGINS`) must list the HTTPS origin(s) the admin is
served from when running behind a reverse proxy.

## HTTPS / HSTS (production)

These default to **on** whenever `BACKEND_DEBUG=false` and off in local HTTP
development — no per-environment code changes needed, only `BACKEND_DEBUG`:

| Setting                          | Env var                                  | Default in production                                                        |
| -------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| `SECURE_SSL_REDIRECT`            | `BACKEND_SECURE_SSL_REDIRECT`            | `true` — HTTP requests are redirected to HTTPS.                              |
| `SECURE_HSTS_SECONDS`            | `BACKEND_SECURE_HSTS_SECONDS`            | `31536000` (1 year) — tells browsers to only ever use HTTPS for this domain. |
| `SECURE_HSTS_INCLUDE_SUBDOMAINS` | `BACKEND_SECURE_HSTS_INCLUDE_SUBDOMAINS` | `true`                                                                       |
| `SECURE_HSTS_PRELOAD`            | `BACKEND_SECURE_HSTS_PRELOAD`            | `true`                                                                       |

If the app runs behind a reverse proxy that terminates TLS,
`BACKEND_SECURE_PROXY_SSL_HEADER` (also defaulting to `true` in production)
sets `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")` so
Django correctly recognizes the original request was HTTPS instead of
redirect-looping.

## Clickjacking protection

`django.middleware.clickjacking.XFrameOptionsMiddleware` is enabled, with
`X_FRAME_OPTIONS` (`BACKEND_X_FRAME_OPTIONS`) defaulting to `DENY` — admin
pages can't be framed by any other site.

`SECURE_CONTENT_TYPE_NOSNIFF = True` is also set, preventing browsers from
MIME-sniffing responses away from their declared `Content-Type`.

## Validating a deployment

Before/after deploying, run Django's built-in deployment check with
production-like settings (`BACKEND_DEBUG=false` and a real
`BACKEND_SECRET_KEY`):

```bash
python manage.py check --deploy
```

This was run against this configuration with `BACKEND_DEBUG=false`; the only
warnings produced were unrelated to this hardening work (a drf-spectacular
schema-generation warning on an unrelated view) plus the expected warning
about `SECRET_KEY` strength when a short placeholder key is used for local
verification — with a properly generated production `BACKEND_SECRET_KEY`
that warning disappears too. No warnings were raised about
`SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_HSTS_SECONDS`,
`SECURE_SSL_REDIRECT`, or `X_FRAME_OPTIONS` — confirming the production
defaults above satisfy Django's own security checklist.

## Automated test coverage

| Area                                                | Test file                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Axes configuration, rate limiting                   | `backend/accounts/tests_security.py::SecuritySettingsTests`, `LoginRateLimitTests` |
| Password policy                                     | `backend/accounts/tests_security.py::PasswordPolicyTests`                          |
| Clickjacking / content-type sniffing / cookie flags | `backend/accounts/tests_security.py::SecuritySettingsTests`                        |
| Session/CSRF middleware presence                    | `backend/accounts/tests_auth_config.py::AuthConfigurationTests`                    |
