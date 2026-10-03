import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { notificationsApi } from '../services/api/notifications';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const toast = useToast();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const channelRef = useRef(null);

  /**
   * Authoritative fetch from Supabase:
   * Gets latest notifications and exact count of rows where is_read = false
   */
  const refreshNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const [list, count] = await Promise.all([
        notificationsApi.getNotifications(user.id),
        notificationsApi.getUnreadCount(user.id),
      ]);

      setNotifications(list || []);
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch (err) {
      console.warn('Error fetching notifications:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Centralized Realtime Subscription:
   * Exactly 1 subscription for the entire application, preventing duplicate events.
   */
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    refreshNotifications();

    const channel = notificationsApi.subscribeToChanges(user.id, (payload) => {
      if (!payload) return;

      if (payload.eventType === 'INSERT') {
        const newNotif = payload.new;
        if (newNotif) {
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
          if (!newNotif.is_read) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      } else if (payload.eventType === 'UPDATE') {
        const updated = payload.new;
        if (updated) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
          // Sync exact count from database to prevent drift
          notificationsApi.getUnreadCount(user.id).then((cnt) => {
            setUnreadCount(typeof cnt === 'number' ? cnt : 0);
          }).catch(() => {});
        }
      } else if (payload.eventType === 'DELETE') {
        if (payload.old?.id) {
          setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
          notificationsApi.getUnreadCount(user.id).then((cnt) => {
            setUnreadCount(typeof cnt === 'number' ? cnt : 0);
          }).catch(() => {});
        }
      }
    });

    channelRef.current = channel;

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      channelRef.current = null;
    };
  }, [user?.id, refreshNotifications]);

  /**
   * Mark a single notification as read
   */
  const markAsRead = useCallback(async (id) => {
    if (!user?.id || !id) return;

    let wasUnread = false;

    // Optimistic UI update
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target && !target.is_read) {
        wasUnread = true;
      }
      return prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
    });

    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await notificationsApi.markAsRead(id, user.id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      // Revert from server on failure
      refreshNotifications();
    }
  }, [user?.id, refreshNotifications]);

  /**
   * Mark all unread notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    if (!user?.id || isMarkingAll) return;

    // If nothing is unread, do nothing
    const hasUnread = notifications.some((n) => !n.is_read) || unreadCount > 0;
    if (!hasUnread) return;

    const prevNotifications = [...notifications];
    const prevCount = unreadCount;

    setIsMarkingAll(true);

    // Immediate optimistic update:
    // 1. All notification items become is_read: true in state
    // 2. Bell badge immediately updates to 0
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await notificationsApi.markAllAsRead(user.id);
      // Verify count directly from database
      const verifiedCount = await notificationsApi.getUnreadCount(user.id);
      setUnreadCount(typeof verifiedCount === 'number' ? verifiedCount : 0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      // Revert optimistic updates if server update failed
      setNotifications(prevNotifications);
      setUnreadCount(prevCount);
      toast.error('Failed to mark notifications as read. Please try again.');
    } finally {
      setIsMarkingAll(false);
    }
  }, [user?.id, isMarkingAll, notifications, unreadCount, toast]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        isMarkingAll,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
