/**
 * Permission matrix for MedWatch roles.
 * Pure functions — no side effects, fully testable.
 */

import type { UserRole } from './types.js';

// ─── Permission definitions ───────────────────────────────────────────────────

export type Permission =
  // Stock records
  | 'stock_records:read'
  | 'stock_records:create'
  | 'stock_records:update'
  | 'stock_records:delete'
  // Stock requests
  | 'stock_requests:read'
  | 'stock_requests:create'
  | 'stock_requests:update_status'   // approve / reject / deliver
  | 'stock_requests:delete'
  // Alerts
  | 'alerts:read'
  | 'alerts:resolve'
  // Facilities
  | 'facilities:read'
  | 'facilities:write'
  // Medicines
  | 'medicines:read'
  | 'medicines:write'
  // Analytics
  | 'analytics:read'
  // Users
  | 'users:read'
  | 'users:write'
  // Audit log
  | 'audit:read';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  facility: [
    'stock_records:read',
    'stock_records:create',
    'stock_records:update',
    'stock_requests:read',
    'stock_requests:create',
    'alerts:read',
    'alerts:resolve',
    'facilities:read',
    'medicines:read',
    'analytics:read',
  ],
  district: [
    'stock_records:read',
    'stock_requests:read',
    'stock_requests:update_status',
    'alerts:read',
    'alerts:resolve',
    'facilities:read',
    'medicines:read',
    'analytics:read',
  ],
  national: [
    'stock_records:read',
    'stock_records:create',
    'stock_records:update',
    'stock_requests:read',
    'stock_requests:create',
    'stock_requests:update_status',
    'alerts:read',
    'alerts:resolve',
    'facilities:read',
    'medicines:read',
    'analytics:read',
  ],
  admin: [
    'stock_records:read',
    'stock_records:create',
    'stock_records:update',
    'stock_records:delete',
    'stock_requests:read',
    'stock_requests:create',
    'stock_requests:update_status',
    'stock_requests:delete',
    'alerts:read',
    'alerts:resolve',
    'facilities:read',
    'facilities:write',
    'medicines:read',
    'medicines:write',
    'analytics:read',
    'users:read',
    'users:write',
    'audit:read',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/** Returns the scope filter a user needs applied to every query */
export interface ScopeFilter {
  type: 'facility' | 'district' | 'all';
  facility_id?: string;
  district?: string;
}

export function getScopeFilter(
  role: UserRole,
  facility_id?: string,
  district?: string,
): ScopeFilter {
  if (role === 'facility' && facility_id) {
    return { type: 'facility', facility_id };
  }
  if (role === 'district' && district) {
    return { type: 'district', district };
  }
  return { type: 'all' };
}
