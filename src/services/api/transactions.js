import { supabase } from '../../lib/supabase';
import { ledgerApi } from './ledger';

/**
 * Transactions API Service — backed entirely by Supabase ledger_entries table
 */
export const transactionsApi = {
  /**
   * Fetch paginated ledger entries with customer name joined
   */
  async getTransactions(filters = {}) {
    const {
      searchQuery = '',
      entryType = 'all',
      startDate = '',
      endDate = '',
      showDeleted = false,
      page = 1,
      pageSize = 20,
    } = filters;

    let query = supabase
      .from('ledger_entries')
      .select(`
        *,
        customer:customers(
          id, name, phone, email, status,
          account:customer_accounts(id, account_number, outstanding_balance, total_paid, total_credit, total_debit)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (!showDeleted) {
      query = query.eq('is_deleted', false);
    }

    if (entryType && entryType !== 'all') {
      query = query.eq('entry_type', entryType);
    }

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00Z`);
    }

    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59Z`);
    }

    if (searchQuery && searchQuery.trim()) {
      query = query.or(
        `description.ilike.%${searchQuery}%,reference_no.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%,payment_method.ilike.%${searchQuery}%`
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const normalizedData = (data || []).map((entry) => {
      const cust = entry.customer;
      const acc = cust?.account ? (Array.isArray(cust.account) ? cust.account[0] : cust.account) : null;
      return {
        ...entry,
        customer: cust ? { ...cust, account: acc } : null,
      };
    });

    return { data: normalizedData, count: count || 0, error: null };
  },

  /**
   * Delegate CRUD to ledgerApi (single source of truth)
   */
  createTransaction: (...args) => ledgerApi.addLedgerEntry(...args),
  updateTransaction: (...args) => ledgerApi.updateLedgerEntry(...args),
  softDeleteTransaction: (...args) => ledgerApi.softDeleteEntry(...args),
  restoreTransaction: (...args) => ledgerApi.restoreEntry(...args),

  /**
   * Realtime subscription for transaction changes
   */
  subscribeToChanges(callback) {
    const channelId = `transactions-changes-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, callback)
      .subscribe();
    return channel;
  },
};
