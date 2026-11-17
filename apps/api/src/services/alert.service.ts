import { Collection } from 'mongodb';
import type { Alert, AlertSeverity, AlertType, StockRecord } from '@medwatch/shared';

/**
 * Determines severity based on days until expiry.
 * < 30 days → "high", 30–60 → "medium", 60–90 → "low"
 */
export function nearExpirySeverity(daysUntilExpiry: number): AlertSeverity {
  if (daysUntilExpiry < 30) return 'high';
  if (daysUntilExpiry < 60) return 'medium';
  return 'low';
}

/**
 * Generates alerts for a stock record based on business rules.
 * Deduplicates: does not create a second unresolved alert of the same type
 * for the same facility_id + medicine_id combination.
 *
 * NOTE: Alert resolution and request fulfilment are independent (PDF-2).
 */
export async function generateAlertsForStockRecord(
  alertsCol: Collection<Alert>,
  medicinesCol: Collection<{ _id: string; reorder_level: number }>,
  record: StockRecord,
  asOfDate: Date,
): Promise<void> {
  const medicine = await medicinesCol.findOne({ _id: record.medicine_id });
  if (!medicine) return;

  // Helper: upsert alert only if no unresolved alert of same type exists
  async function upsertAlert(
    type: AlertType,
    severity: AlertSeverity,
    batchNo?: string,
  ): Promise<void> {
    const filter: Partial<Alert> = {
      facility_id: record.facility_id,
      medicine_id: record.medicine_id,
      type,
      resolved: false,
    };
    // For near_expiry, also key on batch_no to allow per-batch dedup
    if (type === 'near_expiry' && batchNo) {
      (filter as Record<string, unknown>).batch_no = batchNo;
    }

    const existing = await alertsCol.findOne(filter);
    if (existing) return; // already have an unresolved alert of this type

    // Generate next ID
    const count = await alertsCol.countDocuments();
    const newId = `AL${String(count + 1).padStart(3, '0')}`;

    await alertsCol.insertOne({
      _id: newId,
      facility_id: record.facility_id,
      medicine_id: record.medicine_id,
      type,
      severity,
      raised_on: asOfDate,
      resolved: false,
      resolved_on: null,
      batch_no: batchNo ?? null,
    } as Alert);
  }

  // Rule 1: stock-out (closing === 0)
  if (record.closing === 0) {
    await upsertAlert('stockout', 'critical');
  }
  // Rule 2: low stock (0 < closing < reorder_level)
  else if (record.closing < medicine.reorder_level) {
    const severity: AlertSeverity =
      record.closing < medicine.reorder_level * 0.25 ? 'high' : 'medium';
    await upsertAlert('low_stock', severity);
  }

  // Rule 3: near-expiry batches (independent of stock-out / low-stock)
  const cutoff = new Date(asOfDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  for (const batch of record.batches) {
    if (batch.expiry <= cutoff) {
      const daysUntil = Math.floor(
        (batch.expiry.getTime() - asOfDate.getTime()) / (24 * 60 * 60 * 1000),
      );
      const severity = nearExpirySeverity(daysUntil);
      await upsertAlert('near_expiry', severity, batch.batch_no);
    }
  }
}

/**
 * Resolves an alert by ID.
 * Does NOT affect linked stock_requests (PDF-2).
 */
export async function resolveAlert(
  alertsCol: Collection<Alert>,
  id: string,
  resolvedOn: Date = new Date(),
): Promise<Alert | null> {
  const result = await alertsCol.findOneAndUpdate(
    { _id: id },
    { $set: { resolved: true, resolved_on: resolvedOn } },
    { returnDocument: 'after' },
  );
  return result;
}
