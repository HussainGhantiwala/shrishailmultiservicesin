import React, { useState, useMemo } from 'react';
import { useNotifications } from '../../../context/NotificationContext';
import {
  PageHeader,
  Card,
  Button,
  LoadingSpinner,
  EmptyState
} from '../../../components/common/';
import { getRelativeTime } from '../../../utils/date';
import {
  Bell,
  BellOff,
  CheckCheck,
  Clock,
  AlertCircle,
  UserPlus,
  IndianRupee,
  ShieldCheck,
  ShieldBan,
  Loader2
} from 'lucide-react';

const NotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    loading,
    isMarkingAll,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  } = useNotifications();

  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);

  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case 'unread':
        return notifications.filter((n) => !n.is_read);
      case 'read':
        return notifications.filter((n) => n.is_read);
      case 'all':
      default:
        return notifications;
    }
  }, [notifications, filter]);

  const getIcon = (title) => {
    const t = (title || '').toLowerCase();
    if (t.includes('customer')) return <UserPlus className="w-5 h-5 text-blue-500" />;
    if (t.includes('payment') || t.includes('rupee')) return <IndianRupee className="w-5 h-5 text-emerald-500" />;
    if (t.includes('approve')) return <ShieldCheck className="w-5 h-5 text-green-500" />;
    if (t.includes('block') || t.includes('ban')) return <ShieldBan className="w-5 h-5 text-red-500" />;
    return <Bell className="w-5 h-5 text-slate-500" />;
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Notifications & Alerts"
        description="Stay updated with important activity from your business portal."
        actions={
          <Button
            variant="outline"
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || isMarkingAll}
            className="text-xs font-sans rounded-xl shadow-xs"
          >
            {isMarkingAll ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Marking All Read...
              </>
            ) : (
              <>
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark All as Read
              </>
            )}
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        {[
          { key: 'all', label: `All (${notifications.length})` },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'read', label: `Read (${Math.max(0, notifications.length - unreadCount)})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-xs font-medium font-sans rounded-xl transition-colors cursor-pointer ${
              filter === tab.key
                ? 'bg-slate-100 text-brand-primary font-semibold'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border-red-100 flex items-center justify-between rounded-xl shadow-xs">
          <div className="flex items-center text-red-600 text-xs font-sans">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setError(null);
              refreshNotifications();
            }}
            className="text-red-600 hover:bg-red-100 text-xs font-sans rounded-xl"
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={`No ${filter === 'all' ? '' : filter} notifications`}
            description={
              filter === 'unread'
                ? "You're all caught up! No unread notifications."
                : "No notifications found in this category."
            }
          />
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => {
                if (!notification.is_read) {
                  markAsRead(notification.id);
                }
              }}
              className={`group flex items-start p-4 rounded-xl border transition-all cursor-pointer shadow-xs font-sans ${
                notification.is_read
                  ? 'bg-white border-slate-200 hover:bg-slate-50/50'
                  : 'bg-blue-50/40 border-blue-200/80 hover:bg-blue-50/70'
              } hover:border-slate-300`}
            >
              <div className="flex-shrink-0 mt-1 relative">
                {getIcon(notification.title)}
                {!notification.is_read && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-primary rounded-full border-2 border-white shadow-xs"></span>
                )}
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm truncate ${
                        notification.is_read
                          ? 'text-slate-700 font-medium'
                          : 'text-slate-900 font-semibold'
                      }`}
                    >
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <span className="text-[10px] bg-blue-100 text-brand-primary px-1.5 py-0.5 rounded-full font-bold">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-slate-400 whitespace-nowrap">
                    <Clock className="w-3 h-3 mr-1" />
                    {getRelativeTime(notification.created_at)}
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                  {notification.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
