/**
 * Shared user seeding helper — used by both seed.ts and seed-demo.ts.
 * Passwords come from env vars; defaults are documented in .env.example only.
 */
import { Db } from 'mongodb';
import { hashPassword } from '../src/services/auth.service.js';

export async function seedUsers(db: Db): Promise<void> {
  // Drop and recreate users for idempotency
  try { await db.collection('users').drop(); } catch { /* ignore */ }

  const pw = {
    facility: process.env.DEMO_PASSWORD_FACILITY ?? 'Demo1234!',
    district: process.env.DEMO_PASSWORD_DISTRICT ?? 'Demo1234!',
    national: process.env.DEMO_PASSWORD_NATIONAL ?? 'Demo1234!',
    admin:    process.env.DEMO_PASSWORD_ADMIN    ?? 'Demo1234!',
  };

  const users = [
    {
      _id: 'US001',
      name: 'Solomon',
      email: 'solomon@medwatch.demo',
      password_hash: await hashPassword(pw.facility),
      role: 'facility',
      facility_id: 'HF001',
      district: 'Nakaseke',
      active: true,
      failed_attempts: 0,
      locked_until: null,
      last_login: null,
      created_at: new Date('2026-01-01'),
      must_change_password: false,
    },
    {
      _id: 'US002',
      name: 'Erick',
      email: 'erick@medwatch.demo',
      password_hash: await hashPassword(pw.district),
      role: 'district',
      district: 'Nakaseke',
      active: true,
      failed_attempts: 0,
      locked_until: null,
      last_login: null,
      created_at: new Date('2026-01-01'),
      must_change_password: false,
    },
    {
      _id: 'US003',
      name: 'Moses',
      email: 'moses@medwatch.demo',
      password_hash: await hashPassword(pw.national),
      role: 'national',
      active: true,
      failed_attempts: 0,
      locked_until: null,
      last_login: null,
      created_at: new Date('2026-01-01'),
      must_change_password: false,
    },
    {
      _id: 'US004',
      name: 'Brian',
      email: 'brian@medwatch.demo',
      password_hash: await hashPassword(pw.admin),
      role: 'admin',
      active: true,
      failed_attempts: 0,
      locked_until: null,
      last_login: null,
      created_at: new Date('2026-01-01'),
      must_change_password: false,
    },
  ];

  await db.collection('users').insertMany(users as never[]);
  console.log(`  ✓ users: ${users.length} docs seeded (US001–US004)`);
}
