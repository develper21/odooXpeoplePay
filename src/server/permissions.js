// lib/permissions.js
// Pure permission-matching logic for the HRMS authorization model.
//
// Permission keys are 'module:action' strings stored in roles.permissions
// (JSONB), e.g. 'employees:read', 'payroll:*'. Two wildcard levels exist:
// - '*'        grants every permission (the Administrator role).
// - 'module:*' grants every action within that module.
//
// This module is intentionally framework-free and holds no secrets, so it is
// safe to reuse in client bundles later (e.g. hiding UI actions) — do not add
// server-only imports or env access here.

/**
 * Checks whether `user`'s granted permissions include `permission`.
 *
 * Match rules (in order):
 * 1. exact key       — 'employees:read' grants 'employees:read'
 * 2. global wildcard — '*' grants everything
 * 3. module wildcard — 'employees:*' grants 'employees:read' (and any other
 *                       'employees:<action>')
 *
 * Matching is case-sensitive: keys are defined lowercase in the seed data.
 * The required key should be a concrete 'module:action' — wildcards live on
 * the granted side, not the required side.
 *
 * @param {{permissions?: string[]} | null | undefined} user Object carrying
 *   the user's granted permissions (e.g. the fresh DB row from requireUser(),
 *   or a decoded JWT payload).
 * @param {string} permission Required key in 'module:action' form.
 * @returns {boolean} True when access should be granted.
 */
export function hasPermission(user, permission) {
  if (!user || typeof permission !== 'string' || permission.length === 0) {
    return false;
  }

  const granted = user.permissions;
  if (!Array.isArray(granted)) {
    return false;
  }

  // 1. Exact key match.
  if (granted.includes(permission)) {
    return true;
  }

  // 2. Global wildcard.
  if (granted.includes('*')) {
    return true;
  }

  // 3. Module wildcard: 'employees:*' covers 'employees:read' & co.
  const separator = permission.indexOf(':');
  if (separator > 0) {
    const moduleName = permission.slice(0, separator);
    if (granted.includes(`${moduleName}:*`)) {
      return true;
    }
  }

  return false;
}