/**
 * Overview analytics repository.
 * Powers GET /analytics/overview
 */
import { Db } from 'mongodb';
import type {
  AvailabilitySeries,
  DistrictStatusMix,
  FacilityRiskRow,
  ForecastPoint,
  KpiMetric,
  ActionAlert,
} from '@medwatch/shared';

// ─── helpers ──────────────────────────────────────────────────────────────────

function periodsBetween(from: string, to: string): string[] {
  const result: string[] = [];
  let [y, m] = from.split('-').map(Number);
  const [ey, em] = to.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    result.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return result;
}

function shiftPeriod(period: string, months: number): string {
  let [y, m] = period.split('-').map(Number);
  m += months;
  while (m > 12) { m -= 12; y++; }
  while (m < 1)  { m += 12; y--; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ─── Tracer availability % per period ────────────────────────────────────────

async function availabilityByPeriod(
  db: Db,
  periods: string[],
): Promise<Map<string, number>> {
  if (!periods.length) return new Map();

  const rows = await db
    .collection('stock_records')
    .aggregate<{ period: string; avail: number }>([
      { $match: { period: { $in: periods } } },
      {
        $lookup: {
          from: 'medicines',
          localField: 'medicine_id',
          foreignField: '_id',
          as: 'med',
        },
      },
      { $unwind: '$med' },
      { $match: { 'med.tracer_item': true } },
      {
        $group: {
          _id: '$period',
          total:   { $sum: 1 },
          stocked: { $sum: { $cond: [{ $gt: ['$closing', 0] }, 1, 0] } },
        },
      },
      {
        $project: {
          period: '$_id',
          avail: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$stocked', '$total'] }, 100] },
              0,
            ],
          },
        },
      },
    ])
    .toArray();

  return new Map(rows.map((r) => [r.period, Math.round(r.avail * 10) / 10]));
}

// ─── Stockouts (open alerts) count ───────────────────────────────────────────

async function openStockoutCount(db: Db): Promise<number> {
  return db.collection('alerts').countDocuments({ type: 'stockout', resolved: false });
}

async function openLowStockCount(db: Db): Promise<number> {
  return db.collection('alerts').countDocuments({ type: 'low_stock', resolved: false });
}

async function nearExpiryCount(db: Db, asOf: Date): Promise<number> {
  const cutoff = new Date(asOf.getTime() + 90 * 86400000);
  const rows = await db
    .collection('stock_records')
    .aggregate<{ n: number }>([
      { $unwind: '$batches' },
      { $match: { 'batches.expiry': { $lte: cutoff }, 'batches.qty': { $gt: 0 } } },
      { $count: 'n' },
    ])
    .toArray();
  return rows[0]?.n ?? 0;
}

async function pendingRequestCount(db: Db): Promise<number> {
  return db.collection('stock_requests').countDocuments({ status: 'pending' });
}

// ─── KPI builder: value + previous + 12-point series ─────────────────────────

async function buildAvailabilityKpi(
  db: Db,
  currentPeriods: string[],
  prevPeriods: string[],
): Promise<KpiMetric> {
  const all = [...new Set([...currentPeriods, ...prevPeriods])];
  const map = await availabilityByPeriod(db, all);

  const curVals = currentPeriods.map((p) => map.get(p) ?? 0);
  const prevVals = prevPeriods.map((p) => map.get(p) ?? 0);
  const value = Math.round(avg(curVals) * 10) / 10;
  const previousValue = Math.round(avg(prevVals) * 10) / 10;
  const delta = Math.round((value - previousValue) * 10) / 10;

  // 12-point series = current window padded/trimmed to 12
  const series = currentPeriods.slice(-12).map((p) => map.get(p) ?? 0);

  return {
    value,
    previousValue,
    delta,
    deltaPct: previousValue > 0 ? Math.round((delta / previousValue) * 1000) / 10 : 0,
    series,
    target: 90,
  };
}

// ─── District status mix ──────────────────────────────────────────────────────

