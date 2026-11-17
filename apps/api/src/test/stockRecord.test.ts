import { describe, it, expect } from 'vitest';
import { validateBalances } from '../services/stockRecord.service.js';

describe('StockRecord balance validation', () => {
  it('passes when closing = opening + received - issued', () => {
    expect(validateBalances({ opening: 350, received: 0, issued: 330, closing: 20, batches: [] })).toBeNull();
  });

  it('fails when closing is wrong', () => {
    const err = validateBalances({ opening: 350, received: 0, issued: 330, closing: 25, batches: [] });
    expect(err).not.toBeNull();
    expect(err!.field).toBe('closing');
    expect(err!.message).toContain('25');
    expect(err!.message).toContain('20');
  });

  it('passes when batch sum matches closing', () => {
    expect(validateBalances({
      opening: 500, received: 200, issued: 420, closing: 280,
      batches: [{ batch_no: 'AM-2311', expiry: new Date(), qty: 80 }, { batch_no: 'AM-2501', expiry: new Date(), qty: 200 }],
    })).toBeNull();
  });

  it('fails when batch sum does not match closing', () => {
    const err = validateBalances({
      opening: 500, received: 200, issued: 420, closing: 280,
      batches: [{ batch_no: 'AM-2311', expiry: new Date(), qty: 100 }], // 100 ≠ 280
    });
    expect(err).not.toBeNull();
    expect(err!.field).toBe('batches');
  });

  it('ignores batch sum when batches array is empty (SR005 pattern)', () => {
    // SR005: closing=0, batches=[] — valid
    expect(validateBalances({ opening: 120, received: 0, issued: 120, closing: 0, batches: [] })).toBeNull();
  });
});
