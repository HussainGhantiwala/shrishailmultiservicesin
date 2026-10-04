import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import StatusBadge from './StatusBadge';
import { useToast } from '../../context/ToastContext';
import { customerApi } from '../../services/api/customers';
import { formatRupees } from '../../utils/currency';
import { formatDate, formatTime } from '../../utils/date';
import {
  generateWhatsAppReceiptMessage,
  generateEmailReceipt,
  generateWhatsAppSavingsDepositMessage,
  generateEmailSavingsDeposit,
  generateWhatsAppSavingsWithdrawalMessage,
  generateEmailSavingsWithdrawal,
  generateWhatsAppBillPaymentMessage,
  generateEmailBillPayment,
  buildWhatsAppUrl,
  buildMailtoUrl,
  buildGmailComposeUrl,
  normalizePhoneNumberForWhatsApp,
  isValidWhatsAppPhone,
  isValidEmailAddress,
  getTransactionTypeLabel,
} from '../../utils/receipt';
import {
  Phone,
  Mail,
  Edit2,
  CheckCircle2,
  ExternalLink,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Bookmark,
  CreditCard,
  Hash,
  FileText,
  AlertTriangle,
  Send,
  PiggyBank,
  Wallet,
} from 'lucide-react';

export default function ReceiptShareModal({
  isOpen,
  onClose,
  entry,
  customer,
  outstandingBalance: propOutstandingBalance,
  savingsBalance: propSavingsBalance,
  isSavingsReceipt = false,
  isBillReceipt = false,
  billPaymentData = null,
  isNewEntry = false,
  onCustomerUpdated,
}) {
  const toast = useToast();

  const [currentCustomer, setCurrentCustomer] = useState(customer || null);
  const [currentOutstandingBalance, setCurrentOutstandingBalance] = useState(
    propOutstandingBalance !== undefined && propOutstandingBalance !== null
      ? Number(propOutstandingBalance)
      : customer?.account?.outstanding_balance !== undefined && customer?.account?.outstanding_balance !== null
      ? Number(customer.account.outstanding_balance)
      : null
  );
  const [currentSavingsBalance, setCurrentSavingsBalance] = useState(
    propSavingsBalance !== undefined && propSavingsBalance !== null
      ? Number(propSavingsBalance)
      : customer?.savings_account?.savings_balance !== undefined && customer?.savings_account?.savings_balance !== null
      ? Number(customer.savings_account.savings_balance)
      : null
  );

  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactError, setContactError] = useState(null);

  useEffect(() => {
    setCurrentCustomer(customer || null);
    setContactPhone(customer?.phone || '');
    setContactEmail(customer?.email || '');
    setIsEditingContact(false);
    setContactError(null);

    // If explicit balances are provided via props, prioritize them immediately
    if (propOutstandingBalance !== undefined && propOutstandingBalance !== null) {
      setCurrentOutstandingBalance(Number(propOutstandingBalance));
    } else if (customer?.account?.outstanding_balance !== undefined && customer?.account?.outstanding_balance !== null) {
      setCurrentOutstandingBalance(Number(customer.account.outstanding_balance));
    }

    if (propSavingsBalance !== undefined && propSavingsBalance !== null) {
      setCurrentSavingsBalance(Number(propSavingsBalance));
    } else if (customer?.savings_account?.savings_balance !== undefined && customer?.savings_account?.savings_balance !== null) {
      setCurrentSavingsBalance(Number(customer.savings_account.savings_balance));
    }

    // Always fetch the freshest authoritative customer record from Supabase if open
    let isMounted = true;
    const cid = customer?.id || entry?.customer_id;
    if (isOpen && cid) {
      customerApi.getCustomerById(cid)
        .then((res) => {
          if (isMounted && res?.data) {
            setCurrentCustomer(res.data);
            if (propOutstandingBalance === undefined && res.data.account?.outstanding_balance !== undefined) {
              setCurrentOutstandingBalance(Number(res.data.account.outstanding_balance));
            }
            if (propSavingsBalance === undefined && res.data.savings_account?.savings_balance !== undefined) {
              setCurrentSavingsBalance(Number(res.data.savings_account.savings_balance));
            }
          }
        })
        .catch((err) => {
          console.warn('Failed to load authoritative balance for receipt modal:', err);
        });
    }

    return () => { isMounted = false; };
  }, [customer, entry, isOpen, propOutstandingBalance, propSavingsBalance]);

  if (!entry && !billPaymentData) return null;

  const isSavingsMode = isSavingsReceipt || entry?.entry_type === 'savings' || entry?.transaction_type === 'CREDIT' || entry?.transaction_type === 'OPENING' || entry?.display_type === 'savings_deposit' || entry?.transaction_type === 'DEPOSIT';
  const isWithdrawalMode = entry?.display_type === 'savings_withdrawal' || entry?.transaction_type === 'WITHDRAWAL';
  const typeLabel = getTransactionTypeLabel(entry?.entry_type || entry?.transaction_type || entry?.display_type);
  const isAmountGiven = entry?.entry_type === 'credit' || entry?.entry_type === 'opening_balance';
  const isPaymentReceived = entry?.entry_type === 'debit';

  const entryDate = entry?.created_at ? formatDate(entry.created_at) : formatDate(new Date().toISOString());
  const entryTime = entry?.created_at ? formatTime(entry.created_at) : formatTime(new Date().toISOString());
  const refNo = entry?.reference_no || entry?.reference_number || (isBillReceipt && billPaymentData?.reference_number) || `TXN-${(entry?.id || '').slice(0, 8).toUpperCase() || 'N/A'}`;
  const paymentMethod = entry?.payment_method
    ? entry.payment_method === 'Other' && entry.other_payment_method
      ? `Other (${entry.other_payment_method})`
      : entry.payment_method
    : 'Cash';

  const outstandingBal =
    currentOutstandingBalance !== null && currentOutstandingBalance !== undefined
      ? currentOutstandingBalance
      : currentCustomer?.account?.outstanding_balance !== undefined && currentCustomer?.account?.outstanding_balance !== null
      ? Number(currentCustomer.account.outstanding_balance)
      : entry?.running_balance !== undefined && entry?.running_balance !== null
      ? Number(entry.running_balance)
      : 0;

  const savingsBal =
    currentSavingsBalance !== null && currentSavingsBalance !== undefined
      ? currentSavingsBalance
      : currentCustomer?.savings_account?.savings_balance !== undefined && currentCustomer?.savings_account?.savings_balance !== null
      ? Number(currentCustomer.savings_account.savings_balance)
      : entry?.balance_after !== undefined && entry?.balance_after !== null
      ? Number(entry.balance_after)
      : 0;

  // Handle Save Contact Details
  const handleSaveContact = async (e) => {
    e?.preventDefault();
    if (!currentCustomer?.id) return;

    const cleanDigits = contactPhone.replace(/\D/g, '');
    if (cleanDigits.length > 0 && cleanDigits.length !== 10 && cleanDigits.length !== 12) {
      setContactError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (contactEmail && !isValidEmailAddress(contactEmail)) {
      setContactError('Please enter a valid email address.');
      return;
    }

    setIsSavingContact(true);
    setContactError(null);

    try {
      const res = await customerApi.updateCustomerContact(currentCustomer.id, {
        phone: contactPhone.trim(),
        email: contactEmail.trim(),
      });

      const updated = res.data;
      setCurrentCustomer(updated);
      setIsEditingContact(false);
      toast.success('Customer contact details updated successfully.');
      if (onCustomerUpdated) {
        onCustomerUpdated(updated);
      }
    } catch (err) {
      setContactError(err.message || 'Failed to update customer contact details');
      toast.error(err.message || 'Failed to update contact details');
    } finally {
      setIsSavingContact(false);
    }
  };

  // WhatsApp Share Trigger
  const handleShareWhatsApp = () => {
    const rawPhone = currentCustomer?.phone;
    if (!rawPhone || !isValidWhatsAppPhone(rawPhone)) {
      toast.error('This customer does not have a phone number. Please add one before sending the receipt.');
      setIsEditingContact(true);
      return;
    }

    let message = '';
    if (isBillReceipt && billPaymentData) {
      message = generateWhatsAppBillPaymentMessage({
        customer: currentCustomer,
        billAmount: billPaymentData.bill_amount,
        description: billPaymentData.description,
        paidFromSavings: billPaymentData.paid_from_savings,
        remainingBill: billPaymentData.remaining_bill,
        savingsBalance: billPaymentData.savings_balance,
        outstandingBalance: billPaymentData.outstanding_balance,
        paymentSource: billPaymentData.payment_source,
        referenceNumber: refNo,
      });
    } else if (isWithdrawalMode) {
      message = generateWhatsAppSavingsWithdrawalMessage({
        entry,
        customer: currentCustomer,
        savingsBalance: savingsBal,
      });
    } else if (isSavingsMode) {
      message = generateWhatsAppSavingsDepositMessage({
        entry,
        customer: currentCustomer,
        savingsBalance: savingsBal,
      });
    } else {
      message = generateWhatsAppReceiptMessage({
        entry,
        customer: currentCustomer,
        outstandingBalance: outstandingBal,
      });
    }

    const url = buildWhatsAppUrl(rawPhone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('WhatsApp opened. Review the receipt and press send in WhatsApp.');
  };

  // Email Share Trigger
  const handleShareEmail = (useGmail = false) => {
    const rawEmail = currentCustomer?.email;
    if (!rawEmail || !isValidEmailAddress(rawEmail)) {
      toast.error('This customer does not have an email address. Please add one before sending the receipt.');
      setIsEditingContact(true);
      return;
    }

    let subject = '';
    let body = '';

    if (isBillReceipt && billPaymentData) {
      const emailObj = generateEmailBillPayment({
        customer: currentCustomer,
        billAmount: billPaymentData.bill_amount,
        description: billPaymentData.description,
        paidFromSavings: billPaymentData.paid_from_savings,
        remainingBill: billPaymentData.remaining_bill,
        savingsBalance: billPaymentData.savings_balance,
        outstandingBalance: billPaymentData.outstanding_balance,
        paymentSource: billPaymentData.payment_source,
        referenceNumber: refNo,
      });
      subject = emailObj.subject;
      body = emailObj.body;
    } else if (isWithdrawalMode) {
      const emailObj = generateEmailSavingsWithdrawal({
        entry,
        customer: currentCustomer,
        savingsBalance: savingsBal,
      });
      subject = emailObj.subject;
      body = emailObj.body;
    } else if (isSavingsMode) {
      const emailObj = generateEmailSavingsDeposit({
        entry,
        customer: currentCustomer,
        savingsBalance: savingsBal,
      });
      subject = emailObj.subject;
      body = emailObj.body;
    } else {
      const emailObj = generateEmailReceipt({
        entry,
        customer: currentCustomer,
        outstandingBalance: outstandingBal,
      });
      subject = emailObj.subject;
      body = emailObj.body;
    }

    if (useGmail) {
      const gmailUrl = buildGmailComposeUrl(rawEmail, subject, body);
      window.open(gmailUrl, '_blank', 'noopener,noreferrer');
      toast.success('Gmail draft opened. Please review and send it.');
    } else {
      const mailtoUrl = buildMailtoUrl(rawEmail, subject, body);
      window.location.href = mailtoUrl;
      toast.success('Email draft opened. Please review and send it.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isBillReceipt
          ? 'Bill Payment Receipt & Share'
          : isSavingsMode
          ? 'Savings Deposit Receipt & Share'
          : 'Transaction Receipt & Share'
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-slate-400">
            Admin-controlled manual receipt sharing
          </span>
          <Button variant="secondary" onClick={onClose}>
            Done / Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4 font-sans text-xs">
        {/* Optional Success Banner for New Entry */}
        {isNewEntry && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-emerald-900 text-xs">
                {isBillReceipt
                  ? 'Customer Bill Payment Processed Successfully!'
                  : isSavingsMode
                  ? 'Savings Deposit Credited Successfully!'
                  : 'Ledger Entry Recorded Successfully!'}
              </div>
              <div className="text-[11px] text-emerald-700">
                You can now share the official receipt with the customer via WhatsApp or Email.
              </div>
            </div>
          </div>
        )}

        {/* Customer & Contact Info Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-primary text-white font-bold flex items-center justify-center text-xs">
                {currentCustomer?.name?.[0] || 'C'}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  {currentCustomer?.name || 'Customer'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Account: {currentCustomer?.account?.account_number || currentCustomer?.account_number || 'N/A'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingContact(!isEditingContact)}
              className="inline-flex items-center gap-1 text-[11px] text-brand-primary font-semibold hover:underline bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs"
            >
              <Edit2 className="w-3 h-3" />
              {isEditingContact ? 'Cancel Edit' : 'Edit Contact Details'}
            </button>
          </div>

          {/* Contact Display / Edit Form */}
          {isEditingContact ? (
            <form onSubmit={handleSaveContact} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2.5 mt-2">
              <div className="font-bold text-slate-800 text-[11px]">Update Customer Contact Info</div>
              {contactError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-[11px]">
                  {contactError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Phone Number (10 digits)
                  </label>
                  <div className="flex items-center">
                    <span className="bg-slate-100 border border-r-0 border-slate-300 rounded-l-md px-2 py-1.5 font-bold text-slate-500 text-xs">
                      +91
                    </span>
                    <input
                      type="text"
                      maxLength={10}
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="9823011223"
                      className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-r-md text-xs font-mono focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="customer@domain.com"
                    className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" size="sm" onClick={() => setIsEditingContact(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSavingContact}>
                  {isSavingContact ? 'Saving...' : 'Save Contact Info'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-500 text-[11px]">Phone:</span>
                {currentCustomer?.phone ? (
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    +91 {currentCustomer.phone}
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium italic text-[11px]">Not Provided</span>
                )}
              </div>

              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-500 text-[11px]">Email:</span>
                {currentCustomer?.email ? (
                  <span className="font-medium text-slate-800 text-xs truncate" title={currentCustomer.email}>
                    {currentCustomer.email}
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium italic text-[11px]">Not Provided</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* CASE 1: BILL PAYMENT RECEIPT PREVIEW */}
        {/* ==================================================================== */}
        {isBillReceipt && billPaymentData ? (
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Receipt className="w-4 h-4 text-brand-primary" />
                Official Bill Payment Receipt
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Ref: <strong className="text-slate-700">{refNo}</strong>
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-50/70 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Total Bill Amount</span>
                <span className="font-mono text-xl font-bold text-slate-900">
                  {formatRupees(billPaymentData.bill_amount)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-0.5">Payment Source</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                  billPaymentData.payment_source === 'customer_savings'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {billPaymentData.payment_source === 'customer_savings' ? (
                    <><PiggyBank className="w-3.5 h-3.5 text-emerald-600" /> Customer Savings</>
                  ) : (
                    <><Wallet className="w-3.5 h-3.5 text-blue-600" /> Owner's Pocket</>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block">Paid from Savings</span>
                <span className="font-bold text-emerald-600 font-mono">
                  {formatRupees(billPaymentData.paid_from_savings || 0)}
                </span>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block">Remaining to Dues</span>
                <span className="font-bold text-rose-600 font-mono">
                  {formatRupees(billPaymentData.remaining_bill || 0)}
                </span>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block">Committed Savings</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatRupees(billPaymentData.savings_balance || 0)}
                </span>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block">Committed Outstanding</span>
                <span className={`font-bold font-mono ${billPaymentData.outstanding_balance > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {formatRupees(billPaymentData.outstanding_balance || 0)}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 text-[10px] block font-semibold uppercase">Bill / Expense Description</span>
              <span className="font-medium text-slate-800 mt-0.5 block">
                {billPaymentData.description || 'Customer Expense'}
              </span>
            </div>
          </div>
        ) : isSavingsMode ? (
          /* ==================================================================== */
          /* CASE 2: SAVINGS DEPOSIT RECEIPT PREVIEW */
          /* ==================================================================== */
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <PiggyBank className="w-4 h-4 text-emerald-600" />
                Savings Account Receipt
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Ref: <strong className="text-slate-700">{refNo}</strong>
              </span>
            </div>

            <div className="flex items-center justify-between bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
              <div>
                <span className="text-[10px] text-emerald-700 font-semibold uppercase block">Amount Credited</span>
                <span className="font-mono text-xl font-bold text-emerald-700">
                  +{formatRupees(entry.amount)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-emerald-700 font-semibold uppercase block mb-0.5">Account System</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  Customer Savings
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block">Date & Time</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {entryDate} • {entryTime}
                </span>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block">Total Savings Balance</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {formatRupees(savingsBal)}
                </span>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 col-span-2 sm:col-span-1">
                <span className="text-slate-500 block">Outstanding Dues</span>
                <span className="font-bold text-slate-700 font-mono">
                  {formatRupees(outstandingBal)} (Unchanged)
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 text-[10px] block font-semibold uppercase">Particulars</span>
              <span className="font-medium text-slate-800 mt-0.5 block">
                {entry.description || 'Savings Deposit'}
              </span>
            </div>
          </div>
        ) : isWithdrawalMode ? (
          /* ==================================================================== */
          /* CASE 2B: SAVINGS WITHDRAWAL RECEIPT PREVIEW */
          /* ==================================================================== */
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <PiggyBank className="w-4 h-4 text-purple-600" />
                Savings Withdrawal Receipt
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Ref: <strong className="text-slate-700">{refNo}</strong>
              </span>
            </div>

            <div className="flex items-center justify-between bg-purple-50/50 p-3 rounded-xl border border-purple-100">
              <div>
                <span className="text-[10px] text-purple-700 font-semibold uppercase block">Amount Withdrawn</span>
                <span className="font-mono text-xl font-bold text-purple-700">
                  -{formatRupees(entry.amount)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-purple-700 font-semibold uppercase block mb-0.5">Classification</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800">
                  <ArrowDownRight className="w-3.5 h-3.5 text-purple-600" />
                  Savings Withdrawal
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block">Date & Time</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {entryDate} {entryTime}
                </span>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block">Payment Method</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {paymentMethod}
                </span>
              </div>

              <div className="p-2 bg-purple-50/60 rounded-lg border border-purple-100">
                <span className="text-purple-700 block font-semibold">Remaining Savings</span>
                <span className="font-bold text-purple-800 font-mono">
                  {formatRupees(savingsBal)}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 text-[10px] block font-semibold uppercase">Particulars</span>
              <span className="font-medium text-slate-800 mt-0.5 block">
                {entry.description || 'Savings Withdrawal'}
              </span>
            </div>
          </div>
        ) : (
          /* ==================================================================== */
          /* CASE 3: STANDARD LENDING TRANSACTION RECEIPT PREVIEW */
          /* ==================================================================== */
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Receipt className="w-4 h-4 text-brand-primary" />
                Receipt Details
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Ref: <strong className="text-slate-700">{refNo}</strong>
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-50/70 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Transaction Amount</span>
                <span
                  className={`font-mono text-xl font-bold ${
                    isAmountGiven ? 'text-rose-600' : isPaymentReceived ? 'text-emerald-600' : 'text-slate-900'
                  }`}
                >
                  {formatRupees(entry.amount)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-0.5">Transaction Type</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                    isAmountGiven
                      ? 'bg-rose-100 text-rose-800'
                      : isPaymentReceived
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isAmountGiven && <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />}
                  {isPaymentReceived && <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />}
                  {entry.entry_type === 'adjustment' && <RefreshCw className="w-3.5 h-3.5 text-amber-600" />}
                  {typeLabel}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block">Date & Time</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {entryDate} • {entryTime}
                </span>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block">Payment Method</span>
                <span className="font-semibold text-slate-800">
                  {paymentMethod}
                </span>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 col-span-2 sm:col-span-1">
                <span className="text-slate-500 block">Outstanding Balance</span>
                <span className="font-bold text-slate-900 font-mono">
                  {outstandingBal !== null ? formatRupees(outstandingBal) : 'N/A'}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 text-[10px] block font-semibold uppercase">Particulars / Description</span>
              <span className="font-medium text-slate-800 mt-0.5 block">
                {entry.description || 'No description provided'}
              </span>
            </div>
          </div>
        )}

        {/* Sharing Actions Section */}
        <div className="space-y-2.5 pt-1">
          <div className="text-slate-700 font-bold text-xs flex items-center justify-between">
            <span>Share Receipt Directly</span>
            <span className="text-[11px] font-normal text-slate-500">Manual review before dispatch</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* WhatsApp Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Send via WhatsApp</span>
            </button>

            {/* Email Button */}
            <button
              type="button"
              onClick={() => handleShareEmail(false)}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Mail className="w-4 h-4" />
              <span>Send via Email</span>
            </button>
          </div>

          {/* Alternate web compose option */}
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
            <span>Need webmail?</span>
            <button
              type="button"
              onClick={() => handleShareEmail(true)}
              className="text-brand-primary font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>Open in Gmail Web</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
