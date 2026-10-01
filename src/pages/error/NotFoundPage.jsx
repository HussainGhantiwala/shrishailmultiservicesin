import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-full bg-blue-100 text-brand-primary flex items-center justify-center mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">404 - Page Not Found</h1>
      <p className="text-xs text-slate-500 max-w-sm mt-2 mb-6">
        The page or section you are looking for does not exist or has been moved.
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
