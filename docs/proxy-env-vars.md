# Proxy Environment Variables

The proxy is an nginx container. All nginx config values are injected at container start by `proxy/entrypoint.sh` using `envsubst` — nothing is baked into the image at build time (except the template selection).

See [`proxy/.env.example`](../proxy/.env.example) for a ready-to-copy reference.

---

## Upstream Services

These tell nginx where to route backend and frontend traffic.

| Variable | Required | Default | Where used | Notes |
|---|---|---|---|---|
| `BACKEND_HOST` | Yes | — | `proxy/entrypoint.sh`, all nginx templates | Hostname of the backend service. In docker-compose this is hardcoded to `backend` (the service name). |
| `BACKEND_PORT` | Yes | — | `proxy/entrypoint.sh`, all nginx templates | Port the backend service listens on. |
| `FRONTEND_HOST` | Yes | — | `proxy/entrypoint.sh`, all nginx templates | Hostname of the frontend service. In docker-compose this is hardcoded to `frontend` (the service name). |
| `FRONTEND_PORT` | Yes | — | `proxy/entrypoint.sh`, all nginx templates | Port the frontend service listens on. |

---

## Server Identity

| Variable | Required | Default | Where used | Notes |
|---|---|---|---|---|
| `SERVER_HOST` | Yes | — | `proxy/entrypoint.sh`, all nginx templates | Public hostname placed in `server_name` directives and HTTP→HTTPS redirects. |

---

## TLS

Required when using the `production` or `development` build targets. Not needed for `local`.

| Variable | Required | Default | Where used | Notes |
|---|---|---|---|---|
| `CERT_NAME` | Yes (TLS targets) | — | `proxy/entrypoint.sh`, `nginx.conf.template`, `nginx.conf.dev.template` | Directory name under `/etc/nginx/ssl/live/` where `fullchain.pem` and `privkey.pem` live. |

---

## Build-Time Variables

| Variable | Required | Default | Where used | Notes |
|---|---|---|---|---|
| `ENVIRONMENT` | Yes | — | `docker-compose.yml` (`build.target`), `proxy/Dockerfile` | Selects the Dockerfile stage: `local`, `development`, or `production`. Determines which nginx config template is copied into the image. |

---

## Compose-Only Variables

Used by docker-compose for host-level proxy behavior. Not read by the proxy container itself.

| Variable | Required | Default | Where used | Notes |
|---|---|---|---|---|
| `PROXY_PORT` | No | `80` | `docker-compose.yml` (`ports`) | Host port mapped to proxy container port 80. |
| `HOST_WORKSPACE_FOLDER` | No | `.` | `docker-compose.yml` (`volumes`) | Absolute path to the repository root, used for certbot bind mounts. Defaults to the current directory. |

---

## Nginx Config Templates

| Template | Used by stage | TLS | Notes |
|---|---|---|---|
| `nginx.conf.local.template` | `local`, `development` | No | Plain HTTP only. `server_name _` catch-all. |
| `nginx.conf.dev.template` | — (not wired in Dockerfile) | Yes | TLS with redirect; `SERVER_HOST`-matched. |
| `nginx.conf.template` | `production` | Yes | Full TLS with HSTS-style redirect and `www` handling. |

---

## Notes

- The proxy Dockerfile contains no `ARG` or `ENV` declarations for app config. All substitution is done exclusively by `envsubst` in `entrypoint.sh` at container start.
- In docker-compose, `BACKEND_HOST` and `FRONTEND_HOST` are hardcoded to the compose service names (`backend` and `frontend`). They are only configurable when running the proxy standalone.
