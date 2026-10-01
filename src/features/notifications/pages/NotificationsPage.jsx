import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { notificationsApi } from '../../../services/api/notifications';
import {
  PageHeader,
  Card,
  Button,
  LoadingSpinner,
  EmptyState
} from '../../../components/common/';
import { getRelativeTime } from '../../../utils/date';
import { supabase } from '../../../lib/supabase';
import {
  Bell,
  BellOff,
  CheckCheck,
  Clock,
  AlertCircle,
  UserPlus,
  IndianRupee,
  ShieldCheck,
  ShieldBan
} from 'lucide-react';

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await notificationsApi.getNotifications(user.id);
      setNotifications(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();

    if (user?.id) {
      const channel = notificationsApi.subscribeToChanges(user.id, () => {
        fetchNotifications();
      });

      return () => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
    }
  }, [user?.id, fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      await notificationsApi.markAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      // Revert optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      const hasUnread = notifications.some((n) => !n.is_read);
      if (!hasUnread) return;

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      await notificationsApi.markAllAsRead(user.id);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      fetchNotifications(); // Refresh on failure
    }
  };

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
            onClick={handleMarkAllAsRead}
            disabled={!notifications.some((n) => !n.is_read)}
            className="text-xs font-sans rounded-xl shadow-xs"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        }
      />

      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        {['all', 'unread', 'read'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs font-medium font-sans capitalize rounded-xl transition-colors ${
              filter === f
                ? 'bg-slate-100 text-brand-primary'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            {f}
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
            onClick={fetchNotifications}
            className="text-red-600 hover:bg-red-100 text-xs font-sans rounded-xl"
          >
            Retry
          </Button>
        </Card>
      )}

      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={`No ${filter === 'all' ? '' : filter} notifications`}
            description="You're all caught up!"
          />
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => {
                if (!notification.is_read) handleMarkAsRead(notification.id);
              }}
              className={`group flex items-start p-4 rounded-xl border transition-all cursor-pointer shadow-xs font-sans ${
                notification.is_read
                  ? 'bg-white border-slate-200'
                  : 'bg-slate-50 border-blue-100'
              } hover:border-slate-300`}
            >
              <div className="flex-shrink-0 mt-1 relative">
                {getIcon(notification.title)}
                {!notification.is_read && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-slate-50"></span>
                )}
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <p
                    className={`text-sm truncate ${
                      notification.is_read
                        ? 'text-slate-700 font-medium'
                        : 'text-slate-900 font-semibold'
                    }`}
                  >
                    {notification.title}
                  </p>
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
