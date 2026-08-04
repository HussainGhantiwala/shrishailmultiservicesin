/**
 * Application Routes Map
 */

export const ROUTES = {
  PUBLIC: {
    HOME: '/',
    LOGIN: '/login',
  },
  PORTAL: {
    DASHBOARD: '/portal/dashboard',
    CUSTOMERS: '/portal/customers',
    LEDGER: '/portal/ledger',
    TRANSACTIONS: '/portal/transactions',
    REPORTS: '/portal/reports',
    ANALYTICS: '/portal/analytics',
    SMS: '/portal/sms',
    NOTIFICATIONS: '/portal/notifications',
    PROFILE: '/portal/profile',
    SETTINGS: '/portal/settings',
    AUDIT_LOGS: '/portal/audit-logs',
    UNAUTHORIZED: '/portal/unauthorized',
  },
  ERROR: {
    NOT_FOUND: '/404',
    SERVER_ERROR: '/500',
    FORBIDDEN: '/403',
    OFFLINE: '/offline',
  },
};
