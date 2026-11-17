import { describe, it, expect, beforeEach } from 'vitest';
import { seedTestDb } from './seedTestDb.js';
import { getDb } from '../db/client.js';
import { attemptLogin, hashPassword } from '../services/auth.service.js';

async function insertTestUser(overrides: Record<string, unknown> = {}) {
  const db = getDb();
  try { await db.collection('users').drop(); } catch { /* ok */ }
  await db.createCollection('users').catch(() => { /* ok */ });
  // Cast as never to bypass ObjectId constraint — MedWatch uses string _ids throughout
  await db.collection('users').insertOne({
    _id: 'US001',
    name: 'Test User',
    email: 'test@medwatch.demo',
    password_hash: await hashPassword('CorrectPass1!'),
    role: 'national',
    active: true,
    failed_attempts: 0,
    locked_until: null,
    last_login: null,
    created_at: new Date(),
    ...overrides,
  } as never);
}

describe('Auth service', () => {
  beforeEach(async () => {
    await seedTestDb();
    await insertTestUser();
  });

  it('returns ok:true with valid credentials', async () => {
    const result = await attemptLogin(getDb(), 'test@medwatch.demo', 'CorrectPass1!', '127.0.0.1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.email).toBe('test@medwatch.demo');
      expect((result.user as Record<string, unknown>).password_hash).toBeUndefined();
    }
  });

  it('returns invalid_credentials with wrong password', async () => {
    const result = await attemptLogin(getDb(), 'test@medwatch.demo', 'WrongPass!', '127.0.0.1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_credentials');
  });

  it('returns invalid_credentials for unknown email', async () => {
    const result = await attemptLogin(getDb(), 'nobody@medwatch.demo', 'AnyPass1!', '127.0.0.1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_credentials');
  });

  it('locks account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await attemptLogin(getDb(), 'test@medwatch.demo', 'wrong', '127.0.0.1');
    }
    const result = await attemptLogin(getDb(), 'test@medwatch.demo', 'CorrectPass1!', '127.0.0.1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('locked');
  });

  it('rejects inactive users', async () => {
    await insertTestUser({ active: false });
    const result = await attemptLogin(getDb(), 'test@medwatch.demo', 'CorrectPass1!', '127.0.0.1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('inactive');
  });
});
