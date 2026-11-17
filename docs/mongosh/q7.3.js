// Source: MedWatch NoSQL Mid-Semester Task, Section 7.3
// Batches expiring in the next 90 days.
// Counted from 13 October 2026, so the cut-off is 11 January 2027.
// $unwind opens the embedded batches array.

db.stock_records.aggregate([
  { $unwind: "$batches" },
  { $match: { "batches.expiry": { $lt: ISODate("2027-01-11") } } },
  { $project: { _id: 0, facility_id: 1, medicine_id: 1,
                batch_no: "$batches.batch_no", expiry: "$batches.expiry",
                qty: "$batches.qty" } }
])

// Expected output:
// { facility_id: "HF001", medicine_id: "MED001", batch_no: "AM-2311", expiry: ISODate("2026-12-15"), qty: 80 }
// { facility_id: "HF004", medicine_id: "MED004", batch_no: "PA-2410", expiry: ISODate("2026-12-20"), qty: 200 }
