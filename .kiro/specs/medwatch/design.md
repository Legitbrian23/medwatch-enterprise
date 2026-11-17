# MedWatch — Design

---

## 1. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Browser                                                       │
│  apps/web  (React 18 + Vite + Tailwind + TanStack Query)       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │Dashboard │ │ Alerts   │ │ Stock    │ │ Map / Expiry /   │  │
│  │          │ │ Page     │ │ Records  │ │ Requests         │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘  │
└───────┼────────────┼────────────┼─────────────────┼────────────┘
        │  REST/JSON (OpenAPI)    │                 │
┌───────▼────────────▼────────────▼─────────────────▼────────────┐
│  apps/api  (Fastify + Zod + fastify-type-provider-zod)          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Route Layer  →  Service Layer  →  Repository Layer     │    │
│  │  (schema val)    (biz rules)       (MongoDB driver)     │    │
│  └─────────────────────────────────────────────────────────┘    │
│  Swagger UI at /docs                                            │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────┐
│  MongoDB 7   (Docker Compose)   medwatch database               │
│  health_facilities │ medicines │ stock_records                  │
│  stock_requests    │ alerts                                     │
└─────────────────────────────────────────────────────────────────┘

packages/shared  ←  TypeScript types, Zod schemas, constants
```

---

## 2. Monorepo Structure

```
medwatch/
├── apps/
│   ├── api/                   Fastify API
│   │   ├── src/
│   │   │   ├── db/            MongoDB client + collection helpers
│   │   │   ├── routes/        One file per resource
│   │   │   ├── services/      Business-rule layer
│   │   │   ├── repositories/  Raw MongoDB queries
│   │   │   └── server.ts      Fastify app factory
│   │   ├── scripts/
│   │   │   ├── seed.ts        Drop + recreate + insert all data
│   │   │   └── verify-data.ts Balance + batch-sum checks
│   │   └── vitest.config.ts
│   └── web/                   React/Vite frontend
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── hooks/         TanStack Query hooks
│       │   └── main.tsx
│       └── vite.config.ts
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types.ts       Shared TypeScript interfaces
│       │   └── schemas.ts     Zod schemas (reused by API + web)
│       └── package.json
├── docs/
│   ├── mongosh/               q7.1.js – q7.6.js (verbatim from PDF)
│   └── migration/             objectid-migration.md
├── docker-compose.yml
├── .env.example
├── pnpm-workspace.yaml
└── README.md
```

---

## 3. Database Design

### 3.1 Collection: `health_facilities`

```jsonc
{
  "_id": "HF001",                          // string, human-readable
  "name": "Kasambya Health Centre III",
  "level": "HC III",                       // enum: HC II | HC III | HC IV | General Hospital
  "district": "Nakaseke",
  "subcounty": "Kasambya",
  "location": {                            // GeoJSON Point — 2dsphere indexed
    "type": "Point",
    "coordinates": [32.45, 0.72]           // [longitude, latitude]
  },
  "in_charge": {                           // embedded — always read with parent
    "name": "Sarah Nakato",
    "phone": "0772000101"
  },
  "catchment_population": 18500,
  "services": ["OPD", "ANC", "immunisation", "HIV care"]
}
```

**Indexes:** `{ location: "2dsphere" }`, `{ district: 1 }`

### 3.2 Collection: `medicines`

```jsonc
{
  "_id": "MED001",
  "generic_name": "Amoxicillin",
  "strength": "250mg",
  "form": "dispersible tablet",
  "category": "antibiotic",
  "unit": "tablet",
  "reorder_level": 300,
  "tracer_item": true,
  "cold_chain": false
}
```

### 3.3 Collection: `stock_records`

```jsonc
{
  "_id": "SR001",
  "facility_id": "HF001",                 // ref → health_facilities._id
  "medicine_id": "MED002",                // ref → medicines._id
  "period": "2026-09",                    // YYYY-MM string
  "opening": 350,
  "received": 0,
  "issued": 330,
  "closing": 20,                          // INVARIANT: closing = opening + received - issued
  "stockout_days": 9,                     // observed, not derived (see PDF-3)
  "batches": [                            // embedded; SUM(qty) = closing when non-empty
    { "batch_no": "AL-2406", "expiry": ISODate("2027-03-31"), "qty": 20 }
  ]
}
```

**Index:** `{ facility_id: 1, medicine_id: 1, period: 1 }` UNIQUE

### 3.4 Collection: `stock_requests`

```jsonc
{
  "_id": "SQ001",
  "facility_id": "HF001",
  "requested_on": ISODate("2026-09-22"),
  "status": "approved",                   // enum: pending | approved | delivered | cancelled | rejected
  "supplier": "National Medical Stores",
  "items": [                              // embedded
    { "medicine_id": "MED002", "qty": 600, "reason": "stock-out for 9 days" },
    { "medicine_id": "MED001", "qty": 300, "reason": "below reorder level" }
  ],
  "fulfilled_on": null                    // Date | null
  // optional: rejection_note (string)
  // optional: escalated (boolean) — set by Q7.6 mongosh script
}
```

**Index:** `{ status: 1, requested_on: -1 }`

### 3.5 Collection: `alerts`

```jsonc
{
  "_id": "AL001",
  "facility_id": "HF001",
  "medicine_id": "MED002",
  "type": "low_stock",                    // enum: stockout | low_stock | near_expiry
  "severity": "high",                     // enum: low | medium | high | critical
  "raised_on": ISODate("2026-09-30"),
  "resolved": false,
  "resolved_on": null,                    // Date | null — set by PATCH /alerts/:id/resolve
  "batch_no": null                        // string | null — populated for near_expiry alerts
}
```

**Index:** `{ resolved: 1, severity: 1 }`

---

## 4. API Layer Design

### 4.1 Technology

| Concern | Choice |
|---------|--------|
| HTTP framework | Fastify 4 |
| Schema validation | Zod + `fastify-type-provider-zod` |
| OpenAPI docs | `@fastify/swagger` + `@fastify/swagger-ui` at `/docs` |
| MongoDB | Official `mongodb` Node.js driver, no Mongoose |
| Environment | `dotenv` via `@fastify/env`; never committed |

### 4.2 Route Map

```
GET    /facilities                        list + paginate
POST   /facilities                        create
GET    /facilities/:id                    get by id
PUT    /facilities/:id                    update
DELETE /facilities/:id                    delete
GET    /facilities/nearest                $geoNear query (REQ-04-8)

