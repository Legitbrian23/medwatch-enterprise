import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import type { UserRole } from '@medwatch/shared';

interface Props {
  onClose: () => void;
}

interface PaletteItem {
  label: string;
  to: string;
  group: 'Pages' | 'Admin';
  roles: UserRole[];
}

const ALL_PAGES: PaletteItem[] = [
  { label: 'Dashboard',      to: '/',              group: 'Pages', roles: ['facility','district','national','admin'] },
  { label: 'Alerts',         to: '/alerts',        group: 'Pages', roles: ['facility','district','national','admin'] },
  { label: 'Stock Records',  to: '/stock-records', group: 'Pages', roles: ['facility','national','admin'] },
  { label: 'Requests',       to: '/requests',      group: 'Pages', roles: ['facility','district','national','admin'] },
  { label: 'Expiry Tracker', to: '/expiry',        group: 'Pages', roles: ['facility','district','national','admin'] },
  { label: 'Facility Map',   to: '/map',           group: 'Pages', roles: ['district','national','admin'] },
  { label: 'Users',          to: '/users',         group: 'Admin', roles: ['admin'] },
];

export default function CommandPalette({ onClose }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? 'facility';
  const pages = ALL_PAGES.filter(p => p.roles.includes(role));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function go(to: string) {
    navigate(to);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(15,26,46,.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: 520,
          margin: '0 16px',
          overflow: 'hidden',
        }}
      >
        <Command style={{ background: 'transparent', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '0 16px' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 10, flexShrink: 0 }}>Go to</span>
            <Command.Input
              autoFocus
              placeholder="Search pages..."
              style={{
                flex: 1, background: 'transparent', border: 'none',
                color: 'var(--text-primary)', fontSize: 15,
                padding: '16px 0', outline: 'none', fontFamily: 'inherit',
              }}
            />
            <kbd style={{
              background: 'var(--surface-3)', border: '1px solid var(--border)',
              borderRadius: 5, padding: '2px 7px', fontSize: 11,
              color: 'var(--text-muted)', fontFamily: 'inherit', flexShrink: 0,
            }}>Esc</kbd>
          </div>

          <Command.List style={{ maxHeight: 360, overflowY: 'auto', padding: '8px 0' }}>
            <Command.Empty style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              No pages found.
            </Command.Empty>

            {['Pages', 'Admin'].map(group => {
              const groupItems = pages.filter(p => p.group === group);
              if (groupItems.length === 0) return null;
              return (
                <Command.Group
                  key={group}
                  heading={group}
                  style={{ padding: '0 8px' }}
                >
                  {groupItems.map(p => (
                    <Command.Item
                      key={p.to}
                      value={p.label}
                      onSelect={() => go(p.to)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        fontSize: 14,
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{p.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Enter</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
