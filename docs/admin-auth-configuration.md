# Django Admin — Authentication Configuration

The Station Administration backoffice (`/admin/`) is the only administrative
surface in Proyecto Respira. It authenticates exclusively through Django's
built-in session framework and the custom user model — no separate
authentication service is used.

This document covers how authentication is wired, how sessions and cookies
behave per environment, and how the public site stays isolated from the
backoffice. For password reset/recovery, see
[`admin-password-management.md`](./admin-password-management.md). For
rate-limiting and other hardening, see
[`admin-security-hardening.md`](./admin-security-hardening.md).

## Custom user model

- `AUTH_USER_MODEL = "accounts.User"` (`backend/backend/settings.py`).
- `USERNAME_FIELD = "email"` — users authenticate with their email, not a
  username. `username` is kept on the model for third-party compatibility but
  is excluded from `REQUIRED_FIELDS` and from the login flow.
- Primary key is a UUID (`accounts.models.User.id`), so user identifiers are
  stable and non-sequential across the platform.
- `python manage.py createsuperuser` uses this model automatically — it will
  prompt for email/password, not a username.

See `backend/accounts/models.py` and `backend/accounts/managers.py`.

## Authentication backends

```python
AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",   # must run first
    "django.contrib.auth.backends.ModelBackend",
]
```

`AxesStandaloneBackend` runs first so a locked-out username/IP is rejected
before `ModelBackend` ever checks the password (see
[`admin-security-hardening.md`](./admin-security-hardening.md) for what axes
does).

## Session management

Sessions are the only authentication mechanism for the backoffice — there are
no API tokens for admin users. Session behavior is environment-aware via
environment variables (all defined in `backend/backend/settings.py`):

| Setting | Env var | Default | Notes |
|---|---|---|---|
| `SESSION_COOKIE_AGE` | `BACKEND_SESSION_COOKIE_AGE` | `28800` (8h) | Session lifetime in seconds. |
| `SESSION_EXPIRE_AT_BROWSER_CLOSE` | `BACKEND_SESSION_EXPIRE_AT_BROWSER_CLOSE` | `false` | If `true`, the session cookie is deleted when the browser closes, regardless of `SESSION_COOKIE_AGE`. |
| `SESSION_SAVE_EVERY_REQUEST` | `BACKEND_SESSION_SAVE_EVERY_REQUEST` | `false` | If `true`, the session expiry is refreshed on every request (sliding session) instead of only on write. |

Sessions are stored in the database (Django's default `db` backend via
`django.contrib.sessions`), so logging out or expiring a session invalidates
it server-side — it isn't just a client-side cookie deletion.

## Cookie security (environment-aware)

Secure cookie flags default to **on whenever `BACKEND_DEBUG=false`** (i.e.
production/staging) and off in local HTTP development, so no extra
configuration is needed when deploying — only `BACKEND_DEBUG` needs to be set
correctly per environment. Each flag can still be overridden individually if
a specific deployment needs to diverge from the default:

| Setting | Env var | Default |
|---|---|---|
| `SESSION_COOKIE_SECURE` | `BACKEND_SESSION_COOKIE_SECURE` | `true` when `DEBUG=false`, else `false` |
| `CSRF_COOKIE_SECURE` | `BACKEND_CSRF_COOKIE_SECURE` | `true` when `DEBUG=false`, else `false` |
| `SESSION_COOKIE_HTTPONLY` | — (always on) | `true` — client-side JS can never read the session cookie |
| `SESSION_COOKIE_SAMESITE` | `BACKEND_SESSION_COOKIE_SAMESITE` | `Lax` |
| `CSRF_COOKIE_SAMESITE` | `BACKEND_CSRF_COOKIE_SAMESITE` | `Lax` |

## CSRF protection

`django.middleware.csrf.CsrfViewMiddleware` is enabled globally, so every
authenticated admin form (login, logout, add/change/delete views, password
change) is CSRF-protected — this is Django Admin's default behavior and
nothing was disabled or weakened.

