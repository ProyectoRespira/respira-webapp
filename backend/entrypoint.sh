#!/bin/bash
set -e

APP_USER="${BACKEND_APP_USER:-appuser}"
APP_GROUP="${BACKEND_APP_GROUP:-appgroup}"

python manage.py collectstatic --noinput;

if [ "${BACKEND_RUN_MIGRATIONS:-true}" = "true" ]; then
  python manage.py migrate api --fake-initial;
  python manage.py migrate;
else
  echo "Skipping migrations because BACKEND_RUN_MIGRATIONS=false";
fi

chmod -R o+r /static;
chmod -R o+x /static;
if [ "$(id -u)" -eq 0 ]; then
  chown -R "${APP_USER}:${APP_GROUP}" /static;
  exec gosu "${APP_USER}:${APP_GROUP}" \
    gunicorn --bind :"${BACKEND_PORT:-8000}" --workers 4 backend.wsgi:application
fi

exec gunicorn --bind :"${BACKEND_PORT:-8000}" --workers 4 backend.wsgi:application
