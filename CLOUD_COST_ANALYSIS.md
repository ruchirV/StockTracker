# Cloud Cost Analysis — StockTracker

**Date:** 2026-04-01  
**Purpose:** Compare AWS vs Azure vs alternatives for hosting StockTracker, with a focus on free tiers and actual monthly costs.

---

## The Binding Constraint: WebSocket Always-On

Before any cost table: **the backend cannot sleep.**

StockTracker's core feature is a live price feed delivered over WebSocket. Any hosting service that idles or spins down the backend process on inactivity will silently kill open WebSocket connections and halt all price updates. This disqualifies:

- Render **free tier** (sleeps after 15 min idle)
- Azure App Service **F1 (free tier)** (no "Always On" option)
- Fly.io **free tier machines** (pause on idle — sub-second restart for HTTP but drops WebSocket sessions)
- Railway **free tier** (execution limits, not suitable for persistent processes)

The backend must be **always-on**. This is the primary filter for every option below.

---

## Services Required

| Component          | Purpose                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| Frontend hosting   | Serve the React SPA                                                        |
| Backend compute    | NestJS API + WebSocket gateway (always-on)                                 |
| PostgreSQL         | Users, watchlists, alerts, notifications                                   |
| Redis              | Caching (Finnhub rate limit buffer) + BullMQ job queue + WebSocket Pub/Sub |
| Container registry | Store Docker images for CI/CD                                              |
| Load balancer      | HTTPS termination, route traffic to backend                                |
| Secrets management | API keys, DB credentials                                                   |
| CI/CD              | GitHub Actions (not cloud-specific)                                        |
| Monitoring/logging | Errors, metrics                                                            |

---

## Option 1: AWS

### Free Tier Breakdown (12 months unless noted)

| Service                     | Free Tier                                         | What It Covers                 | Limitation                                              |
| --------------------------- | ------------------------------------------------- | ------------------------------ | ------------------------------------------------------- |
| **EC2 t2.micro**            | 750 hrs/month, 12 months                          | Backend compute (NestJS)       | 1 vCPU, 1 GB RAM — barely enough                        |
| **RDS PostgreSQL t2.micro** | 750 hrs/month, 12 months                          | Database                       | 20 GB SSD, single-AZ only                               |
| **S3**                      | 5 GB storage, 20K GET, 2K PUT, 12 months          | Frontend static assets         | After 12 months: ~$0.023/GB                             |
| **CloudFront**              | 1 TB transfer out, 10M requests — **always free** | CDN for SPA                    | Generous; unlikely to exceed                            |
| **ECR**                     | 500 MB storage, 12 months                         | Docker image registry          | Fine for 1-2 images                                     |
| **CloudWatch**              | Basic metrics, 10 custom metrics — always free    | Logging + monitoring           | Limited log retention (free: none — must set to expire) |
| **Lambda**                  | 1M requests/month — always free                   | Could handle background jobs   | Cold start latency                                      |
| **Secrets Manager**         | 30-day trial only                                 | API keys                       | $0.40/secret/month after trial                          |
| **ElastiCache**             | ❌ No free tier                                   | Redis                          | Cheapest: cache.t3.micro ~$12-15/month                  |
| **ALB (Load Balancer)**     | ❌ No free tier                                   | HTTPS + routing                | ~$16-22/month (fixed + LCU)                             |
| **ECS Fargate**             | ❌ No free tier                                   | Container orchestration        | Pay per vCPU-second + GB-second                         |
| **NAT Gateway**             | ❌ No free tier                                   | Private subnet internet access | **$32/month** — biggest hidden cost                     |

### AWS Cost Scenarios

#### Scenario A: Maximum Free Tier (12 months, no ElastiCache/ALB)

Use EC2 t2.micro directly, skip ALB and NAT Gateway by putting everything in a public subnet (acceptable for portfolio).

| Service                     | Monthly Cost                                    |
| --------------------------- | ----------------------------------------------- |
| EC2 t2.micro (backend)      | **$0** (free tier)                              |
| RDS PostgreSQL t2.micro     | **$0** (free tier)                              |
| Redis on same EC2 instance  | **$0** (self-hosted, no ElastiCache)            |
| S3 (frontend assets)        | **$0** (free tier)                              |
| CloudFront                  | **$0** (always free)                            |
| ECR                         | **$0** (free tier)                              |
| Elastic IP (if EC2 stopped) | **$0** (free when attached to running instance) |
| **Total (months 1–12)**     | **~$0/month**                                   |

