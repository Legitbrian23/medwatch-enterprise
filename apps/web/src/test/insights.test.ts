/**
 * Unit tests for the pure generateInsights() function.
 * No API calls, no side effects — just data in, sentences out.
 */
import { describe, it, expect } from 'vitest';
import { generateInsights } from '../hooks/insights';
import type { KpiMetric, DistrictStatusMix, FacilityRiskRow } from '@medwatch/shared';

function makeKpi(value: number, prev: number, target?: number): KpiMetric {
  const delta = value - prev;
  return {
    value,
    previousValue: prev,
    delta,
    deltaPct: prev > 0 ? Math.round((delta / prev) * 1000) / 10 : 0,
    series: Array(12).fill(value),
    target,
  };
}

const DISTRICTS: DistrictStatusMix[] = [
  { district: 'Kotido', stockout: 3, low: 1, healthy: 2, overstock: 0 },
  { district: 'Arua',   stockout: 2, low: 2, healthy: 2, overstock: 0 },
];

const FACILITIES: FacilityRiskRow[] = [
  { facility_id: 'HF003', facility_name: 'Lokitelaebu HC II', district: 'Kotido', risk_score: 80, sparkline: Array(12).fill(20) },
];

const PERIODS = ['2026-07', '2026-08', '2026-09'];

describe('generateInsights()', () => {
  it('returns an array of at most 5 items', () => {
    const insights = generateInsights({
      availKpi: makeKpi(72, 78.2, 90),
      districtMix: DISTRICTS,
      facilityRanking: FACILITIES,
      stockouts: 2,
      lowStock: 3,
      nearExpiry: 1,
      pending: 2,
      currentPeriods: PERIODS,
    });
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.length).toBeLessThanOrEqual(5);
  });

  it('every insight has non-empty text', () => {
    const insights = generateInsights({
      availKpi: makeKpi(72, 78.2, 90),
      districtMix: DISTRICTS,
      facilityRanking: FACILITIES,
      stockouts: 2,
      lowStock: 3,
      nearExpiry: 1,
      pending: 2,
      currentPeriods: PERIODS,
    });
    for (const i of insights) {
      expect(i.text.length).toBeGreaterThan(10);
      expect(i.text).not.toMatch(/undefined|NaN/);
    }
  });

  it('availability decline produces a "fell" insight', () => {
    const insights = generateInsights({
      availKpi: makeKpi(72, 80, 90),
      districtMix: DISTRICTS,
      facilityRanking: FACILITIES,
      stockouts: 0,
      lowStock: 0,
      nearExpiry: 0,
      pending: 0,
      currentPeriods: PERIODS,
    });
    const avail = insights.find(i => i.metric === 'availability' && i.direction === 'down');
    expect(avail).toBeDefined();
    expect(avail!.text).toMatch(/fell/i);
  });

  it('availability improvement produces an "improved" insight', () => {
    const insights = generateInsights({
      availKpi: makeKpi(85, 79, 90),
      districtMix: DISTRICTS,
      facilityRanking: FACILITIES,
      stockouts: 0,
      lowStock: 0,
      nearExpiry: 0,
      pending: 0,
      currentPeriods: PERIODS,
    });
    const avail = insights.find(i => i.metric === 'availability');
    expect(avail).toBeDefined();
    expect(avail!.direction).toBe('up');
  });

  it('no stock-outs produces no stockout insight', () => {
    const insights = generateInsights({
      availKpi: makeKpi(90, 89),
      districtMix: [],
      facilityRanking: [],
      stockouts: 0,
      lowStock: 0,
      nearExpiry: 0,
      pending: 0,
      currentPeriods: PERIODS,
    });
    const stockoutInsight = insights.find(i => i.metric === 'stockouts');
    expect(stockoutInsight).toBeUndefined();
  });

  it('high risk facility produces a risk insight when risk_score >= 40', () => {
    const insights = generateInsights({
      availKpi: makeKpi(90, 89),
      districtMix: [],
      facilityRanking: FACILITIES,   // risk_score: 80
      stockouts: 0,
      lowStock: 0,
      nearExpiry: 0,
      pending: 0,
      currentPeriods: PERIODS,
    });
    const riskInsight = insights.find(i => i.metric === 'facilityRisk');
    expect(riskInsight).toBeDefined();
    expect(riskInsight!.value).toBe(80);
  });

  it('returns no sentences containing exclamation marks', () => {
    const insights = generateInsights({
      availKpi: makeKpi(60, 75, 90),
      districtMix: DISTRICTS,
      facilityRanking: FACILITIES,
      stockouts: 5,
      lowStock: 4,
      nearExpiry: 3,
      pending: 2,
      currentPeriods: PERIODS,
    });
    for (const i of insights) {
      expect(i.text).not.toContain('!');
    }
  });
});
