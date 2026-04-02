# Phase 1 — Foundation: Auth + Dashboard Shell

**Status:** Planning  
**Goal:** A working, deployed-locally full-stack application where a user can register, log in (email/password + OAuth), and land on a protected dashboard shell.

---

## Accepted MVP (Definition of Done)

Phase 1 is complete when **all** of the following scenarios pass end-to-end in the local dev environment:

| # | Scenario | Expected Result |
|---|---|---|
| M1 | `POST /auth/register` with email + password | `201` + `{ accessToken, refreshToken, user }` |
| M2 | `POST /auth/login` with same credentials | `200` + `{ accessToken, refreshToken, user }` |
| M3 | `GET /auth/me` with valid access token | `200` + user object |
| M4 | `GET /auth/me` with expired access token | `401 Unauthorized` |
| M5 | `POST /auth/refresh` with valid refresh token | `200` + new access + refresh token pair |
| M6 | `POST /auth/logout` with refresh token | `200`; subsequent `POST /auth/refresh` returns `401` |
| M7 | `POST /auth/login` with wrong password | `401` with generic message (no user enumeration) |
| M8 | Google OAuth flow in browser | Redirects → consent → callback → sets tokens → lands on dashboard |
| M9 | GitHub OAuth flow in browser | Same as M8 |
| M10 | Navigate to `/dashboard` unauthenticated | Redirected to `/login` |
| M11 | Navigate to `/dashboard` with valid session | Dashboard shell renders with user's email visible |
| M12 | Click logout button | Tokens cleared; redirect to `/login`; back button does not restore session |
| M13 | `POST /auth/register` with duplicate email | `409 Conflict` |
| M14 | `POST /auth/register` with invalid email/short password | `400` with validation error details |
| M15 | ESLint + Prettier + `tsc --noEmit` all pass with zero errors | CI green |

---

## 1. Architecture Overview

### System Context (Phase 1 scope)

```mermaid
graph TD
    Browser["Browser\n(React SPA)"]
    NestJS["NestJS API\n:3001"]
    PG["PostgreSQL\n:5432"]
    Google["Google OAuth\n(external)"]
    GitHub["GitHub OAuth\n(external)"]

    Browser -->|"REST (HTTPS)"| NestJS
    NestJS -->|"Prisma"| PG
    Browser -->|"OAuth redirect"| Google
    Browser -->|"OAuth redirect"| GitHub
    Google -->|"Callback"| NestJS
    GitHub -->|"Callback"| NestJS
```

**Not in Phase 1:** Redis, WebSockets, BullMQ, Finnhub, email service, frontend CDN.

---

## 2. Backend

### Module Structure

```mermaid
graph TD
    AppModule --> AuthModule
    AppModule --> UsersModule
    AppModule --> PrismaModule

    AuthModule --> UsersModule
    AuthModule --> PrismaModule

    AuthModule -->|"uses"| JwtStrategy
    AuthModule -->|"uses"| GoogleStrategy
    AuthModule -->|"uses"| GitHubStrategy
    AuthModule -->|"uses"| LocalStrategy
```

### Auth Flow — Email/Password

```mermaid
sequenceDiagram
    participant C as Client
    participant A as AuthController
    participant AS as AuthService
    participant US as UsersService
    participant DB as PostgreSQL

    C->>A: POST /auth/register { email, password }
    A->>AS: register(dto)
    AS->>DB: find user by email
    DB-->>AS: null (not found)
    AS->>AS: bcrypt.hash(password, 12)
    AS->>DB: create user
    AS->>AS: signTokens(userId)
    AS->>DB: store refresh token hash
    AS-->>C: 201 { accessToken, refreshToken, user }

    C->>A: POST /auth/login { email, password }
    A->>AS: login(dto)
    AS->>DB: find user by email
    AS->>AS: bcrypt.compare(password, hash)
    AS->>AS: signTokens(userId)
    AS->>DB: store new refresh token hash
    AS-->>C: 200 { accessToken, refreshToken, user }
```

### Auth Flow — Token Refresh & Logout

