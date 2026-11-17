import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../context/ThemeContext.js';

interface KpiCardProps {
  label: string;
  value: number | string;
  unit?: string;
  delta?: number;
  deltaUnit?: string;
  sparkline?: number[];
  target?: number;
  insight?: string;
  loading?: boolean;
  status?: 'critical' | 'high' | 'medium' | 'healthy' | 'neutral';
}

function accentColor(s: KpiCardProps['status']): string {
  switch (s) {
    case 'critical': return 'var(--status-critical)';
    case 'high':     return 'var(--status-high)';
    case 'medium':   return 'var(--status-medium)';
    case 'healthy':  return 'var(--status-healthy)';
    default:         return 'var(--accent-500)';
  }
}

function bgColor(s: KpiCardProps['status']): string {
  switch (s) {
    case 'critical': return 'var(--status-critical-bg)';
    case 'high':     return 'var(--status-high-bg)';
    case 'medium':   return 'var(--status-medium-bg)';
    case 'healthy':  return 'var(--status-healthy-bg)';
    default:         return 'var(--accent-50)';
  }
}

export default function KpiCard({
  label, value, unit, delta, deltaUnit, sparkline, target, insight, loading, status,
}: KpiCardProps) {
  const { echartsTheme } = useTheme();

  const sparkOption = sparkline && sparkline.length > 0
    ? {
        animation: false,
        grid: { top: 2, bottom: 2, left: 2, right: 2 },
        xAxis: { type: 'category' as const, show: false, data: sparkline.map((_, i) => i) },
        yAxis: { type: 'value' as const, show: false },
        series: [{
          type: 'line',
          data: sparkline,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: accentColor(status), width: 2 },
          areaStyle: { color: accentColor(status), opacity: 0.1 },
        }],
      }
    : null;

  const hasDelta  = delta !== undefined && delta !== null;
  const deltaPos  = (delta ?? 0) >= 0;
  const progress  = (target && typeof value === 'number' && target > 0)
    ? Math.min(100, (value / target) * 100)
    : null;

  if (loading) {
    return (
      <div style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 20,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div className="skeleton" style={{ height: 13, width: 100, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 40, width: 80, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 36 }} />
      </div>
    );
  }

  return (
    <article style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 150ms ease-out',
    }}>
      {/* Colour accent strip at top */}
      <div style={{ height: 3, background: accentColor(status) }} />

      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Label */}
        <p style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--text-muted)', margin: 0,
        }}>
          {label}
        </p>

        {/* Value + delta */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 38, fontWeight: 700, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)',
            letterSpacing: '-1px',
          }}>
            {value}
          </span>
          {unit && (
            <span style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>{unit}</span>
          )}
          {hasDelta && (
            <span
              style={{
                fontSize: 13, fontWeight: 600, marginBottom: 4,
                color: deltaPos ? 'var(--div-pos)' : 'var(--div-neg)',
                background: deltaPos ? 'var(--status-healthy-bg)' : 'var(--status-critical-bg)',
                padding: '2px 7px', borderRadius: 20,
                fontVariantNumeric: 'tabular-nums',
              }}
              aria-label={`${deltaPos ? 'Increased' : 'Decreased'} by ${Math.abs(delta!)}${deltaUnit ?? ''}`}
            >
              {deltaPos ? '+' : ''}{delta}{deltaUnit ?? ''}
            </span>
          )}
        </div>

        {/* Sparkline */}
        {sparkOption && (
          <div style={{ height: 40, margin: '0 -2px' }}>
            <ReactECharts
              option={sparkOption}
              theme={echartsTheme}
              style={{ height: 40 }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        )}

        {/* Target progress bar */}
        {progress !== null && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs 90% target</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: accentColor(status) }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}
            >
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: accentColor(status),
                borderRadius: 3,
                transition: 'width 600ms ease-out',
              }} />
            </div>
          </div>
        )}

        {/* Insight */}
        {insight && (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {insight}
          </p>
        )}
      </div>
    </article>
  );
}
