# GlitchTip Monitoring

GlitchTip is an optional integration for unhandled Django and browser errors.
When disabled, the application runs without sending telemetry. The initial
integration excludes tracing, profiling, logs, session replay, user feedback,
CSP reporting, and uptime monitoring.

## Hosted Project Setup

Create separate projects for the backend and frontend. Configure alert rules
and a named response owner before enabling either DSN. Use the backend project's
DSN only for the backend and the frontend project's DSN only for browser events.

Set these in each protected deployment environment file. Use the DSNs for that
environment's backend and frontend projects; for example, the demo environment
uses its demo projects and production uses its production projects.

| Variable | Purpose |
| --- | --- |
| `BACKEND_GLITCHTIP_DSN` | Backend project DSN. |
| `PUBLIC_GLITCHTIP_DSN` | Browser project DSN; public by design. |
| `GLITCHTIP_ENVIRONMENT` | Deployment environment such as `production` or `demo`. |
| `GLITCHTIP_RELEASE` | Immutable release tag such as `v1.2.3`. |

Leave either DSN blank to disable telemetry for that runtime independently. Do
not add GlitchTip services, databases, or credentials to the application Compose
stack.

## Privacy Rules

The backend and browser SDKs disable default PII collection and tracing. Event
filters remove request bodies, cookies, query strings, authorization-like
headers, and values with password, secret, or token keys. The backend attaches
only an authenticated user's internal ID and role. Do not add email, username,
IP address, session ID, institution name, or raw request data to telemetry.

## Source Maps

Optionally upload frontend source maps for production releases and demo image
publishes. When enabled, the image build uses the GlitchTip CLI and removes
`.map` files from the final runtime image. Configure these GitHub Actions values
in both the `Demo` and `Production` GitHub Environments, using the frontend
project for the corresponding environment:

| GitHub Actions value | Purpose |
| --- | --- |
| `vars.GLITCHTIP_URL` | Hosted GlitchTip base URL. |
| `vars.GLITCHTIP_ORG` | Organization slug. |
| `vars.GLITCHTIP_FRONTEND_PROJECT` | Frontend project slug. |
| `vars.GLITCHTIP_UPLOAD_SOURCEMAPS` | Set to `true` to enable frontend source-map upload; leave unset to skip it. |
| `secrets.GLITCHTIP_AUTH_TOKEN` | Least-privilege CLI token for the frontend project. |

The token is supplied only as a BuildKit secret. Never put it in `.env`, a
running container, browser runtime configuration, image layers, logs, or source
control. Configure the token only when `GLITCHTIP_UPLOAD_SOURCEMAPS=true`.
When upload is enabled, a missing or invalid token fails the release image build
rather than publishing unreadable browser stacks.

The development-branch demo workflow uses `dev-latest` for both the runtime and
source-map release label. The release/hotfix demo workflow uses its immutable
`release-vX.Y.Z` or `hotfix-vX.Y.Z` image tag and overrides the runtime label to
match. Production resolves the latest GitHub Release tag at deploy time and
overrides the runtime label to match the source-map upload.

## Verification and Response

Use a nonproduction project first. Trigger one controlled backend 500 and one
React ErrorBoundary failure, then remove the test hooks. Confirm project
routing, release/environment labels, pseudonymous user context, and a readable
source-mapped browser stack. Confirm ordinary 400, 403, and 404 responses create
no issue.

For production incidents, follow the existing process in
`docs/security/INCIDENT_RESPONSE.md`. The GlitchTip alert identifies and groups
the fault; it does not replace incident ownership, mitigation, or disclosure
steps.
