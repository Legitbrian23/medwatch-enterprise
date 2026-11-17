import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import ForgotPasswordModal from '../components/ForgotPasswordModal.js';

const DEMO_ACCOUNTS = [
  { role: 'Facility', name: 'Solomon', email: 'solomon@medwatch.demo', scope: 'Kasambya HC III',    description: 'Submits and views stock records for own facility' },
  { role: 'District', name: 'Erick',   email: 'erick@medwatch.demo',   scope: 'Nakaseke District',  description: 'Monitors all facilities in Nakaseke district' },
  { role: 'National', name: 'Moses',   email: 'moses@medwatch.demo',   scope: 'All Districts',       description: 'Full national read access and request approvals' },
  { role: 'Admin',    name: 'Brian',   email: 'brian@medwatch.demo',   scope: 'System',             description: 'Full system access including user management' },
];

const DEMO_PASSWORD = 'Demo1234!';
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/';

  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [remember, setRemember]       = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [loadingRole, setLoadingRole] = useState('');
  const [showForgot, setShowForgot]   = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => { emailRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Enter your work email and password.'); return; }
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  async function signInAs(acc: typeof DEMO_ACCOUNTS[0]) {
    setError(''); setLoadingRole(acc.role);
    try {
      await login(acc.email, DEMO_PASSWORD);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Demo sign-in failed. Run: pnpm seed:demo');
    } finally { setLoadingRole(''); }
  }

  // Dark navy page with centred card — matching the reference design
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1117',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* App icon + title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {/* Heartbeat icon — CSS only */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64,
            background: '#ffffff',
            borderRadius: 18,
            marginBottom: 20,
            boxShadow: '0 8px 24px rgba(37,99,235,.35)',
          }}>
            {/* SVG pulse line — the only allowed graphic */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <polyline
                points="2,16 8,16 11,8 14,24 18,12 21,20 24,16 30,16"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <h1 style={{ color: '#ffffff', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 6px' }}>
            MedWatch Enterprise
          </h1>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 14, margin: 0 }}>
            Medicine Stock Surveillance System
          </p>
        </div>

        {/* Sign-in card */}
        <div style={{
          background: '#161b26',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 20,
          padding: '32px 32px 28px',
          boxShadow: '0 24px 64px rgba(0,0,0,.6)',
        }}>
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Email */}
            <div>
              <label htmlFor="login-email" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#ffffff', marginBottom: 10 }}>
                Work Email Address
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#0d1117',
                border: '1.5px solid rgba(255,255,255,.1)',
                borderRadius: 14, padding: '0 16px', height: 52,
                transition: 'border-color 150ms',
              }}
                onFocusCapture={e => (e.currentTarget.style.borderColor = '#2563eb')}
                onBlurCapture={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)')}
              >
                {/* Mail glyph — CSS border trick */}
                <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <rect x="0.75" y="0.75" width="16.5" height="12.5" rx="2.25" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
                  <polyline points="1,1 9,8 17,1" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
                </svg>
                <input
                  ref={emailRef}
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@medwatch.demo"
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    color: '#ffffff', fontSize: 14, outline: 'none', fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label htmlFor="login-password" style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>
                  Password
                </label>
                <button type="button" style={{ background: 'none', border: 'none', fontSize: 13, color: '#3b82f6', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, padding: 0 }} onClick={() => setShowForgot(true)}>
                  Forgot password?
                </button>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#0d1117',
                border: '1.5px solid rgba(255,255,255,.1)',
                borderRadius: 14, padding: '0 16px', height: 52,
                transition: 'border-color 150ms',
              }}
                onFocusCapture={e => (e.currentTarget.style.borderColor = '#2563eb')}
                onBlurCapture={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)')}
              >
                {/* Lock glyph */}
                <svg width="16" height="18" viewBox="0 0 16 18" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <rect x="0.75" y="7.75" width="14.5" height="9.5" rx="2.25" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
                  <path d="M4 8V5a4 4 0 018 0v3" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: '#ffffff', fontSize: 14, outline: 'none', fontFamily: 'inherit', letterSpacing: showPass ? 'normal' : '0.1em' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 500, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {/* Eye glyph */}
                  <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
                    <path d="M1 7s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="rgba(255,255,255,.45)" strokeWidth="1.5"/>
                    <circle cx="9" cy="7" r="2.5" stroke="rgba(255,255,255,.45)" strokeWidth="1.5"/>
                  </svg>
                  Show
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                style={{ width: 17, height: 17, accentColor: '#2563eb', cursor: 'pointer', borderRadius: 4 }}
              />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.55)' }}>Remember me on this device</span>
            </label>

            {/* Error */}
            {error && (
              <div role="alert" style={{ background: 'rgba(220,38,38,.12)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171', lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: 52,
                background: loading ? '#1d4ed8' : '#2563eb',
                color: '#fff', border: 'none', borderRadius: 14,
                fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', letterSpacing: '0.01em',
                boxShadow: '0 4px 16px rgba(37,99,235,.45)',
                transition: 'background 150ms, box-shadow 150ms',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1d4ed8'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#2563eb'; }}
            >
              {loading ? 'Signing in...' : (
                <>
                  Sign in to Dashboard
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3 9h12M10 4l5 5-5 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        {DEMO_MODE && (
          <div style={{
            background: '#161b26',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 16,
            padding: '20px 24px',
            marginTop: 12,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,.3)', margin: '0 0 14px' }}>
              Demo access — password: Demo1234!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.role}
                  type="button"
                  disabled={!!loadingRole}
                  onClick={() => signInAs(acc)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    background: loadingRole === acc.role ? 'rgba(37,99,235,.15)' : 'rgba(255,255,255,.04)',
                    border: '1px solid rgba(255,255,255,.08)',
                    borderRadius: 12, padding: '11px 14px',
                    cursor: loadingRole ? 'not-allowed' : 'pointer',
                    textAlign: 'left', fontFamily: 'inherit',
                    opacity: loadingRole && loadingRole !== acc.role ? 0.45 : 1,
                    transition: 'background 150ms, border-color 150ms',
                  }}
                  onMouseEnter={e => { if (!loadingRole) e.currentTarget.style.borderColor = 'rgba(59,130,246,.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{acc.name}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>&bull; {acc.role}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(59,130,246,.2)', color: '#60a5fa', padding: '1px 7px', borderRadius: 20 }}>
                        {acc.scope}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {acc.description}
                    </p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', flexShrink: 0, background: 'rgba(37,99,235,.15)', border: '1px solid rgba(59,130,246,.3)', borderRadius: 8, padding: '4px 12px', whiteSpace: 'nowrap' }}>
                    {loadingRole === acc.role ? '...' : 'Sign in'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,.2)', marginTop: 20 }}>
          Secured by MedWatch Enterprise &bull; Ministry of Health, Uganda
        </p>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}
