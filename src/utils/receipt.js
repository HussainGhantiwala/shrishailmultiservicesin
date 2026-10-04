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
    case 'savings':
    case 'savings_deposit':
    case 'CREDIT':
    case 'DEPOSIT':
      return 'Savings Deposit (+)';
    case 'savings_withdrawal':
    case 'WITHDRAWAL':
      return 'Savings Withdrawal (-)';
    case 'savings_bill_payment':
    case 'BILL_PAYMENT':
      return 'Savings Used for Bill Payment';
    case 'savings_opening':
    case 'OPENING':
      return 'Opening Savings (+)';
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
 * Generates WhatsApp message for Savings Deposit
 */
export const generateWhatsAppSavingsDepositMessage = ({ entry, customer, savingsBalance }) => {
  const customerName = customer?.name || 'Valued Customer';
  const accountNumber = customer?.account?.account_number || customer?.account_number || 'N/A';
  const dateStr = entry?.created_at ? formatDate(entry.created_at) : formatDate(new Date().toISOString());
  const timeStr = entry?.created_at ? formatTime(entry.created_at) : formatTime(new Date().toISOString());
  const refNo = entry?.reference_no || entry?.reference_number || `SAV-${(entry?.id || '').slice(0, 8).toUpperCase() || 'N/A'}`;
  const amountStr = formatRupees(Number(entry?.amount || 0));
  const savingsBalStr = formatRupees(Number(savingsBalance || 0));

  return (
`Shrishail Multi Services
SAVINGS RECEIPT

Dear ${customerName},

An amount of ${amountStr} has been credited to your savings account.

Account No: ${accountNumber}

Transaction Date: ${dateStr}
Time: ${timeStr}

Reference No: ${refNo}

Amount Credited: ${amountStr}

Total Savings Balance: ${savingsBalStr}

Thank you,
Shrishail Multi Services`
  );
};

/**
 * Generates Email for Savings Deposit
 */
export const generateEmailSavingsDeposit = ({ entry, customer, savingsBalance }) => {
  const customerName = customer?.name || 'Valued Customer';
  const accountNumber = customer?.account?.account_number || customer?.account_number || 'N/A';
  const dateStr = entry?.created_at ? formatDate(entry.created_at) : formatDate(new Date().toISOString());
  const timeStr = entry?.created_at ? formatTime(entry.created_at) : formatTime(new Date().toISOString());
  const refNo = entry?.reference_no || entry?.reference_number || `SAV-${(entry?.id || '').slice(0, 8).toUpperCase() || 'N/A'}`;
  const amountStr = formatRupees(Number(entry?.amount || 0));
  const savingsBalStr = formatRupees(Number(savingsBalance || 0));

  const subject = `Savings Receipt — Shrishail Multi Services — ${refNo}`;
  const body =
`Shrishail Multi Services
SAVINGS RECEIPT

Dear ${customerName},

An amount of ${amountStr} has been credited to your savings account with Shrishail Multi Services.

Account Details:
• Account No: ${accountNumber}
• Customer Name: ${customerName}

Transaction Summary:
• Date: ${dateStr}
• Time: ${timeStr}
• Reference No: ${refNo}
• Amount Credited: ${amountStr}
• Total Savings Balance: ${savingsBalStr}

Thank you,
Shrishail Multi Services`;

  return { subject, body };
};

/**
 * Generates WhatsApp message for Savings Withdrawal
 */
export const generateWhatsAppSavingsWithdrawalMessage = ({ entry, customer, savingsBalance }) => {
  const customerName = customer?.name || 'Valued Customer';
  const accountNumber = customer?.account?.account_number || customer?.account_number || 'N/A';
  const dateStr = entry?.created_at ? formatDate(entry.created_at) : formatDate(new Date().toISOString());
  const timeStr = entry?.created_at ? formatTime(entry.created_at) : formatTime(new Date().toISOString());
  const refNo = entry?.reference_no || entry?.reference_number || `WDL-${(entry?.id || '').slice(0, 8).toUpperCase() || 'N/A'}`;
  const amountStr = formatRupees(Number(entry?.amount || 0));
  const savingsBalStr = formatRupees(Number(savingsBalance || 0));

  return (
`Shrishail Multi Services
SAVINGS WITHDRAWAL RECEIPT

Dear ${customerName},

An amount of ${amountStr} has been withdrawn from your savings account.

Account No: ${accountNumber}

Transaction Date: ${dateStr}
Time: ${timeStr}

Reference No: ${refNo}

Amount Withdrawn: ${amountStr}

Total Savings Remaining: ${savingsBalStr}

Thank you,
Shrishail Multi Services`
  );
};

/**
 * Generates Email for Savings Withdrawal
 */
