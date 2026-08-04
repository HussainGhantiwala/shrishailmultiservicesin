/**
 * Transaction & Account Status Constants
 */

export const PAYMENT_STATUS = {
  PAID: 'paid',
  PENDING: 'pending',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
};

export const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.PAID]: 'Paid',
  [PAYMENT_STATUS.PENDING]: 'Pending',
  [PAYMENT_STATUS.PARTIAL]: 'Partial',
  [PAYMENT_STATUS.OVERDUE]: 'Overdue',
};

export const CUSTOMER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLOCKED: 'blocked',
};
