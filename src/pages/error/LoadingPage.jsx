import React from 'react';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <LoadingSpinner size="lg" />
      <p className="text-xs font-semibold text-slate-600 mt-4">Loading Shrishail Business Portal...</p>
    </div>
  );
}