When the admin is served over HTTPS behind a reverse proxy (e.g.
`https://proyectorespira.net`), set:

```
BACKEND_CSRF_TRUSTED_ORIGINS=https://proyectorespira.net,https://www.proyectorespira.net
```

`CSRF_TRUSTED_ORIGINS` is empty by default and **must** be set per deployment
that sits behind a proxy terminating TLS — otherwise CSRF-protected POSTs
(including login) will be rejected.

## Login/logout routing

```python
LOGIN_URL = "admin:login"
LOGIN_REDIRECT_URL = "admin:index"
```

Any unauthenticated request to a protected admin page is redirected to
`admin:login`. Django Admin provides `login`, `logout`, `password_change` and
`password_change/done` views out of the box under `/admin/` — no custom views
were added for these.

## Authorization (RBAC) — how it fits in

Authentication (who you are) and authorization (what you can do) are
separate layers:

- **Authentication** — covered above: session + custom user model.
- **Authorization** — each user has an `accounts.Role`
  (Superadmin / Admin / Editor / Viewer). A signal
  (`accounts/signals.py`) keeps the user's `auth.Group` membership in sync
  with their role, and `accounts/permissions.py` is the single source of
  truth for what each role's group can do:

  | Role | `api.stations` / `api.regions` | `accounts.user` / `accounts.role` |
  |---|---|---|
  | **Viewer** | view only | no access |
  | **Editor** | view, change | no access |
  | **Admin** | add, change, delete, view | view only |
  | **Superadmin** | full access | full access |

  Run `python manage.py sync_roles` after migrations (or whenever
  `ROLE_GROUP_PERMISSIONS` changes) to (re)apply this matrix to the
  underlying `auth.Group` objects. It is idempotent.

  Enforcement happens through Django Admin's native `has_view_permission` /
  `has_add_permission` / `has_change_permission` / `has_delete_permission`
  hooks, made explicit in `accounts/admin_base.RoleBasedModelAdmin` (the base
  class every administrative `ModelAdmin` should extend). No custom
  permission logic is layered on top — it's Django's own permission
  framework, driven entirely by group membership.

## Public site vs. backoffice separation

`backend/backend/urls.py` exposes exactly two URL roots:

```python
urlpatterns = [
    path("admin/", admin.site.urls),   # backoffice — session auth required
    path("api/", include("api.urls")), # public site — no auth required
]
```

- Everything under `/api/` (station data, forecasts, the OpenAPI schema) is
  public and does not depend on any session or authentication middleware
  being satisfied — `AuthenticationMiddleware` attaches `request.user` for
  every request (anonymous or not) but nothing under `/api/` checks it.
- Everything under `/admin/` goes through Django Admin, which enforces
  `LOGIN_URL` redirection and the RBAC checks described above.
- The frontend (Astro, in `frontend/`) is a separate deployable that only
  talks to `/api/` — it has no dependency on Django's session cookie or
  admin authentication at all.

This means: changing session/cookie/CSRF settings for the admin never
affects `/api/` availability, and the public site can be deployed, scaled or
cached independently of the admin backoffice.

## Deployment checklist

Per environment, confirm:

1. `BACKEND_DEBUG=false` in staging/production (flips secure-cookie and HSTS
   defaults on).
2. `BACKEND_SECRET_KEY` is a long, random, unique value (not the dev
   placeholder).
3. `BACKEND_CSRF_TRUSTED_ORIGINS` includes the HTTPS origin(s) the admin is
   served from.
4. `python manage.py check --deploy` runs clean (see
   [`admin-security-hardening.md`](./admin-security-hardening.md)).
5. `python manage.py migrate && python manage.py sync_roles` has been run so
   role groups exist with the correct permissions.

## Automated test coverage

| Area | Test file |
|---|---|
| Login/logout/session/redirects/errors | `backend/accounts/tests_auth_workflow.py` |
| Backend/middleware/session config | `backend/accounts/tests_auth_config.py` |
| RBAC enforcement | `backend/accounts/tests_rbac.py` |
| Public vs. admin separation | `backend/accounts/tests_separation.py` |
