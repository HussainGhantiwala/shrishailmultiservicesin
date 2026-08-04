import React, { useState } from 'react';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import { Save, Building, MessageSquare } from 'lucide-react';
import SmsSettingsCard from '../components/SmsSettingsCard';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('sms');

  return (
    <div className="space-y-6 font-sans text-xs">
      <PageHeader
        title="Business & Application Settings"
        description="Configure company details, SMS Gateway, notification templates, and staff access control."
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('sms')}
          className={`pb-3 text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'sms'
              ? 'text-brand-primary border-b-2 border-brand-primary'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          SMS Gateway & Fast2SMS
        </button>
        <button
          onClick={() => setActiveTab('company')}
          className={`pb-3 text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'company'
              ? 'text-brand-primary border-b-2 border-brand-primary'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          Company Information
        </button>
      </div>

      {activeTab === 'sms' ? (
        <SmsSettingsCard />
      ) : (
        <Card>
          <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-brand-primary" />
            Company Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Name</label>
              <input
                type="text"
                defaultValue="Shrishail Multi Services"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GST Number</label>
              <input
                type="text"
                defaultValue="27AAAAA0000A1Z5"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
