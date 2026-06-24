# Frontend Environment Variables

All frontend configuration is done at runtime. The image is built once and configured per environment by changing environment variables — no rebuild needed.

See [`frontend/.env.example`](../frontend/.env.example) for a ready-to-copy reference.

---

## Runtime Config (served via `/runtime-config.json`)

Read by `frontend/src/runtime-env.ts` via `getRequiredRuntimeEnv()` and served through the `/runtime-config.json` endpoint. Client-side code fetches this endpoint — these values are never embedded into static assets at build time.

Only public values required by browser code are exposed here.

| Variable                   | Required | Default | Where used                                                                                                  | Notes                                                                                             |
| -------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `BACKEND_URL`              | Yes      | —       | `frontend/src/runtime-env.ts`, `frontend/src/pages/runtime-config.json.ts`                                  | Base URL of the backend API. No trailing slash.                                                   |
| `PUBLIC_REGION_DEFAULT_ID` | Yes      | —       | `frontend/src/runtime-env.ts`, `frontend/src/pages/runtime-config.json.ts`                                  | Default region ID for initial map requests.                                                       |
| `SITE_URL`                 | Yes      | —       | `frontend/src/runtime-env.ts`, `frontend/src/pages/runtime-config.json.ts`, `frontend/src/actions/index.ts` | Public canonical URL of the site. No trailing slash. Trailing slashes are stripped automatically. |
| `PUBLIC_GTAG`              | Yes      | —       | `frontend/src/runtime-env.ts`, `frontend/src/layouts/BaseLayout.astro`                                      | Google Analytics measurement ID.                                                                  |

---

## White-Label / Branding Config

These values are runtime environment variables used server-side to compose brand links and contact details. They are not returned by `/runtime-config.json`.

| Variable            | Required | Default | Where used                                                                                                                      | Notes                                                                                                    |
| ------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `CONTACT_MAIL`      | Yes      | —       | `frontend/src/runtime-env.ts`, `frontend/src/actions/index.ts`, `frontend/src/components/atoms/Footer.astro`                    | Contact inbox shown to users and used for outgoing contact mail.                                         |
| `TWITTER_HANDLE`    | Yes      | —       | `frontend/src/runtime-env.ts`, `frontend/src/components/cards/TwitterCard.astro`                                                | Handle only (for example `respirapy`). URL is composed as `https://twitter.com/<handle>`.                |
| `TELEGRAM_CHANNEL`  | Yes      | —       | `frontend/src/runtime-env.ts`, `frontend/src/components/cards/TelegramCard.astro`, `frontend/src/components/atoms/Footer.astro` | Channel only (for example `proyectorespira`). URL is composed as `https://t.me/<channel>`.               |
| `FACEBOOK_PAGE`     | Yes      | —       | `frontend/src/runtime-env.ts`, `frontend/src/components/atoms/Footer.astro`                                                     | Page path only. URL is composed as `https://www.facebook.com/<page>`.                                    |
| `INSTAGRAM_HANDLE`  | Yes      | —       | `frontend/src/runtime-env.ts`, `frontend/src/components/atoms/Footer.astro`                                                     | Handle only. URL is composed as `https://www.instagram.com/<handle>`.                                    |
| `GITHUB_PATH`       | Yes      | —       | `frontend/src/runtime-env.ts`, `frontend/src/components/atoms/Footer.astro`, `frontend/src/pages/nosotros.astro`                | Path only (for example organization or repository path). URL is composed as `https://github.com/<path>`. |
| `SLACK_INVITE_PATH` | Yes      | —       | `frontend/src/runtime-env.ts`, `frontend/src/components/atoms/Footer.astro`                                                     | Invite path only. URL is composed as `https://join.slack.com/<path>`.                                    |
| `APP_STORE_PATH`    | Yes      | —       | `frontend/src/runtime-env.ts`, `frontend/src/components/AppDownload.astro`                                                      | Path only. URL is composed as `https://apps.apple.com/<path>`.                                           |
| `PLAY_STORE_APP_ID` | Yes      | —       | `frontend/src/runtime-env.ts`, `frontend/src/components/AppDownload.astro`                                                      | App ID only. URL is composed as `https://play.google.com/store/apps/details?id=<id>`.                    |

---

## Email (server-side only)

Read server-side in `frontend/src/actions/index.ts`. These values are never sent to the browser.

| Variable      | Required | Default | Where used                      | Notes                                                                                                           |
| ------------- | -------- | ------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `SMTP_KEY`    | Yes      | —       | `frontend/src/actions/index.ts` | Resend API key for sending contact-form emails. Never prefix with `PUBLIC_`.                                    |
| `SMTP_SENDER` | Yes      | —       | `frontend/src/actions/index.ts` | Sender address shown in outgoing emails. Example: `Respira <noreply@example.com>`. Never prefix with `PUBLIC_`. |

---

## Server

| Variable        | Required | Default   | Where used                                          | Notes                                                                                          |
| --------------- | -------- | --------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `FRONTEND_PORT` | Yes      | —         | `frontend/Dockerfile` (`CMD`), `docker-compose.yml` | Port the Node.js SSR server listens on. Container startup fails explicitly if unset.           |
| `HOST`          | No       | `0.0.0.0` | `frontend/Dockerfile` (`ENV HOST`)                  | Network interface the server binds to. Set as a Dockerfile default; override only when needed. |

---

## Build-Time Variables

| Variable   | Required | Default        | Where used                  | Notes                                                                                                                       |
| ---------- | -------- | -------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV` | No       | Set by tooling | `frontend/astro.config.mjs` | Determines which `.env` file set `loadEnv` reads. Set automatically by the build runner — do not declare in `.env.example`. |

---

## Coverage in `.env.example` Files

| Variable                   | Root `.env.example`    | `frontend/.env.example` |
| -------------------------- | ---------------------- | ----------------------- |
| `BACKEND_URL`              | ✓                      | ✓                       |
| `PUBLIC_REGION_DEFAULT_ID` | ✓                      | ✓                       |
| `SITE_URL`                 | ✓                      | ✓                       |
| `PUBLIC_GTAG`              | ✓                      | ✓                       |
| `CONTACT_MAIL`             | ✓                      | ✓                       |
| `TWITTER_HANDLE`           | ✓                      | ✓                       |
| `TELEGRAM_CHANNEL`         | ✓                      | ✓                       |
| `FACEBOOK_PAGE`            | ✓                      | ✓                       |
| `INSTAGRAM_HANDLE`         | ✓                      | ✓                       |
| `GITHUB_PATH`              | ✓                      | ✓                       |
| `SLACK_INVITE_PATH`        | ✓                      | ✓                       |
| `APP_STORE_PATH`           | ✓                      | ✓                       |
| `PLAY_STORE_APP_ID`        | ✓                      | ✓                       |
| `SMTP_KEY`                 | ✓                      | ✓                       |
| `SMTP_SENDER`              | ✓                      | ✓                       |
| `FRONTEND_PORT`            | ✓                      | ✓                       |
| `HOST`                     | — (Dockerfile default) | — (Dockerfile default)  |
| `NODE_ENV`                 | — (set by tooling)     | — (set by tooling)      |

---

## Notes

- All variables except `HOST` are enforced as required. Missing any one causes the container to fail at startup or throw on first request.
- In docker-compose, the root `.env` values are injected into the frontend container via the `environment:` block — no `env_file` is used for the frontend service.
- If you want a white-label deployment, provide the branding variables in the env layer alongside the runtime config values.
