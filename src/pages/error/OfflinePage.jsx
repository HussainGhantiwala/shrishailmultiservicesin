import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import Button from '../../components/common/Button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">You Are Offline</h1>
      <p className="text-xs text-slate-500 max-w-sm mt-2 mb-6">
        Please check your internet connection. Data will sync automatically once reconnected.
      </p>
      <Button icon={RefreshCw} onClick={() => window.location.reload()}>
        Try Reconnecting
      </Button>
    </div>
  );
}
