import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ExpiringBatchesQuerySchema } from '@medwatch/shared';
import { getDb } from '../db/client.js';
import {
  getBelowReorder,
  getExpiringBatches,
  getStockoutDaysByDistrict,
  getUnresolvedStockouts,
} from '../repositories/analytics.repo.js';
import { getOverview } from '../repositories/overview.repo.js';
import { requirePermission } from './middleware.js';

const OverviewQuerySchema = z.object({
  from:     z.string().regex(/^\d{4}-\d{2}$/).optional(),
  to:       z.string().regex(/^\d{4}-\d{2}$/).optional(),
  asOf:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  district: z.string().optional(),
  compare:  z.enum(['prev', 'yoy']).optional(),
});

export async function analyticsRoutes(app: FastifyInstance) {
  // GET /analytics/overview — full dashboard dataset
  app.get('/overview', {
    preHandler: [requirePermission('analytics:read')],
    schema: { tags: ['analytics'] },
  }, async (req) => {
    const q = OverviewQuerySchema.parse(req.query);
    const asOf = q.asOf ? new Date(q.asOf) : new Date();
    // Default: last 12 months ending this month
    const toDate   = q.to   ?? `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, '0')}`;
    const fromDate = q.from ?? (() => {
      const d = new Date(asOf.getFullYear(), asOf.getMonth() - 11, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();
    return getOverview(getDb(), { from: fromDate, to: toDate, asOf, compare: q.compare });
  });

  // GET /analytics/stockouts  — Q7.1
  app.get('/stockouts', { schema: { tags: ['analytics'] } }, async () => {
    return getUnresolvedStockouts(getDb());
  });

  // GET /analytics/stockout-days-by-district  — Q7.2
  app.get('/stockout-days-by-district', { schema: { tags: ['analytics'] } }, async () => {
    return getStockoutDaysByDistrict(getDb());
  });

  // GET /analytics/expiring-batches?days=90&asOf=YYYY-MM-DD  — Q7.3
  app.get('/expiring-batches', {
    schema: { tags: ['analytics'], querystring: ExpiringBatchesQuerySchema },
  }, async (req) => {
    const { days, asOf } = req.query as z.infer<typeof ExpiringBatchesQuerySchema>;
    const asOfDate = asOf ? new Date(asOf) : new Date();
    return getExpiringBatches(getDb(), days, asOfDate);
  });

  // GET /analytics/below-reorder  — Q7.5
  app.get('/below-reorder', { schema: { tags: ['analytics'] } }, async () => {
    return getBelowReorder(getDb());
  });
}
