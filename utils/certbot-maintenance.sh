#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
CURRENT_DIR=$(pwd)
DEFAULT_PROJECT_ROOT=$(CDPATH='' cd -- "$SCRIPT_DIR/.." && pwd)
PROJECT_ROOT="$DEFAULT_PROJECT_ROOT"
DEFAULT_LOG_FILE_OVERRIDE="${CERTBOT_MAINTENANCE_LOG:-}"
if [ -n "$DEFAULT_LOG_FILE_OVERRIDE" ]; then
  LOG_FILE="$DEFAULT_LOG_FILE_OVERRIDE"
else
  LOG_FILE="$PROJECT_ROOT/logs/certbot-maintenance.log"
fi
LOG_FILE_FLAG_SET=false
CERTBOT_CONFIG_DIR=
CERT_NAME=
CERTBOT_IMAGE="${CERTBOT_IMAGE:-certbot/certbot:latest}"

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
  utils/certbot-maintenance.sh [--project-root PATH] [--log-file PATH] renew
  utils/certbot-maintenance.sh [--project-root PATH] [--log-file PATH] [--certbot-config-dir PATH] check-expiry --cert-name NAME

Commands:
  renew                 Run Certbot renewal and reload Nginx proxy.
  check-expiry          Print certificate expiration date for monitoring.

Options:
  --project-root PATH       Compose project root. Default: script parent directory.
  --log-file PATH           Maintenance log file path. Default: <project-root>/logs/certbot-maintenance.log
  --certbot-config-dir PATH Base directory containing live/<cert_name>/fullchain.pem
  --cert-name NAME          Certificate directory name for check-expiry

Examples:
  ./utils/certbot-maintenance.sh renew
  ./utils/certbot-maintenance.sh --project-root /srv/respira renew
  ./utils/certbot-maintenance.sh check-expiry --cert-name example.com
  ./utils/certbot-maintenance.sh check-expiry --cert-name example.com --certbot-config-dir /absolute/path/to/certbot/conf
EOF
}

resolve_user_path() {
  input_path=${1:-}

  case "$input_path" in
    /*)
      printf '%s\n' "$input_path"
      ;;
    *)
      printf '%s\n' "$CURRENT_DIR/$input_path"
      ;;
  esac
}

resolve_certbot_config_dir() {
  input_dir=${1:-}

  if [ -z "$input_dir" ]; then
    if [ -d "$CURRENT_DIR/certbot/conf" ]; then
      printf '%s\n' "$CURRENT_DIR/certbot/conf"
      return 0
    fi

    printf '%s\n' "$PROJECT_ROOT/certbot/conf"
    return 0
  fi

  resolve_user_path "$input_dir"
}

resolve_certbot_host_root() {
  if [ -n "${HOST_WORKSPACE_FOLDER:-}" ]; then
    case "$HOST_WORKSPACE_FOLDER" in
      /*)
        printf '%s\n' "$HOST_WORKSPACE_FOLDER"
        ;;
      *)
        # Compose resolves relative bind sources from the Compose file directory.
        printf '%s\n' "$PROJECT_ROOT/$HOST_WORKSPACE_FOLDER"
        ;;
    esac
    return 0
  fi

  printf '%s\n' "$PROJECT_ROOT"
}

require_option_value() {
  option_name=${1:-}
  option_value=${2:-}

  if [ -z "$option_value" ]; then
    log_err "Error: $option_name requires a value."
    usage
    exit 1
  fi
}

run_compose() {
  docker compose -f "$PROJECT_ROOT/docker-compose.yml" "$@"
}

renew() {
  certbot_host_root=$(resolve_certbot_host_root)
  log "[certbot] Running renewal check"
  log "[certbot] Using host certbot root: $certbot_host_root"
  docker run --rm --pull always \
    -v "$certbot_host_root/certbot/www:/var/www/certbot" \
    -v "$certbot_host_root/certbot/conf:/etc/letsencrypt" \
    "$CERTBOT_IMAGE" renew --webroot -w /var/www/certbot --quiet >> "$LOG_FILE" 2>&1

  log "[proxy] Reloading Nginx"
  run_compose exec -T proxy nginx -s reload >> "$LOG_FILE" 2>&1

  log "[ok] Renewal flow completed"
}

check_expiry() {
  cert_name=${1:-}
  certbot_config_dir=$(resolve_certbot_config_dir "$CERTBOT_CONFIG_DIR")
  if [ -z "$cert_name" ]; then
    log_err "Error: cert_name is required for check-expiry."
    usage
    exit 1
  fi

  case "$cert_name" in
    *[!A-Za-z0-9.-]*|*/*|*\\*|*..*)
      log_err "Error: invalid cert_name '$cert_name'."
      exit 1
      ;;
  esac

  cert_file="$certbot_config_dir/live/$cert_name/fullchain.pem"
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

command=

while [ $# -gt 0 ]; do
  case "$1" in
    renew|check-expiry)
      if [ -n "$command" ]; then
        log_err "Error: multiple commands provided."
        usage
        exit 1
      fi
      command="$1"
      shift
      ;;
    --project-root)
      require_option_value "$1" "${2:-}"
      PROJECT_ROOT=$(resolve_user_path "$2")
      shift 2
      ;;
    --log-file)
      require_option_value "$1" "${2:-}"
      LOG_FILE=$(resolve_user_path "$2")
      LOG_FILE_FLAG_SET=true
      shift 2
      ;;
    --certbot-config-dir)
      require_option_value "$1" "${2:-}"
      CERTBOT_CONFIG_DIR="$2"
      shift 2
      ;;
    --cert-name)
      require_option_value "$1" "${2:-}"
      CERT_NAME="$2"
      shift 2
      ;;
    -h|--help|help)
      command=help
      shift
      ;;
    *)
      if [ "$command" = "check-expiry" ] && [ -z "$CERT_NAME" ]; then
        CERT_NAME="$1"
        shift
      elif [ "$command" = "check-expiry" ] && [ -z "$CERTBOT_CONFIG_DIR" ]; then
        CERTBOT_CONFIG_DIR="$1"
        shift
      else
        log_err "Error: unknown argument '$1'"
        usage
        exit 1
      fi
      ;;
  esac
done

if [ "$LOG_FILE_FLAG_SET" != "true" ] && [ -z "$DEFAULT_LOG_FILE_OVERRIDE" ]; then
  LOG_FILE="$PROJECT_ROOT/logs/certbot-maintenance.log"
fi

init_log_file
case "$command" in
  renew)
    renew
    ;;
  check-expiry)
    check_expiry "$CERT_NAME"
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
