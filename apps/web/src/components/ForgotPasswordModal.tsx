import React, { useState } from 'react';
import { api } from '../api.js';

interface Props {
  onClose: () => void;
}

type State = 'idle' | 'loading' | 'success' | 'error';

export default function ForgotPasswordModal({ onClose }: Props) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setState('loading');
    try {
      await api.post('/auth/forgot-password', { email });
      setState('success');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setState('error');
    }
  }

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}
      onClick={onClose}
    >
      {/* Panel — stop click propagation so clicks inside don't close */}
      <div
        style={{
          width: '100%', maxWidth: 440,
          background: '#161b26',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 20,
          padding: '32px',
          boxShadow: '0 24px 64px rgba(0,0,0,.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>
            Forgot your password?
          </h2>
          <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            Enter your work email. If it is registered, the system will notify
            the administrator via WhatsApp and they will reset your password.
          </p>
        </div>

        {state === 'success' ? (
          /* Success state */
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            {/* Green check circle */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(34,197,94,.15)',
              border: '2px solid rgba(34,197,94,.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ color: '#22c55e', fontWeight: 600, fontSize: 15, margin: '0 0 6px' }}>
              Request submitted
            </p>
            <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 13, lineHeight: 1.5, margin: '0 0 24px' }}>
              If your email is registered, the administrator has been notified
              via WhatsApp. They will contact you with your new password.
            </p>
            <button
              onClick={onClose}
              style={{
                width: '100%', height: 48,
                background: '#2563eb', color: '#fff',
                border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                htmlFor="fp-email"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}
              >
                Work Email Address
              </label>
              <input
                id="fp-email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your.name@medwatch.demo"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  height: 48, padding: '0 14px',
                  background: '#0d1117',
                  border: '1.5px solid rgba(255,255,255,.12)',
                  borderRadius: 12,
                  color: '#fff', fontSize: 14,
                  outline: 'none', fontFamily: 'inherit',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)')}
              />
            </div>

            {state === 'error' && (
              <div
                role="alert"
                style={{
                  background: 'rgba(220,38,38,.12)',
                  border: '1px solid rgba(220,38,38,.3)',
                  borderRadius: 10, padding: '10px 14px',
                  fontSize: 13, color: '#f87171',
                }}
              >
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1, height: 48,
                  background: 'rgba(255,255,255,.06)',
                  border: '1px solid rgba(255,255,255,.1)',
                  borderRadius: 12, color: 'rgba(255,255,255,.7)',
                  fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={state === 'loading' || !email}
                style={{
                  flex: 2, height: 48,
                  background: state === 'loading' ? '#1d4ed8' : '#2563eb',
                  color: '#fff', border: 'none', borderRadius: 12,
                  fontSize: 14, fontWeight: 700,
                  cursor: state === 'loading' ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {state === 'loading' ? 'Sending...' : 'Notify Administrator'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

