# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Silent Lifestyle BD
#
# Multi-stage build producing a Next.js standalone server.
# Node 22 to match the toolchain this project is developed on.
# ---------------------------------------------------------------------------

FROM node:22-alpine AS base
# Prisma's query engine needs OpenSSL, and Alpine's musl needs the glibc shim.
# Without these, `prisma generate` succeeds and the client fails at runtime.
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable
WORKDIR /app


# --- deps ------------------------------------------------------------------
# Separate stage so a lockfile change is the only thing that busts the cache.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile


# --- build -----------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# BUILD-TIME values. `NEXT_PUBLIC_*` are inlined into the client bundle, and the
# Server Actions encryption key is embedded in the action IDs — so both must be
# supplied here, not at runtime, and the key must stay stable across deploys or
# existing clients get "Failed to find Server Action".
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
ARG NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=$NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT \
    NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=$NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY \
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY \
    NEXT_TELEMETRY_DISABLED=1

# Generate the Prisma client before building — the app imports it.
RUN pnpm exec prisma generate
RUN pnpm build


# --- runtime ---------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# `output: 'standalone'` emits a minimal server plus only the node_modules it
# traced. It does NOT copy `public/` or `.next/static` — both must be placed by
# hand, or every asset and optimised image 404s.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma schema + migrations travel with the image so the container can run
# `migrate deploy` itself rather than needing a separate toolchain on the host.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

# Node handles SIGTERM directly here (no shell wrapper), so compose's
# stop_grace_period actually reaches the process and in-flight requests drain.
CMD ["node", "server.js"]
