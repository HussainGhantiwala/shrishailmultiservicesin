import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import Button from './Button';
import SearchBar from './SearchBar';
import StatusBadge from './StatusBadge';
import LoadingSpinner from './LoadingSpinner';
import { formatRupees } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { notificationService } from '../../services/api/sms';
import { customerApi } from '../../services/api/customers';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  MessageSquare,
  Users,
  CheckSquare,
  Square,
  Send,
  CheckCircle2,
  XCircle,
  Sparkles,
  Filter,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

const DEFAULT_TEMPLATE =
  'Dear {CustomerName}, gentle reminder from Shrishail Multi Services. Your outstanding balance is {OutstandingAmount} (Acc: {AccountNumber}). Please settle at your earliest convenience. Thank you!';

export default function SendReminderModal({
  isOpen,
  onClose,
  preselectedCustomerId = null,
}) {
  const { user } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(1); // 1: Select, 2: Preview & Compose, 3: Dispatch & Summary
  const [customers, setCustomers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Message compose state
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_TEMPLATE);

  // Dispatching state
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState(0);
  const [dispatchResults, setDispatchResults] = useState(null);

  // Fetch customers on mount
  useEffect(() => {
    if (!isOpen) return;
    setLoadingCustomers(true);
    customerApi
      .getCustomers()
      .then((res) => {
        const list = res.data || [];
        setCustomers(list);

        if (preselectedCustomerId) {
          setSelectedIds([preselectedCustomerId]);
        } else {
          // Preselect customers with positive outstanding balance
          const withDues = list.filter((c) => Number(c.account?.outstanding_balance || 0) > 0).map((c) => c.id);
          setSelectedIds(withDues.length > 0 ? withDues : list.map((c) => c.id));
        }
      })
      .finally(() => setLoadingCustomers(false));
  }, [isOpen, preselectedCustomerId]);

  // Filtered customer table
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = (c.name || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const acc = (c.account?.account_number || '').toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !acc.includes(q)) return false;
      }
      return true;
    });
  }, [customers, search]);

  // Quick Selection Filter Handlers
  const applyQuickFilter = (filterKey) => {
    setActiveFilter(filterKey);
    let ids = [];

    switch (filterKey) {
      case 'all':
        ids = customers.map((c) => c.id);
        break;

      case 'dues_500':
        ids = customers
          .filter((c) => Number(c.account?.outstanding_balance || 0) > 500)
          .map((c) => c.id);
        break;

      case 'dues_1000':
        ids = customers
          .filter((c) => Number(c.account?.outstanding_balance || 0) > 1000)
          .map((c) => c.id);
        break;

      case 'no_pay_7': {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        ids = customers
          .filter((c) => !c.account?.updated_at || new Date(c.account.updated_at) < sevenDaysAgo)
          .map((c) => c.id);
        break;
      }

      case 'highest_dues': {
        const sorted = [...customers].sort(
          (a, b) => Number(b.account?.outstanding_balance || 0) - Number(a.account?.outstanding_balance || 0)
        );
        ids = sorted.slice(0, 5).map((c) => c.id);
        break;
      }

      case 'clear':
        ids = [];
        break;

      default:
        ids = customers.map((c) => c.id);
    }

    setSelectedIds(ids);
  };

  // Selected customer list objects
  const selectedCustomers = useMemo(() => {
    return customers.filter((c) => selectedIds.includes(c.id));
  }, [customers, selectedIds]);

  const totalSelectedDues = useMemo(() => {
    return selectedCustomers.reduce((acc, c) => acc + Number(c.account?.outstanding_balance || 0), 0);
  }, [selectedCustomers]);

  // Checkbox helpers
  const toggleSelectCustomer = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    setSelectedIds(filteredCustomers.map((c) => c.id));
  };

  const handleClearAll = () => {
    setSelectedIds([]);
  };

  // Dispatch Loop
  const handleStartDispatch = async () => {
    if (selectedCustomers.length === 0) return;

    setIsDispatching(true);
    setStep(3);
    setDispatchProgress(0);

    const results = {
      total: selectedCustomers.length,
      successCount: 0,
      failedCount: 0,
      items: [],
    };

    for (let i = 0; i < selectedCustomers.length; i++) {
      const cust = selectedCustomers[i];
      const custName = cust.name || 'Customer';
      const custBalance = formatRupees(cust.account?.outstanding_balance || 0);
      const accNo = cust.account?.account_number || 'ACC-1001';

      // Personalize placeholders
      const personalizedMsg = messageTemplate
        .replace(/{CustomerName}/g, custName)
        .replace(/{OutstandingAmount}/g, custBalance)
        .replace(/{AccountNumber}/g, accNo);

      try {
        const res = await notificationService.sendCustomSMS({
          customerId: cust.id,
          phone: cust.phone,
          message: personalizedMsg,
          currentUser: user,
        });

        if (res.success) {
          results.successCount++;
          results.items.push({ customer: cust, status: 'sent', message: personalizedMsg });
        } else {
          results.failedCount++;
          results.items.push({ customer: cust, status: 'failed', error: res.error || 'Fast2SMS Gateway Error' });
        }
      } catch (err) {
        results.failedCount++;
        results.items.push({ customer: cust, status: 'failed', error: err.message });
      }

      setDispatchProgress(Math.round(((i + 1) / selectedCustomers.length) * 100));
    }

    setDispatchResults(results);
    setIsDispatching(false);
    toast.success(`SMS Reminder Workflow Completed! ${results.successCount} sent, ${results.failedCount} failed.`);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="SMS Payment Reminders & Customer Dispatch Workflow"
      className="max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {step === 2 && (
              <Button variant="secondary" onClick={() => setStep(1)} disabled={isDispatching}>
                ← Back to Selection
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <>
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setStep(2)}
                  disabled={selectedIds.length === 0}
                  icon={ArrowRight}
                >
                  Continue to Preview ({selectedIds.length})
                </Button>
              </>
            )}

            {step === 2 && (
              <Button variant="primary" onClick={handleStartDispatch} disabled={isDispatching} icon={Send}>
                Dispatch SMS Reminders ({selectedIds.length})
              </Button>
            )}

            {step === 3 && (
              <Button variant="primary" onClick={onClose} disabled={isDispatching}>
                Done & Close
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 font-sans text-xs">
        {/* Step Indicator Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-4">
            <span
              className={`font-bold text-xs px-2.5 py-1 rounded-full ${
                step === 1 ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              1. Select Customers ({selectedIds.length})
            </span>
            <span className="text-slate-300">→</span>
            <span
              className={`font-bold text-xs px-2.5 py-1 rounded-full ${
                step === 2 ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              2. Compose & Preview
            </span>
            <span className="text-slate-300">→</span>
            <span
              className={`font-bold text-xs px-2.5 py-1 rounded-full ${
                step === 3 ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              3. Dispatch Audit
            </span>
          </div>
        </div>

        {/* STEP 1: CUSTOMER SELECTION WORKFLOW */}
        {step === 1 && (
          <div className="space-y-3">
            {/* Quick Selection Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-slate-600 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5 text-brand-primary" /> Quick Select:
                </span>
                <button
                  onClick={() => applyQuickFilter('all')}
                  className={`px-2 py-1 rounded font-semibold text-[11px] border ${
                    activeFilter === 'all' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  All Accounts
                </button>
                <button
                  onClick={() => applyQuickFilter('dues_500')}
                  className={`px-2 py-1 rounded font-semibold text-[11px] border ${
                    activeFilter === 'dues_500' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Dues &gt; ₹500
                </button>
                <button
                  onClick={() => applyQuickFilter('dues_1000')}
                  className={`px-2 py-1 rounded font-semibold text-[11px] border ${
                    activeFilter === 'dues_1000' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Dues &gt; ₹1,000
                </button>
                <button
                  onClick={() => applyQuickFilter('highest_dues')}
                  className={`px-2 py-1 rounded font-semibold text-[11px] border ${
                    activeFilter === 'highest_dues' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Top 5 Dues
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handleSelectAll} className="text-brand-primary font-bold hover:underline">
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button onClick={handleClearAll} className="text-rose-600 font-bold hover:underline">
                  Clear
                </button>
              </div>
            </div>

            {/* Counter Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
              <span className="font-semibold text-blue-900">
                {selectedIds.length} Customers Selected for SMS Dispatch
              </span>
              <span className="font-bold text-rose-600 font-mono text-sm">
                Total Outstanding Dues: {formatRupees(totalSelectedDues)}
              </span>
            </div>

            <SearchBar placeholder="Search customer name, phone, account number..." value={search} onChange={setSearch} />

            {/* Customer Table */}
            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl">
              {loadingCustomers ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="py-8 text-center text-slate-500">No matching customer accounts found.</div>
              ) : (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2.5 text-center w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0}
                          onChange={(e) => (e.target.checked ? handleSelectAll() : handleClearAll())}
                          className="rounded border-slate-300 text-brand-primary"
                        />
                      </th>
                      <th className="p-2.5">Customer Name</th>
                      <th className="p-2.5">Phone</th>
                      <th className="p-2.5">Account No</th>
                      <th className="p-2.5 text-right">Outstanding Dues</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredCustomers.map((c) => {
                      const isSelected = selectedIds.includes(c.id);
                      const amt = Number(c.account?.outstanding_balance || 0);

                      return (
                        <tr
                          key={c.id}
                          onClick={() => toggleSelectCustomer(c.id)}
                          className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectCustomer(c.id)}
                              className="rounded border-slate-300 text-brand-primary"
                            />
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">{c.name}</td>
                          <td className="p-2.5 font-mono text-slate-700">+91 {c.phone}</td>
                          <td className="p-2.5 font-mono text-slate-500">{c.account?.account_number || '-'}</td>
                          <td className={`p-2.5 font-mono font-bold text-right ${amt > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                            {formatRupees(amt)}
                          </td>
                          <td className="p-2.5 text-center">
                            <StatusBadge status={c.status} label={c.status.toUpperCase()} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & COMPOSE WORKFLOW */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Message Composer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">Customize SMS Payload</label>
                  <button
                    onClick={() => setMessageTemplate(DEFAULT_TEMPLATE)}
                    className="text-brand-primary text-[11px] font-semibold hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Default
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none font-sans"
                />

                {/* Placeholders helper chips */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">Insert Placeholders:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['{CustomerName}', '{OutstandingAmount}', '{AccountNumber}'].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setMessageTemplate((prev) => `${prev} ${chip}`)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-mono text-[10px] font-bold text-brand-primary"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Selected Recipients Preview */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 block">Recipients Preview ({selectedCustomers.length})</label>
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                  {selectedCustomers.map((c) => (
                    <div key={c.id} className="p-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">+91 {c.phone}</div>
                      </div>
                      <div className="font-mono font-bold text-rose-600">
                        {formatRupees(c.account?.outstanding_balance || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Personalized Sample Preview Card */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
              <span className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Personalized Sample SMS Preview:
              </span>
              <p className="text-slate-800 font-sans italic text-xs">
                "{messageTemplate
                  .replace(/{CustomerName}/g, selectedCustomers[0]?.name || 'John Doe')
                  .replace(/{OutstandingAmount}/g, formatRupees(selectedCustomers[0]?.account?.outstanding_balance || 5000))
                  .replace(/{AccountNumber}/g, selectedCustomers[0]?.account?.account_number || 'ACC-1001')}"
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: DISPATCH PROGRESS & SUMMARY */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            {isDispatching ? (
              <div className="space-y-4 text-center py-6">
                <LoadingSpinner size="lg" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Dispatching SMS Reminders via Fast2SMS...</h4>
                  <p className="text-slate-500 mt-1">Please do not close this window while SMS dispatches are in progress.</p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                  <div
                    className="bg-brand-primary h-3 rounded-full transition-all duration-300"
                    style={{ width: `${dispatchProgress}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-slate-700">{dispatchProgress}% Completed</span>
              </div>
            ) : (
              dispatchResults && (
                <div className="space-y-4">
                  {/* Results Summary Box */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="text-slate-500 font-bold uppercase text-[10px]">Total Attempted</span>
                      <div className="font-bold text-lg text-slate-900 mt-0.5">{dispatchResults.total}</div>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <span className="text-emerald-700 font-bold uppercase text-[10px]">Successful</span>
                      <div className="font-bold text-lg text-emerald-600 mt-0.5">{dispatchResults.successCount}</div>
                    </div>
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                      <span className="text-rose-700 font-bold uppercase text-[10px]">Failed</span>
                      <div className="font-bold text-lg text-rose-600 mt-0.5">{dispatchResults.failedCount}</div>
                    </div>
                  </div>

                  {/* Itemized Audit List */}
                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                    {dispatchResults.items.map((item, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {item.status === 'sent' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          )}
                          <div>
                            <div className="font-bold text-slate-900">{item.customer.name} (+91 {item.customer.phone})</div>
                            <div className="text-[10px] text-slate-500 truncate max-w-md">{item.message || item.error}</div>
                          </div>
                        </div>
                        <StatusBadge
                          status={item.status === 'sent' ? 'success' : 'danger'}
                          label={item.status.toUpperCase()}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