GET    /medicines                         list + paginate
POST   /medicines                         create
GET    /medicines/:id
PUT    /medicines/:id
DELETE /medicines/:id

GET    /stock-records                     list + paginate + optional filters
POST   /stock-records                     create (validates closing balance, triggers alerts)
GET    /stock-records/:id
PUT    /stock-records/:id                 update (same validation)
DELETE /stock-records/:id

GET    /stock-requests                    list + paginate + ?status filter
POST   /stock-requests
GET    /stock-requests/:id
PUT    /stock-requests/:id
DELETE /stock-requests/:id
POST   /requests/escalate-pending         ?before=YYYY-MM-DD  (REQ-04-7)

GET    /alerts                            list + paginate + ?type,severity,resolved filters
GET    /alerts/:id
PATCH  /alerts/:id/resolve                resolve alert (REQ-04-5)

GET    /analytics/stockouts               Q7.1
GET    /analytics/stockout-days-by-district   Q7.2
GET    /analytics/expiring-batches        Q7.3 ?days=90&asOf=YYYY-MM-DD
GET    /analytics/below-reorder           Q7.5
```

### 4.3 Layered Architecture

```
Route (Fastify plugin)
  └─▶ Service (business rules, alert dedup, balance validation)
        └─▶ Repository (MongoDB queries, aggregation pipelines)
              └─▶ db.ts (MongoClient singleton, typed collection accessors)
