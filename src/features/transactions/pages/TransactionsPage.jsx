import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { transactionsApi } from '../../../services/api/transactions';
import { customerApi } from '../../../services/api/customers';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import Card from '../../../components/common/Card';
import StatusBadge from '../../../components/common/StatusBadge';
import Modal from '../../../components/common/Modal';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';
import { formatRupees } from '../../../utils/currency';
import { formatDateTime, getRelativeTime } from '../../../utils/date';
import { supabase } from '../../../lib/supabase';
import { Plus, Pencil, Trash2, RotateCcw, Filter, Search, IndianRupee, Receipt, PiggyBank, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import ReceiptShareModal from '../../../components/common/ReceiptShareModal';

export default function TransactionsPage() {
  const { user, isAdmin, canManageCustomers } = useAuth();
  const toast = useToast();

  const [entries, setEntries] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [entryType, setEntryType] = useState('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [receiptTarget, setReceiptTarget] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const initialFormData = {
    customer_id: '',
    entry_type: 'credit',
    amount: '',
    description: '',
    reference_no: '',
    notes: '',
  };
  const [formData, setFormData] = useState(initialFormData);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = { searchQuery: search, entryType, showDeleted, page, pageSize };
      const response = await transactionsApi.getTransactions(filters);
      setEntries(response.data || []);
      setTotalCount(response.count || 0);
    } catch (err) {
      setError('Failed to fetch transactions. Please try again.');
      toast.error('Failed to fetch transactions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, entryType, showDeleted, page, pageSize, toast]);

  const fetchCustomers = async () => {
    try {
      const res = await customerApi.getCustomers();
      setCustomers(res.data || res || []);
    } catch (err) {
      console.error('Failed to fetch customers', err);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const channel = transactionsApi.subscribeToChanges(() => {
      fetchTransactions();
    });
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchTransactions]);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateOpen = () => {
    setFormData(initialFormData);
    setShowCreateModal(true);
  };

  const handleEditOpen = (entry) => {
    setSelectedEntry(entry);
    setFormData({
      customer_id: entry.customer_id || '',
      entry_type: entry.entry_type || 'credit',
      amount: entry.amount || '',
      description: entry.description || '',
      reference_no: entry.reference_no || '',
      notes: entry.notes || '',
    });
    setShowEditModal(true);
  };

  const handleDeleteOpen = (entry) => {
    setSelectedEntry(entry);
    setDeleteReason('');
    setShowDeleteConfirm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.customer_id || !formData.amount || !formData.description) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      const entryData = { ...formData, amount: Number(formData.amount) };
      if (showEditModal && selectedEntry) {
        await transactionsApi.updateTransaction(selectedEntry.id, entryData, user, 'User requested edit');
        toast.success('Transaction updated successfully');
        setShowEditModal(false);
      } else {
        await transactionsApi.createTransaction(entryData, user);
        toast.success('Transaction created successfully');
        setShowCreateModal(false);
      }
      fetchCustomers();
      fetchTransactions();
    } catch (err) {
      toast.error(err.message || 'Failed to save transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteReason) {
      toast.error('Please provide a reason for deletion');
      return;
    }
    setSubmitting(true);
    try {
      await transactionsApi.softDeleteTransaction(selectedEntry, user, deleteReason);
      toast.success('Transaction deleted successfully');
      setShowDeleteConfirm(false);
      fetchCustomers();
      fetchTransactions();
    } catch (err) {
      toast.error(err.message || 'Failed to delete transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async (entry) => {
    try {
      await transactionsApi.restoreTransaction(entry.id, user, 'User requested restore');
      toast.success('Transaction restored successfully');
      fetchCustomers();
      fetchTransactions();
    } catch (err) {
      toast.error(err.message || 'Failed to restore transaction');
    }
  };

  const columns = [
    {
      header: 'Date & Time',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-slate-700 font-medium">{formatDateTime(row.created_at)}</span>
          <span className="text-slate-500 text-[10px]">{getRelativeTime(row.created_at)}</span>
        </div>
      ),
    },
    {
      header: 'Customer',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-slate-800 font-medium">{row.customer?.name || 'Unknown'}</span>
          {row.customer?.phone && <span className="text-slate-500 text-[10px]">{row.customer.phone}</span>}
        </div>
      ),
    },
    {
      header: 'Type',
      render: (row) => {
        if (row.display_type === 'savings_opening') {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              <PiggyBank className="w-3 h-3 text-blue-600" />
              OPENING SAVINGS
            </span>
          );
        }
        if (row.display_type === 'savings_deposit') {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <PiggyBank className="w-3 h-3 text-emerald-600" />
              SAVINGS DEPOSIT (+)
            </span>
          );
        }
        if (row.display_type === 'savings_withdrawal') {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
              <ArrowDownRight className="w-3 h-3 text-purple-600" />
              SAVINGS WITHDRAWAL (-)
            </span>
          );
        }
        if (row.display_type === 'savings_bill_payment') {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
              <Receipt className="w-3 h-3 text-amber-700" />
              SAVINGS BILL PAYMENT
            </span>
          );
        }
        return (
          <StatusBadge
            status={
              row.entry_type === 'credit'
                ? 'danger'
                : row.entry_type === 'debit'
                ? 'success'
                : row.entry_type === 'adjustment'
                ? 'warning'
                : 'info'
            }
            label={
              row.entry_type === 'credit'
                ? 'AMOUNT GIVEN (+)'
                : row.entry_type === 'debit'
                ? 'PAYMENT RECEIVED (-)'
                : row.entry_type === 'adjustment'
                ? 'ADJUSTMENT'
                : 'OPENING BAL (+)'
            }
          />
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
      header: 'Description',
      accessorKey: 'description',
    },
    {
      header: 'Reference',
      render: (row) => row.reference_no || '-',
    },
    {
      header: 'Balance Impact',
      render: (row) => {
        if (row.category === 'savings') {
          return (
            <div className="flex flex-col text-[11px]">
              <span className="text-slate-700 font-medium">
                Savings: <span className="font-mono text-slate-500">₹{row.savings_balance_before?.toLocaleString('en-IN') || 0}</span> → <strong className="font-mono text-emerald-700">₹{row.savings_balance_after?.toLocaleString('en-IN') || 0}</strong>
              </span>
              <span className="text-slate-500 text-[10px]">
                Outstanding: <span className={row.outstanding_effect.startsWith('-') ? 'text-emerald-600 font-bold' : 'text-slate-600'}>{row.outstanding_effect}</span>
              </span>
            </div>
          );
        }
        return (
          <div className="flex flex-col text-[11px]">
            <span className="text-slate-700 font-medium">
              Outstanding: <strong className={row.outstanding_effect.startsWith('+') ? 'text-rose-600' : row.outstanding_effect.startsWith('-') ? 'text-emerald-600' : 'text-slate-600'}>{row.outstanding_effect}</strong>
            </span>
            <span className="text-slate-400 text-[10px]">Savings: Unchanged</span>
          </div>
        );
      },
    },
    {
      header: 'Amount',
      align: 'right',
      render: (row) => {
        const isSavingsPos = ['savings_deposit', 'savings_opening'].includes(row.display_type);
        const isSavingsNeg = row.display_type === 'savings_withdrawal';
        const isBillPay = row.display_type === 'savings_bill_payment';
        const isLendingPos = ['credit', 'opening_balance'].includes(row.entry_type);

        let colorClass = 'text-slate-800';
        let sign = '+';

        if (isSavingsPos) {
          colorClass = 'text-emerald-600';
          sign = '+';
        } else if (isSavingsNeg) {
          colorClass = 'text-purple-600';
          sign = '-';
        } else if (isBillPay) {
          colorClass = 'text-amber-600';
          sign = '-';
        } else if (isLendingPos) {
          colorClass = 'text-rose-600';
          sign = '+';
        } else {
          colorClass = 'text-emerald-600';
          sign = '-';
        }

        return (
          <span className={`font-semibold font-mono ${colorClass}`}>
            {sign} {formatRupees(row.amount)}
          </span>
        );
      },
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
                const cust = row.customer || customers.find((c) => c.id === row.customer_id);
                const isSavingsTx = row.display_type === 'savings_deposit' || row.display_type === 'savings_opening';
                const isWithdrawalTx = row.display_type === 'savings_withdrawal';
                const isBillTx = row.display_type === 'savings_bill_payment';

                setReceiptTarget({
                  entry: row,
                  customer: cust,
                  outstandingBalance: cust?.account?.outstanding_balance,
                  savingsBalance: row.savings_balance_after || cust?.savings_account?.savings_balance,
                  isSavingsReceipt: isSavingsTx,
                  isWithdrawalReceipt: isWithdrawalTx,
                  isBillReceipt: isBillTx,
                  billPaymentData: isBillTx ? (() => {
                    let totalBill = row.amount;
                    let paidSavings = row.amount;
                    let remaining = 0;
                    if (row.notes) {
                      const totalMatch = row.notes.match(/Total Bill:\s*₹?([\d,.]+)/i);
                      const paidMatch = row.notes.match(/Paid from Savings:\s*₹?([\d,.]+)/i);
                      const remMatch = row.notes.match(/Remaining(?: added to dues| ₹)?:\s*₹?([\d,.]+)/i);
                      if (totalMatch) totalBill = parseFloat(totalMatch[1].replace(/,/g, '')) || totalBill;
                      if (paidMatch) paidSavings = parseFloat(paidMatch[1].replace(/,/g, '')) || paidSavings;
                      if (remMatch) remaining = parseFloat(remMatch[1].replace(/,/g, '')) || remaining;
                    }
                    return {
                      bill_amount: totalBill,
                      description: row.description?.replace(/^Savings Used for Bill Payment:\s*/i, '') || row.description,
                      paid_from_savings: paidSavings,
                      remaining_bill: remaining,
                      savings_balance: row.savings_balance_after,
                      outstanding_balance: cust?.account?.outstanding_balance,
                      payment_source: 'customer_savings',
                      reference_number: row.reference_no,
                    };
                  })() : null,
                });
                setIsReceiptModalOpen(true);
              }}
              icon={Receipt}
              className="text-brand-primary hover:bg-blue-50"
              title="Share Receipt (WhatsApp / Email)"
            />
          )}
          {(isAdmin || canManageCustomers) && !row.is_deleted && (
            <>
              {row.source_table !== 'customer_savings_transactions' && (
                <Button variant="ghost" size="sm" onClick={() => handleEditOpen(row)} icon={Pencil} />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteOpen(row)}
                icon={Trash2}
                className="text-rose-500 hover:text-rose-600"
              />
            </>
          )}
          {(isAdmin || canManageCustomers) && row.is_deleted && row.source_table !== 'customer_savings_transactions' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRestore(row)}
              icon={RotateCcw}
              className="text-emerald-500 hover:text-emerald-600"
              title="Restore"
            />
          )}
        </div>
      ),
    },
  ];

  const formContent = (
    <form id="transactionForm" onSubmit={handleSave} className="space-y-4 font-sans text-xs">
      <div className="flex flex-col gap-1">
        <label className="text-slate-600 font-medium">Customer <span className="text-rose-500">*</span></label>
        <select
          name="customer_id"
          value={formData.customer_id}
          onChange={handleFormChange}
          required
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all shadow-xs"
        >
          <option value="">Select a Customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.phone ? `(${c.phone})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-slate-600 font-medium">Entry Type <span className="text-rose-500">*</span></label>
        <select
          name="entry_type"
          value={formData.entry_type}
          onChange={handleFormChange}
          required
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all shadow-xs"
        >
          <option value="credit">Amount Given (+)</option>
          <option value="debit">Payment Received (-)</option>
          <option value="adjustment">Adjustment</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-slate-600 font-medium">Amount <span className="text-rose-500">*</span></label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <IndianRupee size={14} className="text-slate-400" />
          </div>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleFormChange}
            required
            min="0"
            step="0.01"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-slate-800 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all shadow-xs"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-slate-600 font-medium">Description <span className="text-rose-500">*</span></label>
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleFormChange}
          required
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all shadow-xs"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-slate-600 font-medium">Reference No. (Optional)</label>
        <input
          type="text"
          name="reference_no"
          value={formData.reference_no}
          onChange={handleFormChange}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all shadow-xs"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-slate-600 font-medium">Notes (Optional)</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleFormChange}
          rows="3"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all shadow-xs"
        ></textarea>
      </div>
    </form>
  );

  return (
    <div className="space-y-6 font-sans text-xs">
      <PageHeader
        title="Transaction Records"
        description="Search, filter, and review all live business transactions, payments, and receipts."
        actions={
          (isAdmin || canManageCustomers) && (
            <Button variant="primary" onClick={handleCreateOpen} icon={Plus}>
              Record Transaction
            </Button>
          )
        }
      />

      <Card className="p-4 shadow-xs rounded-xl border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
          <div className="w-full sm:w-1/3">
            <SearchBar placeholder="Search transactions..." value={search} onChange={handleSearch} />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 shadow-xs">
              <Filter size={14} className="text-slate-400" />
              <select
                value={entryType}
                onChange={(e) => {
                  setEntryType(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-slate-700 outline-none focus:ring-0 text-xs"
              >
                <option value="all">All Transactions</option>
                <option value="credit">Amount Given (+)</option>
                <option value="debit">Payment Received (-)</option>
                <option value="savings_deposit">Savings Deposit (+)</option>
                <option value="savings_withdrawal">Savings Withdrawal (-)</option>
                <option value="bill_payment">Savings Used for Bill Payment</option>
                <option value="adjustment">Adjustment</option>
                <option value="opening_balance">Opening Balance</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => {
                  setShowDeleted(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
              />
              Show Deleted
            </label>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <EmptyState
            title="Error Loading Transactions"
            description={error}
            icon={RotateCcw}
            actionLabel="Retry"
            onAction={fetchTransactions}
          />
        ) : entries.length === 0 ? (
          <EmptyState
            title="No Transactions Found"
            description="Try adjusting your search or filters."
            icon={Search}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <DataTable columns={columns} data={entries} />
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-slate-500">
              <span>
                Showing {entries.length} of {totalCount} entries
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={entries.length < pageSize}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Record New Transaction"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="transactionForm" disabled={submitting}>
              Save Transaction
            </Button>
          </div>
        }
      >
        {formContent}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Transaction"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="transactionForm" disabled={submitting}>
              Update Transaction
            </Button>
          </div>
        }
      >
        {formContent}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Transaction"
        message="Are you sure you want to soft-delete this transaction? This action will update customer balance and record an audit log."
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        variant="danger"
      >
        <div className="mt-3">
          <label className="text-slate-600 font-medium text-xs mb-1 block">
            Reason for deletion <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="e.g. Duplicate entry"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all shadow-xs text-xs"
          />
        </div>
      </ConfirmationDialog>

      {/* Receipt Share Modal */}
      {receiptTarget && (
        <ReceiptShareModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setReceiptTarget(null);
          }}
          entry={receiptTarget.entry}
          customer={receiptTarget.customer}
          outstandingBalance={receiptTarget.outstandingBalance}
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
