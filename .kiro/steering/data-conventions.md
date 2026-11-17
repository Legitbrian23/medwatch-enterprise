---
inclusion: always
---

# MedWatch — Data & Coding Conventions

## Source of Truth
The PDF "MedWatch: tracking medicine stock-outs in public health facilities with MongoDB"
(NoSQL Mid-Semester Task, dated 13 October 2026) is the authoritative source for:
- Collection names (exact spelling, snake_case)
- Field names (exact spelling)
- Custom `_id` strings (HF001–HF006, MED001–MED006, SR001–SR008, SQ001–SQ006, AL001–AL006)
- Sample data values
- Index definitions (PDF §6)
- Query logic (PDF §7)

**Never rename a collection, field, or seed document `_id` without explicit user approval.**

## Collection & Field Names
- Collections: `health_facilities`, `medicines`, `stock_records`, `stock_requests`, `alerts`
- Use the PDF's exact field names: `facility_id`, `medicine_id`, `raised_on`, `resolved_on`,
  `stockout_days`, `batch_no`, `expiry`, `reorder_level`, `tracer_item`, `cold_chain`, etc.
- GeoJSON field is always named `location` with `{ type: "Point", coordinates: [lng, lat] }`.

## Enumerations (enforced by $jsonSchema)
| Field | Allowed values |
|-------|---------------|
| `health_facilities.level` | `"HC II"`, `"HC III"`, `"HC IV"`, `"General Hospital"` |
| `alerts.type` | `"stockout"`, `"low_stock"`, `"near_expiry"` |
| `alerts.severity` | `"low"`, `"medium"`, `"high"`, `"critical"` |
| `stock_requests.status` | `"pending"`, `"approved"`, `"delivered"`, `"cancelled"`, `"rejected"` |

> The PDF seed data uses `"stock_out"` (with underscore) as alert type in two documents.
> We normalise to `"stockout"` (no underscore) throughout. The seed script applies this fix.

## Business Rules (never bypass in service code)
1. **Closing balance invariant:** `closing = opening + received - issued`
2. **Batch sum invariant:** `SUM(batches[].qty) = closing` when `batches.length > 0`
3. **Stock-out:** `closing === 0`
4. **Low stock:** `closing > 0 && closing < medicine.reorder_level`
5. **Near expiry:** `batch.expiry <= asOfDate + 90 days`
6. **Alert dedup:** do not create a second unresolved alert of the same `type` for the same `facility_id + medicine_id`

## Date Handling
- All dates stored as **BSON Date / JavaScript `Date`** objects, never strings.
- `period` in `stock_records` is a **`YYYY-MM` string** (not a Date), for human readability.
- The `asOfDate` parameter defaults to `new Date()` at call time.
- **Tests must pin `asOfDate` to `2026-10-13`** (the PDF's assessment date).
- The 90-day cut-off for 2026-10-13 is **2027-01-11**.

## Known Data Fixes Applied by Seed Script
| Fix | Detail |
|-----|--------|
| AL007 added | Near-expiry alert for batch AM-2311 (HF001/MED001), which the PDF omits. |
| `"stock_out"` → `"stockout"` | AL002 and AL003 in PDF use `"stock_out"`; seed normalises to `"stockout"`. |

## TypeScript Conventions
- `interface` for data shapes from MongoDB; `type` for unions and computed types.
- All MongoDB collection accessors are typed: `Db.collection<HealthFacility>("health_facilities")`.
- No `any`. Use `unknown` and narrow it.
- Prefer `async/await` over `.then()` chains.
- All service functions accept an explicit `asOfDate: Date` parameter; never call `new Date()` inside a service without passing it down.

## API Conventions
- HTTP method follows REST semantics exactly.
- `PATCH` is used for partial updates (resolve alert). `PUT` is used for full document replace.
- Pagination: `?page=1&limit=20` (1-indexed pages). Response envelope: `{ data, total, page, limit }`.
- Error envelope: `{ statusCode, error, message }`.
- Never return unbounded query results; always apply a limit.

## Frontend Conventions
- One TanStack Query hook per API resource, located in `apps/web/src/hooks/`.
- `queryKey` arrays always start with the resource name: `["alerts", filters]`.
- Invalidate the affected query key after every mutation.
- All form inputs have `<label>` elements with explicit `htmlFor`.
- Loading states use skeleton components; error states show a retry button.

## Privacy
- All facility names, staff names, and phone numbers in the sample data are **fictional**.
- District names and supplier names are real Ugandan places/organisations used for realism only.
- Do not introduce any real personal data into the codebase.

## Documentation
- Keep `docs/mongosh/q7.1.js` through `docs/mongosh/q7.6.js` as verbatim PDF copies.
- Do not "improve" the mongosh scripts; they are assessment artefacts.
- The `q7.6.js` file uses `$set: { escalated: true }` (PDF original), not `status:"approved"`.
