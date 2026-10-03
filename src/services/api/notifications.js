import { supabase } from '../../lib/supabase';

export const notificationsApi = {
  /**
   * Fetch recent notifications for a user (ordered by newest first)
   */
  getNotifications: async (userId, limit = 50) => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error(error.message);
    }
    return data || [];
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (id, userId = null) => {
    if (!id) return null;

    // 1. Try atomic RPC if available
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('mark_notification_read', {
        p_id: id,
      });
      if (!rpcError) {
        return rpcData;
      }
    } catch {
      // Fallback to direct table update if RPC does not exist
    }

    // 2. Direct table update
    let query = supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.select();

    if (error) {
      console.error('Error marking notification as read:', error);
      throw new Error(error.message);
    }
    return data;
  },

  /**
   * Mark all unread notifications as read for a user
   */
  markAllAsRead: async (userId) => {
    if (!userId) return null;

    // 1. Try atomic RPC if available
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('mark_all_notifications_read', {
        p_user_id: userId,
      });
      if (!rpcError) {
        return rpcData;
      }
    } catch {
      // Fallback to direct table update if RPC does not exist
    }

    // 2. Direct table update
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error(error.message);
    }
    return data;
  },

  /**
   * Get exact count of unread notifications for a user (is_read = false)
   */
  getUnreadCount: async (userId) => {
    if (!userId) return 0;

    // 1. Try atomic RPC if available
    try {
      const { data: rpcCount, error: rpcError } = await supabase.rpc('get_unread_notification_count', {
        p_user_id: userId,
      });
      if (!rpcError && typeof rpcCount === 'number') {
        return rpcCount;
      }
    } catch {
      // Fallback to count query if RPC does not exist
    }

    // 2. Direct count query
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread notification count:', error);
      throw new Error(error.message);
    }
    return count || 0;
  },

  /**
   * Subscribe to notifications table changes for a user via Supabase Realtime
   */
  subscribeToChanges: (userId, callback) => {
    const channelId = `notifications-${userId || 'all'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          ...(userId ? { filter: `user_id=eq.${userId}` } : {}),
        },
        (payload) => {
          if (typeof callback === 'function') {
            callback(payload);
          }
        }
      )
      .subscribe();

    return channel;
  },
};
