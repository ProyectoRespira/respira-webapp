#!/bin/sh

# Build an nginx include with allow/deny directives for Django Admin.
# Expected format: comma-separated CIDRs/IPs, e.g. "203.0.113.10/32,198.51.100.0/24".
ADMIN_ALLOWLIST_FILE="/etc/nginx/conf.d/admin-ip-allowlist.conf"
ADMIN_ALLOWLIST_RAW="${PROXY_ADMIN_ALLOWED_IP_RANGES:-}"
CSP_HEADERS_FILE="/etc/nginx/conf.d/csp-headers.conf"
CSP_MODE="${PROXY_CSP_MODE:-report-only}"
CSP_SECURITY_ENDPOINT="${PROXY_CSP_SECURITY_ENDPOINT:-}"
CSP_GLITCHTIP_ORIGIN="${PROXY_CSP_GLITCHTIP_ORIGIN:-}"

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

validate_https_url() {
	case "$1" in
		https://*) ;;
		*) return 1 ;;
	esac
	case "$1" in
		*[!A-Za-z0-9:/?\&=._~%+#,@-]*|'') return 1 ;;
	esac
}

: > "$CSP_HEADERS_FILE"

case "$CSP_MODE" in
	off)
		;;
	report-only)
		if [ -n "$CSP_SECURITY_ENDPOINT" ] && ! validate_https_url "$CSP_SECURITY_ENDPOINT"; then
			echo "PROXY_CSP_SECURITY_ENDPOINT must be an HTTPS URL without spaces or quotes" >&2
			exit 1
		fi
		if [ -n "$CSP_GLITCHTIP_ORIGIN" ] && ! validate_https_url "$CSP_GLITCHTIP_ORIGIN"; then
			echo "PROXY_CSP_GLITCHTIP_ORIGIN must be an HTTPS URL without spaces or quotes" >&2
			exit 1
		fi

		connect_src="connect-src 'self' https://api.maptiler.com https://connect.facebook.net https://www.google-analytics.com https://www.googletagmanager.com"
		if [ -n "$CSP_GLITCHTIP_ORIGIN" ]; then
			connect_src="$connect_src $CSP_GLITCHTIP_ORIGIN"
		fi
		csp="default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; manifest-src 'self'; worker-src 'self' blob:; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net; $connect_src; frame-src 'self' https://www.facebook.com"
		if [ -n "$CSP_SECURITY_ENDPOINT" ]; then
			csp="$csp; report-uri $CSP_SECURITY_ENDPOINT; report-to csp-endpoint"
			printf "add_header Reporting-Endpoints 'csp-endpoint=\"%s\"' always;\n" "$CSP_SECURITY_ENDPOINT" >> "$CSP_HEADERS_FILE"
		fi
		printf "add_header Content-Security-Policy-Report-Only \"%s\" always;\n" "$csp" >> "$CSP_HEADERS_FILE"
		;;
	*)
		echo "PROXY_CSP_MODE must be 'off' or 'report-only'" >&2
		exit 1
		;;
esac

envsubst "\${BACKEND_HOST} \${BACKEND_PORT} \${CERT_NAME} \${FRONTEND_PORT} \${FRONTEND_HOST} \${SERVER_HOST}" < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
nginx -t
nginx -g 'daemon off;'
