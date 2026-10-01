/**
 * Payment Methods Constants
 */

export const PAYMENT_METHODS = {
  CASH: 'cash',
  UPI: 'upi',
  BANK_TRANSFER: 'bank_transfer',
  CHEQUE: 'cheque',
};

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: 'Cash',
  [PAYMENT_METHODS.UPI]: 'UPI (GPay / PhonePe / Paytm)',
  [PAYMENT_METHODS.BANK_TRANSFER]: 'Bank Transfer (NEFT/IMPS)',
  [PAYMENT_METHODS.CHEQUE]: 'Cheque',
};
