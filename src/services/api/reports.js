import { supabase } from '../../lib/supabase';

/**
 * Reports API Service — backed entirely by Supabase RPC functions and direct queries
 */
export const reportsApi = {
  /**
   * Get ledger report for a date range and optional customer filter via RPC
   */
  async getLedgerReport(startDate, endDate, customerId = null) {
    const pCustomerId = customerId && customerId !== 'all' ? customerId : null;
    const { data, error } = await supabase.rpc('get_ledger_report', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_customer_id: pCustomerId,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Get outstanding customer report — all customers with their account balances & last payment dates
   */
  async getOutstandingReport(sortOption = 'outstanding_desc', searchQuery = '') {
    let query = supabase
      .from('customers')
      .select(`
        id, name, phone, email, status, created_at,
        account:customer_accounts(
          account_number, outstanding_balance, advance_balance, total_paid, total_credit, total_debit, status, updated_at
        )
      `);

    if (searchQuery && searchQuery.trim()) {
      query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    if (sortOption === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortOption === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sortOption === 'name_asc') {
      query = query.order('name', { ascending: true });
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Normalize relation and calculate independent outstanding and advance balances
    let normalized = (data || []).map((c) => {
      const acc = Array.isArray(c.account) ? c.account[0] : c.account;
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
    }

    return normalized;
  },
};
