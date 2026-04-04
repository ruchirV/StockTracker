# Phase 6 — CI/CD, Cloud Deploy & Hardening

**Status:** Planning  
**Goal:** Ship StockTracker to production on AWS. Phase 6 builds the complete path from local dev to a live, publicly accessible deployment: GitHub Actions pipeline, Docker images, OpenTofu-managed AWS infrastructure, staging and production environments, SAST/SonarCloud/Dependabot security scanning, Playwright E2E tests, WCAG 2.1 AA audit, and the Ollama self-hosted LLM swap. Everything that was acceptable as "local only" in Phases 1–5 gets hardened, secured, and automated here.

---

## Prerequisites

**All of the following must be true before starting Phase 6 implementation.**

### Codebase

| Check | Status |
|---|---|
| All Phase 1–5 acceptance criteria pass locally | Required |
| `ESLint + Prettier + tsc --noEmit` report zero errors | Required |
| Backend unit test suite: all tests green | Required |
| Frontend unit test suite: all tests green | Required |
| No secrets committed in git history (scan with `git log -S` or `truffleHog`) | Required |
| `docker-compose.dev.yml` brings up full local stack (postgres, redis, mailpit) cleanly | Required |

### AWS Account

| Requirement | Notes |
|---|---|
| AWS account created | Free-tier eligible or existing account |
| IAM user / role with programmatic access | `AdministratorAccess` for Terraform bootstrapping; lock down after |
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` stored as GitHub Actions secrets | Never committed |
| S3 bucket created for Terraform remote state | e.g. `stocktracker-tfstate-<account-id>` |
| DynamoDB table for Terraform state lock | e.g. `stocktracker-tfstate-lock` |
| AWS region decided | Default recommendation: `us-east-1` (most services, cheapest ECR egress) |

### GitHub Repository

| Requirement | Notes |
|---|---|
| Repo is public **or** GitHub Teams/Enterprise | SonarCloud free tier requires public repo; CodeQL free for all public repos |
| Branch protection on `main` | Require PR + CI pass before merge |
| Secrets configured in GitHub Actions | See full list in Section 5 |
| Dependabot config added (`dependabot.yml`) | Enables automated dependency PRs |

### External Service Accounts

| Service | Purpose | Free? |
|---|---|---|
| [SonarCloud](https://sonarcloud.io) | SAST / code quality dashboard | Free for public repos |
| `SONAR_TOKEN` set as GitHub secret | Required for SonarCloud step | — |
| [Groq](https://console.groq.com) | LLM for Phase 6 deploy (MVP) | Yes — 14,400 req/day |
| `GROQ_API_KEY` stored in AWS Secrets Manager | Never in code or env files | — |
| Finnhub API key in AWS Secrets Manager | Already used in dev | — |
| SendGrid or SMTP credentials in Secrets Manager | Email from production | Free tier available |

### Tooling (local developer machine)

| Tool | Version | Install |
|---|---|---|
| Docker Desktop | ≥ 24 | [docker.com](https://docker.com) |
| OpenTofu CLI | ≥ 1.9 | `brew install opentofu` |
| AWS CLI v2 | ≥ 2.15 | `brew install awscli` |
| `aws configure` profile set up | With the IAM credentials above | `aws configure` |
| Node.js | 20 LTS | Already required |

---

## Accepted MVP (Definition of Done)

Phase 6 is complete when **all** of the following pass:

| # | Scenario | Expected Result |
|---|---|---|
| D1 | Push to a feature branch | GitHub Actions: lint → typecheck → unit tests → SAST pass; no deploy |
| D2 | Open a PR against `main` | All CI checks pass; SonarCloud quality gate shown on PR; merge blocked until green |
| D3 | Merge to `main` | Docker images built and pushed to ECR; OpenTofu Plan runs; staging deploy triggered automatically |
| D4 | Staging URL loads the app | React SPA served from CloudFront; API health check at `/health` returns `200` |
| D5 | Staging: register → login → add stock → set alert | All features work against staging RDS + ElastiCache |
| D6 | Playwright E2E suite runs in CI against staging | All tests pass |
| D7 | Manual approval gate triggers production deploy | Same flow as staging; production URL live |
| D8 | Production: live price updates work | Finnhub WS → ECS → browser in < 500 ms |
| D9 | Production: AI chat works for premium user | Groq streaming response via `GroqLLMAdapter` |
| D10 | Secrets not in any env file committed to repo | `git log` + `truffleHog` scan clean |
| D11 | WCAG 2.1 AA audit: zero violations | Axe DevTools or `axe-core` Playwright integration |
| D12 | SonarCloud quality gate: passed | Zero blockers, zero critical issues |
| D13 | `npm audit --audit-level=high` passes | Zero high/critical CVEs |
| D14 | `ESLint + Prettier + tsc --noEmit` pass in CI | Same checks as local |

---

## 1. Docker

### Backend — `apps/backend/Dockerfile`

Multi-stage build: builder compiles TypeScript, runner copies only `dist/` + `node_modules` (production only).

```dockerfile
# Stage 1 — build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package*.json apps/backend/
COPY packages/ packages/
RUN npm ci --workspace=apps/backend --workspace=packages/types
COPY apps/backend/ apps/backend/
RUN npm run -w apps/backend build
RUN npm run -w apps/backend prisma generate

