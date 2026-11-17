# MedWatch — Tasks

Tasks are ordered so each one builds on the previous.
Status: [x] = complete, [ ] = not started, [~] = partial.

---

## Phase 0 — Workspace Scaffold

- [x] **T-01** Initialise pnpm monorepo
  - Root `package.json`, `pnpm-workspace.yaml`, root scripts (dev, build, test, lint, typecheck, seed, verify-data)
  - `.env.example`, `.gitignore`, `.prettierrc`, `.eslintrc.cjs` (includes no-icon-imports rule), `tsconfig.base.json`

- [x] **T-02** Docker Compose
  - `docker-compose.yml` with `mongo:7`, named volume, port 27017

- [x] **T-03** `packages/shared`
  - TypeScript interfaces for all 5 collections + User + AuditEvent + analytics shapes
  - Zod schemas, enums (`FACILITY_LEVELS`, `ALERT_TYPES`, `ALERT_SEVERITIES`, `REQUEST_STATUSES`, `USER_ROLES`)
  - Permission matrix (`permissions.ts`) with `hasPermission()` and `getScopeFilter()`

---

## Phase 1 — Database Layer

- [x] **T-04** MongoDB client singleton (`apps/api/src/db/client.ts`)
  - `connectDb()`, `disconnect()`, typed collection accessors for all 5 collections

- [x] **T-05** `$jsonSchema` validators (`apps/api/src/db/createCollections.ts`)
  - All 5 collections with required fields, bson types, enums

- [x] **T-06** Index creation (`apps/api/src/db/createIndexes.ts`)
  - All 5 indexes from PDF §6

- [x] **T-07** Seed script (`apps/api/scripts/seed.ts`)
  - Drops and recreates all 5 collections with exact PDF data + AL007
  - `pnpm seed`

- [x] **T-08** Verify-data script (`apps/api/scripts/verify-data.ts`)
  - Checks `closing = opening + received - issued` and batch sum per record
  - `pnpm verify-data`

---

## Phase 2 — API Core

- [x] **T-09** Fastify server factory (`apps/api/src/server.ts`)
  - Zod type provider, CORS, JWT cookie auth, rate limiting, Swagger UI at `/docs`

