ARG BUN_VERSION=1.3.10

FROM oven/bun:${BUN_VERSION} AS pruner
WORKDIR /app
RUN bun add -g turbo@2.8.21
ENV TURBO_TELEMETRY_DISABLED=1
COPY . .
RUN turbo prune backend --docker

FROM oven/bun:${BUN_VERSION} AS installer
WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile

FROM installer AS builder
WORKDIR /app

COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
ENV NODE_ENV=production

RUN ARCH="$(uname -m)" && \
    if [ "$ARCH" = "aarch64" ]; then TARGET="bun-linux-arm64"; else TARGET="bun-linux-x64"; fi && \
    bun build \
      --compile \
      --minify-whitespace \
      --minify-syntax \
      --target "$TARGET" \
      --outfile /app/server \
      ./apps/backend/src/index.ts

FROM debian:bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/server /app/server

ENV NODE_ENV=production

EXPOSE 3001
CMD ["./server"]
