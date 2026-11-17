import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  HealthFacilitySchema,
  CreateHealthFacilitySchema,
  PaginationSchema,
  NearestFacilityQuerySchema,
} from '@medwatch/shared';
import { facilities, stockRecords, getDb } from '../db/client.js';

export async function facilitiesRoutes(app: FastifyInstance) {
  // GET /facilities
  app.get('/', {
    schema: { tags: ['facilities'], querystring: PaginationSchema.extend({ district: z.string().optional() }) },
  }, async (req) => {
    const { page, limit, district } = req.query as z.infer<typeof PaginationSchema> & { district?: string };
    const filter = district ? { district } : {};
    const col = facilities();
    const [data, total] = await Promise.all([
      col.find(filter).skip((page - 1) * limit).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  });

  // GET /facilities/nearest  (must be before /:id to avoid shadowing)
  app.get('/nearest', {
    schema: { tags: ['facilities'], querystring: NearestFacilityQuerySchema },
  }, async (req) => {
    const { medicineId, lng, lat, minQty } = req.query as z.infer<typeof NearestFacilityQuerySchema>;
    const db = getDb();
    const results = await db.collection('stock_records').aggregate([
      {
        $lookup: {
          from: 'health_facilities',
          localField: 'facility_id',
          foreignField: '_id',
          as: 'facility',
        },
      },
      { $unwind: '$facility' },
      { $match: { medicine_id: medicineId, closing: { $gte: minQty } } },
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance_m',
          spherical: true,
          key: 'facility.location',
        },
      },
      { $sort: { distance_m: 1 } },
      {
        $project: {
          _id: '$facility._id',
          name: '$facility.name',
          district: '$facility.district',
          level: '$facility.level',
          location: '$facility.location',
          closing: 1,
          distance_m: 1,
        },
      },
    ]).toArray();
    return results;
  });

  // GET /facilities/:id
  app.get('/:id', { schema: { tags: ['facilities'] } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = await facilities().findOne({ _id: id });
    if (!doc) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Facility ${id} not found` });
    return doc;
  });

  // POST /facilities
  app.post('/', {
    schema: { tags: ['facilities'], body: CreateHealthFacilitySchema },
  }, async (req, reply) => {
    const body = req.body as z.infer<typeof CreateHealthFacilitySchema>;
    const col = facilities();
    const count = await col.countDocuments();
    const _id = `HF${String(count + 1).padStart(3, '0')}`;
    await col.insertOne({ _id, ...body } as never);
    return reply.status(201).send({ _id, ...body });
  });

  // PUT /facilities/:id
  app.put('/:id', {
    schema: { tags: ['facilities'], body: CreateHealthFacilitySchema },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as z.infer<typeof CreateHealthFacilitySchema>;
    const result = await facilities().findOneAndReplace({ _id: id }, { _id: id, ...body } as never, { returnDocument: 'after' });
    if (!result) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Facility ${id} not found` });
    return result;
  });

  // DELETE /facilities/:id
  app.delete('/:id', { schema: { tags: ['facilities'] } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await facilities().deleteOne({ _id: id });
    if (result.deletedCount === 0) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Facility ${id} not found` });
    return reply.status(204).send();
  });
}
