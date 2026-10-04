import React, { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { isValidEmail, isValidPhone, isValidGST } from '../../../utils/validation';
import { parseCurrency } from '../../../utils/currency';
import { useToast } from '../../../context/ToastContext';
import { User, Phone, Mail, MapPin, FileText, Lock, Shield } from 'lucide-react';

export default function CustomerFormModal({ isOpen, onClose, onSubmit, customerToEdit = null, isLoading = false }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    notes: '',
    opening_balance: '',
    opening_savings: '',
    is_login_enabled: false,
    status: 'active',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        name: customerToEdit.name || '',
        phone: customerToEdit.phone || '',
        email: customerToEdit.email || '',
        address: customerToEdit.address || '',
        gst_number: customerToEdit.gst_number || '',
        notes: customerToEdit.notes || '',
        opening_balance: customerToEdit.opening_balance || '',
        opening_savings: '',
        is_login_enabled: Boolean(customerToEdit.is_login_enabled),
        status: customerToEdit.status || 'active',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        gst_number: '',
        notes: '',
        opening_balance: '',
        opening_savings: '',
        is_login_enabled: false,
        status: 'active',
      });
    }
    setErrors({});
  }, [customerToEdit, isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Customer name is required';
    }
    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required';
    } else if (!isValidPhone(formData.phone)) {
      errs.phone = 'Enter a valid 10-digit mobile number';
    }

    if (formData.email && !isValidEmail(formData.email)) {
      errs.email = 'Enter a valid email address';
    }

    if (formData.gst_number && !isValidGST(formData.gst_number)) {
      errs.gst_number = 'Enter a valid 15-character GSTIN number';
    }

    if (formData.opening_balance && String(formData.opening_balance).trim()) {
      const valStr = String(formData.opening_balance).trim();
      if (/[^0-9.,\s₹$]/.test(valStr)) {
        errs.opening_balance = 'Enter a valid numeric amount (e.g. 1,00,000 or 50000)';
      } else {
        const parsed = parseCurrency(valStr);
        if (parsed < 0) {
          errs.opening_balance = 'Opening due balance cannot be negative';
        }
      }
    }

    if (formData.opening_savings && String(formData.opening_savings).trim()) {
      const valStr = String(formData.opening_savings).trim();
      if (/[^0-9.,\s₹$]/.test(valStr)) {
        errs.opening_savings = 'Enter a valid numeric amount (e.g. 10,000 or 5000)';
      } else {
        const parsed = parseCurrency(valStr);
        if (parsed < 0) {
          errs.opening_savings = 'Opening savings balance cannot be negative';
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save customer');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customerToEdit ? 'Edit Customer Profile' : 'Register New Customer'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} isDisabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            {customerToEdit ? 'Save Changes' : 'Create Customer'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {/* Customer Name */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Customer Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Ramesh Patel / Patil Traders"
              className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none ${
                errors.name ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
              }`}
            />
          </div>
          {errors.name && <p className="text-[11px] text-rose-600 mt-0.5">{errors.name}</p>}
        </div>

        {/* Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+91 98230 11223"
                className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none font-mono ${
                  errors.phone ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
                }`}
              />
            </div>
            {errors.phone && <p className="text-[11px] text-rose-600 mt-0.5">{errors.phone}</p>}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="customer@domain.com"
                className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none ${
                  errors.email ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
                }`}
              />
            </div>
            {errors.email && <p className="text-[11px] text-rose-600 mt-0.5">{errors.email}</p>}
          </div>
        </div>

        {/* Address & GST */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Address / Location</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Solapur Road, MIDC"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">GST Number (Optional)</label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={formData.gst_number}
                onChange={(e) => handleChange('gst_number', e.target.value.toUpperCase())}
                placeholder="27AAAAA0000A1Z5"
                className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none font-mono ${
                  errors.gst_number ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
                }`}
              />
            </div>
            {errors.gst_number && <p className="text-[11px] text-rose-600 mt-0.5">{errors.gst_number}</p>}
          </div>
        </div>

        {/* Status & Login Enabled Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none capitalize"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_login_enabled}
                onChange={(e) => handleChange('is_login_enabled', e.target.checked)}
                className="rounded text-brand-primary focus:ring-brand-primary"
              />
              <span className="font-semibold text-slate-700">Enable Customer Portal Login</span>
            </label>
          </div>
        </div>

        {/* Opening Balances (Two Completely Independent Financial Accounts) */}
        {!customerToEdit && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Initial Account Balances (Optional)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Independent Ledgers</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opening Due Balance */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Opening Due Balance (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.opening_balance}
                    onChange={(e) => handleChange('opening_balance', e.target.value)}
                    placeholder="0.00 (e.g. 50,000)"
                    className={`w-full pl-8 pr-3 py-2 bg-white border rounded-lg focus:outline-none font-mono ${
                      errors.opening_balance ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
                    }`}
                  />
                </div>
                {errors.opening_balance && (
                  <p className="text-[11px] text-rose-600 mt-0.5">{errors.opening_balance}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Amount owed by customer (Lending Ledger).
                </p>
              </div>

              {/* Opening Savings Balance */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Opening Savings Balance (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">₹</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.opening_savings}
                    onChange={(e) => handleChange('opening_savings', e.target.value)}
                    placeholder="0.00 (e.g. 10,000)"
                    className={`w-full pl-8 pr-3 py-2 bg-white border rounded-lg focus:outline-none font-mono ${
                      errors.opening_savings ? 'border-rose-500' : 'border-slate-300 focus:border-emerald-600'
                    }`}
                  />
                </div>
                {errors.opening_savings && (
                  <p className="text-[11px] text-rose-600 mt-0.5">{errors.opening_savings}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Customer savings held by business (Savings Ledger).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Notes / Internal Remarks</label>
          <textarea
            rows="2"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Additional business terms or remarks..."
            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none"
          />
        </div>
      </form>
    </Modal>
  );
}
