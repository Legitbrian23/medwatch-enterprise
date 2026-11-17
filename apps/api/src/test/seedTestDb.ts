/**
 * Inserts the full PDF seed data + AL007 into the in-memory test database.
 * Call this in beforeEach to get a clean slate per test file.
 *
 * We pass arrays `as never` to each insertMany call so the MongoDB driver
 * does not try to enforce ObjectId on _id. MedWatch uses custom string _ids
 * (HF001, MED002, SR003, etc.) throughout, per PDF §3 design decisions.
 * This is a test-only helper — the type cast has no runtime effect.
 */
import { getDb } from '../db/client.js';

export async function seedTestDb(): Promise<void> {
  const db = getDb();
  const cols = ['health_facilities', 'medicines', 'stock_records', 'stock_requests', 'alerts'];
  for (const col of cols) await db.collection(col).deleteMany({});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ins = (col: string, docs: any[]) => db.collection(col).insertMany(docs as never);

  await ins('health_facilities', [
    { _id: 'HF001', name: 'Kasambya Health Centre III',    level: 'HC III',           district: 'Nakaseke', subcounty: 'Kasambya',   location: { type: 'Point', coordinates: [32.45,  0.72] }, in_charge: { name: 'Sarah Nakato',     phone: '0772000101' }, catchment_population: 18500,  services: ['OPD', 'ANC', 'immunisation', 'HIV care'] },
    { _id: 'HF002', name: 'Rwenzori Hospital',             level: 'General Hospital', district: 'Kasese',   subcounty: 'Bugoye',     location: { type: 'Point', coordinates: [30.08,  0.18] }, in_charge: { name: 'Dr. Moses Baluku', phone: '0772000102' }, catchment_population: 120000, services: ['OPD', 'inpatient', 'maternity', 'theatre', 'laboratory'] },
    { _id: 'HF003', name: 'Lokitelaebu Health Centre II',  level: 'HC II',            district: 'Kotido',   subcounty: 'Panyangara', location: { type: 'Point', coordinates: [34.1,   3.0]  }, in_charge: { name: 'Peter Lomonyang', phone: '0772000103' }, catchment_population: 6200,   services: ['OPD', 'immunisation'] },
    { _id: 'HF004', name: 'Nyamitanga Health Centre IV',   level: 'HC IV',            district: 'Mbarara',  subcounty: 'Nyamitanga', location: { type: 'Point', coordinates: [30.65, -0.61] }, in_charge: { name: 'Grace Tumwebaze', phone: '0772000104' }, catchment_population: 45000,  services: ['OPD', 'maternity', 'theatre', 'laboratory'] },
    { _id: 'HF005', name: 'Layibi Health Centre III',      level: 'HC III',           district: 'Gulu',     subcounty: 'Layibi',     location: { type: 'Point', coordinates: [32.3,   2.77] }, in_charge: { name: 'Brenda Akello',   phone: '0772000105' }, catchment_population: 21000,  services: ['OPD', 'ANC', 'immunisation', 'nutrition'] },
    { _id: 'HF006', name: 'Ayivu Health Centre II',        level: 'HC II',            district: 'Arua',     subcounty: 'Ayivu',      location: { type: 'Point', coordinates: [30.91,  3.02] }, in_charge: { name: 'Joel Drateru',    phone: '0772000106' }, catchment_population: 7400,   services: ['OPD', 'immunisation'] },
  ]);

  await ins('medicines', [
    { _id: 'MED001', generic_name: 'Amoxicillin',             strength: '250mg',    form: 'dispersible tablet', category: 'antibiotic',     unit: 'tablet',  reorder_level: 300, tracer_item: true,  cold_chain: false },
    { _id: 'MED002', generic_name: 'Artemether-Lumefantrine', strength: '20/120mg', form: 'tablet',             category: 'antimalarial',   unit: 'tablet',  reorder_level: 400, tracer_item: true,  cold_chain: false },
    { _id: 'MED003', generic_name: 'Oral Rehydration Salts',  strength: '20.5g',    form: 'sachet',             category: 'rehydration',    unit: 'sachet',  reorder_level: 200, tracer_item: true,  cold_chain: false },
    { _id: 'MED004', generic_name: 'Paracetamol',             strength: '500mg',    form: 'tablet',             category: 'analgesic',      unit: 'tablet',  reorder_level: 500, tracer_item: false, cold_chain: false },
    { _id: 'MED005', generic_name: 'Zinc Sulphate',           strength: '20mg',     form: 'dispersible tablet', category: 'supplement',     unit: 'tablet',  reorder_level: 150, tracer_item: true,  cold_chain: false },
    { _id: 'MED006', generic_name: 'Oxytocin',                strength: '10IU/ml',  form: 'injection',          category: 'maternal health', unit: 'ampoule', reorder_level: 40,  tracer_item: true,  cold_chain: true  },
  ]);

  await ins('stock_records', [
    { _id: 'SR001', facility_id: 'HF001', medicine_id: 'MED002', period: '2026-09', opening: 350, received:   0, issued: 330, closing:  20, stockout_days:  9, batches: [{ batch_no: 'AL-2406', expiry: new Date('2027-03-31'), qty: 20 }] },
    { _id: 'SR002', facility_id: 'HF001', medicine_id: 'MED001', period: '2026-09', opening: 500, received: 200, issued: 420, closing: 280, stockout_days:  0, batches: [{ batch_no: 'AM-2311', expiry: new Date('2026-12-15'), qty: 80 }, { batch_no: 'AM-2501', expiry: new Date('2027-08-30'), qty: 200 }] },
    { _id: 'SR003', facility_id: 'HF002', medicine_id: 'MED002', period: '2026-09', opening: 800, received: 400, issued: 650, closing: 550, stockout_days:  0, batches: [{ batch_no: 'AL-2502', expiry: new Date('2027-06-30'), qty: 550 }] },
    { _id: 'SR004', facility_id: 'HF002', medicine_id: 'MED006', period: '2026-09', opening:  60, received:   0, issued:  45, closing:  15, stockout_days:  0, batches: [{ batch_no: 'OX-2504', expiry: new Date('2027-02-28'), qty: 15 }] },
    { _id: 'SR005', facility_id: 'HF003', medicine_id: 'MED003', period: '2026-09', opening: 120, received:   0, issued: 120, closing:   0, stockout_days: 14, batches: [] },
    { _id: 'SR006', facility_id: 'HF004', medicine_id: 'MED004', period: '2026-09', opening: 900, received: 500, issued: 700, closing: 700, stockout_days:  0, batches: [{ batch_no: 'PA-2410', expiry: new Date('2026-12-20'), qty: 200 }, { batch_no: 'PA-2507', expiry: new Date('2028-01-31'), qty: 500 }] },
    { _id: 'SR007', facility_id: 'HF005', medicine_id: 'MED005', period: '2026-09', opening: 200, received: 100, issued:  90, closing: 210, stockout_days:  0, batches: [{ batch_no: 'ZN-2503', expiry: new Date('2027-09-30'), qty: 210 }] },
    { _id: 'SR008', facility_id: 'HF006', medicine_id: 'MED002', period: '2026-09', opening: 150, received:   0, issued: 150, closing:   0, stockout_days: 21, batches: [] },
  ]);

  await ins('stock_requests', [
    { _id: 'SQ001', facility_id: 'HF001', requested_on: new Date('2026-09-22'), status: 'approved',  supplier: 'National Medical Stores', items: [{ medicine_id: 'MED002', qty: 600, reason: 'stock-out for 9 days' }, { medicine_id: 'MED001', qty: 300, reason: 'below reorder level' }], fulfilled_on: null },
    { _id: 'SQ002', facility_id: 'HF003', requested_on: new Date('2026-09-18'), status: 'pending',   supplier: 'National Medical Stores', items: [{ medicine_id: 'MED003', qty: 400, reason: 'diarrhoea cases rising' }], fulfilled_on: null },
    { _id: 'SQ003', facility_id: 'HF006', requested_on: new Date('2026-09-10'), status: 'delivered', supplier: 'National Medical Stores', items: [{ medicine_id: 'MED002', qty: 500, reason: 'malaria season' }], fulfilled_on: new Date('2026-09-26') },
    { _id: 'SQ004', facility_id: 'HF002', requested_on: new Date('2026-09-28'), status: 'pending',   supplier: 'Joint Medical Stores',    items: [{ medicine_id: 'MED006', qty: 100, reason: 'maternity ward demand' }], fulfilled_on: null },
    { _id: 'SQ005', facility_id: 'HF004', requested_on: new Date('2026-09-05'), status: 'rejected',  supplier: 'National Medical Stores', items: [{ medicine_id: 'MED004', qty: 2000, reason: 'bulk order' }], fulfilled_on: null, rejection_note: 'quantity above allocation' },
    { _id: 'SQ006', facility_id: 'HF005', requested_on: new Date('2026-09-30'), status: 'approved',  supplier: 'National Medical Stores', items: [{ medicine_id: 'MED005', qty: 150, reason: 'routine top up' }, { medicine_id: 'MED003', qty: 200, reason: 'routine top up' }], fulfilled_on: null },
  ]);

  await ins('alerts', [
    { _id: 'AL001', facility_id: 'HF001', medicine_id: 'MED002', type: 'low_stock',  severity: 'high',     raised_on: new Date('2026-09-30'), resolved: false, resolved_on: null, batch_no: null },
    { _id: 'AL002', facility_id: 'HF003', medicine_id: 'MED003', type: 'stockout',   severity: 'critical', raised_on: new Date('2026-09-30'), resolved: false, resolved_on: null, batch_no: null },
    { _id: 'AL003', facility_id: 'HF006', medicine_id: 'MED002', type: 'stockout',   severity: 'critical', raised_on: new Date('2026-09-30'), resolved: false, resolved_on: null, batch_no: null },
    { _id: 'AL004', facility_id: 'HF002', medicine_id: 'MED006', type: 'low_stock',  severity: 'medium',   raised_on: new Date('2026-09-30'), resolved: false, resolved_on: null, batch_no: null },
    { _id: 'AL005', facility_id: 'HF001', medicine_id: 'MED001', type: 'low_stock',  severity: 'medium',   raised_on: new Date('2026-09-30'), resolved: true,  resolved_on: null, batch_no: null },
    { _id: 'AL006', facility_id: 'HF004', medicine_id: 'MED004', type: 'near_expiry', severity: 'low',     raised_on: new Date('2026-10-01'), resolved: false, resolved_on: null, batch_no: 'PA-2410' },
    // AL007: PDF-1 fix — near-expiry alert for batch AM-2311 (HF001/MED001, expiry 2026-12-15)
    { _id: 'AL007', facility_id: 'HF001', medicine_id: 'MED001', type: 'near_expiry', severity: 'low',     raised_on: new Date('2026-10-13'), resolved: false, resolved_on: null, batch_no: 'AM-2311' },
  ]);
}
