# GlitchTip Monitoring

GlitchTip is an optional integration for unhandled Django and browser errors.
When disabled, the application runs without sending telemetry. The initial
integration excludes tracing, profiling, logs, session replay, user feedback,
CSP reporting, and uptime monitoring by default.

## Hosted Project Setup

Create separate projects for the backend and frontend. Configure alert rules
and a named response owner before enabling either DSN. Use the backend project's
DSN only for the backend and the frontend project's DSN only for browser events.

Set these in the runtime environment. Use separate DSNs for backend and browser
projects when both runtimes report telemetry.

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

Optionally upload source maps from a runtime CI job. This keeps upload
credentials and configuration out of application images.

| Runtime CI variable | Purpose |
| --- | --- |
| `GLITCHTIP_URL` | Hosted GlitchTip base URL. |
| `GLITCHTIP_ORG` | Organization slug. |
| `GLITCHTIP_PROJECT` | Project slug for browser source maps. |
| `GLITCHTIP_UPLOAD_SOURCEMAPS` | Set to `true` to enable source-map upload; leave unset to skip it. |
| `GLITCHTIP_CLI_VERSION` | Exact GlitchTip CLI release tag used for uploads. |
| `GLITCHTIP_CLI_SHA256` | SHA-256 checksum for that release's Linux binary for the build architecture. |
| `GLITCHTIP_AUTH_TOKEN` | Least-privilege CI token for source-map uploads. |

Never put the upload token in `.env`, a running container, browser runtime
configuration, image layers, logs, or source control. Configure the token, CLI
version, and checksum only when
`GLITCHTIP_UPLOAD_SOURCEMAPS=true`. When upload is enabled, a missing or invalid
token, version, or checksum fails the upload step rather than publishing
unreadable browser stacks. Use the same immutable release label for upload and
runtime error reporting.

## CSP Reporting (optional)

The proxy can send Content Security Policy violations to a Security Endpoint.
Configure `PROXY_CSP_SECURITY_ENDPOINT` and `PROXY_CSP_GLITCHTIP_ORIGIN` at
runtime. CSP reporting is separate from error DSNs and does not require a
management token.

See [`content-security-policy.md`](content-security-policy.md) for the
report-only rollout and browser compatibility details.

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