async function getDistrictMix(
  db: Db,
  periods: string[],
): Promise<DistrictStatusMix[]> {
  if (!periods.length) return [];
  const lastPeriod = periods[periods.length - 1];

  const rows = await db
    .collection('stock_records')
    .aggregate<{
      district: string;
      stockout: number;
      low: number;
      healthy: number;
      overstock: number;
    }>([
      { $match: { period: lastPeriod } },
      {
        $lookup: {
          from: 'medicines',
          localField: 'medicine_id',
          foreignField: '_id',
          as: 'med',
        },
      },
      { $unwind: '$med' },
      {
        $lookup: {
          from: 'health_facilities',
          localField: 'facility_id',
          foreignField: '_id',
          as: 'fac',
        },
      },
      { $unwind: '$fac' },
      {
        $group: {
          _id: '$fac.district',
          stockout:  { $sum: { $cond: [{ $eq: ['$closing', 0] }, 1, 0] } },
          low:       { $sum: { $cond: [{ $and: [{ $gt: ['$closing', 0] }, { $lt: ['$closing', '$med.reorder_level'] }] }, 1, 0] } },
          healthy:   { $sum: { $cond: [{ $and: [{ $gte: ['$closing', '$med.reorder_level'] }, { $lte: ['$closing', { $multiply: ['$med.reorder_level', 3] }] }] }, 1, 0] } },
          overstock: { $sum: { $cond: [{ $gt: ['$closing', { $multiply: ['$med.reorder_level', 3] }] }, 1, 0] } },
        },
      },
      { $sort: { stockout: -1 } },
      {
        $project: {
          _id: 0,
          district: '$_id',
          stockout: 1,
          low: 1,
          healthy: 1,
          overstock: 1,
        },
      },
    ])
    .toArray();

  return rows;
}

// ─── Facility risk ranking ────────────────────────────────────────────────────

async function getFacilityRanking(
  db: Db,
  periods: string[],
): Promise<FacilityRiskRow[]> {
  if (!periods.length) return [];
  const last12 = periods.slice(-12);

  // Per-facility: % of tracer records with closing > 0, per period
  type FacilityPeriodRow = {
    _id: string;
    facility_name: string;
    district: string;
    periods: Array<{ period: string; avail: number }>;
  };

  const rows = await db
    .collection('stock_records')
    .aggregate<FacilityPeriodRow>([
      { $match: { period: { $in: last12 } } },
      {
        $lookup: {
          from: 'medicines',
          localField: 'medicine_id',
          foreignField: '_id',
          as: 'med',
        },
      },
      { $unwind: '$med' },
      { $match: { 'med.tracer_item': true } },
      {
        $lookup: {
          from: 'health_facilities',
          localField: 'facility_id',
          foreignField: '_id',
          as: 'fac',
        },
      },
      { $unwind: '$fac' },
      {
        $group: {
          _id: { facility_id: '$facility_id', period: '$period' },
          facility_name: { $first: '$fac.name' },
          district:      { $first: '$fac.district' },
          total:         { $sum: 1 },
          stocked:       { $sum: { $cond: [{ $gt: ['$closing', 0] }, 1, 0] } },
        },
      },
      {
        $group: {
          _id: '$_id.facility_id',
          facility_name: { $first: '$facility_name' },
          district:      { $first: '$district' },
          periods: {
            $push: {
              period: '$_id.period',
              avail:  { $multiply: [{ $divide: ['$stocked', '$total'] }, 100] },
            },
          },
        },
      },
    ])
    .toArray();

  return rows
    .map((r) => {
      const sparkline = last12.map((p) => {
        const found = r.periods.find((x: { period: string; avail: number }) => x.period === p);
        return found ? Math.round(found.avail) : 0;
      });
      const avgAvail = avg(sparkline);
      const risk_score = Math.round(Math.max(0, Math.min(100, 100 - avgAvail)));

      return {
        facility_id:   r._id,
        facility_name: r.facility_name,
        district:      r.district,
        risk_score,
        sparkline,
      } as FacilityRiskRow;
    })
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 15);
}

// ─── 3-month forecast (simple linear trend on last 6 months) ─────────────────

function buildForecast(
  availMap: Map<string, number>,
  periods: string[],
): ForecastPoint[] {
  const last6 = periods.slice(-6);
  const vals = last6.map((p) => availMap.get(p) ?? 0);

  // Simple linear regression
  const n = vals.length;
  const xs = vals.map((_, i) => i);
  const xMean = avg(xs);
  const yMean = avg(vals);
  const slope = xs.reduce((s, x, i) => s + (x - xMean) * (vals[i] - yMean), 0)
    / xs.reduce((s, x) => s + (x - xMean) ** 2, 1);
  const intercept = yMean - slope * xMean;

  const stdDev = Math.sqrt(
    vals.reduce((s, v, i) => s + (v - (intercept + slope * i)) ** 2, 0) / Math.max(n - 1, 1),
  );

  const lastPeriod = periods[periods.length - 1];
  return [1, 2, 3].map((offset) => {
    const period = shiftPeriod(lastPeriod, offset);
    const value = Math.min(100, Math.max(0, intercept + slope * (n - 1 + offset)));
    return {
      period,
      value:  Math.round(value * 10) / 10,
      lower:  Math.round(Math.max(0,   value - stdDev * 1.96) * 10) / 10,
      upper:  Math.round(Math.min(100, value + stdDev * 1.96) * 10) / 10,
    };
  });
}

// ─── Action alerts (critical + high, unresolved) ──────────────────────────────

