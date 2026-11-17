/**
 * Pure function — generates plain-language insight sentences from overview data.
 * No side effects, no API calls. Fully unit-testable.
 *
 * This is the web-side copy, kept in sync with apps/api/src/services/insights.ts.
 * Changes to either file must be mirrored in the other.
 */
import type {
  DistrictStatusMix,
  FacilityRiskRow,
  Insight,
  KpiMetric,
} from '@medwatch/shared';

interface InsightInput {
  availKpi: KpiMetric;
  districtMix: DistrictStatusMix[];
  facilityRanking: FacilityRiskRow[];
  stockouts: number;
  lowStock: number;
  nearExpiry: number;
  pending: number;
  currentPeriods: string[];
}

function lastMonth(periods: string[]): string {
  const p = periods[periods.length - 1];
  if (!p) return 'the current period';
  const [y, m] = p.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

function prevMonth(periods: string[]): string {
  const p = periods[periods.length - 2];
  if (!p) return 'the previous period';
  const [y, m] = p.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

export function generateInsights(input: InsightInput): Insight[] {
  const { availKpi, districtMix, facilityRanking, stockouts, nearExpiry, currentPeriods } =
    input;
  const insights: Insight[] = [];

  // 1. Availability trend
  if (availKpi.previousValue > 0) {
    const dir = availKpi.delta >= 0 ? 'up' : 'down';
    const verb = availKpi.delta >= 0 ? 'improved' : 'fell';
    const abs = Math.abs(availKpi.delta);

    const worstDistricts = districtMix
      .sort((a, b) => b.stockout - a.stockout)
      .slice(0, 2)
      .map((d) => d.district);
    const driverClause =
      worstDistricts.length > 0
        ? `, driven by ${worstDistricts.join(' and ')}`
        : '';

    insights.push({
      text: `Tracer availability ${verb} ${abs.toFixed(1)} percentage points against ${prevMonth(currentPeriods)}${driverClause}.`,
      metric: 'availability',
      value: availKpi.value,
      direction: dir,
      severity: abs >= 5 ? 'high' : abs >= 2 ? 'medium' : 'low',
    });
  }

  // 2. Stock-outs
  if (stockouts > 0) {
    insights.push({
      text: `${stockouts} stock-out ${stockouts === 1 ? 'alert is' : 'alerts are'} currently unresolved as of ${lastMonth(currentPeriods)}.`,
      metric: 'stockouts',
      value: stockouts,
      direction: 'down',
      severity: stockouts >= 10 ? 'critical' : stockouts >= 5 ? 'high' : 'medium',
    });
  }

  // 3. Near-expiry
  if (nearExpiry > 0) {
    insights.push({
      text: `${nearExpiry} batch${nearExpiry === 1 ? '' : 'es'} will expire within 90 days and require attention.`,
      metric: 'nearExpiry',
      value: nearExpiry,
      direction: 'neutral',
      severity: nearExpiry >= 10 ? 'high' : 'medium',
    });
  }

  // 4. High-risk facility
  const topRisk = facilityRanking[0];
  if (topRisk && topRisk.risk_score >= 40) {
    insights.push({
      text: `${topRisk.facility_name} (${topRisk.district}) has the highest risk score at ${topRisk.risk_score}/100.`,
      metric: 'facilityRisk',
      value: topRisk.risk_score,
      direction: 'down',
      severity:
        topRisk.risk_score >= 70 ? 'critical' : topRisk.risk_score >= 50 ? 'high' : 'medium',
    });
  }

  // 5. Availability vs target
  if (availKpi.target && availKpi.value < availKpi.target) {
    const gap = (availKpi.target - availKpi.value).toFixed(1);
    insights.push({
      text: `National availability is ${availKpi.value}%, which is ${gap} points below the 90% target.`,
      metric: 'availability',
      value: availKpi.value,
      direction: 'down',
      severity: availKpi.value < 70 ? 'critical' : availKpi.value < 80 ? 'high' : 'medium',
    });
  }

  return insights.slice(0, 5);
}
