# StockTracker Frontend Architecture

> **Stack**: React 19 · TypeScript · Vite · Zustand · TanStack Query · Tailwind CSS · D3 · React Router v7

---

## 1. Application Entry & Bootstrap

```mermaid
flowchart TD
    A["index.html\n#root"] --> B["main.tsx\nReact.createRoot()"]
    B --> C["QueryClientProvider\nTanStack Query"]
    C --> D["App.tsx\nReact Router BrowserRouter"]
    D --> E["Route Tree"]

    E --> F["/ → redirect /login"]
    E --> G["/login → LoginPage"]
    E --> H["/register → RegisterPage"]
    E --> I["/auth/callback → OAuthCallbackPage"]
    E --> J["ProtectedRoute\n(auth guard)"]

    J --> K["AppShell\n(layout wrapper)"]
    K --> L["/dashboard → DashboardPage"]
    K --> M["/alerts → AlertsPage"]
    K --> N["/admin/premium-requests → AdminPage"]

    style A fill:#1e293b,color:#f8fafc
    style B fill:#1e293b,color:#f8fafc
    style C fill:#0f4c81,color:#f8fafc
    style D fill:#0f4c81,color:#f8fafc
    style J fill:#7c3aed,color:#f8fafc
    style K fill:#065f46,color:#f8fafc
```

---

## 2. Component Tree

```mermaid
flowchart TD
    Root["App.tsx"] --> AR["AuthLayout"]
    Root --> PR["ProtectedRoute"]

    AR --> LP["LoginPage"]
    AR --> RP["RegisterPage"]
    AR --> OA["OAuthCallbackPage"]

    LP --> OB1["OAuth Buttons\n(Google / GitHub)"]
    RP --> PSI["Password Strength\nIndicator"]

    PR --> AS["AppShell"]

    AS --> SB["Sidebar"]
    AS --> TB["Topbar"]
    AS --> MC["Main Content"]
    AS --> CP["ChatPanel\n(premium overlay)"]

    SB --> NL["Nav Links\n(Dashboard / Alerts / Admin)"]
    SB --> UC["User Card\n(role badge + premium btn)"]

    TB --> SS["SymbolSearch\n(combobox)"]
    TB --> NB["NotificationBell"]
    TB --> WSD["WSStatusDot"]

    NB --> NP["NotificationPanel\n(dropdown)"]

    MC --> DP["DashboardPage"]
    MC --> AP["AlertsPage"]
    MC --> ADM["AdminPage"]

    DP --> WP["WatchlistPanel"]
    DP --> ChP["ChartPanel\n(conditional)"]

    WP --> ASB["AddStockBar"]
    WP --> WR["WatchlistRow × N\n(virtualised)"]

    ChP --> CC["CandlestickChart\n(D3 SVG)"]

    AP --> CAF["CreateAlertForm"]
    AP --> AL["AlertsList"]
    AL --> ARW["AlertRow × N"]

    ADM --> PRQ["PremiumRequestsList"]

    CP --> MS["Message History"]
    CP --> SI["Symbol Selector"]
    CP --> TI["Textarea Input\n(SSE streaming)"]

    style Root fill:#1e293b,color:#f8fafc
    style AS fill:#065f46,color:#f8fafc
    style PR fill:#7c3aed,color:#f8fafc
    style CP fill:#92400e,color:#f8fafc
    style CC fill:#164e63,color:#f8fafc
    style WP fill:#1e3a5f,color:#f8fafc
```

---

## 3. Routing & Authentication Guard

```mermaid
sequenceDiagram
    participant Browser
    participant Router as React Router
    participant Guard as ProtectedRoute
    participant Query as TanStack Query
    participant API as /auth/me
    participant Store as authStore (Zustand)
    participant Page as Target Page

    Browser->>Router: Navigate to /dashboard
    Router->>Guard: Render ProtectedRoute
    Guard->>Query: useCurrentUser()
    Query->>API: GET /auth/me (Bearer token)

    alt Token valid
        API-->>Query: UserDto
        Query-->>Store: setAuth(user, token)
        Store-->>Guard: isAuthenticated = true
        Guard->>Page: Render children
    else No token / 401
        API-->>Query: 401 Unauthorized
        Query-->>Guard: error
        Guard->>Router: navigate('/login')
    else Loading
        Guard->>Browser: <Spinner />
    end
```

---