# Stage 2 — run
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/apps/backend/prisma ./prisma
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

Key points:
- `prisma generate` runs in build stage — the generated client is included in the image
- Migrations run at deploy time via a separate ECS task (one-off task before service update)
- Image < 200 MB using Alpine; `node_modules` production-only (`npm ci --omit=dev`)

### Frontend — `apps/frontend/Dockerfile`

```dockerfile
# Stage 1 — build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/frontend/package*.json apps/frontend/
COPY packages/ packages/
RUN npm ci --workspace=apps/frontend --workspace=packages/types
COPY apps/frontend/ apps/frontend/
ARG VITE_API_URL
ARG VITE_WS_URL
RUN npm run -w apps/frontend build

# Stage 2 — serve
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Key points:
- `VITE_API_URL` and `VITE_WS_URL` injected as Docker build args at CI time (staging vs prod values differ)
- `nginx.conf` serves the SPA with `try_files $uri /index.html` for client-side routing
- The built static files are uploaded to S3 by the CI pipeline; this image is used for local compose only (CloudFront + S3 serves production)

### Docker Compose Updates

```yaml
# docker-compose.dev.yml additions
backend:
  build:
    context: .
    dockerfile: apps/backend/Dockerfile
    target: builder          # Use builder stage locally so ts-node and devDeps are available
  environment:
    DATABASE_URL: ${DATABASE_URL}
    ...
  depends_on: [postgres, redis, mailpit]
```

---

## 2. GitHub Actions CI/CD Pipeline

### File structure

```
.github/
  workflows/
    ci.yml          # Runs on every push / PR
    deploy.yml      # Runs on merge to main
  dependabot.yml
```

### `ci.yml` — PR checks

Runs on: `push` (all branches) and `pull_request` (targeting `main`).

```
jobs:
  lint-typecheck:
    - npm ci
    - npm run lint --workspaces
    - npm run typecheck --workspaces

  test-backend:
    - npm ci
    - docker compose up -d postgres redis     # test DB + cache
    - npx prisma migrate deploy
    - npm run test --workspace=apps/backend -- --coverage

  test-frontend:
    - npm ci
    - npm run test --workspace=apps/frontend -- --coverage

  sast:
    uses: github/codeql-action/init@v3
    language: [javascript-typescript]
    # CodeQL runs static analysis and posts results to Security tab

  sonarcloud:
    uses: SonarSource/sonarcloud-github-action@v2
    env:
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    # Posts quality gate result to PR

  dependency-audit:
    - npm audit --audit-level=high
