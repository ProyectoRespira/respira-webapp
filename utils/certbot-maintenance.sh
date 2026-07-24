#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH='' cd -- "$SCRIPT_DIR/.." && pwd)
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
LOG_FILE="${CERTBOT_MAINTENANCE_LOG:-$PROJECT_ROOT/logs/certbot-maintenance.log}"

init_log_file() {
  log_dir=$(dirname -- "$LOG_FILE")
  mkdir -p "$log_dir"
  touch "$LOG_FILE"
  chmod 600 "$LOG_FILE" 2>/dev/null || true
}

log() {
  printf '%s\n' "$*" | tee -a "$LOG_FILE"
}

log_err() {
  printf '%s\n' "$*" | tee -a "$LOG_FILE" >&2
}

usage() {
  cat <<'EOF'
Usage:
  utils/certbot-maintenance.sh renew
  utils/certbot-maintenance.sh check-expiry <cert_name>

Commands:
  renew                 Run Certbot renewal and reload Nginx proxy.
  check-expiry          Print certificate expiration date for monitoring.

Examples:
  ./utils/certbot-maintenance.sh renew
  ./utils/certbot-maintenance.sh check-expiry example.com
EOF
}

run_compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

renew() {
  log "[certbot] Running renewal check"
  run_compose run --rm certbot renew --webroot -w /var/www/certbot --quiet >> "$LOG_FILE" 2>&1

  log "[proxy] Reloading Nginx"
  run_compose exec -T proxy nginx -s reload >> "$LOG_FILE" 2>&1

  log "[ok] Renewal flow completed"
}

check_expiry() {
  cert_name=${1:-}
  if [ -z "$cert_name" ]; then
    log_err "Error: cert_name is required for check-expiry."
    usage
    exit 1
  fi

  cert_file="$PROJECT_ROOT/certbot/conf/live/$cert_name/fullchain.pem"
  if [ ! -f "$cert_file" ]; then
    log_err "Error: certificate file not found at $cert_file"
    exit 1
  fi

  log "[cert] File: $cert_file"
  # Shows absolute expiration date and days remaining in UTC.
  end_date=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2-)
  end_ts=$(date -u -d "$end_date" +%s)
  now_ts=$(date -u +%s)
  days_left=$(( (end_ts - now_ts) / 86400 ))

  log "[cert] Expires at (UTC): $end_date"
  log "[cert] Days remaining: $days_left"
}

command=${1:-}
init_log_file
case "$command" in
  renew)
    renew
    ;;
  check-expiry)
    check_expiry "${2:-}"
    ;;
  -h|--help|help|"")
    usage
    ;;
  *)
    log_err "Error: unknown command '$command'"
    usage
    exit 1
    ;;
esac
