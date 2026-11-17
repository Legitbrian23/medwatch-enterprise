/**
 * Verify-data script — checks derived-data invariants for every stock record.
 * Rules (per PDF §3 Design decisions):
 *   1. closing = opening + received - issued
 *   2. SUM(batch.qty) = closing  (only when batches.length > 0)
 *
 * Note: SR001 has stockout_days=9 with closing=20 — this is intentional (PDF-3)
 * and is NOT checked here. stockout_days is an observed field, not derived.
 *
 * Run: pnpm verify-data
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import type { StockRecord } from '@medwatch/shared';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB ?? 'medwatch';

async function verifyData(): Promise<void> {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);

  const records = await db
    .collection<StockRecord>('stock_records')
    .find({})
    .toArray();

  console.log(`\n🔍  Verifying ${records.length} stock records in "${MONGODB_DB}"\n`);

  let failures = 0;

  for (const r of records) {
    const expectedClosing = r.opening + r.received - r.issued;
    const balanceOk = r.closing === expectedClosing;

    const batchSum = r.batches.reduce((acc, b) => acc + b.qty, 0);
    const batchOk = r.batches.length === 0 || batchSum === r.closing;

    const ok = balanceOk && batchOk;
    if (!ok) failures++;

    const icon = ok ? '✓' : '✗';
    let line = `  ${icon} ${r._id}  closing=${r.closing}  (${r.opening}+${r.received}-${r.issued}=${expectedClosing})`;
    if (!balanceOk) line += `  ← BALANCE MISMATCH`;
    if (r.batches.length > 0) {
      line += `  batches_sum=${batchSum}`;
      if (!batchOk) line += `  ← BATCH SUM MISMATCH`;
    }
    console.log(line);
  }

  console.log(`\n${failures === 0 ? '✅  All checks passed.' : `❌  ${failures} check(s) failed.`}\n`);
  await client.close();
  if (failures > 0) process.exit(1);
}

verifyData().catch((err) => {
  console.error('❌  verify-data failed:', err);
  process.exit(1);
});
