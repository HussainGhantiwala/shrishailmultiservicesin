import React from 'react';
import { ServerCrash, RefreshCw } from 'lucide-react';
import Button from '../../components/common/Button';

export default function ServerErrorPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
        <ServerCrash className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">500 - Server Error</h1>
      <p className="text-xs text-slate-500 max-w-sm mt-2 mb-6">
        Something went wrong on our end. Please try refreshing the page or contact system support.
      </p>
      <Button icon={RefreshCw} onClick={() => window.location.reload()}>
        Reload Application
      </Button>
    </div>
  );
}
