import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Receipt,
  FileText,
  BarChart3,
  MessageSquare,
  Bell,
  Settings,
  ShieldCheck,
  User,
  ExternalLink,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function PortalSidebar({ isOpen, onClose }) {
  const { user, isAdmin, isStaff, isCustomer } = useAuth();

  const navigation = [
    { name: 'Dashboard', path: '/portal/dashboard', icon: LayoutDashboard, roles: ['admin', 'staff'] },
    { name: 'My Account', path: '/portal/customers', icon: Users, roles: ['customer'] },
    { name: 'Customers Directory', path: '/portal/customers', icon: Users, roles: ['admin', 'staff'] },
    { name: 'Ledger (Daily Book)', path: '/portal/ledger', icon: BookOpen, roles: ['admin', 'staff'] },
    { name: 'Transactions', path: '/portal/transactions', icon: Receipt, roles: ['admin', 'staff'] },
    { name: 'Reports', path: '/portal/reports', icon: FileText, roles: ['admin', 'staff'] },
    { name: 'Analytics', path: '/portal/analytics', icon: BarChart3, roles: ['admin'] },
    { name: 'SMS & Reminders', path: '/portal/sms', icon: MessageSquare, roles: ['admin', 'staff'] },
    { name: 'Notifications', path: '/portal/notifications', icon: Bell, roles: ['admin', 'staff', 'customer'] },
    { name: 'Settings', path: '/portal/settings', icon: Settings, roles: ['admin'] },
    { name: 'Audit Logs', path: '/portal/audit-logs', icon: ShieldCheck, roles: ['admin'] },
    { name: 'My Profile', path: '/portal/profile', icon: User, roles: ['admin', 'staff', 'customer'] },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Branding */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <Link to="/portal/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center text-white font-bold shadow-sm">
              S
            </div>
            <div className="leading-tight">
              <span className="font-bold text-slate-800 text-sm block">Shrishail Portal</span>
              <span className="text-[11px] text-slate-500 font-medium">Business Portal</span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Role Banner */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-emerald-500' : isStaff ? 'bg-amber-500' : 'bg-blue-500'}`} />
            <span className="text-xs font-semibold text-slate-700">
              Role: <span className="uppercase tracking-wide text-brand-primary">{user?.role || 'customer'}</span>
            </span>
          </div>
          <span className="text-[10px] font-medium text-slate-400">v1.0</span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const userRole = user?.role || 'customer';
            if (!item.roles.includes(userRole)) return null;

            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-brand-primary font-semibold border-l-4 border-brand-primary'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-slate-500" />
                <span className="truncate">{item.name}</span>
                {item.roles.length === 1 && item.roles[0] === 'admin' && (
                  <span className="ml-auto text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                    Admin
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Quick Link to Public Website */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <Link
            to="/"
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-slate-600 rounded-lg hover:bg-white hover:text-brand-primary border border-slate-200 transition-colors"
          >
            <span>Visit Public Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>
    </>
  );
}
