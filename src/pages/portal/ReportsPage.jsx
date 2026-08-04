import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { FileText, Download, Calendar, FileSpreadsheet, Printer } from 'lucide-react';

export default function ReportsPage() {
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Financial & Operational Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate and export daily, monthly, quarterly, and customer balance statements.
          </p>
        </div>
      </div>

      {/* Available Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Report 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-brand-primary flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Daily Cash Book Statement</h3>
            <p className="text-xs text-slate-500 mt-1">
              Complete itemized daily income, expenses, and closing balance statement.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
            <button onClick={() => alert('Exporting PDF...')} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center justify-center gap-1">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={() => alert('Exporting Excel...')} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center justify-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>

        {/* Report 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Customer Outstanding Ledger</h3>
            <p className="text-xs text-slate-500 mt-1">
              List of all customers with pending dues, last transaction dates, and contact info.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
            <button onClick={() => alert('Exporting PDF...')} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center justify-center gap-1">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={() => alert('Exporting Excel...')} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center justify-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>

        {/* Report 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Expense Category Breakdown</h3>
            <p className="text-xs text-slate-500 mt-1">
              Category-wise total expenditure summary (Fuel, Salaries, Maintenance).
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
            <button onClick={() => alert('Exporting PDF...')} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center justify-center gap-1">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={() => alert('Exporting Excel...')} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center justify-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
