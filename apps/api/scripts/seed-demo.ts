/**
 * Demo seed — larger deterministic dataset for the Dashboard.
 * ~40 facilities, 12 districts, 12 medicines, 12 months of stock records
 * (Oct 2025 – Sep 2026) with seasonality.
 *
 * Invariants maintained:
 *   closing = opening + received - issued
 *   sum(batch.qty) = closing  (when batches.length > 0)
 *
 * Run:  pnpm seed:demo
 * The canonical 32-doc seed (for tests) is still:  pnpm seed
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { createCollections } from '../src/db/createCollections.js';
import { createIndexes } from '../src/db/createIndexes.js';
import { seedUsers } from './seedUsers.js';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB ?? 'medwatch';

// ─── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────
function makePrng(seed: number) {
  let s = seed;
  return function rand(): number {
    s |= 0; s = s + 0x6d2b79f5 | 0;
    let z = Math.imul(s ^ s >>> 15, 1 | s);
    z = z + Math.imul(z ^ z >>> 7, 61 | z) ^ z;
    return ((z ^ z >>> 14) >>> 0) / 0x100000000;
  };
}

const rng = makePrng(0xdeadbeef);

function ri(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ─── Reference data ───────────────────────────────────────────────────────────

const DISTRICTS = [
  { name: 'Nakaseke',   coord: [32.45,  0.72] },
  { name: 'Kasese',     coord: [30.08,  0.18] },
  { name: 'Kotido',     coord: [34.10,  3.00] },
  { name: 'Mbarara',    coord: [30.65, -0.61] },
  { name: 'Gulu',       coord: [32.30,  2.77] },
  { name: 'Arua',       coord: [30.91,  3.02] },
  { name: 'Lira',       coord: [32.90,  2.25] },
  { name: 'Soroti',     coord: [33.61,  1.71] },
  { name: 'Jinja',      coord: [33.20,  0.43] },
  { name: 'Mbale',      coord: [34.18,  1.07] },
  { name: 'Masaka',     coord: [31.73, -0.34] },
  { name: 'Hoima',      coord: [31.35,  1.43] },
];

const FACILITY_NAMES: Record<string, string[]> = {
  Nakaseke: ['Kasambya HC III', 'Lwamata HC II', 'Semuto HC IV', 'Nakaseke HC III'],
  Kasese:   ['Rwenzori Hospital', 'Bugoye HC II', 'Kilembe HC III'],
  Kotido:   ['Lokitelaebu HC II', 'Kotido HC IV', 'Panyangara HC II'],
  Mbarara:  ['Nyamitanga HC IV', 'Kakiika HC III', 'Ruti HC II'],
  Gulu:     ['Layibi HC III', 'Gulu RRH', 'Patiko HC II', 'Odek HC III'],
  Arua:     ['Ayivu HC II', 'Arua RRH', 'Dadamu HC III'],
  Lira:     ['Lira Referral Hospital', 'Adwari HC II', 'Ngetta HC III'],
  Soroti:   ['Soroti Regional Hospital', 'Katine HC III'],
  Jinja:    ['Jinja Regional Hospital', 'Walukuba HC III', 'Bugembe HC II'],
  Mbale:    ['Mbale Regional Hospital', 'Namatala HC III', 'Bungokho HC II'],
  Masaka:   ['Masaka Regional Hospital', 'Bukakata HC III'],
  Hoima:    ['Hoima RRH', 'Kigorobya HC III', 'Buliisa HC II'],
};

const LEVELS: Record<string, 'HC II' | 'HC III' | 'HC IV' | 'General Hospital'> = {
  'HC II': 'HC II', 'HC III': 'HC III', 'HC IV': 'HC IV',
  'Hospital': 'General Hospital', 'RRH': 'General Hospital',
};

function facilityLevel(name: string): 'HC II' | 'HC III' | 'HC IV' | 'General Hospital' {
  for (const [k, v] of Object.entries(LEVELS)) {
    if (name.includes(k)) return v;
  }
  return 'HC III';
}

const STAFF_NAMES = [
  'Sarah Nakato', 'Dr. Moses Baluku', 'Peter Lomonyang', 'Grace Tumwebaze',
  'Brenda Akello', 'Joel Drateru', 'Agnes Apio', 'Charles Okello',
  'Doris Namukasa', 'Emmanuel Mugisha', 'Florence Atim', 'Geoffrey Kyeyune',
  'Helen Akello', 'Ivan Ssebugwawo', 'Joyce Namutebi', 'Kenneth Oryem',
  'Lydia Amoding', 'Martin Byarugaba', 'Nancy Achola', 'Oliver Tumwine',
  'Patricia Auma', 'Richard Kakooza', 'Susan Ochola', 'Timothy Wamala',
  'Ursula Nabirye', 'Vincent Otim', 'Winnie Akello', 'Xavier Mugabe',
  'Yvonne Namugga', 'Zachary Olweny', 'Alice Tusiime', 'Bernard Odongo',
  'Catherine Lubega', 'David Anywar', 'Esther Atuku', 'Francis Sseruwu',
  'Gloria Opito', 'Herbert Ochieng', 'Irene Nambi', 'James Kato',
];

const MEDICINES = [
  { _id: 'MED001', generic_name: 'Amoxicillin',              strength: '250mg',     form: 'dispersible tablet', category: 'antibiotic',      unit: 'tablet',  reorder_level: 300, tracer_item: true,  cold_chain: false },
  { _id: 'MED002', generic_name: 'Artemether-Lumefantrine',  strength: '20/120mg',  form: 'tablet',             category: 'antimalarial',    unit: 'tablet',  reorder_level: 400, tracer_item: true,  cold_chain: false },
  { _id: 'MED003', generic_name: 'Oral Rehydration Salts',   strength: '20.5g',     form: 'sachet',             category: 'rehydration',     unit: 'sachet',  reorder_level: 200, tracer_item: true,  cold_chain: false },
  { _id: 'MED004', generic_name: 'Paracetamol',              strength: '500mg',     form: 'tablet',             category: 'analgesic',       unit: 'tablet',  reorder_level: 500, tracer_item: false, cold_chain: false },
  { _id: 'MED005', generic_name: 'Zinc Sulphate',            strength: '20mg',      form: 'dispersible tablet', category: 'supplement',      unit: 'tablet',  reorder_level: 150, tracer_item: true,  cold_chain: false },
  { _id: 'MED006', generic_name: 'Oxytocin',                 strength: '10IU/ml',   form: 'injection',          category: 'maternal health', unit: 'ampoule', reorder_level: 40,  tracer_item: true,  cold_chain: true  },
  { _id: 'MED007', generic_name: 'Cotrimoxazole',            strength: '480mg',     form: 'tablet',             category: 'antibiotic',      unit: 'tablet',  reorder_level: 250, tracer_item: true,  cold_chain: false },
  { _id: 'MED008', generic_name: 'Iron/Folic Acid',          strength: '200/0.4mg', form: 'tablet',             category: 'supplement',      unit: 'tablet',  reorder_level: 300, tracer_item: true,  cold_chain: false },
  { _id: 'MED009', generic_name: 'Depo-Provera',             strength: '150mg/ml',  form: 'injection',          category: 'contraceptive',   unit: 'vial',    reorder_level: 30,  tracer_item: true,  cold_chain: false },
  { _id: 'MED010', generic_name: 'Metronidazole',            strength: '400mg',     form: 'tablet',             category: 'antibiotic',      unit: 'tablet',  reorder_level: 200, tracer_item: false, cold_chain: false },
  { _id: 'MED011', generic_name: 'Gentamicin',               strength: '40mg/ml',   form: 'injection',          category: 'antibiotic',      unit: 'vial',    reorder_level: 20,  tracer_item: true,  cold_chain: false },
  { _id: 'MED012', generic_name: 'Vitamin A',                strength: '200000IU',  form: 'capsule',            category: 'supplement',      unit: 'capsule', reorder_level: 100, tracer_item: true,  cold_chain: false },
];

// Malaria season (Apr–Jun, Oct–Dec) drives AL demand up
function malariaFactor(month: number): number {
  // month is 1-based
  if ([4, 5, 6, 10, 11, 12].includes(month)) return 1.4;
  return 1.0;
}

// Generate 12 months: Oct 2025 – Sep 2026
const PERIODS: string[] = [];
for (let m = 0; m < 12; m++) {
  const d = new Date(2025, 9 + m, 1); // month is 0-based
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  PERIODS.push(`${y}-${mo}`);
}

async function seed(): Promise<void> {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);

  console.log(`\n🌱  Demo seed — database "${MONGODB_DB}" at ${MONGODB_URI}\n`);

  const collections = ['health_facilities', 'medicines', 'stock_records', 'stock_requests', 'alerts'];
  for (const col of collections) {
    try { await db.collection(col).drop(); } catch { /* ignore */ }
  }
  console.log('  ✓ Dropped existing collections');

  await createCollections(db);
  await createIndexes(db);
  console.log('  ✓ Created collections and indexes');

  // ─── Facilities ────────────────────────────────────────────────────────────
  const facilities: unknown[] = [];
  let hfIdx = 1;
  for (const dist of DISTRICTS) {
    const names = FACILITY_NAMES[dist.name] ?? [`${dist.name} HC III`];
    for (const name of names) {
      const id = `HF${String(hfIdx).padStart(3, '0')}`;
      const [lng, lat] = dist.coord;
      facilities.push({
        _id: id,
        name,
        level: facilityLevel(name),
        district: dist.name,
        subcounty: name.split(' ')[0],
        location: { type: 'Point', coordinates: [lng + rng() * 0.3, lat + rng() * 0.3] },
        in_charge: { name: STAFF_NAMES[hfIdx - 1] ?? 'Staff Member', phone: `077200${String(hfIdx).padStart(4, '0')}` },
        catchment_population: ri(5000, 130000),
        services: ['OPD', 'ANC', 'immunisation'],
      });
      hfIdx++;
    }
  }
  await db.collection('health_facilities').insertMany(facilities as never);
  console.log(`  ✓ health_facilities: ${facilities.length} docs`);

  // ─── Medicines ─────────────────────────────────────────────────────────────
  await db.collection('medicines').insertMany(MEDICINES as never);
  console.log(`  ✓ medicines: ${MEDICINES.length} docs`);

  // ─── Stock records (facility × medicine × period) ─────────────────────────
  // We select a subset of medicine×facility combos for realism (not all cross)
  const stockRecords: unknown[] = [];
  let srIdx = 1;

  // Track state: opening for each facility+medicine = closing of previous period
  const state: Record<string, number> = {};

  for (const period of PERIODS) {
    const [y, mo] = period.split('-').map(Number);
    const monthFactor = malariaFactor(mo);

    for (const fac of facilities as Array<{ _id: string; district: string; level: string }>) {
      // Each facility tracks 3–6 medicines
      const facSeed = fac._id.charCodeAt(2) + fac._id.charCodeAt(3);
      const medCount = 3 + (facSeed % 4); // 3 to 6
      const medList = MEDICINES.filter((_, i) => {
        const assigned = (facSeed * (i + 7)) % 12;
        return assigned < medCount;
      }).slice(0, medCount);

      for (const med of medList) {
        const key = `${fac._id}:${med._id}`;
        const reorder = med.reorder_level;

        // Base demand varies by medicine category and season
        const baseDemand = Math.round(reorder * (0.6 + rng() * 1.2) * monthFactor);
        const opening = state[key] ?? Math.round(reorder * (0.8 + rng() * 1.2));

        // Receive stock ~60% of months
        const received = rng() > 0.4 ? Math.round(baseDemand * (0.8 + rng() * 0.8)) : 0;
        const available = opening + received;

        // Issue up to available
        const issued = Math.min(available, Math.round(baseDemand * (0.7 + rng() * 0.6)));
        const closing = Math.max(0, available - issued);

        // Stockout days if closing hit 0 during period
        const stockout_days = closing === 0 && issued > 0 ? ri(3, 25) : 0;

        state[key] = closing;

        // Batch — single batch when closing > 0
        const batches = closing > 0 ? [{
          batch_no: `${med._id.slice(-2)}-${y}${String(mo).padStart(2, '0')}${String(srIdx % 99).padStart(2, '0')}`,
          expiry: new Date(y + 1 + Math.floor(rng() * 2), Math.floor(rng() * 12), 1),
          qty: closing,
        }] : [];

        stockRecords.push({
          _id: `SR${String(srIdx).padStart(4, '0')}`,
          facility_id: fac._id,
          medicine_id: med._id,
          period,
          opening,
          received,
          issued,
          closing,
          stockout_days,
          batches,
        });
        srIdx++;
      }
    }
  }

  // Insert in batches of 500
  for (let i = 0; i < stockRecords.length; i += 500) {
    await db.collection('stock_records').insertMany(stockRecords.slice(i, i + 500) as never[]);
  }
  console.log(`  ✓ stock_records: ${stockRecords.length} docs`);

  // ─── Stock requests (one per facility per quarter) ─────────────────────────
  const requests: unknown[] = [];
  let sqIdx = 1;
  const STATUSES = ['pending', 'approved', 'delivered', 'rejected', 'cancelled'] as const;
  for (const fac of facilities as Array<{ _id: string }>) {
    for (let q = 0; q < 4; q++) {
      const med = MEDICINES[ri(0, 11)];
      const status = STATUSES[ri(0, 4)];
      const baseDate = new Date(2025, 9 + q * 3, ri(1, 28));
      requests.push({
        _id: `SQ${String(sqIdx).padStart(4, '0')}`,
        facility_id: fac._id,
        requested_on: baseDate,
        status,
        supplier: rng() > 0.5 ? 'National Medical Stores' : 'Joint Medical Stores',
        items: [{ medicine_id: med._id, qty: ri(100, 1000), reason: 'routine resupply' }],
        fulfilled_on: status === 'delivered' ? new Date(baseDate.getTime() + ri(3, 14) * 86400000) : null,
      });
      sqIdx++;
    }
  }
  await db.collection('stock_requests').insertMany(requests as never[]);
  console.log(`  ✓ stock_requests: ${requests.length} docs`);

  // ─── Alerts (generated from last period's stock records) ──────────────────
  const alerts: unknown[] = [];
  let alIdx = 1;
  const lastPeriod = PERIODS[PERIODS.length - 1];
  const asOf = new Date('2026-10-13');
  const cutoff90 = new Date(asOf.getTime() + 90 * 86400000);

  // Get last-period records for alert generation
  const lastPeriodRecords = stockRecords.filter(
    (r) => (r as { period: string }).period === lastPeriod,
  ) as Array<{ _id: string; facility_id: string; medicine_id: string; closing: number; batches: Array<{ batch_no: string; expiry: Date; qty: number }> }>;

  const seen = new Set<string>();

  for (const rec of lastPeriodRecords) {
    const med = MEDICINES.find((m) => m._id === rec.medicine_id)!;
    const dedup = (type: string) => `${rec.facility_id}:${rec.medicine_id}:${type}`;

    if (rec.closing === 0 && !seen.has(dedup('stockout'))) {
      seen.add(dedup('stockout'));
      alerts.push({
        _id: `AL${String(alIdx++).padStart(4, '0')}`,
        facility_id: rec.facility_id,
        medicine_id: rec.medicine_id,
        type: 'stockout',
        severity: 'critical',
        raised_on: new Date('2026-09-30'),
        resolved: false,
        resolved_on: null,
        batch_no: null,
      });
    } else if (rec.closing > 0 && rec.closing < med.reorder_level && !seen.has(dedup('low_stock'))) {
      seen.add(dedup('low_stock'));
      const sev = rec.closing < med.reorder_level * 0.5 ? 'high' : 'medium';
      alerts.push({
        _id: `AL${String(alIdx++).padStart(4, '0')}`,
        facility_id: rec.facility_id,
        medicine_id: rec.medicine_id,
        type: 'low_stock',
        severity: sev,
        raised_on: new Date('2026-09-30'),
        resolved: false,
        resolved_on: null,
        batch_no: null,
      });
    }

    for (const batch of rec.batches) {
      if (batch.expiry <= cutoff90 && !seen.has(dedup(`near_expiry:${batch.batch_no}`))) {
        seen.add(dedup(`near_expiry:${batch.batch_no}`));
        alerts.push({
          _id: `AL${String(alIdx++).padStart(4, '0')}`,
          facility_id: rec.facility_id,
          medicine_id: rec.medicine_id,
          type: 'near_expiry',
          severity: 'low',
          raised_on: asOf,
          resolved: false,
          resolved_on: null,
          batch_no: batch.batch_no,
        });
      }
    }
  }

  // Insert alerts in batches
  for (let i = 0; i < alerts.length; i += 500) {
    await db.collection('alerts').insertMany(alerts.slice(i, i + 500) as never[]);
  }
  console.log(`  ✓ alerts: ${alerts.length} docs`);

  // ─── Users ─────────────────────────────────────────────────────────────────
  await seedUsers(db);

  await client.close();
  console.log(`\n✅  Demo seed complete. ${facilities.length} facilities, ${MEDICINES.length} medicines, ${stockRecords.length} stock records, ${requests.length} requests, ${alerts.length} alerts.\n`);
}

seed().catch((err) => {
  console.error('Demo seed failed:', err);
  process.exit(1);
});
