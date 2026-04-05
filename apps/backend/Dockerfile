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
RUN npm run -w apps/backend prisma generate
RUN npm run -w apps/backend build

# Prune to production dependencies only
RUN npm prune --omit=dev --workspace=apps/backend

# ── Stage 2: Run ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Copy built output and pruned node_modules from builder
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/prisma ./prisma

# Prisma generated client is embedded in node_modules — no extra copy needed

USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/main.js"]
