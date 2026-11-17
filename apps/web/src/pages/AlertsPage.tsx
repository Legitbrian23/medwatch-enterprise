import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useAlerts, useResolveAlert } from '../hooks/useAlerts.js';
import ConfirmDialog from '../components/ConfirmDialog.js';
import { DataTable } from '../components/DataTable.js';
import type { Alert } from '@medwatch/shared';
import type { Column } from '../components/DataTable.js';

type SevKey = 'critical' | 'high' | 'medium' | 'low';
const SEV_CLASS: Record<SevKey, string> = {
  critical: 'badge badge--critical',
  high:     'badge badge--high',
  medium:   'badge badge--medium',
  low:      'badge badge--neutral',
};

export default function AlertsPage() {
  const { user } = useAuth();
  const isFacility = user?.role === 'facility';
  const isDistrict = user?.role === 'district';

  const [typeFilter, setSTypeFilter]    = useState('');
  const [severityFilter, setSevFilter]  = useState('');
  const [resolvedFilter, setResFilter]  = useState('false');
  const [pending, setPending]           = useState<Alert | null>(null);

  const resolved = resolvedFilter === 'true' ? true : resolvedFilter === 'false' ? false : undefined;

  const alertFilters = isFacility && user?.facility_id
    ? { type: typeFilter || undefined, severity: severityFilter || undefined, resolved, facilityId: user.facility_id }
    : isDistrict && user?.district
      ? { type: typeFilter || undefined, severity: severityFilter || undefined, resolved, district: user.district }
      : { type: typeFilter || undefined, severity: severityFilter || undefined, resolved };

  const { data, isPending, isError, refetch } = useAlerts(alertFilters);
  const resolveAlert = useResolveAlert();

  const columns: Column<Alert>[] = [
    { key: '_id', header: 'ID', width: 80, render: r => <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{r._id}</span> },
    { key: 'facility_id', header: 'Facility', sortable: true, render: r => <span style={{ fontWeight: 500 }}>{r.facility_id}</span> },
    { key: 'medicine_id', header: 'Medicine', sortable: true, render: r => <span style={{ color: 'var(--text-secondary)' }}>{r.medicine_id}</span> },
    { key: 'type', header: 'Type', sortable: true, render: r => <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{r.type.replace('_', ' ')}</span> },
    {
      key: 'severity', header: 'Severity', sortable: true,
      render: r => <span className={SEV_CLASS[r.severity as SevKey] ?? 'badge badge--neutral'}>{r.severity}</span>,
    },
    {
      key: 'raised_on', header: 'Raised', sortable: true,
      render: r => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{new Date(r.raised_on).toLocaleDateString()}</span>,
    },
    {
      key: 'resolved', header: 'Action',
      render: r => !r.resolved
        ? <button className="btn-primary" style={{ fontSize: 11, padding: '4px 12px' }} onClick={e => { e.stopPropagation(); setPending(r); }}>Resolve</button>
        : <span className="badge badge--healthy">Resolved</span>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 className="page-title">Alerts</h1>
        <p className="page-subtitle">
          {isFacility
            ? `Stockout, low-stock and near-expiry alerts for your facility (${user?.facility_id ?? 'Kasambya HC III'})`
            : isDistrict
              ? `Stockout, low-stock and near-expiry alerts for ${user?.district ?? 'Nakaseke'} District`
              : 'Stockout, low-stock and near-expiry notifications across all facilities'}
        </p>
      </div>

      {/* Stats summary row */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { label: 'Critical',  count: data.data.filter(a => a.severity === 'critical').length, cls: 'badge--critical' },
            { label: 'High',      count: data.data.filter(a => a.severity === 'high').length,     cls: 'badge--high' },
            { label: 'Medium',    count: data.data.filter(a => a.severity === 'medium').length,   cls: 'badge--medium' },
            { label: 'Resolved',  count: data.data.filter(a => a.resolved).length,               cls: 'badge--healthy' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</span>
              <span className={`badge ${s.cls}`} style={{ fontSize: 14, fontWeight: 700, padding: '3px 10px' }}>{s.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="card" style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
        {[
          { id: 'alert-type', label: 'Type', value: typeFilter, set: setSTypeFilter,
            options: [['','All types'],['stockout','Stock-out'],['low_stock','Low stock'],['near_expiry','Near expiry']] },
          { id: 'alert-sev',  label: 'Severity', value: severityFilter, set: setSevFilter,
            options: [['','All severities'],['critical','Critical'],['high','High'],['medium','Medium'],['low','Low']] },
          { id: 'alert-res',  label: 'Status', value: resolvedFilter, set: setResFilter,
            options: [['false','Unresolved'],['true','Resolved'],['','All']] },
        ].map(f => (
          <div key={f.id}>
            <label htmlFor={f.id} style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
              {f.label}
            </label>
            <select id={f.id} value={f.value} onChange={e => f.set(e.target.value)} className="input">
              {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        ))}
        {isError && <button className="btn-ghost" style={{ fontSize: 12, marginLeft: 'auto' }} onClick={() => refetch()}>Retry</button>}
      </div>

      <DataTable<Alert>
        columns={columns}
        rows={data?.data ?? []}
        rowKey={r => r._id}
        loading={isPending}
        emptyMessage="No alerts match the current filters."
        maxHeight={480}
      />

      <ConfirmDialog
        open={!!pending}
        title="Resolve alert"
        message={`Mark alert ${pending?._id} for ${pending?.facility_id} as resolved? This cannot be undone from the UI.`}
        confirmLabel="Resolve alert"
        onConfirm={() => { if (!pending) return; resolveAlert.mutate(pending._id, { onSuccess: () => setPending(null) }); }}
        onCancel={() => setPending(null)}
        loading={resolveAlert.isPending}
      />
    </div>
  );
}
