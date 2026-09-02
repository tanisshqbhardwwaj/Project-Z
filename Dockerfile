# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# postinstall runs prisma generate, but schema is not copied yet — skip scripts here.
RUN npm ci --ignore-scripts

FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:./dev.db
RUN npx prisma generate
RUN npm run build

FROM base AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.mjs ./prisma.config.mjs
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/package.json ./package.json

COPY scripts/fly-entrypoint.sh /fly-entrypoint.sh
RUN chmod +x /fly-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["/fly-entrypoint.sh"]
