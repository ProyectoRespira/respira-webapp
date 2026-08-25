# Content Security Policy

The Nginx proxy emits a `Content-Security-Policy-Report-Only` header by default.
Report-only mode records candidate-policy violations without blocking resources,
which lets operators observe current integrations before deciding whether to
enforce a policy.

## Current Scope

The policy applies at the public proxy and therefore covers Astro pages, static
assets, API responses, and Django Admin on the shared hostname. It complements
the existing `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
referrer, and permissions policies.

The candidate policy permits the currently deployed integrations:

- Same-origin pages, API calls, static assets, forms, and manifests.
- Google Fonts, Google Tag Manager, and Google Analytics.
- Facebook SDK and share dialog framing.
- MapTiler style, tile, glyph, and sprite requests.
- An optional GlitchTip browser/reporting origin.

It blocks active content by default with `object-src 'none'`, disallows framing
with `frame-ancestors 'none'`, and constrains base URLs and form submissions to
the application origin. The initial report-only policy retains `'unsafe-inline'`
for scripts and styles because the current Astro layout includes inline Google
Analytics and GlitchTip initialization, and React uses inline style attributes.

## GlitchTip Reports

To send reports to GlitchTip, obtain the **Security Endpoint** from the
environment's frontend GlitchTip project, then set:

```dotenv
PROXY_CSP_MODE=report-only
PROXY_CSP_SECURITY_ENDPOINT=https://glitchtip.example.com/api/<project>/security/?sentry_key=<public-key>
PROXY_CSP_GLITCHTIP_ORIGIN=https://glitchtip.example.com
```

The proxy emits both legacy `report-uri` and modern `report-to` directives,
plus `Reporting-Endpoints`, for browser compatibility. The endpoint contains a
public project key, not an API token. Configure separate endpoints for demo and
production frontend projects.

Leave the endpoint and origin blank to keep violations in browser developer
tools without remote reporting. Use `PROXY_CSP_MODE=off` only as an emergency
rollback; it omits all CSP headers.

## Rollout

1. Deploy report-only mode to local, demo, and production.
2. Exercise public pages, map loading, charts, API requests, contact flows,
   admin login/password reset, Google Analytics, Facebook sharing, and browser
   error reporting.
3. Review violations by effective directive, blocked URL, browser, release, and
   environment. Add only verified required origins.
4. Check CSP reports for accidental sensitive data and apply the selected
   GlitchTip access and retention policy.
5. After an agreed observation period with no unexplained violations, create a
   separate enforcement change.

## Enforcement Prerequisites

Do not turn the report-only header into `Content-Security-Policy` yet. A strict
enforcing policy requires replacing inline scripts with nonces or hashes and
removing `'unsafe-inline'` from `script-src`. It should also evaluate whether
inline style attributes can be migrated before tightening `style-src`.

Validate proxy changes with `docker compose config`, `nginx -t`, response-header
checks for `/`, `/api/health/`, and `/admin/`, and `pre-commit run --all-files`.
