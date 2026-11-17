import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateStockRecordSchema, PaginationSchema } from '@medwatch/shared';
import { stockRecords, alerts, medicines, getDb } from '../db/client.js';
import { validateBalances } from '../services/stockRecord.service.js';
import { generateAlertsForStockRecord } from '../services/alert.service.js';

export async function stockRecordsRoutes(app: FastifyInstance) {
  const FilterSchema = PaginationSchema.extend({
    facilityId: z.string().optional(),
    medicineId: z.string().optional(),
    period: z.string().optional(),
  });

  app.get('/', {
    schema: { tags: ['stock-records'], querystring: FilterSchema },
  }, async (req) => {
    const { page, limit, facilityId, medicineId, period } = req.query as z.infer<typeof FilterSchema>;
    const filter: Record<string, unknown> = {};
    if (facilityId) filter.facility_id = facilityId;
    if (medicineId) filter.medicine_id = medicineId;
    if (period) filter.period = period;
    const col = stockRecords();
    const [data, total] = await Promise.all([
      col.find(filter).skip((page - 1) * limit).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  });

  app.get('/:id', { schema: { tags: ['stock-records'] } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = await stockRecords().findOne({ _id: id });
    if (!doc) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Stock record ${id} not found` });
    return doc;
  });

  app.post('/', {
    schema: { tags: ['stock-records'], body: CreateStockRecordSchema },
  }, async (req, reply) => {
    const body = req.body as z.infer<typeof CreateStockRecordSchema>;

    const err = validateBalances(body);
    if (err) {
      return reply.status(422).send({ statusCode: 422, error: 'Unprocessable Entity', message: err.message });
    }

    const col = stockRecords();
    const count = await col.countDocuments();
    const _id = `SR${String(count + 1).padStart(3, '0')}`;
    const record = { _id, ...body };
    await col.insertOne(record as never);

    await generateAlertsForStockRecord(alerts(), medicines() as never, record as never, new Date());

    return reply.status(201).send(record);
  });

  app.put('/:id', {
    schema: { tags: ['stock-records'], body: CreateStockRecordSchema },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as z.infer<typeof CreateStockRecordSchema>;

    const err = validateBalances(body);
    if (err) {
      return reply.status(422).send({ statusCode: 422, error: 'Unprocessable Entity', message: err.message });
    }

    const record = { _id: id, ...body };
    const result = await stockRecords().findOneAndReplace({ _id: id }, record as never, { returnDocument: 'after' });
    if (!result) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Stock record ${id} not found` });

    await generateAlertsForStockRecord(alerts(), medicines() as never, record as never, new Date());

    return result;
  });

  app.delete('/:id', { schema: { tags: ['stock-records'] } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await stockRecords().deleteOne({ _id: id });
    if (result.deletedCount === 0) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Stock record ${id} not found` });
    return reply.status(204).send();
  });
}
