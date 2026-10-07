import React, { useState, useEffect, useCallback } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import StatusBadge from '../common/StatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import CustomerTypeModal from './CustomerTypeModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { customerTypesApi } from '../../services/api/customerTypes';
import { supabase } from '../../lib/supabase';
import { Tag, Plus, Edit2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

export default function CustomerTypeManagementCard({ onTypesUpdated }) {
  const { user, isAdmin } = useAuth();
  const toast = useToast();

  const [customerTypes, setCustomerTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  const fetchTypes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await customerTypesApi.getCustomerTypes({ activeOnly: false });
      setCustomerTypes(res.data || []);
      if (onTypesUpdated) onTypesUpdated(res.data || []);
    } catch (err) {
      console.warn('Failed to load customer types:', err.message);
      toast.error('Failed to load customer types');
    } finally {
      setLoading(false);
    }
  }, [onTypesUpdated, toast]);

  useEffect(() => {
    fetchTypes();

    const channel = customerTypesApi.subscribeToChanges(() => {
      fetchTypes();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchTypes]);

  const handleToggleStatus = async (type) => {
    const newStatus = !type.is_active;
    try {
      await customerTypesApi.toggleStatus(type.id, newStatus);
      toast.success(
        `Customer Type "${type.name}" is now ${newStatus ? 'Active' : 'Inactive'}.`
      );
      fetchTypes();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  return (
    <Card className="p-5 shadow-xs border border-slate-200 bg-white rounded-xl space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand-primary" />
            Customer Types Master
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Admin-managed classification master. Loaded dynamically in customer creation, filters, and statements.
          </p>
        </div>

        {isAdmin && (
          <Button
            size="sm"
            icon={Plus}
            onClick={() => {
              setSelectedType(null);
              setModalOpen(true);
            }}
          >
            Add Customer Type
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <LoadingSpinner size="sm" text="Loading customer types..." />
        </div>
      ) : customerTypes.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-xs">
          No customer types configured. Click "+ Add Customer Type" to create the first type.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3">Type Name</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                {isAdmin && <th className="py-2.5 px-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {customerTypes.map((type) => (
                <tr key={type.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                      <Tag className="w-3 h-3 text-brand-primary" />
                      {type.name}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                    {type.description || <span className="text-slate-400 italic">No description</span>}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <StatusBadge
                      status={type.is_active ? 'active' : 'inactive'}
                      type={type.is_active ? 'success' : 'neutral'}
                      label={type.is_active ? 'Active' : 'Inactive'}
                    />
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedType(type);
                            setModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-brand-primary hover:bg-slate-100 rounded transition-colors"
                          title="Edit Customer Type"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(type)}
                          className={`p-1 rounded transition-colors text-[11px] font-semibold flex items-center gap-1 ${
                            type.is_active
                              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                          }`}
                          title={type.is_active ? 'Deactivate Type' : 'Activate Type'}
                        >
                          {type.is_active ? (
                            <XCircle className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Type Form Modal */}
      <CustomerTypeModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedType(null);
        }}
        typeToEdit={selectedType}
        onSuccess={fetchTypes}
        currentUser={user}
      />
    </Card>
  );
}
