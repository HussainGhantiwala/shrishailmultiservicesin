import { supabase } from '../../lib/supabase';
import { customerApi } from './customers';

/**
 * Reports API Service — backed entirely by Supabase RPC functions and direct queries
 */
export const reportsApi = {
  /**
   * Get ledger report for a date range, optional customer filter, and optional customer type filter via canonical RPC
   */
  async getLedgerReport(startDate, endDate, customerId = null, customerTypeId = null) {
    const pCustomerId = customerId && customerId !== 'all' ? customerId : null;
    const pCustomerTypeId = customerTypeId && customerTypeId !== 'all' ? customerTypeId : null;
    const pStartDate = startDate || null;
    const pEndDate = endDate || null;

    const { data, error } = await supabase.rpc('get_ledger_report', {
      p_start_date: pStartDate,
      p_end_date: pEndDate,
      p_customer_id: pCustomerId,
      p_customer_type_id: pCustomerTypeId,
    });

    if (error) {
      console.error('get_ledger_report RPC error:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Get outstanding customer report — all customers with their account balances & last payment dates.
   * Supports customerTypeId filtering.
   */
  async getOutstandingReport(sortOption = 'outstanding_desc', searchQuery = '', customerTypeId = 'all') {
    const { data: customersList, error: custErr } = await customerApi.getCustomers(
      searchQuery,
      'all',
      customerTypeId
    );

    if (custErr) throw new Error(custErr.message);

    // Normalize relation and calculate independent outstanding and advance balances
    let normalized = (customersList || []).map((c) => {
      const acc = c.account;
      if (!acc) return { ...c, account: null };

      const raw = Number(acc.total_credit || 0) - Number(acc.total_debit || 0);
      let out = 0;
      let adv = 0;

      if (acc.advance_balance !== undefined && acc.advance_balance !== null) {
        out = Math.max(0, Number(acc.outstanding_balance || 0));
        adv = Math.max(0, Number(acc.advance_balance || 0));
      } else {
        out = Math.max(0, raw);
        adv = Math.max(0, -raw);
      }

      return {
        ...c,
        account: {
          ...acc,
          raw_balance: raw,
          outstanding_balance: out,
          advance_balance: adv,
          net_balance: out - adv,
        },
      };
    });

    // Client-side sorting for account-level metrics if requested
    if (sortOption === 'outstanding_desc') {
      normalized.sort((a, b) => Number(b.account?.outstanding_balance || 0) - Number(a.account?.outstanding_balance || 0));
    } else if (sortOption === 'outstanding_asc') {
      normalized.sort((a, b) => Number(a.account?.outstanding_balance || 0) - Number(b.account?.outstanding_balance || 0));
    } else if (sortOption === 'advance_desc') {
      normalized.sort((a, b) => Number(b.account?.advance_balance || 0) - Number(a.account?.advance_balance || 0));
    } else if (sortOption === 'newest') {
      normalized.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortOption === 'oldest') {
      normalized.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortOption === 'name_asc') {
      normalized.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return normalized;
  },
};
