import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useStockRequests, useEscalatePending, useCreateStockRequest } from '../hooks/useStockRequests.js';
import ConfirmDialog from '../components/ConfirmDialog.js';
import type { StockItem } from '@medwatch/shared';

type StatusKey = 'pending' | 'approved' | 'delivered' | 'cancelled' | 'rejected';
const STATUS_CLASS: Record<StatusKey, string> = {
  pending:   'badge badge--medium',
  approved:  'badge badge--blue',
  delivered: 'badge badge--healthy',
  cancelled: 'badge badge--neutral',
  rejected:  'badge badge--critical',
};

export default function RequestsPage() {
  const { user } = useAuth();
  const isFacility = user?.role === 'facility';
  const isDistrict = user?.role === 'district';
  const canEscalate = user?.role === 'district' || user?.role === 'national' || user?.role === 'admin';
  const canCreate = isFacility || user?.role === 'national' || user?.role === 'admin';

  const [statusFilter, setStatusFilter]       = useState('');
  const [expanded, setExpanded]               = useState<string | null>(null);
  const [before, setBefore]                   = useState('');
  const [confirmEscalate, setConfirmEscalate] = useState(false);
  const [showAddModal, setShowAddModal]       = useState(false);

  // New request form state
  const [reqMedicine, setReqMedicine] = useState('MED001');
  const [reqQty, setReqQty]           = useState('100');
  const [reqReason, setReqReason]     = useState('Low stock replenishment');
  const [reqSupplier, setReqSupplier] = useState('NMS');

  // Query scoped by role
  const requestFilters = isFacility && user?.facility_id
    ? { status: statusFilter || undefined, facilityId: user.facility_id }
    : isDistrict && user?.district
      ? { status: statusFilter || undefined, district: user.district }
      : { status: statusFilter || undefined };

  const { data, isPending, isError } = useStockRequests(requestFilters);
  const escalate = useEscalatePending();
  const createRequest = useCreateStockRequest();

  function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault();
    const facId = isFacility && user?.facility_id ? user.facility_id : 'HF001';
    createRequest.mutate(
      {
        facility_id: facId,
        supplier: reqSupplier,
        status: 'pending',
        requested_on: new Date(),
        fulfilled_on: null,
        items: [{ medicine_id: reqMedicine, qty: Number(reqQty), reason: reqReason }],
      },
      {
        onSuccess: () => {
          setShowAddModal(false);
          setReqQty('100');
        },
      },
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Stock requests</h1>
          <p className="page-subtitle">
            {isFacility
              ? `Resupply requests for your facility (${user?.facility_id ?? 'Kasambya HC III'})`
              : isDistrict
                ? `Supervise and escalate resupply requests for ${user?.district ?? 'Nakaseke'} District`
                : 'Facility resupply requests and nationwide escalations'}
          </p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            New request
          </button>
        )}
      </div>

      <div className="card" style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
        <div>
          <label htmlFor="req-status" style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
            Status
          </label>
          <select id="req-status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="delivered">Delivered</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Escalate action: ONLY shown for District, National, Admin duties */}
        {canEscalate && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div>
              <label htmlFor="escalate-before" style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
                Escalate pending before
              </label>
              <input id="escalate-before" type="date" value={before} onChange={e => setBefore(e.target.value)} className="input" />
            </div>
            <button className="btn-primary" onClick={() => before && setConfirmEscalate(true)} disabled={!before || escalate.isPending}>
              {escalate.isPending ? 'Escalating...' : 'Escalate'}
            </button>
          </div>
        )}
      </div>

      {isPending && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48 }} />)}</div>}
      {isError && <p style={{ color: 'var(--status-critical)', fontSize: 13 }}>Failed to load requests.</p>}

      {data && (
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>ID</th><th>Facility</th><th>Requested on</th><th>Supplier</th><th>Status</th><th>Items</th></tr></thead>
            <tbody>
              {data.data.map(r => (
                <React.Fragment key={r._id}>
                  <tr>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{r._id}</td>
                    <td style={{ fontWeight: 500 }}>{r.facility_id}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{new Date(r.requested_on).toLocaleDateString()}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.supplier}</td>
                    <td><span className={STATUS_CLASS[r.status as StatusKey] ?? 'badge badge--neutral'}>{r.status}</span></td>
                    <td>
                      <button onClick={() => setExpanded(expanded === r._id ? null : r._id)} aria-expanded={expanded === r._id} style={{ fontSize: 12, color: 'var(--accent-500)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500, fontFamily: 'inherit' }}>
                        {expanded === r._id ? 'Hide' : `${r.items.length} item(s)`}
                      </button>
                    </td>
                  </tr>
                  {expanded === r._id && r.items.map((item: StockItem, i: number) => (
                    <tr key={i} style={{ background: 'var(--surface-2)' }}>
                      <td colSpan={5} />
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 28 }}>
                        <span style={{ fontFamily: 'monospace' }}>{item.medicine_id}</span>{' — qty: '}{item.qty}{' — '}{item.reason}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {data.data.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: 13 }}>No requests found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmEscalate}
        title="Escalate pending requests"
        message={`Mark all pending requests submitted before ${before} as escalated?`}
        confirmLabel="Escalate"
        variant="primary"
        onConfirm={() => { escalate.mutate(before); setConfirmEscalate(false); }}
        onCancel={() => setConfirmEscalate(false)}
        loading={escalate.isPending}
      />

      {/* New Request Modal */}
      {showAddModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{ width: '100%', maxWidth: 440, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              New stock resupply request
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 18px' }}>
              Submit medicine resupply request for <strong>{user?.facility_id ?? 'Kasambya HC III'}</strong>.
            </p>

            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Medicine ID
                </label>
                <select value={reqMedicine} onChange={e => setReqMedicine(e.target.value)} className="input" style={{ width: '100%' }}>
                  <option value="MED001">MED001 - Artemether/Lumefantrine (Coartem)</option>
                  <option value="MED002">MED002 - Amoxicillin 250mg caps</option>
                  <option value="MED003">MED003 - Paracetamol 500mg tabs</option>
                  <option value="MED004">MED004 - Oral Rehydration Salts (ORS)</option>
                  <option value="MED005">MED005 - Zinc Sulfate 20mg</option>
                  <option value="MED006">MED006 - Cotrimoxazole 480mg</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Quantity needed
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={reqQty}
                  onChange={e => setReqQty(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Reason for request
                </label>
                <input
                  type="text"
                  required
                  value={reqReason}
                  onChange={e => setReqReason(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Designated Supplier
                </label>
                <select value={reqSupplier} onChange={e => setReqSupplier(e.target.value)} className="input" style={{ width: '100%' }}>
                  <option value="NMS">NMS (National Medical Stores)</option>
                  <option value="JMS">JMS (Joint Medical Stores)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn-ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={createRequest.isPending}>
                  {createRequest.isPending ? 'Submitting...' : 'Submit request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
