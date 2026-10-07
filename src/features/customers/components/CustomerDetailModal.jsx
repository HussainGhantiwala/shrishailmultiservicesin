import React, { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import StatusBadge from '../../../components/common/StatusBadge';
import { formatRupees } from '../../../utils/currency';
import { formatDate, formatDateTime, getRelativeTime } from '../../../utils/date';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { savingsApi } from '../../../services/api/savings';
import ReceiptShareModal from '../../../components/common/ReceiptShareModal';
import {
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Shield,
  Lock,
  KeyRound,
  UserCheck,
  PiggyBank,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  History,
  FileText,
  Clock,
  Plus,
  Printer,
  Tag,
} from 'lucide-react';
import PrintStatementModal from '../../../components/portal/PrintStatementModal';

export default function CustomerDetailModal({
  isOpen,
  onClose,
  customer,
  onStatusChange,
  onToggleLogin,
  onPayBill,
}) {
  const { isAdmin, canManageCustomers } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'savings_history'
  const [savingsHistory, setSavingsHistory] = useState([]);
  const [loadingSavings, setLoadingSavings] = useState(false);
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && customer?.id) {
      setActiveTab('overview');
      fetchSavingsHistory();
    }
  }, [isOpen, customer?.id]);

  const fetchSavingsHistory = async () => {
    if (!customer?.id) return;
    setLoadingSavings(true);
    try {
      const res = await savingsApi.getSavingsTransactions(customer.id);
      setSavingsHistory(res.data || []);
    } catch (err) {
      console.warn('Failed to load customer savings history:', err.message);
    } finally {
      setLoadingSavings(false);
    }
  };

  if (!customer) return null;

  const account = customer.account || {};
  const savingsAccount = customer.savings_account || {};

  const handleResetPassword = () => {
    toast.success(`Password reset link dispatched for ${customer.name}`);
  };

  const rawLendingBalance = Number(account.total_credit || 0) - Number(account.total_debit || 0);
  const outstandingDue = account.advance_balance !== undefined && account.advance_balance !== null
    ? Math.max(0, Number(account.outstanding_balance || 0))
    : Math.max(0, rawLendingBalance);
  const customerAdvance = account.advance_balance !== undefined && account.advance_balance !== null
    ? Math.max(0, Number(account.advance_balance || 0))
    : Math.max(0, -rawLendingBalance);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Customer Account Profile & Summary"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-[11px] text-slate-400">
              Account No: <strong className="font-mono text-slate-700">{account.account_number || 'ACC-1001'}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                icon={Printer}
                onClick={() => setIsPrintModalOpen(true)}
              >
                Print Statement
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 font-sans text-xs">
          {/* Customer Header */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-primary text-white font-bold flex items-center justify-center text-sm shadow-xs">
                {customer.name?.[0] || 'C'}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">{customer.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">ID: {customer.id}</div>
              </div>
            </div>

            <StatusBadge
              status={customer.status}
              type={customer.status === 'active' ? 'success' : customer.status === 'blocked' ? 'danger' : 'neutral'}
              label={customer.status.toUpperCase()}
            />
          </div>

          {/* Modal Tabs Navigation */}
          <div className="flex border-b border-slate-200 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 font-bold transition-all text-xs relative ${
                activeTab === 'overview'
                  ? 'text-brand-primary border-b-2 border-brand-primary'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Account Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('savings_history')}
              className={`pb-2.5 font-bold transition-all text-xs relative flex items-center gap-1.5 ${
                activeTab === 'savings_history'
                  ? 'text-brand-primary border-b-2 border-brand-primary'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
              <span>Savings History ({savingsHistory.length})</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* PRIMARY FINANCIAL SUMMARY (TWO SEPARATE BALANCES) */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    Financial Summary (Independent Balances)
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Never Combined</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Balance 1: Lending Status (Outstanding Due OR Customer Advance) */}
                  {customerAdvance > 0 ? (
                    <div className="p-3 bg-white border border-emerald-200 rounded-xl shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                          <Wallet className="w-3.5 h-3.5" />
                          Customer Advance / Credit
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">In Credit</span>
                      </div>
                      <div className="font-mono text-xl font-bold text-emerald-700">
                        +{formatRupees(customerAdvance)}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Excess payment paid by customer; advance credit on account.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
                          <Wallet className="w-3.5 h-3.5" />
                          Outstanding / Due
                        </span>
                        <span className="text-[10px] text-slate-400">Lending Account</span>
                      </div>
                      <div className={`font-mono text-xl font-bold ${outstandingDue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatRupees(outstandingDue)}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {outstandingDue > 0 ? 'Net amount owed by customer to business.' : 'Customer account has zero pending dues.'}
                      </p>
                    </div>
                  )}

                  {/* Balance 2: Savings Balance */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                        <PiggyBank className="w-3.5 h-3.5" />
                        Customer Savings
                      </span>
                      <span className="text-[10px] text-slate-400">Savings Vault</span>
                    </div>
                    <div className="font-mono text-xl font-bold text-emerald-700">
                      {formatRupees(savingsAccount.savings_balance || 0)}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Customer money held securely in savings vault.
                    </p>
                  </div>
                </div>
              </div>

              {/* LENDING ACCOUNT DETAILED TOTALS */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <CreditCard className="w-4 h-4 text-brand-primary" />
                    Lending Account Details
                  </span>
                  <span className="font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {account.account_number || 'ACC-1001'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Given</div>
                    <div className="font-bold text-slate-800 mt-0.5 font-mono">
                      {formatRupees(account.total_credit || 0)}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Received</div>
                    <div className="font-bold text-emerald-600 mt-0.5 font-mono">
                      {formatRupees(account.total_paid || 0)}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Outstanding Due</div>
                    <div className={`font-bold mt-0.5 font-mono ${outstandingDue > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {outstandingDue > 0 ? formatRupees(outstandingDue) : '-'}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Customer Advance</div>
                    <div className={`font-bold mt-0.5 font-mono ${customerAdvance > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {customerAdvance > 0 ? `+${formatRupees(customerAdvance)}` : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* SAVINGS ACCOUNT DETAILED TOTALS */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <PiggyBank className="w-4 h-4 text-emerald-600" />
                    Savings Account Details
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Isolated Ledger
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Deposited</div>
                    <div className="font-bold text-emerald-600 mt-0.5 font-mono">
                      {formatRupees(savingsAccount.total_deposited || 0)}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Debited / Used</div>
                    <div className="font-bold text-rose-600 mt-0.5 font-mono">
                      {formatRupees(savingsAccount.total_withdrawn || 0)}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Savings Status</div>
                    <div className="font-semibold text-slate-800 mt-0.5 capitalize">
                      {savingsAccount.status || 'Active'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Information Grid */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 font-medium">Customer Type:</span>
                  <div className="mt-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                      <Tag className="w-3 h-3 text-brand-primary" />
                      {customer.customer_type?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Phone Number:</span>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">{customer.phone}</div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Email Address:</span>
                  <div className="font-semibold text-slate-900 mt-0.5">{customer.email || 'N/A'}</div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Address:</span>
                  <div className="font-medium text-slate-900 mt-0.5">{customer.address || 'N/A'}</div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">GSTIN Number:</span>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">{customer.gst_number || 'N/A'}</div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Portal Login Status:</span>
                  <div className="mt-0.5">
                    <StatusBadge
                      status={customer.is_login_enabled ? 'enabled' : 'disabled'}
                      type={customer.is_login_enabled ? 'info' : 'neutral'}
                      label={customer.is_login_enabled ? 'Portal Login Active' : 'Login Disabled'}
                    />
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Created Date:</span>
                  <div className="font-medium text-slate-900 mt-0.5">{formatDate(customer.created_at)}</div>
                </div>
              </div>

              {/* Notes */}
              {customer.notes && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <span className="font-bold text-amber-900">Internal Remarks:</span>
                  <p className="text-slate-700 mt-0.5">{customer.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAVINGS HISTORY */}
          {activeTab === 'savings_history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <div>
                  <div className="text-[10px] text-emerald-700 uppercase font-bold">Current Savings Balance</div>
                  <div className="font-mono text-xl font-bold text-emerald-800">
                    {formatRupees(savingsAccount.savings_balance || 0)}
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  Total Transactions: <strong className="text-slate-800">{savingsHistory.length}</strong>
                </div>
              </div>

              {loadingSavings ? (
                <div className="py-8 text-center text-slate-500">
                  Loading savings transaction history...
                </div>
              ) : savingsHistory.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                  <PiggyBank className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No savings transactions recorded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Savings deposits and bill deductions will appear here chronologically.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-96 overflow-y-auto">
                  {savingsHistory.map((tx) => {
                    const isOpening = tx.transaction_type === 'OPENING';
                    const isCredit = ['CREDIT', 'DEPOSIT'].includes(tx.transaction_type);
                    const isWithdrawal = tx.transaction_type === 'WITHDRAWAL';
                    const isBillPayment = tx.transaction_type === 'BILL_PAYMENT';
                    const isPositive = isOpening || isCredit;

                    return (
                      <div
                        key={tx.id}
                        className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                              isOpening
                                ? 'bg-blue-50 text-blue-700'
                                : isCredit
                                ? 'bg-emerald-50 text-emerald-700'
                                : isWithdrawal
                                ? 'bg-purple-50 text-purple-700'
                                : isBillPayment
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowDownRight className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-900 text-xs">
                                {tx.description}
                              </span>
                              {isOpening && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  OPENING SAVINGS
                                </span>
                              )}
                              {isWithdrawal && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  WITHDRAWAL
                                </span>
                              )}
                              {isBillPayment && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  BILL PAYMENT
                                </span>
                              )}
                              {isCredit && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  DEPOSIT
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>{formatDateTime(tx.created_at)}</span>
                              <span>•</span>
                              <span>Ref: {tx.reference_number || 'N/A'}</span>
                              <span>•</span>
                              <span>{tx.payment_method || 'Cash'}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Balance After: <strong className="text-slate-700">{formatRupees(tx.balance_after)}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`font-mono font-bold text-sm ${
                              isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isPositive ? '+' : '-'}{formatRupees(tx.amount)}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTxForReceipt(tx);
                              setIsReceiptModalOpen(true);
                            }}
                            className="mt-1 inline-flex items-center gap-1 text-[10px] text-brand-primary font-semibold hover:underline"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Admin Quick Control Actions */}
          {canManageCustomers && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
              {onPayBill && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Receipt}
                  onClick={() => {
                    onClose();
                    onPayBill(customer);
                  }}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold"
                >
                  Pay Customer Bill
                </Button>
              )}

              {customer.status === 'pending_approval' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={UserCheck}
                  onClick={() => onStatusChange(customer.id, 'active')}
                >
                  Approve Customer
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                icon={customer.is_login_enabled ? Lock : Shield}
                onClick={() => onToggleLogin(customer.id, !customer.is_login_enabled)}
              >
                {customer.is_login_enabled ? 'Disable Login' : 'Enable Login'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                icon={Printer}
                onClick={() => setIsPrintModalOpen(true)}
              >
                Print Statement
              </Button>

              {isAdmin && (
                <Button variant="secondary" size="sm" icon={KeyRound} onClick={handleResetPassword}>
                  Reset Password
                </Button>
              )}

              <Button
                variant={customer.status === 'blocked' ? 'primary' : 'danger'}
                size="sm"
                onClick={() => onStatusChange(customer.id, customer.status === 'blocked' ? 'active' : 'blocked')}
              >
                {customer.status === 'blocked' ? 'Unblock Customer' : 'Block Account'}
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Transaction Receipt Modal for Savings Transactions */}
      {selectedTxForReceipt && (
        <ReceiptShareModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setSelectedTxForReceipt(null);
          }}
          entry={{
            ...selectedTxForReceipt,
            entry_type: selectedTxForReceipt.transaction_type === 'WITHDRAWAL' ? 'savings_withdrawal' : 'savings',
          }}
          customer={customer}
          savingsBalance={selectedTxForReceipt.balance_after}
          outstandingBalance={account.outstanding_balance}
          isSavingsReceipt={selectedTxForReceipt.transaction_type !== 'WITHDRAWAL'}
          isWithdrawalReceipt={selectedTxForReceipt.transaction_type === 'WITHDRAWAL'}
        />
      )}

      {/* Print Statement Modal */}
      <PrintStatementModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        customer={customer}
        customers={customer ? [customer] : []}
        initialStatementType="lending"
      />
    </>
  );
}
