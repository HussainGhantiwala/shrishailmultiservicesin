import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import Card from '../../../components/common/Card';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-brand-primary text-white text-2xl font-bold flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
          {user?.avatar ? (
            <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" />
          ) : (
            user?.name?.[0] || 'U'
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{user?.name}</h1>
          <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
            <span className="capitalize font-semibold text-brand-primary">{user?.role} Account</span>
            <span>•</span>
            <span>{user?.email}</span>
          </p>
        </div>
      </div>

      <Card header={<h3 className="text-sm font-bold text-slate-900">Account Profile Details</h3>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-500 mb-1">Full Name</label>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-semibold text-slate-800">{user?.name}</div>
          </div>
          <div>
            <label className="block text-slate-500 mb-1">Email Address</label>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-semibold text-slate-800">{user?.email}</div>
          </div>
          <div>
            <label className="block text-slate-500 mb-1">Phone Number</label>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono text-slate-800">{user?.phone || '+91 98765 43210'}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
