FROM nginx:1.27-alpine AS base

COPY --chmod=0755 entrypoint.sh /entrypoint.sh
CMD ["/bin/sh", "-c", "/entrypoint.sh"]

FROM base AS local
COPY nginx.conf.local.template /etc/nginx/nginx.conf.template
EXPOSE 80

FROM base AS development
COPY nginx.conf.dev.template /etc/nginx/nginx.conf.template
EXPOSE 80

FROM base AS production
COPY nginx.conf.template /etc/nginx/nginx.conf.template
EXPOSE 80
EXPOSE 443
