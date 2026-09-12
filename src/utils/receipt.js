import { formatRupees } from './currency';
import { formatDate, formatTime } from './date';

/**
 * Normalizes phone numbers for WhatsApp deep links.
 * WhatsApp wa.me links require country code without +, dashes, or spaces.
 * Example:
 *  "9823011223" -> "919823011223"
 *  "+91 98230 11223" -> "919823011223"
 *  "+1 (555) 123-4567" -> "15551234567"
 */
export const normalizePhoneNumberForWhatsApp = (rawPhone) => {
  if (!rawPhone) return '';
  const cleaned = String(rawPhone).trim();
  const digits = cleaned.replace(/\D/g, '');

  if (!digits) return '';

  // 10-digit Indian phone number
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // 12-digit number already prefixed with 91 (India)
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  // Already has international prefix (11-15 digits)
  if (digits.length >= 11 && digits.length <= 15) {
    return digits;
  }

  return digits;
};

/**
 * Validates if phone number is suitable for WhatsApp dispatch
 */
export const isValidWhatsAppPhone = (rawPhone) => {
  if (!rawPhone) return false;
  const digits = String(rawPhone).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
};

/**
 * Validates standard email address
 */
export const isValidEmailAddress = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
};

/**
 * Friendly label for transaction direction/type
 */
export const getTransactionTypeLabel = (entryType) => {
  switch (entryType) {
    case 'credit':
      return 'Amount Given (+)';
    case 'debit':
      return 'Payment Received (-)';
    case 'opening_balance':
      return 'Opening Balance (+)';
    case 'adjustment':
      return 'Adjustment';
    default:
      return (entryType || 'Transaction').toUpperCase();
  }
};

/**
 * Generates plain text receipt message for WhatsApp sharing
 */
export const generateWhatsAppReceiptMessage = ({ entry, customer, outstandingBalance }) => {
  const customerName = customer?.name || 'Valued Customer';
  const accountNumber = customer?.account?.account_number || customer?.account_number || 'N/A';
  const dateStr = entry?.created_at ? formatDate(entry.created_at) : formatDate(new Date().toISOString());
  const timeStr = entry?.created_at ? formatTime(entry.created_at) : formatTime(new Date().toISOString());
  const refNo = entry?.reference_no || `TXN-${(entry?.id || '').slice(0, 8).toUpperCase() || 'N/A'}`;
  const typeLabel = getTransactionTypeLabel(entry?.entry_type);
  const amountStr = formatRupees(Number(entry?.amount || 0));
  const paymentMethod = entry?.payment_method
    ? entry.payment_method === 'Other' && entry.other_payment_method
      ? `Other (${entry.other_payment_method})`
      : entry.payment_method
    : 'Cash';
  const description = entry?.description || 'General transaction';

  const balanceVal =
    outstandingBalance !== undefined && outstandingBalance !== null
      ? formatRupees(Number(outstandingBalance))
      : customer?.account?.outstanding_balance !== undefined && customer?.account?.outstanding_balance !== null
      ? formatRupees(Number(customer.account.outstanding_balance))
      : entry?.running_balance !== undefined && entry?.running_balance !== null
      ? formatRupees(Number(entry.running_balance))
      : 'N/A';

  return (
`Shrishail Multi Services
TRANSACTION RECEIPT

Dear ${customerName},

This is a record of your transaction with us.

Account No: ${accountNumber}
Transaction Date: ${dateStr}
Time: ${timeStr}
Reference No: ${refNo}

Transaction Type: ${typeLabel}
Amount: ${amountStr}
Payment Method: ${paymentMethod}
Particulars: ${description}

Current Outstanding Balance: ${balanceVal}

Thank you,
Shrishail Multi Services`
  );
};

/**
 * Generates subject and email body for email sharing
 */
export const generateEmailReceipt = ({ entry, customer, outstandingBalance }) => {
  const customerName = customer?.name || 'Valued Customer';
  const accountNumber = customer?.account?.account_number || customer?.account_number || 'N/A';
  const dateStr = entry?.created_at ? formatDate(entry.created_at) : formatDate(new Date().toISOString());
  const timeStr = entry?.created_at ? formatTime(entry.created_at) : formatTime(new Date().toISOString());
  const refNo = entry?.reference_no || `TXN-${(entry?.id || '').slice(0, 8).toUpperCase() || 'N/A'}`;
  const typeLabel = getTransactionTypeLabel(entry?.entry_type);
  const amountStr = formatRupees(Number(entry?.amount || 0));
  const paymentMethod = entry?.payment_method
    ? entry.payment_method === 'Other' && entry.other_payment_method
      ? `Other (${entry.other_payment_method})`
      : entry.payment_method
    : 'Cash';
  const description = entry?.description || 'General transaction';

  const balanceVal =
    outstandingBalance !== undefined && outstandingBalance !== null
      ? formatRupees(Number(outstandingBalance))
      : customer?.account?.outstanding_balance !== undefined && customer?.account?.outstanding_balance !== null
      ? formatRupees(Number(customer.account.outstanding_balance))
      : entry?.running_balance !== undefined && entry?.running_balance !== null
      ? formatRupees(Number(entry.running_balance))
      : 'N/A';

  const subject = `Transaction Receipt — Shrishail Multi Services — ${refNo}`;

  const body =
`Shrishail Multi Services
TRANSACTION RECEIPT

Dear ${customerName},

This is a record of your transaction with Shrishail Multi Services.

Account Details:
• Account No: ${accountNumber}
• Customer Name: ${customerName}

Transaction Summary:
• Date: ${dateStr}
• Time: ${timeStr}
• Reference No: ${refNo}
• Transaction Type: ${typeLabel}
• Amount: ${amountStr}
• Payment Method: ${paymentMethod}
• Particulars: ${description}

Current Outstanding Balance: ${balanceVal}

If you have any questions regarding this receipt, please feel free to reach out to us.

Thank you,
Shrishail Multi Services`;

  return { subject, body };
};

/**
 * Builds standard WhatsApp Web / app deep link
 */
export const buildWhatsAppUrl = (rawPhone, message) => {
  const normalizedPhone = normalizePhoneNumberForWhatsApp(rawPhone);
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};

/**
 * Builds mailto link
 */
export const buildMailtoUrl = (email, subject, body) => {
  return `mailto:${encodeURIComponent(email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

/**
 * Builds Gmail Web compose URL fallback
 */
export const buildGmailComposeUrl = (email, subject, body) => {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
