import { MongoClient, Db, Collection } from 'mongodb';
import type {
  HealthFacility,
  Medicine,
  StockRecord,
  StockRequest,
  Alert,
  User,
} from '@medwatch/shared';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb(uri: string, dbName: string): Promise<Db> {
  if (db) return db;
  client = new MongoClient(uri, { maxPoolSize: 10 });
  await client.connect();
  db = client.db(dbName);

  // Graceful shutdown
  process.on('SIGINT', disconnect);
  process.on('SIGTERM', disconnect);

  return db;
}

export async function disconnect(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export function getDb(): Db {
  if (!db) throw new Error('Database not connected. Call connectDb() first.');
  return db;
}

// Typed collection accessors
export function facilities(): Collection<HealthFacility> {
  return getDb().collection<HealthFacility>('health_facilities');
}

export function medicines(): Collection<Medicine> {
  return getDb().collection<Medicine>('medicines');
}

export function stockRecords(): Collection<StockRecord> {
  return getDb().collection<StockRecord>('stock_records');
}

export function stockRequests(): Collection<StockRequest> {
  return getDb().collection<StockRequest>('stock_requests');
}

export function alerts(): Collection<Alert> {
  return getDb().collection<Alert>('alerts');
}

export function users(): Collection<User> {
  return getDb().collection<User>('users');
}
