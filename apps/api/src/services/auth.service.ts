/**
 * Authentication service — bcryptjs password verification, account locking,
 * JWT token creation, and audit logging.
 *
 * Uses bcryptjs (pure JavaScript) instead of argon2 to avoid native build
 * requirements on Windows.
 */
import bcrypt from 'bcryptjs';
import type { Collection, Db } from 'mongodb';
import type { User, AuditEvent, PublicUser } from '@medwatch/shared';

const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED = 5;
const BCRYPT_ROUNDS = 10;

// ─── Password helpers ─────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export async function writeAudit(db: Db, event: Omit<AuditEvent, '_id'>): Promise<void> {
  try {
    await db.collection<AuditEvent>('audit_log').insertOne({ ...event } as AuditEvent);
  } catch {
    // Audit failures must never break the auth flow
  }
}

// ─── User lookup ──────────────────────────────────────────────────────────────

export async function findUserByEmail(
  users: Collection<User>,
  email: string,
): Promise<User | null> {
  return users.findOne({ email: email.toLowerCase().trim() });
}

// ─── Login ────────────────────────────────────────────────────────────────────

export type LoginResult =
  | { ok: true; user: PublicUser }
  | { ok: false; reason: 'invalid_credentials' | 'locked' | 'inactive' };

export async function attemptLogin(
  db: Db,
  email: string,
  password: string,
  ip: string,
): Promise<LoginResult> {
  const usersCol = db.collection<User>('users');
  const user = await findUserByEmail(usersCol, email);

  const fail = async (
    u: User | null,
    reason: 'invalid_credentials' | 'locked' | 'inactive',
  ): Promise<LoginResult> => {
    if (u) {
      const newFailed = (u.failed_attempts ?? 0) + 1;
      const updates: Partial<User> =
        newFailed >= MAX_FAILED
          ? { failed_attempts: newFailed, locked_until: new Date(Date.now() + LOCK_DURATION_MS) }
          : { failed_attempts: newFailed };
      await usersCol.updateOne({ _id: u._id }, { $set: updates });
      await writeAudit(db, {
        timestamp: new Date(),
        user_id: u._id,
        user_name: u.name,
        action: newFailed >= MAX_FAILED ? 'account_locked' : 'login_failed',
        ip,
        detail: `attempt ${newFailed}/${MAX_FAILED}`,
      });
    }
    return { ok: false, reason };
  };

  if (!user) return fail(null, 'invalid_credentials');
  if (!user.active) return fail(user, 'inactive');

  if (user.locked_until && user.locked_until > new Date()) {
    return { ok: false, reason: 'locked' };
  }

  const valid = await verifyPassword(user.password_hash, password);
  if (!valid) return fail(user, 'invalid_credentials');

  await usersCol.updateOne(
    { _id: user._id },
    { $set: { failed_attempts: 0, locked_until: null, last_login: new Date() } },
  );

  await writeAudit(db, {
    timestamp: new Date(),
    user_id: user._id,
    user_name: user.name,
    action: 'login',
    ip,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _ph, ...publicUser } = user;
  return { ok: true, user: publicUser as PublicUser };
}
