# MedWatch — Requirements

> **Source of truth:** "MedWatch: tracking medicine stock-outs in public health facilities with MongoDB"
> (NoSQL Mid-Semester Task PDF, dated 13 October 2026).
> All collection names, field names, custom `_id` strings, and sample data reproduce the PDF exactly.
> Any deviation is flagged in the Known Issues table below and must be approved before implementation.

---

## Known Issues in the PDF

| # | Location | Issue | Proposed Resolution |
|---|----------|-------|---------------------|
| **PDF-1** | §5.3 SR002, §5.5 | Batch **AM-2311** (HF001 / MED001, expiry 2026-12-15) falls within 90 days of the as-of date 2026-10-13, yet the seed data contains no near-expiry alert for it. AL006 covers PA-2410 but nothing covers AM-2311. | Seed script inserts **AL007** `{ _id:"AL007", facility_id:"HF001", medicine_id:"MED001", type:"near_expiry", severity:"medium", raised_on: ISODate("2026-10-13"), resolved:false, batch_no:"AM-2311" }`. Integration tests assert AL007 is present. |
| **PDF-2** | §7.4, §5.4 SQ002 | Q7.4 resolves AL002 "once a delivery arrives," but SQ002 for the same facility (HF003) stays `"pending"`. It is ambiguous whether alert resolution should cascade to requests. | **No cascade.** Alert resolution and request fulfilment are independent. `PATCH /alerts/:id/resolve` resolves only the alert. This decision is documented in the alert service with a comment. |
| **PDF-3** | §5.3 SR001 | SR001 has `stockout_days: 9` yet `closing: 20`. A non-zero closing balance means the facility restocked during the period; stock-out days describe calendar days the balance was zero *within* the period, not the closing figure. | `stockout_days` is an observed input field. The verify-data script checks only `closing = opening + received - issued` and `SUM(batch.qty) = closing`. It does **not** flag SR001 as invalid. |
| **PDF-4** | §7.6 | Q7.6 sets `escalated: true` on pending requests rather than changing `status` to `"approved"`. The project brief says escalate-pending should change status. These are different semantics. | The API endpoint `POST /requests/escalate-pending` sets `status = "approved"` (matches the brief). The raw mongosh script in `docs/mongosh/q7.6.js` preserves the PDF's `$set: { escalated: true }` exactly for assessment. Both are kept. |
| **PDF-5** | §3, §5.1 | The PDF says **32 documents total** in the breakdown `6+6+8+6+6`, but the brief summary says `5+7+10+5+5`. The PDF page counts are authoritative. | Use the PDF counts: 6 facilities, 6 medicines, 8 stock records, 6 requests, 6 alerts (+ AL007 = 7 alerts after seed). |
| **PDF-6** | §3 Design | The PDF recommends ObjectIds or national facility codes in production. | Keep string IDs for assessment. Document the migration path in `docs/migration/objectid-migration.md`. |

---

## REQ-01  Database & Collections

### REQ-01-1  Collection Names
WHEN the seed script runs,
THE SYSTEM SHALL create (or recreate) exactly five collections in the `medwatch` database:
`health_facilities`, `medicines`, `stock_records`, `stock_requests`, `alerts`.

### REQ-01-2  Document Counts After Seed
WHEN `pnpm seed` completes,
THE SYSTEM SHALL contain:
- **6** `health_facilities` documents — HF001, HF002, HF003, HF004, HF005, HF006
- **6** `medicines` documents — MED001–MED006
- **8** `stock_records` documents — SR001–SR008
- **6** `stock_requests` documents — SQ001–SQ006
- **7** `alerts` documents — AL001–AL006 (from PDF) + AL007 (AM-2311 near-expiry, see PDF-1)

### REQ-01-3  Embedded vs. Referenced Fields
THE SYSTEM SHALL follow the PDF's embed/reference decisions:
- **Embedded inside `health_facilities`:** `location` (GeoJSON Point), `in_charge { name, phone }`, `services[]`
- **Embedded inside `stock_records`:** `batches[] { batch_no, expiry, qty }`
- **Embedded inside `stock_requests`:** `items[] { medicine_id, qty, reason }`
- **Referenced by string `_id`:** `facility_id` and `medicine_id` in `stock_records`, `stock_requests`, `alerts`

### REQ-01-4  `$jsonSchema` Validators
WHEN collections are created,
THE SYSTEM SHALL attach a `$jsonSchema` validator via `createCollection` that enforces:
- Required fields per collection (see §REQ-01-5 for enums)
- Correct BSON types for all scalar fields
- Validators applied using `db.createCollection("name", { validator: { $jsonSchema: ... } })`

### REQ-01-5  Enumeration Constraints
THE SYSTEM SHALL reject writes violating the following enumerations:

