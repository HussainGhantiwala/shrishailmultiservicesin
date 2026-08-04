import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">403 - Access Forbidden</h1>
      <p className="text-xs text-slate-500 max-w-sm mt-2 mb-6">
        You do not have permission to access this resource. If you believe this is an error, please reach out to your administrator.
      </p>
      <Link
        to="/portal/dashboard"
        className="px-4 py-2.5 bg-brand-primary text-white text-xs font-semibold rounded-lg hover:bg-brand-primary/90 transition-colors inline-flex items-center gap-2 shadow-xs"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Portal Dashboard
      </Link>
    </div>
  );
}
