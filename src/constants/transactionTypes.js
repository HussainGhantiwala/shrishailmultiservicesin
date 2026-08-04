/**
 * Transaction Types Constants
 */

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  CREDIT: 'credit',
  DEBIT: 'debit',
};

export const TRANSACTION_TYPE_LABELS = {
  [TRANSACTION_TYPES.INCOME]: 'Income (+)',
  [TRANSACTION_TYPES.EXPENSE]: 'Expense (-)',
  [TRANSACTION_TYPES.CREDIT]: 'Credit (Due)',
  [TRANSACTION_TYPES.DEBIT]: 'Debit (Paid)',
};
