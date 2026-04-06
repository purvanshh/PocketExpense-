# PocketExpense+ — Production-Grade Offline-First Financial Tracking System

A full-stack financial tracking application featuring automated recurring transaction processing, category-based budgeting, aggregation-driven analytics with anomaly detection, Android SMS-based automatic expense detection with 99% parsing accuracy, and rate-limited JWT-secured REST APIs — all built on an offline-first architecture.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [ER Diagram](#er-diagram)
- [Database Schemas](#database-schemas)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Feature 1 — Authentication System](#feature-1--authentication-system)
- [Feature 2 — Expense Management (CRUD + Offline Sync)](#feature-2--expense-management-crud--offline-sync)
- [Feature 3 — Category-Based Budgets](#feature-3--category-based-budgets)
- [Feature 4 — Recurring Transactions Engine](#feature-4--recurring-transactions-engine)
- [Feature 5 — Advanced Filtering + Pagination](#feature-5--advanced-filtering--pagination)
- [Feature 6 — Smart Insights Engine](#feature-6--smart-insights-engine)
- [Feature 7 — Production Hardening](#feature-7--production-hardening)
- [Feature 8 — Android SMS Transaction Detection](#feature-8--android-sms-transaction-detection)
- [API Reference](#api-reference)
- [Request / Response Examples](#request--response-examples)
- [Database Indexes](#database-indexes)
- [Testing](#testing)
- [Performance Testing](#performance-testing)
- [Security Checklist](#security-checklist)
- [Privacy & SMS Data Handling](#privacy--sms-data-handling)
- [Project Structure](#project-structure)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Design System](#design-system)
- [Tradeoffs & Decisions](#tradeoffs--decisions)
- [Scalability Path](#scalability-path)
- [License](#license)

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React Native | 0.81.5 | Cross-platform mobile UI |
| Expo SDK | 54.0.33 | Managed workflow, OTA updates |
| Expo Router | 6.0.23 | File-based routing (typed routes) |
| Redux Toolkit | 2.11.2 | State management |
| React Redux | 9.2.0 | React bindings for Redux |
| Axios | 1.13.2 | HTTP client |
| AsyncStorage | 2.2.0 | Local persistence (offline-first) |
| NetInfo | 11.4.1 | Network state detection |
| date-fns | 4.1.0 | Date manipulation |
| Poppins (Google Fonts) | — | Typography |
| React Native Reanimated | 4.1.1 | Animations |
| React Native SVG | 15.12.1 | Vector graphics |
| TypeScript | 5.9.2 | Type safety |
| React Compiler | Experimental | Automatic memoization |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20+ | Runtime |
| Express | 4.18.2 | HTTP framework |
| MongoDB + Mongoose | 8.0.3 | Database + ODM |
| JWT (jsonwebtoken) | 9.0.2 | Authentication tokens |
| bcryptjs | 2.4.3 | Password hashing |
| Joi | 18.0.2 | Input validation |
| Winston | 3.19.0 | Structured logging |
| node-cron | 4.2.1 | Scheduled jobs |
| Helmet | 8.1.0 | Security headers |
| express-mongo-sanitize | 2.2.0 | NoSQL injection prevention |
| hpp | 0.2.3 | HTTP parameter pollution prevention |
| express-rate-limit | 8.2.1 | Rate limiting |
| cors | 2.8.5 | Cross-Origin Resource Sharing |

### Testing

| Technology | Version | Purpose |
|-----------|---------|---------|
| Jest | 30.2.0 | Test runner (frontend + backend) |
| ts-jest | 29.4.6 | TypeScript Jest transform |
| Supertest | 7.2.2 | HTTP assertion library |
| mongodb-memory-server | 11.0.1 | In-memory MongoDB for tests |
| Artillery | — | Load / performance testing |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     React Native (Expo SDK 54)                          │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Home    │  │  Txns    │  │ Analytics│  │ Account  │               │
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
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Middleware Pipeline:                                               │ │
│  │  Helmet → mongoSanitize → HPP → CORS → JSON → Rate Limit → Auth  │ │
│  │  → Joi Validation → Controller → Service → Model                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Auth    │  │ Expenses │  │ Budgets  │  │ Insights │               │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│       ▼              ▼              ▼              ▼                     │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │                    Services Layer                             │      │
│  │  expense.service │ budget.service │ insight.service           │      │
│  │  recurring.service │ cron.service                             │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                          │
│  ┌─────────────────┐         ┌────────────────────────┐                │
│  │ Cron Service    │         │ Winston Logger          │                │
│  │ (hourly)        │         │ (file + console)        │                │
│  └─────────────────┘         └────────────────────────┘                │
│                                                                          │
│               Centralized Error Handler (AppError)                      │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
                 ┌────────▼────────┐
                 │    MongoDB      │
                 │  (Atlas/local)  │
                 └─────────────────┘
```

---

## ER Diagram

```
┌──────────────────┐       ┌──────────────────────────────────┐
│      User        │       │           Expense                │
├──────────────────┤       ├──────────────────────────────────┤
│ _id: ObjectId PK │◄──┐  │ _id: ObjectId PK                │
│ name: String     │   │  │ user: ObjectId FK → User         │
│ email: String UK │   ├──│ amount: Number                   │
│ password: String │   │  │ type: enum [expense,income]      │
│ budgetLimit: Num │   │  │ category: enum [20 values]       │
│ currency: String │   │  │ description: String              │
│ avatar: String   │   │  │ paymentMethod: enum [6 values]   │
│ timestamps       │   │  │ date: Date                       │
└──────────────────┘   │  │ isRecurring: Boolean             │
                       │  │ frequency: enum [d/w/m/null]     │
┌──────────────────┐   │  │ nextRunDate: Date                │
│      Budget      │   │  │ lastProcessedDate: Date          │
├──────────────────┤   │  │ localId: String                  │
│ _id: ObjectId PK │   │  │ syncStatus: enum [3 values]      │
│ user: ObjectId FK├───┘  │ timestamps                       │
│ category: String │      └──────────────────────────────────┘
│ amount: Number   │
│ month: Number    │      Indexes (Expense):
│ year: Number     │      ├─ { user, date }
│ totalSpent: Num  │      ├─ { user, category }
│ timestamps       │      ├─ { user, type, date }
│                  │      ├─ { user, category, type, date }
│ Virtuals:        │      ├─ { isRecurring, nextRunDate }
│  percentageUsed  │      └─ { user, localId }
│  remainingAmount │
│                  │      Indexes (Budget):
│ UK: user+cat+m+y │     ├─ { user, category, month, year } UNIQUE
└──────────────────┘     └─ { user, month, year }
```

---

## Database Schemas

### User

| Field | Type | Constraints |
|-------|------|-------------|
| name | String | Required, trimmed |
| email | String | Required, unique, lowercase, regex validated |
| password | String | Required, min 6 chars, bcrypt hashed, `select: false` |
| budgetLimit | Number | Default: 0 |
| currency | String | Default: `INR` |
| avatar | String | Default: `""` |

### Expense

| Field | Type | Constraints |
|-------|------|-------------|
| user | ObjectId | Required, ref → User |
| amount | Number | Required |
| type | String | Enum: `expense`, `income` |
| category | String | Required, enum: 20 categories |
| description | String | Trimmed, default: `""` |
| paymentMethod | String | Enum: `cash`, `credit_card`, `debit_card`, `bank_transfer`, `upi`, `other` |
| date | Date | Default: `Date.now` |
| isRecurring | Boolean | Default: `false` |
| frequency | String | Enum: `daily`, `weekly`, `monthly`, `null` |
| nextRunDate | Date | Nullable |
| lastProcessedDate | Date | Nullable |
| localId | String | Nullable (offline sync) |
| syncStatus | String | Enum: `synced`, `pending`, `conflict` |

### Budget

| Field | Type | Constraints |
|-------|------|-------------|
| user | ObjectId | Required, ref → User |
| category | String | Required, enum: 20 categories |
| amount | Number | Required, min: 0 |
| month | Number | Required, 1–12 |
| year | Number | Required |
| totalSpent | Number | Default: 0 |
| **Virtual:** percentageUsed | Number | `(totalSpent / amount) * 100` |
| **Virtual:** remainingAmount | Number | `max(amount - totalSpent, 0)` |

---

## Frontend Architecture

### Screens (Expo Router — File-Based)

| Route | Screen | Description |
|-------|--------|-------------|
| `/(auth)/login` | Login | Email + password login, JWT storage |
| `/(auth)/register` | Register | User registration with validation |
| `/(tabs)/` | Home | Balance card, recent transactions, date picker, sync indicator |
| `/(tabs)/transactions` | Transactions | Full list with search, filter modal, sort |
| `/(tabs)/analytics` | Analytics | Spending chart, income/expense breakdown, history |
| `/(tabs)/account` | Account | Profile, budget editing, settings, logout |
| `/expense/add` | Add Expense | Amount input, category grid, date picker, recurring toggle |
| `/expense/[id]` | Edit Expense | Edit/delete existing expense |
| `/budgets` | Budgets | Category budget CRUD with progress bars |
| `/insights` | Insights | Growth trend, top categories, weekday/weekend, anomalies |
| `/settings/sms-detection` | SMS Settings | Toggle, permission status, privacy info (Android only) |

### Redux Store

| Slice | State | Key Actions |
|-------|-------|-------------|
| `auth` | user, token, isAuthenticated, isLoading | hydrateAuth, login, logout, updateBudgetLimit |
| `expenses` | items, pendingQueue, totals | addExpense, updateExpense, deleteExpense, markAsSynced, hydrateExpenses |
| `budgets` | items, loading, error | fetchAll, create, update, delete (async thunks) |
| `insights` | data, loading, error | fetchAdvanced (async thunk) |
| `sync` | isOnline, isSyncing, pendingCount, lastSyncTime | setOnlineStatus, setSyncing, setPendingCount |
| `sms` | isEnabled, permissionStatus, lastDetectedTransaction, showConfirmation, detectionCount | enableSmsDetection, disableSmsDetection, setDetectedTransaction, clearDetectedTransaction |

### Offline-First Sync Engine

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  User adds  │────▶│ Redux Store  │────▶│ AsyncStorage │
│  expense    │     │ (optimistic) │     │ (persist)    │
└─────────────┘     └──────┬───────┘     └──────────────┘
                           │
                    ┌──────▼───────┐
                    │  Is Online?  │
                    └──────┬───────┘
                     yes   │   no
                ┌──────────┴──────────┐
                ▼                     ▼
        ┌───────────┐         ┌────────────┐
        │ POST /api │         │ Add to     │
        │ /expenses │         │ pendingQueue│
        │ /sync     │         └─────┬──────┘
        └───────────┘               │
                              (when online)
                                    │
                              ┌─────▼──────┐
                              │ Bulk sync  │
                              │ via /sync  │
                              └────────────┘
```

### Component Library

| Component | Path | Description |
|-----------|------|-------------|
| Button | `src/components/common/Button.tsx` | 4 variants (primary/secondary/outline/ghost), 3 sizes, loading state |
| Card | `src/components/common/Card.tsx` | 3 variants (default/elevated/flat) with shadow system |
| CustomDatePicker | `src/components/common/CustomDatePicker.tsx` | Month/week navigation modal |
| GradientHeader | `src/components/common/GradientHeader.tsx` | LinearGradient header |
| AmountInput | `src/components/expense/AmountInput.tsx` | Currency-prefixed numeric input |
| CategoryGrid | `src/components/expense/CategoryGrid.tsx` | Selectable grid of 20 categories |
| FilterModal | `src/components/expense/FilterModal.tsx` | Multi-filter: type, category, date range, sort |
| BalanceCard | `src/components/home/BalanceCard.tsx` | Total balance with percent change |
| TransactionItem | `src/components/home/TransactionItem.tsx` | Expense/income row with icon |
| SpendingChart | `src/components/analytics/SpendingChart.tsx` | Bar chart (income vs expense) |
| InsightCard | `src/components/analytics/InsightCard.tsx` | Metric card with icon |
| SyncIndicator | `src/components/sync/SyncIndicator.tsx` | Online/offline/pending status |
| SmsTransactionModal | `src/components/sms/SmsTransactionModal.tsx` | SMS detection confirmation: preview/edit/dismiss |

---

## Backend Architecture

### Layered Design

```
Routes → Middleware → Controllers (thin) → Services (business logic) → Models (Mongoose)
```

- **Controllers** contain zero business logic — they delegate to services and format responses
- **Services** contain all business logic, validation, and aggregation pipelines
- **Models** define schemas, indexes, virtuals, and pre-save hooks
- **Middleware** handles auth, validation, rate limiting, and error handling

### Response Format

Every API response follows this structure:

```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": { ... }
}
```

---

## Feature 1 — Authentication System

- JWT-based authentication with 7-day expiry
- Password hashing via bcrypt (10 salt rounds)
- Password field excluded from queries by default (`select: false`)
- Token injected via Axios interceptor on every request
- 401 responses trigger automatic logout on the client
- Registration validates name, email (regex), password (min 6 chars)
- Login returns user profile + JWT token
- Profile update supports name, budgetLimit, currency, avatar

---

## Feature 2 — Expense Management (CRUD + Offline Sync)

- Create, read, update, delete expenses with full validation
- Each expense has a `localId` for offline-first identification
- `syncStatus` tracks whether an expense is `synced`, `pending`, or in `conflict`
- New expenses are immediately added to Redux store and AsyncStorage
- When online, pending queue is bulk-synced via `POST /api/expenses/sync`
- Server returns `localId → serverId` mappings for reconciliation
- NetInfo listener triggers automatic sync when connectivity is restored
- Supports 20 categories and 6 payment methods

---

## Feature 3 — Category-Based Budgets

- Users create monthly budgets per category (e.g., "Food: ₹5,000 for March 2026")
- Compound unique index prevents duplicate budgets per user + category + month + year
- Virtual fields compute `percentageUsed` and `remainingAmount` in real-time
- Budget `totalSpent` is auto-recalculated on every expense create/update/delete
- Recalculation uses MongoDB aggregation to sum expenses for the matching category/month/year
- Frontend displays progress bars with color-coded over-budget warnings
- Full CRUD: create, list (current month), update amount, delete

---

## Feature 4 — Recurring Transactions Engine

- Expenses can be marked as recurring with frequency: `daily`, `weekly`, or `monthly`
- On creation, `nextRunDate` is computed based on frequency
- `node-cron` runs hourly and finds all recurring expenses where `nextRunDate ≤ now`
- For each due expense, the cron:
  1. Creates a new expense entry (clone of the recurring template)
  2. Updates `nextRunDate` to the next occurrence
  3. Sets `lastProcessedDate` to current timestamp
- **Idempotency guard**: `lastProcessedDate` prevents duplicate creation if cron fires twice
- Recurring transactions also trigger budget recalculation

---

## Feature 5 — Advanced Filtering + Pagination

### Query Parameters

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `page` | Number | `1` | Page number (default: 1) |
| `limit` | Number | `20` | Items per page (default: 20, max: 100) |
| `category` | String | `food` | Filter by category |
| `type` | String | `expense` | Filter by type |
| `startDate` | Date | `2026-01-01` | Start of date range |
| `endDate` | Date | `2026-03-31` | End of date range |
| `sort` | String | `-date` | Sort field (prefix `-` for descending) |

### Response Format

```json
{
  "success": true,
  "message": "Expenses fetched",
  "data": {
    "expenses": [ ... ],
    "totalPages": 5,
    "currentPage": 1,
    "totalItems": 98
  }
}
```

- Count query runs in parallel with data query for performance
- 6 MongoDB indexes cover all common query patterns
- Frontend `FilterModal` provides full UI for all filter parameters

---

## Feature 6 — Smart Insights Engine

### Basic Insights (`GET /api/expenses/insights`)

- Total income and expense for current month
- Category-wise breakdown with spending percentages

### Advanced Insights (`GET /api/insights/advanced`)

| Metric | Method | Details |
|--------|--------|---------|
| Monthly Spending Growth | Aggregation pipeline | 6-month window, month-over-month percentage change |
| Top 3 Categories | `$group` + `$sort` + `$limit` | By total spend, with count and average |
| Weekday vs Weekend | `$dayOfWeek` aggregation | Total, count, and average per transaction |
| Anomaly Detection | Z-score algorithm | Flags expenses > 2 standard deviations from mean |

- All computations use MongoDB aggregation pipelines (no in-memory processing)
- Z-score formula: `z = (value - mean) / stdDev`
- Anomalies include the raw amount, category, date, and z-score value

---

## Feature 7 — Production Hardening

### Input Validation (Joi)

- Every route has a Joi schema for request body and/or query parameters
- Validation middleware strips unknown fields and returns structured error messages
- Separate validators for auth, expenses, and budgets

### Error Handling

- `AppError` class extends `Error` with `statusCode` and `isOperational` fields
- Centralized error handler catches Mongoose validation errors, JWT errors, duplicate key errors, cast errors
- Stack traces are hidden in production responses
- All errors are logged via Winston

### Security Middleware

| Middleware | Purpose |
|-----------|---------|
| Helmet | Sets secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.) |
| express-mongo-sanitize | Strips `$` and `.` from request body/params to prevent NoSQL injection |
| hpp | Prevents HTTP parameter pollution attacks |
| Rate Limiter | 100 requests/15min (API), 20 requests/15min (auth) |
| CORS | Configurable origin whitelist |
| JSON limit | 10MB request body limit |

### API Versioning

- All routes available at `/api/v1/*` (versioned) and `/api/*` (backward-compatible)
- Health check: `GET /api/health`

### Logging (Winston)

- Console transport (colorized, dev-only in development)
- File transports: `logs/error.log` (errors), `logs/combined.log` (all levels)
- Request logging with method, URL, and IP

### Graceful Shutdown

- SIGTERM and SIGINT handlers stop the cron service and exit cleanly

---

## Feature 8 — Android SMS Transaction Detection

### Overview

An optional, privacy-first Android feature that automatically detects bank transactions from incoming SMS messages, extracts structured data locally on-device, and presents a confirmation modal before adding to expenses.

### Pipeline Architecture

```
Incoming SMS (Android OS)
        │
        ▼
┌───────────────────────────────┐
│  smsListener.ts               │  Singleton, 100ms debounce
│  (NativeEventEmitter)         │
└──────────┬────────────────────┘
           │
           ▼
┌───────────────────────────────┐
│  5-Stage Parsing Pipeline     │  ALL processing LOCAL
│                               │
│  1. normalizeMessage()        │  Strip zero-width chars, normalize ₹/INR
│  2. detectSenderMetadata()    │  Match 40+ bank sender ID patterns
│  3. classifyMessageType()     │  debit / credit / ignore
│  4. extractFields()           │  amount, merchant, account, timestamp
│  5. computeConfidence()       │  Weighted 0.0–1.0 scoring
│                               │
│  Guardrails:                  │
│  • Amount: ₹1 – ₹10,00,000   │
│  • Strict decimal parsing     │
│  • Merchant length ≥ 2 chars  │
│  • Min SMS length: 15 chars   │
│  • Sender gating at < 0.65   │
└──────────┬────────────────────┘
           │
           ▼
┌───────────────────────────────┐
│  Deduplication                │  LRU cache (200 entries)
│  • Hash-based (amount+        │  + 2-minute time-window guard
│    merchant+type+acct+date)   │
│  • AsyncStorage-backed        │
└──────────┬────────────────────┘
           │
           ▼
┌───────────────────────────────┐
│  Category Auto-Detection      │  100+ keyword → category mappings
│  (Swiggy→food, Amazon→        │  Covers Indian merchants, banks,
│   shopping, Uber→travel)      │  UPI apps, subscriptions
└──────────┬────────────────────┘
           │
           ▼
┌───────────────────────────────┐
│  Confirmation Modal           │  User can:
│  • Preview (amount, merchant, │  ✓ Confirm → auto-create expense
│    category, type)            │  ✓ Edit before saving
│  • Edit mode (all fields)     │  ✓ Dismiss
│  • Confidence indicator       │
└───────────────────────────────┘
```

### Confidence Scoring Engine

| Signal | Weight |
|--------|--------|
| Recognized bank sender | +0.25 |
| Valid amount parsed | +0.30 |
| Merchant extracted | +0.20 |
| Transaction keyword detected | +0.15 |
| Account digits present | +0.05 |
| Timestamp extracted | +0.05 |

| Penalty | Weight |
|---------|--------|
| Ambiguous keyword (fraud, suspicious) | −0.20 |
| Multiple amounts in message | −0.15 |
| Suspicious formatting (URLs, excess punctuation) | −0.10 |

**Thresholds:**
- `≥ 0.75` → Auto-show confirmation modal (high confidence)
- `0.50–0.74` → Show with "low confidence" banner
- `< 0.50` → Silently ignore
- Unrecognized sender + `< 0.65` → Always ignore (abuse prevention)

### Ignore Patterns (25+)

OTP messages, balance updates, failed transactions, promos, pre-approved loans, EMI offers, cashback offers, upgrade prompts, reversal notices, and URLs.

### Supported Banks & Services

HDFC, SBI, ICICI, Axis, Kotak, PNB, BOI, Canara, Union, IDFC, YES, IDBI, RBL, Federal, Indian, BOB, Central — plus credit card variants (SBICARD, HDFCCC, ICICIC, AXISCC) — plus Paytm, PhonePe, GPay, Razorpay, BHIM, Jio Money, Airtel Money.

### Accuracy Results

```
═══════════════════════════════════════
  SMS PARSER ACCURACY REPORT
═══════════════════════════════════════
  Total samples:        200
  True positives:       158
  True negatives:       40
  False positives:      0
  False negatives:      2
  Accuracy:             99%
  False positive rate:  0%
  Avg confidence:       0.92
═══════════════════════════════════════
```

| Metric | Target | Actual |
|--------|--------|--------|
| Detection accuracy | ≥ 95% | **99%** |
| False positive rate | ≤ 3% | **0%** |
| Debit detection rate | ≥ 95% | **100%** |
| Credit detection rate | ≥ 90% | **95%** |
| OTP rejection | 100% | **100%** |
| Promo rejection | 100% | **100%** |
| Avg confidence score | ≥ 0.6 | **0.92** |

### Permission Flow

1. User navigates to Settings → SMS Detection
2. Toggle triggers `PermissionsAndroid.requestMultiple([READ_SMS, RECEIVE_SMS])`
3. Rationale dialog explains: "Messages are parsed locally and never sent to any server"
4. If `NEVER_ASK_AGAIN` → alert with deep link to device Settings
5. On grant → listener starts, on deny → graceful fallback with explanation

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register (name, email, password) |
| POST | `/api/auth/login` | Public | Login (returns JWT + user) |
| GET | `/api/auth/profile` | Private | Get user profile |
| PUT | `/api/auth/profile` | Private | Update profile |

### Expenses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/expenses` | Private | List (paginated + filtered) |
| POST | `/api/expenses` | Private | Create expense |
| GET | `/api/expenses/:id` | Private | Get single expense |
| PUT | `/api/expenses/:id` | Private | Update expense |
| DELETE | `/api/expenses/:id` | Private | Delete expense |
| POST | `/api/expenses/sync` | Private | Bulk sync offline data |
| GET | `/api/expenses/insights` | Private | Basic monthly insights |

### Budgets

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/budgets` | Private | List current month budgets |
| POST | `/api/budgets` | Private | Create budget |
| PUT | `/api/budgets/:id` | Private | Update budget |
| DELETE | `/api/budgets/:id` | Private | Delete budget |

### Insights

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/insights/advanced` | Private | Growth, top categories, weekday/weekend, anomalies |

### System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | Public | Health check + status |

---

## Request / Response Examples

### Register

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Purvansh", "email": "purvansh@example.com", "password": "secure123"}'
```

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "_id": "65f...",
      "name": "Purvansh",
      "email": "purvansh@example.com",
      "budgetLimit": 0,
      "currency": "INR"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
}
```

### Create Expense

```bash
curl -X POST http://localhost:5001/api/expenses \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"amount":250,"category":"food","paymentMethod":"upi","isRecurring":true,"frequency":"monthly"}'
```

```json
{
  "success": true,
  "message": "Expense created successfully",
  "data": {
    "_id": "65f...",
    "user": "65e...",
    "amount": 250,
    "type": "expense",
    "category": "food",
    "paymentMethod": "upi",
    "isRecurring": true,
    "frequency": "monthly",
    "nextRunDate": "2026-04-03T00:00:00.000Z",
    "syncStatus": "synced",
    "date": "2026-03-03T00:00:00.000Z"
  }
}
```

### Paginated Expenses

```json
{
  "success": true,
  "message": "Expenses fetched",
  "data": {
    "expenses": [ ... ],
    "totalPages": 5,
    "currentPage": 1,
    "totalItems": 98
  }
}
```

### Advanced Insights

```json
{
  "success": true,
  "message": "Advanced insights fetched",
  "data": {
    "monthlyGrowthRate": {
      "rates": [
        { "month": 2, "year": 2026, "total": 5200, "growthRate": 30.5 }
      ],
      "averageGrowthRate": 15.25
    },
    "topCategories": [
      { "_id": "food", "total": 3200, "count": 45, "avgAmount": 71.11 }
    ],
    "weekdayVsWeekend": {
      "weekday": { "total": 4500, "count": 60, "avgPerTransaction": 75 },
      "weekend": { "total": 1800, "count": 20, "avgPerTransaction": 90 },
      "comparison": "Weekend spending is 28.6% of total"
    },
    "anomalies": {
      "detected": true,
      "stats": { "mean": 120.5, "stdDev": 45.2, "totalAnalyzed": 150 },
      "items": [
        { "amount": 5000, "category": "travel", "date": "...", "zScore": 4.82 }
      ]
    }
  }
}
```

---

## Database Indexes

### Expense Collection (6 Indexes)

| Index | Fields | Purpose |
|-------|--------|---------|
| 1 | `{ user: 1, date: -1 }` | Default listing (newest first) |
| 2 | `{ user: 1, category: 1 }` | Category-filtered queries |
| 3 | `{ user: 1, type: 1, date: -1 }` | Type + date filtering |
| 4 | `{ user: 1, category: 1, type: 1, date: -1 }` | Combined filters |
| 5 | `{ isRecurring: 1, nextRunDate: 1 }` | Cron job: find due recurring expenses |
| 6 | `{ user: 1, localId: 1 }` | Offline sync reconciliation |

### Budget Collection (2 Indexes)

| Index | Fields | Purpose |
|-------|--------|---------|
| 1 | `{ user: 1, category: 1, month: 1, year: 1 }` **UNIQUE** | Prevent duplicate budgets |
| 2 | `{ user: 1, month: 1, year: 1 }` | List budgets for a month |

---

## Testing

### Backend Tests (96 tests, 6 suites)

```bash
cd server

npm test                  # All tests
npm run test:unit         # Service-level tests (48)
npm run test:integration  # API-level tests (17)
npm run test:edge         # Edge case tests (31)
npm run test:coverage     # With coverage report
```

| Layer | Tests | Coverage |
|-------|-------|----------|
| Expense Service | 15 | 91% |
| Budget Service | 12 | 93% |
| Recurring Service | 10 | 91% |
| Insight Service | 11 | 91% |
| API Integration | 17 | 100% routes |
| Edge Cases | 31 | Zero data, large volume, concurrency, float precision, timezone |
| **Total** | **96** | **~82% overall** |

### Frontend Tests (42 tests, 1 suite)

```bash
npm run test:sms          # SMS parser test suite
```

| Test Group | Tests | Description |
|-----------|-------|-------------|
| normalizeMessage | 3 | Zero-width chars, ₹ normalization, INR normalization |
| detectSenderMetadata | 4 | HDFC, SBI, unknown, empty |
| classifyMessageType | 6 | Debit, credit, OTP, balance, promo, failed |
| parseStrictDecimal | 7 | Valid int, decimal, comma, malformed, empty, text, multi-dot |
| extractFields | 3 | Amount, timestamp, multiple amounts |
| Full Pipeline (200 samples) | 10 | Accuracy ≥95%, FP ≤3%, debit ≥95%, credit ≥90%, OTP 100%, promo 100%, merchant extraction |
| Edge Cases | 9 | Empty, short, MAX/MIN bounds, zero, malformed, unrecognized sender, multi-amount |
| **Total** | **42** | **99% accuracy achieved** |

---

## Performance Testing

```bash
cd server
npm install -g artillery
artillery run tests/performance/artillery.yml
```

**Targets:**
- p95 response time < 500ms
- p99 response time < 1000ms
- Simulates 100 concurrent users, 500 requests/minute

### SMS Parser Performance

The `simulateBulkSms(count)` utility (dev-only) measures:
- Total processing time
- Average parse time per SMS
- Available in `smsListener.ts`

---

## Security Checklist

- [x] Helmet security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- [x] NoSQL injection prevention (express-mongo-sanitize)
- [x] HTTP parameter pollution prevention (hpp)
- [x] Rate limiting: 100 req/15min API, 20 req/15min auth
- [x] JWT token verification on all private routes
- [x] Password hashing with bcrypt (salt rounds: 10)
- [x] Password field `select: false` in User schema
- [x] Input validation with Joi on all endpoints
- [x] Stack traces hidden in production error responses
- [x] CORS configured with allowlist
- [x] Request body size limited (10MB)
- [x] Graceful shutdown (SIGTERM/SIGINT handlers)
- [x] No SMS content logged or transmitted (Android feature)
- [x] SMS parsing is entirely local — raw message never leaves parser scope

---

## Privacy & SMS Data Handling

This section documents the privacy architecture of the Android SMS detection feature.

### Principles

1. **Local-only parsing**: All SMS parsing happens entirely on the user's device. No SMS content is transmitted to any server, ever.

2. **No raw SMS storage**: The raw SMS body is processed in-memory within the `parseSms()` function scope and immediately discarded. Only structured fields (amount, merchant name, type) are retained.

3. **No SMS logging**: Even in development mode, no SMS body content appears in logs. The parser returns only structured data. Debug logging is stripped in production builds.

4. **User-controlled**: The feature is disabled by default. Users must explicitly navigate to Settings → SMS Detection and toggle it on. A permission rationale is displayed before the Android permission dialog.

5. **Revocable**: Users can disable the feature at any time. Disabling clears all stored detection data including the deduplication cache.

6. **Minimal permissions**: Only `READ_SMS` and `RECEIVE_SMS` are requested. No access to contacts, call logs, or other sensitive data.

7. **Backend isolation**: The backend API has no endpoint for receiving SMS data. The `/api/expenses` endpoint receives the same structured expense object regardless of whether it was manually entered or auto-detected.

8. **Deduplication hashes**: Transaction hashes stored in AsyncStorage contain only a numeric fingerprint derived from amount + merchant + type. The hash cannot be reversed to reconstruct the original SMS.

---

## Project Structure

```
finalAssignment/
│
├── app/                              # Expo Router screens
│   ├── (auth)/
│   │   ├── _layout.tsx               # Auth group layout
│   │   ├── login.tsx                 # Login screen
│   │   └── register.tsx              # Register screen
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Tab bar layout (Home, Txns, Analytics, Account)
│   │   ├── index.tsx                 # Home screen
│   │   ├── transactions.tsx          # Transaction list + filter
│   │   ├── analytics.tsx             # Spending charts + insights
│   │   └── account.tsx               # Profile, budget, settings
│   ├── expense/
│   │   ├── add.tsx                   # Add expense modal
│   │   └── [id].tsx                  # Edit expense modal
│   ├── settings/
│   │   └── sms-detection.tsx         # SMS detection settings (Android)
│   ├── _layout.tsx                   # Root: Redux, fonts, auth routing, SMS listener
│   ├── budgets.tsx                   # Category budgets CRUD
│   ├── insights.tsx                  # Advanced insights screen
│   └── notifications.tsx             # Notifications (placeholder)
│
├── src/
│   ├── components/
│   │   ├── analytics/
│   │   │   ├── InsightCard.tsx       # Metric display card
│   │   │   └── SpendingChart.tsx     # Bar chart component
│   │   ├── common/
│   │   │   ├── Button.tsx            # Reusable button (4 variants)
│   │   │   ├── Card.tsx              # Card container (3 variants)
│   │   │   ├── CustomDatePicker.tsx  # Date picker modal
│   │   │   └── GradientHeader.tsx    # Gradient header
│   │   ├── expense/
│   │   │   ├── AmountInput.tsx       # Numeric amount input
│   │   │   ├── CategoryGrid.tsx      # Category selector
│   │   │   └── FilterModal.tsx       # Multi-parameter filter
│   │   ├── home/
│   │   │   ├── BalanceCard.tsx       # Balance display
│   │   │   ├── SpendingWallet.tsx    # Wallet card
│   │   │   └── TransactionItem.tsx   # Transaction row
│   │   ├── navigation/
│   │   │   └── CurvedTabBar.tsx      # Custom tab bar (SVG)
│   │   ├── sms/
│   │   │   └── SmsTransactionModal.tsx # SMS confirmation modal
│   │   └── sync/
│   │       └── SyncIndicator.tsx     # Sync status display
│   │
│   ├── services/
│   │   ├── sms/                      # SMS parsing pipeline
│   │   │   ├── types.ts              # Types, interfaces, guardrail constants
│   │   │   ├── patterns.ts           # All regex patterns (25+ ignore, 40+ bank, debit/credit/merchant)
│   │   │   ├── pipeline.ts           # 5-stage pipeline functions
│   │   │   ├── confidence.ts         # Weighted scoring engine (configurable)
│   │   │   ├── deduplication.ts      # LRU hash cache (AsyncStorage-backed)
│   │   │   ├── parser.ts             # Pipeline orchestrator
│   │   │   └── index.ts              # Barrel exports
│   │   ├── categoryDetector.ts       # 100+ keyword → category mappings
│   │   ├── smsListener.ts           # Android SMS listener (singleton, debounced)
│   │   ├── smsParser.ts             # Backward-compatible re-export
│   │   ├── smsPermission.ts         # Android permission flow
│   │   └── syncEngine.ts            # Offline sync (NetInfo + AsyncStorage)
│   │
│   ├── store/
│   │   ├── api/
│   │   │   └── apiClient.ts         # Axios instance + JWT interceptor
│   │   ├── slices/
│   │   │   ├── authSlice.ts          # Auth state + persistence
│   │   │   ├── expenseSlice.ts       # Expenses + offline queue
│   │   │   ├── budgetSlice.ts        # Budget async thunks
│   │   │   ├── insightSlice.ts       # Insights async thunk
│   │   │   ├── syncSlice.ts          # Network + sync state
│   │   │   └── smsSlice.ts           # SMS detection state
│   │   ├── hooks.ts                  # Typed Redux hooks
│   │   └── index.ts                  # Store configuration
│   │
│   ├── theme/
│   │   └── index.ts                  # Colors, typography, spacing, shadows, categories
│   │
│   └── utils/
│       └── formatters.ts             # Currency, date, percentage formatters
│
├── tests/
│   └── sms/
│       ├── samples.ts                # 200 SMS samples (120 debit, 40 credit, 20 OTP, 20 promo)
│       └── smsParser.test.ts         # Full test harness + accuracy calculator
│
├── server/
│   ├── config/
│   │   ├── db.js                     # MongoDB connection
│   │   ├── environment.js            # Centralized env config (dynamic getters)
│   │   └── logger.js                 # Winston logger
│   ├── controllers/
│   │   ├── authController.js         # Auth: register, login, profile
│   │   ├── expenseController.js      # Expenses: CRUD, sync, insights
│   │   ├── budgetController.js       # Budgets: CRUD
│   │   └── insightController.js      # Advanced insights
│   ├── middleware/
│   │   ├── auth.js                   # JWT verification (protect)
│   │   ├── errorHandler.js           # AppError + centralized handler
│   │   ├── rateLimiter.js            # API + auth rate limiters
│   │   └── validate.js               # Joi body + query validation
│   ├── models/
│   │   ├── User.js                   # User schema + bcrypt hooks
│   │   ├── Expense.js                # Expense schema + 6 indexes
│   │   └── Budget.js                 # Budget schema + virtuals + unique index
│   ├── routes/
│   │   ├── auth.js                   # Auth routes + validation + rate limit
│   │   ├── expenses.js               # Expense routes + validation
│   │   ├── budgets.js                # Budget routes + validation
│   │   └── insights.js               # Insights route
│   ├── services/
│   │   ├── expense.service.js        # Expense CRUD + pagination + budget hooks
│   │   ├── budget.service.js         # Budget CRUD + recalculation
│   │   ├── insight.service.js        # Aggregation pipelines + z-score
│   │   ├── recurring.service.js      # Idempotent recurring processor
│   │   └── cron.service.js           # node-cron hourly scheduler
│   ├── validators/
│   │   ├── auth.validator.js         # Joi schemas for auth
│   │   ├── expense.validator.js      # Joi schemas for expenses
│   │   └── budget.validator.js       # Joi schemas for budgets
│   ├── tests/
│   │   ├── setup.js                  # mongodb-memory-server lifecycle
│   │   ├── helpers.js                # Test factories
│   │   ├── unit/                     # 4 service test files (48 tests)
│   │   ├── integration/              # API test file (17 tests)
│   │   ├── edge/                     # Edge case file (31 tests)
│   │   └── performance/              # Artillery config
│   ├── docs/
│   │   └── postman_collection.json   # Full Postman collection
│   ├── app.js                        # Express app factory
│   ├── index.js                      # Server entry + cron + graceful shutdown
│   ├── jest.config.js                # Backend Jest config
│   ├── Dockerfile                    # Node 20-alpine image
│   ├── render.yaml                   # Render.com deployment
│   └── .env.example                  # Example env variables
│
├── app.json                          # Expo config
├── eas.json                          # EAS Build profiles
├── jest.config.js                    # Frontend Jest config
├── tsconfig.json                     # TypeScript config
├── package.json                      # Frontend dependencies
└── .gitignore                        # Git ignores
```

---

## Running Locally

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Expo Go app on your phone
- npm or yarn

### Backend

```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev    # Development with nodemon
```

### Frontend

```bash
cd ..
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

If your Mac and phone are on different networks:
```bash
npx expo start --tunnel
```

### Run Tests

```bash
# Backend (96 tests)
cd server && npm test

# Frontend SMS parser (42 tests)
cd .. && npm run test:sms
```

---

## Deployment

### Backend — Render

1. Push to GitHub
2. Connect repo to Render
3. Set environment variables (see `.env.example`)
4. Deploy uses `render.yaml` config

### Backend — Docker

```bash
cd server
docker build -t pocketexpense-api .
docker run -p 5001:5001 --env-file .env pocketexpense-api
```

### Frontend — Expo EAS

```bash
npx eas build --platform android
npx eas build --platform ios
```

Build profiles defined in `eas.json`:
- `development` — Debug build with dev client
- `preview` — Internal distribution
- `production` — Store-ready build

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5001` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `NODE_ENV` | `development` | Environment |
| `MONGODB_URI` | — | MongoDB connection string |
| `JWT_SECRET` | — | JWT signing secret (min 32 chars) |
| `JWT_EXPIRE` | `7d` | JWT token expiry |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `CORS_ORIGIN` | `*` | Allowed origins |

---

## Design System

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#8A64EB` | Buttons, accents, active states |
| `primaryDark` | `#181026` | Primary button background |
| `primaryLight` | `#9D85FF` | Light accent |
| `secondary` | `#C7F2A4` | Lime green accent |
| `background` | `#F8F9FE` | Screen background |
| `cardBg` | `#FFFFFF` | Card background |
| `success` | `#4CD964` | Income, positive indicators |
| `error` | `#FF3B30` | Expense, over-budget, errors |
| `warning` | `#FF9500` | Warnings, alerts |
| `info` | `#007AFF` | Informational elements |

### Typography

- Font family: **Poppins** (400 Regular, 500 Medium, 600 SemiBold, 700 Bold)
- Sizes: xs (10), sm (12), md (14), lg (16), xl (18), xxl (24), xxxl (32), hero (40)

### 20 Expense Categories

Groceries, Travel, Car, Home, Insurance, Education, Marketing, Shopping, Internet, Water, Rent, Gym, Subscription, Vacation, Food, Entertainment, Salary, Freelance, Investment, Other

### 6 Payment Methods

Cash, Credit Card, Debit Card, Bank Transfer, UPI, Other

---

## Tradeoffs & Decisions

| Decision | Alternative | Rationale |
|----------|------------|-----------|
| Joi over express-validator | express-validator (installed) | Joi provides declarative, composable schemas that pair well with a service layer |
| Hourly cron vs event-driven | Bull/BullMQ job queue | Simpler for current scale; upgrade path is clear |
| MongoDB aggregation for insights | Pre-computed materialized views | Keeps data fresh; ~200ms latency is acceptable. Redis cache can be added |
| Offline-first with AsyncStorage | SQLite / WatermelonDB | Simpler for this data volume; WatermelonDB for >10K records |
| Z-score for anomaly detection | Isolation Forest / ML model | Interpretable, deterministic, testable with zero dependencies |
| Regex-based SMS parsing | ML/NLP model | Deterministic, testable, zero-dependency, 99% accuracy on 200 samples |
| Confidence scoring over binary detection | Hard pass/fail | Reduces false positives to 0% while catching 99% of real transactions |
| LRU dedup cache (200 entries) | Bloom filter / server-side dedup | Client-only, no network, fits in AsyncStorage, simple eviction |
| React Compiler (experimental) | Manual React.memo/useMemo | Automatic optimization with zero manual intervention |

---

## Scalability Path

1. **Cache Layer**: Redis for insights endpoint (invalidate on expense write)
2. **Job Queue**: Bull/BullMQ to replace node-cron for recurring transactions
3. **Read Replicas**: MongoDB read preference for analytics queries
4. **Microservices**: Extract insight engine into separate service if query load grows
5. **CDC**: Change Data Capture for real-time budget recalculation
6. **Sharding**: Shard by user_id when hitting single-node limits
7. **SMS ML Model**: Replace regex patterns with a trained classifier for >99.5% accuracy
8. **Push Notifications**: Firebase Cloud Messaging for budget alerts and recurring reminders

---

## License

MIT
