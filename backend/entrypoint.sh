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

gunicorn --bind :"${BACKEND_PORT:-8000}" --workers 4 backend.wsgi:application
