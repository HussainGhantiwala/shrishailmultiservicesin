import { supabase } from '../../lib/supabase';

export const notificationsApi = {
  getNotifications: async (userId) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return data;
  },
  markAsRead: async (id) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw new Error(error.message);
    return data;
  },
  markAllAsRead: async (userId) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw new Error(error.message);
    return data;
  },
  getUnreadCount: async (userId) => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw new Error(error.message);
    return count || 0;
  },
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
        callback
      )
      .subscribe();

    return channel;
  },
};