```mermaid
sequenceDiagram
    participant C as Client
    participant A as AuthController
    participant AS as AuthService
    participant DB as PostgreSQL

    Note over C,DB: Access token expires (15 min TTL)
    C->>A: POST /auth/refresh { refreshToken }
    A->>AS: refresh(token)
    AS->>AS: jwt.verify(token) → userId
    AS->>DB: find refresh token by hash
    DB-->>AS: token record (not revoked, not expired)
    AS->>DB: revoke old refresh token
    AS->>AS: signTokens(userId)
    AS->>DB: store new refresh token hash
    AS-->>C: 200 { accessToken, refreshToken }

    C->>A: POST /auth/logout { refreshToken }
    A->>AS: logout(token)
    AS->>DB: revoke refresh token
    AS-->>C: 200 OK
```

### Auth Flow — OAuth (Google / GitHub)

```mermaid
sequenceDiagram
    participant C as Browser
    participant A as NestJS /auth/google
    participant P as Google/GitHub
    participant DB as PostgreSQL

    C->>A: GET /auth/google
    A-->>C: 302 redirect to Google consent screen
    C->>P: user grants consent
    P-->>C: 302 redirect to /auth/google/callback?code=...
    C->>A: GET /auth/google/callback
    A->>P: exchange code for profile (Passport handles)
    P-->>A: { providerId, email, name }
    A->>DB: find user by provider + providerId
    alt User exists
        DB-->>A: existing user
    else First OAuth login
        A->>DB: create user (no passwordHash)
    end
    A->>A: signTokens(userId)
    A->>DB: store refresh token hash
    A-->>C: 302 redirect to frontend /auth/callback?accessToken=...&refreshToken=...
```

> **Security note:** Tokens are passed in the redirect URL only in dev. In production this would use a short-lived code exchanged via a `POST` from the frontend callback page. Document this as a known dev shortcut.

### API Endpoints

| Method | Path | Guard | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register with email + password |
| `POST` | `/auth/login` | Public | Login with email + password |
| `POST` | `/auth/refresh` | Public | Exchange refresh token for new pair |
| `POST` | `/auth/logout` | Public | Revoke refresh token |
| `GET` | `/auth/me` | JWT | Return current user |
| `GET` | `/auth/google` | Public | Initiate Google OAuth |
| `GET` | `/auth/google/callback` | Public | Google OAuth callback |
| `GET` | `/auth/github` | Public | Initiate GitHub OAuth |
| `GET` | `/auth/github/callback` | Public | GitHub OAuth callback |

### Prisma Schema

```prisma
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  passwordHash  String?
  provider      AuthProvider?
  providerId    String?
  isPremium     Boolean        @default(false)
  isAdmin       Boolean        @default(false)
  createdAt     DateTime       @default(now())
  refreshTokens RefreshToken[]

  @@unique([provider, providerId])
}

model RefreshToken {
  id        String    @id @default(cuid())
  tokenHash String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())
}

enum AuthProvider {
  GOOGLE
  GITHUB
}
```

### Backend Milestones & TODOs

**M1 — Monorepo + NestJS Bootstrap**
- [ ] Initialise Turborepo workspace (`apps/frontend`, `apps/backend`, `packages/types`)
- [ ] Scaffold NestJS in `apps/backend` (`nest new`)
- [ ] Configure `tsconfig.json` strict mode in backend
- [ ] Add ESLint (typescript-eslint recommended + strict), Prettier, Husky, lint-staged
- [ ] Add `turbo.json` with `build`, `dev`, `lint`, `test` pipelines
- [ ] Verify `turbo run dev` starts both apps

**M2 — Prisma + Database**
- [ ] Install Prisma, initialise (`prisma init`)
- [ ] Write schema: `User`, `RefreshToken`, `AuthProvider` enum
- [ ] Run `prisma migrate dev --name init` → generates SQL migration
- [ ] Generate Prisma client
- [ ] Create `PrismaModule` (global, singleton service)
- [ ] Add `DATABASE_URL` to `.env` (gitignored) and `.env.example` (committed)

