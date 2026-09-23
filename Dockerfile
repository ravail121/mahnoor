# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# `npm ci`'s postinstall generates the Prisma client into lib/generated
# (see prisma/schema.prisma's generator output path) — carry that over
# explicitly, since lib/generated is gitignored/dockerignored and COPY . .
# below won't provide it.
COPY --from=deps /app/lib/generated ./lib/generated
COPY . .
# Next.js's build step imports route modules to collect page data, which
# transitively constructs the Prisma client — it just needs a syntactically
# valid value here, not a reachable database. The real DATABASE_URL is
# injected at container runtime (see docker-compose.app.yml) and overrides
# this; it never leaks into the running app.
ARG DATABASE_URL="postgresql://user:password@localhost:5432/build_placeholder"
ENV DATABASE_URL=$DATABASE_URL
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
