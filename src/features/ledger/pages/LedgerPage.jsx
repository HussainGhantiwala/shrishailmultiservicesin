import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { customerApi } from '../../../services/api/customers';
import { ledgerApi } from '../../../services/api/ledger';
import { formatRupees } from '../../../utils/currency';
import { formatDate, formatTime } from '../../../utils/date';
import {
  Plus,
  Printer,
  FileSpreadsheet,
  Trash2,
  RotateCcw,
  Edit3,
  History,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Bookmark,
  CheckCircle2,
  Receipt,
  Calendar,
} from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import StatusBadge from '../../../components/common/StatusBadge';
import StatCard from '../../../components/common/StatCard';
import LedgerFormModal from '../components/LedgerFormModal';
import LedgerAuditHistoryModal from '../components/LedgerAuditHistoryModal';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import ReceiptShareModal from '../../../components/common/ReceiptShareModal';

export default function LedgerPage() {
  const { user, isAdmin, isStaff, isCustomer } = useAuth();
  const toast = useToast();

  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [ledgerData, setLedgerData] = useState([]);
  const [receiptTarget, setReceiptTarget] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isNewReceipt, setIsNewReceipt] = useState(false);
  const [balances, setBalances] = useState({ totalCredit: 0, totalDebit: 0, totalPaid: 0, totalAdjustment: 0, outstandingBalance: 0 });
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [auditEntityId, setAuditEntityId] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Confirmation dialogs
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [restoreTargetId, setRestoreTargetId] = useState(null);

  // Helper to fetch and sync fresh customer accounts
  const fetchCustomers = async () => {
    try {
      const res = await customerApi.getCustomers();
      const list = res.data || [];
      setCustomers(list);
      return list;
    } catch (err) {
      console.error('Failed to load customers:', err);
      return [];
    }
  };

  // Default selected customer to 'all' for admin/staff, or first customer for customer role
  useEffect(() => {
    fetchCustomers().then(() => {
      if (!selectedCustomerId) {
        setSelectedCustomerId('all');
      }
    });
  }, []);

  // Fetch ledger entries whenever customer or filters change
  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await ledgerApi.getLedgerEntries(selectedCustomerId, {
        searchQuery,
        entryType: entryTypeFilter,
        startDate,
        endDate,
        showDeleted,
      });
      setLedgerData(res.data || []);
      setBalances(res.balances || { totalCredit: 0, totalDebit: 0, totalPaid: 0, totalAdjustment: 0, outstandingBalance: 0, activeCustomerCount: 0 });
    } catch (err) {
      toast.error(err.message || 'Failed to load ledger entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [selectedCustomerId, searchQuery, entryTypeFilter, startDate, endDate, showDeleted]);

  // Selected customer details
  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId === 'all') return { name: 'All Customers', account: { account_number: 'ALL-ACCOUNTS' }, status: 'active' };
    return customers.find((c) => c.id === selectedCustomerId) || customers[0] || {};
  }, [customers, selectedCustomerId]);

  // Form Submit Handler (Add / Edit)
  const handleSaveEntry = async (formData) => {
    setSubmitting(true);
    try {
      if (entryToEdit) {
        await ledgerApi.updateLedgerEntry(entryToEdit.id, formData, user, 'Updated via Ledger Screen');
        toast.success('Ledger entry updated successfully.');
        await fetchCustomers();
      } else {
        const res = await ledgerApi.addLedgerEntry(formData, user);
        toast.success('New ledger entry recorded.');

        // Refresh customer list so that all accounts are up to date with new balance
        const freshList = await fetchCustomers();
        const freshCust = freshList.find((c) => c.id === formData.customer_id) || customers.find((c) => c.id === formData.customer_id) || selectedCustomer;

        if (res?.data) {
          // Authoritative outstanding balance is returned from customer_accounts after DB trigger execution
          const authoritativeBalance = res.account?.outstanding_balance !== undefined
            ? Number(res.account.outstanding_balance)
            : freshCust?.account?.outstanding_balance !== undefined
            ? Number(freshCust.account.outstanding_balance)
            : undefined;

          const mergedCustomer = {
            ...freshCust,
            account: res.account || freshCust?.account,
          };

          setReceiptTarget({
            entry: res.data,
            customer: mergedCustomer,
            outstandingBalance: authoritativeBalance,
          });
          setIsNewReceipt(true);
          setIsReceiptModalOpen(true);
        }
      }
      fetchLedger();
    } finally {
      setSubmitting(false);
    }
  };

  // Soft Delete Handler
  const handleSoftDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await ledgerApi.softDeleteEntry(deleteTargetId, user, 'Soft-deleted by Admin');
      toast.success('Ledger entry soft-deleted.');
      setDeleteTargetId(null);
      await fetchCustomers();
      fetchLedger();
    } catch (err) {
      toast.error(err.message || 'Failed to soft-delete entry');
    }
  };

  // Restore Handler
  const handleRestore = async () => {
    if (!restoreTargetId) return;
    try {
      await ledgerApi.restoreEntry(restoreTargetId, user, 'Restored by Admin');
      toast.success('Soft-deleted ledger entry restored.');
      setRestoreTargetId(null);
      await fetchCustomers();
      fetchLedger();
    } catch (err) {
      toast.error(err.message || 'Failed to restore entry');
    }
  };

  // Entry Type Badge Renderer
  const renderTypeBadge = (type, isDeleted) => {
    if (isDeleted) {
      return <StatusBadge status="deleted" type="danger" label="DELETED" />;
    }

    switch (type) {
      case 'credit':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <ArrowUpRight className="w-3 h-3 text-rose-600" />
            Amount Given (+)
          </span>
        );
      case 'debit':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowDownRight className="w-3 h-3 text-emerald-600" />
            Payment Received (-)
          </span>
        );
      case 'adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3 h-3 text-amber-600" />
            Adjustment
          </span>
        );
      case 'opening_balance':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Bookmark className="w-3 h-3 text-blue-600" />
            Opening Bal (+)
          </span>
        );
      default:
        return <StatusBadge status={type} />;
    }
  };

  // Data Table Columns
  const columns = [
    {
      header: 'Date & Time',
      accessorKey: 'created_at',
      render: (row) => (
        <div className={`font-mono text-slate-700 ${row.is_deleted ? 'line-through text-slate-400' : ''}`}>
          <div>{formatDate(row.created_at)}</div>
          <div className="text-[10px] text-slate-400">{formatTime(row.created_at)}</div>
        </div>
      ),
    },
    ...(selectedCustomerId === 'all'
      ? [
          {
            header: 'Customer Account',
            render: (row) => (
              <div>
                <div className="font-semibold text-slate-900">{row.customer?.name || 'Unknown'}</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {row.customer?.phone || ''} • {row.customer?.account?.account_number || '-'}
                </div>
              </div>
            ),
          },
        ]
      : []),
    {
      header: 'Entry Type',
      accessorKey: 'entry_type',
      align: 'center',
      render: (row) => renderTypeBadge(row.entry_type, row.is_deleted),
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
      header: 'Description / Particulars',
      accessorKey: 'description',
      render: (row) => (
        <div className={row.is_deleted ? 'line-through text-slate-400' : ''}>
          <div className="font-semibold text-slate-900">{row.description}</div>
          {row.notes && <div className="text-[10px] text-slate-500">{row.notes}</div>}
        </div>
      ),
    },
    {
      header: 'Ref No',
      accessorKey: 'reference_no',
      render: (row) => (
        <span className={`font-mono ${row.is_deleted ? 'line-through text-slate-400' : 'text-slate-600'}`}>
          {row.reference_no || '-'}
        </span>
      ),
    },
    {
      header: 'Amount Given (+)',
      accessorKey: 'amount',
      align: 'right',
      render: (row) => {
        if (row.entry_type === 'debit') return <span className="text-slate-300">-</span>;
        return (
          <span className={`font-mono font-bold ${row.is_deleted ? 'line-through text-slate-400' : 'text-rose-600'}`}>
            {formatRupees(row.amount)}
          </span>
        );
      },
    },
    {
      header: 'Payment Received (-)',
      accessorKey: 'amount',
      align: 'right',
      render: (row) => {
        if (row.entry_type !== 'debit') return <span className="text-slate-300">-</span>;
        return (
          <span className={`font-mono font-bold ${row.is_deleted ? 'line-through text-slate-400' : 'text-emerald-600'}`}>
            {formatRupees(row.amount)}
          </span>
        );
      },
    },
    {
      header: 'Running Balance',
      accessorKey: 'running_balance',
      align: 'right',
      render: (row) => (
        <span className={`font-mono font-bold ${row.is_deleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
          {formatRupees(row.running_balance || 0)}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          {!row.is_deleted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const targetCust = row.customer || customers.find((c) => c.id === row.customer_id) || selectedCustomer;
                const authoritativeBalance = targetCust?.account?.outstanding_balance !== undefined
                  ? Number(targetCust.account.outstanding_balance)
                  : undefined;
                setReceiptTarget({
                  entry: row,
                  customer: targetCust,
                  outstandingBalance: authoritativeBalance,
                });
                setIsNewReceipt(false);
                setIsReceiptModalOpen(true);
              }}
              icon={Receipt}
              className="text-brand-primary hover:bg-blue-50"
              title="Share Receipt (WhatsApp / Email)"
            />
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAuditEntityId(row.id);
              setIsAuditModalOpen(true);
            }}
            icon={History}
            title="Audit Trail"
          />

          {!isCustomer && !row.is_deleted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEntryToEdit(row);
                setIsFormModalOpen(true);
              }}
              icon={Edit3}
              title="Edit Entry"
            />
          )}

          {isAdmin && !row.is_deleted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTargetId(row.id)}
              icon={Trash2}
              className="text-rose-600 hover:bg-rose-50"
              title="Soft Delete"
            />
          )}

          {isAdmin && row.is_deleted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRestoreTargetId(row.id)}
              icon={RotateCcw}
              className="text-emerald-600 hover:bg-emerald-50"
              title="Restore Entry"
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <PageHeader
        title="Customer General Ledger"
        description="Single source of truth for customer account credits, debits, adjustments, and running balance timeline."
        actions={
          <>
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Print Ledger
            </Button>
            {!isCustomer && (
              <Button
                icon={Plus}
                onClick={() => {
                  setEntryToEdit(null);
                  setIsFormModalOpen(true);
                }}
              >
                Record Entry
              </Button>
            )}
          </>
        }
      />

      {/* Customer Switcher Bar (For Admin & Staff) */}
      {!isCustomer && customers.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Select Customer:</span>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-brand-primary focus:outline-none w-full sm:w-72"
            >
              <option value="all">✔ All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) - {c.account?.account_number || 'ACC-1001'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500 font-mono">
              Account: <strong className="text-slate-800">{selectedCustomer.account?.account_number || 'ALL-ACCOUNTS'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Account Balance Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Outstanding Balance"
          value={formatRupees(balances.outstandingBalance)}
          subtitle={selectedCustomerId === 'all' ? "All Customer Dues" : "Net Pending Customer Dues"}
          iconBg="bg-rose-50 text-rose-600"
          className="border-l-4 border-l-rose-500"
        />
        <StatCard
          title="Total Payments Received"
          value={formatRupees(balances.totalPaid)}
          subtitle={selectedCustomerId === 'all' ? "All Customer Payments" : "Total Customer Settlements"}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Total Amount Given"
          value={formatRupees(balances.totalCredit)}
          subtitle={selectedCustomerId === 'all' ? "All Goods / Credit Supplied" : "Cumulative Material / Services Supplied"}
          iconBg="bg-blue-50 text-blue-600"
        />
        <StatCard
          title={selectedCustomerId === 'all' ? "Active Customers" : "Account Status"}
          value={selectedCustomerId === 'all' ? `${balances.activeCustomerCount || customers.length} Accounts` : (selectedCustomer.status?.toUpperCase() || 'ACTIVE')}
          subtitle={selectedCustomerId === 'all' ? "Total Active Business Accounts" : "Ledger Derived State"}
          iconBg="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Filter & Search Bar (Step 9) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search description, reference no, notes..."
            className="flex-1 max-w-lg"
          />

          <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto justify-end">
            <select
              value={entryTypeFilter}
              onChange={(e) => setEntryTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Entry Types</option>
              <option value="credit">Amount Given (+)</option>
              <option value="debit">Payment Received (-)</option>
              <option value="adjustment">Adjustments</option>
              <option value="opening_balance">Opening Balance</option>
            </select>

            {isAdmin && (
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                  className="rounded text-brand-primary focus:ring-brand-primary"
                />
                <span>Show Soft-Deleted</span>
              </label>
            )}
          </div>
        </div>

        {/* Date Range Inputs */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 focus:outline-none font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 focus:outline-none font-mono"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-brand-primary font-semibold hover:underline"
            >
              Reset Dates
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table Timeline */}
      <DataTable
        columns={columns}
        data={ledgerData}
        isLoading={loading}
        emptyTitle="No ledger entries found"
        emptyDescription="No transaction entries match the selected customer and filters."
      />

      {/* Entry Form Modal */}
      <LedgerFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEntryToEdit(null);
        }}
        onSubmit={handleSaveEntry}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        entryToEdit={entryToEdit}
        isLoading={submitting}
      />

      {/* Audit Trail Modal */}
      <LedgerAuditHistoryModal
        isOpen={isAuditModalOpen}
        onClose={() => {
          setIsAuditModalOpen(false);
          setAuditEntityId(null);
        }}
        entityId={auditEntityId}
      />

      {/* Soft Delete Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleSoftDelete}
        title="Soft Delete Ledger Entry"
        message="Are you sure you want to soft delete this ledger entry? The financial entry will be hidden from normal balance calculations, but retained in the system audit history."
        isDanger={true}
        confirmText="Soft Delete Entry"
      />

      {/* Restore Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(restoreTargetId)}
        onClose={() => setRestoreTargetId(null)}
        onConfirm={handleRestore}
        title="Restore Soft-Deleted Entry"
        message="Restore this soft-deleted financial record back into the customer account running balance calculations?"
        confirmText="Restore Entry"
      />

      {/* Receipt Share Modal */}
      {receiptTarget && (
        <ReceiptShareModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setReceiptTarget(null);
            setIsNewReceipt(false);
          }}
          entry={receiptTarget.entry}
          customer={receiptTarget.customer}
          outstandingBalance={receiptTarget.outstandingBalance}
          isNewEntry={isNewReceipt}
          onCustomerUpdated={(updatedCust) => {
            setCustomers((prev) =>
              prev.map((c) => (c.id === updatedCust.id ? { ...c, ...updatedCust } : c))
            );
          }}
        />
      )}
    </div>
  );
}