## 4. Zustand State Stores

```mermaid
classDiagram
    class authStore {
        +user: UserDto | null
        +accessToken: string | null
        +isAuthenticated: boolean
        +setAuth(user, token) void
        +setAccessToken(token) void
        +clear() void
    }

    class priceStore {
        +prices: Map~string, PriceTick~
        +finnhubConnected: boolean
        +setPrice(symbol, tick) void
        +setStatus(connected) void
    }

    class notificationStore {
        +notifications: Notification[]
        +unreadCount: number
        +setNotifications(list) void
        +addNotification(n) void
        +markRead(id) void
        +markAllRead() void
    }

    class chatStore {
        +isOpen: boolean
        +selectedSymbol: string
        +history: ChatMessage[]
        +streamingToken: string
        +isStreaming: boolean
        +setOpen(open) void
        +selectSymbol(symbol) void
        +addTurn(role, content) void
        +appendStreamingToken(token) void
        +flushStreaming() void
        +clearHistory() void
    }

    class PriceTick {
        +price: number
        +change: number
        +changePercent: number
        +timestamp: number
    }

    class UserDto {
        +id: string
        +email: string
        +isPremium: boolean
        +isAdmin: boolean
    }

    authStore --> UserDto
    priceStore --> PriceTick
```

---

## 5. Server State — TanStack Query + Custom Hooks

```mermaid
flowchart LR
    subgraph Hooks["Custom Hooks (src/hooks/)"]
        direction TB
        UA["useAuth\nuseCurrentUser()\nuseLogin()\nuseRegister()\nuseLogout()"]
        UW["useWatchlist\nuseWatchlist()\nuseAddToWatchlist()\nuseRemoveFromWatchlist()"]
        UC["useCandles\nuseCandles(symbol, range)\n— staleTime: 1 hour"]
        UAL["useAlerts\nuseAlerts()\nuseCreateAlert()\nuseDeleteAlert()"]
        UN["useNotifications\nuseNotifications()\nuseMarkRead(id)\nuseMarkAllRead()"]
        UP["usePremium\nusePremiumRequestStatus()\nuseRequestPremium()\nuseAdminRequests()"]
    end

    subgraph QC["TanStack QueryClient"]
        direction TB
        QA["cache key: ['me']"]
        QW["cache key: ['watchlist']"]
        QC2["cache key: ['candles', sym, range]"]
        QAL["cache key: ['alerts']"]
        QN["cache key: ['notifications']"]
        QP["cache key: ['premiumStatus']"]
    end

    subgraph API["API Modules (src/lib/)"]
        direction TB
        AUTH["authApi"]
        WATCH["watchlistApi"]
        CAND["candlesApi"]
        ALERT["alertsApi"]
        NOTIF["notificationsApi"]
        PREM["premiumApi"]
    end

    UA --> QA --> AUTH
    UW --> QW --> WATCH
    UC --> QC2 --> CAND
    UAL --> QAL --> ALERT
    UN --> QN --> NOTIF
    UP --> QP --> PREM

    style QC fill:#0f4c81,color:#f8fafc
    style Hooks fill:#1e3a5f,color:#f8fafc
    style API fill:#1a2e1a,color:#f8fafc
```

---

## 6. HTTP Client & Token Refresh Flow

```mermaid
flowchart TD
    REQ["Component calls API function"] --> AX["Axios Instance\n(src/lib/apiClient.ts)"]
    AX --> RI["Request Interceptor\nAttach: Authorization: Bearer {token}"]
    RI --> BE["Backend API\n/api/*"]

    BE -->|"200 OK"| RESP["Response returned to caller"]
    BE -->|"401 Unauthorized"| ERR["Response Interceptor\n— is this a retry?"]

    ERR -->|"No — first attempt"| REF["POST /auth/refresh\n(httpOnly cookie sent automatically)"]
    REF -->|"200 + new token"| UPD["authStore.setAccessToken(newToken)\nRetry queued requests"]
    UPD --> RI

    REF -->|"401 — refresh failed"| CLR["authStore.clear()\nwindow.location = /login"]
    ERR -->|"Yes — already retried"| CLR

    style AX fill:#1e293b,color:#f8fafc
    style REF fill:#92400e,color:#f8fafc
    style CLR fill:#7f1d1d,color:#f8fafc
    style UPD fill:#065f46,color:#f8fafc
```

---