**M3 — Email/Password Auth**
- [ ] Create `AuthModule`, `AuthService`, `AuthController`
- [ ] Create `UsersModule`, `UsersService`
- [ ] Implement `register`: validate DTO (Zod), check duplicate email, hash password, create user, issue tokens
- [ ] Implement `login`: validate credentials, issue tokens
- [ ] Implement `refresh`: verify JWT, find + validate refresh token, rotate token pair
- [ ] Implement `logout`: revoke refresh token
- [ ] Implement `GET /auth/me` with JWT guard
- [ ] Add rate limiting on `/auth/register` and `/auth/login` (NestJS ThrottlerModule)
- [ ] Write unit tests: `AuthService` (register, login, refresh, logout edge cases)

**M4 — OAuth**
- [ ] Create Google Cloud Console project, OAuth consent screen, client ID + secret
- [ ] Create GitHub OAuth App, client ID + secret
- [ ] Install `passport`, `passport-google-oauth20`, `passport-github2`
- [ ] Implement `GoogleStrategy` and `GitHubStrategy` (find-or-create user)
- [ ] Wire `/auth/google`, `/auth/google/callback`, `/auth/github`, `/auth/github/callback`
- [ ] Dev callback redirects tokens to frontend URL via query params
- [ ] Write integration tests: OAuth callback with mocked Passport profile

**M5 — Validation & Security Hardening**
- [ ] Global `ValidationPipe` with Zod or `class-validator`
- [ ] Generic error messages on auth failures (no user enumeration)
- [ ] Helmet middleware (security headers)
- [ ] CORS configured to allow only frontend origin
- [ ] Confirm no secrets in committed files (pre-commit hook)

---

## 3. Frontend

### Route Structure

```mermaid
graph TD
    Root["/"] -->|"redirect"| Login
    Login["/login"] -->|"authenticated"| Dashboard
    Register["/register"] -->|"success"| Dashboard
    OAuthCallback["/auth/callback"] -->|"stores tokens"| Dashboard
    Dashboard["/dashboard"] -->|"ProtectedRoute check"| Dashboard
    Dashboard -->|"unauthenticated"| Login
```

### Component Tree

```mermaid
graph TD
    App --> RouterProvider
    RouterProvider --> PublicLayout
    RouterProvider --> ProtectedLayout

    PublicLayout --> LoginPage
    PublicLayout --> RegisterPage
    PublicLayout --> OAuthCallbackPage

    ProtectedLayout --> AuthGuard
    AuthGuard -->|"authenticated"| DashboardPage
    AuthGuard -->|"unauthenticated"| RedirectToLogin

    DashboardPage --> Header
    DashboardPage --> WatchlistShell["WatchlistShell (empty state)"]
    Header --> UserMenu
    Header --> NotificationBell["NotificationBell (placeholder)"]
```

### State Architecture

```mermaid
graph LR
    AuthStore["Zustand: AuthStore\n─────────────\nuser\naccessToken\nisAuthenticated\nlogin()\nlogout()\nrefreshTokens()"]
    ReactQueryClient["React Query Client\n─────────────\nuseCurrentUser()\nuseMutateLogin()\nuseMutateRegister()\nuseMutateLogout()"]

    LoginPage -->|"calls"| ReactQueryClient
    ReactQueryClient -->|"on success"| AuthStore
    AuthGuard -->|"reads"| AuthStore
    Header -->|"reads"| AuthStore
```

**Token storage strategy:** Access token in memory (Zustand store only — never localStorage). Refresh token in an `httpOnly` cookie. On page reload, the app calls `GET /auth/me` using the cookie-sent refresh token to restore session.

> This is more secure than storing the access token in localStorage (XSS-proof for the refresh token) while remaining simple enough for Phase 1.

### UX Screen Specs

#### Login Page (`/login`)

**Layout:** Centered card on full-height page.

| Section | Elements |
|---|---|
| Header | App logo + "StockTracker" wordmark |
| Form | Email input, Password input (show/hide toggle), "Sign in" button |
| OAuth | Divider "or continue with", Google button, GitHub button |
| Footer | "Don't have an account? Register" link |

