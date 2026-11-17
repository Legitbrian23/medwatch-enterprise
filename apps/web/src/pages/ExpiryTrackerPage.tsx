import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useExpiringBatches } from '../hooks/useAnalytics.js';
import type { ExpiringBatch } from '@medwatch/shared';

const WINDOWS = [30, 60, 90, 180];

export default function ExpiryTrackerPage() {
  const { user } = useAuth();
  const isFacility = user?.role === 'facility';
  const isDistrict = user?.role === 'district';

  const [days, setDays] = useState(90);
  const [asOf, setAsOf] = useState('');

  const { data: rawData, isPending, isError, refetch } = useExpiringBatches(days, asOf || undefined);

  // Scope batches by role
  const data = (rawData ?? []).filter((b: ExpiringBatch) => {
    if (isFacility && user?.facility_id) {
      return b.facility_name.includes('Kasambya') || b.facility_name.includes(user.facility_id);
    }
    if (isDistrict && user?.district) {
      // Nakaseke district includes Kasambya (HF001) and Rwenzori (HF002)
      return b.facility_name.includes('Kasambya') || b.facility_name.includes('Rwenzori');
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 className="page-title">Expiry tracker</h1>
        <p className="page-subtitle">
          {isFacility
            ? `Batches expiring within the selected window for your facility (${user?.facility_id ?? 'Kasambya HC III'})`
            : isDistrict
              ? `Batches expiring within the selected window in ${user?.district ?? 'Nakaseke'} District`
              : 'Batches expiring within the selected window across all health facilities'}
        </p>
      </div>

      {/* Controls */}
      <div className="card" style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Window</p>
          <div role="group" aria-label="Expiry window" style={{ display: 'flex' }}>
            {WINDOWS.map((opt, i) => (
              <button
                key={opt}
                onClick={() => setDays(opt)}
                aria-pressed={days === opt}
                style={{
                  background: days === opt ? 'var(--accent-500)' : 'var(--surface-1)',
                  color: days === opt ? '#fff' : 'var(--text-secondary)',
                  border: '1.5px solid var(--border)',
                  borderLeft: i > 0 ? 'none' : '1.5px solid var(--border)',
                  borderRadius: i === 0 ? '6px 0 0 6px' : i === WINDOWS.length - 1 ? '0 6px 6px 0' : '0',
                  padding: '7px 16px', fontSize: 13, cursor: 'pointer',
                  fontWeight: days === opt ? 600 : 400,
                  fontFamily: 'inherit',
                  transition: 'background 150ms, color 150ms',
                }}
              >
                {opt}d
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="expiry-asof" style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
            As-of date
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input id="expiry-asof" type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="input" />
            {asOf && <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setAsOf('')}>Reset</button>}
          </div>
        </div>
        {data && (
          <div style={{ marginLeft: 'auto' }}>
            <span className={`badge ${data.length > 0 ? 'badge--high' : 'badge--healthy'}`}>
              {data.length} batch{data.length !== 1 ? 'es' : ''}
            </span>
          </div>
        )}
      </div>

      {isPending && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48 }} />)}</div>}
      {isError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <p style={{ color: 'var(--status-critical)', fontSize: 13 }}>Failed to load batch data.</p>
          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {data && (
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Batch no</th><th>Facility</th><th>Medicine</th><th>Expiry</th><th>Qty</th></tr></thead>
            <tbody>
              {data.map((b: Omit<ExpiringBatch, 'expiry'> & { expiry: string | Date }) => (
                <tr key={b.batch_no}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.batch_no}</td>
                  <td style={{ fontWeight: 500 }}>{b.facility_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{b.medicine_name}</td>
                  <td className="tabular" style={{ color: 'var(--status-high)', fontWeight: 600 }}>
                    {new Date(b.expiry).toLocaleDateString()}
                  </td>
                  <td className="tabular">{b.qty}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: 13 }}>No batches expiring in this window.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
