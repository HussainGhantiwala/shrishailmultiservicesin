import React from 'react';
import PageHeader from '../../../components/common/PageHeader';
import Card from '../../../components/common/Card';
import CustomerTypeManagementCard from '../../../components/portal/CustomerTypeManagementCard';
import { Building, ShieldCheck, Receipt } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 font-sans text-xs">
      <PageHeader
        title="Business & Application Settings"
        description="Configure company details, receipt branding, customer classification types, and administrative preferences."
      />

      {/* Customer Types Master Section */}
      <CustomerTypeManagementCard />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Details Card */}
        <Card className="p-5 shadow-xs border border-slate-200 bg-white rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-brand-primary" />
            Company Information
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Name</label>
              <input
                type="text"
                readOnly
                defaultValue="Shrishail Multi Services"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                readOnly
                defaultValue="27AAAAA0000A1Z5"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Registered Business Address</label>
              <input
                type="text"
                readOnly
                defaultValue="At. Post. Kasgi Taluka Omerga Dist. Dharashiv"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Contact</label>
              <input
                type="text"
                readOnly
                defaultValue="+91 98506 67573 • Smsuntnure123@gmail.com"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Operating Currency</label>
              <input
                type="text"
                readOnly
                defaultValue="INR (₹) - Indian Rupee"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800"
              />
            </div>
          </div>
        </Card>

        {/* Receipt Sharing System Overview */}
        <Card className="p-5 shadow-xs border border-slate-200 bg-white rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-brand-primary" />
            Receipt Dispatch System
          </h3>

          <div className="space-y-3 text-slate-600 leading-relaxed">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
              <span className="font-bold block mb-1">Direct Admin Sharing Enabled</span>
              Transaction receipts can be reviewed and manually shared with customers via WhatsApp and Email directly from the New Ledger Entry flow or transaction tables.
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero Third-Party Gateway Dependencies</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Receipts utilize direct client-side WhatsApp deep linking (wa.me) and secure email drafts. No external SMS API tokens or gateway subscriptions required.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
