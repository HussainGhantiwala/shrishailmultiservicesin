import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { customerTypesApi } from '../../services/api/customerTypes';
import { Tag, FileText, ShieldAlert } from 'lucide-react';

export default function CustomerTypeModal({
  isOpen,
  onClose,
  typeToEdit = null,
  onSuccess,
  currentUser = null,
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (typeToEdit) {
        setName(typeToEdit.name || '');
        setDescription(typeToEdit.description || '');
        setIsActive(typeToEdit.is_active !== undefined ? typeToEdit.is_active : true);
      } else {
        setName('');
        setDescription('');
        setIsActive(true);
      }
      setError('');
    }
  }, [isOpen, typeToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Customer Type Name is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (typeToEdit) {
        await customerTypesApi.updateCustomerType(typeToEdit.id, {
          name: trimmed,
          description: description.trim(),
          is_active: isActive,
        });
        toast.success(`Customer Type "${trimmed}" updated successfully.`);
      } else {
        await customerTypesApi.createCustomerType(
          {
            name: trimmed,
            description: description.trim(),
          },
          currentUser
        );
        toast.success(`Customer Type "${trimmed}" created successfully.`);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save Customer Type.');
      toast.error(err.message || 'Failed to save Customer Type.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={typeToEdit ? 'Edit Customer Type' : 'Add New Customer Type'}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={submitting}>
            {typeToEdit ? 'Save Changes' : 'Save Customer Type'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Customer Type Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Farmer, Employee, Business"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-brand-primary focus:outline-none text-xs font-semibold"
              autoFocus
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Names are case-insensitive and unique (e.g. "Farmer" and "farmer" cannot both exist).
          </p>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Description <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes or description for this classification category..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-brand-primary focus:outline-none text-xs font-normal"
            />
          </div>
        </div>

        {typeToEdit && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-700 block">Status</span>
              <span className="text-[11px] text-slate-400">
                Inactive types will not appear for new customer registrations.
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary"
              />
              <span className={isActive ? 'text-emerald-700' : 'text-slate-500'}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </label>
          </div>
        )}
      </form>
    </Modal>
  );
}