**States:**
- Default: empty form
- Loading: button shows spinner, inputs disabled
- Error: inline error below form ("Invalid email or password" — no specifics)
- Field validation: red border + message on blur if invalid

**Accessibility:** `<form>` with `aria-label="Sign in"`, all inputs have `<label>`, error messages linked via `aria-describedby`, focus moves to first error on submit failure.

---

#### Register Page (`/register`)

**Layout:** Same centered card.

| Section | Elements |
|---|---|
| Form | Email input, Password input, Confirm password input, "Create account" button |
| OAuth | Same as login |
| Footer | "Already have an account? Sign in" link |

**States:**
- Password strength indicator (weak / fair / strong)
- Confirm password mismatch error on blur
- Duplicate email: `409` surfaces as "An account with this email already exists"

---

#### OAuth Callback Page (`/auth/callback`)

Invisible to the user — shown only briefly.

**Behaviour:** On mount, reads `accessToken` + `refreshToken` from URL query params, stores in Zustand + cookie, clears query params from URL, redirects to `/dashboard`.

**Error state:** If URL contains `error` param, shows a toast and redirects to `/login`.

---

#### Dashboard Shell (`/dashboard`)

**Layout:** Full-height app shell. No stock data yet — only structural chrome.

| Section | Elements |
|---|---|
| Header | Logo, "Dashboard" title, notification bell (badge: 0), user avatar + dropdown |
| User dropdown | User email, "Settings" (placeholder), "Sign out" |
| Main area | Empty state: icon + "Add stocks to your watchlist to get started" + "Browse Stocks" button (disabled/placeholder) |
| Sidebar | Collapsed placeholder — will hold watchlist nav in Phase 2 |

**States:**
- Loading: skeleton loaders in header and main area while `useCurrentUser` resolves
- Authenticated: full shell with user info

---

### Frontend Milestones & TODOs

**M1 — Project Setup**
- [ ] Move existing Vite scaffold into `apps/frontend/`
- [ ] Update `tsconfig.json` to strict mode
- [ ] Install and configure: `react-router-dom v6`, `@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`, `tailwindcss`
- [ ] Configure ESLint: `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-jsx-a11y`
- [ ] Set up Prettier with shared config from monorepo root
- [ ] Configure Vitest + React Testing Library
- [ ] Set up path aliases (`@/` → `src/`)

**M2 — API Client**
- [ ] Create `src/lib/apiClient.ts` — Axios instance with base URL from env var
- [ ] Add request interceptor: attach `Authorization: Bearer <accessToken>` from Zustand store
- [ ] Add response interceptor: on `401`, attempt silent token refresh, then retry original request once; on second `401`, call `logout()`
- [ ] Create typed API functions: `authApi.login()`, `authApi.register()`, `authApi.refresh()`, `authApi.logout()`, `authApi.me()`
- [ ] Export shared types from `packages/types` (import in both FE and BE)

**M3 — Auth Store + React Query**
- [ ] Implement `useAuthStore` (Zustand): `user`, `accessToken`, `isAuthenticated`, `login()`, `logout()`
- [ ] Implement `useCurrentUser` query: calls `GET /auth/me` on mount, populates auth store on success
- [ ] Implement `useLogin`, `useRegister`, `useLogout` mutations
- [ ] Implement `ProtectedRoute` component: renders children if authenticated, otherwise `<Navigate to="/login" />`
- [ ] Handle session restoration on page reload (call `refresh` endpoint, restore store)

**M4 — Auth Pages**
- [ ] Build `LoginPage`: form, OAuth buttons, validation, error states
- [ ] Build `RegisterPage`: form, password strength, validation, error states
- [ ] Build `OAuthCallbackPage`: token extraction, store population, redirect
- [ ] Write tests: form validation, error display, successful submit flow (mock API)

**M5 — Dashboard Shell**
- [ ] Build `Header` component with user menu and logout
- [ ] Build `DashboardPage` with empty watchlist state
- [ ] Add skeleton loading states
- [ ] Verify keyboard navigation through all interactive elements
- [ ] Verify all WCAG requirements: contrast, labels, focus order

---

## 4. Infrastructure & Dev Environment

