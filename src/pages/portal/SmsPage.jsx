import React from 'react';
import { MessageSquare, Send, Bell, Clock, CheckCircle } from 'lucide-react';

export default function SmsPage() {
  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            SMS & Payment Reminders
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated SMS notifications and WhatsApp payment reminder dispatch.
          </p>
        </div>
        <button
          onClick={() => alert('Broadcast feature will be implemented in SMS Module.')}
          className="px-3.5 py-2 bg-brand-primary text-white rounded-lg text-xs font-semibold hover:bg-brand-primary/90 transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Send className="w-4 h-4" />
          Send Payment Reminder SMS
        </button>
      </div>

      {/* SMS Templates & Log Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Default Reminder Template</h3>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono">
            "Dear [Customer Name], kindly note your pending payment of ₹ [Amount] for Shrishail Multi Services is due on [Date]. Please clear via UPI/Cash. Thank you!"
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={() => alert('Edit Template modal')} className="text-xs text-brand-primary font-semibold hover:underline">
              Edit Template
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Recent Dispatched Reminders</h3>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100">
              <div>
                <div className="font-semibold text-slate-800">Ramesh Transport (+91 98230 11223)</div>
                <div className="text-[10px] text-slate-500">Sent Today at 10:15 AM</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Delivered
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
