# StockTracker — Product Requirements Document

**Version:** 1.0  
**Date:** 2026-04-01  
**Status:** Draft

---

## 1. Project Overview

StockTracker is a full-stack, real-time stock dashboard that allows users to monitor live stock prices, visualize historical price data, set price alerts, and — for premium users — discuss their portfolio with an AI assistant grounded in financial context.

The project is designed as a professional portfolio showcase, demonstrating real-time architecture, modern React patterns, type-safe full-stack development, cloud deployment, and engineering best practices (accessibility, testing, security, CI/CD).

**Starting point:** The frontend scaffold (Vite + React + TypeScript) already exists in this repository.

---

## 2. Tech Stack

### Frontend

| Concern                 | Choice                          | Rationale                             |
| ----------------------- | ------------------------------- | ------------------------------------- |
| Framework               | React 18 (TypeScript)           | Portfolio requirement                 |
| Visualizations          | D3.js                           | Portfolio requirement                 |
| Data fetching / caching | React Query (TanStack Query v5) | Async state, background refetch       |
| UI state                | Zustand                         | Lightweight, idiomatic                |
| Real-time client        | Native WebSocket                | Direct control, no socket.io overhead |
| Styling                 | Tailwind CSS                    | Utility-first, accessible defaults    |
| Forms                   | React Hook Form + Zod           | Type-safe validation                  |
| Linting                 | ESLint (typescript-eslint)      | Catch type and style errors           |
| Formatting              | Prettier                        | Enforced consistent style             |
| Testing                 | Vitest + React Testing Library  | Matches Vite ecosystem                |
| E2E Testing             | Playwright                      | Cross-browser, async-friendly         |
| Accessibility           | WCAG 2.1 AA                     | Enforced via eslint-plugin-jsx-a11y   |

### Backend

| Concern            | Choice                                             | Rationale                                                                              |
| ------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Runtime            | Node.js (TypeScript)                               | Unified language across stack                                                          |
| Framework          | NestJS                                             | DI, guards, decorators, WebSocket gateway — better portfolio signal than plain Express |
| ORM                | Prisma                                             | Type-safe DB access, migrations                                                        |
| Database           | PostgreSQL                                         | Relational data (users, watchlists, alerts, subscriptions)                             |
| Auth               | JWT (access + refresh tokens) + Passport.js        | Stateless, refresh rotation                                                            |
| Social Auth        | OAuth 2.0 via Passport (Google, GitHub)            | Portfolio requirement                                                                  |
| Real-time          | NestJS WebSocket Gateway (ws)                      | Server → client price pushes                                                           |
| Email              | Nodemailer + SendGrid SMTP                         | Free tier sufficient                                                                   |
| Job queue          | BullMQ + Redis                                     | Price alert evaluation, email dispatch                                                 |
| LLM abstraction    | Custom provider-agnostic adapter                   | Swap OpenAI / Anthropic / etc.                                                         |
| SAST               | SonarCloud (free for public repos) + GitHub CodeQL | Code security analysis                                                                 |
| Secrets management | AWS Secrets Manager / Azure Key Vault              | Environment-specific                                                                   |

### Stock Data API

