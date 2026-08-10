# Respira Webapp

Respira is a web application for air quality data visualization and forecasting.

## Project structure

- `backend` (Django + DRF API)
- `frontend` (Astro + React)
- `proxy` (Nginx)
- `certbot` (certificate management)

## Security

For security procedures and incident response details:

- [Security Policy](SECURITY.md)
- [Security Documentation](docs/security/)

## Docker Compose

For local development and deployment with Docker Compose, see:

- **[Docker Compose How-To Guide](docs/DOCKER_COMPOSE_HOWTO.md)** - Setup, configuration, and troubleshooting
- Quick start: `cp docker-compose.override.yml.example docker-compose.override.yml && cp .env.example .env && docker compose up -d`

## Developer workflow

### Backend local setup

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

### Frontend local setup

```bash
cd frontend
pnpm install
pnpm dev
```

### Pre-commit hooks

Install hooks once per clone:

```bash
pre-commit install --install-hooks
```

Run all hooks manually:

```bash
pre-commit run --all-files
```

### Recommended commit flow

To avoid commit-time failures from auto-fixing hooks (for example end-of-file fixes), use this sequence:

```bash
cd backend
./.venv/bin/python manage.py test
cd ..

pre-commit run --all-files
git add -A
git commit -m "your message"
```

If a hook modifies files during commit, re-stage the modified files and commit again.

## Environment Variables

Configuration reference for all services:

- [Backend environment variables](docs/backend-env-vars.md)
- [Frontend environment variables](docs/frontend-env-vars.md)
- [Proxy environment variables](docs/proxy-env-vars.md)

## Nginx and SSL

Proxy templates live in `proxy/nginx.conf*.template` and are selected with `ENVIRONMENT`.
For production certificates, use the `certbot` service and the mounted `certbot/conf` and `certbot/www` directories.
For automated renewal and monitoring setup, see [Certbot Renewal and TLS Monitoring](docs/certbot-renewal.md).

## System architecture

![final_system_architecture](https://github.com/user-attachments/assets/38adc07b-9431-4aa8-b102-fef3cb6ee2e7)

## Legacy full database architecture

![data_retriever_v4(2)](https://github.com/user-attachments/assets/ebf11e69-8501-425e-b403-120dc5b3f6c0)

## Database tables consumed by this API

![data_retriever_only_front](https://github.com/user-attachments/assets/ec49ab22-fa49-460d-a7e9-9757922dda38)
