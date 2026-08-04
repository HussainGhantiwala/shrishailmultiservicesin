import React, { useState } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { useToast } from '../../../context/ToastContext';
import { authService } from '../../../services/auth/authService';
import { Mail, Lock, ShieldCheck } from 'lucide-react';

export default function EnableLoginModal({ isOpen, onClose, customer, onSuccess }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!customer) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and temporary password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await authService.enableLoginForCustomer(customer.id, email, password);
      toast.success(`Portal login enabled for ${customer.name}.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to enable portal login.');
      toast.error(err.message || 'Failed to enable portal login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Enable Portal Login for ${customer.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} isDisabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={loading}>
            Enable Portal Access
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-sans">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            Enabling portal access creates login credentials linked to <strong>{customer.name}</strong>'s existing account and preserves all ledger history.
          </div>
        </div>

        {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">{error}</div>}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Customer Login Email Address <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@domain.com"
              required
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Temporary Login Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