```

### `deploy.yml` — Merge to `main`

Runs on: `push` to `main` (after all `ci.yml` checks pass via branch protection).

```
jobs:
  docker-push:
    - Build backend Docker image
    - Build frontend Docker image (with VITE_API_URL=staging)
    - Push both to AWS ECR (aws-actions/amazon-ecr-login)
    - Tag: git SHA + 'latest'

  frontend-deploy-staging:
    - npm run build --workspace=apps/frontend (VITE_API_URL=staging URL)
    - aws s3 sync dist/ s3://stocktracker-staging-frontend
    - aws cloudfront create-invalidation --paths "/*"

  tofu-plan-staging:
    - tofu init (remote state: S3)
    - tofu plan -var-file=envs/staging.tfvars
    - Post plan as PR comment (atlantis-style output)

  deploy-staging:
    needs: [docker-push, frontend-deploy-staging, tofu-plan-staging]
    - tofu apply -auto-approve -var-file=envs/staging.tfvars
    - aws ecs update-service --cluster stocktracker-staging --service backend
    - Run migration task (ECS run-task with prisma migrate deploy)
    - Smoke test: curl https://api.staging.stocktracker.dev/health

  e2e-staging:
    needs: deploy-staging
    - npx playwright install --with-deps chromium
    - npx playwright test --project=chromium
    # PLAYWRIGHT_BASE_URL=https://staging.stocktracker.dev

  deploy-production:
    needs: e2e-staging
    environment: production          # Requires manual approval in GitHub Actions UI
    - tofu apply -auto-approve -var-file=envs/prod.tfvars
    - aws ecs update-service --cluster stocktracker-prod --service backend
    - Run migration task
    - Smoke test production URL
```

---

## 3. OpenTofu Infrastructure

### Module structure

```
infra/
  main.tf                   # Root module: wires all modules together
  variables.tf
  outputs.tf
  envs/
    staging.tfvars
    prod.tfvars
  modules/
    vpc/                    # VPC, subnets (public + private), IGW, NAT gateway
    rds/                    # RDS PostgreSQL (Multi-AZ for prod, single-AZ for staging)
    elasticache/            # ElastiCache Redis cluster
    ecs/                    # ECS Fargate cluster + task definition + service
    ecr/                    # ECR repository for backend image
    alb/                    # Application Load Balancer, target group, HTTPS listener
    cdn/                    # CloudFront distribution + S3 bucket (frontend)
    secrets/                # AWS Secrets Manager: secrets + IAM read policy
    ollama/                 # EC2 instance + EBS volume + SG (Phase 6 LLM — deferred to post-launch)
```

### Backend configuration

OpenTofu uses the same HCL syntax as Terraform — the `tofu` CLI is a drop-in replacement.

```hcl
# infra/main.tf
terraform {
  backend "s3" {
    bucket         = "stocktracker-tfstate-123456789012"   # replace with your account ID
    key            = "stocktracker/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "stocktracker-tfstate-lock"
    encrypt        = true
  }
}
```

Initialise locally:
```bash
tofu init
tofu plan -var-file=envs/staging.tfvars
tofu apply -var-file=envs/staging.tfvars
```

### Resource overview

| Resource | Staging | Production | Notes |
|---|---|---|---|
| VPC | 1 (10.0.0.0/16) | 1 (10.1.0.0/16) | 2 public + 2 private subnets across 2 AZs |
| RDS PostgreSQL | `db.t3.micro` single-AZ | `db.t3.small` Multi-AZ | Free tier eligible for staging |
| ElastiCache Redis | `cache.t3.micro` 1 node | `cache.t3.small` 1 node | Single-node sufficient for v1 |
| ECS Fargate | 0.5 vCPU / 1 GB RAM | 1 vCPU / 2 GB RAM | Backend service |
| ALB | 1 | 1 | HTTPS termination |
| ACM Certificate | `*.staging.stocktracker.dev` | `*.stocktracker.dev` | DNS validation via Route 53 |
| CloudFront + S3 | `staging.stocktracker.dev` | `stocktracker.dev` | SPA hosting |
| ECR | 1 repo (backend) | Same repo, prod tag | |
| Secrets Manager | Per-env secrets | Per-env secrets | See secrets list below |

### Networking

```
Internet
  │
  ├── CloudFront → S3 (React SPA, static assets)
  │
  └── ALB (public subnet, port 443)
        │
        └── ECS Fargate (private subnet, port 3001)
              │
              ├── RDS PostgreSQL (private subnet, port 5432)
              ├── ElastiCache Redis (private subnet, port 6379)
              └── [Post-launch] EC2 Ollama (private subnet, port 11434)
