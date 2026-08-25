#!/usr/bin/env sh
set -eu

if [ "${GLITCHTIP_UPLOAD_SOURCEMAPS:-false}" != "true" ]; then
  exit 0
fi

require_runtime_value() {
  if [ -z "$2" ]; then
    echo "$1 is required when source-map upload is enabled" >&2
    exit 1
  fi
}

require_runtime_value GLITCHTIP_AUTH_TOKEN "${GLITCHTIP_AUTH_TOKEN:-}"
require_runtime_value GLITCHTIP_CLI_VERSION "${GLITCHTIP_CLI_VERSION:-}"
require_runtime_value GLITCHTIP_CLI_SHA256 "${GLITCHTIP_CLI_SHA256:-}"
require_runtime_value GLITCHTIP_ORG "${GLITCHTIP_ORG:-}"
require_runtime_value GLITCHTIP_PROJECT "${GLITCHTIP_PROJECT:-}"
require_runtime_value GLITCHTIP_RELEASE "${GLITCHTIP_RELEASE:-}"
require_runtime_value GLITCHTIP_URL "${GLITCHTIP_URL:-}"

source_map_dir=${1:-frontend/dist/client}
if [ ! -d "$source_map_dir" ]; then
  echo "Source-map directory does not exist: $source_map_dir" >&2
  exit 1
fi

case "$(uname -m)" in
  x86_64|amd64) cli_arch=x86_64 ;;
  arm64|aarch64) cli_arch=arm64 ;;
  *)
    echo "Unsupported GlitchTip CLI architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT
cli_path="$temp_dir/glitchtip-cli"
cli_url="https://gitlab.com/glitchtip/glitchtip-cli/-/jobs/artifacts/$GLITCHTIP_CLI_VERSION/raw/artifacts/glitchtip-cli-linux-$cli_arch?job=build-linux-$cli_arch"

curl -fsSL "$cli_url" -o "$cli_path"
printf '%s  %s\n' "$GLITCHTIP_CLI_SHA256" "$cli_path" | sha256sum -c -
chmod 755 "$cli_path"

SENTRY_URL="$GLITCHTIP_URL" \
SENTRY_AUTH_TOKEN="$GLITCHTIP_AUTH_TOKEN" \
SENTRY_ORG="$GLITCHTIP_ORG" \
SENTRY_PROJECT="$GLITCHTIP_PROJECT" \
  "$cli_path" sourcemaps inject "$source_map_dir"

SENTRY_URL="$GLITCHTIP_URL" \
SENTRY_AUTH_TOKEN="$GLITCHTIP_AUTH_TOKEN" \
SENTRY_ORG="$GLITCHTIP_ORG" \
SENTRY_PROJECT="$GLITCHTIP_PROJECT" \
  "$cli_path" sourcemaps upload "$source_map_dir" --release "$GLITCHTIP_RELEASE"
