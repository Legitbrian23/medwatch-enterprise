# ObjectId Migration Guide

## Current State
MedWatch uses human-readable string `_id`s (HF001, MED002, SR003, etc.) as recommended in the PDF
for assessment readability (PDF §3 Design decisions).

## When to Migrate
In production, MongoDB recommends ObjectIds or national facility codes (e.g., HMIS facility codes
issued by the Ministry of Health) for scalability and to avoid manual ID management.

## Migration Strategy

### Step 1 — Add a `legacy_id` field
Before migrating, add the old string ID as a `legacy_id` field so existing integrations still work:

```js
// In mongosh
db.health_facilities.updateMany({}, [
  { $set: { legacy_id: "$_id" } }
])
```

### Step 2 — Create a mapping collection
```js
db.createCollection("id_map")
// For each collection, record old→new mappings
db.health_facilities.find({}, { legacy_id: 1 }).forEach(doc => {
  db.id_map.insertOne({ collection: "health_facilities", old_id: doc.legacy_id, new_id: new ObjectId() })
})
```

### Step 3 — Re-insert with ObjectIds using `$out`
Use an aggregation pipeline to write transformed documents to a new collection,
then rename atomically:

```js
db.health_facilities.aggregate([
  {
    $addFields: {
      _id: {
        $toObjectId: {
          $arrayElemAt: [
            { $map: {
              input: { $filter: { input: { $objectToArray: db.id_map.find({ collection: "health_facilities" }).toArray() }, as: "m", cond: { $eq: ["$$m.v.old_id", "$_id"] } } },
              as: "match",
              in: "$$match.v.new_id"
            }},
            0
          ]
        }
      }
    }
  },
  { $out: "health_facilities_new" }
])
```

### Step 4 — Update all references
After migrating the parent collections, update `facility_id` and `medicine_id` foreign-key fields
in `stock_records`, `stock_requests`, and `alerts` using the same mapping.

### Step 5 — Rename collections
```js
db.health_facilities.renameCollection("health_facilities_old")
db.health_facilities_new.renameCollection("health_facilities")
```

### Step 6 — Validate and drop old collections
Run the verify-data script, then drop the `_old` collections once validated.

## National Facility Codes
Uganda's Health Management Information System (HMIS) assigns unique facility codes.
Using these as `_id` values would allow direct joins with external HMIS data exports
without a mapping step.
