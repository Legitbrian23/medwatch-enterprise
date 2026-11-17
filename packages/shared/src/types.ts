/**
 * Shared TypeScript interfaces for the MedWatch database collections.
 * Field names are frozen to match the PDF source of truth exactly.
 */

// ─── Sub-types ────────────────────────────────────────────────────────────────

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface InCharge {
  name: string;
  phone: string;
}

export interface Batch {
  batch_no: string;
  expiry: Date;
  qty: number;
}

export interface StockItem {
  medicine_id: string;
  qty: number;
  reason: string;
}

// ─── Enumerations ─────────────────────────────────────────────────────────────

export const FACILITY_LEVELS = ['HC II', 'HC III', 'HC IV', 'General Hospital'] as const;
export type FacilityLevel = (typeof FACILITY_LEVELS)[number];

export const ALERT_TYPES = ['stockout', 'low_stock', 'near_expiry'] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const REQUEST_STATUSES = [
  'pending',
  'approved',
  'delivered',
  'cancelled',
  'rejected',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

// ─── Collection interfaces ─────────────────────────────────────────────────────

export interface HealthFacility {
  _id: string;
  name: string;
  level: FacilityLevel;
  district: string;
  subcounty: string;
  location: GeoJsonPoint;
  in_charge: InCharge;
  catchment_population: number;
  services: string[];
}

export interface Medicine {
  _id: string;
  generic_name: string;
  strength: string;
  form: string;
  category: string;
  unit: string;
  reorder_level: number;
  tracer_item: boolean;
  cold_chain: boolean;
}

export interface StockRecord {
  _id: string;
  facility_id: string;
  medicine_id: string;
  period: string; // YYYY-MM
  opening: number;
  received: number;
  issued: number;
  closing: number;
  stockout_days: number;
  batches: Batch[];
}

export interface StockRequest {
  _id: string;
  facility_id: string;
  requested_on: Date;
  status: RequestStatus;
  supplier: string;
  items: StockItem[];
  fulfilled_on: Date | null;
  rejection_note?: string;
  escalated?: boolean;
}

export interface Alert {
  _id: string;
  facility_id: string;
  medicine_id: string;
  type: AlertType;
  severity: AlertSeverity;
  raised_on: Date;
  resolved: boolean;
  resolved_on?: Date | null;
  batch_no?: string | null;
}

// ─── API response envelopes ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

// ─── Analytics shapes ─────────────────────────────────────────────────────────

export interface StockoutByDistrict {
  district: string;
  total_stockout_days: number;
}

export interface ExpiringBatch {
  facility_id: string;
  medicine_id: string;
  facility_name: string;
  medicine_name: string;
  batch_no: string;
  expiry: Date;
  qty: number;
}

export interface BelowReorderRow {
  facility: string;
  medicine: string;
  closing: number;
  reorder_level: number;
}

// ─── Users (extension — not in original PDF schema) ──────────────────────────

export const USER_ROLES = ['facility', 'district', 'national', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  _id: string;              // US001, US002, …
  name: string;
  email: string;            // unique index
  password_hash: string;
  role: UserRole;
  facility_id?: string;     // facility role only
  district?: string;        // district role only
  active: boolean;
  failed_attempts: number;
  locked_until?: Date | null;
  last_login?: Date | null;
  created_at: Date;
  must_change_password?: boolean;
}

/** Safe projection — never include password_hash in API responses */
export type PublicUser = Omit<User, 'password_hash'>;

// ─── Audit log (extension) ────────────────────────────────────────────────────

export interface AuditEvent {
  _id?: string;
  timestamp: Date;
  user_id: string;
  user_name: string;
  action: string;           // 'login' | 'logout' | 'login_failed' | 'account_locked' | …
  resource?: string;
  resource_id?: string;
  detail?: string;
  ip?: string;
}


export interface KpiMetric {
  value: number;
  previousValue: number;
  delta: number;          // absolute change
  deltaPct: number;       // percentage-point or % change
  series: number[];       // 12-point monthly series (oldest→newest)
  target?: number;        // optional benchmark
}

export interface DistrictStatusMix {
  district: string;
  stockout: number;       // count of facility×medicine combos
  low: number;
  healthy: number;
  overstock: number;
}

export interface FacilityRiskRow {
  facility_id: string;
  facility_name: string;
  district: string;
  risk_score: number;     // 0–100
  sparkline: number[];    // 12-point availability series
}

export interface AvailabilitySeries {
  period: string;         // YYYY-MM
  current: number;        // availability %
  previous: number | null;
  target: number;
}

export interface ForecastPoint {
  period: string;
  value: number;
  lower: number;
  upper: number;
}

export interface Insight {
  text: string;
  metric: string;
  value: number;
  direction: 'up' | 'down' | 'neutral';
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ActionAlert {
  _id: string;
  facility_name: string;
  medicine_name: string;
  type: AlertType;
  severity: AlertSeverity;
  raised_on: Date;
  district: string;
}

export interface OverviewResponse {
  meta: {
    from: string;
    to: string;
    asOf: string;
    compareFrom?: string;
    compareTo?: string;
    facilityCount: number;
    medicineCount: number;
  };
  kpis: {
    availability: KpiMetric;
    stockouts: KpiMetric;
    lowStock: KpiMetric;
    nearExpiry: KpiMetric;
    pendingRequests: KpiMetric;
  };
  availabilitySeries: AvailabilitySeries[];
  districtMix: DistrictStatusMix[];
  facilityRanking: FacilityRiskRow[];
  forecast: ForecastPoint[];
  insights: Insight[];
  actionAlerts: ActionAlert[];
}
