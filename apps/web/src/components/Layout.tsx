import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.js';
import { useAuth } from '../context/AuthContext.js';
import CommandPalette from './CommandPalette.js';
import type { UserRole } from '@medwatch/shared';

interface NavItem {
  to: string;
  label: string;
  abbr: string;
  end?: boolean;
  group: string;
  roles: UserRole[];
}

const ALL_NAV: NavItem[] = [
  { group: 'Overview',       to: '/',              label: 'Dashboard',      abbr: 'OVW', end: true, roles: ['facility','district','national','admin'] },
  { group: 'Operations',     to: '/alerts',        label: 'Alerts',         abbr: 'ALT', roles: ['facility','district','national','admin'] },
  { group: 'Operations',     to: '/stock-records', label: 'Stock Records',  abbr: 'STK', roles: ['facility','national','admin'] },
  { group: 'Operations',     to: '/requests',      label: 'Requests',       abbr: 'REQ', roles: ['facility','district','national','admin'] },
  { group: 'Analytics',      to: '/expiry',        label: 'Expiry Tracker', abbr: 'EXP', roles: ['facility','district','national','admin'] },
  { group: 'Analytics',      to: '/map',           label: 'Facility Map',   abbr: 'MAP', roles: ['district','national','admin'] },
  { group: 'Administration', to: '/users',         label: 'Users',          abbr: 'USR', roles: ['admin'] },
];

const GROUPS = ['Overview', 'Operations', 'Analytics', 'Administration'];

function scopeLabel(role: UserRole, district?: string, facilityId?: string): string {
  if (role === 'facility') return facilityId ?? 'Facility';
  if (role === 'district') return `${district ?? ''} District`;
  if (role === 'national') return 'National';
  return 'System Admin';
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('mw-sidebar') === '1');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => { localStorage.setItem('mw-sidebar', collapsed ? '1' : '0'); }, [collapsed]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(p => !p); }
      if (e.key === 'Escape') setUserMenuOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close user menu on outside click — backdrop div handles this now


  const role = user?.role ?? 'facility';
  const navItems = ALL_NAV.filter(n => n.roles.includes(role));
  const groups = GROUPS.filter(g => navItems.some(n => n.group === g));
  const crumbs = buildCrumbs(location.pathname, navItems);

  async function handleSignOut() {
    setUserMenuOpen(false);
    await logout();
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--surface-0)' }}>

      {/* ── Dark navy sidebar ── */}
      <aside
        aria-label="Main navigation"
        style={{
          width: collapsed ? 64 : 248,
          minWidth: collapsed ? 64 : 248,
          background: 'var(--sidebar-bg)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 200ms ease-out, min-width 200ms ease-out',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Logo row */}
        <div style={{
          height: 64,
          padding: collapsed ? '0' : '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 12,
          borderBottom: '1px solid var(--sidebar-border)',
          flexShrink: 0,
        }}>
          {/* Blue square logo mark */}
          <div style={{
            width: 32, height: 32, minWidth: 32,
            background: 'var(--accent-500)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: '-0.5px' }}>MW</span>
          </div>
          {!collapsed && (
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
                MedWatch
              </div>
              <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, whiteSpace: 'nowrap' }}>
                Stock Surveillance
              </div>
            </div>
          )}
        </div>

        {/* Navigation groups */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 0' }}>
          {groups.map(group => (
            <div key={group} style={{ marginBottom: 4 }}>
              {!collapsed && (
                <div style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'rgba(255,255,255,.3)',
                  padding: '8px 20px 4px',
                }}>
                  {group}
                </div>
              )}
              {navItems.filter(i => i.group === group).map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={collapsed ? item.label : undefined}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: 10,
                    padding: collapsed ? '10px 0' : '9px 20px',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--sidebar-active)' : 'var(--sidebar-text)',
                    background: isActive ? 'rgba(59,130,246,.18)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--sidebar-accent)' : '3px solid transparent',
                    textDecoration: 'none',
                    transition: 'background 150ms ease-out, color 150ms ease-out',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  })}
                  className="sidebar-link"
                >
                  {collapsed
                    ? <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', color: 'inherit' }}>{item.abbr}</span>
                    : item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            borderTop: '1px solid var(--sidebar-border)',
            background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,.4)',
            cursor: 'pointer',
            padding: '14px 0',
            width: '100%',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase',
            transition: 'color 150ms ease-out',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.75)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.4)')}
        >
          {collapsed ? 'EXPD' : 'Collapse'}
        </button>
      </aside>

      {/* ── Main content area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          height: 64,
          background: 'var(--surface-1)',
          borderBottom: '1px solid var(--border)',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexShrink: 0,
          boxShadow: 'var(--shadow-xs)',
        }}>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            {crumbs.map((c, i) => (
              <React.Fragment key={c}>
                {i > 0 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}>/</span>
                )}
                <span style={{
                  color: i === crumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: i === crumbs.length - 1 ? 600 : 400,
                }}>
                  {c}
                </span>
              </React.Fragment>
            ))}
          </nav>

          {/* Search / command palette */}
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Open command palette (Ctrl+K)"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: 12,
              transition: 'border-color 150ms ease-out',
            }}
          >
            <span>Search</span>
            <kbd style={{
              background: 'var(--surface-3)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '1px 5px',
              fontSize: 10,
              fontFamily: 'inherit',
              color: 'var(--text-muted)',
            }}>
              Ctrl K
            </kbd>
          </button>

          {/* User menu */}
          {user && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                aria-label="Open user menu"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'background 150ms ease-out',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 28, height: 28,
                  background: 'var(--accent-500)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>
                    {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </span>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {user.name.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.2 }}>
                    {scopeLabel(user.role, user.district, user.facility_id)}
                  </div>
                </div>
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <>
                  {/* Invisible backdrop — click to close without intercepting menu items */}
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    role="menu"
                    style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 50,
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      minWidth: 240,
                      boxShadow: 'var(--shadow-lg)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* User info header */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{user.email}</p>
                      <div style={{ marginTop: 6 }}>
                        <span className="badge badge--blue">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
                      </div>
                    </div>
                    {/* Menu items */}
                    <div style={{ padding: '6px 0' }}>
                      <button
                        role="menuitem"
                        onClick={toggle}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        Switch to {theme === 'light' ? 'dark' : 'light'} theme
                      </button>
                      <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                      <button
                        role="menuitem"
                        onClick={handleSignOut}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 13, color: 'var(--status-critical)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--status-critical-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', background: 'var(--surface-0)' }}>
          <Outlet />
        </main>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}

function buildCrumbs(pathname: string, navItems: NavItem[]): string[] {
  const item = navItems.find(n => n.end ? pathname === n.to : pathname.startsWith(n.to));
  if (!item || item.to === '/') return ['Dashboard'];
  return ['MedWatch', item.label];
}
