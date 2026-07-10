# Docker Compose Quick Start

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (local or remote) — the stack does **not** include a database service
- Ports 80, 8000, 4321 available (or adjust in `.env`)

## Setup

**1. Copy config template:**

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
```

**2. Create `.env` file:**

```bash
cp .env.example .env
```

Then edit `.env` with your values, at minimum:

```
ENVIRONMENT=local
BACKEND_DEBUG=true
BACKEND_SECRET_KEY=dev-secret-key-change-in-production

# PostgreSQL — provide external database credentials
BACKEND_POSTGRES_DB=respira
BACKEND_POSTGRES_USER=your_user
BACKEND_POSTGRES_PASSWORD=your_password
BACKEND_POSTGRES_HOST=your-db-host
BACKEND_POSTGRES_PORT=5432

# Frontend config
PUBLIC_REGION_DEFAULT_ID=1
BACKEND_URL=http://localhost:8000
SITE_URL=http://localhost

# Optional
CONTACT_MAIL=contact@example.com
TWITTER_HANDLE=your_handle
```

**3. Start services:**

```bash
docker compose up -d
```

Then access:
- Frontend: http://localhost
- Backend API: http://localhost:8000/api/health/
- Proxy/SSL: https://localhost

## Common Commands

```bash
# View status
docker compose ps

# View logs (all or specific service)
docker compose logs -f
docker compose logs -f backend

# Execute commands
docker compose exec backend python manage.py createsuperuser
docker compose exec frontend pnpm install

# Rebuild after code changes
docker compose up -d --build

# Stop and clean up
docker compose down
docker compose down -v  # also removes volumes
```

## Development Tips

**Hot reload:** Code changes in `backend/` and `frontend/` automatically reload if volumes are mounted in `docker-compose.override.yml`. Check the example file for setup.

**Backend code changes:** Hot-reloaded via Django dev server.

**Frontend code changes:** Hot-reloaded via Astro dev server.

**Dependency changes:** Install inside container:
- Backend: `docker compose exec backend pip install -r requirements.txt`
- Frontend: `docker compose exec frontend pnpm install`

**Migrations:** Run automatically on startup. Skip with `BACKEND_RUN_MIGRATIONS=false`.

## Troubleshooting

**Services won't start:** Check logs with `docker compose logs -f` to see specific errors.

**Backend can't reach database:** Verify `BACKEND_POSTGRES_*` credentials in `.env` point to an accessible database.

**Port already in use:** Update `.env` or `docker-compose.override.yml` to use different ports.

**Stale code changes:** Rebuild with `docker compose up -d --build`.

For detailed environment variables, see [backend-env-vars.md](../backend-env-vars.md).
