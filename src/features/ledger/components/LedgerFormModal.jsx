import React, { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { useToast } from '../../../context/ToastContext';
import { Hash, ArrowUpRight, ArrowDownRight, RefreshCw, Bookmark, CreditCard, PiggyBank } from 'lucide-react';

export default function LedgerFormModal({
  isOpen,
  onClose,
  onSubmit,
  customers = [],
  selectedCustomerId = '',
  entryToEdit = null,
  isLoading = false,
}) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    customer_id: selectedCustomerId || '',
    entry_type: 'credit',
    amount: '',
    description: '',
    payment_method: 'Cash',
    other_payment_method: '',
    reference_no: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (entryToEdit) {
      setFormData({
        customer_id: entryToEdit.customer_id || selectedCustomerId,
        entry_type: entryToEdit.entry_type || 'credit',
        amount: entryToEdit.amount || '',
        description: entryToEdit.description || '',
        payment_method: entryToEdit.payment_method || 'Cash',
        other_payment_method: entryToEdit.other_payment_method || '',
        reference_no: entryToEdit.reference_no || '',
        notes: entryToEdit.notes || '',
      });
    } else {
      setFormData({
        customer_id: selectedCustomerId && selectedCustomerId !== 'all' ? selectedCustomerId : (customers[0]?.id || ''),
        entry_type: 'credit',
        amount: '',
        description: '',
        payment_method: 'Cash',
        other_payment_method: '',
        reference_no: '',
        notes: '',
      });
    }
    setErrors({});
  }, [entryToEdit, selectedCustomerId, isOpen, customers]);

  const selectedCustomer = customers.find((c) => c.id === formData.customer_id);
  const currentSavingsBalance = Number(selectedCustomer?.savings_account?.savings_balance || 0);
  const currentOutstandingBalance = Number(selectedCustomer?.account?.outstanding_balance || 0);
  const hasSavings = currentSavingsBalance > 0;

  const handleChange = (field, value) => {
    if (field === 'customer_id') {
      const nextCust = customers.find((c) => c.id === value);
      const nextSavings = Number(nextCust?.savings_account?.savings_balance || 0);
      if (formData.entry_type === 'savings_withdrawal' && nextSavings <= 0) {
        setFormData((prev) => ({ ...prev, customer_id: value, entry_type: 'credit' }));
        return;
      }
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const getRefPlaceholder = () => {
    if (formData.entry_type === 'savings_withdrawal') {
      return 'Withdrawal Ref No / Transaction ID (Optional)';
    }
    switch (formData.payment_method) {
      case 'Cheque':
        return 'Cheque Number (e.g. CHQ-40912)';
      case 'UPI':
        return 'UPI Transaction ID / Ref No (e.g. UPI/998231)';
      case 'Bank Transfer':
      case 'Net Banking':
      case 'NEFT':
      case 'RTGS':
      case 'IMPS':
        return 'UTR / Bank Ref Number (e.g. UTR100928)';
      case 'Card':
        return 'Card Txn Ref / Auth Code';
      default:
        return 'Receipt Number / Ref No (Optional)';
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.customer_id) errs.customer_id = 'Please select a customer';
    if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) {
      errs.amount = 'Enter a valid amount greater than 0';
    } else if (formData.entry_type === 'savings_withdrawal') {
      const numAmt = Number(formData.amount);
      if (numAmt > currentSavingsBalance) {
        errs.amount = `Withdrawal amount cannot exceed available savings of ₹${currentSavingsBalance.toLocaleString('en-IN')}.`;
      }
    }
    if (!formData.description.trim()) {
      errs.description = 'Entry description is required';
    }
    if (formData.payment_method === 'Other' && !formData.other_payment_method.trim()) {
      errs.other_payment_method = 'Specify payment method details';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to record ledger entry');
    }
  };

  const paymentMethods = [
    'Cash',
    'UPI',
    'Cheque',
    'Bank Transfer',
    'Net Banking',
    'NEFT',
    'RTGS',
    'IMPS',
    'Card',
    'Other',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={entryToEdit ? 'Edit Ledger Entry' : 'New Ledger Entry'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {entryToEdit ? 'Save Changes' : 'Record Entry'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-sans">
        {/* Customer Select */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Customer Account <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.customer_id}
            onChange={(e) => handleChange('customer_id', e.target.value)}
            disabled={Boolean(selectedCustomerId && selectedCustomerId !== 'all') || Boolean(entryToEdit)}
            className={`w-full p-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none ${
              errors.customer_id ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
            }`}
          >
            <option value="">-- Select Customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone}) - {c.account?.account_number || 'ACC-1001'}
              </option>
            ))}
          </select>
          {errors.customer_id && <p className="text-[11px] text-rose-600 mt-0.5">{errors.customer_id}</p>}
        </div>

        {/* Entry Type Selector Tabs */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Transaction Classification <span className="text-rose-500">*</span>
          </label>
          <div className="space-y-2">
            {/* Lending System Options */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Lending / Outstanding Ledger (Affects Customer Dues)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => handleChange('entry_type', 'credit')}
                  className={`py-2 px-2 rounded-md flex items-center justify-center gap-1 transition-all ${
                    formData.entry_type === 'credit'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Amount Given (+)
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('entry_type', 'debit')}
                  className={`py-2 px-2 rounded-md flex items-center justify-center gap-1 transition-all ${
                    formData.entry_type === 'debit'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Payment Received (-)
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('entry_type', 'adjustment')}
                  className={`py-2 px-2 rounded-md flex items-center justify-center gap-1 transition-all ${
                    formData.entry_type === 'adjustment'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Adjustment
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('entry_type', 'opening_balance')}
                  className={`py-2 px-2 rounded-md flex items-center justify-center gap-1 transition-all ${
                    formData.entry_type === 'opening_balance'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Opening Bal (+)
                </button>
              </div>
            </div>

            {/* Savings System Options (Completely Separate) */}
            {!entryToEdit && (
              <div>
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Customer Savings Account (Independent Ledger)</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    {hasSavings ? `Available Savings: ₹${currentSavingsBalance.toLocaleString('en-IN')}` : 'No active savings balance'}
                  </span>
                </div>
                {hasSavings ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleChange('entry_type', 'savings')}
                      className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 font-bold text-xs transition-all border ${
                        formData.entry_type === 'savings'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <PiggyBank className="w-4 h-4" />
                      <span>Savings Deposit (+)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('entry_type', 'savings_withdrawal')}
                      className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 font-bold text-xs transition-all border ${
                        formData.entry_type === 'savings_withdrawal'
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                          : 'bg-purple-50/70 text-purple-800 border-purple-200 hover:bg-purple-100'
                      }`}
                    >
                      <ArrowDownRight className="w-4 h-4" />
                      <span>Savings Withdrawal (-)</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleChange('entry_type', 'savings')}
                    className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 font-bold text-xs transition-all border ${
                      formData.entry_type === 'savings'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <PiggyBank className="w-4 h-4" />
                    <span>Savings Deposit (Credits Customer's Savings Account)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Informational banner when Savings Deposit is selected */}
        {formData.entry_type === 'savings' && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
            <PiggyBank className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <div className="font-bold flex items-center justify-between">
                <span>Savings Account Deposit</span>
                <span className="text-emerald-700 font-mono text-[11px]">Current: ₹{currentSavingsBalance.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                This transaction will credit the customer's separate <strong>Savings Account</strong>.
                The customer's <strong>Outstanding Dues</strong> balance will NOT change.
              </div>
            </div>
          </div>
        )}

        {/* Informational banner when Savings Withdrawal is selected */}
        {formData.entry_type === 'savings_withdrawal' && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-2.5 text-xs text-purple-900">
            <PiggyBank className="w-4 h-4 shrink-0 text-purple-600 mt-0.5" />
            <div>
              <div className="font-bold flex items-center justify-between">
                <span>Savings Account Withdrawal</span>
                <span className="text-purple-700 font-mono text-[11px]">Available: ₹{currentSavingsBalance.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-[11px] text-purple-700 mt-0.5 leading-relaxed">
                This transaction will debit the customer's separate <strong>Savings Account</strong>.
                The customer's <strong>Outstanding Dues</strong> balance will remain <strong>COMPLETELY UNCHANGED</strong>.
              </div>
            </div>
          </div>
        )}

        {/* Amount & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {formData.entry_type === 'savings_withdrawal' ? (
                <span>Withdrawal Amount (₹) <span className="text-purple-600 font-normal font-mono text-[11px]">(Max ₹{currentSavingsBalance.toLocaleString('en-IN')})</span></span>
              ) : formData.entry_type === 'savings' ? (
                <span>Deposit Amount (₹)</span>
              ) : (
                <span>Amount (₹)</span>
              )} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                placeholder="0.00"
                className={`w-full pl-8 pr-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none font-mono text-sm font-bold ${
                  errors.amount ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
                }`}
              />
            </div>
            {errors.amount && <p className="text-[11px] text-rose-600 mt-0.5">{errors.amount}</p>}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={formData.payment_method}
                onChange={(e) => handleChange('payment_method', e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none font-semibold text-slate-800"
              >
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Other Payment Method custom text field */}
        {formData.payment_method === 'Other' && (
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Specify Other Payment Method <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.other_payment_method}
              onChange={(e) => handleChange('other_payment_method', e.target.value)}
              placeholder="e.g. Demand Draft / Barter Exchange"
              className={`w-full p-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none ${
                errors.other_payment_method ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
              }`}
            />
            {errors.other_payment_method && (
              <p className="text-[11px] text-rose-600 mt-0.5">{errors.other_payment_method}</p>
            )}
          </div>
        )}

        {/* Reference Number */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Reference Number / Txn ID</label>
          <div className="relative">
            <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={formData.reference_no}
              onChange={(e) => handleChange('reference_no', e.target.value)}
              placeholder={getRefPlaceholder()}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Particulars / Description <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder={
              formData.entry_type === 'savings_withdrawal'
                ? 'e.g. Customer savings withdrawal / cash returned'
                : formData.entry_type === 'savings'
                ? 'e.g. Savings deposit contribution'
                : 'e.g. Material delivery 20 tons / Payment received via UPI'
            }
            className={`w-full p-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none ${
              errors.description ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
            }`}
          />
          {errors.description && <p className="text-[11px] text-rose-600 mt-0.5">{errors.description}</p>}
        </div>

        {/* Notes */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Additional Notes</label>
          <textarea
            rows="2"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Internal details or verification remarks..."
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none"
          />
        </div>
      </form>
    </Modal>
  );
}