**Caveats:**

- Redis runs on the same EC2 t2.micro as NestJS — memory pressure is real (1 GB total)
- No ALB means HTTPS via Let's Encrypt on EC2 directly (nginx reverse proxy)
- Single point of failure — fine for portfolio, not production
- After 12 months: EC2 ~$8/month, RDS ~$15/month → ~$23+/month

#### Scenario B: After Free Tier Expires (or using ECS Fargate from day 1)

This is the production architecture described in REQUIREMENTS.md.

| Service                                        | Monthly Cost    | Notes                                      |
| ---------------------------------------------- | --------------- | ------------------------------------------ |
| ECS Fargate (2 tasks, 0.25 vCPU / 0.5 GB each) | ~$15/month      | Pay per vCPU-second                        |
| RDS PostgreSQL t3.micro (single-AZ)            | ~$15/month      | After free tier                            |
| ElastiCache Redis cache.t3.micro               | ~$13/month      | No free tier                               |
| ALB                                            | ~$18/month      | Fixed $0.008/hr + LCU charges              |
| NAT Gateway                                    | **~$32/month**  | Hidden cost — required for private subnets |
| S3 + CloudFront                                | ~$2/month       | Negligible                                 |
| ECR                                            | ~$1/month       |                                            |
| Secrets Manager (3 secrets)                    | ~$1.20/month    |                                            |
| CloudWatch (logs)                              | ~$5/month       | Depending on log volume                    |
| **Total**                                      | **~$100/month** |                                            |

> **NAT Gateway warning:** The $32/month NAT Gateway charge is the single biggest surprise in AWS architectures. It's required whenever your ECS tasks or RDS instances sit in private subnets and need outbound internet access (e.g., to call Finnhub). Almost every tutorial omits this. Avoid it in the free/portfolio setup by using a simpler network topology.

---

## Option 2: Azure

### Free Tier Breakdown

| Service                                                | Free Tier                                            | What It Covers                                   | Limitation                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| **Azure Static Web Apps**                              | Free tier — **always free** (100 GB bandwidth/month) | Frontend SPA hosting                             | Excellent — no expiry                                                       |
| **App Service F1**                                     | Free — **always free**                               | Backend compute                                  | ❌ No "Always On" — sleeps on idle. **Disqualified for WebSocket backend.** |
| **App Service B1**                                     | Free for 12 months (1 core, 1.75 GB)                 | Backend compute — first paid tier with Always On | Only 12 months free                                                         |
| **Azure Database for PostgreSQL Flexible Server B1ms** | Free for 12 months (1 vCore, 32 GB)                  | Database                                         | Only 12 months                                                              |
| **Azure Cache for Redis C0**                           | ❌ No free tier                                      | Redis                                            | Cheapest: ~$16/month (250 MB)                                               |
| **Azure Container Registry Basic**                     | ❌ No free tier                                      | Docker registry                                  | ~$5/month                                                                   |
| **Azure Key Vault**                                    | 10,000 operations/month — always free                | Secrets                                          | Sufficient                                                                  |
| **Azure Monitor / Log Analytics**                      | 5 GB ingestion/month — always free                   | Monitoring                                       | Sufficient                                                                  |
| **Azure Load Balancer Basic**                          | Free                                                 | Basic L4 load balancing                          | No WAF; Standard tier needed for availability zones (~$18/month)            |

### Azure Cost Scenarios

#### Scenario A: Maximum Free Tier (12 months)

| Service                               | Monthly Cost           |
| ------------------------------------- | ---------------------- |
| Azure Static Web Apps (frontend)      | **$0** (always free)   |
| App Service B1 (backend, Always On)   | **$0** (12-month free) |
| Azure Database for PostgreSQL B1ms    | **$0** (12-month free) |
| Redis — self-hosted on App Service?   | Not possible on PaaS   |
| Redis — Upstash (external, see below) | **$0** (free tier)     |
| Azure Key Vault                       | **$0**                 |
| Azure Load Balancer Basic             | **$0**                 |
| **Total (months 1–12)**               | **~$0/month**          |

**Caveats:**

- App Service B1 free trial: **only one B1 instance per subscription** is free
- No managed Redis — must use external service (Upstash)
- After 12 months: App Service B1 ~$13/month, PostgreSQL ~$14/month → ~$27+/month (without Redis)

#### Scenario B: Full Production

