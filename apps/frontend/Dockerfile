# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for better layer caching
COPY package*.json ./
COPY packages/types/package*.json packages/types/
COPY apps/frontend/package*.json apps/frontend/

RUN npm ci --workspace=packages/types --workspace=apps/frontend

# Copy source
COPY packages/types/ packages/types/
COPY apps/frontend/ apps/frontend/

# VITE_API_URL and VITE_WS_URL are injected at build time by CI
# They differ between staging and production environments
ARG VITE_API_URL
ARG VITE_WS_URL

RUN npm run build -w apps/frontend

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
