// Source: MedWatch NoSQL Mid-Semester Task, Section 7.1
// Unresolved stock-outs — shows the two facilities that need urgent attention right now.

db.alerts.find(
  { type: "stock_out", resolved: false },
  { facility_id: 1, medicine_id: 1, severity: 1 }
)

// Expected output:
// { _id: "AL002", facility_id: "HF003", medicine_id: "MED003", severity: "critical" }
// { _id: "AL003", facility_id: "HF006", medicine_id: "MED002", severity: "critical" }
//
// Note: the PDF uses "stock_out" as the type value. The MedWatch API normalises
// this to "stockout" (no underscore). The raw mongosh query above is preserved
// verbatim for assessment purposes.