| Service                            | Monthly Cost    |
| ---------------------------------- | --------------- |
| App Service B2 (2 cores, 3.5 GB)   | ~$75/month      |
| Azure Database for PostgreSQL B2ms | ~$29/month      |
| Azure Cache for Redis C1 (1 GB)    | ~$55/month      |
| Azure Static Web Apps Standard     | ~$9/month       |
| Azure Container Registry Basic     | ~$5/month       |
| Azure Load Balancer Standard       | ~$18/month      |
| Key Vault                          | ~$1/month       |
| **Total**                          | **~$192/month** |

> Azure is significantly more expensive than AWS for this workload at production scale. Azure's free tiers are competitive for 12 months, but the production cost is higher.

---

## Option 3: GCP (Google Cloud Platform)

| Service              | Free Tier                                             | Cost After                |
| -------------------- | ----------------------------------------------------- | ------------------------- |
| Cloud Run            | 2M requests/month + 180K vCPU-sec/month — always free | Pay per request + compute |
| Firebase Hosting     | 10 GB storage, 360 MB/day — always free               | Cheap                     |
| Cloud SQL PostgreSQL | ❌ No free tier (only $300 credit for 90 days)        | ~$7/month (micro)         |
| Memorystore Redis    | ❌ No free tier                                       | ~$25/month (1 GB basic)   |
| Artifact Registry    | 0.5 GB free                                           | ~$0.10/GB                 |

**GCP WebSocket note:** Cloud Run **does support WebSockets** but instances scale to zero when idle. With minimum instances set to 1 (always-on), cost is ~$5-10/month for a small instance. However, no free Redis or PostgreSQL means minimum viable cost is ~$35/month.

**Verdict on GCP:** Not compelling for this project unless you have $300 credit to burn for 90 days.

---

## Option 4: Modern PaaS Mix (Best Value for Portfolio)

This approach uses best-in-class free/cheap services rather than committing to one cloud provider's ecosystem. It's practical for a portfolio project and can be documented as "demo environment" alongside the production AWS architecture.

| Component              | Service                           | Free Tier                                     | Always-On?    | Monthly Cost   |
| ---------------------- | --------------------------------- | --------------------------------------------- | ------------- | -------------- |
| **Frontend**           | Vercel                            | 100 GB bandwidth, unlimited deploys           | Yes (static)  | **$0**         |
| **Backend**            | Railway Hobby                     | $5 credit included                            | Yes           | **$0–5/month** |
| **PostgreSQL**         | Neon                              | 0.5 GB, 1 project, compute auto-suspends      | Restarts fast | **$0**         |
| **Redis**              | Upstash                           | 10,000 commands/day, 256 MB                   | Serverless    | **$0**         |
| **Container Registry** | GitHub Container Registry (GHCR)  | Unlimited for public repos                    | —             | **$0**         |
| **CI/CD**              | GitHub Actions                    | 2,000 min/month (private), unlimited (public) | —             | **$0**         |
| **Secrets**            | Railway env vars / GitHub Secrets | Included                                      | —             | **$0**         |
| **Monitoring**         | Better Stack (Logtail) free tier  | 1 GB/month                                    | —             | **$0**         |
| **Total**              |                                   |                                               |               | **$0–5/month** |

### Important caveats on this stack:

- **Neon PostgreSQL** auto-suspends compute after 5 min idle (data is persisted, compute restarts in ~1 second). Fine for a portfolio.
- **Upstash Redis** 10K commands/day is tight if BullMQ alert evaluation runs frequently. At 100 watched stocks × 1 eval/min = 144K evals/day. **Upgrade to Upstash Pay-as-you-go ($0.20/100K commands) for ~$0.30/day** or batch eval jobs.
- **Railway** gives $5 free credit/month. A small NestJS service uses ~$3-4/month. Effectively free with the credit.
- **WebSocket on Railway:** Always-on ✅ — Railway does not sleep paid/hobby services.

---

## Comparison Summary

