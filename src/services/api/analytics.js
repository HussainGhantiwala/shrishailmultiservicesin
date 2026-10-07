import { supabase } from '../../lib/supabase';
import { savingsApi } from './savings';

export const analyticsApi = {
  /**
   * Get monthly revenue trend (credit vs debit vs net)
   * Supports optional customer and customer_type filtering
   */
  getMonthlyTrend: async (months = 6, customerId = null, customerTypeId = null) => {
    const { data, error } = await supabase.rpc('get_monthly_ledger_summary', {
      p_months: months,
      p_customer_id: customerId && customerId !== 'all' ? customerId : null,
      p_customer_type_id: customerTypeId && customerTypeId !== 'all' ? customerTypeId : null,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Get customer statistics (top outstanding, top paying, payment method distribution, summary totals)
   * Supports optional customer and customer_type filtering
   */
  getCustomerStatistics: async (customerId = null, customerTypeId = null) => {
    const { data, error } = await supabase.rpc('get_customer_statistics', {
      p_customer_id: customerId && customerId !== 'all' ? customerId : null,
      p_customer_type_id: customerTypeId && customerTypeId !== 'all' ? customerTypeId : null,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Get customer savings analytics (flow, top savers, recent withdrawals)
   * Supports optional customer and customer_type filtering
   */
  getSavingsAnalytics: async (months = 6, customerId = null, customerTypeId = null) => {
    return savingsApi.getSavingsAnalytics(months, customerId, customerTypeId);
  },
};