```

Security groups:
- ALB → allows inbound 443 from `0.0.0.0/0`
- ECS → allows inbound 3001 from ALB SG only
- RDS → allows inbound 5432 from ECS SG only
- Redis → allows inbound 6379 from ECS SG only
- Ollama EC2 → allows inbound 11434 from ECS SG only (see [llm-provider-strategy.md](llm-provider-strategy.md))

### AWS Secrets Manager secrets

Each secret is read by ECS at task startup via `secrets` in the task definition:

```
stocktracker/<env>/database-url
stocktracker/<env>/jwt-access-secret
stocktracker/<env>/jwt-refresh-secret
stocktracker/<env>/google-client-id
stocktracker/<env>/google-client-secret
stocktracker/<env>/github-client-id
stocktracker/<env>/github-client-secret
stocktracker/<env>/finnhub-api-key
stocktracker/<env>/groq-api-key
stocktracker/<env>/smtp-host
stocktracker/<env>/smtp-user
stocktracker/<env>/smtp-pass
stocktracker/<env>/admin-email
stocktracker/<env>/admin-initial-password
```

**No secrets in `.env` files in CI.** All secrets injected at runtime via Secrets Manager. The `.env` files in the repo are for local dev only and are gitignored.

### Cost estimate (staging — idle)

| Resource | $/mo (approx) |
|---|---|
| RDS `db.t3.micro` (free tier year 1) | $0 → $15 |
| ElastiCache `cache.t3.micro` | ~$12 |
| ECS Fargate (0.5 vCPU / 1 GB) | ~$12 |
| ALB | ~$17 |
| NAT Gateway | ~$35 |
| CloudFront + S3 | ~$1 |
| Secrets Manager (14 secrets) | ~$6 |
| **Total staging** | **~$83/mo** |

> NAT Gateway dominates staging cost. To minimize: use a single NAT Gateway (not HA), or replace with a NAT instance (`t3.nano`, ~$4/mo) for staging only.

**Production adds:** Multi-AZ RDS (~+$15), larger Fargate task (~+$8). Total prod: ~$100–110/mo before Ollama.

---

## 4. E2E Tests (Playwright)

### Setup

```
apps/e2e/
  playwright.config.ts
  tests/
    auth.spec.ts          # register → login → logout
    watchlist.spec.ts     # add stock → see price → remove
    alerts.spec.ts        # create alert → verify in list → delete
    chat.spec.ts          # premium user → open chat → send message → see streaming response
    admin.spec.ts         # admin approves premium request → user sees premium features
  fixtures/
    auth.ts               # login fixture (reuse across tests)
```

### Critical paths covered

| Test | Path |
|---|---|
| `auth.spec.ts` | Register with email → verify redirect → login → see dashboard → logout |
| `watchlist.spec.ts` | Login → search "AAPL" → add to watchlist → see price update within 5s → remove |
| `alerts.spec.ts` | Login → set alert AAPL above $300 → verify in alert list → delete |
| `chat.spec.ts` | Premium user → sidebar AI Chat → select AAPL → type message → tokens stream in → history shows |
| `admin.spec.ts` | Admin login → approve pending premium request → login as that user → see AI Chat enabled |

### Running locally

```bash
# Against local docker-compose stack
npx playwright test --project=chromium