|                     | **AWS (free 12mo)** | **AWS (production)** | **Azure (free 12mo)** | **Azure (production)** | **PaaS Mix** |
| ------------------- | ------------------- | -------------------- | --------------------- | ---------------------- | ------------ |
| Monthly cost        | ~$0                 | ~$100                | ~$0                   | ~$192                  | ~$0–5        |
| After 12 months     | ~$23+               | ~$100                | ~$27+                 | ~$192                  | ~$0–5        |
| WebSocket always-on | ✅ (EC2)            | ✅                   | ✅ (B1+)              | ✅                     | ✅ (Railway) |
| Free Redis          | Self-hosted         | ElastiCache          | No                    | No                     | Upstash ✅   |
| Free PostgreSQL     | ✅ 12mo             | RDS ~$15             | ✅ 12mo               | ~$29                   | Neon ✅      |
| IaC / Terraform     | ✅ Full support     | ✅                   | ✅                    | ✅                     | Limited      |
| Production realism  | Medium              | High                 | Medium                | High                   | Low          |
| Portfolio signal    | Good                | Excellent            | Good                  | Good                   | Moderate     |
| Complexity          | Medium              | High                 | Medium                | Medium                 | Low          |

---

## Recommendation

### Recommended approach: AWS free tier + external Redis/DB, with documented production architecture

**Rationale:**

1. AWS has the strongest free tier for always-on compute (EC2 t2.micro, 12 months).
2. Avoid ElastiCache and NAT Gateway costs by using Upstash Redis (free) and EC2 in a public subnet.
3. The production architecture in `REQUIREMENTS.md` (ECS Fargate + RDS + ElastiCache) remains the documented _target_ — it's what you describe in the portfolio README and architecture diagrams. You build toward it; you don't have to run it at full cost while developing.
4. AWS Terraform skills are more widely recognized than Azure in job interviews.

### Proposed two-environment strategy

```
Development / Demo Environment (what you actually run)
  ├── Frontend:    Vercel (free) or S3 + CloudFront (free tier)
  ├── Backend:     EC2 t2.micro (free 12 months) or Railway ($0–5/month)
  ├── PostgreSQL:  RDS t2.micro (free 12 months) or Neon (always free)
  ├── Redis:       Self-hosted on EC2 OR Upstash (free)
  ├── CI/CD:       GitHub Actions (free for public repo)
  └── Cost:        $0/month (12 months), $5–10/month after

Target Production Architecture (documented, Terraform-ready, not running 24/7)
  ├── Frontend:    S3 + CloudFront
  ├── Backend:     ECS Fargate (2 replicas)
  ├── PostgreSQL:  RDS t3.micro (Multi-AZ for prod)
  ├── Redis:       ElastiCache t3.micro
  ├── LB:          ALB
  └── Cost:        ~$100/month (only spin up for demos/reviews)
```

This gives you:

- A **live demo URL** for your portfolio (cheap/free setup)
- A **production-grade architecture** to discuss in interviews (Terraform IaC, ECS, proper networking)
- The IaC is written and ready — you can spin up the production environment for ~$10 for a few hours during an interview demo, then destroy it

### Services to use (updated REQUIREMENTS.md architecture)

| Component | Dev/Demo                    | Production              |
| --------- | --------------------------- | ----------------------- |
| Frontend  | Vercel or S3+CloudFront     | S3 + CloudFront         |
| Backend   | EC2 t2.micro                | ECS Fargate             |
| Database  | RDS t2.micro (free) or Neon | RDS PostgreSQL Multi-AZ |
| Redis     | Upstash free or self-hosted | ElastiCache             |
| CI/CD     | GitHub Actions (free)       | GitHub Actions          |
| IaC       | Terraform (both envs)       | Terraform               |

---

## GitHub Actions CI/CD — Free Tier Details

This is not provider-dependent and is a clear win:

| Repo type          | Free minutes/month | Parallel jobs |
| ------------------ | ------------------ | ------------- |
| Public repository  | **Unlimited**      | Up to 20      |
| Private repository | 2,000 min/month    | Up to 20      |

**Recommendation: Make the repository public.** This is a portfolio project — public visibility is a feature, not a risk. All secrets stay in GitHub Secrets (never in code). CI/CD becomes completely free with zero minute limits.

---

## Summary of Hidden Costs to Avoid

| Cost trap                         | Monthly | How to avoid                                                     |
| --------------------------------- | ------- | ---------------------------------------------------------------- |
| AWS NAT Gateway                   | $32     | Use public subnets in dev; only add NAT in prod Terraform        |
| AWS ALB                           | $18     | Use nginx on EC2 directly in dev                                 |
| ElastiCache                       | $13     | Upstash (free) or self-hosted Redis on EC2 in dev                |
| Azure Redis C0                    | $16     | Upstash instead                                                  |
| Azure App Service B1 (after 12mo) | $13     | Switch to EC2 or Railway                                         |
| Secrets Manager                   | $1.20   | Use GitHub Secrets + env vars in dev; only add in prod Terraform |
