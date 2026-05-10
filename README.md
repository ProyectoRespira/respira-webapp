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

## Running with Docker Compose

Create a root `.env` with at least:

```env
BACKEND_SECRET_KEY=<django-secret>
BACKEND_PORT=8000
FRONTEND_PORT=4321
PROXY_PORT=80
ENVIRONMENT=local
```

Build and start:

```bash
docker compose build
docker compose up -d
```

The stack uses an external Postgres database. Configure connection variables in `backend/.env`.

## Nginx and SSL

Proxy templates live in `proxy/nginx.conf*.template` and are selected with `ENVIRONMENT`.
For production certificates, use the `certbot` service and the mounted `certbot/conf` and `certbot/www` directories.

## System architecture

![final_system_architecture](https://github.com/user-attachments/assets/38adc07b-9431-4aa8-b102-fef3cb6ee2e7)

## Legacy full database architecture

![data_retriever_v4(2)](https://github.com/user-attachments/assets/ebf11e69-8501-425e-b403-120dc5b3f6c0)

## Database tables consumed by this API

![data_retriever_only_front](https://github.com/user-attachments/assets/ec49ab22-fa49-460d-a7e9-9757922dda38)
