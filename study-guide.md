# PocketExpense+ — Complete Study Guide

**Covers:** architecture, system design, core algorithms, rationale behind every major decision, database design, security, testing, deployment, limitations, and exam-prep questions.

**Project:** Full-stack, offline-first expense tracking application — React Native (Expo) mobile client + Node.js/Express REST API + MongoDB.

---

## Table of Contents

1. [Big Picture — What This System Is](#1-big-picture)
2. [Tech Stack & Why Each Choice Was Made](#2-tech-stack--rationale)
3. [System Architecture](#3-system-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [The Offline-First Sync Engine (Deep Dive)](#5-offline-first-sync-engine)
6. [The SMS Transaction Detection Pipeline (Deep Dive)](#6-sms-detection-pipeline)
7. [Backend Architecture](#7-backend-architecture)
8. [Recurring Transactions Engine (Deep Dive)](#8-recurring-transactions-engine)
9. [Budget Engine](#9-budget-engine)
10. [Insights & Anomaly Detection (Deep Dive)](#10-insights--anomaly-detection)
11. [Database Design](#11-database-design)
12. [Security Architecture](#12-security-architecture)
13. [Testing Strategy](#13-testing-strategy)
14. [Deployment & Operations](#14-deployment--operations)
15. [Design Decisions, Tradeoffs & Logic](#15-design-decisions--tradeoffs)
16. [Known Limitations & Future Improvements](#16-known-limitations--improvements)
17. [Key File Reference Map](#17-key-file-reference-map)
18. [Exam / Interview Prep Questions](#18-exam--interview-prep-questions)

---

## 1. Big Picture

PocketExpense+ is a **financial tracking system** with four headline capabilities:

1. **Offline-first expense tracking** — users can record expenses with no network; a background sync engine reconciles with the server when connectivity returns.
2. **Automated recurring transactions** — user marks an expense as daily/weekly/monthly; a cron job clones it into real transactions on schedule.
3. **Smart analytics** — aggregation-driven insights with **statistical anomaly detection** (z-scores) that flags unusual spending.
4. **Android SMS-based automatic expense detection** — reads bank SMS messages, parses them locally (never uploaded), assigns a confidence score, deduplicates, and lets the user confirm → auto-adds an expense.

The core design philosophy: **local-first writes, batched server sync, security by layered middleware, and correctness through idempotency + recomputation rather than clever-but-fragile logic.**

---

## 2. Tech Stack & Rationale

### Frontend

| Technology | Why it was chosen |
|---|---|
| **React Native 0.81 + Expo SDK 54** | Single codebase for iOS/Android/web; Expo managed workflow gives OTA updates (no App Store round-trip for bug fixes), fast dev tooling, and access to native modules without writing Java/Kotlin. |
| **Expo Router 6 (file-based routing)** | Routes are files in `app/` — URLs and screens are colocated, typed routes give compile-time route safety, and deep links come for free. Alternatives (React Navigation manual config) were rejected for boilerplate. |
| **Redux Toolkit + React Redux** | Predictable global state. RTK gives batteries-included `configureStore`, thunks, and devtools. The alternative — React Context — re-renders the whole tree and has no built-in devtools/time-travel, and Zustand was skipped to keep a single source of truth with middleware (needed for the sync engine to read state). |
| **AsyncStorage** | The only sane key-value store available without native config in Expo; used to persist auth, expenses, pending queue, and SMS settings. Chosen over SQLite because expense data is small (< a few thousand rows). |
| **NetInfo** | Detects `isConnected && isInternetReachable` — the trigger that fires the sync engine on reconnect. |
| **Axios** | Interceptors are the killer feature: a request interceptor attaches the JWT to every request; a response interceptor handles 401 globally. |
| **date-fns** | Tree-shakeable, immutable date helpers (`isToday`, `isYesterday`) vs. the huge mutable moment.js. |
| **TypeScript** | Catch shape changes (Expense, Budget, API responses) at compile time — critical when client and server share domain shapes. |
| **React Compiler + Reanimated** | Automatic memoization reduces manual `useMemo`; Reanimated drives the SMS confirm modal + tab bar animations on the UI thread (no JS-thread jank). |
| **Poppins font / custom theme** | Brand identity; a centralized design-token theme (`src/theme/index.ts`) keeps spacing, radii, colors, shadows consistent. |

### Backend

| Technology | Why it was chosen |
|---|---|
| **Node.js + Express 4** | Massive ecosystem, same language as the client (one mental model, shared conventions), and Express's middleware model maps perfectly to the layered security pipeline. |
| **MongoDB + Mongoose 8** | The data is mostly **document-shaped** (nested arrays in insights, denormalized budgets) and MongoDB's aggregation pipeline ($group, $dateToString, $dayOfWeek) makes the analytics queries trivial. No rigid schema migrations needed for a student project that evolves weekly. |
| **JWT** | Stateless auth — the server doesn't store sessions, so horizontal scaling (multiple instances behind a load balancer) needs no shared session store. |
| **bcryptjs** | Standard password hashing with salt rounds (10) — pure JS, no native build headaches on deployment platforms. |
| **Joi** | Declarative schema validation with `stripUnknown` (silently drops unknown fields — an injection defense) and `abortEarly: false` (report all errors at once). |
| **Winston** | Structured JSON logs to files (`error.log`, `combined.log`) + console; can ship to any log aggregator later. |
| **node-cron** | Simple `'0 * * * *'` hourly schedule for the recurring-transaction sweep. |
| **Helmet / mongo-sanitize / hpp / express-rate-limit** | Defense-in-depth security: headers, NoSQL injection, parameter pollution, brute-force protection. |
| **Jest + Supertest + mongodb-memory-server** | Real DB behavior in tests without a running MongoDB; Supertest drives the real Express app in-memory (faster and more honest than mocking). |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     React Native (Expo SDK 54)                          │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Home    │  │  Txns    │  │ Analytics│  │  Account │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│       └──────────────┼──────────────┼──────────────┘                    │
│                                                                         │
│  ┌─────────────────── Redux Toolkit Store ────────────────────────┐    │
│  │  auth │ expenses │ budgets │ insights │ sync │ sms             │    │
│  └───────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │  Sync Engine     │  │  SMS Pipeline    │  │  Category        │     │
│  │  (NetInfo +      │  │  (Android-only   │  │  Detector        │     │
│  │   AsyncStorage)  │  │   local parsing) │  │  (keyword NLP)   │     │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘     │
│                                                                         │
│                 Axios + JWT Token Interceptor                           │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │ HTTPS / REST
┌─────────────────────────▼───────────────────────────────────────────────┐
│                      Express API Server                                  │
│                                                                          │
│  Middleware Pipeline:                                                    │
│  Helmet → mongoSanitize → HPP → CORS → JSON(10MB) → Request Log →      │
│  Rate Limit → Route → Joi Validation → Auth(JWT) → Controller →        │
│  Service → Model → MongoDB                                               │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Auth    │  │ Expenses │  │ Budgets  │  │ Insights │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│       ▼              ▼              ▼              ▼                     │
│                    Services Layer (business logic lives here)           │
│  expense.service │ budget.service │ insight.service                     │
│  recurring.service │ cron.service                                       │
│                                                                          │
│  Cron Job (hourly) ──▶ recurring.service.processDueRecurring()          │
│  Winston Logger (error.log + combined.log)                              │
│  Centralized Error Handler (AppError normalization)                     │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
                 ┌────────▼────────┐
                 │    MongoDB      │  (3 collections: users, expenses, budgets)
                 └─────────────────┘
```

**Key architectural facts to memorize:**

- **Client** = 6 Redux slices (`auth, expenses, budgets, insights, sync, sms`), 3 service pillars (sync engine, SMS pipeline, category detector), all under an expo-router file tree.
- **Server** = strict 4-layer stack: **Route → Controller (thin) → Service (business logic) → Model**. Middleware wraps everything before controllers run.
- **Data flow on write**: UI → Redux reducer (optimistic, local, persisted) → sync engine → `POST /api/v1/expenses/sync` (batch) → service upsert → Mongo.
- **Data flow on read**: UI → Redux thunk → `GET /api/v1/expenses?page=1&limit=20` → service aggregation/query → UI. Reads go through the network (with a local fallback when offline); writes are local-first.

---

## 4. Frontend Architecture

### 4.1 Routing (`app/`)

expo-router file-based routing with **typed routes** enabled:

| Route | Purpose |
|---|---|
| `app/_layout.tsx` | Root provider + hydration + auth gate + sync/SMS lifecycle |
| `app/(auth)/login.tsx`, `register.tsx` | Unauthenticated group |
| `app/(tabs)/` | 4 bottom tabs: Home, Transactions, Analytics, Account |
| `app/expense/add.tsx`, `expense/[id].tsx` | Create / detail — presented as **modals** |
| `app/budgets.tsx`, `app/insights.tsx` | Budget CRUD, advanced insights — modals |
| `app/settings/sms-detection.tsx` | SMS permission toggle (Android only) |

**The root layout is the app's "main()" — it does 4 things:**

1. **Hydration** (`app/_layout.tsx:35-71`): on launch, reads `token`/`user`, `expenses`/`pendingQueue`, and `smsDetectionEnabled` from AsyncStorage and dispatches hydrate actions. This is manual hydration — the project deliberately does **not** use redux-persist (see Tradeoffs).
2. **Sync engine lifecycle**: `syncEngine.init()` subscribes to NetInfo on mount; `cleanup()` on unmount.
3. **SMS listener lifecycle**: on Android + authenticated, `initSmsListener()` starts the native event subscription.
4. **Auth gate** (`:88-100`): unauthenticated users are redirected to `/(auth)/login`; authenticated users in the auth group are pushed to `/(tabs)`. A splash spinner renders while `isHydrating` is true — this prevents the classic "login flash" on cold start.

### 4.2 Redux State Design — 6 slices

| Slice | State | Design note |
|---|---|---|
| `auth` | `user`, `token`, `isAuthenticated`, `isLoading`, `error` | Token + user persisted to AsyncStorage **inside the reducer** (an intentional deviation from pure-Redux — see Tradeoffs). `isLoading` starts `true` so the gate never flashes. |
| `expenses` | `items[]`, `pendingQueue[]`, `isLoading`, `error`, `totalExpense`, `totalIncome` | **The offline core.** `items` holds everything; `pendingQueue` holds unsynced mutations. Totals are computed only for the **current calendar month**. |
| `budgets` | `items[]`, `isLoading`, `error` | Classic thunks (`fetchBudgets`, `createBudget`...) — **no optimistic updates**; budgets wait for the server. |
| `insights` | `advancedInsights`, `isLoading`, `error` | Read-only thunk (`fetchAdvancedInsights`). |
| `sync` | `isOnline`, `isSyncing`, `lastSyncTime`, `pendingCount`, `error` | Ephemeral status flags consumed by `SyncIndicator` and the Home header badge. |
| `sms` | `isEnabled`, `permissionStatus`, `lastDetectedTransaction`, `showConfirmation`, `detectionCount` | `isEnabled` persisted; the rest is transient UI state for the confirmation modal. |

### 4.3 Why `expenses` is designed this way (the key insight)

Every expense carries a **`localId`** (generated client-side: `Date.now().toString(36) + Math.random().toString(36)`) and a **`syncStatus`** (`'synced' | 'pending' | 'conflict'`).

- `addExpense` → creates the item with `syncStatus: 'pending'`, `unshift`es into `items` (newest first), pushes a copy into `pendingQueue`, recomputes totals, **persists both arrays to AsyncStorage** — all synchronously, no network (`src/store/slices/expenseSlice.ts:81-95`).
- `updateExpense` → applies partial updates, flips status to `'pending'`, and **upserts into the queue** (one queue entry per `localId` — this prevents duplicates when an expense is edited twice while offline).
- `deleteExpense` → removes from both `items` and `pendingQueue` (locally destructive — see Limitation #7).
- `markAsSynced({ localId, serverId })` → called by the sync engine after server ack: records the real `_id`, flips status to `'synced'`, removes from the queue, persists.

**Why optimistic writes?** Financial apps fail when writes hang on a spinner — users double-tap, retry, and produce duplicates. Writing locally first gives instant UI feedback; the queue + idempotent server endpoint guarantees eventual consistency.

**Why a batch sync endpoint?** N individual `POST /expenses` calls offline → reconnect means N round trips and N partial-failure states. A single `POST /expenses/sync` with the whole queue is atomic from the client's perspective and lets the server reply with one array of `{ localId, serverId }` acks.

### 4.4 Key screens & their logic

- **Home (`(tabs)/index.tsx`)**: computes `balance = totalIncome - totalExpense`, shows 5 recent transactions, `onRefresh` → `syncEngine.fullSync()` (push then pull). Pull-to-refresh is the manual sync trigger; NetInfo is the automatic one.
- **Add Expense (`expense/add.tsx:52-100`)**: validates → `dispatch(addExpense(...))` (instant) → checks the new total against `user.budgetLimit` and alerts if exceeded → **fire-and-forget** `syncEngine.syncPending()` → back. Note: the budget check reads the *Redux* total, not the server.
- **Transactions**: local search + filter state; `filteredTransactions` is a `useMemo` over type/category/date-range/search/sort — all client-side (the server pagination is used for the initial fetch).
- **Budgets**: thunk-driven CRUD with `.unwrap()` for error handling; `getStatusColor`: ≥100% red, ≥75% yellow, else green.
- **Insights**: renders growth chart (bar heights normalized by `total/maxTotal`), top categories, weekday-vs-weekend, and anomaly cards with z-scores.
- **SMS settings**: toggle → `requestReceiveSmsPermission()` → on granted: `enableSmsDetection()` + `initSmsListener()`; on `never_ask_again` → alert with a "Open Settings" deep link.

### 4.5 Design system (`src/theme/index.ts`)

"Violet Glassmorphism": gradient `#C4A6FE → #8A64EB`, primary `#8A64EB`, background `#F8F9FE`, status colors with tinted backgrounds, spacing scale (4→32), radii (8→30, 9999 pill), four shadow presets (`card`, `cardHeavy`, `tabBar` with negative Y offset for an upward glow, `fab` with violet tint). 20 category tokens each with label + emoji + colors. All components consume tokens — no hardcoded values in screens (this is what makes the app consistent and re-themeable).

---

## 5. Offline-First Sync Engine

**File: `src/services/syncEngine.ts`** — a singleton class with four operations: `syncPending()` (push), `fetchFromServer()` (pull), `loadFromLocal()` (fallback), `fullSync()` (both).

### 5.1 The push path — `syncPending()` (`:48-88`)

```
1. Read pendingQueue + token from Redux (store.getState())
2. Early exit if: no token, queue empty, or NetInfo says offline
3. dispatch(setSyncing(true)), setPendingCount(queue.length)
4. POST /expenses/sync  { expenses: pendingQueue }   ← whole batch
5. Server responds: { results: [{ localId, serverId, status }] }
6. For each result → dispatch(markAsSynced({ localId, serverId }))
7. setLastSyncTime(now), setPendingCount(0)
8. On failure → setSyncError(message); queue stays intact (retry later)
```

**Failure handling is "implicit retry"**: there is no exponential backoff inside the engine. Two retry triggers exist — (a) NetInfo reports online (the reconnect listener calls `syncPending()`), (b) the user pulls-to-refresh. Because a failed sync does **not** clear the queue, the system is self-healing: pending items simply wait for the next trigger.

### 5.2 The pull path — `fetchFromServer()` (`:91-156`)

```
1. No token → abort
2. Offline → loadFromLocal() and return
3. GET /expenses?limit=100  → server list
4. Map to client shape, keep localId (or use server _id), syncStatus='synced'
5. MERGE: server list first, then append any pendingQueue item whose
   localId is NOT in the server list (never drop unsynced local rows)
6. Sort merged list by date descending
7. dispatch(setExpenses) + persist merged array to AsyncStorage
8. Error → loadFromLocal() + setSyncError
```

**The merge rule is the conflict-resolution strategy**: server wins for anything the server knows about; anything still pending locally is layered back on top. Since the client is the only writer for a given user's data and edits are rare, this "last-writer-wins per item" approach is sufficient — no OT/CRDT machinery needed.

### 5.3 How sync is triggered

| Trigger | Mechanism |
|---|---|
| App start | `syncEngine.init()` → NetInfo listener |
| **Reconnect** | NetInfo listener fires `syncPending()` when `isConnected && isInternetReachable` turns true (`:22-32`) |
| Add expense | `expense/add.tsx` fire-and-forget after optimistic insert |
| Pull-to-refresh | `fullSync()` = push then pull |

### 5.4 The server side of sync — `syncBulk` (`expense.service.js:123-149`)

- For each client expense: **lookup by `localId`** (indexed: `{ user, localId }`).
- Found → update the existing doc; not found → create with the server `_id`.
- Reply `{ localId, serverId, status: 'created'|'updated' }`.
- After the batch: `budgetService.recalculateAllForUser(userId)` — budget totals are recomputed from source data rather than incrementally maintained (consistency by recomputation).

**Why `localId`-keyed upsert instead of trusting the server `_id`?** The client may not yet have a server `_id` (offline-created). `localId` is the client-generated stable key that both sides can agree on, making the sync **idempotent** — if a retry re-sends an item that was already processed, the lookup-by-localId finds it and updates instead of duplicating.

---

## 6. SMS Detection Pipeline

**Files:** `src/services/sms/{patterns, pipeline, parser, confidence, deduplication}.ts` + `smsListener.ts` + `smsPermission.ts`

**Design constraints that shaped everything:** (1) SMS is read **locally only** — privacy promises "parsed locally and never sent"; (2) bank SMS formats vary wildly across ~30 Indian banks and payment apps; (3) false positives are unacceptable in a finance app — better to miss a transaction than to invent one.

### 6.1 The 7-stage pipeline

```
SMS event (Android native module)
   │
   ▼
1. Pre-filter  isBankMessage(sender, body)
   → recognized sender ID? OR (transaction keyword AND Rs./INR/₹ amount)
   │
   ▼
2. Normalize  strip zero-width chars, CRLF→LF, collapse whitespace,
   ₹ → "Rs.", INR → "Rs."
   │
   ▼
3. Sender metadata  BANK_SENDER_PATTERNS regex (VM-HDFCBK, AD-SBIINB,
   PAYTM, PHONEPE...) → isRecognizedBank
   │
   ▼
4. Classify  IGNORE_PATTERNS first (OTP, promo, balance, declined,
   failed...) → 'ignore' | DEBIT_PATTERNS → 'debit' | CREDIT_PATTERNS → 'credit'
   │
   ▼
5. Extract fields
   • primary amount (pattern-matched per classification, strict decimal parse,
     guardrails 1 ≤ amount ≤ 1,000,000)
   • merchant (9 patterns ordered by specificity, 2–60 chars)
   • account last-4 (a/c XX1234, card ending 1234, **1234)
   • timestamp (dd/mm/yyyy hh:mm AM/PM, "d MMM yyyy"...) with sanity window
     (past year → +1 day)
   │
   ▼
6. Ambiguity detection  (if-not-you, suspicious, fraud, multiple amounts,
   2+ "!"s, >500 chars, URLs) → penalties
   │
   ▼
7. Confidence score → classification
   high ≥ 0.75 (auto-show modal)
   low  ≥ 0.50
   ignore < 0.50
   │
   ▼
8. Safety rule  if sender is NOT a recognized bank AND confidence < 0.65
   → REJECT (parser.ts:66-68)
```

### 6.2 The confidence model — `confidence.ts` + `types.ts:63-81`

A weighted additive score with penalties (sum of weights = 1.0):

| Feature | Weight | Penalty |
|---|---|---|
| Recognized bank sender | 0.25 | — |
| Valid amount parsed | 0.30 | — |
| Merchant extracted | 0.20 | — |
| Transaction keyword present | 0.15 | — |
| Account digits present | 0.05 | — |
| Timestamp extracted | 0.05 | — |
| Ambiguous keyword | — | −0.20 |
| Multiple amounts | — | −0.15 |
| Suspicious formatting | — | −0.10 |

Result clamped to [0, 1], rounded to 2dp.

**Why a weighted model instead of "did the regex match"?** A single successful regex match is fragile — a promo SMS can contain the word "debited". The weighted model fuses *independent evidence signals* (sender authority, amount presence, merchant, context keywords...), so no single signal can force a transaction through. This is a **naive-Bayes-style ensemble without the probability math** — deliberately simple, testable, and tunable via `setConfidenceConfig`.

### 6.3 Deduplication — `deduplication.ts`

Banks frequently send the same SMS twice (duplicate SMS, MMS re-delivery, retry). Three layers:

1. **Content hash**: `generateTransactionHash` = FNV-style 32-bit hash + XOR-rotate hash, combined over `amount|merchant|type|accountLast4|dateKey(YYYY-M-D-H-min)` → a deterministic fingerprint (`:30-50`).
2. **Persisted cache**: AsyncStorage key `sms_dedup_hashes`, max 200 entries (evict oldest), lazy-loaded once, write-locked to avoid races (`:84-95`).
3. **Time window**: same hash re-processed within 2 minutes is skipped (`isDuplicateWithinWindow`), plus a 100ms debounce on the native event (`smsListener.ts`).

**Why hashing instead of storing raw SMS?** Privacy: no message content is ever persisted; only a one-way digest of the transaction facts. And hashing identical content is O(1) to compare.

### 6.4 The confirmation UX

`SmsTransactionModal` is mounted globally at the root. When `sms.lastDetectedTransaction` + `showConfirmation` are set:
- Modal springs open with a **pre-filled, editable** form (amount, merchant, category, type).
- Low-confidence detections show "Low confidence — please review carefully".
- **Confirm** → `addExpense({..., paymentMethod: 'bank_transfer', description: 'Auto-detected: <merchant>'})` → goes straight into the offline queue → syncs like any other expense. This is the elegant part: **the SMS pipeline produces a normal expense, so it inherits offline-first behavior for free.**

### 6.5 Accuracy testing — why "99%"

`tests/sms/samples.ts` contains 200 realistic SMS samples (120 debit, 40 credit, 20 OTP, 20 promo). `smsParser.test.ts` enforces hard thresholds:
- ≥ 95% overall parse accuracy
- ≤ 3% false positives
- average confidence ≥ 0.6
- **100%** OTP/promo rejection
- ≥ 70% merchant substring extraction

The "99%" claim in the README comes from tuning the patterns against this corpus — a regression harness, not a guess.

### 6.6 Permission flow — `smsPermission.ts`

Android-only (the pipeline is gated by `Platform.OS !== 'android'` in `parser.ts:36`). Uses `expo-notifications`' `READ_SMS`/`RECEIVE_SMS` permission requests. Handles all 4 outcomes: granted / denied / never_ask_again (deep-link to Settings) / unavailable. The privacy dialog explicitly claims "parsed locally and never sent" — which the architecture actually honors (nothing SMS-related ever hits the network).

---

## 7. Backend Architecture

### 7.1 The layered pattern

```
Route (HTTP verb + path + middleware)
   → validators (Joi, at route level)
   → protect (JWT, at route level)
   → controller (thin: parse req, call service, wrap response, next(err))
   → service (ALL business logic: queries, aggregations, mutations)
   → model (Mongoose schema, hooks, virtuals)
```

**Why this layering?**
- **Controllers stay thin** → business logic is unit-testable without HTTP (`recurring.service.test.js` runs `processDueRecurringTransactions()` directly).
- **Services own all queries** → every query is scoped `{ user: userId }` in exactly one place (data isolation becomes reviewable in one file).
- **Routes are declarative** → you can see validation + auth middleware at a glance.

### 7.2 Middleware pipeline order (`app.js:16-78`)

| # | Middleware | Why at this position |
|---|---|---|
| 1 | `helmet()` | Security headers before anything can respond |
| 2 | `mongoSanitize()` | Strip `$`/`.` before body parsing → kills NoSQL injection |
| 3 | `hpp()` | Neutralize duplicate-param attacks |
| 4 | `cors()` | Env-configured origin (default `*` for dev) |
| 5 | `express.json({limit:'10mb'})` | Body parsing with payload cap |
| 6 | Request logger (Winston, skipped in test) | Observability |
| 7 | `apiLimiter` (100 req / 15 min) | Global rate limit on `/api/v1/*` |
| 8 | Routers (`/api/v1/*` and backward-compat `/api/*`) | Versioned + legacy mounts |
| 9 | `GET /api/health` | Deploy health checks |
| 10 | `errorHandler` | Centralized error normalization |
| 11 | 404 handler | Last resort |

### 7.3 Auth flow

1. **Register**: Joi validates → duplicate-email check → `User.create` → pre-save hook bcrypt-hashes (salt rounds 10, only if `isModified('password')`) → 201 with token.
2. **Login**: `findOne({email}).select('+password')` (password is `select: false` by default, re-enabled explicitly) → `matchPassword` → 200 with profile + fresh JWT. Generic error message `'Invalid email or password'` — **no user enumeration**.
3. **Every protected route**: `protect` middleware — extract `Bearer <token>` → `jwt.verify` → `User.findById(decoded.id).select('-password')` (reloads user each request → instantly invalidates deleted users) → attach `req.user`.
4. **Profile update**: merges fields, `??` preserves `budgetLimit: 0`, reassigning `password` triggers the re-hash hook; returns a **fresh token** (so the client always has a valid one).

JWT payload is minimal (`{ id }`), signed with `JWT_SECRET` (no default — must be env-provided in production), expiry `7d` default.

### 7.4 The response envelope

Every endpoint returns the same shape — this is a contract that makes client error handling uniform:

```json
{ "success": true, "message": "...", "data": { ... } }
```

Errors: `{ "success": false, "message": "..." }` (stack only in dev).

### 7.5 Pagination & filtering (`expense.service.js:7-41`)

`GET /expenses?page=1&limit=20&category=food&type=expense&startDate=...&endDate=...&sort=-date`

- `Promise.all([find().sort().limit().skip(), countDocuments(filter)])` — parallel query + count (2× faster than sequential).
- Sort parse: `-field` → `-1`, else `1`.
- Returns `{ expenses, totalPages, currentPage, totalItems }`.
- **Joi validates the query and reassigns `req.query = value`** — coercion (strings → ints) and defaulting happen in the validator, not in the service.

---

## 8. Recurring Transactions Engine

**Files:** `recurring.service.js` (100 lines) + `cron.service.js` (33 lines)

### 8.1 The schedule

`cron.service.js:12` — `'0 * * * *'` (hourly, at minute 0, server-local time). Started only after `app.listen` succeeds; stopped on SIGTERM/SIGINT.

**Why an hourly cron instead of a per-user timer?** A background sweep is stateless, survives server restarts (due items are found by query, not by in-memory timer), and costs nothing when idle (empty query result). Per-device timers would drift, die with the app, and require push infrastructure.

### 8.2 The algorithm — `processDueRecurringTransactions()` (`:24-88`)

```
1. Query: Expense.find({ isRecurring: true,
     frequency: { $in: ['daily','weekly','monthly'] },
     nextRunDate: { $lte: now } })                    ← global sweep, indexed
2. None due → { processed: 0 }
3. For each due template (try/catch per item — one failure can't kill the batch):
   a. IDEMPOTENCY GUARD: if lastProcessedDate exists AND
        now - lastProcessedDate < minInterval × 0.9   → skip
        (minInterval: daily = 24h, weekly = 7d, monthly = 28d)
   b. CLONE: create a REAL expense from the template
        (same user/amount/type/category/paymentMethod,
        description + " (recurring)", date = now,
        isRecurring = false, syncStatus = 'synced')
   c. ADVANCE: template.nextRunDate = getNextRunDate(frequency, now)
        (daily +1 day, weekly +7 days, monthly +1 month),
        template.lastProcessedDate = now, save()
   d. RECOMPUTE: budgetService.recalculateForExpense(user, category, now)
4. Return { processed, errors }
```

### 8.3 Why the idempotency guard exists

The cron fires hourly, but a daily template is only due once per day. The guard `minInterval × 0.9` (daily: ≥ 21.6h elapsed) prevents:
- Double-processing from cron overrun or overlapping instances,
- Re-processing if a request races the cron.

**Two layers of protection**: (1) `nextRunDate` is advanced at processing time so the sweep query won't match again; (2) `lastProcessedDate` window as a second check. The ×0.9 tolerance absorbs clock jitter without ever allowing two runs in the same frequency period.

### 8.4 Design subtleties worth understanding

- **No backfill**: `nextRunDate` is recomputed from `now`, not from the template's original schedule. If the server was down when a daily expense was due, the missed occurrence is simply skipped — the schedule shifts forward. This is a deliberate tradeoff: financial *deductions* shouldn't be retroactively applied after downtime.
- **JS Date rollover**: monthly from Jan 31 → `setMonth(+1)` = Feb 31 → JS rolls to Mar 3. The tests document this as "next run is always in the future" rather than calendar-exact.
- **"Recurring" is a template, not a real transaction**: the template itself is an expense record; "processing" creates a non-recurring clone. Deduction is implicit — budgets are recomputed from actual expense docs, so no separate deduction bookkeeping exists. This keeps one source of truth (real transactions).
- **`localId: 'recurring_<templateId>_<Date.now()>'`** — deterministic-ish, so even server-created clones fit the offline schema.

---

## 9. Budget Engine

**File:** `budget.service.js` (152 lines)

### 9.1 The model

A budget is `{ user, category, amount, month, year, totalSpent }` with:
- **Virtuals** `percentageUsed` (rounded to 2dp) and `remainingAmount` (`max(amount - totalSpent, 0)` — never negative).
- **Unique compound index** `{ user, category, month, year }` → one budget per category/month enforced at the DB level (duplicate → error 11000 → mapped to 409 in the error handler).

### 9.2 Spending computation — `recalculateSpent(budget)` (`:92-115`)

```
Aggregation pipeline:
  $match: { user, category, type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth } }
  $group: { _id: null, totalSpent: { $sum: '$amount' } }
```

The month window is computed with the `new Date(year, month, 0, 23:59:59.999)` trick (day 0 = last day of previous month; index 11 → next January).

**Why denormalize `totalSpent` and recompute it, instead of `$inc` on every expense?** Recomputation is **self-healing**: if any write path forgets to update, or data is corrected/deleted, the next recalculation converges to the truth. Incremental `$inc` would drift silently the moment one path forgets. The cost — an aggregation on each write — is acceptable at this scale.

### 9.3 When recalculation fires

| Event | Service call |
|---|---|
| Expense created (type = expense) | `recalculateForExpense` (expense.service:68) |
| Expense updated (new category AND old category if changed) | `recalculateForExpense` × 2 (expense.service:98,101) |
| Expense deleted | `recalculateForExpense` (expense.service:117) |
| Recurring clone created | `recalculateForExpense` (recurring.service:72) |
| Offline batch sync | `recalculateAllForUser` — all current-month budgets (expense.service:149) |
| Budget created/updated | `recalculateSpent` on that budget |

`recalculateForExpense` derives month/year **from the expense's date** — so editing an old expense updates the right month's budget, not the current one.

---

## 10. Insights & Anomaly Detection

**Files:** `insight.service.js` (267 lines)

### 10.1 Basic insights (`getBasicInsights`) — 5 parallel aggregations

`Promise.all` over:
1. Current-month totals by `$type` (expense/income)
2. Previous-month totals (for comparison)
3. Category breakdown: `$group { _id: category, total, count }` sorted desc
4. Daily breakdown: `$group` by `$dateToString '%Y-%m-%d'` + type
5. **Monthly trend**: last 6 months grouped by `{month, year, type}`

Then computes `expenseChange = ((current - prev) / prev) × 100` with a guard: if `prev === 0` → `100` if current > 0, else `0` (avoids divide-by-zero).

### 10.2 Advanced insights — the anomaly detector (`detectAnomalies`, `:232-264`)

**Statistical method: z-scores (standard score) on a 6-month window of expenses.**

```
1. < 5 expenses → { detected: false, "Not enough data" }
2. mean μ = Σx / N ; variance = Σ(x−μ)² / N ; stdDev = √variance
   (POPULATION std dev — N, not N−1; expenses ≈ the whole population of
   interest, not a sample)
3. stdDev == 0 → { detected: false, "All expenses are identical" }
4. zScore(x) = (x − μ) / stdDev  (rounded to 2dp)
5. Outlier if |zScore| > 2   (≈ 95% of a normal distribution lies within
   2 std devs — a standard statistical threshold)
6. Sort by |z| desc, keep top 5
```

**Why z-scores instead of a fixed amount threshold?** A fixed threshold ("anything > ₹10,000") is wrong for a student with ₹5,000/month vs. a professional with ₹200,000/month. Z-scores are **scale-invariant and personal** — they flag deviations from *your own* spending history. A ₹15,000 expense is normal for one user and a 6σ event for another.

Companion analytics:
- **Monthly spending growth**: sequential month-over-month rates; `averageGrowthRate` = mean (requires ≥ 2 months).
- **Top categories**: current month, `$limit: 3`, with total/count/avg.
- **Weekday vs weekend**: `$dayOfWeek` (Mongo: 1=Sun, 7=Sat) → `isWeekend ∈ {1,7}` → totals and a human-readable comparison string.

---

## 11. Database Design

### 11.1 Collections & schemas

**users**
| Field | Type / constraints |
|---|---|
| name | String, required, trim |
| email | String, **unique**, lowercase, trim, regex |
| password | String, required, min 6, **`select: false`**, bcrypt-hashed (pre-save hook, salt 10) |
| budgetLimit | Number, default 0 |
| currency | String, default `'INR'` |
| timestamps | createdAt / updatedAt |

**expenses** (the workhorse)
| Field | Type / constraints |
|---|---|
| user | ObjectId ref User, **required** |
| amount | Number, required |
| type | enum `expense`/`income` |
| category | enum of **20 categories**, required |
| description | String, trim |
| paymentMethod | enum: cash, credit_card, debit_card, bank_transfer, upi, other |
| date | Date, default now |
| isRecurring | Boolean |
| frequency | enum daily/weekly/monthly/null |
| nextRunDate / lastProcessedDate | Date (recurring engine) |
| **localId** | String (offline sync key) |
| **syncStatus** | enum synced/pending/conflict |

**budgets**
| Field | Type / constraints |
|---|---|
| user | ObjectId ref User |
| category | enum (same 20) |
| amount | Number, min 0 |
| month / year | Number (1-12 / required) |
| totalSpent | Number, default 0 (denormalized) |

### 11.2 Indexes — why each one exists

| Index | Powers |
|---|---|
| `{ user: 1, date: -1 }` | Main list query (user's expenses newest-first) |
| `{ user: 1, category: 1 }` | Category filtering + budget recalc aggregation |
| `{ user: 1, type: 1, date: -1 }` | Type + date filters |
| `{ user: 1, category: 1, type: 1, date: -1 }` | Composite filter queries |
| `{ isRecurring: 1, nextRunDate: 1 }` | **The hourly cron sweep** — scans only due templates across all users |
| `{ user: 1, localId: 1 }` | Offline sync upsert lookup |
| `{ user, category, month, year }` **UNIQUE** | One budget per category/month — enforces integrity at the DB |
| `{ user, month, year }` | Current-month budget listing |

**Why compound (multi-field) indexes?** A query like `{user, category, type, date}` can only use ONE index efficiently. The composites are ordered to match the *equality → range* pattern: equality fields (`user, category, type`) first, the range field (`date`) last. Mongo also uses index prefixes, so `{user, category, type, date}` serves queries with any prefix of those fields.

### 11.3 Why MongoDB over SQL for this app?

- The insight queries are **aggregation-native**: `$dateToString`, `$dayOfWeek`, `$group` with sums/counts/avgs are one pipeline each; in SQL these would be 5–6 `GROUP BY` queries with date functions in dialect-specific syntax.
- **Schema flexibility**: `localId`, `syncStatus`, recurring fields were added mid-project without migrations.
- The domain has no relational joins — expenses/budgets reference users by ID but are always queried per-user.

---

## 12. Security Architecture

**Layered defense-in-depth** — each layer catches what the one before missed:

| Layer | Threat mitigated |
|---|---|
| `helmet()` | Header-based attacks (CSP, X-Frame-Options, HSTS, nosniff) |
| `express-mongo-sanitize` | **NoSQL injection** (`{ $gt: '' }`, `{ $ne: null }` payloads) — strips `$` and `.` from all keys |
| `hpp()` | HTTP parameter pollution (`?category=food&category=salary`) |
| CORS (env origin) | Cross-origin abuse |
| 10 MB JSON limit | Payload flooding |
| Global rate limiter (100/15min) | API abuse / DoS |
| Auth limiter (20/15min on register+login) | **Brute force / credential stuffing** |
| Joi validation with `stripUnknown` | Mass-assignment — unknown body fields silently dropped |
| `protect` middleware (JWT verify + user reload) | Forged/expired tokens; deleted users get 401 |
| Service-level `{ user }` scoping on EVERY query | **IDOR** — user B can't read/edit user A's expenses (404, not 403 — no existence leak) |
| bcrypt (salt 10) + `select: false` + `select('+password')` only in login | Password compromise / accidental leakage |
| Generic login error | User enumeration |
| Centralized error handler | Stack traces hidden in production; DB errors mapped to correct HTTP codes (Validation→400, duplicate→409, CastError→400, JWT→401, expired→401) |
| Budget unique index + 11000 handler | Duplicate budgets → 409 |

---

## 13. Testing Strategy

### 13.1 Test pyramid as implemented

| Layer | Tooling | What's covered |
|---|---|---|
| SMS parser (client) | Jest | 200-sample corpus, ≥95% accuracy, ≤3% false positives, 100% OTP/promo rejection |
| Service units (server) | Jest + mongodb-memory-server | recurring engine (idempotency, date math, cloning), budget recalc matrix, expense CRUD + full pagination matrix, anomaly detection pure function (known z-scores, top-5 cap, stdDev-0 case) |
| Integration (server) | Supertest against real Express app | register → login → JWT → create → list; budget auto-update; Joi rejections; expired token → 401; duplicate budget → 409; envelope shape; health endpoint |
| Edge cases | Jest | 500-row volume, 20 concurrent creates (no loss), fractional precision (33.33×2 + 33.34 = 100), DST/month-boundary, rapid double-cron, multi-user isolation |
| Performance | Artillery | warmup → ramp 20→100/s → sustained 100/s → burst 200/s; **SLO: p95 < 500ms, p99 < 1000ms** |

### 13.2 Infrastructure decisions

- **`mongodb-memory-server`** — a real MongoDB binary in RAM per test run: tests exercise real indexes, real uniqueness, real aggregation — no mocking lies.
- **`deleteMany({})` after each test** — full isolation; order-independent tests.
- **`--runInBand --forceExit`** — serial execution avoids port/DB contention; forceExit prevents open-handle hangs.
- **Setup** (`tests/setup.js`) spins up the memory server in `beforeAll`, tears down in `afterAll`.

### 13.3 What the tests reveal about design quality

The recurring tests assert the *invariants* ("next run always in the future", "second run processes 0") rather than exact dates — acknowledging the JS Date rollover quirk as documented behavior. The anomaly tests feed known distributions and assert exact z-scores — pure functions are tested deterministically.

---

## 14. Deployment & Operations

- **Render** (`render.yaml`): free web service, `npm ci` → `node index.js`, health check on `/api/health`, env vars: `NODE_ENV=production`, `MONGODB_URI` (manual), `JWT_SECRET` (auto-generated), `JWT_EXPIRE=7d`, `PORT=5001`, `RATE_LIMIT_MAX=100`.
- **Dockerfile**: `node:20-alpine`, production-only install, `mkdir logs`, port 5001.
- **Client**: Expo EAS build / OTA updates via the managed workflow.
- **Dev networking**: the client talks to `http://<LAN-IP>:5001/api` — the developer edits `YOUR_IP` in `apiClient.ts`; Android needs `usesCleartextTraffic: true` (app.json) because LAN IPs aren't HTTPS.
- **Cron** only starts after the HTTP listener is up (no sync work while the API is still booting); SIGTERM/SIGINT stop the cron before exit.

---

## 15. Design Decisions, Tradeoffs & Logic

### 15.1 Why each major choice was made

| Decision | Logic | Alternative rejected |
|---|---|---|
| **Offline-first / optimistic writes** | Finance apps must never block on network; local-first makes the app feel instant and keeps working in transit/basements. The pending queue makes every write durable before any server contact. | Network-only (breaks offline, bad UX) |
| **Manual AsyncStorage persistence instead of redux-persist** | Full control over *what* and *when* is persisted; the sync engine needs to co-read the queue anyway; redux-persist's auto-rehydration caused hydration-order bugs. The cost: more code, but explicit. | redux-persist (black-box serialization, rehydrate races) |
| **Batch sync endpoint vs per-item calls** | One round-trip per reconnect; server acks each `localId`; atomic from the client's view. | N× individual POSTs |
| **`localId`-keyed upsert** | Idempotency — retries can't duplicate. Both sides agree on a client-generated key. | Server-only IDs (unknown offline) |
| **Regex pattern engine for SMS, not ML** | Deterministic, debuggable, no model hosting, no training data requirement, and the corpus tests guarantee the accuracy claim. ML would need labeled data and model updates to keep pace with new bank formats. | ML/NLP model |
| **Weighted confidence scoring** | Multiple independent evidence signals must align before auto-detection; single-signal regexes produce false positives. | Single-regex match |
| **Local-only SMS processing** | Privacy is a product requirement ("never sent"); also means zero backend work for the feature. | Server-side parsing (privacy breach) |
| **Denormalized `totalSpent` + recomputation** | Self-healing consistency; correct even if a write path is forgotten; simple to reason about. | Atomic `$inc` (silent drift) |
| **Hourly cron sweep for recurring** | Stateless, restart-safe, indexed query, near-zero idle cost. | Per-device/local timers (die with app) |
| **Idempotency via `nextRunDate` + `lastProcessedDate` window** | Two independent guards so even a double-firing cron or a race can't double-charge. | Relying on the cron firing exactly once |
| **Z-score anomaly detection** | Personal, scale-invariant statistics; `\|z\|>2` ≈ 95% bound is a textbook, explainable threshold. | Fixed amount thresholds |
| **JWT + reload user per request** | Stateless scaling; deleted users are rejected immediately (fresh DB read each request). | Session store, embedded-only claims |
| **Joi with `stripUnknown`** | Validation + mass-assignment defense in one declarative layer. | Hand-rolled `if` chains |
| **MongoDB aggregation for insights** | The queries are one pipeline each; flexible schema for evolving features. | SQL joins (this domain has none) |
| **`en-IN` currency formatting** | `Intl.NumberFormat('en-IN')` gives Indian digit grouping (1,23,456.78) — the correct local UX. | US grouping (1,234,567.89) |

### 15.2 The three "system design philosophies" of this codebase

1. **Local-first, eventual consistency.** Every write is durable locally before the network exists; the server is a convergence point, not a gatekeeper. The merge rule ("server wins, pending stays") is the entire conflict protocol, and it's enough because there's a single writer per user.
2. **Consistency by recomputation, not maintenance.** Budget totals, sync statuses, and recurring schedules are all derived from source data and recomputed at write time. Nothing drifts because nothing is maintained incrementally.
3. **Security as a pipeline, not a feature.** Every request passes through an ordered chain where each stage removes one class of attack, and every query in the service layer is user-scoped by construction.

### 15.3 Logic deep-dives (trace these end-to-end)

**A. What happens when a user adds an expense on airplane mode?**
1. `addExpense` reducer: item created with `localId`, `syncStatus:'pending'`, pushed to `items` + `pendingQueue`, both persisted to AsyncStorage.
2. `syncPending()` called fire-and-forget → NetInfo check fails → returns silently.
3. Home shows the expense instantly; `pendingCount` badge shows 1; `SyncIndicator` shows offline.
4. Airplane mode off → NetInfo reconnect event → `syncPending()` → `POST /expenses/sync` → acks map via `markAsSynced` → queue empties, badge clears.

**B. An SMS arrives: "Rs.450.00 debited from a/c **1234 on 15/07/2026 at Swiggy. If not you, call us."**
1. Pre-filter: sender `VM-HDFCBK` recognized → proceed.
2. Classify: DEBIT pattern `Rs.X debited` → 'debit'.
3. Extract: amount 450.00 (passes 1–1M guardrail), merchant "Swiggy" (via `at` pattern), account 1234, timestamp parsed.
4. Ambiguity: "If not you" keyword → −0.20 penalty.
5. Confidence: 0.25 (bank) + 0.30 (amount) + 0.20 (merchant) + 0.15 (keyword) + 0.05 (account) + 0.05 (timestamp) − 0.20 = **0.80** → 'high'.
6. Hash dedup check → new → recorded.
7. Modal pops with Swiggy/₹450 prefilled → user confirms → `addExpense` → offline queue → syncs normally.

**C. Why does an OTP SMS never become an expense?**
`IGNORE_PATTERNS` match (OTP/verification code) → classified 'ignore' before any extraction; even if it slipped through, no transaction keyword/amount structure means the confidence sum can't reach 0.50; and the test corpus enforces 100% rejection.

**D. The server is down when cron fires — what happens to recurring expenses?**
`nextRunDate` was never advanced, so on restart the sweep finds them due and processes them once. No backfill (schedule shifts from now), and the `lastProcessedDate` guard prevents a double-process if the cron fires twice close together.

**E. Two devices, same account, both offline.**
Both create expenses locally with unique `localId`s. When each reconnects, `syncBulk` upserts by `localId` — no collision because `localId`s are globally unique (timestamp+random). The merge rule in `fetchFromServer` keeps each device's pending rows. This design tolerates multi-device offline better than most student projects, though edits of the *same* expense from two devices still resolve last-writer-wins.

---

## 16. Known Limitations & Improvements

| # | Limitation | Improvement path |
|---|---|---|
| 1 | **Hardcoded API base URL** (`apiClient.ts:8-11`) — requires manual IP edit per developer | `EXPO_PUBLIC_API_URL` env var; auto-discover via Expo dev server host |
| 2 | **401 clears AsyncStorage but doesn't dispatch Redux logout** — in-memory auth stays until next action | Dispatch `logout()` from the interceptor |
| 3 | **Pull sync caps at `limit: 100`** — users with >100 server expenses may lose older local rows in the merge | Paginated pull with cursor (`since` timestamp), or local-first merge |
| 4 | **No retry/backoff in the sync engine** — depends on NetInfo events + manual refresh | Exponential backoff with jitter + a sync timer while pending items exist |
| 5 | **`budgetSlice` missing rejected handlers** for create/update/delete — a failed create leaves `isLoading=true` | Add `.rejected` cases |
| 6 | **`formatCurrency` shows 2 decimals** despite the "no decimals" intent | `maximumFractionDigits: 0` for whole amounts |
| 7 | **Deletes are local-only when offline** — a deleted pending item vanishes locally but reappears after next pull | Tombstone queue: track deleted `localId`s and sync `DELETE`s |
| 8 | **Backward-compat `/api/*` mounts lack the rate limiter** (only `/api/v1/*` is limited) | Mount the limiter per-router |
| 9 | **Graceful shutdown doesn't close HTTP server or DB** (`index.js:21-31`) | `server.close()` + `mongoose.disconnect()` in shutdown handlers; add `unhandledRejection` handler |
| 10 | **Monthly recurring uses JS date rollover** (Jan 31 → Mar 3) | Clamp to last day of target month |
| 11 | **SMS pipeline is Android-only** (by design — iOS blocks SMS access) | iOS workaround: notification-based detection |
| 12 | **No conflict resolution for same-expense multi-device edits** | `updatedAt`-based last-writer-wins or per-field merge |
| 13 | **Z-scores assume roughly normal distributions** — skewed spending can under/over-flag | Median Absolute Deviation (MAD) — robust to skew |

---

## 17. Key File Reference Map

### Client
| Concern | Location |
|---|---|
| Store config + serializable overrides | `src/store/index.ts:9-33` |
| Token/user persistence in reducer | `src/store/slices/authSlice.ts:43-44` |
| Optimistic add → pending queue | `src/store/slices/expenseSlice.ts:81-95` |
| markAsSynced ack | `src/store/slices/expenseSlice.ts:141-156` |
| NetInfo reconnect trigger | `src/services/syncEngine.ts:22-32` |
| Batch push sync | `src/services/syncEngine.ts:48-88` |
| Pull + merge + sort | `src/services/syncEngine.ts:91-156` |
| Base URL / interceptors | `src/store/api/apiClient.ts:8-47` |
| SMS normalize/classify/extract | `src/services/sms/pipeline.ts:22-251` |
| parseSms orchestration + safety rule | `src/services/sms/parser.ts:25-85` |
| Confidence weights/thresholds | `src/services/sms/types.ts:63-81`, `confidence.ts:26-54` |
| Dedup hash + time window | `src/services/sms/deduplication.ts:16-111` |
| Category keyword map | `src/services/categoryDetector.ts:7-152` |
| Listener pipeline + dev simulators | `src/services/smsListener.ts:23-167` |
| Permission flow | `src/services/smsPermission.ts:6-107` |
| Hydration + auth gate | `app/_layout.tsx:35-108` |
| Add expense + budget alert + sync kick | `app/expense/add.tsx:52-100` |
| SMS → expense bridge | `src/components/sms/SmsTransactionModal.tsx:77-94` |
| INR formatter | `src/utils/formatters.ts:3-13` |
| Design tokens | `src/theme/index.ts:3-146` |

### Server
| Concern | Location |
|---|---|
| Middleware pipeline | `app.js:16-78` |
| Env config / defaults | `config/environment.js` |
| Winston logger | `config/logger.js` |
| JWT protect | `middleware/auth.js:6-28` |
| Rate limiters | `middleware/rateLimiter.js` |
| Error normalization (AppError) | `middleware/errorHandler.js:4-56` |
| Joi validate/validateQuery | `middleware/validate.js` |
| User model (hash hook) | `models/User.js:47-58` |
| Expense schema + 6 indexes | `models/Expense.js` |
| Budget schema + virtuals + unique index | `models/Budget.js:47-58` |
| Expense CRUD, pagination, syncBulk | `services/expense.service.js:7-149` |
| Budget recalc pipeline | `services/budget.service.js:92-115` |
| **Recurring algorithm** | `services/recurring.service.js:24-88` |
| Cron schedule | `services/cron.service.js:12` |
| **Anomaly detection (z-scores)** | `services/insight.service.js:232-264` |
| Test setup (memory DB) | `tests/setup.js` |
| Artillery load profile + SLOs | `tests/performance/artillery.yml` |

---

## 18. Exam / Interview Prep Questions

### Architecture
1. Draw the full request lifecycle for `POST /api/v1/expenses` — every middleware in order, then controller → service → model → response envelope.
2. Why is the service layer separate from controllers? What breaks if controllers query the DB directly?
3. The client uses 6 Redux slices — justify each slice and what would happen if you merged `sync` into `expenses`.
4. Why does the root layout hydrate from AsyncStorage instead of using redux-persist? What failure mode does that prevent?
5. `GET /api/expenses/insights` is mounted *before* `GET /expenses/:id` in the router. Why? (Route matching order — `:id` would swallow "insights".)

### Offline sync
6. Walk through the full lifecycle of an expense created on airplane mode: reducer → queue → persistence → reconnect → batch sync → ack → budget recalc. Name the exact files/functions.
7. Why is the sync endpoint keyed by `localId`? What makes it idempotent?
8. What is the merge rule in `fetchFromServer`, and what scenario would it mishandle? (Hint: >100 server expenses, or deleted-pending items.)
9. How would you add tombstone-based offline deletes without breaking existing clients?

### SMS pipeline
10. Explain the confidence model — list the 6 weights and 3 penalties. Why does an unrecognized sender get a 0.65 gate *in addition to* the 0.75/0.50 thresholds?
11. Why hashing for dedup instead of storing message content? What happens when the cache fills (200 entries)?
12. Design a new bank format ("KOTAK: Txn of INR 500 at DMART via UPI") — which patterns would catch it, what would its confidence be, and would it auto-show?
13. What makes the "99% accuracy" claim defensible? (Corpus + thresholds.)

### Recurring & budget
14. Describe the recurring sweep with the idempotency guard. Why `minInterval × 0.9` and not `minInterval`?
15. Why is `totalSpent` recomputed via aggregation instead of `$inc`? Give a concrete failure mode for `$inc`.
16. An expense is edited from category A (March) to category B (April). Which budgets get recalculated and why?

### Security
17. Enumerate every layer that stops a NoSQL-injection payload. Which one is load-bearing?
18. Why does cross-user access return 404 instead of 403? Is that a good choice?
19. `JWT_SECRET` and `MONGODB_URI` have no defaults in `environment.js` — what does that force, and what happens in dev?

### Data & analytics
20. Why population (÷N) std dev in the anomaly detector? When would MAD be better?
21. Justify the 6 expense indexes against the queries in `expense.service.js`. Why is the composite ordered equality-then-range?

---

*This guide was generated from direct analysis of the source code in this repository. Line references point to the current `master` revision.*