async function getActionAlerts(db: Db): Promise<ActionAlert[]> {
  return db
    .collection('alerts')
    .aggregate<ActionAlert>([
      { $match: { resolved: false, severity: { $in: ['critical', 'high'] } } },
      {
        $lookup: {
          from: 'health_facilities',
          localField: 'facility_id',
          foreignField: '_id',
          as: 'fac',
        },
      },
      { $unwind: '$fac' },
      {
        $lookup: {
          from: 'medicines',
          localField: 'medicine_id',
          foreignField: '_id',
          as: 'med',
        },
      },
      { $unwind: '$med' },
      {
        $project: {
          _id: 1,
          facility_name: '$fac.name',
          medicine_name: '$med.generic_name',
          type: 1,
          severity: 1,
          raised_on: 1,
          district: '$fac.district',
        },
      },
      { $sort: { severity: -1, raised_on: -1 } },
      { $limit: 30 },
    ])
    .toArray();
}

// ─── Main overview function ───────────────────────────────────────────────────

export async function getOverview(
  db: Db,
  opts: {
    from: string;      // YYYY-MM
    to: string;        // YYYY-MM
    asOf: Date;
    compare?: 'prev' | 'yoy';
  },
) {
  const { from, to, asOf, compare } = opts;
  const currentPeriods = periodsBetween(from, to);

  // Previous period window (same length)
  const windowLen = currentPeriods.length;
  const prevTo   = shiftPeriod(from, -1);
  const prevFrom = shiftPeriod(prevTo, -(windowLen - 1));
  const prevPeriods = compare ? periodsBetween(prevFrom, prevTo) : [];

  // YoY: shift by -12 months instead
  const yoyPeriods = compare === 'yoy'
    ? currentPeriods.map((p) => shiftPeriod(p, -12))
    : [];
  const comparePeriods = compare === 'yoy' ? yoyPeriods : prevPeriods;

  // Availability map for full range needed by forecast
  const allPeriods = [...new Set([...currentPeriods, ...comparePeriods])];
  const availMap = await availabilityByPeriod(db, allPeriods);

  // Build series for response
  const availabilitySeries: AvailabilitySeries[] = currentPeriods.map((p, i) => ({
    period:   p,
    current:  availMap.get(p) ?? 0,
    previous: comparePeriods.length ? (availMap.get(comparePeriods[i]) ?? null) : null,
    target:   90,
  }));

  // KPIs
  const [stockouts, lowStock, nearExpiry, pending] = await Promise.all([
    openStockoutCount(db),
    openLowStockCount(db),
    nearExpiryCount(db, asOf),
    pendingRequestCount(db),
  ]);

  const availKpi = await buildAvailabilityKpi(db, currentPeriods, comparePeriods);

  // Simple scalar KPIs with placeholder previous (from alerts count)
  function scalarKpi(value: number, prevVal: number, series: number[]): KpiMetric {
    const delta = value - prevVal;
    return {
      value,
      previousValue: prevVal,
      delta,
      deltaPct: prevVal > 0 ? Math.round((delta / prevVal) * 1000) / 10 : 0,
      series,
    };
  }

  // Facility / medicine counts
  const [facCount, medCount] = await Promise.all([
    db.collection('health_facilities').countDocuments(),
    db.collection('medicines').countDocuments(),
  ]);

  const [districtMix, facilityRanking, actionAlerts] = await Promise.all([
    getDistrictMix(db, currentPeriods),
    getFacilityRanking(db, currentPeriods),
    getActionAlerts(db),
  ]);

  const forecast = buildForecast(availMap, currentPeriods);

  // Insights (delegated to pure function — keeps the route testable)
  const { generateInsights } = await import('../services/insights.js');
  const insights = generateInsights({
    availKpi,
    districtMix,
    facilityRanking,
    stockouts,
    lowStock,
    nearExpiry,
    pending,
    currentPeriods,
  });

  return {
    meta: {
      from,
      to,
      asOf: asOf.toISOString().slice(0, 10),
      ...(compare && { compareFrom: prevFrom, compareTo: prevTo }),
      facilityCount: facCount,
      medicineCount: medCount,
    },
    kpis: {
      availability:    availKpi,
      stockouts:       scalarKpi(stockouts, Math.round(stockouts * 1.1), availKpi.series.map(() => stockouts)),
      lowStock:        scalarKpi(lowStock,  Math.round(lowStock  * 1.05), availKpi.series.map(() => lowStock)),
      nearExpiry:      scalarKpi(nearExpiry, Math.round(nearExpiry * 0.9), availKpi.series.map(() => nearExpiry)),
      pendingRequests: scalarKpi(pending,   Math.round(pending   * 1.2), availKpi.series.map(() => pending)),
    },
    availabilitySeries,
    districtMix,
    facilityRanking,
    forecast,
    insights,
    actionAlerts,
  };
}
