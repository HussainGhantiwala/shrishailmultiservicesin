import { supabase } from '../../lib/supabase';

export const dashboardApi = {
  getSummary: async () => {
    const { data, error } = await supabase.rpc('get_dashboard_summary');
    if (error) throw new Error(error.message);
    return data;
  },
  subscribeToChanges: (callback) => {
    const channelId = `dashboard-changes-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_accounts' }, callback)
      .subscribe();
    return channel;
  },
};
