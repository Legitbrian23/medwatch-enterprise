/**
 * Fastify preHandler middleware for authentication and permission checks.
 * Uses the JWT from the httpOnly mw_access cookie.
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Permission } from '@medwatch/shared';
import { hasPermission } from '@medwatch/shared';
import { users } from '../db/client.js';
import type { UserRole } from '@medwatch/shared';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  facility_id?: string;
  district?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    jwtUser?: JwtPayload;
  }
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = req.cookies?.mw_access;
  if (!token) {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Authentication required.' });
  }
  try {
    const payload = req.server.jwt.verify<JwtPayload>(token);
    // Confirm user still exists and is active
    const user = await users().findOne({ _id: payload.sub, active: true });
    if (!user) {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Session invalid.' });
    }
    req.jwtUser = payload;
  } catch {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Session expired.' });
  }
}

export function requirePermission(permission: Permission) {
  return async function (req: FastifyRequest, reply: FastifyReply): Promise<void> {
    await authenticate(req, reply);
    if (reply.sent) return; // authenticate already replied
    if (!req.jwtUser || !hasPermission(req.jwtUser.role, permission)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Your role does not have the '${permission}' permission.`,
      });
    }
  };
}

/** Build a MongoDB filter that scopes a query to the user's allowed data. */
export function buildFacilityFilter(req: FastifyRequest): Record<string, unknown> {
  const u = req.jwtUser;
  if (!u) return {};
  if (u.role === 'facility' && u.facility_id) {
    return { facility_id: u.facility_id };
  }
  if (u.role === 'district' && u.district) {
    // Caller must join with health_facilities and filter by district
    return { _district: u.district }; // sentinel — handled in each repo
  }
  return {}; // national / admin: no restriction
}
