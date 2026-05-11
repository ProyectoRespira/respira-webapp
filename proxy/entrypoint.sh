#!/bin/sh
envsubst '$BACKEND_HOST $BACKEND_PORT $CERT_NAME $FRONTEND_PORT $FRONTEND_HOST $SERVER_HOST' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
nginx -g 'daemon off;'
