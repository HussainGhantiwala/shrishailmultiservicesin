import React from 'react';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import { Send, CheckCircle } from 'lucide-react';

export default function SmsPage() {
  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="SMS & Payment Reminders"
        description="Automated SMS notifications and WhatsApp payment reminder dispatch."
        actions={
          <Button icon={Send} onClick={() => alert('Send SMS reminder')}>
            Send Payment Reminder SMS
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card header={<h3 className="text-sm font-bold text-slate-900">Default Reminder Template</h3>}>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono">
            "Dear [Customer Name], kindly note your pending payment of ₹ [Amount] for Shrishail Multi Services is due on [Date]. Please clear via UPI/Cash. Thank you!"
          </div>
        </Card>

        <Card header={<h3 className="text-sm font-bold text-slate-900">Recent Dispatched Reminders</h3>}>
          <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100 text-xs">
            <div>
              <div className="font-semibold text-slate-800">Ramesh Transport (+91 98230 11223)</div>
              <div className="text-[10px] text-slate-500">Sent Today at 10:15 AM</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Delivered
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
