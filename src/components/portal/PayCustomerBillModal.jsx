import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { savingsApi } from '../../services/api/savings';
import { formatRupees } from '../../utils/currency';
import {
  PiggyBank,
  Wallet,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Hash,
} from 'lucide-react';

export default function PayCustomerBillModal({
  isOpen,
  onClose,
  customers = [],
  selectedCustomerId = '',
  onSuccess,
}) {
  const { user } = useAuth();
  const toast = useToast();

  const [customerId, setCustomerId] = useState(selectedCustomerId || '');
  const [billAmount, setBillAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentSource, setPaymentSource] = useState('customer_savings');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setCustomerId(selectedCustomerId && selectedCustomerId !== 'all' ? selectedCustomerId : (customers[0]?.id || ''));
      setBillAmount('');
      setDescription('');
      setPaymentSource('customer_savings');
      setReferenceNumber('');
      setNotes('');
      setErrors({});
    }
  }, [isOpen, selectedCustomerId, customers]);

  // Selected customer object
  const selectedCust = customers.find((c) => c.id === customerId) || null;
  const currentSavings = Number(selectedCust?.savings_account?.savings_balance || 0);
  const currentOutstanding = Number(selectedCust?.account?.outstanding_balance || 0);

  // Live calculations
  const numBill = Number(billAmount) || 0;
  const isSavingsSource = paymentSource === 'customer_savings';

  let calculatedSavingsUsed = 0;
  let calculatedRemainingBill = numBill;
  let calculatedSavingsAfter = currentSavings;
  let calculatedOutstandingAfter = currentOutstanding;

  if (numBill > 0) {
    if (isSavingsSource) {
      calculatedSavingsUsed = Math.min(numBill, currentSavings);
      calculatedRemainingBill = Math.max(0, numBill - calculatedSavingsUsed);
      calculatedSavingsAfter = Math.max(0, currentSavings - calculatedSavingsUsed);
      calculatedOutstandingAfter = currentOutstanding + calculatedRemainingBill;
    } else {
      // Owner's Pocket: Adds new amount given to outstanding
      calculatedSavingsUsed = 0;
      calculatedRemainingBill = numBill;
      calculatedSavingsAfter = currentSavings;
      calculatedOutstandingAfter = currentOutstanding + numBill;
    }
  }

  const validate = () => {
    const errs = {};
    if (!customerId) errs.customerId = 'Please select a customer';
    if (!billAmount || isNaN(numBill) || numBill <= 0) {
      errs.billAmount = 'Enter a valid bill amount greater than 0';
    }
    if (!description.trim()) {
      errs.description = 'Bill / Expense description is required (e.g. Electricity Bill)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await savingsApi.payCustomerBill({
        customerId,
        billAmount: numBill,
        description: description.trim(),
        paymentSource,
        referenceNumber: referenceNumber.trim() || null,
        notes: notes.trim() || null,
        currentUser: user,
      });

      toast.success(res.data?.message || 'Customer bill payment processed successfully.');

      if (onSuccess) {
        onSuccess(res.data, selectedCust);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to process bill payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pay Customer Bill / Expense"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-slate-400">
            Atomic financial transaction with committed DB balances
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Processing Payment...' : 'Process Bill Payment'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
        {/* Customer Select */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Customer Account <span className="text-rose-500">*</span>
          </label>
          <select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              if (errors.customerId) setErrors((prev) => ({ ...prev, customerId: null }));
            }}
            disabled={Boolean(selectedCustomerId && selectedCustomerId !== 'all')}
            className={`w-full p-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none ${
              errors.customerId ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
            }`}
          >
            <option value="">-- Select Customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone}) - {c.account?.account_number || 'ACC'}
              </option>
            ))}
          </select>
          {errors.customerId && <p className="text-[11px] text-rose-600 mt-0.5">{errors.customerId}</p>}
        </div>

        {/* Selected Customer Current Balances Bar */}
        {selectedCust && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <PiggyBank className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Available Savings</div>
                <div className="font-bold text-sm text-emerald-700 font-mono">
                  {formatRupees(currentSavings)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Current Outstanding Dues</div>
                <div className={`font-bold text-sm font-mono ${currentOutstanding > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {formatRupees(currentOutstanding)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bill Amount & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Bill / Expense Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={billAmount}
                onChange={(e) => {
                  setBillAmount(e.target.value);
                  if (errors.billAmount) setErrors((prev) => ({ ...prev, billAmount: null }));
                }}
                placeholder="0.00"
                className={`w-full pl-8 pr-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none font-mono text-sm font-bold ${
                  errors.billAmount ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
                }`}
              />
            </div>
            {errors.billAmount && <p className="text-[11px] text-rose-600 mt-0.5">{errors.billAmount}</p>}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Bill Description / Particulars <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: null }));
              }}
              placeholder="e.g. Electricity Bill, Shop Tax, Water Bill"
              className={`w-full p-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none ${
                errors.description ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
              }`}
            />
            {errors.description && <p className="text-[11px] text-rose-600 mt-0.5">{errors.description}</p>}
          </div>
        </div>

        {/* Payment Source Selection */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Payment Source <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option 1: Customer Savings */}
            <label
              className={`relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                paymentSource === 'customer_savings'
                  ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="paymentSource"
                value="customer_savings"
                checked={paymentSource === 'customer_savings'}
                onChange={() => setPaymentSource('customer_savings')}
                className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Customer Savings</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Deduct from customer's savings ({formatRupees(currentSavings)} available).
                </div>
              </div>
            </label>

            {/* Option 2: Owner's Pocket */}
            <label
              className={`relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                paymentSource === 'owner_pocket'
                  ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="paymentSource"
                value="owner_pocket"
                checked={paymentSource === 'owner_pocket'}
                onChange={() => setPaymentSource('owner_pocket')}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-blue-600" />
                  <span>Owner's Pocket</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Paid by business. Savings untouched; full bill added to Outstanding Dues.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Real-time Dynamic Settlement Simulation Box */}
        {numBill > 0 && selectedCust && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center justify-between">
              <span>Financial Settlement Breakdown</span>
              <span className="text-[10px] font-medium text-slate-500">Preview Before Commit</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-400 font-semibold">Bill Amount</div>
                <div className="font-bold text-slate-900 font-mono mt-0.5">{formatRupees(numBill)}</div>
              </div>

              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-400 font-semibold">From Savings</div>
                <div className="font-bold text-emerald-600 font-mono mt-0.5">
                  {calculatedSavingsUsed > 0 ? `-${formatRupees(calculatedSavingsUsed)}` : '₹0'}
                </div>
              </div>

              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-400 font-semibold">Savings Remaining</div>
                <div className="font-bold text-slate-800 font-mono mt-0.5">
                  {formatRupees(calculatedSavingsAfter)}
                </div>
              </div>

              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-400 font-semibold">Outstanding Dues After</div>
                <div className={`font-bold font-mono mt-0.5 ${calculatedOutstandingAfter > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {formatRupees(calculatedOutstandingAfter)}
                </div>
              </div>
            </div>

            {/* Explanation Note */}
            {isSavingsSource && calculatedSavingsUsed > 0 && calculatedRemainingBill > 0 && (
              <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-start gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  <strong>Savings & Dues Settlement:</strong> {formatRupees(calculatedSavingsUsed)} will be deducted from the customer's savings. The remaining {formatRupees(calculatedRemainingBill)} will be added to the customer's outstanding dues. Customer savings portion is <strong>NOT</strong> counted as cash payment received.
                </span>
              </div>
            )}

            {isSavingsSource && calculatedRemainingBill === 0 && (
              <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-start gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  <strong>Full Savings Settlement:</strong> {formatRupees(calculatedSavingsUsed)} will be deducted from the customer's savings. The bill is fully covered by savings; customer outstanding dues remain unchanged. Customer savings portion is <strong>NOT</strong> counted as cash payment received.
                </span>
              </div>
            )}

            {isSavingsSource && calculatedSavingsUsed === 0 && (
              <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  <strong>Zero Savings Available:</strong> Customer has ₹0.00 in savings. The entire bill amount of {formatRupees(numBill)} will be paid by the business and added to the customer's outstanding dues.
                </span>
              </div>
            )}

            {!isSavingsSource && (
              <div className="text-[11px] text-blue-800 bg-blue-50 p-2.5 rounded-lg border border-blue-200 flex items-start gap-1.5">
                <HelpCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <span>
                  <strong>Owner's Pocket:</strong> Customer savings of {formatRupees(currentSavings)} remains completely untouched. The full bill amount of {formatRupees(numBill)} will be paid by the business and added to the customer's Outstanding Dues.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Optional Reference Number & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reference No / Bill No (Optional)</label>
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. EB-8849102"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Additional Remarks (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid online via portal"
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
