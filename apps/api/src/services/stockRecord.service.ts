import type { StockRecord } from '@medwatch/shared';

export interface BalanceValidationError {
  field: string;
  expected: number;
  actual: number;
  message: string;
}

/**
 * Validates the two derived-data invariants for a stock record.
 * Returns null if valid, or an error descriptor if invalid.
 */
export function validateBalances(
  record: Pick<StockRecord, 'opening' | 'received' | 'issued' | 'closing' | 'batches'>,
): BalanceValidationError | null {
  const expectedClosing = record.opening + record.received - record.issued;

  if (record.closing !== expectedClosing) {
    return {
      field: 'closing',
      expected: expectedClosing,
      actual: record.closing,
      message: `closing (${record.closing}) ≠ opening (${record.opening}) + received (${record.received}) - issued (${record.issued}) = ${expectedClosing}`,
    };
  }

  if (record.batches.length > 0) {
    const batchSum = record.batches.reduce((acc, b) => acc + b.qty, 0);
    if (batchSum !== record.closing) {
      return {
        field: 'batches',
        expected: record.closing,
        actual: batchSum,
        message: `SUM(batch.qty) (${batchSum}) ≠ closing (${record.closing})`,
      };
    }
  }

  return null;
}
