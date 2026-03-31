ARG BUN_VERSION=1.3.10

FROM oven/bun:${BUN_VERSION}-slim AS prepare
WORKDIR /app
RUN bun add -g turbo@2.8.21
COPY . .
RUN turbo prune frontend --docker

FROM oven/bun:${BUN_VERSION}-slim AS builder
WORKDIR /app

COPY --from=prepare /app/out/json/ .
COPY --from=prepare /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile

COPY --from=prepare /app/out/full/ .
COPY --from=prepare /app/tsconfig.base.json ./tsconfig.base.json

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

RUN cd apps/frontend && bun run build

FROM caddy:2-alpine

COPY apps/frontend/Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/apps/frontend/out /srv

EXPOSE 80
