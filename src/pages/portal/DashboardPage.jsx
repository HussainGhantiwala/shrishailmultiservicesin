import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Business Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Welcome back, <span className="font-semibold text-slate-700">{user?.name}</span> ({isAdmin ? 'Owner / Admin' : 'Customer Account'}). Here is your daily operational summary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => alert('Add Transaction modal will be available in Module Phase.')}
              className="px-3.5 py-2 bg-brand-primary text-white rounded-lg text-xs font-semibold hover:bg-brand-primary/90 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              New Entry
            </button>
          )}
          <Link
            to="/portal/ledger"
            className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1.5 border border-slate-200"
          >
            <FileSpreadsheet className="w-4 h-4" />
            View Daily Book
          </Link>
        </div>
      </div>

      {/* Role Notice Banner for Customer */}
      {!isAdmin && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900">
            <span className="font-semibold">Customer View Active:</span> You are currently viewing your account summary and ledger history in read-only mode.
          </div>
        </div>
      )}

      {/* KPI Cards Grid (Banking / PhonePe style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Today's Income</span>
            <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">₹ 24,500</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <span>+12% from yesterday</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Today's Expense</span>
            <div className="p-1.5 rounded-md bg-rose-50 text-rose-600">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">₹ 6,200</div>
          <div className="mt-1 text-[11px] text-slate-500">Fuel & Office supplies</div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Net Profit Today</span>
            <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">₹ 18,300</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">Positive Cash Flow</div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending Collections</span>
            <div className="p-1.5 rounded-md bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">₹ 42,000</div>
          <div className="mt-1 text-[11px] text-slate-500">8 pending customer payments</div>
        </div>
      </div>

      {/* Quick Status / Recent Transactions Table Placeholder */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Recent Transactions Overview</h2>
            <p className="text-xs text-slate-500">Module placeholder for live transactions feed</p>
          </div>
          <Link
            to="/portal/transactions"
            className="text-xs text-brand-primary font-semibold hover:underline flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Txn ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer / Particulars</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-medium text-slate-900">TXN-8801</td>
                <td className="px-4 py-3">Today, 09:45 AM</td>
                <td className="px-4 py-3 font-semibold text-slate-800">Ramesh Transport Services</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">Material</span></td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600">+ ₹ 15,000</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Paid (UPI)
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-medium text-slate-900">TXN-8802</td>
                <td className="px-4 py-3">Today, 11:20 AM</td>
                <td className="px-4 py-3 font-semibold text-slate-800">HP Fuel Station</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">Fuel</span></td>
                <td className="px-4 py-3 text-right font-bold text-rose-600">- ₹ 3,500</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Paid (Cash)
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-medium text-slate-900">TXN-8803</td>
                <td className="px-4 py-3">Yesterday</td>
                <td className="px-4 py-3 font-semibold text-slate-800">Patel Earthmovers</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">Services</span></td>
                <td className="px-4 py-3 text-right font-bold text-amber-600">₹ 12,000</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                    Pending Credit
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
