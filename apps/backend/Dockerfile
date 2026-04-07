# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for better layer caching
COPY package*.json ./
COPY packages/types/package*.json packages/types/
COPY apps/backend/package*.json apps/backend/

# Install all deps (including devDeps needed for build)
RUN npm ci --workspace=packages/types --workspace=apps/backend

# Copy source
COPY packages/types/ packages/types/
COPY apps/backend/ apps/backend/

# Generate Prisma client and compile TypeScript
RUN cd apps/backend && npx prisma generate
RUN npm run -w apps/backend build

# Prune devDependencies from the workspace — keeps prisma + engines in root node_modules
RUN npm prune --omit=dev

# ── Stage 2: Run ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ARG GIT_SHA=dev
ENV NODE_ENV=production
ENV GIT_SHA=$GIT_SHA

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Keep the full monorepo node_modules structure so hoisted prisma packages resolve
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/prisma.config.ts ./prisma.config.ts

USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/src/main.js"]
