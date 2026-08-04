import React from 'react';
import { Bell, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            System Notifications & Alerts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Important reminders regarding daily closing, pending payments, and account updates.
          </p>
        </div>
        <button onClick={() => alert('All marked as read.')} className="text-xs font-semibold text-brand-primary hover:underline">
          Mark All as Read
        </button>
      </div>

      {/* List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs divide-y divide-slate-100">
        <div className="p-4 flex items-start gap-3 bg-blue-50/50">
          <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-slate-900">Daily Cash Book Closing Reminder</div>
            <p className="text-slate-600 mt-0.5">Please ensure all today's cash and UPI transactions are verified before end of day.</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Today, 05:00 PM</span>
          </div>
        </div>

        <div className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-slate-900">Pending Customer Payment Alert</div>
            <p className="text-slate-600 mt-0.5">Ramesh Transport has an outstanding balance of ₹ 14,500 due for over 7 days.</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Yesterday, 10:00 AM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
