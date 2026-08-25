FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

# Pin pnpm to 11.8.0 for lockfile v9.0 support and consistent CI/local behavior.
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm run build

FROM build AS glitchtip-build
ARG GLITCHTIP_UPLOAD_SOURCEMAPS=false
ARG GLITCHTIP_CLI_VERSION
ARG GLITCHTIP_CLI_SHA256
ARG GLITCHTIP_URL
ARG GLITCHTIP_ORG
ARG GLITCHTIP_PROJECT
ARG GLITCHTIP_RELEASE
ARG TARGETARCH
RUN --mount=type=secret,id=glitchtip_auth_token,required=false \
	if [ "$GLITCHTIP_UPLOAD_SOURCEMAPS" = "true" ]; then \
		auth_token="$(cat /run/secrets/glitchtip_auth_token)"; \
		test -n "$auth_token"; \
		test -n "$GLITCHTIP_CLI_VERSION"; \
		test -n "$GLITCHTIP_CLI_SHA256"; \
		test -n "$GLITCHTIP_URL"; \
		test -n "$GLITCHTIP_ORG"; \
		test -n "$GLITCHTIP_PROJECT"; \
		test -n "$GLITCHTIP_RELEASE"; \
		apt-get update; \
		apt-get install -y --no-install-recommends ca-certificates curl; \
		rm -rf /var/lib/apt/lists/*; \
		case "$TARGETARCH" in amd64) cli_arch=x86_64 ;; arm64) cli_arch=arm64 ;; *) echo "Unsupported GlitchTip CLI architecture: $TARGETARCH"; exit 1 ;; esac; \
		curl -fsSL "https://gitlab.com/glitchtip/glitchtip-cli/-/jobs/artifacts/$GLITCHTIP_CLI_VERSION/raw/artifacts/glitchtip-cli-linux-$cli_arch?job=build-linux-$cli_arch" -o /usr/local/bin/glitchtip-cli; \
		echo "$GLITCHTIP_CLI_SHA256  /usr/local/bin/glitchtip-cli" | sha256sum -c -; \
		chmod 755 /usr/local/bin/glitchtip-cli; \
		SENTRY_URL="$GLITCHTIP_URL" SENTRY_AUTH_TOKEN="$auth_token" SENTRY_ORG="$GLITCHTIP_ORG" SENTRY_PROJECT="$GLITCHTIP_PROJECT" glitchtip-cli sourcemaps inject ./dist/client; \
		SENTRY_URL="$GLITCHTIP_URL" SENTRY_AUTH_TOKEN="$auth_token" SENTRY_ORG="$GLITCHTIP_ORG" SENTRY_PROJECT="$GLITCHTIP_PROJECT" glitchtip-cli sourcemaps upload ./dist/client --release "$GLITCHTIP_RELEASE"; \
	fi; \
	find ./dist/client -type f -name "*.map" -delete

FROM node:24-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl \
	&& rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
	&& useradd --system --uid 1001 --gid nodejs app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=glitchtip-build /app/dist ./dist

RUN chown -R app:nodejs /app

ENV HOST=0.0.0.0
USER app

EXPOSE 4321
CMD ["sh", "-c", "PORT=${FRONTEND_PORT:?Missing runtime FRONTEND_PORT} node ./dist/server/entry.mjs"]
