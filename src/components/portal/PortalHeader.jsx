import React, { useState } from 'react';
import { Menu, Search, Bell, LogOut, Shield, UserCheck, UserPlus, CheckCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { getRelativeTime } from '../../utils/date';

export default function PortalHeader({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const {
    notifications,
    unreadCount,
    isMarkingAll,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shadow-xs font-sans">
      {/* Left section: Sidebar toggle & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers, account numbers, GST..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-100 border border-transparent rounded-lg focus:bg-white focus:border-brand-primary focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Right section: Role Badge, Notifications & User Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Role Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {user?.role === 'admin' ? (
            <Shield className="w-3.5 h-3.5 text-blue-600" />
          ) : user?.role === 'staff' ? (
            <UserPlus className="w-3.5 h-3.5 text-amber-600" />
          ) : (
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
          )}
          <span className="capitalize">{user?.role || 'customer'} Mode</span>
        </div>

        {/* Notifications Icon Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 relative transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full leading-none shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">Realtime Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-brand-primary rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0 || isMarkingAll}
                  className={`text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                    unreadCount === 0 || isMarkingAll
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-brand-primary hover:underline cursor-pointer'
                  }`}
                >
                  {isMarkingAll ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Marking...</span>
                    </>
                  ) : (
                    <>
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark All as Read</span>
                    </>
                  )}
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No notifications yet.</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.is_read) {
                          markAsRead(n.id);
                        }
                      }}
                      className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer text-xs relative ${
                        !n.is_read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-brand-primary shrink-0" />
                          )}
                          <span className={`font-semibold ${!n.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                            {n.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                          {getRelativeTime(n.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 pl-3.5">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-slate-100 text-center bg-slate-50">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/portal/notifications');
                  }}
                  className="text-xs text-brand-primary font-semibold hover:underline cursor-pointer"
                >
                  View All Notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center justify-center text-xs overflow-hidden border border-slate-300">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0] || 'U'
              )}
            </div>
            <div className="hidden lg:block text-left leading-tight pr-1">
              <div className="text-xs font-semibold text-slate-800">{user?.name}</div>
              <div className="text-[10px] text-slate-500 capitalize">{user?.role}</div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/portal/profile');
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
              >
                Profile Settings
              </button>
              <div className="border-t border-slate-100 my-1"></div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
