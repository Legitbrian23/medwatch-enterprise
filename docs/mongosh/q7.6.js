// Source: MedWatch NoSQL Mid-Semester Task, Section 7.6
// Escalate old pending requests — any request still pending after 20 September is flagged.
//
// NOTE: This is the verbatim PDF version which sets escalated:true.
// The MedWatch API endpoint (POST /stock-requests/escalate-pending) instead
// sets status="approved" to match the project brief. Both behaviours are preserved
// — this file is the assessment artefact; the API is the production behaviour.

db.stock_requests.updateMany(
  { status: "pending", requested_on: { $lt: ISODate("2026-09-20") } },
  { $set: { escalated: true } }
)

// Expected output:
// { acknowledged: true, matchedCount: 1, modifiedCount: 1 }
// (SQ002, requested_on: 2026-09-18, is the only matching document)
