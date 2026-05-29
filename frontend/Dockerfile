FROM node:24 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

# Pin pnpm to 11.4.0 for lockfile v9.0 support and consistent CI/local behavior.
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM deps AS build
ARG PUBLIC_REGION_DEFAULT_ID
ARG SITE_URL
ARG PUBLIC_GTAG

ENV PUBLIC_REGION_DEFAULT_ID=$PUBLIC_REGION_DEFAULT_ID
ENV SITE_URL=$SITE_URL
ENV PUBLIC_GTAG=$PUBLIC_GTAG

COPY . .
RUN pnpm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl \
	&& rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
	&& useradd --system --uid 1001 --gid nodejs app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN chown -R app:nodejs /app

ENV HOST=0.0.0.0
USER app

EXPOSE 4321
CMD ["sh", "-c", "PORT=${FRONTEND_PORT:-4321} node ./dist/server/entry.mjs"]
