import { describe, it, expect, beforeEach } from 'vitest';
import { getDb } from '../db/client.js';
import {
  getStockoutDaysByDistrict,
  getExpiringBatches,
  getBelowReorder,
} from '../repositories/analytics.repo.js';
import { stockRequests } from '../db/client.js';
import { seedTestDb } from './seedTestDb.js';

// Pin the assessment as-of date per requirements
const AS_OF = new Date('2026-10-13');

describe('Analytics — PDF §7 queries', () => {
  beforeEach(async () => {
    await seedTestDb();
  });

  // ─── Q7.2 ──────────────────────────────────────────────────────────────────
  it('Q7.2 stockout days by district: Arua=21, Kotido=14, Nakaseke=9', async () => {
    const results = await getStockoutDaysByDistrict(getDb());
    const map = Object.fromEntries(results.map((r) => [r.district, r.total_stockout_days]));
    expect(map['Arua']).toBe(21);
    expect(map['Kotido']).toBe(14);
    expect(map['Nakaseke']).toBe(9);
    // Only districts with stockout_days > 0 are returned
    expect(results.every((r) => r.total_stockout_days > 0)).toBe(true);
    // Sorted descending
    expect(results[0].total_stockout_days).toBeGreaterThanOrEqual(results[1].total_stockout_days);
  });

  // ─── Q7.3 ──────────────────────────────────────────────────────────────────
  it('Q7.3 expiring batches (asOf 2026-10-13, 90 days): AM-2311 and PA-2410 only', async () => {
    const results = await getExpiringBatches(getDb(), 90, AS_OF);
    const batchNos = results.map((r) => r.batch_no);
    expect(batchNos).toContain('AM-2311');
    expect(batchNos).toContain('PA-2410');
    // No other batch in the seed data should fall within the window
    expect(batchNos.length).toBe(2);
  });

  // ─── Q7.5 ──────────────────────────────────────────────────────────────────
  it('Q7.5 below reorder: exactly 5 rows', async () => {
    const results = await getBelowReorder(getDb());
    expect(results.length).toBe(5);

    // Spot-check the expected rows from PDF §7.5
    const facilityMedicinePairs = results.map((r) => `${r.facility}|${r.medicine}`);
    expect(facilityMedicinePairs).toContain('Kasambya Health Centre III|Artemether-Lumefantrine');
    expect(facilityMedicinePairs).toContain('Kasambya Health Centre III|Amoxicillin');
    expect(facilityMedicinePairs).toContain('Rwenzori Hospital|Oxytocin');
    expect(facilityMedicinePairs).toContain('Lokitelaebu Health Centre II|Oral Rehydration Salts');
    expect(facilityMedicinePairs).toContain('Ayivu Health Centre II|Artemether-Lumefantrine');
  });

  // ─── Q7.6 ──────────────────────────────────────────────────────────────────
  it('Q7.6 escalate pending before 2026-09-20: modifiedCount=1 (SQ002)', async () => {
    const result = await stockRequests().updateMany(
      { status: 'pending', requested_on: { $lt: new Date('2026-09-20') } },
      { $set: { status: 'approved' } },
    );
    expect(result.modifiedCount).toBe(1);

    // SQ002 (requested_on 2026-09-18) should now be approved
    const sq002 = await stockRequests().findOne({ _id: 'SQ002' });
    expect(sq002?.status).toBe('approved');

    // SQ004 (requested_on 2026-09-28) should still be pending
    const sq004 = await stockRequests().findOne({ _id: 'SQ004' });
    expect(sq004?.status).toBe('pending');
  });
});
