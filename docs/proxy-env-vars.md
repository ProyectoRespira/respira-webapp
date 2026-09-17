# Proxy Environment Variables

The proxy is an nginx container. All nginx config values are injected at container start by `proxy/entrypoint.sh` using `envsubst` — nothing is baked into the image at build time (except the template selection).

See [`proxy/.env.example`](../proxy/.env.example) for a ready-to-copy reference.

---

## Upstream Services

These tell nginx where to route backend and frontend traffic.

| Variable        | Required | Default | Where used                                 | Notes                                                                                                   |
| --------------- | -------- | ------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `BACKEND_HOST`  | Yes      | —       | `proxy/entrypoint.sh`, all nginx templates | Hostname of the backend service. In docker-compose this is hardcoded to `backend` (the service name).   |
| `BACKEND_PORT`  | Yes      | —       | `proxy/entrypoint.sh`, all nginx templates | Port the backend service listens on.                                                                    |
| `FRONTEND_HOST` | Yes      | —       | `proxy/entrypoint.sh`, all nginx templates | Hostname of the frontend service. In docker-compose this is hardcoded to `frontend` (the service name). |
| `FRONTEND_PORT` | Yes      | —       | `proxy/entrypoint.sh`, all nginx templates | Port the frontend service listens on.                                                                   |

---

## Server Identity

| Variable      | Required | Default | Where used                                 | Notes                                                                        |
| ------------- | -------- | ------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| `SERVER_HOST` | Yes      | —       | `proxy/entrypoint.sh`, all nginx templates | Public hostname placed in `server_name` directives and HTTP→HTTPS redirects. |

---

## Django Admin IP Allowlist

Controls who can reach Django Admin (`/admin/`) through nginx.

| Variable                        | Required | Default | Where used                                                   | Notes                                                                                                  |
| ------------------------------- | -------- | ------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `PROXY_ADMIN_ALLOWED_IP_RANGES` | No       | `""`    | `docker-compose.yml` (proxy env), `proxy/entrypoint.sh`, all nginx templates | Comma-separated IP/CIDR entries. Generates nginx `allow ...;` rules for `/admin/` and appends `deny all;`. If empty, `/admin/` is blocked by default. |

Format examples:

- `PROXY_ADMIN_ALLOWED_IP_RANGES=203.0.113.10/32`
- `PROXY_ADMIN_ALLOWED_IP_RANGES=203.0.113.0/24,198.51.100.0/24`
- `PROXY_ADMIN_ALLOWED_IP_RANGES=2001:db8:abcd::/48`

Tips:

- Use `/32` for a single IPv4 host and `/128` for a single IPv6 host.
- Keep the list minimal (office/VPN egress ranges only).
- Redeploy or restart the proxy after changing this value.

---

## Prefect Reverse Proxy

Prefect runs as a separate compose stack (`respira-data`) and is reverse-proxied at `/prefect/` behind the same TLS certificate as the rest of the site, restricted to a VPN/office IP allowlist the same way `/admin/` is. The `proxy` service joins Prefect's external Docker network (`respira-data_default` by default, declared as `external: true` in `docker-compose.yml`) so it can reach Prefect by container alias instead of a published host port.

| Variable                          | Required | Default                 | Where used                                                                   | Notes                                                                                                                 |
| ---------------------------------- | -------- | ------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `PREFECT_HOST`                    | No       | `prefect_server`         | `docker-compose.yml` (proxy env), `proxy/entrypoint.sh`, `proxy/nginx.conf.template` | Container network alias nginx proxies `/prefect/` to. Find it with `docker inspect <prefect_container> --format '{{json .NetworkSettings.Networks}}'`. |
| `PREFECT_PORT`                    | No       | `4200`                   | same as above                                                                | Port Prefect's server/UI listens on inside its container.                                                             |
| `PROXY_PREFECT_ALLOWED_IP_RANGES` | No       | `""`                     | `docker-compose.yml` (proxy env), `proxy/entrypoint.sh`, `proxy/nginx.conf.template` | Comma-separated IP/CIDR entries, same format as `PROXY_ADMIN_ALLOWED_IP_RANGES`. If empty, `/prefect/` is blocked by default. |

