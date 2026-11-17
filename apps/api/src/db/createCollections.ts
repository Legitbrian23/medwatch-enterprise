import { Db } from 'mongodb';

/**
 * Creates all five MedWatch collections with $jsonSchema validators.
 * Safe to call repeatedly — skips already-existing collections.
 */
export async function createCollections(db: Db): Promise<void> {
  const existing = await db.listCollections().toArray();
  const names = new Set(existing.map((c) => c.name));

  if (!names.has('health_facilities')) {
    await db.createCollection('health_facilities', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['_id', 'name', 'level', 'district', 'subcounty', 'location', 'in_charge', 'catchment_population', 'services'],
          properties: {
            _id: { bsonType: 'string' },
            name: { bsonType: 'string' },
            level: { enum: ['HC II', 'HC III', 'HC IV', 'General Hospital'] },
            district: { bsonType: 'string' },
            subcounty: { bsonType: 'string' },
            location: {
              bsonType: 'object',
              required: ['type', 'coordinates'],
              properties: {
                type: { enum: ['Point'] },
                coordinates: { bsonType: 'array', minItems: 2, maxItems: 2 },
              },
            },
            in_charge: {
              bsonType: 'object',
              required: ['name', 'phone'],
              properties: {
                name: { bsonType: 'string' },
                phone: { bsonType: 'string' },
              },
            },
            catchment_population: { bsonType: 'int' },
            services: { bsonType: 'array', items: { bsonType: 'string' } },
          },
        },
      },
    });
  }

  if (!names.has('medicines')) {
    await db.createCollection('medicines', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['_id', 'generic_name', 'strength', 'form', 'category', 'unit', 'reorder_level', 'tracer_item', 'cold_chain'],
          properties: {
            _id: { bsonType: 'string' },
            generic_name: { bsonType: 'string' },
            strength: { bsonType: 'string' },
            form: { bsonType: 'string' },
            category: { bsonType: 'string' },
            unit: { bsonType: 'string' },
            reorder_level: { bsonType: 'int' },
            tracer_item: { bsonType: 'bool' },
            cold_chain: { bsonType: 'bool' },
          },
        },
      },
    });
  }

  if (!names.has('stock_records')) {
    await db.createCollection('stock_records', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['_id', 'facility_id', 'medicine_id', 'period', 'opening', 'received', 'issued', 'closing', 'stockout_days', 'batches'],
          properties: {
            _id: { bsonType: 'string' },
            facility_id: { bsonType: 'string' },
            medicine_id: { bsonType: 'string' },
            period: { bsonType: 'string' },
            opening: { bsonType: 'int' },
            received: { bsonType: 'int' },
            issued: { bsonType: 'int' },
            closing: { bsonType: 'int' },
            stockout_days: { bsonType: 'int' },
            batches: { bsonType: 'array' },
          },
        },
      },
    });
  }

  if (!names.has('stock_requests')) {
    await db.createCollection('stock_requests', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['_id', 'facility_id', 'requested_on', 'status', 'supplier', 'items', 'fulfilled_on'],
          properties: {
            _id: { bsonType: 'string' },
            facility_id: { bsonType: 'string' },
            requested_on: { bsonType: 'date' },
            status: { enum: ['pending', 'approved', 'delivered', 'cancelled', 'rejected'] },
            supplier: { bsonType: 'string' },
            items: { bsonType: 'array', minItems: 1 },
            fulfilled_on: { bsonType: ['date', 'null'] },
          },
        },
      },
    });
  }

  if (!names.has('alerts')) {
    await db.createCollection('alerts', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['_id', 'facility_id', 'medicine_id', 'type', 'severity', 'raised_on', 'resolved'],
          properties: {
            _id: { bsonType: 'string' },
            facility_id: { bsonType: 'string' },
            medicine_id: { bsonType: 'string' },
            type: { enum: ['stockout', 'low_stock', 'near_expiry'] },
            severity: { enum: ['low', 'medium', 'high', 'critical'] },
            raised_on: { bsonType: 'date' },
            resolved: { bsonType: 'bool' },
            resolved_on: { bsonType: ['date', 'null'] },
            batch_no: { bsonType: ['string', 'null'] },
          },
        },
      },
    });
  }

  if (!names.has('users')) {
    // Extension collection — not in original PDF schema
    await db.createCollection('users', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['_id', 'name', 'email', 'password_hash', 'role', 'active', 'failed_attempts', 'created_at'],
          properties: {
            _id: { bsonType: 'string' },
            name: { bsonType: 'string' },
            email: { bsonType: 'string' },
            password_hash: { bsonType: 'string' },
            role: { enum: ['facility', 'district', 'national', 'admin'] },
            facility_id: { bsonType: 'string' },
            district: { bsonType: 'string' },
            active: { bsonType: 'bool' },
            failed_attempts: { bsonType: 'int' },
            locked_until: { bsonType: ['date', 'null'] },
            last_login: { bsonType: ['date', 'null'] },
            created_at: { bsonType: 'date' },
            must_change_password: { bsonType: 'bool' },
          },
        },
      },
    });
  }

  if (!names.has('audit_log')) {
    // Extension collection — audit trail for auth and admin events
    await db.createCollection('audit_log');
  }
}
