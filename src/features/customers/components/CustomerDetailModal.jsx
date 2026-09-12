import React from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import StatusBadge from '../../../components/common/StatusBadge';
import { formatRupees } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { User, Phone, Mail, MapPin, CreditCard, Shield, Lock, KeyRound, UserCheck } from 'lucide-react';

export default function CustomerDetailModal({
  isOpen,
  onClose,
  customer,
  onStatusChange,
  onToggleLogin,
}) {
  const { isAdmin, canManageCustomers } = useAuth();
  const toast = useToast();

  if (!customer) return null;

  const account = customer.account || {};

  const handleResetPassword = () => {
    toast.success(`Password reset link dispatched for ${customer.name}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Account Profile & Summary"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
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

        {/* Customer Account Summary Box (Step 6) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-brand-primary" />
              Automated Account Summary
            </span>
            <span className="font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
              {account.account_number || 'ACC-1001'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Outstanding Balance</div>
              <div className={`font-bold text-sm mt-0.5 ${account.outstanding_balance > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {formatRupees(account.outstanding_balance || 0)}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Paid</div>
              <div className="font-bold text-sm text-emerald-600 mt-0.5">
                {formatRupees(account.total_paid || 0)}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Credit</div>
              <div className="font-bold text-sm text-slate-800 mt-0.5">
                {formatRupees(account.total_credit || 0)}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Debit</div>
              <div className="font-bold text-sm text-slate-800 mt-0.5">
                {formatRupees(account.total_debit || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information Grid */}
        <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        {/* Admin Quick Control Actions */}
        {canManageCustomers && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
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
  );
}