# Against staging
PLAYWRIGHT_BASE_URL=https://staging.stocktracker.dev npx playwright test
```

---

## 5. GitHub Actions Secrets Required

Configure all of the following in **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user access key (CI deploy role) |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_ACCOUNT_ID` | 12-digit account ID (for ECR URL construction) |
| `SONAR_TOKEN` | From SonarCloud project settings |
| `STAGING_CLOUDFRONT_DISTRIBUTION_ID` | For cache invalidation after S3 sync |
| `PROD_CLOUDFRONT_DISTRIBUTION_ID` | Same, production |
| `TF_BACKEND_BUCKET` | S3 bucket name for OpenTofu state |
| `TF_BACKEND_LOCK_TABLE` | DynamoDB table name for state lock |

> Secrets like `GROQ_API_KEY`, `DATABASE_URL`, etc. are **not** GitHub secrets — they live in AWS Secrets Manager and are injected by ECS at runtime. CI never needs them.

---

## 6. Security Hardening

### Rate limiting (NFR-SEC-06)

NestJS `@nestjs/throttler` applied to auth endpoints:

| Endpoint | Limit |
|---|---|
| `POST /auth/login` | 10 req / 15 min per IP |
| `POST /auth/register` | 5 req / hour per IP |
| `POST /auth/forgot-password` | 3 req / hour per IP |

### HTTPS / TLS (NFR-SEC-01)

- ACM certificate issued for `*.stocktracker.dev` — DNS validation via Route 53
- ALB listener: port 443 (HTTPS), redirect 80 → 443
- CloudFront: HTTPS only, minimum TLS 1.2

### CSRF protection (NFR-SEC-05)

- JWT-based auth with short-lived tokens makes traditional CSRF attacks impractical (no cookies used for auth)
- Verify `Content-Type: application/json` enforced on all mutation endpoints
- Add `helmet()` NestJS middleware: sets `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`

### Headers

```typescript
// main.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "wss://api.stocktracker.dev", "https://api.groq.com"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],   // Tailwind inline styles
    },
  },
}))
```

### Dependency scanning

`.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
```

---

## 7. WCAG 2.1 AA Audit

### Automated pass

Use `@axe-core/playwright` in E2E tests:

```typescript
// In each Playwright test
import AxeBuilder from '@axe-core/playwright'

const results = await new AxeBuilder({ page }).analyze()
expect(results.violations).toEqual([])
```

### Manual audit checklist

| Area | Check |
|---|---|
| Keyboard nav | Tab through all interactive elements; visible focus ring on every control |
| Colour contrast | All text ≥ 4.5:1; large text ≥ 3:1 (use browser DevTools contrast checker) |
| Price change indicators | Red/green never the **only** indicator — text label ("+1.24%" or "▲ 1.24%") must accompany colour |
| D3 charts | `role="img"` with `aria-label` describing chart; keyboard-accessible data table toggle |
| Modals / dialogs | Focus trapped inside; `aria-modal="true"`; Esc closes; focus returns to trigger on close |
| Notifications | `role="status"` or `aria-live="polite"` so screen readers announce new notifications |
| Forms | All inputs have associated `<label>` or `aria-label`; error messages linked via `aria-describedby` |

### Known items to fix before audit

| Item | Where | Fix |
|---|---|---|
| TD-001 price staleness | `WatchlistRow` | Add "prev close" text label (not colour-only) |
| Alert flash (red/green) | `WatchlistRow` | Add screen-reader-only `<span>` announcing direction |
| ChatPanel focus trap | `ChatPanel.tsx` | Implement focus trap on open; return focus to trigger on close |

---

## 8. OllamaLLMAdapter (Phase 6 LLM Swap)

Per [llm-provider-strategy.md](llm-provider-strategy.md), once the app is live and traffic is confirmed, swap Groq for a self-hosted Ollama instance.

### Implementation milestones

