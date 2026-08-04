import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 font-sans">
      <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
        You do not have administrative permissions to view this section. This page is restricted to Admin / Owner accounts.
      </p>
      <Link
        to="/portal/dashboard"
        className="px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded-lg hover:bg-brand-primary/90 transition-colors inline-flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Portal Dashboard
      </Link>
    </div>
  );
}
