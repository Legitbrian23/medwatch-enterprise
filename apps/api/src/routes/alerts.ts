import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ALERT_SEVERITIES, ALERT_TYPES, PaginationSchema } from '@medwatch/shared';
import { alerts, facilities } from '../db/client.js';
import { resolveAlert } from '../services/alert.service.js';

export async function alertsRoutes(app: FastifyInstance) {
  const FilterSchema = PaginationSchema.extend({
    type: z.enum(ALERT_TYPES).optional(),
    severity: z.enum(ALERT_SEVERITIES).optional(),
    facilityId: z.string().optional(),
    district: z.string().optional(),
    resolved: z
      .string()
      .optional()
      .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  });

  app.get('/', {
    schema: { tags: ['alerts'], querystring: FilterSchema },
  }, async (req) => {
    const { page, limit, type, severity, resolved, facilityId, district } = req.query as z.infer<typeof FilterSchema>;
    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (resolved !== undefined) filter.resolved = resolved;
    if (facilityId) {
      filter.facility_id = facilityId;
    } else if (district) {
      const facs = await facilities().find({ district }).toArray();
      filter.facility_id = { $in: facs.map((f: { _id: string }) => f._id) };
    }
    const col = alerts();
    const [data, total] = await Promise.all([
      col.find(filter).sort({ raised_on: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  });

  app.get('/:id', { schema: { tags: ['alerts'] } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = await alerts().findOne({ _id: id });
    if (!doc) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Alert ${id} not found` });
    return doc;
  });

  // PATCH /alerts/:id/resolve  — Q7.4
  app.patch('/:id/resolve', { schema: { tags: ['alerts'] } }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const updated = await resolveAlert(alerts(), id);
    if (!updated) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: `Alert ${id} not found` });
    return updated;
  });
}
