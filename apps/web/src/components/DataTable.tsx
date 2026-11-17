import React, { useState, useMemo } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  render?: (row: T, idx: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  maxHeight?: number;
}

type SortDir = 'asc' | 'desc';

export function DataTable<T extends object>({
  columns, rows, rowKey, loading, emptyMessage = 'No records found.', onRowClick, maxHeight,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  return (
    <div style={{ overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface-1)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ overflowX: 'auto', overflowY: maxHeight ? 'auto' : undefined, maxHeight }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  style={{
                    padding: '11px 14px',
                    fontSize: 11, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                    background: 'var(--surface-2)',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                    textAlign: col.align ?? 'left',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    width: col.width,
                    transition: 'color 150ms',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.header}
                    {col.sortable && (
                      <span style={{ fontSize: 9, color: sortKey === col.key ? 'var(--accent-500)' : 'var(--text-muted)', marginTop: 1 }}>
                        {sortKey === col.key ? (sortDir === 'asc' ? 'v' : '^') : 'v'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.key} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div className="skeleton" style={{ height: 16, width: '70%' }} />
                    </td>
                  ))}
                </tr>
              ))
            )}
            {!loading && sorted.map((row, idx) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    style={{
                      padding: '11px 14px',
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border-subtle)',
                      textAlign: col.align ?? 'left',
                      verticalAlign: 'middle',
                      fontVariantNumeric: col.align === 'right' ? 'tabular-nums' : undefined,
                    }}
                  >
                    {col.render ? col.render(row, idx) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!loading && sorted.length > 0 && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {sorted.length} record{sorted.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