**Primary:** [Finnhub](https://finnhub.io)

- Free tier: 60 REST calls/min, WebSocket real-time quotes (US stocks)
- Used for: live price feed (WebSocket), company fundamentals, news
- Rate-limit handling required in backend — clients must not call Finnhub directly

**Secondary (historical candles):** Finnhub REST `/stock/candle`

- Used for: 1D / 1W / 1M OHLCV chart data

> **Constraint:** Free API tiers impose rate limits. The backend must cache aggressively (Redis) and gracefully degrade (stale data with a staleness indicator) when limits are hit.

### Infrastructure

| Concern                | Choice                                         |
| ---------------------- | ---------------------------------------------- |
| Cloud                  | AWS (primary) or Azure                         |
| Containers             | Docker                                         |
| Orchestration          | AWS ECS Fargate (or AKS on Azure)              |
| CI/CD                  | GitHub Actions                                 |
| IaC                    | Terraform                                      |
| CDN / Frontend hosting | AWS CloudFront + S3 (or Azure Static Web Apps) |
| Database hosting       | AWS RDS PostgreSQL                             |
| Cache                  | AWS ElastiCache (Redis)                        |
| Monitoring             | AWS CloudWatch + structured logging (Pino)     |

---

## 3. User Roles

| Role             | Access                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------- |
| **Guest**        | View public landing page only                                                               |
| **Free user**    | Watchlist (unlimited stocks), live prices, historical charts, price alerts (email + in-app) |
| **Premium user** | All free features + AI portfolio chatbot                                                    |
| **Admin**        | Toggle premium status for any user                                                          |

---

## 4. Functional Requirements

### 4.1 Authentication & User Accounts

**FR-AUTH-01** — Users can register with email and password.  
**FR-AUTH-02** — Users can log in with email and password.  
**FR-AUTH-03** — Users can authenticate via Google OAuth 2.0.  
**FR-AUTH-04** — Users can authenticate via GitHub OAuth 2.0.  
**FR-AUTH-05** — Passwords are hashed with bcrypt (min cost factor 12). Plaintext passwords are never stored or logged.  
**FR-AUTH-06** — Sessions use short-lived JWT access tokens (15 min) and long-lived refresh tokens (7 days) with rotation on use.  
**FR-AUTH-07** — Users can log out, which invalidates the current refresh token.  
**FR-AUTH-08** — Users can request a password reset via email link (time-limited, single-use token).  
**FR-AUTH-09** — An admin user can promote or demote any account to/from premium via an admin interface.  
**FR-AUTH-10** — All authenticated routes require a valid access token. Expired tokens redirect to login.

---

### 4.2 Stock Watchlist

**FR-WATCH-01** — Authenticated users can search for stocks by ticker symbol or company name.  
**FR-WATCH-02** — Users can add a stock to their personal watchlist (no limit on count).  
**FR-WATCH-03** — Users can remove a stock from their watchlist.  
**FR-WATCH-04** — The watchlist persists across sessions (stored server-side).  
**FR-WATCH-05** — The dashboard displays all watchlist stocks in a virtualised list (handles large lists without DOM bloat).  
**FR-WATCH-06** — Each watchlist row shows: ticker, company name, current price, price change (absolute + %), day high/low.

---

### 4.3 Real-time Price Feed

**FR-RT-01** — The server maintains a WebSocket connection to Finnhub and subscribes to symbols in users' watchlists.  
**FR-RT-02** — The server pushes live price updates to authenticated clients over WebSocket.  
**FR-RT-03** — The client updates the relevant watchlist row in real time without a full page refresh.  
**FR-RT-04** — Price changes are visually indicated (green flash for increase, red flash for decrease).  
**FR-RT-05** — If the WebSocket connection drops (client or server side), the client attempts reconnection with exponential backoff and shows a connection status indicator.  
**FR-RT-06** — Finnhub rate limits are handled server-side; clients receive stale data with a staleness label if the upstream feed is throttled.

---

### 4.4 Historical Price Charts

**FR-CHART-01** — Each stock in the watchlist has a detail view with a D3 price chart.  
**FR-CHART-02** — The chart supports three time ranges: 1 Day (1-min candles), 1 Week (1-hour candles), 1 Month (daily candles).  
**FR-CHART-03** — The chart displays OHLCV data as a candlestick chart overlaid with a line chart for closing price.  
**FR-CHART-04** — The chart includes axes with readable date/time labels, a crosshair tooltip showing OHLCV values at the cursor position, and a volume bar chart below.  
**FR-CHART-05** — Historical data is fetched on demand, cached in React Query, and refreshed at appropriate intervals (1D view: every 1 min; 1W/1M: every 15 min).  
**FR-CHART-06** — Charts are fully keyboard navigable and have ARIA labels for screen readers.

---

### 4.5 Price Alerts

**FR-ALERT-01** — Users can set an upper price threshold and/or a lower price threshold for any stock on their watchlist.  
**FR-ALERT-02** — Multiple independent alerts can exist for the same stock (e.g. upper $200, lower $150).  
**FR-ALERT-03** — When a live price crosses a configured threshold, the system:

- Sends an email notification to the user's registered address.
- Pushes an in-app notification (toast + notification bell count) to the user if they are online.

**FR-ALERT-04** — An alert fires at most once per crossing event. It is deactivated after firing and must be manually re-enabled.  
**FR-ALERT-05** — Users can view, edit, enable, disable, and delete their alerts from a dedicated Alerts panel.  
**FR-ALERT-06** — Alert evaluation runs in a background job queue (BullMQ) decoupled from the WebSocket feed.  
**FR-ALERT-07** — Email notifications include: stock ticker, company name, threshold value, current price, direction crossed, timestamp.

---

### 4.6 In-App Notifications

**FR-NOTIF-01** — A notification bell in the header shows an unread count badge.  
**FR-NOTIF-02** — Clicking the bell opens a notification panel listing all recent alert notifications.  
**FR-NOTIF-03** — Each notification entry shows: message, timestamp, and read/unread state.  
**FR-NOTIF-04** — Users can mark individual notifications as read or mark all as read.  
**FR-NOTIF-05** — Notifications are persisted server-side and survive page refresh.

---

### 4.7 AI Portfolio Chatbot (Premium Only)

**FR-CHAT-01** — The chatbot feature is visible only to users with premium status; non-premium users see an upgrade prompt.  
**FR-CHAT-02** — The chatbot is accessible from a slide-in panel available on any page.  
**FR-CHAT-03** — Each conversation is scoped: the user selects a company from their watchlist before starting. The chatbot is focused on financial topics (company fundamentals, portfolio performance, market context).  
**FR-CHAT-04** — At the start of each conversation, the backend assembles a context payload and injects it into the system prompt. This context includes:

- User's current watchlist (tickers, current prices, day change)
- Selected company name, ticker, latest price, fundamentals (if available from Finnhub)
- User's active alerts for the selected stock

**FR-CHAT-05** — The chatbot must politely decline and redirect if the user asks about topics outside financial/company scope.  
**FR-CHAT-06** — The LLM provider is abstracted behind an adapter interface. Switching providers (e.g. OpenAI → Anthropic) requires only a new adapter and an environment variable change, not code changes to the chatbot feature.  
**FR-CHAT-07** — Conversation history is stored per session (not persisted across page reloads, to avoid storing potentially sensitive LLM outputs long-term).  
**FR-CHAT-08** — Streaming responses are supported (tokens stream to the UI as they arrive).

---

## 5. Non-Functional Requirements

### 5.1 Performance

- **NFR-PERF-01** — Watchlist with 200+ stocks must render without jank; virtualised list (TanStack Virtual) required.
- **NFR-PERF-02** — Initial page load (LCP) target: under 2.5 seconds on a standard broadband connection.
- **NFR-PERF-03** — Live price updates must be applied to the UI within 500 ms of the server receiving the Finnhub event.
- **NFR-PERF-04** — Historical chart data must load within 1 second (cached) or 3 seconds (cold).

### 5.2 Security

- **NFR-SEC-01** — All HTTP traffic served over HTTPS/TLS. No mixed content.
- **NFR-SEC-02** — API keys and secrets stored in cloud secret manager, never in code or environment files committed to git.
- **NFR-SEC-03** — All user inputs validated and sanitised on the server (Zod schemas).
- **NFR-SEC-04** — SQL injection prevented by ORM parameterised queries (Prisma).
- **NFR-SEC-05** — CSRF protection on all state-changing endpoints.
- **NFR-SEC-06** — Rate limiting on auth endpoints (login, register, password reset) to prevent brute force.
- **NFR-SEC-07** — SAST scans (CodeQL + SonarCloud) run on every pull request and must pass before merge.
- **NFR-SEC-08** — Dependency vulnerability scans (npm audit / Dependabot) on every push.
- **NFR-SEC-09** — LLM prompts must be constructed server-side only. User input must not be able to override the system prompt (prompt injection mitigation).

### 5.3 Accessibility (WCAG 2.1 AA)

- **NFR-A11Y-01** — All interactive elements are keyboard accessible with visible focus indicators.
- **NFR-A11Y-02** — All images and icons have meaningful `alt` text or `aria-label`.
- **NFR-A11Y-03** — Color is not the sole means of conveying information (price change labels include text/icon alongside color).
- **NFR-A11Y-04** — Minimum contrast ratio 4.5:1 for normal text, 3:1 for large text.
- **NFR-A11Y-05** — D3 charts include ARIA descriptions and keyboard-accessible data tables as an alternative.
- **NFR-A11Y-06** — `eslint-plugin-jsx-a11y` must report zero errors in CI.

### 5.4 Code Quality

- **NFR-CQ-01** — TypeScript strict mode enabled across frontend and backend.
- **NFR-CQ-02** — ESLint must report zero errors on CI; warnings treated as errors on the main branch.
- **NFR-CQ-03** — Prettier enforced as a pre-commit hook (Husky + lint-staged).
- **NFR-CQ-04** — Unit test coverage target: ≥ 80% for business logic (alert evaluation, auth guards, LLM adapter).
- **NFR-CQ-05** — E2E tests cover all critical user paths: register → login → add stock → set alert → receive in-app notification.
- **NFR-CQ-06** — No `any` types without explicit `// eslint-disable` comment and justification.

### 5.5 Scalability & Reliability

- **NFR-SCALE-01** — Backend designed to run as multiple stateless instances behind a load balancer.
- **NFR-SCALE-02** — WebSocket connections managed with Redis Pub/Sub so that price pushes work across multiple backend instances.
- **NFR-SCALE-03** — Database connection pooling via Prisma connection pool.
- **NFR-SCALE-04** — All background jobs (alert evaluation, email dispatch) are idempotent and can be retried safely.

---

## 6. CI/CD Pipeline

### Pipeline Stages (GitHub Actions)

```
Push / PR
  └── Lint & Format Check (ESLint, Prettier)
  └── Type Check (tsc --noEmit)
  └── Unit Tests (Vitest / Jest) + Coverage Report
  └── SAST Scan (CodeQL)
  └── Dependency Audit (npm audit --audit-level=high)
  └── Docker Build (frontend + backend images)
  └── E2E Tests (Playwright, against Docker Compose stack)
  └── SonarCloud Analysis

Merge to main
  └── All above checks pass
  └── Docker images pushed to AWS ECR / Azure ACR
  └── Terraform Plan (infrastructure diff)

Deploy to Staging
  └── Terraform Apply (staging environment)
  └── ECS / AKS rolling deploy
  └── Smoke tests

Deploy to Production  (manual approval gate)
  └── Terraform Apply (prod environment)
  └── ECS / AKS rolling deploy
  └── Post-deploy smoke tests
```

### Environments

| Environment  | Trigger                       | Purpose                 |
| ------------ | ----------------------------- | ----------------------- |
| `dev`        | Every push to feature branch  | Developer testing       |
| `staging`    | Merge to `main`               | Integration testing, QA |
| `production` | Manual approval after staging | Live                    |

---

## 7. Deployment Architecture

```
Internet
  │
  ▼
CloudFront / Azure CDN   ←── S3 / Azure Static Web Apps (React SPA)
  │
  ▼
Application Load Balancer
  │
  ├── ECS Fargate / AKS: API Service (NestJS)  ×N replicas
  │     ├── WebSocket Gateway
  │     ├── REST API
  │     └── BullMQ Workers
  │
  ├── RDS PostgreSQL (Multi-AZ)
  ├── ElastiCache Redis (cluster mode)
  └── Secrets Manager / Key Vault
```

---

## 8. Database — High-Level Entities

| Entity            | Key Fields                                                                        |
| ----------------- | --------------------------------------------------------------------------------- |
| `users`           | id, email, password_hash, provider, provider_id, is_premium, is_admin, created_at |
| `watchlist_items` | id, user_id, symbol, added_at                                                     |
| `price_alerts`    | id, user_id, symbol, upper_threshold, lower_threshold, is_active, fired_at        |
| `notifications`   | id, user_id, alert_id, message, is_read, created_at                               |
| `refresh_tokens`  | id, user_id, token_hash, expires_at, revoked_at                                   |

---

## 9. Delivery Phases

### Phase 1 — Foundation (Auth + Basic Dashboard)

- Project scaffolding: monorepo structure, ESLint, Prettier, Husky, TypeScript strict
- NestJS backend bootstrapped with auth module (email/password + OAuth)
- JWT access + refresh token flow
- Frontend: login, register, OAuth buttons, protected routes
- Basic dashboard shell with empty watchlist

### Phase 2 — Live Data & Watchlist

- Finnhub WebSocket integration (server side)
- WebSocket gateway (server → client price pushes)
- Stock search + add/remove watchlist
- Watchlist table with real-time price updates
- Virtualised list for performance

### Phase 3 — Historical Charts

- Finnhub historical candle API integration
- D3 candlestick + line chart component
- 1D / 1W / 1M time range switching
- React Query caching + background refresh
- Chart accessibility (ARIA, keyboard nav)

### Phase 4 — Alerts & Notifications

- Alert CRUD (upper/lower thresholds)
- BullMQ alert evaluation worker
- Email notifications (SendGrid/Nodemailer)
- In-app notification system (WebSocket push + notification panel)

### Phase 5 — Premium AI Chatbot

- LLM provider adapter (OpenAI adapter as default implementation)
- Premium guard (NestJS route/gateway guard)
- Chat panel UI with streaming response support
- Context assembly (watchlist + fundamentals injected into system prompt)
- Prompt injection mitigation

### Phase 6 — CI/CD, Cloud Deploy & Hardening

- GitHub Actions pipeline (all stages)
- Dockerfiles (frontend + backend)
- Terraform modules (ECS/AKS, RDS, Redis, ALB, CDN)
- Staging + production environments
- SAST, SonarCloud, Dependabot integration
- Load testing + performance validation
- WCAG audit pass

---

## 10. Out of Scope (v1)

- Mobile native app
- Trading / order execution
- Portfolio P&L tracking (positions, cost basis)
- Stripe / payment integration for premium (admin-toggle only)
- Multi-currency or international exchanges
- Options, futures, or crypto data
- Social features (sharing watchlists, following other users)
