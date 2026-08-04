import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings, Building, Users, Shield, Save } from 'lucide-react';

export default function SettingsPage() {
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Business & Application Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure company details, GST info, expense categories, and staff access control.
          </p>
        </div>
        <button
          onClick={() => alert('Settings updated.')}
          className="px-3.5 py-2 bg-brand-primary text-white rounded-lg text-xs font-semibold hover:bg-brand-primary/90 transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </div>

      {/* Settings Form Grid */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div>
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
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Phone Number</label>
              <input
                type="text"
                defaultValue="+91 98765 43210"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Registered Address</label>
              <input
                type="text"
                defaultValue="Plot 42, Main Road, Solapur, Maharashtra"
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
