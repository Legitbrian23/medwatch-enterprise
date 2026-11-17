import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from '../components/ConfirmDialog.js';
import type { PublicUser, UserRole } from '@medwatch/shared';
import type { PaginatedResponse } from '@medwatch/shared';

const ROLE_LABELS: Record<UserRole, string> = {
  facility: 'Facility',
  district: 'District',
  national: 'National',
  admin: 'Admin',
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [deactivating, setDeactivating] = useState<PublicUser | null>(null);
  const [resetting, setResetting]       = useState<PublicUser | null>(null);
  const [newPassword, setNewPassword]   = useState('');
  const [resetError, setResetError]     = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['users', search],
    queryFn: () => {
      const p = new URLSearchParams({ limit: '100' });
      if (search) p.set('search', search);
      return api.get<PaginatedResponse<PublicUser>>(`/users?${p}`);
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<PublicUser>(`/users/${id}`, { active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeactivating(null);
    },
  });

  const resetPassword = useMutation({
    mutationFn: ({ userId, newPassword: pw }: { userId: string; newPassword: string }) =>
      api.post<{ ok: boolean; message: string }>('/auth/admin/reset-password', { userId, newPassword: pw }),
    onSuccess: (res) => {
      setResetSuccess(res.message);
      setResetError('');
      setNewPassword('');
      setTimeout(() => { setResetting(null); setResetSuccess(''); }, 2000);
    },
    onError: (err: unknown) => {
      setResetError(err instanceof Error ? err.message : 'Failed to reset password.');
    },
  });

  if (me?.role !== 'admin') {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
        Access restricted to administrators.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Users
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Manage accounts and access roles
        </p>
      </div>

      <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <label htmlFor="user-search" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Search
        </label>
        <input
          id="user-search"
          className="input"
          placeholder="Name or email"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
      </div>

      {isPending && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
        </div>
      )}

      {isError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <p style={{ color: 'var(--status-critical)', fontSize: 13 }}>Failed to load users.</p>
          <button className="btn-ghost" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {data && (
        <div style={{ overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Scope</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((u: PublicUser) => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td><span className="badge badge--neutral">{ROLE_LABELS[u.role]}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {u.facility_id ?? u.district ?? 'All'}
                  </td>
                  <td>
                    <span className={u.active ? 'badge badge--healthy' : 'badge badge--neutral'}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {/* Reset password — available for all users including self */}
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '3px 9px', color: 'var(--accent-500)', borderColor: 'var(--accent-500)' }}
                      onClick={() => { setResetting(u); setNewPassword(''); setResetError(''); setResetSuccess(''); }}
                    >
                      Reset pwd
                    </button>
                    {/* Activate / deactivate — cannot deactivate yourself */}
                    {u._id !== me._id && (
                      <button
                        className={u.active ? 'btn-ghost' : 'btn-primary'}
                        style={{ fontSize: 11, padding: '3px 9px' }}
                        onClick={() => {
                          if (u.active) setDeactivating(u);
                          else toggleActive.mutate({ id: u._id, active: true });
                        }}
                      >
                        {u.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={!!deactivating}
        title="Deactivate user"
        message={`Deactivate ${deactivating?.name}? They will not be able to sign in until reactivated.`}
        onConfirm={() => deactivating && toggleActive.mutate({ id: deactivating._id, active: false })}
        onCancel={() => setDeactivating(null)}
        loading={toggleActive.isPending}
      />

      {/* Reset password modal */}
      {resetting && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setResetting(null)}
        >
          <div
            style={{ width: '100%', maxWidth: 420, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              Reset password
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
              Setting new password for <strong>{resetting.name}</strong> ({resetting.email}).<br />
              They will be required to change it on next login.
            </p>

            {resetSuccess ? (
              <div style={{ background: 'var(--status-healthy-bg)', border: '1px solid var(--status-healthy)', borderRadius: 10, padding: '12px 16px', color: 'var(--status-healthy)', fontSize: 13, fontWeight: 600 }}>
                {resetSuccess}
              </div>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (newPassword.length < 8) { setResetError('Password must be at least 8 characters.'); return; }
                  resetPassword.mutate({ userId: resetting._id, newPassword });
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <div>
                  <label htmlFor="reset-pw" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    New password (min 8 chars)
                  </label>
                  <input
                    id="reset-pw"
                    type="text"
                    autoFocus
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setResetError(''); }}
                    className="input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="Enter new password"
                  />
                </div>
                {resetError && (
                  <p style={{ fontSize: 12, color: 'var(--status-critical)', margin: 0 }}>{resetError}</p>
                )}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-ghost" onClick={() => setResetting(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={resetPassword.isPending}>
                    {resetPassword.isPending ? 'Saving...' : 'Reset password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