```

Rules:
- Routes only validate input shape (Zod) and map HTTP ↔ service calls.
- Services own all business rules (REQ-03-1 through REQ-03-6).
- Repositories own all MongoDB query strings; no raw queries in services.

### 4.4 Pagination Envelope

```jsonc
{
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### 4.5 Error Envelope

```jsonc
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "closing (25) ≠ opening (10) + received (10) - issued (0) = 20"
}
```

---

## 5. Service Layer Detail

### 5.1 AlertService.generateForStockRecord(record, asOfDate)

```
1. Look up medicine.reorder_level
2. If closing === 0:
     upsert-or-skip stockout alert (dedup: unresolved stockout for same fac+med)
3. Else if closing < reorder_level:
     upsert-or-skip low_stock alert
4. For each batch where expiry <= asOfDate + 90 days:
     upsert-or-skip near_expiry alert (keyed on fac+med+batch_no)
```

### 5.2 StockRecordService.create / update

```
1. Validate closing = opening + received - issued  → 422 if fails
2. If batches.length > 0: validate SUM(qty) = closing → 422 if fails
3. Write to MongoDB
4. Call AlertService.generateForStockRecord(record, asOfDate ?? today)
5. Return written document
```

---

---

## Amendment v2 — Design System Override

> **Effective:** v2 amendment prompt (received after initial implementation).
> Sections 6–8 below are **superseded** by `design-system.md`.
> Sections 1–5 (architecture, DB schema, API, service layer) are **unchanged**.

### Conflicts with existing v1 code — all resolved

| File | Conflict | Resolution |
|------|----------|------------|
| `apps/web/src/components/Layout.tsx` | Emoji in `navItems` labels, hamburger `☰` glyph | Removed; text-only sidebar with grouped nav, collapsible rail, abbr labels |
| `apps/web/src/pages/Dashboard.tsx` | Hard-coded hex palette; Recharts `BarChart` | Token `var(--chart-*)` colours; replaced with ECharts `ReactECharts` |
| `apps/web/src/components/KpiCard.tsx` | Hard-coded Tailwind colour aliases | Rewritten against CSS token variables; ECharts sparkline |
| `apps/web/package.json` | `recharts` listed as dependency | Removed; `echarts@5.5.1` + `echarts-for-react@3.0.2` installed |
| `apps/web/src/index.css` | No token imports, no dual-theme support | `@import './styles/tokens.css'` added; `@fontsource/inter/variable.css` added; all component classes use `var(--*)` |
| `apps/web/src/pages/FacilityMapPage.tsx` | External pin images, emoji legend dots | CSS `CircleMarker` via react-leaflet; token-coloured CSS dots in legend |
| `apps/web/src/pages/RequestsPage.tsx` | Hard-coded Tailwind colour classes | Token-based badge classes |
| `apps/web/src/pages/AlertsPage.tsx` | Hard-coded colour classes | Token badge classes |
| `apps/web/tailwind.config.js` | Static hex values in theme | All colours mapped to `var(--*)` CSS custom properties |

### New files added

| File | Purpose |
|------|---------|
| `apps/web/src/styles/tokens.css` | All CSS custom property tokens for dark + light themes |
| `apps/web/src/charts/theme.ts` | ECharts `mw-dark` / `mw-light` theme objects registered at startup |
| `apps/web/src/context/ThemeContext.tsx` | React context; persists to `localStorage['mw-theme']`; sets `data-theme` on `<html>` |
| `apps/web/src/components/CommandPalette.tsx` | `cmdk`-based Ctrl+K palette; text-only, keyboard navigable |
| `apps/web/src/test/no-emoji.test.ts` | Vitest test scanning all `.ts`/`.tsx` for emoji; 21/21 passing |
| `apps/web/vitest.config.ts` | Vitest config for web package test runner |

### Enforcement status

| Rule | Mechanism | Status |
|------|-----------|--------|
| No icon imports | `no-restricted-imports` in `.eslintrc.cjs` | Lint passes |
| No emoji in source | `apps/web/src/test/no-emoji.test.ts` | 21/21 tests pass |
| Token-only colours | All component files use `var(--*)` | Typecheck passes |
| Dual theme | `data-theme` on `<html>`, `localStorage['mw-theme']` | Implemented |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` in `index.css` | Implemented |

---

## 6. Frontend Design

### 6.1 Page → API Map

| Page | Primary endpoints |
|------|-------------------|
| Dashboard | `/analytics/stockouts`, `/analytics/stockout-days-by-district`, `/analytics/expiring-batches`, `/stock-requests?status=pending` |
| Alerts | `/alerts` (filtered), `PATCH /alerts/:id/resolve` |
| Stock Records | `/stock-records`, `POST /stock-records` |
| Expiry Tracker | `/analytics/expiring-batches` |
| Facility Map | `/facilities`, `/facilities/nearest` |
| Requests | `/stock-requests`, `POST /requests/escalate-pending` |

### 6.2 Component Tree (v2 — see `design-system.md` for full spec)

```
App
├── Layout (text-only sidebar, grouped nav, collapsible rail, top bar)
│     ├── TopBar (time range, as-of date, district filter, theme toggle, notifications)
│     └── CommandPalette (Ctrl+K)
├── /dashboard        → <NationalDashboard> | <DistrictDashboard> | <FacilityDashboard>
│     ├── <KeyFindings>          auto-insights strip
│     ├── <KpiCard> ×4–6        ECharts sparkline + delta + target bar
│     ├── <AreaComparisonChart>  availability trend vs previous period
│     ├── <StackedBarChart>      stock status mix by district
│     ├── <HeatmapChart>         facility × medicine ratio
│     ├── <FacilityMap>          CSS L.divIcon markers
│     └── <DataTable>            virtualised, sortable, exportable
├── /alerts           → <AlertsPage>
│     └── <DataTable> + <Drawer> (detail + resolve)
├── /stock-records    → <StockRecordsPage>
│     ├── <DataTable> (inline sparklines, expandable batches)
│     └── <Drawer> (add record form with live validation)
├── /expiry           → <ExpiryTrackerPage>
│     └── <DataTable> + <CalendarHeatmap>
├── /map              → <FacilityMapPage>
│     └── <FacilityMap> (clustering, heat layer, redistribution lines)
└── /requests         → <RequestsPage>
      └── <DataTable> + <FunnelChart> + <Drawer>
```

### 6.3 State Management

- Server state: TanStack Query (stale-while-revalidate, 60s background refresh, request cancellation on filter change)
- Filter and time-range state: synced to URL search params
- Theme: `localStorage` + CSS `data-theme` attribute on `<html>`
- Sidebar collapse: `localStorage`

### 6.4 Design Tokens

> **Defined in `design-system.md` §3–§5 and implemented in `apps/web/src/styles/tokens.css`.**
> Summary: deep slate surfaces, teal accent, semantic status tokens (critical / high / medium / healthy / neutral),
> 8-colour categorical chart palette, Inter Variable font, 8px grid, 10–12px radius, 1px borders.

---

## 7. Testing Strategy

| Layer | Tool | What is tested |
|-------|------|----------------|
| Unit | Vitest (API) | Service business rules (balance check, alert dedup, near-expiry date logic) |
| Unit | Vitest (web) | `generateInsights()` pure function; all metric derivations |
| Integration | Vitest + `mongodb-memory-server` | All 6 PDF queries assert exact expected outputs; seed fidelity; verify-data script |
| API | Vitest + Fastify `inject` | Route validation, 422 on bad balance, resolve endpoint |
| Enforcement | Vitest (web) | `no-emoji.test.ts` — scans `apps/web/src/**/*.{ts,tsx}` for Unicode emoji ranges, fails build if found |
| E2E smoke | Playwright | Dashboard loads in both themes; chart SVG renders; KPI values present; no console errors |

---

## 8. Infrastructure

### docker-compose.yml (outline)

```yaml
services:
  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongo_data:/data/db]
    environment:
      MONGO_INITDB_DATABASE: medwatch
```

### Environment Variables (.env.example)

```
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=medwatch
API_PORT=3001
VITE_API_BASE_URL=http://localhost:3001
```

---

## 9. mongosh Reference Scripts

`docs/mongosh/` contains verbatim copies of PDF §7 queries:

| File | Query |
|------|-------|
| `q7.1.js` | Unresolved stock-outs |
| `q7.2.js` | Stock-out days by district |
| `q7.3.js` | Batches expiring in 90 days |
| `q7.4.js` | Resolve AL002 |
| `q7.5.js` | Stock below reorder level |
| `q7.6.js` | Escalate old pending requests (original `escalated: true` version) |
