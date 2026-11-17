import React from 'react';
import ReactECharts from 'echarts-for-react';
import KpiCard from '../components/KpiCard.js';
import { useTheme } from '../context/ThemeContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useOverview } from '../hooks/useOverview.js';

export default function Dashboard() {
  const { echartsTheme } = useTheme();
  const { user } = useAuth();

  const isFacility = user?.role === 'facility';
  const isDistrict = user?.role === 'district';

  // Build scope-aware params for the overview query
  const overviewParams = isDistrict && user.district
    ? { compare: 'prev' as const, district: user.district }
    : { compare: 'prev' as const };

  const overview = useOverview(overviewParams);
  const data = overview.data;

  const scopeLabel =
    isFacility  ? `Facility overview: Kasambya HC III (${user.facility_id ?? 'HF001'})`
    : isDistrict ? `District overview: ${user.district} District`
    : 'National overview';

  // Filter ranking and action alerts by role
  const displayRanking = (data?.facilityRanking ?? []).filter(r => {
    if (isDistrict && user?.district) return r.district === user.district;
    return true;
  });

  const displayActionAlerts = (data?.actionAlerts ?? []).filter(a => {
    if (isFacility) return a.facility_name.includes('Kasambya') || a.facility_name.includes('HF001');
    if (isDistrict) return a.facility_name.includes('Kasambya') || a.facility_name.includes('Rwenzori');
    return true;
  });

  // ── Availability area chart ────────────────────────────────────
  const availOption = data?.availabilitySeries?.length
    ? {
        grid: { top: 20, bottom: 36, left: 44, right: 24 },
        tooltip: {
          trigger: 'axis' as const,
          formatter: (params: unknown) => {
            const p = params as Array<{ marker: string; seriesName: string; value: number; name: string }>;
            return `<div style="padding:4px 0"><b>${p[0]?.name ?? ''}</b><br/>`
              + p.map(s => `${s.marker} ${s.seriesName}: <b>${s.value ?? '--'}%</b>`).join('<br/>')
              + '</div>';
          },
        },
        legend: {
          bottom: 0, textStyle: { fontSize: 11 },
          itemWidth: 16, itemHeight: 3,
        },
        xAxis: {
          type: 'category' as const,
          data: data.availabilitySeries.map(s => s.period),
          axisLabel: { fontSize: 10, rotate: 30 },
          boundaryGap: false,
        },
        yAxis: {
          type: 'value' as const, min: 0, max: 100,
          axisLabel: { formatter: (v: number) => `${v}%`, fontSize: 10 },
        },
        series: [
          {
            name: 'Availability',
            type: 'line',
            data: data.availabilitySeries.map(s => s.current),
            smooth: true,
            areaStyle: { opacity: 0.1, color: 'var(--accent-500)' },
            lineStyle: { width: 2.5, color: 'var(--accent-500)' },
            itemStyle: { color: 'var(--accent-500)' },
            symbol: 'circle', symbolSize: 4,
          },
          ...(data.availabilitySeries[0]?.previous != null ? [{
            name: 'Previous period',
            type: 'line' as const,
            data: data.availabilitySeries.map(s => s.previous),
            lineStyle: { type: 'dashed' as const, width: 1.5, color: 'var(--text-muted)' },
            itemStyle: { color: 'var(--text-muted)' },
            symbol: 'none',
          }] : []),
          {
            name: 'Target (90%)',
            type: 'line',
            data: data.availabilitySeries.map(() => 90),
            lineStyle: { type: 'dotted' as const, width: 1.5, color: 'var(--status-healthy)' },
            itemStyle: { color: 'var(--status-healthy)' },
            symbol: 'none',
          },
        ],
      }
    : null;

  // ── District stacked bar ───────────────────────────────────────
  const districtOption = data?.districtMix?.length
    ? {
        grid: { top: 10, bottom: 36, left: 90, right: 16 },
        tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
        legend: { bottom: 0, textStyle: { fontSize: 11 }, itemWidth: 12, itemHeight: 12 },
        xAxis: { type: 'value' as const, axisLabel: { fontSize: 10 } },
        yAxis: {
          type: 'category' as const,
          data: data.districtMix.map(d => d.district),
          axisLabel: { fontSize: 10 },
        },
        series: [
          { name: 'Stock-out', type: 'bar', stack: 's', data: data.districtMix.map(d => d.stockout),  itemStyle: { color: 'var(--status-critical)' } },
          { name: 'Low',       type: 'bar', stack: 's', data: data.districtMix.map(d => d.low),       itemStyle: { color: 'var(--status-medium)' } },
          { name: 'Healthy',   type: 'bar', stack: 's', data: data.districtMix.map(d => d.healthy),   itemStyle: { color: 'var(--status-healthy)' } },
          { name: 'Overstock', type: 'bar', stack: 's', data: data.districtMix.map(d => d.overstock), itemStyle: { color: 'var(--accent-500)' } },
        ],
      }
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {scopeLabel} &bull; {data?.meta.from ?? '...'} to {data?.meta.to ?? '...'}
          </p>
        </div>
        {data && (
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{
              background: 'var(--status-healthy-bg)',
              color: 'var(--status-healthy)',
              border: '1px solid var(--status-healthy)',
              borderRadius: 20,
              fontSize: 11, fontWeight: 700,
              padding: '3px 10px',
              letterSpacing: '0.04em',
            }}>
              Live
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              {data.meta.facilityCount} facilities &bull; {data.meta.medicineCount} medicines
            </span>
          </div>
        )}
      </div>

      {/* Key findings */}
      {data?.insights && data.insights.length > 0 && (
        <section style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderLeft: '4px solid var(--accent-500)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent-500)', marginBottom: 12 }}>
            Key Findings
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.insights.map((ins, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <span className={`badge badge--${ins.severity === 'critical' ? 'critical' : ins.severity === 'high' ? 'high' : ins.severity === 'medium' ? 'medium' : 'neutral'}`} style={{ marginTop: 1, flexShrink: 0 }}>
                  {ins.severity}
                </span>
                {ins.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* KPI row */}
      <section aria-label="Key performance indicators" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
        <KpiCard
          label="Tracer availability"
          value={data?.kpis.availability.value ?? 0}
          unit="%"
          delta={data?.kpis.availability.delta}
          deltaUnit=" pts"
          sparkline={data?.kpis.availability.series}
          target={90}
          status={!data ? 'neutral' : data.kpis.availability.value >= 90 ? 'healthy' : data.kpis.availability.value >= 75 ? 'medium' : 'critical'}
          loading={overview.isPending}
        />
        <KpiCard
          label="Open stock-outs"
          value={data?.kpis.stockouts.value ?? 0}
          delta={data?.kpis.stockouts.delta}
          status="critical"
          loading={overview.isPending}
        />
        <KpiCard
          label="Low-stock items"
          value={data?.kpis.lowStock.value ?? 0}
          delta={data?.kpis.lowStock.delta}
          status="medium"
          loading={overview.isPending}
        />
        <KpiCard
          label="Near-expiry batches"
          value={data?.kpis.nearExpiry.value ?? 0}
          delta={data?.kpis.nearExpiry.delta}
          status="high"
          loading={overview.isPending}
        />
        <KpiCard
          label="Pending requests"
          value={data?.kpis.pendingRequests.value ?? 0}
          delta={data?.kpis.pendingRequests.delta}
          status="neutral"
          loading={overview.isPending}
        />
      </section>

      {/* Primary charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>

        {/* Availability trend */}
        <div className="card" style={{ padding: '20px 20px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Tracer availability</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Monthly % — current vs previous vs 90% target</p>
            </div>
          </div>
          {overview.isPending && <div className="skeleton" style={{ height: 240, marginTop: 12 }} />}
          {overview.isError && (
            <div style={{ height: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Failed to load chart data.</p>
              <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => overview.refetch()}>Retry</button>
            </div>
          )}
          {availOption && <ReactECharts option={availOption} theme={echartsTheme} style={{ height: 240 }} opts={{ renderer: 'svg' }} />}
          {data && !data.availabilitySeries.length && (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No stock records in this period.</p>
            </div>
          )}
        </div>

        {/* Stock status by district */}
        <div className="card" style={{ padding: '20px 20px 16px' }}>
          <div style={{ marginBottom: 4 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Stock status by district</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Latest period — by severity band</p>
          </div>
          {overview.isPending && <div className="skeleton" style={{ height: 240, marginTop: 12 }} />}
          {districtOption && <ReactECharts option={districtOption} theme={echartsTheme} style={{ height: 240 }} opts={{ renderer: 'svg' }} />}
          {data && !data.districtMix.length && (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No district data.</p>
            </div>
          )}
        </div>
      </div>

      {/* Facility risk ranking / facility profile + critical alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Facility profile for facility users OR risk ranking for supervisory roles */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {isFacility ? 'Assigned Facility Details' : isDistrict ? 'District Facility Ranking' : 'Facility risk ranking'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {isFacility ? 'Jurisdiction & operational scope' : isDistrict ? `Facilities in ${user?.district ?? 'Nakaseke'} District` : 'Top highest-risk facilities nationwide'}
            </p>
          </div>
          {overview.isPending && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 36 }} />)}
            </div>
          )}
          {isFacility ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Facility Name</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Kasambya Health Centre III</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Facility Code</span>
                <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>HF001</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>District</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Nakaseke District</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Level</span>
                <span className="badge badge--blue">HC III</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 2 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Permitted Duties</span>
                <span style={{ fontSize: 12, color: 'var(--accent-500)', fontWeight: 600 }}>Stock Record Entry, Resupply Requests</span>
              </div>
            </div>
          ) : (
            displayRanking.length > 0 && (
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Facility</th>
                    <th>District</th>
                    <th style={{ textAlign: 'right' }}>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRanking.slice(0, 10).map(row => (
                    <tr key={row.facility_id}>
                      <td style={{ fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.facility_name}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{row.district}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`badge badge--${row.risk_score >= 70 ? 'critical' : row.risk_score >= 50 ? 'high' : row.risk_score >= 30 ? 'medium' : 'healthy'}`}>
                          {row.risk_score}/100
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>

        {/* Action alerts */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Needs action</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {isFacility ? 'Alerts for your facility' : isDistrict ? 'Alerts in your district' : 'Critical and high alerts nationwide'}
              </p>
            </div>
            <span className="badge badge--critical">{displayActionAlerts.length} open</span>
          </div>
          {overview.isPending && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 36 }} />)}
            </div>
          )}
          {displayActionAlerts.length > 0 && (
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Medicine</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {displayActionAlerts.slice(0, 10).map(a => (
                  <tr key={a._id}>
                    <td style={{ fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.facility_name}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.medicine_name}
                    </td>
                    <td>
                      <span className={`badge badge--${a.severity === 'critical' ? 'critical' : 'high'}`}>
                        {a.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {displayActionAlerts.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--status-healthy)', fontWeight: 600 }}>All clear</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>No critical or high alerts for your scope</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