export const generateEmailSavingsWithdrawal = ({ entry, customer, savingsBalance }) => {
  const customerName = customer?.name || 'Valued Customer';
  const accountNumber = customer?.account?.account_number || customer?.account_number || 'N/A';
  const dateStr = entry?.created_at ? formatDate(entry.created_at) : formatDate(new Date().toISOString());
  const timeStr = entry?.created_at ? formatTime(entry.created_at) : formatTime(new Date().toISOString());
  const refNo = entry?.reference_no || entry?.reference_number || `WDL-${(entry?.id || '').slice(0, 8).toUpperCase() || 'N/A'}`;
  const amountStr = formatRupees(Number(entry?.amount || 0));
  const savingsBalStr = formatRupees(Number(savingsBalance || 0));

  const subject = `Savings Withdrawal Receipt — Shrishail Multi Services — ${refNo}`;
  const body =
`Shrishail Multi Services
SAVINGS WITHDRAWAL RECEIPT

Dear ${customerName},

An amount of ${amountStr} has been withdrawn from your savings account with Shrishail Multi Services.

Account Details:
• Account No: ${accountNumber}
• Customer Name: ${customerName}

Transaction Summary:
• Date: ${dateStr}
• Time: ${timeStr}
• Reference No: ${refNo}
• Amount Withdrawn: ${amountStr}
• Remaining Savings Balance: ${savingsBalStr}

Thank you,
Shrishail Multi Services`;

  return { subject, body };
};


/**
 * Generates WhatsApp message for Bill Payment (Savings / Owner Pocket / Split)
 */
export const generateWhatsAppBillPaymentMessage = ({
  customer,
  billAmount,
  description,
  paidFromSavings = 0,
  remainingBill = 0,
  savingsBalance = 0,
  outstandingBalance = 0,
  paymentSource = 'customer_savings',
  referenceNumber = 'N/A',
  date = new Date().toISOString(),
}) => {
  const customerName = customer?.name || 'Valued Customer';
  const billAmountStr = formatRupees(Number(billAmount || 0));
  const savingsBalStr = formatRupees(Number(savingsBalance || 0));
  const outstandingBalStr = formatRupees(Number(outstandingBalance || 0));

  // Case 1: Fully Paid from Customer Savings (Option 1 & 2)
  if (paymentSource === 'customer_savings' && Number(remainingBill) === 0) {
    return (
`Shrishail Multi Services
SAVINGS TRANSACTION

Dear ${customerName},

An amount of ${billAmountStr} has been debited from your savings.

Reason:
${description || 'Bill Payment'}

Amount Debited:
${billAmountStr}

Total Savings Remaining:
${savingsBalStr}

Outstanding Balance:
${outstandingBalStr}

Thank you,
Shrishail Multi Services`
    );
  }

  // Case 2: Partial Savings + Remaining to Outstanding (Option 3)
  if (paymentSource === 'customer_savings' && Number(remainingBill) > 0) {
    const paidFromSavingsStr = formatRupees(Number(paidFromSavings || 0));
    const remainingAmountStr = formatRupees(Number(remainingBill || 0));

    return (
`Shrishail Multi Services
BILL PAYMENT RECEIPT

Dear ${customerName},

Bill / Expense:
${description || 'Bill Payment'}

Total Bill Amount:
${billAmountStr}

Paid From Savings:
${paidFromSavingsStr}

Remaining Amount:
${remainingAmountStr}

Savings Balance:
${savingsBalStr}

Outstanding Balance:
${outstandingBalStr}

Thank you,
Shrishail Multi Services`
    );
  }

  // Case 3: Owner's Pocket (Option 4)
  return (
`Shrishail Multi Services
BILL PAYMENT RECEIPT (OWNER'S POCKET)

Dear ${customerName},

Bill / Expense:
${description || 'Bill Payment'}

Total Bill Amount:
${billAmountStr}

Payment Source:
Owner's Pocket (Paid by Shrishail Multi Services)

Amount Added to Outstanding:
${billAmountStr}

Savings Balance:
${savingsBalStr}

Current Outstanding Balance:
${outstandingBalStr}

Thank you,
Shrishail Multi Services`
  );
};

/**
 * Generates Email for Bill Payment
 */
export const generateEmailBillPayment = ({
  customer,
  billAmount,
  description,
  paidFromSavings = 0,
  remainingBill = 0,
  savingsBalance = 0,
  outstandingBalance = 0,
  paymentSource = 'customer_savings',
  referenceNumber = 'N/A',
}) => {
  const message = generateWhatsAppBillPaymentMessage({
    customer,
    billAmount,
    description,
    paidFromSavings,
    remainingBill,
    savingsBalance,
    outstandingBalance,
    paymentSource,
    referenceNumber,
  });

  const subject = `Bill Payment Receipt — ${description || 'Expense'} — Shrishail Multi Services`;
  return { subject, body: message };
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
