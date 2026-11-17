import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { facilitiesRoutes }    from './routes/facilities.js';
import { medicinesRoutes }     from './routes/medicines.js';
import { stockRecordsRoutes }  from './routes/stockRecords.js';
import { stockRequestsRoutes } from './routes/stockRequests.js';
import { alertsRoutes }        from './routes/alerts.js';
import { analyticsRoutes }     from './routes/analytics.js';
import { authRoutes }          from './routes/auth.js';
import { usersRoutes }         from './routes/users.js';

export async function buildServer() {
  const app = Fastify({ logger: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: true, credentials: true });

  await app.register(cookie);

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    cookie: { cookieName: 'mw_access', signed: false },
  });

  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

  await app.register(swagger, {
    openapi: {
      info: { title: 'MedWatch API', version: '1.0.0', description: 'Medicine stock-out tracking' },
      tags: [
        { name: 'auth' },
        { name: 'facilities' },
        { name: 'medicines' },
        { name: 'stock-records' },
        { name: 'stock-requests' },
        { name: 'alerts' },
        { name: 'analytics' },
        { name: 'users' },
      ],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.setErrorHandler((error, _req, reply) => {
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({
      statusCode,
      error: error.name ?? 'Internal Server Error',
      message: error.message,
    });
  });

  await app.register(authRoutes,          { prefix: '/auth' });
  await app.register(facilitiesRoutes,    { prefix: '/facilities' });
  await app.register(medicinesRoutes,     { prefix: '/medicines' });
  await app.register(stockRecordsRoutes,  { prefix: '/stock-records' });
  await app.register(stockRequestsRoutes, { prefix: '/stock-requests' });
  await app.register(alertsRoutes,        { prefix: '/alerts' });
  await app.register(analyticsRoutes,     { prefix: '/analytics' });
  await app.register(usersRoutes,         { prefix: '/users' });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
