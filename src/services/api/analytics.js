import { supabase } from '../../lib/supabase';

export const analyticsApi = {
  getMonthlyTrend: async (months) => {
    const { data, error } = await supabase.rpc('get_monthly_ledger_summary', { p_months: months });
    if (error) throw new Error(error.message);
    return data;
  },
  getCustomerStatistics: async () => {
    const { data, error } = await supabase.rpc('get_customer_statistics');
    if (error) throw new Error(error.message);
    return data;
  }
};
