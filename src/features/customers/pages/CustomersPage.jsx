import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { customerApi } from '../../../services/api/customers';
import { Plus, Eye, Edit3, Shield, Lock, CreditCard, UserCheck, ShieldAlert, KeyRound } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import SearchBar from '../../../components/common/SearchBar';
import DataTable from '../../../components/common/DataTable';
import StatusBadge from '../../../components/common/StatusBadge';
import Card from '../../../components/common/Card';
import StatCard from '../../../components/common/StatCard';
import CustomerFormModal from '../components/CustomerFormModal';
import CustomerDetailModal from '../components/CustomerDetailModal';
import EnableLoginModal from '../components/EnableLoginModal';
import { formatRupees } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';

export default function CustomersPage() {
  const { user, isAdmin, isCustomer, canManageCustomers } = useAuth();
  const toast = useToast();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [enableLoginTarget, setEnableLoginTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await customerApi.getCustomers(search, statusFilter);
      setCustomers(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter]);

  const handleCreateOrUpdate = async (formData) => {
    setSubmitting(true);
    try {
      if (customerToEdit) {
        await customerApi.updateCustomer(customerToEdit.id, formData);
        toast.success('Customer profile updated successfully.');
      } else {
        await customerApi.createCustomer(formData, user);
        toast.success('Customer registered & initial ledger account created.');
      }
      fetchCustomers();
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await customerApi.updateStatus(id, newStatus);
      toast.success(`Customer status changed to ${newStatus.toUpperCase()}.`);
      fetchCustomers();
      if (selectedCustomer && selectedCustomer.id === id) {
        setSelectedCustomer((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update customer status');
    }
  };

  const handleToggleLogin = async (id, isEnabled) => {
    try {
      await customerApi.toggleLoginAccess(id, isEnabled);
      toast.success(`Customer portal login ${isEnabled ? 'enabled' : 'disabled'}.`);
      fetchCustomers();
      if (selectedCustomer && selectedCustomer.id === id) {
        setSelectedCustomer((prev) => ({ ...prev, is_login_enabled: isEnabled }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update login access');
    }
  };

  // ------------------------------------------------------------
  // STEP 11: CUSTOMER PORTAL VIEW (Read-Only Customer Account View)
  // ------------------------------------------------------------
  if (isCustomer) {
    const ownCustomer = customers[0] || {
      name: user?.name || 'Customer',
      phone: user?.phone || '',
      email: user?.email || '',
      status: 'active',
      account: {
        account_number: '-',
        outstanding_balance: 0,
        total_paid: 0,
        total_credit: 0,
        total_debit: 0,
        status: 'active'
      }
    };

    return (
      <div className="space-y-6 font-sans">
        <PageHeader
          title={`Welcome back, ${ownCustomer.name || 'Valued Customer'}!`}
          description="View your active business account details, total settlements, and balance statements."
        />

        {/* Account Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Outstanding Balance"
            value={formatRupees(ownCustomer.account?.outstanding_balance || 0)}
            subtitle="Net Pending Dues"
            iconBg="bg-rose-50 text-rose-600"
          />
          <StatCard
            title="Total Payments Received"
            value={formatRupees(ownCustomer.account?.total_paid || 0)}
            subtitle="Completed Settlements"
            iconBg="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            title="Account Number"
            value={ownCustomer.account?.account_number || 'ACC-1001'}
            subtitle="Unique Account ID"
            iconBg="bg-blue-50 text-blue-600"
          />
          <StatCard
            title="Total Amount Given"
            value={formatRupees(ownCustomer.account?.total_credit || 0)}
            subtitle="Cumulative Credit / Services"
            iconBg="bg-purple-50 text-purple-600"
          />
        </div>

        {/* Profile Info */}
        <Card header={<h3 className="text-sm font-bold text-slate-900">Personal & Billing Profile</h3>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Customer Name:</span>
              <div className="font-semibold text-slate-800 text-sm mt-0.5">{ownCustomer.name}</div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Phone Number:</span>
              <div className="font-mono font-semibold text-slate-800 mt-0.5">{ownCustomer.phone}</div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Email Address:</span>
              <div className="font-semibold text-slate-800 mt-0.5">{ownCustomer.email || 'N/A'}</div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Address:</span>
              <div className="font-medium text-slate-800 mt-0.5">{ownCustomer.address || 'Solapur Road, MIDC'}</div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ------------------------------------------------------------
  // ADMIN & STAFF CUSTOMER MANAGEMENT VIEW (Step 8)
  // ------------------------------------------------------------
  const columns = [
    {
      header: 'Customer Name & GST',
      accessorKey: 'name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.name}</div>
          <div className="text-[10px] text-slate-400 font-normal">GST: {row.gst_number || 'N/A'}</div>
        </div>
      ),
    },
    { header: 'Account No', accessorKey: 'account', render: (row) => <span className="font-mono font-semibold text-slate-700">{row.account?.account_number || 'ACC-1001'}</span> },
    { header: 'Phone Number', accessorKey: 'phone', className: 'font-mono' },
    { header: 'Reg Date', accessorKey: 'created_at', render: (row) => <span className="font-mono text-slate-600">{formatDate(row.created_at)}</span> },
    {
      header: 'Outstanding Balance',
      accessorKey: 'account',
      align: 'right',
      render: (row) => {
        const bal = row.account?.outstanding_balance || 0;
        return (
          <span className={`font-bold ${bal > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {formatRupees(bal)}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      align: 'center',
      render: (row) => (
        <StatusBadge
          status={row.status}
          type={
            row.status === 'active'
              ? 'success'
              : row.status === 'pending_approval'
              ? 'warning'
              : row.status === 'blocked'
              ? 'danger'
              : 'neutral'
          }
          label={row.status === 'pending_approval' ? 'Pending Approval' : row.status.toUpperCase()}
        />
      ),
    },
    {
      header: 'Quick Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {row.status === 'pending_approval' && (
            <button
              onClick={() => handleStatusChange(row.id, 'active')}
              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 font-bold text-[10px] flex items-center gap-0.5"
              title="Approve Customer"
            >
              <UserCheck className="w-3.5 h-3.5" /> Approve
            </button>
          )}

          {!row.is_login_enabled && canManageCustomers && (
            <button
              onClick={() => setEnableLoginTarget(row)}
              className="p-1 rounded text-blue-600 hover:bg-blue-50 font-bold text-[10px] flex items-center gap-0.5"
              title="Enable Login Credentials"
            >
              <Shield className="w-3.5 h-3.5" /> Enable Login
            </button>
          )}

          <button
            onClick={() => {
              setSelectedCustomer(row);
              setIsDetailModalOpen(true);
            }}
            className="p-1 rounded text-slate-500 hover:text-brand-primary hover:bg-slate-100"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>

          {canManageCustomers && (
            <button
              onClick={() => {
                setCustomerToEdit(row);
                setIsFormModalOpen(true);
              }}
              className="p-1 rounded text-slate-500 hover:text-brand-primary hover:bg-slate-100"
              title="Edit Customer"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <PageHeader
        title="Customer Directory & Accounts"
        description="Register customers, review pending approval accounts, enable portal logins, and monitor customer accounts."
        actions={
          canManageCustomers && (
            <Button
              icon={Plus}
              onClick={() => {
                setCustomerToEdit(null);
                setIsFormModalOpen(true);
              }}
            >
              Add New Customer
            </Button>
          )
        }
      />

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by customer name, phone, GST..." />
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs text-slate-600">
          <span className="font-semibold">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none capitalize font-medium text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="pending_approval">Pending Approval Only</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="blocked">Blocked Only</option>
          </select>
        </div>
      </div>

      {/* Customer Data Table */}
      <DataTable
        columns={columns}
        data={customers}
        isLoading={loading}
        onRowClick={(row) => {
          setSelectedCustomer(row);
          setIsDetailModalOpen(true);
        }}
      />

      {/* Form Modal */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setCustomerToEdit(null);
        }}
        onSubmit={handleCreateOrUpdate}
        customerToEdit={customerToEdit}
        isLoading={submitting}
      />

      {/* Detail & Account Modal */}
      <CustomerDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        onStatusChange={handleStatusChange}
        onToggleLogin={handleToggleLogin}
      />

      {/* Enable Login Modal */}
      <EnableLoginModal
        isOpen={Boolean(enableLoginTarget)}
        onClose={() => setEnableLoginTarget(null)}
        customer={enableLoginTarget}
        onSuccess={fetchCustomers}
      />
    </div>
  );
}
