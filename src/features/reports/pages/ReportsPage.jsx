import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Calendar,
  IndianRupee,
  TrendingUp,
  ArrowDownRight,
  Download,
  RefreshCw,
  Users,
  Filter,
  Clock,
  Printer,
  FileSpreadsheet,
  Search,
  ChevronDown,
} from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import DataTable from '../../../components/common/DataTable';
import StatCard from '../../../components/common/StatCard';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';
import StatusBadge from '../../../components/common/StatusBadge';
import SearchBar from '../../../components/common/SearchBar';
import { reportsApi } from '../../../services/api/reports';
import { customerApi } from '../../../services/api/customers';
import { formatRupees } from '../../../utils/currency';
import { formatDate, formatDateTime, getTodayISO } from '../../../utils/date';
import { exportToCSV, printReport } from '../../../utils/export';
import { useToast } from '../../../context/ToastContext';
import ReportTimelineModal from '../components/ReportTimelineModal';
import { supabase } from '../../../lib/supabase';

export default function ReportsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('ledger');

  // Customers list for dropdown
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('all');

  // Date Presets & Custom Range
  const [datePreset, setDatePreset] = useState('today');
  const [dateRange, setDateRange] = useState(() => {
    const today = getTodayISO();
    return { startDate: today, endDate: today };
  });

  // Additional Filters
  const [entryTypeFilter, setEntryTypeFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Report Data
  const [reportData, setReportData] = useState(null);

  // State for Outstanding Report
  const [outstandingData, setOutstandingData] = useState(null);
  const [outstandingSort, setOutstandingSort] = useState('outstanding_desc');
  const [outstandingSearch, setOutstandingSearch] = useState('');

  // Modal State
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch initial customers list
  useEffect(() => {
    customerApi.getCustomers().then((res) => {
      setCustomers(res.data || []);
    });
  }, []);

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === 'custom') return;

    const today = new Date();
    const start = new Date(today);
    const end = new Date(today);

    if (preset === 'yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (preset === 'thisWeek') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
    } else if (preset === 'thisMonth') {
      start.setDate(1);
    }

    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    });
  };

  const fetchLedgerReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsApi.getLedgerReport(dateRange.startDate, dateRange.endDate, selectedCustomerId);
      setReportData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch ledger report');
      toast.error('Failed to fetch ledger report');
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate, selectedCustomerId, toast]);

  const fetchOutstandingReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsApi.getOutstandingReport(outstandingSort, outstandingSearch);
      setOutstandingData(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch outstanding report');
      toast.error('Failed to fetch outstanding report');
    } finally {
      setLoading(false);
    }
  }, [outstandingSort, outstandingSearch, toast]);

  useEffect(() => {
    if (activeTab === 'ledger') {
      fetchLedgerReport();
    } else if (activeTab === 'outstanding') {
      fetchOutstandingReport();
    }
  }, [activeTab, fetchLedgerReport, fetchOutstandingReport]);

  // Realtime updates subscription
  useEffect(() => {
    const channelId = `reports-changes-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, () => {
        if (activeTab === 'ledger') fetchLedgerReport();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_accounts' }, () => {
        if (activeTab === 'outstanding') fetchOutstandingReport();
      })
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeTab, fetchLedgerReport, fetchOutstandingReport]);

  // Filter raw entries based on combined client-side filters
  const filteredEntries = useMemo(() => {
    if (!reportData?.entries) return [];

    return reportData.entries.filter((row) => {
      if (entryTypeFilter !== 'all' && row.entry_type !== entryTypeFilter) return false;
      if (paymentMethodFilter !== 'all' && (row.payment_method || 'Cash') !== paymentMethodFilter) return false;
      if (minAmount && Number(row.amount) < Number(minAmount)) return false;
      if (maxAmount && Number(row.amount) > Number(maxAmount)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const custName = (row.customer_name || '').toLowerCase();
        const desc = (row.description || '').toLowerCase();
        const ref = (row.reference_no || '').toLowerCase();
        if (!custName.includes(q) && !desc.includes(q) && !ref.includes(q)) return false;
      }
      return true;
    });
  }, [reportData?.entries, entryTypeFilter, paymentMethodFilter, minAmount, maxAmount, searchQuery]);

  // Recalculate dynamic summary totals based on combined filters
  const dynamicTotals = useMemo(() => {
    let credit = 0;
    let debit = 0;
    let adjustment = 0;
    let maxVal = 0;

    const distinctCusts = new Set();

    filteredEntries.forEach((row) => {
      const amt = Number(row.amount) || 0;
      if (amt > maxVal) maxVal = amt;
      if (row.customer_id) distinctCusts.add(row.customer_id);

      if (row.entry_type === 'credit' || row.entry_type === 'opening_balance') {
        credit += amt;
      } else if (row.entry_type === 'debit') {
        debit += amt;
      } else if (row.entry_type === 'adjustment') {
        adjustment += amt;
      }
    });

    const net = credit + adjustment - debit;
    const count = filteredEntries.length;
    const avg = count > 0 ? (credit + debit) / count : 0;

    return {
      total_credit: credit,
      total_debit: debit,
      total_adjustment: adjustment,
      net_balance: net,
      entry_count: count,
      total_customers: distinctCusts.size,
      avg_transaction_value: avg,
      max_transaction_value: maxVal,
    };
  }, [filteredEntries]);

  // Export handlers for Ledger Report
  const handleExportLedgerCSV = () => {
    const cols = [
      { header: 'Date & Time', accessor: (r) => formatDateTime(r.created_at) },
      { header: 'Customer Name', accessorKey: 'customer_name' },
      { header: 'Phone', accessorKey: 'customer_phone' },
      { header: 'Entry Type', accessorKey: 'entry_type' },
      { header: 'Payment Method', accessor: (r) => r.payment_method || 'Cash' },
      { header: 'Reference No', accessorKey: 'reference_no' },
      { header: 'Particulars / Description', accessorKey: 'description' },
      { header: 'Amount (₹)', accessorKey: 'amount' },
    ];
    exportToCSV('Ledger_Report', cols, filteredEntries);
  };

  const handlePrintLedger = () => {
    const cols = [
      { header: 'Date', render: (r) => formatDate(r.created_at) },
      { header: 'Customer', accessorKey: 'customer_name' },
      { header: 'Type', accessorKey: 'entry_type' },
      { header: 'Method', render: (r) => r.payment_method || 'Cash' },
      { header: 'Ref No', accessorKey: 'reference_no' },
      { header: 'Particulars', accessorKey: 'description' },
      { header: 'Amount', render: (r) => formatRupees(r.amount) },
    ];
    const meta = {
      'Date Range': `${dateRange.startDate} to ${dateRange.endDate}`,
      'Total Amount Given': formatRupees(dynamicTotals.total_credit),
      'Total Payments Received': formatRupees(dynamicTotals.total_debit),
      'Net Outstanding': formatRupees(dynamicTotals.net_balance),
      'Total Transactions': dynamicTotals.entry_count,
    };
    printReport('Ledger Statement Report', meta, cols, filteredEntries);
  };

  // Export handlers for Outstanding Report
  const handleExportOutstandingCSV = () => {
    const cols = [
      { header: 'Customer Name', accessorKey: 'name' },
      { header: 'Phone Number', accessorKey: 'phone' },
      { header: 'Account Number', accessor: (r) => r.account?.account_number || '-' },
      { header: 'Outstanding Balance (₹)', accessor: (r) => r.account?.outstanding_balance || 0 },
      { header: 'Total Paid (₹)', accessor: (r) => r.account?.total_paid || 0 },
      { header: 'Total Given (₹)', accessor: (r) => r.account?.total_credit || 0 },
      { header: 'Account Status', accessorKey: 'status' },
    ];
    exportToCSV('Outstanding_Customer_Report', cols, outstandingData || []);
  };

  const handlePrintOutstanding = () => {
    const cols = [
      { header: 'Customer Name', accessorKey: 'name' },
      { header: 'Phone', accessorKey: 'phone' },
      { header: 'Account No', render: (r) => r.account?.account_number || '-' },
      { header: 'Total Given', render: (r) => formatRupees(r.account?.total_credit || 0) },
      { header: 'Total Paid', render: (r) => formatRupees(r.account?.total_paid || 0) },
      { header: 'Outstanding Dues', render: (r) => formatRupees(r.account?.outstanding_balance || 0) },
      { header: 'Status', render: (r) => (r.status || 'ACTIVE').toUpperCase() },
    ];
    const totalOut = (outstandingData || []).reduce((acc, c) => acc + Number(c.account?.outstanding_balance || 0), 0);
    const meta = {
      'Report Type': 'Customer Outstanding Dues Statement',
      'Total Accounts': (outstandingData || []).length,
      'Total Outstanding Dues': formatRupees(totalOut),
    };
    printReport('Outstanding Customer Statement', meta, cols, outstandingData || []);
  };

  // Ledger Table Columns
  const ledgerColumns = [
    {
      header: 'Date & Time',
      render: (row) => (
        <span className="text-xs text-slate-600 font-mono whitespace-nowrap">{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      header: 'Customer',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.customer_name || 'Unknown'}</div>
          {row.customer_phone && <div className="text-[10px] text-slate-400 font-mono">{row.customer_phone}</div>}
        </div>
      ),
    },
    {
      header: 'Entry Type',
      align: 'center',
      render: (row) => {
        const type = row.entry_type?.toLowerCase();
        if (type === 'debit') {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Payment Received (-)
            </span>
          );
        } else if (type === 'adjustment') {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Adjustment
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Amount Given (+)
          </span>
        );
      },
    },
    {
      header: 'Payment Method',
      render: (row) => (
        <span className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-700">
          {row.payment_method === 'Other' ? row.other_payment_method || 'Other' : row.payment_method || 'Cash'}
        </span>
      ),
    },
    {
      header: 'Ref No',
      render: (row) => <span className="text-slate-600 font-mono text-xs">{row.reference_no || '-'}</span>,
    },
    {
      header: 'Particulars',
      render: (row) => (
        <span className="text-slate-800 text-xs font-medium max-w-[180px] block truncate" title={row.description}>
          {row.description || '-'}
        </span>
      ),
    },
    {
      header: 'Amount Given (+)',
      align: 'right',
      render: (row) => {
        if (row.entry_type === 'debit') return <span className="text-slate-300">-</span>;
        return <span className="font-mono font-bold text-rose-600">+{formatRupees(row.amount)}</span>;
      },
    },
    {
      header: 'Payment Received (-)',
      align: 'right',
      render: (row) => {
        if (row.entry_type !== 'debit') return <span className="text-slate-300">-</span>;
        return <span className="font-mono font-bold text-emerald-600">-{formatRupees(row.amount)}</span>;
      },
    },
  ];

  // Outstanding Table Columns
  const outstandingColumns = [
    {
      header: 'Customer',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900">{row.name}</div>
          {row.email && <div className="text-[10px] text-slate-400">{row.email}</div>}
        </div>
      ),
    },
    {
      header: 'Phone Number',
      render: (row) => <span className="font-mono text-slate-700">{row.phone || '-'}</span>,
    },
    {
      header: 'Account No',
      render: (row) => <span className="font-mono text-slate-500">{row.account?.account_number || '-'}</span>,
    },
    {
      header: 'Total Amount Given',
      align: 'right',
      render: (row) => <span className="font-mono text-slate-700">{formatRupees(row.account?.total_credit || 0)}</span>,
    },
    {
      header: 'Total Payments Received',
      align: 'right',
      render: (row) => <span className="font-mono text-emerald-600 font-semibold">{formatRupees(row.account?.total_paid || 0)}</span>,
    },
    {
      header: 'Outstanding Dues',
      align: 'right',
      render: (row) => {
        const amt = Number(row.account?.outstanding_balance || 0);
        return (
          <span className={`font-mono font-bold ${amt > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
            {formatRupees(amt)}
          </span>
        );
      },
    },
    {
      header: 'Account Status',
      align: 'center',
      render: (row) => <StatusBadge status={row.status || 'active'} label={(row.status || 'active').toUpperCase()} />,
    },
  ];

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Page Header */}
      <PageHeader
        title="Business Reports & Statements"
        description="Generate live date-filtered ledger statements, outstanding balances, and exportable financial audits."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsTimelineOpen(true)}
              icon={Clock}
              title="Open Chronological Timeline"
            >
              Timeline History
            </Button>
            {activeTab === 'ledger' ? (
              <>
                <Button variant="secondary" onClick={handleExportLedgerCSV} icon={FileSpreadsheet}>
                  Export CSV
                </Button>
                <Button variant="primary" onClick={handlePrintLedger} icon={Printer}>
                  Print Statement
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={handleExportOutstandingCSV} icon={FileSpreadsheet}>
                  Export CSV
                </Button>
                <Button variant="primary" onClick={handlePrintOutstanding} icon={Printer}>
                  Print Statement
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'ledger' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Ledger Statement Report
        </button>
        <button
          onClick={() => setActiveTab('outstanding')}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'outstanding' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Customer Outstanding Report
        </button>
      </div>

      {activeTab === 'ledger' ? (
        <div className="space-y-6">
          {/* Filter Card */}
          <Card className="p-4 shadow-xs border-slate-200 bg-white rounded-xl space-y-4">
            {/* Top row: Customer, Date presets, Custom date range, Generate button */}
            <div className="flex flex-col lg:flex-row gap-4 items-end justify-between border-b border-slate-100 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 flex-1 w-full">
                {/* Customer Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Customer Account</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                  >
                    <option value="all">✔ All Customers</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Entry Type Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Entry Type</label>
                  <select
                    value={entryTypeFilter}
                    onChange={(e) => setEntryTypeFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                  >
                    <option value="all">All Entry Types</option>
                    <option value="credit">Amount Given (+)</option>
                    <option value="debit">Payment Received (-)</option>
                    <option value="adjustment">Adjustments</option>
                    <option value="opening_balance">Opening Balance</option>
                  </select>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                  >
                    <option value="all">All Methods</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bottom row: Date presets, Min/Max amount, Search bar, Generate Button */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 mr-1">Period:</span>
                {['today', 'yesterday', 'thisWeek', 'thisMonth', 'custom'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleDatePresetChange(preset)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      datePreset === preset
                        ? 'bg-brand-primary text-white border-brand-primary shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset === 'thisWeek'
                      ? 'This Week'
                      : preset === 'thisMonth'
                      ? 'This Month'
                      : preset.charAt(0).toUpperCase() + preset.slice(1)}
                  </button>
                ))}
              </div>

              {datePreset === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              )}

              {/* Search & Action */}
              <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                <SearchBar placeholder="Search particulars, ref no..." value={searchQuery} onChange={setSearchQuery} className="w-48" />
                <Button variant="primary" onClick={fetchLedgerReport} disabled={loading}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Generate
                </Button>
              </div>
            </div>
          </Card>

          {/* Dynamic Report Summary Header (8 StatCards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Amount Given"
              value={formatRupees(dynamicTotals.total_credit)}
              icon={TrendingUp}
              trend="+ Added Dues"
              iconBg="bg-rose-50 text-rose-600"
            />
            <StatCard
              title="Total Payments Received"
              value={formatRupees(dynamicTotals.total_debit)}
              icon={ArrowDownRight}
              trend="- Payments Settled"
              iconBg="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              title="Total Adjustments"
              value={formatRupees(dynamicTotals.total_adjustment)}
              icon={Filter}
              iconBg="bg-amber-50 text-amber-600"
            />
            <StatCard
              title="Net Outstanding Change"
              value={formatRupees(dynamicTotals.net_balance)}
              icon={IndianRupee}
              trend={dynamicTotals.net_balance >= 0 ? 'Dues Increased' : 'Dues Decreased'}
              iconBg="bg-blue-50 text-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Customers"
              value={dynamicTotals.total_customers.toString()}
              icon={Users}
              iconBg="bg-slate-100 text-slate-700"
            />
            <StatCard
              title="Transactions Count"
              value={dynamicTotals.entry_count.toString()}
              icon={FileText}
              iconBg="bg-slate-100 text-slate-700"
            />
            <StatCard
              title="Average Transaction"
              value={formatRupees(dynamicTotals.avg_transaction_value)}
              icon={IndianRupee}
              iconBg="bg-purple-50 text-purple-600"
            />
            <StatCard
              title="Largest Transaction"
              value={formatRupees(dynamicTotals.max_transaction_value)}
              icon={TrendingUp}
              iconBg="bg-indigo-50 text-indigo-600"
            />
          </div>

          {/* Ledger Table */}
          <Card className="shadow-xs border-slate-200 bg-white rounded-xl overflow-hidden p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                Itemized Ledger Statement ({filteredEntries.length} entries)
              </h3>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <EmptyState title="Error Loading Report" description={error} icon={FileText} actionLabel="Retry" onAction={fetchLedgerReport} />
            ) : filteredEntries.length === 0 ? (
              <EmptyState title="No Ledger Entries Found" description="No transactions match the selected filter criteria." icon={FileText} />
            ) : (
              <DataTable columns={ledgerColumns} data={filteredEntries} />
            )}
          </Card>
        </div>
      ) : (
        /* Outstanding Report Tab */
        <div className="space-y-6">
          <Card className="p-4 shadow-xs border-slate-200 bg-white rounded-xl">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <SearchBar placeholder="Search customer name, phone..." value={outstandingSearch} onChange={setOutstandingSearch} className="w-full sm:w-72" />
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Sort By:</span>
                <select
                  value={outstandingSort}
                  onChange={(e) => setOutstandingSort(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="outstanding_desc">Highest Outstanding</option>
                  <option value="outstanding_asc">Lowest Outstanding</option>
                  <option value="name_asc">Alphabetically (A-Z)</option>
                  <option value="newest">Newest Customer</option>
                  <option value="oldest">Oldest Customer</option>
                </select>
                <Button variant="primary" onClick={fetchOutstandingReport} disabled={loading}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </Card>

          <Card className="shadow-xs border-slate-200 bg-white rounded-xl overflow-hidden p-4">
            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <EmptyState title="Error Loading Outstanding Report" description={error} icon={FileText} actionLabel="Retry" onAction={fetchOutstandingReport} />
            ) : !outstandingData || outstandingData.length === 0 ? (
              <EmptyState title="No Outstanding Customer Accounts" description="All customer accounts are clear of pending dues." icon={FileText} />
            ) : (
              <DataTable columns={outstandingColumns} data={outstandingData} />
            )}
          </Card>
        </div>
      )}

      {/* Chronological Timeline Modal */}
      <ReportTimelineModal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        entries={filteredEntries}
        title={`Chronological Timeline (${dateRange.startDate} to ${dateRange.endDate})`}
      />
    </div>
  );
}
