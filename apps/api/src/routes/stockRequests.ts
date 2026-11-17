import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreateStockRequestSchema,
  EscalatePendingQuerySchema,
  PaginationSchema,
  REQUEST_STATUSES,
} from '@medwatch/shared';
import { stockRequests, facilities } from '../db/client.js';

export async function stockRequestsRoutes(app: FastifyInstance) {
  const FilterSchema = PaginationSchema.extend({
    status: z.enum(REQUEST_STATUSES).optional(),
    facilityId: z.string().optional(),
    district: z.string().optional(),
  });

  app.get('/', {
    schema: { tags: ['stock-requests'], querystring: FilterSchema },
  }, async (req) => {
    const { page, limit, status, facilityId, district } = req.query as z.infer<typeof FilterSchema>;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (facilityId) {
      filter.facility_id = facilityId;
    } else if (district) {
      const facs = await facilities().find({ district }).toArray();
      filter.facility_id = { $in: facs.map((f: { _id: string }) => f._id) };
    }
    const col = stockRequests();
    const [data, total] = await Promise.all([
      col.find(filter).sort({ requested_on: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  });

  app.get('/:id', { schema: { tags: ['stock-requests'] } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = await stockRequests().findOne({ _id: id });
    if (!doc) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Stock request ${id} not found` });
    return doc;
  });

  app.post('/', {
    schema: { tags: ['stock-requests'], body: CreateStockRequestSchema },
  }, async (req, reply) => {
    const body = req.body as z.infer<typeof CreateStockRequestSchema>;
    const col = stockRequests();
    const count = await col.countDocuments();
    const _id = `SQ${String(count + 1).padStart(3, '0')}`;
    await col.insertOne({ _id, ...body } as never);
    return reply.status(201).send({ _id, ...body });
  });

  app.put('/:id', {
    schema: { tags: ['stock-requests'], body: CreateStockRequestSchema },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as z.infer<typeof CreateStockRequestSchema>;
    const result = await stockRequests().findOneAndReplace(
      { _id: id },
      { _id: id, ...body } as never,
      { returnDocument: 'after' },
    );
    if (!result) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Stock request ${id} not found` });
    return result;
  });

  app.delete('/:id', { schema: { tags: ['stock-requests'] } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await stockRequests().deleteOne({ _id: id });
    if (result.deletedCount === 0) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Stock request ${id} not found` });
    return reply.status(204).send();
  });

  // POST /stock-requests/escalate-pending?before=YYYY-MM-DD  (Q7.6 — API version)
  // Sets status = "approved" for pending requests older than `before`.
  // The mongosh version (docs/mongosh/q7.6.js) uses escalated:true as per PDF original.
  app.post('/escalate-pending', {
    schema: { tags: ['stock-requests'], querystring: EscalatePendingQuerySchema },
  }, async (req) => {
    const { before } = req.query as z.infer<typeof EscalatePendingQuerySchema>;
    const result = await stockRequests().updateMany(
      { status: 'pending', requested_on: { $lt: new Date(before) } },
      { $set: { status: 'approved' } },
    );
    return { modifiedCount: result.modifiedCount };
  });
}
