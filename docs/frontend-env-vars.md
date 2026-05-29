# Frontend Environment Variables

All frontend configuration is done at runtime. The image is built once and configured per environment by changing environment variables — no rebuild needed.

See [`frontend/.env.example`](../frontend/.env.example) for a ready-to-copy reference.

---

## Runtime Config (served via `/runtime-config.json`)

Read by `frontend/src/runtime-env.ts` via `getRequiredRuntimeEnv()` and served through the `/runtime-config.json` endpoint. Client-side code fetches this endpoint — these values are never embedded into static assets at build time.

| Variable | Required | Default | Where used | Notes |
|---|---|---|---|---|
| `BACKEND_URL` | Yes | — | `frontend/src/runtime-env.ts`, `frontend/src/pages/runtime-config.json.ts` | Base URL of the backend API. No trailing slash. |
| `PUBLIC_REGION_DEFAULT_ID` | Yes | — | `frontend/src/runtime-env.ts`, `frontend/src/pages/runtime-config.json.ts` | Default region ID for initial map requests. |
| `SITE_URL` | Yes | — | `frontend/src/runtime-env.ts`, `frontend/src/pages/runtime-config.json.ts`, `frontend/src/actions/index.ts` | Public canonical URL of the site. No trailing slash. Trailing slashes are stripped automatically. |
| `PUBLIC_GTAG` | Yes | — | `frontend/src/runtime-env.ts`, `frontend/src/layouts/BaseLayout.astro` | Google Analytics measurement ID. |

---

## Email (server-side only)

Read server-side in `frontend/src/actions/index.ts`. These values are never sent to the browser.

| Variable | Required | Default | Where used | Notes |
|---|---|---|---|---|
| `SMTP_KEY` | Yes | — | `frontend/src/actions/index.ts` | Resend API key for sending contact-form emails. Never prefix with `PUBLIC_`. |
| `SMTP_SENDER` | Yes | — | `frontend/src/actions/index.ts` | Sender address shown in outgoing emails. Example: `Respira <noreply@example.com>`. Never prefix with `PUBLIC_`. |

---

## Server

| Variable | Required | Default | Where used | Notes |
|---|---|---|---|---|
| `FRONTEND_PORT` | Yes | — | `frontend/Dockerfile` (`CMD`), `docker-compose.yml` | Port the Node.js SSR server listens on. Container startup fails explicitly if unset. |
| `HOST` | No | `0.0.0.0` | `frontend/Dockerfile` (`ENV HOST`) | Network interface the server binds to. Set as a Dockerfile default; override only when needed. |

---

## Build-Time Variables

| Variable | Required | Default | Where used | Notes |
|---|---|---|---|---|
| `NODE_ENV` | No | Set by tooling | `frontend/astro.config.mjs` | Determines which `.env` file set `loadEnv` reads. Set automatically by the build runner — do not declare in `.env.example`. |

---

## Coverage in `.env.example` Files

| Variable | Root `.env.example` | `frontend/.env.example` |
|---|---|---|
| `BACKEND_URL` | ✓ | ✓ |
| `PUBLIC_REGION_DEFAULT_ID` | ✓ | ✓ |
| `SITE_URL` | ✓ | ✓ |
| `PUBLIC_GTAG` | ✓ | ✓ |
| `SMTP_KEY` | ✓ | ✓ |
| `SMTP_SENDER` | ✓ | ✓ |
| `FRONTEND_PORT` | ✓ | ✓ |
| `HOST` | — (Dockerfile default) | — (Dockerfile default) |
| `NODE_ENV` | — (set by tooling) | — (set by tooling) |

---

## Notes

- All variables except `HOST` are enforced as required. Missing any one causes the container to fail at startup or throw on first request.
- In docker-compose, the root `.env` values are injected into the frontend container via the `environment:` block — no `env_file` is used for the frontend service.
