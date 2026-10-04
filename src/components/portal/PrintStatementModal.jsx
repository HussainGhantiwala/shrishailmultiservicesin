import React, { useState, useEffect, useMemo } from 'react';
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
  Users,
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
  const [selectedCustomerId, setSelectedCustomerId] = useState('all');
  const [periodPreset, setPeriodPreset] = useState('all_time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerList, setCustomerList] = useState(customers || []);

  useEffect(() => {
    if (customers && customers.length > 0) {
      setCustomerList(customers);
    } else if (isOpen) {
      supabase
        .from('customers')
        .select(`
          *,
          account:customer_accounts(*),
          savings_account:customer_savings_accounts(*)
        `)
        .order('name', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            setCustomerList(
              data.map((c) => ({
                ...c,
                account: Array.isArray(c.account) ? c.account[0] : c.account,
                savings_account: Array.isArray(c.savings_account) ? c.savings_account[0] : c.savings_account,
              }))
            );
          }
        });
    }
  }, [isOpen, customers]);

  useEffect(() => {
    if (isOpen) {
      setStatementType(initialStatementType || 'lending');
      if (customer?.id) {
        setSelectedCustomerId(customer.id);
      } else {
        setSelectedCustomerId('all');
      }
      setPeriodPreset('all_time');
      setStartDate('');
      setEndDate('');
    }
  }, [isOpen, customer, initialStatementType]);

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

  const isAll = selectedCustomerId === 'all';

  // Consolidated aggregate summary across all customers
  const aggregateSummary = useMemo(() => {
    if (!isAll) return null;
    let totalOut = 0;
    let totalAdv = 0;
    let totalSav = 0;
    let activeSavers = 0;

    customerList.forEach((c) => {
      const rawBal = (Number(c.account?.total_credit || 0)) - (Number(c.account?.total_debit || 0));
      const out = c.account?.advance_balance !== undefined && c.account?.advance_balance !== null
        ? Math.max(0, Number(c.account?.outstanding_balance || 0))
        : Math.max(0, rawBal);
      const adv = c.account?.advance_balance !== undefined && c.account?.advance_balance !== null
        ? Math.max(0, Number(c.account?.advance_balance || 0))
        : Math.max(0, -rawBal);
      const sav = Number(c.savings_account?.savings_balance || 0);

      totalOut += out;
      totalAdv += adv;
      totalSav += sav;
      if (sav > 0) activeSavers++;
    });

    return {
      count: customerList.length,
      totalOutstanding: totalOut,
      totalAdvance: totalAdv,
      netReceivable: totalOut - totalAdv,
      totalSavings: totalSav,
      activeSavers,
    };
  }, [isAll, customerList]);

  // Selected individual customer
  const selectedCust = !isAll
    ? (customerList.find((c) => c.id === selectedCustomerId) || customer)
    : null;
  const currentOutstanding = Number(selectedCust?.account?.outstanding_balance || 0);
  const currentSavings = Number(selectedCust?.savings_account?.savings_balance || 0);

  const handlePrint = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer or choose "All Customers".');
      return;
    }

    setLoading(true);

    try {
      if (selectedCustomerId === 'all') {
        // ====================================================================
        // CONSOLIDATED ALL-CUSTOMERS FETCH
        // ====================================================================
        const { data: allCusts, error: custErr } = await supabase
          .from('customers')
          .select(`
            *,
            account:customer_accounts(*),
            savings_account:customer_savings_accounts(*)
          `)
          .order('name', { ascending: true });

        if (custErr) throw new Error(custErr.message);

        const normalizedCusts = (allCusts || []).map((c) => ({
          ...c,
          account: Array.isArray(c.account) ? c.account[0] : c.account,
          savings_account: Array.isArray(c.savings_account) ? c.savings_account[0] : c.savings_account,
        }));

        let ledgerQuery = supabase
          .from('ledger_entries')
          .select(`
            *,
            customer:customers(id, name, phone)
          `)
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

        // Fetch prior ledger entries if date-filtered
        let priorLedgerEntries = [];
        if (startDate) {
          const { data: priorLedger } = await supabase
            .from('ledger_entries')
            .select('customer_id, entry_type, amount, payment_method')
            .eq('is_deleted', false)
            .lt('created_at', `${startDate}T00:00:00Z`);
          if (priorLedger) priorLedgerEntries = priorLedger;
        }

        // Fetch savings transactions if full statement
        let savingsEntries = [];
        let priorSavingsEntries = [];
        if (statementType === 'full') {
          let savingsQuery = supabase
            .from('customer_savings_transactions')
            .select(`
              *,
              customer:customers(id, name, phone)
            `)
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

          if (startDate) {
            const { data: priorSav } = await supabase
              .from('customer_savings_transactions')
              .select('customer_id, transaction_type, amount')
              .eq('is_deleted', false)
              .lt('created_at', `${startDate}T00:00:00Z`);
            if (priorSav) priorSavingsEntries = priorSav;
          }
        }

        printStatement({
          isAllCustomers: true,
          statementType,
          customers: normalizedCusts,
          ledgerEntries: ledgerEntries || [],
          priorLedgerEntries,
          savingsEntries,
          priorSavingsEntries,
          dateRange: {
            startDate,
            endDate,
          },
        });

        toast.success('Consolidated all-customers statement opened.');
        onClose();
      } else {
        // ====================================================================
        // INDIVIDUAL CUSTOMER FETCH (Existing untouched flow)
        // ====================================================================
        const cid = selectedCustomerId;
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

        printStatement({
          isAllCustomers: false,
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

        toast.success('Customer statement opened.');
        onClose();
      }
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
              {loading ? 'Preparing Statement...' : isAll ? 'Print All Customers' : 'Print Statement'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 font-sans text-xs">
        {/* Customer Selection Dropdown */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            Customer Account <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none font-medium text-slate-800"
          >
            <option value="all">-- All Customers --</option>
            <option disabled className="text-slate-300">────────────────────────────────</option>
            {customerList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone || 'No Phone'}) - {c.account?.account_number || 'SMS-ACC'}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Customer Current Balances Banner */}
        {isAll ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Accounts</div>
                <div className="font-bold text-xs font-mono text-slate-800">
                  {aggregateSummary?.count || 0} Accounts
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Outstanding</div>
                <div className="font-bold text-xs font-mono text-rose-600">
                  {formatRupees(aggregateSummary?.totalOutstanding || 0)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Customer Credits</div>
                <div className="font-bold text-xs font-mono text-emerald-700">
                  {formatRupees(aggregateSummary?.totalAdvance || 0)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <PiggyBank className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Savings Held</div>
                <div className="font-bold text-xs font-mono text-teal-700">
                  {formatRupees(aggregateSummary?.totalSavings || 0)}
                </div>
              </div>
            </div>
          </div>
        ) : selectedCust ? (
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
        ) : null}

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
                  Print lending, payments and outstanding transactions only. Keeps the khata ledger clean.
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

        {/* Statement Period Presets */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Statement Period
          </label>
          <div className="grid grid-cols-4 gap-2">
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
                className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${
                  periodPreset === p.id
                    ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {periodPreset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 mt-2.5 pt-2.5 border-t border-slate-100">
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
