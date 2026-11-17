import { z } from 'zod';
import {
  ALERT_SEVERITIES,
  ALERT_TYPES,
  FACILITY_LEVELS,
  REQUEST_STATUSES,
} from './types.js';

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

export const GeoJsonPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
});

export const InChargeSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
});

export const BatchSchema = z.object({
  batch_no: z.string().min(1),
  expiry: z.coerce.date(),
  qty: z.number().int().nonnegative(),
});

export const StockItemSchema = z.object({
  medicine_id: z.string().min(1),
  qty: z.number().int().positive(),
  reason: z.string().min(1),
});

// ─── Collection schemas ────────────────────────────────────────────────────────

export const HealthFacilitySchema = z.object({
  _id: z.string().min(1),
  name: z.string().min(1),
  level: z.enum(FACILITY_LEVELS),
  district: z.string().min(1),
  subcounty: z.string().min(1),
  location: GeoJsonPointSchema,
  in_charge: InChargeSchema,
  catchment_population: z.number().int().positive(),
  services: z.array(z.string()),
});

export const MedicineSchema = z.object({
  _id: z.string().min(1),
  generic_name: z.string().min(1),
  strength: z.string().min(1),
  form: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().min(1),
  reorder_level: z.number().int().positive(),
  tracer_item: z.boolean(),
  cold_chain: z.boolean(),
});

export const StockRecordSchema = z.object({
  _id: z.string().min(1),
  facility_id: z.string().min(1),
  medicine_id: z.string().min(1),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'period must be YYYY-MM'),
  opening: z.number().int().nonnegative(),
  received: z.number().int().nonnegative(),
  issued: z.number().int().nonnegative(),
  closing: z.number().int().nonnegative(),
  stockout_days: z.number().int().nonnegative(),
  batches: z.array(BatchSchema),
});

export const StockRequestSchema = z.object({
  _id: z.string().min(1),
  facility_id: z.string().min(1),
  requested_on: z.coerce.date(),
  status: z.enum(REQUEST_STATUSES),
  supplier: z.string().min(1),
  items: z.array(StockItemSchema).min(1),
  fulfilled_on: z.coerce.date().nullable(),
  rejection_note: z.string().optional(),
  escalated: z.boolean().optional(),
});

export const AlertSchema = z.object({
  _id: z.string().min(1),
  facility_id: z.string().min(1),
  medicine_id: z.string().min(1),
  type: z.enum(ALERT_TYPES),
  severity: z.enum(ALERT_SEVERITIES),
  raised_on: z.coerce.date(),
  resolved: z.boolean(),
  resolved_on: z.coerce.date().nullable().optional(),
  batch_no: z.string().nullable().optional(),
});

// ─── Create / Update input schemas (omit _id) ─────────────────────────────────

export const CreateHealthFacilitySchema = HealthFacilitySchema.omit({ _id: true });
export const CreateMedicineSchema = MedicineSchema.omit({ _id: true });
export const CreateStockRecordSchema = StockRecordSchema.omit({ _id: true });
export const CreateStockRequestSchema = StockRequestSchema.omit({ _id: true });

// ─── Pagination query schema ───────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Analytics query schemas ───────────────────────────────────────────────────

export const ExpiringBatchesQuerySchema = z.object({
  days: z.coerce.number().int().positive().default(90),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const NearestFacilityQuerySchema = z.object({
  medicineId: z.string().min(1),
  lng: z.coerce.number(),
  lat: z.coerce.number(),
  minQty: z.coerce.number().int().nonnegative().default(1),
});

export const EscalatePendingQuerySchema = z.object({
  before: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'before must be YYYY-MM-DD'),
});
