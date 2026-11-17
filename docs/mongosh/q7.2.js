// Source: MedWatch NoSQL Mid-Semester Task, Section 7.2
// Total stock-out days per district — the district health office can see where the problem is worst.

db.stock_records.aggregate([
  { $lookup: { from: "health_facilities", localField: "facility_id",
               foreignField: "_id", as: "fac" } },
  { $unwind: "$fac" },
  { $group: { _id: "$fac.district", total_stockout_days: { $sum: "$stockout_days" } } },
  { $match: { total_stockout_days: { $gt: 0 } } },
  { $sort: { total_stockout_days: -1 } }
])

// Expected output:
// { _id: "Arua", total_stockout_days: 21 }
// { _id: "Kotido", total_stockout_days: 14 }
// { _id: "Nakaseke", total_stockout_days: 9 }
