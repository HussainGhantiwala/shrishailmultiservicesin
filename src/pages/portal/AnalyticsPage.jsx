import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Calendar } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Business Analytics & Growth
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Clear visual trends for revenue growth, profit margin analysis, and expense tracking.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <select className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none font-semibold text-slate-700">
            <option>This Month (August 2026)</option>
            <option>Last Month (July 2026)</option>
            <option>Financial Year 2026-27</option>
          </select>
        </div>
      </div>

      {/* Chart Placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Revenue & Expense Trend */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revenue vs Expense Trend</h3>
              <p className="text-xs text-slate-500">Monthly comparison (In Thousands ₹)</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              +18% Margin
            </span>
          </div>

          {/* Simple Visual Bars */}
          <div className="h-48 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-end justify-around p-4">
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 bg-brand-primary rounded-t" style={{ height: '60%' }}></div>
              <span className="text-[10px] text-slate-500 font-semibold">May</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 bg-brand-primary rounded-t" style={{ height: '75%' }}></div>
              <span className="text-[10px] text-slate-500 font-semibold">Jun</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 bg-brand-primary rounded-t" style={{ height: '90%' }}></div>
              <span className="text-[10px] text-slate-500 font-semibold">Jul</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 bg-brand-accent rounded-t" style={{ height: '80%' }}></div>
              <span className="text-[10px] text-brand-primary font-bold">Aug (Current)</span>
            </div>
          </div>
        </div>

        {/* Expense Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Expense Category Distribution</h3>
              <p className="text-xs text-slate-500">Major operational costs</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Vehicle Fuel & Maintenance</span>
                <span className="font-bold">42% (₹ 38,400)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Staff Salaries & Allowance</span>
                <span className="font-bold">35% (₹ 32,000)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '35%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Office Utilities & Electricity</span>
                <span className="font-bold">15% (₹ 13,500)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '15%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Miscellaneous</span>
                <span className="font-bold">8% (₹ 7,300)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-slate-400 h-2 rounded-full" style={{ width: '8%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