- [x] **T-10** Facilities CRUD + `$geoNear` (`apps/api/src/routes/facilities.ts`)
  - `GET /facilities`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`
  - `GET /facilities/nearest` — $geoNear aggregation

- [x] **T-11** Medicines CRUD (`apps/api/src/routes/medicines.ts`)

- [x] **T-12** Stock Records CRUD + balance validation (`apps/api/src/routes/stockRecords.ts`)
  - 422 on balance mismatch; triggers alert generation on write

- [x] **T-13** Alerts routes (`apps/api/src/routes/alerts.ts`)
  - `GET /alerts` (filtered), `GET /:id`, `PATCH /:id/resolve`

- [x] **T-14** Stock Requests CRUD + escalate (`apps/api/src/routes/stockRequests.ts`)
  - `POST /stock-requests/escalate-pending?before=YYYY-MM-DD`

---

## Phase 3 — Analytics Endpoints

- [x] **T-15** Analytics repository (`apps/api/src/repositories/analytics.repo.ts`)
  - `getUnresolvedStockouts()` Q7.1, `getStockoutDaysByDistrict()` Q7.2,
    `getExpiringBatches()` Q7.3, `getBelowReorder()` Q7.5

- [x] **T-16** Analytics routes (`apps/api/src/routes/analytics.ts`)
  - `GET /analytics/overview` — full dashboard dataset (availability series, KPIs, district mix, facility ranking, forecast, insights)
  - `GET /analytics/stockouts` Q7.1
  - `GET /analytics/stockout-days-by-district` Q7.2
  - `GET /analytics/expiring-batches` Q7.3
  - `GET /analytics/below-reorder` Q7.5

---

## Phase 4 — Business Rules Service Layer

- [x] **T-17** AlertService (`apps/api/src/services/alert.service.ts`)
  - `generateAlertsForStockRecord()` with dedup; `resolveAlert()`; `nearExpirySeverity()`

- [x] **T-18** StockRecordService (`apps/api/src/services/stockRecord.service.ts`)
  - `validateBalances()` — pure, testable

---

## Phase 4b — Auth & Users (v2 addition)

- [x] **T-18b** Auth service (`apps/api/src/services/auth.service.ts`)
  - argon2id hashing, `attemptLogin()` with 5-attempt lock, audit log writes

- [x] **T-18c** Auth routes (`apps/api/src/routes/auth.ts`)
  - `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`
  - httpOnly JWT cookies, 15m access token, 7d refresh token

- [x] **T-18d** Middleware (`apps/api/src/routes/middleware.ts`)
  - `authenticate()`, `requirePermission()`, `buildFacilityFilter()`

- [x] **T-18e** Users routes (`apps/api/src/routes/users.ts`)
  - `GET /users`, `GET /users/:id`, `PATCH /users/:id` (admin-only activate/deactivate)

- [x] **T-18f** Overview repository (`apps/api/src/repositories/overview.repo.ts`)
  - Full dashboard dataset: availability series, KPI deltas, district mix, facility ranking, 3-month forecast, auto-insights

- [x] **T-18g** Insights service (`apps/api/src/services/insights.ts`)
  - Pure function, generates plain-language insight sentences

- [x] **T-18h** Seed users script (`apps/api/scripts/seedUsers.ts`)
  - 4 demo accounts (facility, district, national, admin roles) with argon2id passwords

- [x] **T-18i** Demo seed (`apps/api/scripts/seed-demo.ts`)
  - 12-month dataset across ~40 facilities for a realistic dashboard

---

## Phase 5 — Integration Tests

- [x] **T-19** Integration test setup (`apps/api/src/test/setup.ts`)
  - `mongodb-memory-server` globalSetup/teardown

- [x] **T-20** Q7.2 test — Arua=21, Kotido=14, Nakaseke=9

- [x] **T-21** Q7.3 test (asOf 2026-10-13) — AM-2311 and PA-2410 only

- [x] **T-22** Q7.5 test — exactly 5 rows, all 5 facility+medicine pairs

- [x] **T-23** Q7.6 test (before 2026-09-20) — modifiedCount=1, SQ002→approved

- [x] **T-24** Alert dedup test — second stock-out for same fac+med skipped

- [x] **T-25** Balance validation test — 422 on mismatched closing

- [x] **T-25b** Auth tests — valid login, wrong password, unknown email, account lock, inactive user

---

## Phase 6 — mongosh Reference Scripts

- [x] **T-26** `docs/mongosh/q7.1.js` through `docs/mongosh/q7.6.js` — verbatim PDF queries

---

## Phase 7 — Frontend

- [x] **T-27** Vite + React scaffold (`apps/web`)
  - React 18, React Router 6, TanStack Query v5, Tailwind CSS v3
  - `ThemeProvider` (dark/light, `data-theme`, ECharts theme registration)
  - `AuthProvider` (JWT cookie, `/auth/me` bootstrap)
  - `RequireAuth` guard

- [x] **T-27b** Design system
  - `apps/web/src/styles/tokens.css` — full CSS custom property token set (dark + light)
  - `apps/web/src/index.css` — utility classes: badge, delta chip, card, data-table, skeleton, btn-primary, btn-ghost, input
  - `apps/web/src/charts/theme.ts` — ECharts `mw-dark` / `mw-light` theme objects

- [x] **T-27c** Application shell
  - `Layout.tsx` — text-only collapsible sidebar (240px / 56px rail), grouped nav (Overview, Operations, Analytics, Administration), role-filtered items, `Ctrl+K` palette
  - `CommandPalette.tsx` — cmdk, keyboard-navigable, text-only
  - `LoginPage.tsx` — clean sign-in form, demo panel when `VITE_DEMO_MODE=true`

- [x] **T-28** Dashboard page
  - Wired to `/analytics/overview`; Key Findings strip; 4–6 KPI cards with sparklines + delta chips; availability area chart with comparison + target line; stacked district status bar; facility risk ranking table

- [x] **T-29** Alerts page
  - Filterable data table (type/severity/resolved); resolve action with `ConfirmDialog`; token-only badge classes

- [x] **T-30** Stock Records page
  - Table with expandable batch rows, closing-vs-reorder highlight via CSS tokens
  - Live `closing = opening + received - issued` form validation

- [x] **T-31** Expiry Tracker page
  - Segmented window control (30/60/90/180 days), as-of date picker, ordered table

- [x] **T-32** Facility Map page
  - Leaflet with `CircleMarker` (CSS-drawn, no external icon images), colour by stock status, "Find nearest" panel

- [x] **T-33** Requests page
  - Status filter, expandable item rows, escalate-pending with date picker

- [x] **T-33b** Users page (admin only)
  - Search, activate/deactivate with `ConfirmDialog`

---

## Phase 7b — Web Unit Tests (v2 addition)

- [x] **T-33c** `apps/web/src/test/no-emoji.test.ts`
  - Scans all `.ts`/`.tsx` under `apps/web/src`, fails on any Unicode emoji (28 files, 28 tests)

- [x] **T-33d** `apps/web/src/test/insights.test.ts`
  - 7 unit tests for `generateInsights()` pure function (decline, improve, no stockouts, risk threshold, no exclamation marks)

- [x] **T-33e** `apps/web/src/hooks/insights.ts`
  - Web-side copy of the pure insights function (mirrored from API service)

- [x] **T-33f** `apps/web/src/hooks/useOverview.ts`
  - TanStack Query hook for `GET /analytics/overview` with 60s stale/refetch

---

## Phase 8 — CI & Documentation

- [x] **T-34** GitHub Actions CI (`.github/workflows/ci.yml`)
  - lint → typecheck → test; `mongo:7` service container

- [ ] **T-35** Playwright smoke test
  - Navigate to `/dashboard`; assert KPI cards rendered; assert chart SVG present
  - *Not implemented — requires a running server; add when deployment target is confirmed*

- [x] **T-36** README
  - Mermaid architecture diagram, 5-command quick start, PDF query → API → UI table, Known Issues table, tech stack table

- [x] **T-37** Migration document (`docs/migration/objectid-migration.md`)

---

## Test Summary

| Suite | Tests | Status |
|-------|-------|--------|
| API: stockRecord | 5 | PASS |
| API: alerts | 3 | PASS |
| API: analytics | 4 | PASS |
| API: auth | 5 | PASS |
| Web: no-emoji | 28 | PASS |
| Web: insights | 7 | PASS |
| **Total** | **52** | **PASS** |
