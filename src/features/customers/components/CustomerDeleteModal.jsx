import React, { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';
import { formatRupees } from '../../../utils/currency';

export default function CustomerDeleteModal({
  isOpen,
  onClose,
  customer,
  onConfirmDelete,
  isDeleting = false,
}) {
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
    }
  }, [isOpen]);

  if (!customer) return null;

  const isConfirmed = confirmInput.trim() === 'DELETE';
  const account = customer.account || {};
  const savings = customer.savings_account || {};

  const handleClose = () => {
    if (isDeleting) return; // Prevent closing while deleting
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isConfirmed || isDeleting) return;
    onConfirmDelete(customer.id);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Permanently Delete Customer"
      className="max-w-md border-rose-200"
      footer={
        <div className="flex items-center justify-end gap-2 w-full font-sans">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={handleSubmit}
            disabled={!isConfirmed || isDeleting}
            isLoading={isDeleting}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            {isDeleting ? 'Deleting Customer...' : 'Permanently Delete'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
        {/* Critical Warning Banner */}
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <div className="p-2 bg-rose-100 rounded-lg text-rose-700 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-rose-900 text-xs">Irreversible Destructive Action</h4>
            <p className="text-rose-700 text-[11px] mt-0.5 leading-relaxed">
              This will permanently delete the customer profile and wipe all associated financial records from the database. This action <strong>CANNOT</strong> be undone.
            </p>
          </div>
        </div>

        {/* Customer Identity Card */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Customer:</span>
            <strong className="text-slate-900 font-bold">{customer.name}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Account Number:</span>
            <span className="font-mono font-bold text-slate-800">{account.account_number || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Phone:</span>
            <span className="font-mono text-slate-700">{customer.phone}</span>
          </div>
          {customer.customer_type?.name && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Customer Type:</span>
              <span className="text-slate-700 font-medium">{customer.customer_type.name}</span>
            </div>
          )}
        </div>

        {/* List of Data Removed */}
        <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-900 space-y-1 text-[11px]">
          <div className="font-bold text-amber-950 flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>The following records will be permanently removed:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-slate-700 pl-1">
            <li>Customer profile & directory entry</li>
            <li>Lending account & outstanding balance ({formatRupees(account.outstanding_balance || 0)})</li>
            <li>Full lending ledger transaction history</li>
            <li>Savings account & vault balance ({formatRupees(savings.savings_balance || 0)})</li>
            <li>Customer savings transactions & deposits</li>
            <li>Customer payment receipts and direct logs</li>
          </ul>
        </div>

        {/* Confirmation Typing Requirement */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            To confirm permanent deletion, type <span className="font-mono text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">DELETE</span> below:
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            disabled={isDeleting}
            placeholder="Type DELETE to confirm"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all uppercase placeholder:normal-case placeholder:font-normal"
            autoFocus
          />
        </div>
      </form>
    </Modal>
  );
}