**O1 — OllamaLLMAdapter**
- [ ] Create `apps/backend/src/chat/llm/ollama-llm.adapter.ts`
- [ ] Identical wire format to `GroqLLMAdapter` — OpenAI-compatible endpoint
- [ ] No `Authorization` header (Ollama runs internally, no key needed)
- [ ] Reads: `OLLAMA_BASE_URL` (e.g. `http://10.0.1.45:11434`), `OLLAMA_MODEL` (default `llama3.2:3b`)
- [ ] Wire into factory: `LLM_PROVIDER=ollama` → `OllamaLLMAdapter`
- [ ] Unit tests: endpoint called correctly, no Authorization header sent, streaming tokens yielded

**O2 — OpenTofu `infra/modules/ollama/`**
- [ ] EC2 `t3.large` spot instance in private subnet (same VPC as ECS)
- [ ] `user_data` script: install Ollama, pull `llama3.2:3b`, `systemctl enable ollama`
- [ ] EBS volume: 20 GB gp3, mounted at `/var/ollama`, persists across reboots
- [ ] Security group: inbound TCP 11434 from ECS task SG only
- [ ] IAM instance profile: no extra permissions (Ollama makes no AWS API calls)
- [ ] Output: `ollama_private_ip` — injected into ECS task as `OLLAMA_BASE_URL`

**O3 — Switch**
- [ ] Add `OLLAMA_BASE_URL` and `OLLAMA_MODEL` to Secrets Manager
- [ ] Update ECS task definition: `LLM_PROVIDER=ollama`
- [ ] Verify: streaming chat works end-to-end through VPC private network
- [ ] Remove Groq credentials from Secrets Manager (or keep as fallback)

See [llm-provider-strategy.md](llm-provider-strategy.md) for instance sizing, cost comparison, and architecture diagram.

---

## 9. Tech Debt to Resolve Before Production

| Item | Doc | Action |
|---|---|---|
| TD-001 — Seeded price staleness | [tech-debt.md](tech-debt.md) | Add `priceSource` field to Redis hash; "prev close" badge in `WatchlistRow` |
| TD-002 — Yahoo Finance unofficial API | [tech-debt.md](tech-debt.md) | Replace `CandlesService` with a paid/documented candle API (Finnhub paid or Polygon.io) |
| `isFirstLogin` flag | [admin-bootstrap.md](admin-bootstrap.md) | Force seed-generated admin to change password on first login |
| Model quality evaluation | [llm-provider-strategy.md](llm-provider-strategy.md) | A/B test `llama3.2:3b` vs `llama3.1:8b` before committing to production Ollama model |
| Alert re-enable | REQUIREMENTS.md FR-ALERT-04 | Add `PATCH /alerts/:id/enable` endpoint + toggle in UI |
| Email unsubscribe | phase4.md out-of-scope | Add one-click unsubscribe token to alert emails |

---

## 10. Monitoring & Observability

### CloudWatch

| Metric | Alarm threshold |
|---|---|
| ECS CPU utilisation | > 80% for 5 min → scale out |
| ECS memory utilisation | > 85% → alert |
| ALB `5xx` error rate | > 1% for 2 min → page |
| RDS CPU | > 70% for 10 min → alert |
| RDS free storage | < 2 GB → alert |

### Structured logging (Pino)

```typescript
// Replace NestJS default logger with Pino
import { Logger } from 'nestjs-pino'
// log lines: { level, time, msg, userId, symbol, latencyMs }
// CloudWatch Logs Insights can query by any field
```

### Health check endpoint

```typescript
// GET /health — used by ALB target group health checks
{
  "status": "ok",
  "db": "connected",
  "redis": "connected",
  "uptime": 12345
}
```

---

## 11. Out of Scope for Phase 6

- Auto-scaling Ollama (single instance sufficient at launch)
- Multi-region deployment (single-region v1)
- Stripe / payment integration (admin-toggle premium remains in v1)
- Blue/green ECS deployment (rolling update sufficient for v1)
- Database read replicas (single writer sufficient at launch)
- CDK or Pulumi (OpenTofu as decided in REQUIREMENTS.md)
- Mobile PWA manifest / service worker (deferred)
