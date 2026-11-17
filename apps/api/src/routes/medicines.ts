import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateMedicineSchema, PaginationSchema } from '@medwatch/shared';
import { medicines } from '../db/client.js';

export async function medicinesRoutes(app: FastifyInstance) {
  app.get('/', {
    schema: { tags: ['medicines'], querystring: PaginationSchema },
  }, async (req) => {
    const { page, limit } = req.query as z.infer<typeof PaginationSchema>;
    const col = medicines();
    const [data, total] = await Promise.all([
      col.find({}).skip((page - 1) * limit).limit(limit).toArray(),
      col.countDocuments(),
    ]);
    return { data, total, page, limit };
  });

  app.get('/:id', { schema: { tags: ['medicines'] } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = await medicines().findOne({ _id: id });
    if (!doc) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Medicine ${id} not found` });
    return doc;
  });

  app.post('/', {
    schema: { tags: ['medicines'], body: CreateMedicineSchema },
  }, async (req, reply) => {
    const body = req.body as z.infer<typeof CreateMedicineSchema>;
    const col = medicines();
    const count = await col.countDocuments();
    const _id = `MED${String(count + 1).padStart(3, '0')}`;
    await col.insertOne({ _id, ...body } as never);
    return reply.status(201).send({ _id, ...body });
  });

  app.put('/:id', {
    schema: { tags: ['medicines'], body: CreateMedicineSchema },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as z.infer<typeof CreateMedicineSchema>;
    const result = await medicines().findOneAndReplace({ _id: id }, { _id: id, ...body } as never, { returnDocument: 'after' });
    if (!result) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Medicine ${id} not found` });
    return result;
  });

  app.delete('/:id', { schema: { tags: ['medicines'] } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await medicines().deleteOne({ _id: id });
    if (result.deletedCount === 0) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Medicine ${id} not found` });
    return reply.status(204).send();
  });
}
