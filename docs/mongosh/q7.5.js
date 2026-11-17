// Source: MedWatch NoSQL Mid-Semester Task, Section 7.5
// Stock below reorder level — compares each closing balance to the reorder level
// held in the medicines collection.

db.stock_records.aggregate([
  { $lookup: { from: "medicines", localField: "medicine_id",
               foreignField: "_id", as: "med" } },
  { $unwind: "$med" },
  { $match: { $expr: { $lt: ["$closing", "$med.reorder_level"] } } },
  { $lookup: { from: "health_facilities", localField: "facility_id",
               foreignField: "_id", as: "fac" } },
  { $unwind: "$fac" },
  { $project: { _id: 0, facility: "$fac.name", medicine: "$med.generic_name",
                closing: 1, reorder_level: "$med.reorder_level" } }
])

// Expected output (5 rows):
// { facility: "Kasambya Health Centre III", medicine: "Artemether-Lumefantrine", closing: 20, reorder_level: 400 }
// { facility: "Kasambya Health Centre III", medicine: "Amoxicillin", closing: 280, reorder_level: 300 }
// { facility: "Rwenzori Hospital", medicine: "Oxytocin", closing: 15, reorder_level: 40 }
// { facility: "Lokitelaebu Health Centre II", medicine: "Oral Rehydration Salts", closing: 0, reorder_level: 200 }
// { facility: "Ayivu Health Centre II", medicine: "Artemether-Lumefantrine", closing: 0, reorder_level: 400 }
