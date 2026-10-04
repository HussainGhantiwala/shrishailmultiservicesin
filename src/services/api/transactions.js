import { supabase } from '../../lib/supabase';
import { ledgerApi } from './ledger';
import { savingsApi } from './savings';

/**
 * Transactions API Service — comprehensive timeline of all business transactions
 * (Lending Ledger + Customer Savings Ledger)
 */
export const transactionsApi = {
  /**
   * Fetch paginated transactions across Lending and Savings systems
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

    const isLendingFilter = ['credit', 'debit', 'adjustment', 'opening_balance'].includes(entryType);
    const isSavingsFilter = ['savings_deposit', 'savings_withdrawal', 'bill_payment', 'savings_opening'].includes(entryType);

    let allItems = [];

    // 1. Fetch from ledger_entries if applicable
    if (entryType === 'all' || isLendingFilter) {
      let ledgerQuery = supabase
        .from('ledger_entries')
        .select(`
          *,
          customer:customers(
            id, name, phone, email, status,
            account:customer_accounts(id, account_number, outstanding_balance, total_paid, total_credit, total_debit),
            savings_account:customer_savings_accounts(id, savings_balance, total_deposited, total_withdrawn)
          )
        `)
        .order('created_at', { ascending: false });

      if (!showDeleted) {
        ledgerQuery = ledgerQuery.eq('is_deleted', false);
      }

      if (isLendingFilter) {
        ledgerQuery = ledgerQuery.eq('entry_type', entryType);
      }

      if (startDate) {
        ledgerQuery = ledgerQuery.gte('created_at', `${startDate}T00:00:00Z`);
      }
      if (endDate) {
        ledgerQuery = ledgerQuery.lte('created_at', `${endDate}T23:59:59Z`);
      }

      if (searchQuery && searchQuery.trim()) {
        ledgerQuery = ledgerQuery.or(
          `description.ilike.%${searchQuery}%,reference_no.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%,payment_method.ilike.%${searchQuery}%`
        );
      }

      // If fetching all, grab enough recent records to merge
      const limit = entryType === 'all' ? 100 : pageSize * page;
      ledgerQuery = ledgerQuery.limit(limit);

      const { data: ledgerData, error: ledgerErr } = await ledgerQuery;
      if (ledgerErr) throw new Error(ledgerErr.message);

      (ledgerData || []).forEach((entry) => {
        const cust = entry.customer;
        const acc = cust?.account ? (Array.isArray(cust.account) ? cust.account[0] : cust.account) : null;
        const savAcc = cust?.savings_account ? (Array.isArray(cust.savings_account) ? cust.savings_account[0] : cust.savings_account) : null;

        const isSavingsBillPayment = entry.description?.startsWith('Savings Used for Bill Payment') ||
                                     entry.notes?.includes('[SAVINGS_PAYMENT]') ||
                                     entry.payment_method === 'Customer Savings';

        // If fetching 'all', we will display the BILL_PAYMENT from savings transactions which includes savings balance details
        if (entryType === 'all' && isSavingsBillPayment) {
          return;
        }

        let displayType = entry.entry_type;
        let outstandingEffect = 'Unchanged';
        const numAmt = Number(entry.amount) || 0;

        if (entry.entry_type === 'credit' || entry.entry_type === 'opening_balance') {
          outstandingEffect = `+₹${numAmt.toLocaleString('en-IN')}`;
        } else if (entry.entry_type === 'debit') {
          outstandingEffect = `-₹${numAmt.toLocaleString('en-IN')}`;
        }

        if (isSavingsBillPayment) {
          displayType = 'savings_bill_payment';
        }

        allItems.push({
          id: entry.id,
          source_table: 'ledger_entries',
          customer_id: entry.customer_id,
          customer: cust ? { ...cust, account: acc, savings_account: savAcc } : null,
          entry_type: entry.entry_type,
          display_type: displayType,
          category: 'lending',
          amount: numAmt,
          description: entry.description,
          reference_no: entry.reference_no,
          payment_method: entry.payment_method || (isSavingsBillPayment ? 'Customer Savings' : 'Cash'),
          notes: entry.notes,
          outstanding_effect: outstandingEffect,
          savings_balance_before: null,
          savings_balance_after: null,
          created_at: entry.created_at,
          is_deleted: entry.is_deleted,
          raw: entry,
        });
      });
    }

    // 2. Fetch from customer_savings_transactions if applicable
    if (entryType === 'all' || isSavingsFilter || entryType === 'opening_balance') {
      let savingsQuery = supabase
        .from('customer_savings_transactions')
        .select(`
          *,
          customer:customers(
            id, name, phone, email, status,
            account:customer_accounts(id, account_number, outstanding_balance, total_paid, total_credit, total_debit),
            savings_account:customer_savings_accounts(id, savings_balance, total_deposited, total_withdrawn)
          )
        `)
        .order('created_at', { ascending: false });

      if (!showDeleted) {
        savingsQuery = savingsQuery.eq('is_deleted', false);
      }

      if (entryType === 'savings_deposit') {
        savingsQuery = savingsQuery.in('transaction_type', ['DEPOSIT', 'CREDIT']);
      } else if (entryType === 'savings_withdrawal') {
        savingsQuery = savingsQuery.in('transaction_type', ['WITHDRAWAL', 'DEBIT']);
      } else if (entryType === 'bill_payment') {
        savingsQuery = savingsQuery.eq('transaction_type', 'BILL_PAYMENT');
      } else if (entryType === 'opening_balance' || entryType === 'savings_opening') {
        savingsQuery = savingsQuery.eq('transaction_type', 'OPENING');
      }

      if (startDate) {
        savingsQuery = savingsQuery.gte('created_at', `${startDate}T00:00:00Z`);
      }
      if (endDate) {
        savingsQuery = savingsQuery.lte('created_at', `${endDate}T23:59:59Z`);
      }

      if (searchQuery && searchQuery.trim()) {
        savingsQuery = savingsQuery.or(
          `description.ilike.%${searchQuery}%,reference_number.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%,payment_method.ilike.%${searchQuery}%`
        );
      }

      const limit = entryType === 'all' ? 100 : pageSize * page;
      savingsQuery = savingsQuery.limit(limit);

      const { data: savingsData, error: savingsErr } = await savingsQuery;
      if (savingsErr) throw new Error(savingsErr.message);

      (savingsData || []).forEach((tx) => {
        const cust = tx.customer;
        const acc = cust?.account ? (Array.isArray(cust.account) ? cust.account[0] : cust.account) : null;
        const savAcc = cust?.savings_account ? (Array.isArray(cust.savings_account) ? cust.savings_account[0] : cust.savings_account) : null;

        const numAmt = Number(tx.amount) || 0;
        const balAfter = Number(tx.balance_after) || 0;
        let balBefore = balAfter;

        let displayType = 'savings_deposit';
        let outstandingEffect = 'Unchanged';

        if (['CREDIT', 'DEPOSIT', 'OPENING'].includes(tx.transaction_type)) {
          displayType = tx.transaction_type === 'OPENING' ? 'savings_opening' : 'savings_deposit';
          balBefore = Math.max(0, balAfter - numAmt);
          outstandingEffect = 'Unchanged';
        } else if (['DEBIT', 'WITHDRAWAL'].includes(tx.transaction_type)) {
          displayType = 'savings_withdrawal';
          balBefore = balAfter + numAmt;
          outstandingEffect = 'Unchanged';
        } else if (tx.transaction_type === 'BILL_PAYMENT') {
          displayType = 'savings_bill_payment';
          balBefore = balAfter + numAmt;
          outstandingEffect = 'Unchanged';
        }

        allItems.push({
          id: tx.id,
          source_table: 'customer_savings_transactions',
          customer_id: tx.customer_id,
          customer: cust ? { ...cust, account: acc, savings_account: savAcc } : null,
          entry_type: tx.transaction_type.toLowerCase(),
          display_type: displayType,
          category: 'savings',
          amount: numAmt,
          description: tx.description,
          reference_no: tx.reference_number,
          payment_method: tx.payment_method || 'Customer Savings',
          notes: tx.notes,
          outstanding_effect: outstandingEffect,
          savings_balance_before: balBefore,
          savings_balance_after: balAfter,
          created_at: tx.created_at,
          is_deleted: tx.is_deleted,
          raw: tx,
        });
      });
    }

    // Sort combined list by created_at DESC
    allItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const totalCount = allItems.length;
    const from = (page - 1) * pageSize;
    const paginatedItems = allItems.slice(from, from + pageSize);

    return { data: paginatedItems, count: totalCount, error: null };
  },

  /**
   * Delegate CRUD to ledgerApi (for lending entries)
   */
  createTransaction: (...args) => ledgerApi.addLedgerEntry(...args),
  updateTransaction: (...args) => ledgerApi.updateLedgerEntry(...args),
  softDeleteTransaction: async (entry, currentUser, reason) => {
    if (entry.source_table === 'customer_savings_transactions') {
      return savingsApi.softDeleteSavingsTransaction(entry.id, currentUser, reason);
    }
    return ledgerApi.softDeleteEntry(entry.id, currentUser, reason);
  },
  restoreTransaction: (...args) => ledgerApi.restoreEntry(...args),

  /**
   * Realtime subscription for transaction changes (listens to both tables)
   */
  subscribeToChanges(callback) {
    const channelId = `transactions-changes-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_savings_transactions' }, callback)
      .subscribe();
    return channel;
  },
};
