/**
 * Role Permissions Mapping Matrix
 */
import { ROLES } from './roles';

export const PERMISSIONS = {
  MANAGE_TRANSACTIONS: [ROLES.ADMIN, ROLES.STAFF],
  DELETE_TRANSACTIONS: [ROLES.ADMIN],
  MANAGE_CUSTOMERS: [ROLES.ADMIN],
  VIEW_ANALYTICS: [ROLES.ADMIN],
  EXPORT_REPORTS: [ROLES.ADMIN],
  MANAGE_SETTINGS: [ROLES.ADMIN],
  VIEW_AUDIT_LOGS: [ROLES.ADMIN],
  VIEW_OWN_ACCOUNT: [ROLES.ADMIN, ROLES.STAFF, ROLES.CUSTOMER],
};

export const hasPermission = (userRole, permissionKey) => {
  const allowedRoles = PERMISSIONS[permissionKey];
  if (!allowedRoles) return false;
  return allowedRoles.includes(userRole);
};
