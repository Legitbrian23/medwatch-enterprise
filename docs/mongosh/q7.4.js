// Source: MedWatch NoSQL Mid-Semester Task, Section 7.4
// Resolve an alert — once a delivery arrives, the alert is closed and the date is stored.

db.alerts.updateOne(
  { _id: "AL002" },
  { $set: { resolved: true, resolved_on: new Date() } }
)

// Expected output:
// { acknowledged: true, matchedCount: 1, modifiedCount: 1 }
