import React, { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { isValidEmail, isValidPhone, isValidGST } from '../../../utils/validation';
import { parseCurrency } from '../../../utils/currency';
import { useToast } from '../../../context/ToastContext';
import { customerTypesApi } from '../../../services/api/customerTypes';
import { User, Phone, Mail, MapPin, FileText, Lock, Shield, Tag } from 'lucide-react';

export default function CustomerFormModal({ isOpen, onClose, onSubmit, customerToEdit = null, isLoading = false }) {
  const toast = useToast();
  const [customerTypes, setCustomerTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    customer_type_id: '',
    notes: '',
    opening_balance: '',
    opening_savings: '',
    is_login_enabled: false,
    status: 'active',
  });

  const [errors, setErrors] = useState({});

  // Fetch active customer types whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingTypes(true);
      customerTypesApi
        .getCustomerTypes({ activeOnly: true })
        .then(async (res) => {
          let list = res.data || [];

          // If editing an existing customer with an inactive type, ensure their type is still present in dropdown
          if (customerToEdit?.customer_type_id) {
            const hasType = list.some((t) => t.id === customerToEdit.customer_type_id);
            if (!hasType) {
              const { data: existingType } = await customerTypesApi.getCustomerTypeById(
                customerToEdit.customer_type_id
              );
              if (existingType) {
                list = [...list, existingType];
              }
            }
          }

          setCustomerTypes(list);
        })
        .catch((err) => {
          console.warn('Failed to load customer types for form:', err);
        })
        .finally(() => {
          setLoadingTypes(false);
        });
    }
  }, [isOpen, customerToEdit]);

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        name: customerToEdit.name || '',
        phone: customerToEdit.phone || '',
        email: customerToEdit.email || '',
        address: customerToEdit.address || '',
        gst_number: customerToEdit.gst_number || '',
        customer_type_id: customerToEdit.customer_type_id || customerToEdit.customer_type?.id || '',
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
        customer_type_id: '',
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

    if (!formData.customer_type_id) {
      errs.customer_type_id = 'Customer type is required';
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customerToEdit ? 'Edit Customer Profile' : 'Register New Customer & Initial Ledger'}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            {customerToEdit ? 'Save Changes' : 'Create Customer Account'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
        {/* Name */}
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
                placeholder="Kasgi, Omerga"
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

        {/* Customer Type Dropdown */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Customer Type <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={formData.customer_type_id}
              onChange={(e) => handleChange('customer_type_id', e.target.value)}
              disabled={loadingTypes}
              className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none text-xs font-semibold ${
                errors.customer_type_id ? 'border-rose-500' : 'border-slate-300 focus:border-brand-primary'
              }`}
            >
              <option value="">-- Select Customer Type --</option>
              {customerTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} {!type.is_active ? '(Inactive)' : ''}
                </option>
              ))}
            </select>
          </div>
          {errors.customer_type_id && (
            <p className="text-[11px] text-rose-600 mt-0.5">{errors.customer_type_id}</p>
          )}
          <p className="text-[10px] text-slate-400 mt-0.5">
            Backend classification master. Categorizes customer for ledger filtering and reporting.
          </p>
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

        {/* Initial Opening Balances (Registration Only - Independent Systems) */}
        {!customerToEdit && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs">Initial Opening Balances</span>
              <span className="text-[10px] text-slate-400">Independent Balances</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Opening Due Balance (Lending Account) */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
                <label className="block font-semibold text-amber-900 text-[11px]">
                  Opening Due Balance (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                  <input
                    type="text"
                    value={formData.opening_balance}
                    onChange={(e) => handleChange('opening_balance', e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-7 pr-3 py-1.5 bg-white border rounded-lg focus:outline-none font-mono text-xs font-semibold ${
                      errors.opening_balance ? 'border-rose-500' : 'border-amber-300 focus:border-amber-500'
                    }`}
                  />
                </div>
                {errors.opening_balance && (
                  <p className="text-[10px] text-rose-600">{errors.opening_balance}</p>
                )}
                <p className="text-[10px] text-amber-700 leading-tight">
                  Pre-existing customer debt/dues before portal registration.
                </p>
              </div>

              {/* 2. Opening Savings Balance (Savings Account) */}
              <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl space-y-1">
                <label className="block font-semibold text-teal-900 text-[11px]">
                  Opening Savings Balance (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                  <input
                    type="text"
                    value={formData.opening_savings}
                    onChange={(e) => handleChange('opening_savings', e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-7 pr-3 py-1.5 bg-white border rounded-lg focus:outline-none font-mono text-xs font-semibold ${
                      errors.opening_savings ? 'border-rose-500' : 'border-teal-300 focus:border-teal-500'
                    }`}
                  />
                </div>
                {errors.opening_savings && (
                  <p className="text-[10px] text-rose-600">{errors.opening_savings}</p>
                )}
                <p className="text-[10px] text-teal-700 leading-tight">
                  Initial customer deposit held safely in savings ledger.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Remarks */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Notes / Internal Remarks</label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Special customer terms, referral, credit limit, or registration remarks..."
            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none"
          />
        </div>
      </form>
    </Modal>
  );
}
