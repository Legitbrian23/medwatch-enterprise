import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useStockRecords, useCreateStockRecord } from '../hooks/useStockRecords.js';
import type { Batch } from '@medwatch/shared';

const FIELDS = ['facility_id','medicine_id','period','opening','received','issued','closing','stockout_days'] as const;
type FieldKey = typeof FIELDS[number];
const LABELS: Record<FieldKey, string> = {
  facility_id:'Facility ID', medicine_id:'Medicine ID', period:'Period (YYYY-MM)',
  opening:'Opening', received:'Received', issued:'Issued', closing:'Closing', stockout_days:'Stockout days',
};
type FormState = Record<FieldKey, string>;
const EMPTY: FormState = { facility_id:'', medicine_id:'', period:'', opening:'', received:'', issued:'', closing:'', stockout_days:'' };

export default function StockRecordsPage() {
  const { user } = useAuth();
  const isFacility = user?.role === 'facility';
  const isDistrict = user?.role === 'district';

  // Facility user only manages records for their own facility
  const filters = isFacility && user?.facility_id ? { facilityId: user.facility_id } : {};
  const { data, isPending, isError } = useStockRecords(filters);
  const createRecord = useCreateStockRecord();
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [form, setForm]               = useState<FormState>(EMPTY);
  const [formError, setFormError]     = useState('');
  const [showForm, setShowForm]       = useState(false);

  useEffect(() => {
    if (isFacility && user?.facility_id) {
      setForm(p => ({ ...p, facility_id: user.facility_id! }));
    }
  }, [isFacility, user?.facility_id, showForm]);

  if (isDistrict) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          District Supervision Notice
        </h2>
        <p style={{ fontSize: 13, margin: 0, color: 'var(--text-muted)' }}>
          Direct stock records data entry is performed at the health facility level. District officers monitor stock via Requests, Alerts, Map, and Analytics.
        </p>
      </div>
    );
  }

  const expectedClosing = Number(form.opening) + Number(form.received) - Number(form.issued);
  const balanceOk = form.closing === '' || Number(form.closing) === expectedClosing;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!balanceOk) { setFormError(`Closing must equal ${expectedClosing}`); return; }
    setFormError('');
    const facId = isFacility && user?.facility_id ? user.facility_id : form.facility_id;
    createRecord.mutate(
      { facility_id: facId, medicine_id: form.medicine_id, period: form.period,
        opening: Number(form.opening), received: Number(form.received), issued: Number(form.issued),
        closing: Number(form.closing), stockout_days: Number(form.stockout_days), batches: [] },
      { onSuccess: () => { setForm(EMPTY); setShowForm(false); } },
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Stock records</h1>
          <p className="page-subtitle">
            {isFacility
              ? `Monthly medicine stock movements for your facility (${user?.facility_id ?? 'Kasambya HC III'})`
              : 'Monthly medicine stock movements across all health facilities'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : 'Add record'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 18px' }}>
            {isFacility ? `Add monthly record (${user?.facility_id})` : 'Add monthly record'}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {FIELDS.map(f => (
              <div key={f}>
                <label htmlFor={`sr-${f}`} style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>
                  {LABELS[f]}
                </label>
                <input
                  id={`sr-${f}`}
                  required
                  disabled={f === 'facility_id' && isFacility}
                  value={f === 'facility_id' && isFacility ? (user?.facility_id ?? form[f]) : form[f]}
                  onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                  className="input"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    ...(f === 'facility_id' && isFacility ? { background: 'var(--surface-2)', cursor: 'not-allowed', color: 'var(--text-secondary)' } : {}),
                    ...(f === 'closing' && !balanceOk && form.closing !== '' ? { borderColor: 'var(--status-critical)' } : {}),
                  }}
                />
              </div>
            ))}
            {!balanceOk && form.closing !== '' && (
              <p style={{ gridColumn: '1/-1', fontSize: 12, color: 'var(--status-critical)' }}>
                Closing must equal opening + received - issued = {expectedClosing}
              </p>
            )}
            {formError && <p style={{ gridColumn: '1/-1', fontSize: 12, color: 'var(--status-critical)' }}>{formError}</p>}
            <div style={{ gridColumn: '1/-1' }}>
              <button type="submit" className="btn-primary" disabled={createRecord.isPending || !balanceOk}>
                {createRecord.isPending ? 'Saving...' : 'Save record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isPending && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48 }} />)}</div>}
      {isError && <p style={{ color: 'var(--status-critical)', fontSize: 13 }}>Failed to load records.</p>}

      {data && (
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="data-table">
            <thead><tr>{['ID','Facility','Medicine','Period','Opening','Received','Issued','Closing','Stockout days','Batches'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {data.data.map((r: { _id: string; facility_id: string; medicine_id: string; period: string; opening: number; received: number; issued: number; closing: number; stockout_days: number; batches: Batch[] }) => (
                <React.Fragment key={r._id}>
                  <tr>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{r._id}</td>
                    <td style={{ fontWeight: 500 }}>{r.facility_id}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.medicine_id}</td>
                    <td className="tabular">{r.period}</td>
                    <td className="tabular">{r.opening}</td>
                    <td className="tabular">{r.received}</td>
                    <td className="tabular">{r.issued}</td>
                    <td className="tabular" style={{ fontWeight: 600, color: r.closing === 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}>{r.closing}</td>
                    <td className="tabular">{r.stockout_days}</td>
                    <td>
                      {r.batches.length > 0 && (
                        <button onClick={() => setExpanded(expanded === r._id ? null : r._id)} aria-expanded={expanded === r._id} style={{ fontSize: 12, color: 'var(--accent-500)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                          {expanded === r._id ? 'Hide' : `${r.batches.length} batch(es)`}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === r._id && r.batches.map((b: Batch) => (
                    <tr key={b.batch_no} style={{ background: 'var(--surface-2)' }}>
                      <td colSpan={9} />
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 28 }}>
                        <span style={{ fontFamily: 'monospace' }}>{b.batch_no}</span>{' - expires '}{new Date(b.expiry).toLocaleDateString()}{' - qty: '}{b.qty}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
