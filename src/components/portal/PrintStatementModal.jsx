import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { printStatement } from '../../utils/printStatement';
import { formatRupees } from '../../utils/currency';
import { getTodayISO } from '../../utils/date';
import {
  Printer,
  Receipt,
  PiggyBank,
  FileText,
  Calendar,
  User,
  CheckCircle2,
  Wallet,
} from 'lucide-react';

export default function PrintStatementModal({
  isOpen,
  onClose,
  customer = null,
  customers = [],
  initialStatementType = 'lending',
}) {
  const toast = useToast();

  const [statementType, setStatementType] = useState('lending'); // 'lending' | 'full'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [periodPreset, setPeriodPreset] = useState('all_time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStatementType(initialStatementType || 'lending');
      if (customer?.id) {
        setSelectedCustomerId(customer.id);
      } else if (customers.length > 0) {
        setSelectedCustomerId(customers[0].id);
      }
      setPeriodPreset('all_time');
      setStartDate('');
      setEndDate('');
    }
  }, [isOpen, customer, customers, initialStatementType]);

  const handlePresetChange = (preset) => {
    setPeriodPreset(preset);
    const today = new Date();
    const todayStr = getTodayISO();

    if (preset === 'all_time') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'last_30_days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'custom') {
      // Leave dates for user input
    }
  };

  const selectedCust = (customers || []).find((c) => c.id === selectedCustomerId) || customer;
  const currentOutstanding = Number(selectedCust?.account?.outstanding_balance || 0);
  const currentSavings = Number(selectedCust?.savings_account?.savings_balance || 0);

  const handlePrint = async () => {
    if (!selectedCustomerId && !customer?.id) {
      toast.error('Please select a customer to generate a statement.');
      return;
    }

    const cid = selectedCustomerId || customer?.id;
    setLoading(true);

    try {
      // 1. Fetch latest customer details with account and savings_account
      const { data: fullCust, error: custErr } = await supabase
        .from('customers')
        .select(`
          *,
          account:customer_accounts(*),
          savings_account:customer_savings_accounts(*)
        `)
        .eq('id', cid)
        .single();

      if (custErr) throw new Error(custErr.message);

      const targetCust = fullCust || selectedCust;
      const custAcc = Array.isArray(targetCust.account) ? targetCust.account[0] : targetCust.account;
      const custSav = Array.isArray(targetCust.savings_account) ? targetCust.savings_account[0] : targetCust.savings_account;

      // 2. Fetch non-deleted ledger entries for this customer
      let ledgerQuery = supabase
        .from('ledger_entries')
        .select('*')
        .eq('customer_id', cid)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (startDate) {
        ledgerQuery = ledgerQuery.gte('created_at', `${startDate}T00:00:00Z`);
      }
      if (endDate) {
        ledgerQuery = ledgerQuery.lte('created_at', `${endDate}T23:59:59Z`);
      }

      const { data: ledgerEntries, error: ledgerErr } = await ledgerQuery;
      if (ledgerErr) throw new Error(ledgerErr.message);

      // 3. Fetch non-deleted savings transactions if full account statement
      let savingsEntries = [];
      if (statementType === 'full') {
        let savingsQuery = supabase
          .from('customer_savings_transactions')
          .select('*')
          .eq('customer_id', cid)
          .eq('is_deleted', false)
          .order('created_at', { ascending: true });

        if (startDate) {
          savingsQuery = savingsQuery.gte('created_at', `${startDate}T00:00:00Z`);
        }
        if (endDate) {
          savingsQuery = savingsQuery.lte('created_at', `${endDate}T23:59:59Z`);
        }

        const { data: savData, error: savErr } = await savingsQuery;
        if (savErr) throw new Error(savErr.message);
        savingsEntries = savData || [];
      }

      // 4. Generate & Trigger Print
      printStatement({
        statementType,
        customer: targetCust,
        account: custAcc,
        savingsAccount: custSav,
        ledgerEntries: ledgerEntries || [],
        savingsEntries,
        dateRange: {
          startDate,
          endDate,
        },
      });

      toast.success('Statement generated and print dialog opened.');
      onClose();
    } catch (err) {
      console.error('Failed to generate print statement:', err);
      toast.error(err.message || 'Failed to generate print statement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print Customer Statement"
      footer={
        <div className="flex items-center justify-between w-full font-sans">
          <span className="text-[11px] text-slate-400">
            Professional A4 formatted print & PDF export
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handlePrint} disabled={loading} icon={Printer}>
              {loading ? 'Preparing Statement...' : 'Print Statement'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 font-sans text-xs">
        {/* Customer Selection (if multiple customers available) */}
        {(!customer || customers.length > 1) && (
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              Customer Account
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none"
            >
              <option value="">-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) - {c.account?.account_number || 'SMS-ACC'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Selected Customer Current Balances Banner */}
        {selectedCust && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Outstanding Dues</div>
                <div className="font-bold text-xs font-mono text-rose-600">
                  {formatRupees(currentOutstanding)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <PiggyBank className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Customer Savings</div>
                <div className="font-bold text-xs font-mono text-emerald-700">
                  {formatRupees(currentSavings)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statement Type Radio Cards */}
        <div>
          <label className="block font-semibold text-slate-700 mb-2">
            Statement Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option 1: Lending Statement Only (Default) */}
            <label
              className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                statementType === 'lending'
                  ? 'bg-blue-50/50 border-brand-primary ring-2 ring-brand-primary/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="statementType"
                value="lending"
                checked={statementType === 'lending'}
                onChange={() => setStatementType('lending')}
                className="mt-0.5 text-brand-primary focus:ring-brand-primary"
              />
              <div className="space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Receipt className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Lending Statement Only</span>
                  <span className="ml-auto text-[9.5px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-semibold">
                    Default
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 leading-normal">
                  Print lending, payments and outstanding transactions only. Keeps the traditional customer khata ledger clean.
                </div>
              </div>
            </label>

            {/* Option 2: Full Account Statement */}
            <label
              className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                statementType === 'full'
                  ? 'bg-emerald-50/50 border-emerald-600 ring-2 ring-emerald-600/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="statementType"
                value="full"
                checked={statementType === 'full'}
                onChange={() => setStatementType('full')}
                className="mt-0.5 text-emerald-600 focus:ring-emerald-600"
              />
              <div className="space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Full Account Statement</span>
                </div>
                <div className="text-[11px] text-slate-500 leading-normal">
                  Include lending, savings and bills paid using savings in clearly separated sections (NEVER combined balance).
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Date Range Filtering */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Statement Period
            </span>
            <div className="flex gap-1">
              {[
                { id: 'all_time', label: 'All Time' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_30_days', label: 'Last 30 Days' },
                { id: 'custom', label: 'Custom' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetChange(p.id)}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition-all ${
                    periodPreset === p.id
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {periodPreset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5 font-semibold">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs font-medium"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5 font-semibold">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs font-medium"
                />
              </div>
            </div>
          )}
        </div>

        {/* Information Callout */}
        <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            {statementType === 'lending'
              ? 'Lending Statement prints date, customer, description, amount given, payments received, and running outstanding balance.'
              : 'Full Account Statement includes Section A (Lending/Outstanding), Section B (Customer Savings), Section C (Bills Paid Using Savings), and independent summaries.'}
          </span>
        </div>
      </div>
    </Modal>
  );
}