## 7. WebSocket Architecture & Real-Time Data Flow

```mermaid
flowchart TD
    subgraph Client["Browser"]
        direction TB
        AM["AppShell.onMount\nwsClient.connect(token)"]
        WC["WsClient Singleton\n(src/lib/wsClient.ts)"]
        REC["Auto-Reconnect\nExponential backoff 1s→30s"]
        SUB["Subscription Registry\nSet~string~ of symbols"]
    end

    subgraph Messages["Message Handling"]
        direction TB
        PRICE["type: price\n{ symbol, price, change, changePercent }"]
        STATUS["type: status\n{ finnhubConnected }"]
        PING["type: ping"]
        CONN["type: connected"]
        NOTIF["type: notification\n{ id, message, createdAt }"]
    end

    subgraph Stores["Zustand Stores"]
        PS["priceStore\n.setPrice(symbol, tick)"]
        NS["notificationStore\n.addNotification(n)"]
        FCS["priceStore\n.setStatus(connected)"]
    end

    subgraph UI["Re-rendered Components"]
        WR["WatchlistRow\n(flash animation)"]
        WSD2["WSStatusDot"]
        NB2["NotificationBell\n(unreadCount badge)"]
    end

    AM --> WC
    WC <-->|"wss://host/ws?token=..."| BE["Backend\nWS Gateway"]
    WC --> REC

    BE --> PRICE --> PS --> WR
    BE --> STATUS --> FCS --> WSD2
    BE --> PING --> WC
    BE --> CONN --> SUB
    BE --> NOTIF --> NS --> NB2

    SUB -->|"{ type: subscribe, symbols }"| BE

    style WC fill:#1e293b,color:#f8fafc
    style PS fill:#0f4c81,color:#f8fafc
    style NS fill:#0f4c81,color:#f8fafc
    style FCS fill:#0f4c81,color:#f8fafc
```

---

## 8. Live Price Update — End-to-End Data Flow

```mermaid
sequenceDiagram
    participant Finnhub as Finnhub WS
    participant BE as Backend WS Gateway
    participant WS as WsClient (browser)
    participant PS as priceStore
    participant WR as WatchlistRow

    Finnhub-->>BE: trade event { symbol, price }
    BE->>BE: compute change / changePercent
    BE-->>WS: { type:"price", symbol, price, change, changePercent, timestamp }
    WS->>PS: setPrice(symbol, { price, change, changePercent, timestamp })
    PS->>PS: Map.set(symbol, tick)  [Zustand immutable update]
    PS-->>WR: selector re-runs  prices.get(symbol)
    WR->>WR: prevPrice !== newPrice → flash class
    WR->>WR: render new price + change%
```

---

## 9. Add Stock to Watchlist — Data Flow

```mermaid
sequenceDiagram
    participant User
    participant SS as SymbolSearch
    participant Hook as useAddToWatchlist
    participant API as watchlistApi
    participant QC as QueryClient
    participant WS as WsClient
    participant WP as WatchlistPanel

    User->>SS: Types symbol, selects from results
    SS->>Hook: mutate({ symbol })
    Hook->>API: POST /watchlist { symbol }
    API-->>Hook: WatchlistItem created

    Hook->>QC: invalidateQueries(['watchlist'])
    QC->>API: GET /watchlist (refetch)
    API-->>QC: Updated list
    QC-->>WP: New data → re-render

    Hook->>WS: wsClient.subscribe([symbol])
    WS->>WS: Add to subscription registry
    WS-->>BE: { type:"subscribe", symbols:[symbol] }
    Note over WP: New WatchlistRow appears, live prices start flowing
```

---

## 10. AI Chat (SSE Streaming) — Data Flow

```mermaid
sequenceDiagram
    participant User
    participant CP as ChatPanel
    participant CS as chatStore
    participant CA as chatApi.streamChat()
    participant BE as Backend /chat (SSE)
    participant LLM as Claude API

    User->>CP: Types message, presses Enter
    CP->>CS: addTurn('user', message)
    CP->>CA: streamChat({ symbol, history, message })
    CA->>BE: POST /chat  (fetch, not axios)
    BE->>LLM: Stream request with portfolio context
    
    loop SSE tokens
        LLM-->>BE: token chunk
        BE-->>CA: data: {"token":"..."}
        CA->>CS: appendStreamingToken(chunk)
        CS-->>CP: streamingToken updates → animated dots
    end

    BE-->>CA: data: [DONE]
    CA->>CS: flushStreaming()
    CS->>CS: history.push({role:'assistant', content: accumulated})
    CS->>CS: streamingToken = ''
    CS-->>CP: Message appears in history
```

