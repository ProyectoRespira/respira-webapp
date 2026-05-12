#!/bin/bash
set -e

python manage.py collectstatic --noinput;

if [ "${BACKEND_RUN_MIGRATIONS:-true}" = "true" ]; then
  python manage.py migrate api --fake-initial;
  python manage.py migrate;
else
  echo "Skipping migrations because BACKEND_RUN_MIGRATIONS=false";
fi

chmod -R o+r /static;
chmod -R o+x /static;
chown -R www-data:www-data /static;

gunicorn \
  --bind :${BACKEND_PORT:-8000} \
  --workers ${BACKEND_GUNICORN_WORKERS:-2} \
  --timeout ${BACKEND_GUNICORN_TIMEOUT:-90} \
  --max-requests ${BACKEND_GUNICORN_MAX_REQUESTS:-1000} \
  --max-requests-jitter ${BACKEND_GUNICORN_MAX_REQUESTS_JITTER:-100} \
  backend.wsgi:application
