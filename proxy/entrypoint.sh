#!/bin/sh

# Build an nginx include with allow/deny directives for Django Admin.
# Expected format: comma-separated CIDRs/IPs, e.g. "203.0.113.10/32,198.51.100.0/24".
ADMIN_ALLOWLIST_FILE="/etc/nginx/conf.d/admin-ip-allowlist.conf"
ADMIN_ALLOWLIST_RAW="${PROXY_ADMIN_ALLOWED_IP_RANGES:-}"

: > "$ADMIN_ALLOWLIST_FILE"

if [ -n "$ADMIN_ALLOWLIST_RAW" ]; then
	IFS=','
	for entry in $ADMIN_ALLOWLIST_RAW; do
		cidr=$(echo "$entry" | tr -d '[:space:]')
		if [ -n "$cidr" ]; then
			printf 'allow %s;\n' "$cidr" >> "$ADMIN_ALLOWLIST_FILE"
		fi
	done
	unset IFS
fi

# Secure default: if allowlist is empty, block admin access.
printf 'deny all;\n' >> "$ADMIN_ALLOWLIST_FILE"

envsubst "\${BACKEND_HOST} \${BACKEND_PORT} \${CERT_NAME} \${FRONTEND_PORT} \${FRONTEND_HOST} \${SERVER_HOST}" < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
nginx -g 'daemon off;'