---

## 11. Authentication Flows

```mermaid
flowchart TD
    subgraph Email["Email / Password Flow"]
        direction LR
        L1["LoginPage\n(React Hook Form + Zod)"] --> L2["useLogin() mutation"]
        L2 --> L3["POST /auth/login"]
        L3 -->|"{ user, accessToken }"| L4["authStore.setAuth()"]
        L4 --> L5["navigate('/dashboard')"]
    end

    subgraph OAuth["OAuth Flow"]
        direction LR
        O1["Login/Register Page\nOAuth buttons"] --> O2["Redirect to\n/api/auth/google\nor /api/auth/github"]
        O2 --> O3["Backend OAuth\nhandshake"]
        O3 --> O4["/auth/callback?accessToken=..."]
        O4 --> O5["OAuthCallbackPage\nextract token from URL"]
        O5 --> O6["GET /auth/me\n(token in Authorization header)"]
        O6 --> O7["authStore.setAuth()\nnavigate('/dashboard')"]
    end

    subgraph Logout["Logout Flow"]
        direction LR
        LO1["useLogout() mutation"] --> LO2["POST /auth/logout\n(clears httpOnly cookie)"]
        LO2 --> LO3["authStore.clear()"]
        LO3 --> LO4["queryClient.clear()"]
        LO4 --> LO5["navigate('/login')"]
    end

    style L4 fill:#065f46,color:#f8fafc
    style O7 fill:#065f46,color:#f8fafc
    style LO3 fill:#7f1d1d,color:#f8fafc
```

---

## 12. Candlestick Chart — Rendering Pipeline

```mermaid
flowchart TD
    WR["WatchlistRow\n(user clicks expand)"] --> CP2["ChartPanel\n(symbol + range props)"]
    CP2 --> UC2["useCandles(symbol, range)\nstaleTime: 1 hour"]
    UC2 --> CAPI["GET /candles/:symbol?range=1D|1W|1M"]
    CAPI -->|"CandleDto\n{ t[], o[], h[], l[], c[], v[] }"| UC2
    UC2 -->|"data"| CSC["CandlestickChart\n(D3 SVG)"]

    subgraph D3["D3 Rendering (SVG)"]
        direction TB
        RO["useEffect → ResizeObserver\ncalculate width/height"]
        XS["d3.scaleBand()\nX axis: timestamps"]
        YS["d3.scaleLinear()\nY axis: price range"]
        CB["SVG rect elements\ngreen if close>open\nred if close<open"]
        WK["SVG line elements\nhigh–low wicks"]
        XT["X axis ticks\ndensity by range\n1D:every, 1W:÷4, 1M:÷10"]
        GL["Grid lines"]
        TT["Hover tooltip\nOHLCV + formatted date"]
    end

    CSC --> D3

    style D3 fill:#164e63,color:#f8fafc
    style CSC fill:#164e63,color:#f8fafc
```

---

## 13. Notification System — Complete Flow

```mermaid
flowchart LR
    subgraph Push["Real-time Push (WebSocket)"]
        BE2["Backend fires alert\n(price threshold crossed)"] --> WS2["WsClient receives\n{ type:'notification', ... }"]
        WS2 --> NS2["notificationStore\n.addNotification()"]
    end

    subgraph Poll["Initial Load (HTTP)"]
        APP["AppShell mounts"] --> HN["useNotifications()\nGET /notifications"]
        HN --> NS3["notificationStore\n.setNotifications(list)"]
    end

    NS2 --> URC["unreadCount increments"]
    NS3 --> URC

    URC --> NBL["NotificationBell\nbadge re-renders"]
    NBL -->|"click"| NPN["NotificationPanel\nshows list"]

    NPN --> MR["Mark Read\nPATCH /notifications/:id/read\nnotificationStore.markRead(id)"]
    NPN --> MAR["Mark All Read\nPATCH /notifications/read-all\nnotificationStore.markAllRead()"]

    style Push fill:#1e3a5f,color:#f8fafc
    style Poll fill:#1a2e1a,color:#f8fafc
```

---

