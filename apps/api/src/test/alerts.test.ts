import { describe, it, expect, beforeEach } from 'vitest';
import { alerts, stockRecords, medicines } from '../db/client.js';
import { resolveAlert, generateAlertsForStockRecord } from '../services/alert.service.js';
import { seedTestDb } from './seedTestDb.js';
import type { StockRecord } from '@medwatch/shared';

describe('Alert service', () => {
  beforeEach(async () => {
    await seedTestDb();
  });

  it('Q7.4 resolve AL002: resolved=true and resolved_on is set', async () => {
    const updated = await resolveAlert(alerts(), 'AL002');
    expect(updated).not.toBeNull();
    expect(updated!.resolved).toBe(true);
    expect(updated!.resolved_on).toBeInstanceOf(Date);

    // Verify it persisted
    const fetched = await alerts().findOne({ _id: 'AL002' });
    expect(fetched!.resolved).toBe(true);
    expect(fetched!.resolved_on).toBeInstanceOf(Date);
  });

  it('Dedup: creating same stock-out twice does not produce a second unresolved alert', async () => {
    // SR005 (HF003/MED003) is already a stock-out; AL002 exists for it
    const before = await alerts().countDocuments({ facility_id: 'HF003', medicine_id: 'MED003', type: 'stockout', resolved: false });
    expect(before).toBe(1);

    const record = await stockRecords().findOne({ _id: 'SR005' }) as StockRecord;
    await generateAlertsForStockRecord(alerts(), medicines() as never, record, new Date('2026-10-13'));

    const after = await alerts().countDocuments({ facility_id: 'HF003', medicine_id: 'MED003', type: 'stockout', resolved: false });
    expect(after).toBe(1); // still 1 — dedup worked
  });

  it('AL007 exists in seed: near-expiry alert for AM-2311', async () => {
    const al007 = await alerts().findOne({ _id: 'AL007' });
    expect(al007).not.toBeNull();
    expect(al007!.type).toBe('near_expiry');
    expect(al007!.batch_no).toBe('AM-2311');
    expect(al007!.facility_id).toBe('HF001');
    expect(al007!.medicine_id).toBe('MED001');
  });
});