| Collection | Field | Allowed values |
|------------|-------|---------------|
| `health_facilities` | `level` | `"HC II"`, `"HC III"`, `"HC IV"`, `"General Hospital"` |
| `stock_records` | `status` (computed, optional on raw doc) | `"normal"`, `"low"`, `"stockout"` |
| `stock_requests` | `status` | `"pending"`, `"approved"`, `"delivered"`, `"cancelled"`, `"rejected"` |
| `alerts` | `type` | `"stockout"`, `"low_stock"`, `"near_expiry"` |
| `alerts` | `severity` | `"low"`, `"medium"`, `"high"`, `"critical"` |

> Note: the PDF uses `"stock_out"` as the alert type in the seed data (AL002, AL003) but the problem description uses `"stockout"`. We standardise on **`"stockout"`** throughout. The seed data is normalised accordingly.

### REQ-01-6  Indexes
WHEN the seed script completes,
THE SYSTEM SHALL have created exactly these indexes (matching PDF §6):

| Collection | Index spec | Options |
|------------|-----------|---------|
| `health_facilities` | `{ location: "2dsphere" }` | — |
| `health_facilities` | `{ district: 1 }` | — |
| `stock_records` | `{ facility_id: 1, medicine_id: 1, period: 1 }` | `unique: true` |
| `alerts` | `{ resolved: 1, severity: 1 }` | — |
| `stock_requests` | `{ status: 1, requested_on: -1 }` | — |

---

## REQ-02  Seed & Verify Scripts

### REQ-02-1  Idempotent Seed
WHEN `pnpm seed` is run,
THE SYSTEM SHALL drop all five collections and recreate them with the exact data from the PDF
(plus AL007), leaving the database in a deterministic state regardless of prior runs.

### REQ-02-2  Verify Closing Balance
WHEN `pnpm verify-data` is run,
THE SYSTEM SHALL assert for every `stock_record`:
1. `closing === opening + received - issued`
2. When `batches.length > 0`: `SUM(batch.qty) === closing`

The script SHALL print a ✓/✗ line per document and exit with **code 1** if any assertion fails.
It SHALL NOT flag SR001 as invalid (see PDF-3).

---

## REQ-03  Business Rules (Service Layer)

### REQ-03-1  Stock-Out
THE SYSTEM SHALL classify a stock record as **stock-out** when `closing === 0`.

### REQ-03-2  Low Stock
THE SYSTEM SHALL classify a stock record as **low stock** when `closing > 0 && closing < medicine.reorder_level`.

### REQ-03-3  Near Expiry
THE SYSTEM SHALL classify a batch as **near expiry** when `batch.expiry <= asOfDate + 90 days`.
The `asOfDate` parameter SHALL default to `new Date()` when omitted.
All tests that exercise near-expiry logic SHALL pin `asOfDate` to **2026-10-13**.
The cut-off date for 2026-10-13 is **2027-01-11**.

### REQ-03-4  Alert Deduplication
WHEN a stock record is created or updated,
THE SYSTEM SHALL generate an alert for each triggered condition ONLY IF no **unresolved** alert of the
same `type` exists for the same `facility_id` + `medicine_id` combination.
Duplicate resolved alerts are allowed.

### REQ-03-5  Derived-Data Integrity on Write
WHEN a stock record write is attempted via the API,
THE SYSTEM SHALL reject the request with **HTTP 422** if:
- `opening + received - issued !== closing`, OR
- `batches` is non-empty AND `SUM(batch.qty) !== closing`

### REQ-03-6  Alert Resolution
WHEN `PATCH /alerts/:id/resolve` is called,
THE SYSTEM SHALL set `resolved: true` and `resolved_on: <current UTC timestamp>`.
Resolving an alert SHALL NOT modify any linked `stock_requests` (PDF-2).

---

## REQ-04  API Endpoints

### REQ-04-1  CRUD Resources
THE SYSTEM SHALL expose full CRUD for:
`GET|POST /facilities`, `GET|PUT|DELETE /facilities/:id`
`GET|POST /medicines`, `GET|PUT|DELETE /medicines/:id`
`GET|POST /stock-records`, `GET|PUT|DELETE /stock-records/:id`
`GET|POST /stock-requests`, `GET|PUT|DELETE /stock-requests/:id`
`GET /alerts`, `GET /alerts/:id`

### REQ-04-2  Q7.1 — Unresolved Stock-Out Alerts
`GET /analytics/stockouts`
THE SYSTEM SHALL return all unresolved alerts where `type === "stockout"`,
with `facility_id` and `medicine_id` resolved to names, sorted by `raised_on` descending.
Expected (seed data): AL002 (HF003 / MED003), AL003 (HF006 / MED002).

### REQ-04-3  Q7.2 — Stock-Out Days by District
`GET /analytics/stockout-days-by-district`
THE SYSTEM SHALL return `[{ district, total_stockout_days }]` sorted descending.
Integration tests MUST assert exactly: **Arua = 21, Kotido = 14, Nakaseke = 9**.

