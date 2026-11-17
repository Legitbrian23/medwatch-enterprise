import { Db } from 'mongodb';

/**
 * Creates all indexes exactly as specified in PDF §6.
 * createIndex is idempotent — safe to call on every startup.
 */
export async function createIndexes(db: Db): Promise<void> {
  // 2dsphere for geospatial queries on facility location
  await db.collection('health_facilities').createIndex({ location: '2dsphere' });

  // District lookup (Q7.2 aggregation)
  await db.collection('health_facilities').createIndex({ district: 1 });

  // Unique compound: one stock record per facility+medicine+period
  await db.collection('stock_records').createIndex(
    { facility_id: 1, medicine_id: 1, period: 1 },
    { unique: true },
  );

  // Alert queries by resolution state and severity
  await db.collection('alerts').createIndex({ resolved: 1, severity: 1 });

  // Request queries sorted by date within status
  await db.collection('stock_requests').createIndex({ status: 1, requested_on: -1 });

  // Unique email index for users (extension collection)
  // One account per email address — enforces login uniqueness
  await db.collection('users').createIndex({ email: 1 }, { unique: true });

  // Audit log time-range queries
  await db.collection('audit_log').createIndex({ timestamp: -1 });
}
