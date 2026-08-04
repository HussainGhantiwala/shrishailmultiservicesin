import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import StatCard from '../../../components/common/StatCard';
import StatusBadge from '../../../components/common/StatusBadge';
import DataTable from '../../../components/common/DataTable';
import SearchBar from '../../../components/common/SearchBar';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { Send, RefreshCw, MessageSquare, ShieldCheck, CheckCircle2, XCircle, CreditCard } from 'lucide-react';
import { notificationService } from '../../../services/api/sms';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { formatDateTime } from '../../../utils/date';

export default function SmsSettingsCard() {
  const toast = useToast();
  const { user } = useAuth();

  // Test SMS State
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Test message from Shrishail Multi Services portal.');
  const [sendingTest, setSendingTest] = useState(false);

  // SMS Balance & Logs State
  const [walletCredits, setWalletCredits] = useState(null);
  const [checkingWallet, setCheckingWallet] = useState(false);
  const [smsLogs, setSmsLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  // Check SMS Wallet Balance
  const fetchWallet = useCallback(async () => {
    setCheckingWallet(true);
    try {
      const res = await notificationService.checkSMSBalance();
      setWalletCredits(res.wallet ?? 0);
    } catch (e) {
      console.warn('Wallet check error:', e);
      setWalletCredits(0);
    } finally {
      setCheckingWallet(false);
    }
  }, []);

  // Fetch SMS Logs
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await notificationService.getSMSLogs({ searchQuery: logSearch });
      setSmsLogs(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch SMS history logs');
    } finally {
      setLoadingLogs(false);
    }
  }, [logSearch, toast]);

  useEffect(() => {
    fetchWallet();
    fetchLogs();
  }, [fetchWallet, fetchLogs]);

  // Send Test SMS Handler
  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testPhone || testPhone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!testMessage.trim()) {
      toast.error('Please enter a test message.');
      return;
    }

    setSendingTest(true);
    try {
      const res = await notificationService.sendCustomSMS({
        phone: testPhone,
        message: testMessage,
        currentUser: user,
      });

      if (res.success) {
        toast.success(`Test SMS dispatched successfully to +91 ${testPhone}!`);
        fetchLogs();
        fetchWallet();
      } else {
        toast.error(`SMS dispatch failed: ${res.error || res.response?.message || 'Check Fast2SMS logs'}`);
      }
    } catch (err) {
      toast.error(err.message || 'Error sending test SMS');
    } finally {
      setSendingTest(false);
    }
  };

  const logColumns = [
    {
      header: 'Date & Time',
      render: (row) => <span className="font-mono text-slate-600">{formatDateTime(row.created_at || row.sent_at)}</span>,
    },
    {
      header: 'Recipient Phone',
      render: (row) => <span className="font-mono font-bold text-slate-800">+91 {row.phone}</span>,
    },
    {
      header: 'Customer',
      render: (row) => <span className="font-semibold text-slate-900">{row.customer?.name || 'Manual / Guest'}</span>,
    },
    {
      header: 'Message Text',
      render: (row) => (
        <span className="text-slate-700 max-w-xs block truncate" title={row.message}>
          {row.message}
        </span>
      ),
    },
    {
      header: 'Provider',
      render: (row) => <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-semibold text-[10px] text-slate-700">{row.provider || 'Fast2SMS'}</span>,
    },
    {
      header: 'Status',
      align: 'center',
      render: (row) => (
        <StatusBadge
          status={row.status === 'sent' || row.status === 'delivered' ? 'success' : 'danger'}
          label={(row.status || 'FAILED').toUpperCase()}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="SMS Gateway Provider"
          value="Fast2SMS BulkV2"
          subtitle="Supabase Edge Function (Secure)"
          icon={ShieldCheck}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Gateway Status"
          value="ACTIVE / OPERATIONAL"
          subtitle="API Key Stored in Supabase Secrets"
          icon={CheckCircle2}
          iconBg="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Fast2SMS Wallet Credits"
          value={checkingWallet ? 'Checking...' : `₹ ${walletCredits !== null ? walletCredits : '0'}`}
          subtitle="Available SMS Balance"
          icon={CreditCard}
          iconBg="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Test SMS Form Card */}
      <Card className="p-4 shadow-xs border border-slate-200 bg-white rounded-xl">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
          <MessageSquare className="w-4 h-4 text-brand-primary" />
          Test SMS Gateway Dispatch
        </h3>
        <form onSubmit={handleSendTest} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Recipient Mobile Number</label>
              <div className="flex items-center">
                <span className="bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg px-2.5 py-1.5 font-bold text-slate-500">
                  +91
                </span>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="9876543210"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-r-lg px-3 py-1.5 font-mono text-xs text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Test Message Payload</label>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end items-center gap-2 pt-1">
            <Button variant="secondary" onClick={fetchWallet} disabled={checkingWallet} icon={RefreshCw}>
              Refresh Credits
            </Button>
            <Button variant="primary" type="submit" disabled={sendingTest} icon={Send}>
              {sendingTest ? 'Dispatching SMS...' : 'Send Test SMS'}
            </Button>
          </div>
        </form>
      </Card>

      {/* SMS Logs Table Card */}
      <Card className="p-4 shadow-xs border border-slate-200 bg-white rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">SMS Dispatch History & Logs</h3>
            <p className="text-[11px] text-slate-500">Live audit log of all automated and manual SMS dispatches.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <SearchBar placeholder="Search phone, message..." value={logSearch} onChange={setLogSearch} className="w-48" />
            <Button variant="secondary" onClick={fetchLogs} disabled={loadingLogs} icon={RefreshCw}>
              Refresh Logs
            </Button>
          </div>
        </div>

        {loadingLogs ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : smsLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-500">No SMS dispatch history found.</div>
        ) : (
          <DataTable columns={logColumns} data={smsLogs} />
        )}
      </Card>
    </div>
  );
}