## 14. Price Alert Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Creating : User opens /alerts

    Creating --> Submitting : Form valid + submit
    Submitting --> Active : POST /alerts → 201
    Submitting --> Creating : Validation error

    Active --> Fired : Backend: price crosses threshold
    Fired --> NotificationSent : WS push to browser

    Active --> Deleted : User clicks delete
    Fired --> Deleted : User clicks delete
    Deleted --> [*]

    NotificationSent --> [*]
```

---

## 15. Watchlist Virtualization

```mermaid
flowchart TD
    WPL["WatchlistPanel\nwatchlist.length > 0"] --> VIRT{"Render mode"}

    VIRT -->|"No row expanded"| TV["@tanstack/react-virtual\nuseVirtualizer()\nrow height: 56px\noverscan: 5"]
    VIRT -->|"Row expanded\n(chart open)"| NV["Non-virtualized\nall rows rendered\n(chart needs DOM node)"]

    TV --> VR["Virtualised WatchlistRow items\n(only visible rows in DOM)"]
    NV --> ER["All WatchlistRow items\n+ ChartPanel below active row"]

    VR --> WR2["WatchlistRow\n— symbol + company name\n— live price (priceStore)\n— change % with color\n— flash animation on tick\n— expand/remove buttons"]

    style TV fill:#1e3a5f,color:#f8fafc
    style NV fill:#1a2e1a,color:#f8fafc
```

---

## 16. Premium Access Flow

```mermaid
sequenceDiagram
    participant U as User (Free tier)
    participant SB as Sidebar
    participant Hook as useRequestPremium
    participant API as premiumApi
    participant Admin as Admin user
    participant AP as AdminPage

    U->>SB: Clicks "Request Premium"
    SB->>Hook: mutate()
    Hook->>API: POST /premium/request
    API-->>Hook: { status: 'pending' }
    Hook-->>SB: Button shows "Pending…" spinner

    Admin->>AP: Views /admin/premium-requests
    AP->>API: GET /admin/premium-requests?status=pending
    API-->>AP: [{ id, user, requestedAt }]

    Admin->>AP: Clicks Approve / Reject
    AP->>API: PATCH /admin/premium-requests/:id/approve
    API->>API: user.isPremium = true
    API-->>AP: Updated request

    Note over U,SB: Next login / token refresh
    U->>SB: Sidebar shows "Premium" badge
    SB->>SB: ChatPanel button enabled
```

---

## 17. Dependency & Layer Map

```mermaid
flowchart TB
    subgraph Presentation["Presentation Layer (components/ + pages/)"]
        PAGES["Pages\nDashboard · Alerts · Admin\nLogin · Register · OAuth"]
        COMPS["Components\nAppShell · Sidebar · WatchlistPanel\nChartPanel · ChatPanel · AlertsList\nNotificationBell · SymbolSearch"]
    end

    subgraph Logic["Logic Layer (hooks/ + stores/)"]
        HOOKS["Custom Hooks\nuseAuth · useWatchlist · useCandles\nuseAlerts · useNotifications · usePremium"]
        STORES["Zustand Stores\nauthStore · priceStore\nnotificationStore · chatStore"]
        QC2["TanStack QueryClient\nServer-state cache"]
    end

    subgraph IO["I/O Layer (lib/)"]
        AXIOS["apiClient.ts\nAxios + interceptors"]
        APIS["API Modules\nauthApi · watchlistApi · candlesApi\nalertsApi · notificationsApi · premiumApi · chatApi"]
        WC2["WsClient\nWebSocket singleton"]
    end

    subgraph External["External"]
        REST["REST API\n/api/*"]
        WSS["WebSocket\nwss://host/ws"]
        SSE["SSE Stream\nPOST /chat"]
    end

    PAGES --> COMPS
    COMPS --> HOOKS
    COMPS --> STORES
    HOOKS --> QC2
    HOOKS --> STORES
    QC2 --> APIS
    APIS --> AXIOS
    AXIOS --> REST
    WC2 --> WSS
    WC2 --> STORES
    COMPS --> WC2

    chatApi --> SSE

    style Presentation fill:#1e293b,color:#f8fafc
    style Logic fill:#0f4c81,color:#f8fafc
    style IO fill:#065f46,color:#f8fafc
    style External fill:#1a1a1a,color:#f8fafc
