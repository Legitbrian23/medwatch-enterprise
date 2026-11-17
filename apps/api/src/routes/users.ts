import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDb, users } from '../db/client.js';
import { hashPassword, writeAudit } from '../services/auth.service.js';
import { requirePermission } from './middleware.js';
import type { User } from '@medwatch/shared';

const CreateUserSchema = z.object({
  name:        z.string().min(1),
  email:       z.string().email(),
  password:    z.string().min(8),
  role:        z.enum(['facility', 'district', 'national', 'admin']),
  facility_id: z.string().optional(),
  district:    z.string().optional(),
});

const UpdateUserSchema = z.object({
  name:        z.string().min(1).optional(),
  role:        z.enum(['facility', 'district', 'national', 'admin']).optional(),
  facility_id: z.string().optional(),
  district:    z.string().optional(),
  active:      z.boolean().optional(),
  password:    z.string().min(8).optional(),
});

export async function usersRoutes(app: FastifyInstance) {
  // GET /users
  app.get('/', {
    preHandler: [requirePermission('users:read')],
    schema: { tags: ['users'] },
  }, async (req: FastifyRequest, _reply: FastifyReply) => {
    const qs = req.query as { search?: string; page?: string; limit?: string };
    const page  = Math.max(1, parseInt(qs.page  ?? '1',  10));
    const limit = Math.min(100, parseInt(qs.limit ?? '20', 10));
    const filter = qs.search
      ? { $or: [{ name: { $regex: qs.search, $options: 'i' } }, { email: { $regex: qs.search, $options: 'i' } }] }
      : {};
    const [data, total] = await Promise.all([
      users().find(filter, { projection: { password_hash: 0 } }).skip((page - 1) * limit).limit(limit).toArray(),
      users().countDocuments(filter),
    ]);
    return { data, total, page, limit };
  });

  // POST /users
  app.post('/', {
    preHandler: [requirePermission('users:write')],
    schema: { tags: ['users'] },
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = CreateUserSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });

    const existing = await users().findOne({ email: body.data.email.toLowerCase() });
    if (existing) return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'Email already in use.' });

    const lastUser = await users().find().sort({ _id: -1 }).limit(1).toArray();
    const nextNum = lastUser.length > 0
      ? parseInt(lastUser[0]._id.replace('US', ''), 10) + 1
      : 1;
    const _id = `US${String(nextNum).padStart(3, '0')}`;

    const newUser: User = {
      _id,
      name:            body.data.name,
      email:           body.data.email.toLowerCase(),
      password_hash:   await hashPassword(body.data.password),
      role:            body.data.role,
      facility_id:     body.data.facility_id,
      district:        body.data.district,
      active:          true,
      failed_attempts: 0,
      locked_until:    null,
      last_login:      null,
      created_at:      new Date(),
      must_change_password: true,
    };
    await users().insertOne(newUser);

    const actor = (req as FastifyRequest & { jwtUser?: { sub: string } }).jwtUser;
    await writeAudit(getDb(), {
      timestamp: new Date(),
      user_id: actor?.sub ?? 'unknown',
      user_name: '',
      action: 'user_created',
      resource: 'users',
      resource_id: _id,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _ph, ...pub } = newUser;
    return reply.status(201).send(pub);
  });

  // PATCH /users/:id
  app.patch('/:id', {
    preHandler: [requirePermission('users:write')],
    schema: { tags: ['users'] },
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = UpdateUserSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });

    const actor = (req as FastifyRequest & { jwtUser?: { sub: string } }).jwtUser;
    if (actor?.sub === id && body.data.active === false) {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'You cannot deactivate your own account.' });
    }

    const updates: Partial<User> = {};
    if (body.data.name)        updates.name        = body.data.name;
    if (body.data.role)        updates.role        = body.data.role;
    if (body.data.facility_id) updates.facility_id = body.data.facility_id;
    if (body.data.district)    updates.district    = body.data.district;
    if (body.data.active !== undefined) updates.active = body.data.active;
    if (body.data.password) {
      updates.password_hash = await hashPassword(body.data.password);
      updates.must_change_password = true;
    }

    const result = await users().findOneAndUpdate(
      { _id: id },
      { $set: updates },
      { returnDocument: 'after', projection: { password_hash: 0 } },
    );
    if (!result) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found.' });

    await writeAudit(getDb(), {
      timestamp: new Date(),
      user_id: actor?.sub ?? 'unknown',
      user_name: String((actor as unknown as Record<string, unknown>)?.['name'] ?? ''),
      action: 'user_updated',
      resource: 'users',
      resource_id: id,
    });

    return reply.send(result);
  });
}