### Local Dev Stack

```mermaid
graph LR
    Terminal["turbo run dev"]
    Terminal --> FE["Vite dev server\nlocalhost:5173"]
    Terminal --> BE["NestJS (ts-node-dev)\nlocalhost:3001"]
    Terminal --> DB["PostgreSQL\nlocalhost:5432\n(Docker)"]
```

**Only PostgreSQL runs in Docker for Phase 1. Redis is not needed yet.**

### Docker Compose (dev only)

```yaml
# docker-compose.dev.yml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: stocktracker
      POSTGRES_USER: stocktracker
      POSTGRES_PASSWORD: localdev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Start with: `docker compose -f docker-compose.dev.yml up -d`

### Environment Variables

`apps/backend/.env` (gitignored):
```
DATABASE_URL=postgresql://stocktracker:localdev@localhost:5432/stocktracker
JWT_ACCESS_SECRET=<generate: openssl rand -hex 32>
JWT_REFRESH_SECRET=<generate: openssl rand -hex 32>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=<from Google Console>
GOOGLE_CLIENT_SECRET=<from Google Console>
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
GITHUB_CLIENT_ID=<from GitHub Settings>
GITHUB_CLIENT_SECRET=<from GitHub Settings>
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback
FRONTEND_URL=http://localhost:5173
```

`apps/backend/.env.example` (committed — no real values):
```
DATABASE_URL=postgresql://user:password@localhost:5432/stocktracker
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
...
```

### OAuth Local Setup (Prerequisite — Do This First)

**Google:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → New Project
2. APIs & Services → OAuth consent screen → External → fill app name + email
3. APIs & Services → Credentials → Create OAuth 2.0 Client ID → Web application
4. Authorised redirect URIs: `http://localhost:3001/auth/google/callback`
5. Copy Client ID + Secret → `.env`

**GitHub:**
1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Homepage URL: `http://localhost:5173`
3. Authorization callback URL: `http://localhost:3001/auth/github/callback`
4. Copy Client ID + Secret → `.env`

### Testing Incremental Work

| What to test | How |
|---|---|
| Backend endpoints | `curl` commands or Postman/Bruno collection (committed to `/docs/api/`) |
| Auth flow end-to-end | Manual browser walkthrough against local stack |
| Unit tests | `turbo run test` — runs Vitest (FE) + Jest (BE) |
| Type safety | `turbo run typecheck` — runs `tsc --noEmit` in both apps |
| Lint | `turbo run lint` — ESLint in both apps |
| Database state | `npx prisma studio` — visual DB browser on `localhost:5555` |

### No Cloud Deployment in Phase 1

Phase 1 runs entirely locally. Cloud deployment (Terraform + ECS) is Phase 6. The goal of Phase 1 is a working local stack that CI validates on every push.

### GitHub Actions CI (Phase 1 scope)

On every push / pull request to `main`:

```yaml
jobs:
  ci:
    steps:
      - Checkout
      - Install dependencies (npm ci)
      - Type check (tsc --noEmit, both apps)
      - Lint (ESLint, both apps)
      - Format check (Prettier --check)
      - Unit tests (Vitest + Jest with coverage)
      - Build check (turbo run build)
```

---

## 5. Shared Types Package

`packages/types` is imported by both `apps/frontend` and `apps/backend`. It contains request/response DTOs so both sides always agree on shape.

```typescript
// packages/types/src/auth.ts
export interface RegisterDto {
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface UserDto {
  id: string;
  email: string;
  isPremium: boolean;
  isAdmin: boolean;
  provider: 'GOOGLE' | 'GITHUB' | null;
}
```

---

## 6. Out of Scope for Phase 1

- Finnhub integration (Phase 2)
- WebSockets (Phase 2)
- Redis (Phase 2)
- Stock watchlist CRUD (Phase 2)
- D3 charts (Phase 3)
- Price alerts (Phase 4)
- Email notifications (Phase 4)
- AI chatbot (Phase 5)
- Terraform / cloud deploy (Phase 6)
- Password reset flow (deferred to Phase 2 — requires email service)
