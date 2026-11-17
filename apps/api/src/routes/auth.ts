import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb, users } from '../db/client.js';
import { attemptLogin, writeAudit, hashPassword, findUserByEmail } from '../services/auth.service.js';
import { sendAdminWhatsApp } from '../services/whatsapp.service.js';
import { requirePermission } from './middleware.js';
import type { PublicUser } from '@medwatch/shared';

const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {

  // POST /auth/login
  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: { tags: ['auth'] },
  }, async (req, reply) => {
    const body = LoginBodySchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Invalid email or password format.' });
    }
    const ip = req.ip ?? 'unknown';
    const result = await attemptLogin(getDb(), body.data.email, body.data.password, ip);

    if (!result.ok) {
      const msg = result.reason === 'locked'
        ? 'Account locked due to too many failed attempts. Try again in 15 minutes.'
        : 'Invalid email or password.';
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: msg });
    }

    return issueTokens(app, reply, result.user);
  });

  // POST /auth/logout
  app.post('/logout', { schema: { tags: ['auth'] } }, async (req, reply) => {
    const token = req.cookies?.mw_access;
    if (token) {
      try {
        const decoded = app.jwt.decode(token) as { sub?: string } | null;
        if (decoded?.sub) {
          await writeAudit(getDb(), {
            timestamp: new Date(),
            user_id: decoded.sub,
            user_name: '',
            action: 'logout',
            ip: req.ip ?? 'unknown',
          });
        }
      } catch { /* ignore */ }
    }
    const sameSite = process.env.NODE_ENV === 'production' ? 'none' : 'lax';
    const secure = process.env.NODE_ENV === 'production';
    reply
      .setCookie('mw_access',  '', { path: '/', expires: new Date(0), httpOnly: true, sameSite, secure })
      .setCookie('mw_refresh', '', { path: '/', expires: new Date(0), httpOnly: true, sameSite, secure });
    return reply.send({ ok: true });
  });

  // POST /auth/refresh
  app.post('/refresh', { schema: { tags: ['auth'] } }, async (req, reply) => {
    const refreshToken = req.cookies?.mw_refresh;
    if (!refreshToken) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'No refresh token.' });
    }
    let payload: { sub: string; type: string };
    try {
      payload = app.jwt.verify(refreshToken) as typeof payload;
    } catch {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired refresh token.' });
    }
    if (payload.type !== 'refresh') {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid token type.' });
    }
    const user = await users().findOne({ _id: payload.sub, active: true });
    if (!user) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'User not found.' });
    }
    const accessToken = app.jwt.sign(
      { sub: user._id, role: user.role, facility_id: user.facility_id, district: user.district },
      { expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m' },
    );
    const secure = process.env.NODE_ENV === 'production';
    reply.setCookie('mw_access', accessToken, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
    return reply.send({ ok: true });
  });

  // GET /auth/me
  app.get('/me', { schema: { tags: ['auth'] } }, async (req, reply) => {
    const token = req.cookies?.mw_access;
    if (!token) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Not authenticated.' });
    }
    let payload: { sub: string };
    try {
      payload = app.jwt.verify(token) as typeof payload;
    } catch {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Session expired.' });
    }
    const user = await users().findOne({ _id: payload.sub, active: true });
    if (!user) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'User not found.' });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _ph, ...pub } = user;
    return reply.send({ user: pub });
  });

  // POST /auth/forgot-password
  // 1. Verify the email exists
  // 2. Send a WhatsApp alert to the admin
  // 3. Always return { ok: true } so the UI can show a generic success message
  app.post('/forgot-password', {
    config: { rateLimit: { max: 5, timeWindow: '5 minutes' } },
    schema: { tags: ['auth'] },
  }, async (req, reply) => {
    const body = z.object({ email: z.string().email() }).safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Valid email required.' });
    }

    const user = await findUserByEmail(users(), body.data.email);

    if (user && user.active) {
      // Send WhatsApp to admin — fire and forget, never block the response
      const msg =
        `MedWatch Password Reset Request\n` +
        `User: ${user.name}\n` +
        `Email: ${user.email}\n` +
        `Role: ${user.role}\n` +
        `Time: ${new Date().toISOString()}\n` +
        `Please reset their password in the Admin panel.`;

      sendAdminWhatsApp(msg).catch(() => { /* best-effort */ });

      await writeAudit(getDb(), {
        timestamp: new Date(),
        user_id: user._id,
        user_name: user.name,
        action: 'forgot_password_requested',
        ip: req.ip ?? 'unknown',
      });
    }

    // Always return success — do NOT reveal whether the email exists
    return reply.send({ ok: true });
  });

  // POST /auth/admin/reset-password  (admin only)
  // Admin resets a user's password directly after verifying identity
  app.post('/admin/reset-password', {
    preHandler: [requirePermission('users:write')],
    schema: { tags: ['auth'] },
  }, async (req, reply) => {
    const body = z.object({
      userId:      z.string().min(1),
      newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    }).safeParse(req.body);

    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.errors[0]?.message ?? 'Invalid input.' });
    }

    const target = await users().findOne({ _id: body.data.userId });
    if (!target) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found.' });
    }

    const newHash = await hashPassword(body.data.newPassword);
    await users().updateOne(
      { _id: body.data.userId },
      { $set: { password_hash: newHash, failed_attempts: 0, locked_until: null, must_change_password: true } },
    );

    const actor = req.jwtUser;
    await writeAudit(getDb(), {
      timestamp: new Date(),
      user_id: actor?.sub ?? 'unknown',
      user_name: '',
      action: 'admin_password_reset',
      resource: 'users',
      resource_id: body.data.userId,
      ip: req.ip ?? 'unknown',
    });

    return reply.send({ ok: true, message: `Password reset for ${target.name}.` });
  });
}

// Shared: issue JWT cookies and return the user object
async function issueTokens(
  app: FastifyInstance,
  reply: import('fastify').FastifyReply,
  user: PublicUser,
) {
  const accessToken = app.jwt.sign(
    { sub: user._id, role: user.role, facility_id: user.facility_id, district: user.district },
    { expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m' },
  );
  const refreshToken = app.jwt.sign(
    { sub: user._id, type: 'refresh' },
    { expiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d' },
  );
  const sameSite = process.env.NODE_ENV === 'production' ? 'none' : 'lax';
  const secure = process.env.NODE_ENV === 'production';
  reply
    .setCookie('mw_access',  accessToken,  { httpOnly: true, sameSite, secure, path: '/' })
    .setCookie('mw_refresh', refreshToken, { httpOnly: true, sameSite, secure, path: '/' });

  return reply.send({
    user: {
      _id:                  user._id,
      name:                 user.name,
      email:                user.email,
      role:                 user.role,
      facility_id:          user.facility_id,
      district:             user.district,
      must_change_password: user.must_change_password ?? false,
    },
  });
}
