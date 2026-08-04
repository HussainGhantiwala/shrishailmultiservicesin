import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowUpRight, ArrowDownRight, Clock, Plus, ArrowRight, 
  TrendingUp, FileSpreadsheet, Users, UserCheck, AlertCircle, 
  IndianRupee, UserPlus, ShieldBan, Activity, CheckCircle
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { dashboardApi } from '../../../services/api/dashboard';
import { customerApi } from '../../../services/api/customers';
import StatCard from '../../../components/common/StatCard';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';
import { formatRupees } from '../../../utils/currency';
import { formatDateTime, getRelativeTime } from '../../../utils/date';
import { supabase } from '../../../lib/supabase';

const DashboardPage = () => {
  const { user, isAdmin, isStaff, isCustomer, canManageCustomers } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [pendingCustomersList, setPendingCustomersList] = useState([]);
  const [approvingId, setApprovingId] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const summaryData = await dashboardApi.getSummary();
      setSummary(summaryData);
      
      if (isAdmin || canManageCustomers) {
        const pendingResponse = await customerApi.getCustomers('', 'pending_approval');
        setPendingCustomersList(pendingResponse?.data || pendingResponse || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, canManageCustomers]);

  useEffect(() => {
    fetchDashboardData();

    const channel = dashboardApi.subscribeToChanges(() => {
      fetchDashboardData();
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchDashboardData]);

  const handleApproveCustomer = async (id) => {
    try {
      setApprovingId(id);
      await customerApi.updateStatus(id, 'active');
      toast.success('Customer approved successfully');
      fetchDashboardData();
    } catch (err) {
      console.error('Error approving customer:', err);
      toast.error('Failed to approve customer');
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-slate-500 font-sans">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <Button onClick={() => { setLoading(true); fetchDashboardData(); }}>
          Retry
        </Button>
      </div>
    );
  }

  if (isCustomer) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader 
          title="Customer Portal" 
          description={`Welcome back, ${user?.name || 'Customer'}.`}
        />
        <Card className="p-8 text-center bg-white shadow-xs rounded-xl">
          <Users className="w-12 h-12 text-brand-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Welcome to your Portal</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            View your ledger, transactions, and manage your account details easily.
          </p>
          <Button onClick={() => navigate('/portal/customers')}>
            Go to My Profile & Ledger
          </Button>
        </Card>
      </div>
    );
  }

  const {
    today_credit = 0,
    today_debit = 0,
    today_profit = 0,
    total_outstanding = 0,
    total_customers = 0,
    active_customers = 0,
    pending_customers = 0,
    blocked_customers = 0,
    recent_entries = []
  } = summary || {};

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <PageHeader
        title="Business Dashboard"
        description={`Welcome back, ${user?.name || 'User'}. Here is your live operational summary.`}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => navigate('/portal/ledger')}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              View Daily Book
            </Button>
            <Button variant="primary" onClick={() => navigate('/portal/ledger')}>
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          </div>
        }
      />

      {/* Row 1: Financials */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Amount Given"
          value={formatRupees(today_credit)}
          icon={ArrowUpRight}
          iconBg="bg-rose-50 text-rose-600"
          subtitle="Credit / Goods Supplied"
        />
        <StatCard
          title="Today's Payments Received"
          value={formatRupees(today_debit)}
          icon={ArrowDownRight}
          iconBg="bg-emerald-50 text-emerald-600"
          subtitle="Debit Settlements Collected"
        />
        <StatCard
          title="Net Change Today"
          value={formatRupees(today_profit)}
          icon={IndianRupee}
          iconBg="bg-blue-50 text-blue-600"
          subtitle="Added Outstanding Today"
        />
        <StatCard
          title="Total Outstanding Dues"
          value={formatRupees(total_outstanding)}
          icon={TrendingUp}
          iconBg="bg-amber-50 text-amber-600"
          subtitle="All Customers Dues"
        />
      </div>

      {/* Row 2: Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={total_customers.toString()}
          icon={Users}
          iconBg="bg-slate-100 text-slate-600"
        />
        <StatCard
          title="Active Customers"
          value={active_customers.toString()}
          icon={UserCheck}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Pending Approval"
          value={pending_customers.toString()}
          icon={UserPlus}
          iconBg="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Blocked"
          value={blocked_customers.toString()}
          icon={ShieldBan}
          iconBg="bg-rose-50 text-rose-600"
        />
      </div>

      {/* Pending Customers Section */}
      {pending_customers > 0 && (isAdmin || canManageCustomers) && (
        <Card className="bg-white shadow-xs rounded-xl overflow-hidden border border-amber-200">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-amber-50/50">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 flex items-center">
                <AlertCircle className="w-4 h-4 text-amber-500 mr-2" />
                New Customer Registrations ({pending_customers})
              </h3>
            </div>
            <Link to="/portal/customers?status=pending_approval" className="text-xs text-brand-primary font-medium hover:underline flex items-center">
              View all
              <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {pendingCustomersList.slice(0, 5).map(customer => (
              <div key={customer.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-medium text-sm">
                    {customer.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{customer.name}</p>
                    <p className="text-xs text-slate-500">{customer.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => navigate(`/portal/customers/${customer.id}`)}
                  >
                    Review
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => handleApproveCustomer(customer.id)}
                    disabled={approvingId === customer.id}
                  >
                    {approvingId === customer.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <><CheckCircle className="w-3 h-3 mr-1" /> Approve</>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="bg-white shadow-xs rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center">
            <Activity className="w-4 h-4 text-slate-500 mr-2" />
            Recent Activity
          </h3>
          <Link to="/portal/ledger" className="text-xs text-brand-primary font-medium hover:underline flex items-center">
            View full ledger
            <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>
        
        {recent_entries.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {recent_entries.map((entry) => (
              <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 p-2 rounded-lg ${
                    entry.entry_type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {entry.entry_type === 'credit' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {entry.customer_name || 'Walk-in Customer'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{entry.description}</p>
                    <div className="flex items-center mt-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {getRelativeTime(entry.created_at)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${
                    entry.entry_type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {entry.entry_type === 'credit' ? '+' : '-'}{formatRupees(entry.amount)}
                  </p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    entry.entry_type === 'credit' 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : 'bg-rose-50 text-rose-700'
                  }`}>
                    {entry.entry_type.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={<FileSpreadsheet className="w-12 h-12 text-slate-300" />}
              title="No recent activity"
              description="There are no entries recorded yet for today."
              actionLabel="Add New Entry"
              onAction={() => navigate('/portal/ledger')}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default DashboardPage;
