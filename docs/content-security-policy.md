# Content Security Policy

Content Security Policy (CSP) constrains the sources from which a browser may
load content, execute scripts, submit forms, or embed pages. It is a
defense-in-depth control against injection and unintended third-party content.

## Safe Rollout

Start with `Content-Security-Policy-Report-Only`. Browsers evaluate the policy
and report violations without blocking resources, allowing operators to identify
required sources before enforcement.

Apply the policy at the public edge so a single configuration covers all content
served from an application origin. Use explicit origins for each required
integration; avoid broad source patterns for scripts, connections, styles, and
fonts.

## Runtime Configuration

Configure CSP at runtime:

```dotenv
PROXY_CSP_MODE=report-only
PROXY_CSP_SECURITY_ENDPOINT=
PROXY_CSP_GLITCHTIP_ORIGIN=
```

`PROXY_CSP_SECURITY_ENDPOINT` is an optional HTTPS CSP report collector.
`PROXY_CSP_GLITCHTIP_ORIGIN` is the corresponding HTTPS origin. When omitted,
browsers retain local report-only diagnostics without sending reports remotely.

Set `PROXY_CSP_MODE=off` only as an emergency rollback. It removes CSP headers
without rebuilding application images.

## Reporting

For browser compatibility, a report collector should support both legacy
`report-uri` and modern Reporting API headers (`report-to` and
`Reporting-Endpoints`). The reporting origin must also be allowed by
`connect-src`.

Treat CSP reports as telemetry. Restrict access, define retention, and verify
that reports do not contain credentials, request bodies, or other sensitive
values before enabling a remote collector.

## Promotion to Enforcement

1. Deploy report-only mode and exercise every user workflow.
2. Review violations by directive, blocked origin, browser, release, and
   environment.
3. Add only verified required sources and remove obsolete allowances.
4. Replace inline scripts with nonces or hashes before removing
   `'unsafe-inline'` from `script-src`.
5. Enforce CSP in a separate, reviewed change after an observation period with
   no unexplained violations.