### REQ-04-4  Q7.3 — Expiring Batches
`GET /analytics/expiring-batches?days=90&asOf=YYYY-MM-DD`
THE SYSTEM SHALL return batch-level rows where `batch.expiry <= asOf + days`,
including facility name and medicine name.
Integration tests with `asOf=2026-10-13` MUST return batches **AM-2311** and **PA-2410** (and only those two from the seed data).

### REQ-04-5  Q7.4 — Resolve Alert
`PATCH /alerts/:id/resolve`
THE SYSTEM SHALL resolve the alert (REQ-03-6) and return the updated document.
Integration tests MUST verify AL002 is resolved and `resolved_on` is set.

### REQ-04-6  Q7.5 — Below Reorder Level
`GET /analytics/below-reorder`
THE SYSTEM SHALL return all stock records where `closing < medicine.reorder_level`,
joined with facility and medicine names and reorder levels.
Integration tests MUST assert **exactly 5 rows** matching the PDF's expected output.

### REQ-04-7  Q7.6 — Escalate Pending Requests
`POST /requests/escalate-pending?before=YYYY-MM-DD`
THE SYSTEM SHALL update all `stock_requests` with `status === "pending"` and
`requested_on < before` to `status = "approved"`, and return `{ modifiedCount }`.
Integration tests with `before=2026-09-20` MUST assert `modifiedCount === 1` (SQ002).

### REQ-04-8  GeoNear — Nearest Facility with Stock
`GET /facilities/nearest?medicineId=&lng=&lat=&minQty=`
THE SYSTEM SHALL use `$geoNear` to return facilities ordered by distance from `[lng, lat]`
that have a current stock record for `medicineId` with `closing >= minQty`.

### REQ-04-9  Pagination
EVERY list endpoint SHALL support `?page=1&limit=20` (default limit 20, max 100)
and return `{ data, total, page, limit }`.

### REQ-04-10  Error Format
ALL error responses SHALL use `{ statusCode: number, error: string, message: string }`.

---

## REQ-05  Frontend

### REQ-05-1  Dashboard
THE SYSTEM SHALL show four KPI cards (open stock-outs, low-stock items,
near-expiry batches at default 90-day window, pending requests) and
a Recharts bar chart of stock-out days by district.

### REQ-05-2  Alerts Page
THE SYSTEM SHALL display an alerts table filterable by `type`, `severity`, and `resolved`.
A "Resolve" action SHALL show a confirmation dialog before calling `PATCH /alerts/:id/resolve`.

### REQ-05-3  Stock Records Page
THE SYSTEM SHALL show a table with facility/medicine names resolved, closing balance
highlighted when below reorder level, and an expandable row for batch details.
A form SHALL add a monthly record with live validation of `closing = opening + received - issued`.

### REQ-05-4  Expiry Tracker
THE SYSTEM SHALL show batches ordered by expiry ascending, with an adjustable
day-window slider (default 90) and an as-of date picker.

### REQ-05-5  Facility Map
THE SYSTEM SHALL render a Leaflet map of all facilities using their GeoJSON coordinates,
colour-coded by current stock status (stockout = red, low = amber, normal = green).
A "Find nearest with stock" panel SHALL call `GET /facilities/nearest`.

### REQ-05-6  Requests Page
THE SYSTEM SHALL show stock requests filterable by `status`,
with an "Escalate pending" action and an expandable item list per request.

### REQ-05-7  UX Baseline
ALL pages SHALL be responsive, keyboard-navigable, and meet WCAG 2.1 AA colour contrast.
ALL async operations SHALL show loading skeletons and error states.

---

## REQ-06  Quality & Documentation

### REQ-06-1  Integration Tests (Vitest + mongodb-memory-server)
THE SYSTEM SHALL include tests that assert the exact outputs from PDF §7:
- Q7.2: Arua 21, Kotido 14, Nakaseke 9
- Q7.3 (asOf 2026-10-13): AM-2311 and PA-2410 present, no other batches
- Q7.5: exactly 5 rows
- Q7.6 (before 2026-09-20): modifiedCount 1

### REQ-06-2  Playwright Smoke Test
THE SYSTEM SHALL include one Playwright test that opens the dashboard and asserts
the district chart renders without errors.

### REQ-06-3  mongosh Scripts
THE SYSTEM SHALL include `docs/mongosh/q7.1.js` through `docs/mongosh/q7.6.js`
containing the raw mongosh versions of each PDF query (verbatim from the PDF).

### REQ-06-4  README
THE SYSTEM SHALL include a README with:
- Mermaid architecture diagram
- Setup in ≤5 commands (`docker compose up -d`, `pnpm install`, `pnpm seed`, `pnpm dev`)
- Table mapping each PDF query to its API endpoint and UI screen
- Known Issues summary (this document's table)
