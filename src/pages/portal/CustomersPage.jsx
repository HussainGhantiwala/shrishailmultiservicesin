import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, Search, Plus, Phone, MapPin, ArrowUpRight } from 'lucide-react';

export default function CustomersPage() {
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Customer Directory & Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer contact records, ledger balances, and payment terms.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => alert('Customer registration modal will be added in Module Phase.')}
            className="px-3.5 py-2 bg-brand-primary text-white rounded-lg text-xs font-semibold hover:bg-brand-primary/90 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add New Customer
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, phone, GST..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs text-slate-600">
          <span className="font-semibold">Sort by:</span>
          <select className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none">
            <option>Highest Balance</option>
            <option>Recent Activity</option>
            <option>Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Customer List Table Placeholder */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">Outstanding Balance</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">
                  Ramesh Patel
                  <div className="text-[10px] text-slate-400 font-normal">GST: 27AAAAA0000A1Z5</div>
                </td>
                <td className="px-4 py-3 font-mono">+91 98230 11223</td>
                <td className="px-4 py-3">Solapur Road, MIDC</td>
                <td className="px-4 py-3 text-right font-bold text-rose-600">₹ 14,500 Due</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                    Payment Overdue
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => alert('Viewing customer ledger')} className="text-brand-primary font-semibold hover:underline">
                    View Ledger
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">
                  Vijay Multi-Services
                  <div className="text-[10px] text-slate-400 font-normal">GST: 27BBBBB1111B2Z8</div>
                </td>
                <td className="px-4 py-3 font-mono">+91 98901 22334</td>
                <td className="px-4 py-3">Industrial Area, Hubli</td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">₹ 0 (Clear)</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Active & Clear
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => alert('Viewing customer ledger')} className="text-brand-primary font-semibold hover:underline">
                    View Ledger
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