```

---

## 18. File & Module Map

```
apps/frontend/src/
│
├── main.tsx                    Bootstrap: React root + QueryClientProvider
├── App.tsx                     Router: all route definitions
├── index.css                   Tailwind + custom animations (flash, shimmer)
│
├── pages/
│   ├── LoginPage.tsx           Email/password + OAuth sign-in
│   ├── RegisterPage.tsx        Registration + password strength
│   ├── OAuthCallbackPage.tsx   Handles /auth/callback redirect
│   ├── DashboardPage.tsx       WatchlistPanel + conditional ChartPanel
│   ├── AlertsPage.tsx          CreateAlertForm + AlertsList
│   └── AdminPage.tsx           Premium request approval UI
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx        Master layout + WS connect on mount
│   │   ├── Sidebar.tsx         Nav + user card + premium request
│   │   └── AuthLayout.tsx      Branding panel + form panel
│   ├── auth/
│   │   └── ProtectedRoute.tsx  Auth guard → spinner or redirect
│   ├── watchlist/
│   │   ├── WatchlistPanel.tsx  Virtualised list container
│   │   ├── WatchlistRow.tsx    Single row with live price + flash
│   │   └── AddStockBar.tsx     Symbol input form
│   ├── chart/
│   │   ├── ChartPanel.tsx      Range tabs + title + skeleton
│   │   └── CandlestickChart.tsx D3 SVG OHLCV chart
│   ├── chat/
│   │   └── ChatPanel.tsx       SSE streaming AI chat overlay
│   ├── alerts/
│   │   ├── CreateAlertForm.tsx Zod-validated alert form
│   │   ├── AlertsList.tsx      Table container
│   │   └── AlertRow.tsx        Single alert with status badge
│   ├── notifications/
│   │   ├── NotificationBell.tsx Topbar icon + unread badge
│   │   └── NotificationPanel.tsx Dropdown notification list
│   ├── search/
│   │   └── SymbolSearch.tsx    Debounced combobox (300ms)
│   └── WSStatusDot.tsx         Green/red WS connection indicator
│
├── hooks/
│   ├── useAuth.ts              useCurrentUser / useLogin / useRegister / useLogout
│   ├── useWatchlist.ts         useWatchlist / useAdd / useRemove
│   ├── useCandles.ts           useCandles(symbol, range)
│   ├── useAlerts.ts            useAlerts / useCreate / useDelete
│   ├── useNotifications.ts     useNotifications / useMarkRead / useMarkAllRead
│   └── usePremium.ts           useRequestPremium / useAdminRequests / approve / reject
│
├── stores/
│   ├── authStore.ts            JWT + user profile (in-memory)
│   ├── priceStore.ts           Live ticks Map + Finnhub status
│   ├── notificationStore.ts    Notification list + unread count
│   └── chatStore.ts            Chat history + SSE streaming state
│
└── lib/
    ├── apiClient.ts            Axios instance + 401 auto-refresh
    ├── authApi.ts              register / login / me / logout
    ├── watchlistApi.ts         list / add / remove
    ├── candlesApi.ts           fetch(symbol, range)
    ├── alertsApi.ts            list / create / remove
    ├── notificationsApi.ts     list / markRead / markAllRead
    ├── premiumApi.ts           request / status / admin CRUD
    ├── chatApi.ts              streamChat (SSE fetch) / getChatContext
    └── wsClient.ts             WS singleton + auto-reconnect + subscription registry
```

---

## 19. Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Client routing | React Router v7 (plain Routes) | No loader complexity; auth handled in hooks |
| Global UI state | Zustand v5 | Minimal boilerplate; works naturally with WebSocket push |
| Server state | TanStack Query v5 | Cache invalidation, stale-while-revalidate, deduplication |
| Real-time | Native WebSocket singleton | Full duplex; price ticks too frequent for polling |
| AI streaming | Fetch + ReadableStream (SSE) | Axios does not stream; SSE keeps tokens flowing |
| Charts | D3 v7 (SVG) | Full control over candle layout, tooltips, and animation |
| Large lists | @tanstack/react-virtual | Handles 1000+ watchlist items with 56px rows |
| Token storage | Memory (Zustand) + httpOnly refresh cookie | XSS-resistant; silent refresh on 401 |
| CSS | Tailwind v4 | Utility-first; zero dead CSS in production build |
| Build | Vite + React Compiler | Sub-second HMR; auto-memoization via compiler |