If Prefect's compose project uses a different network name, update the `respira-data_default` entry under the top-level `networks:` key (and the `proxy` service's `networks:` list) in `docker-compose.yml` to match.

Access Prefect at `https://$SERVER_HOST/prefect/` instead of the host's direct `:4200` port; the direct port should be firewalled off from the public internet.

---

## Content Security Policy

The proxy owns the Content Security Policy for content served through the public
hostname. The current policy is report-only: it never blocks a resource, but
browsers report candidate-policy violations locally and, optionally, remotely.

| Variable | Required | Default | Where used | Notes |
| --- | --- | --- | --- | --- |
| `PROXY_CSP_MODE` | No | `report-only` | `docker-compose.yml`, `proxy/entrypoint.sh` | Allowed values: `report-only` and `off`. Use `off` only as an emergency rollback. Enforcement is intentionally not supported yet. |
| `PROXY_CSP_SECURITY_ENDPOINT` | No | `""` | `proxy/entrypoint.sh` | HTTPS endpoint for a CSP report collector. When set, the proxy emits compatible `report-uri`, `report-to`, and `Reporting-Endpoints` headers. |
| `PROXY_CSP_GLITCHTIP_ORIGIN` | No | `""` | `proxy/entrypoint.sh` | HTTPS origin of the configured report collector. Required with the Security Endpoint so the browser can submit reports. |

Leave the endpoint and origin blank to keep report-only violations in browser
developer tools without sending remote reports. These values are public
reporting destinations, not GlitchTip management credentials. The proxy rejects
non-HTTPS or unsafe URL values at startup.

See [`content-security-policy.md`](content-security-policy.md) for the
allowlisted integrations, report-only rollout, validation, and enforcement
promotion criteria.

---

## TLS

Required when using the `production` or `development` build targets.
Not needed for `local`.

| Variable    | Required           | Default | Where used                                                              | Notes                                                                                     |
| ----------- | ------------------ | ------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `CERT_NAME` | Yes (`production`) | —       | `proxy/entrypoint.sh`, `nginx.conf.template`, `nginx.conf.dev.template` | Directory name under `/etc/nginx/ssl/live/` where `fullchain.pem` and `privkey.pem` live. |

---

## Build-Time Variables

| Variable      | Required | Default | Where used                                                | Notes                                                                                                                                   |
| ------------- | -------- | ------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `ENVIRONMENT` | Yes      | —       | `docker-compose.yml` (`build.target`), `proxy/Dockerfile` | Selects the Dockerfile stage: `local`, `development`, or `production`. Determines which nginx config template is copied into the image. |

---

## Compose-Only Variables

Used by docker-compose for host-level proxy behavior. Not read by the proxy container itself.

| Variable                | Required | Default | Where used                       | Notes                                                                                                  |
| ----------------------- | -------- | ------- | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `PROXY_PORT`            | No       | `80`    | `docker-compose.yml` (`ports`)   | Host port mapped to proxy container port 80.                                                           |
| `HOST_WORKSPACE_FOLDER` | No       | `.`     | `docker-compose.yml` (`volumes`) | Absolute path to the repository root, used for certbot bind mounts. Defaults to the current directory. |

---

## Nginx Config Templates

| Template                    | Used by stage | TLS | Notes                                                 |
| --------------------------- | ------------- | --- | ----------------------------------------------------- |
| `nginx.conf.local.template` | `local`       | No  | Plain HTTP only. `server_name _` catch-all.           |
| `nginx.conf.dev.template`   | `development` | Yes | TLS with redirect; `SERVER_HOST`-matched.             |
| `nginx.conf.template`       | `production`  | Yes | Full TLS with HSTS-style redirect and `www` handling. |

---

## Notes

- The proxy Dockerfile contains no `ARG` or `ENV` declarations for app config. All substitution is done exclusively by `envsubst` in `entrypoint.sh` at container start.
- The `development` stage copies `nginx.conf.dev.template`, so it enables TLS and HTTP→HTTPS redirect behavior for `SERVER_HOST`.
- In docker-compose, `BACKEND_HOST` and `FRONTEND_HOST` are hardcoded to the compose service names (`backend` and `frontend`). They are only configurable when running the proxy standalone.
