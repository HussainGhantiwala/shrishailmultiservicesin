import { supabase } from '../../lib/supabase';

export const dashboardApi = {
  getSummary: async () => {
    let summaryData = null;
    try {
      const { data, error } = await supabase.rpc('get_dashboard_summary');
      if (!error && data) {
        summaryData = data;
      }
    } catch (e) {
      console.warn('get_dashboard_summary rpc attempt fallback:', e.message);
    }

    if (!summaryData) {
      summaryData = {};
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Total savings held across all active customer savings accounts
    if (summaryData.total_savings === undefined || summaryData.total_savings === null) {
      try {
        const { data: accounts } = await supabase
          .from('customer_savings_accounts')
          .select('savings_balance')
          .eq('status', 'active');

        summaryData.total_savings = (accounts || []).reduce(
          (acc, curr) => acc + (Number(curr.savings_balance) || 0),
          0
        );
      } catch (e) {
        summaryData.total_savings = 0;
      }
    }

    // 2. Strict calculation of today's savings metrics:
    // Today's deposits: strictly DEPOSIT or CREDIT (NEVER OPENING!)
    // Today's withdrawals: strictly WITHDRAWAL or DEBIT
    // Today's bill payments: strictly BILL_PAYMENT
    try {
      const { data: todayTx } = await supabase
        .from('customer_savings_transactions')
        .select('transaction_type, amount')
        .gte('created_at', todayStart.toISOString())
        .eq('is_deleted', false);

      let deposits = 0;
      let withdrawals = 0;
      let billPayments = 0;
      (todayTx || []).forEach((tx) => {
        const amt = Number(tx.amount) || 0;
        if (tx.transaction_type === 'DEPOSIT' || tx.transaction_type === 'CREDIT') {
          deposits += amt;
        } else if (tx.transaction_type === 'WITHDRAWAL' || tx.transaction_type === 'DEBIT') {
          withdrawals += amt;
        } else if (tx.transaction_type === 'BILL_PAYMENT') {
          billPayments += amt;
        }
      });

      summaryData.today_savings_deposits = deposits;
      summaryData.today_savings_withdrawals = withdrawals;
      summaryData.today_savings_bill_payments = billPayments;

      if (summaryData.active_savings_customers === undefined || summaryData.active_savings_customers === null) {
        const { count } = await supabase
          .from('customer_savings_accounts')
          .select('*', { count: 'exact', head: true })
          .gt('savings_balance', 0)
          .eq('status', 'active');
        summaryData.active_savings_customers = count || 0;
      }
    } catch (e) {
      if (summaryData.today_savings_deposits === undefined) summaryData.today_savings_deposits = 0;
      if (summaryData.today_savings_withdrawals === undefined) summaryData.today_savings_withdrawals = 0;
      if (summaryData.today_savings_bill_payments === undefined) summaryData.today_savings_bill_payments = 0;
      if (summaryData.active_savings_customers === undefined) summaryData.active_savings_customers = 0;
    }

    // 3. Strict separation of cash payments from savings bill payments:
    // "Today's Payments Received" must STRICTLY count cash / bank / UPI payments.
    // It must NEVER include "Savings Used for Bill Payment" settlements!
    try {
      const { data: todayLedger } = await supabase
        .from('ledger_entries')
        .select('entry_type, amount, payment_method, description, is_deleted')
        .gte('created_at', todayStart.toISOString())
        .eq('is_deleted', false);

      if (todayLedger && todayLedger.length > 0) {
        let cashReceived = 0;
        let amountGiven = 0;
        todayLedger.forEach((entry) => {
          const amt = Number(entry.amount) || 0;
          if (entry.entry_type === 'debit') {
            const isSavingsPayment =
              entry.payment_method === 'Customer Savings' ||
              entry.description?.startsWith('Savings Used for Bill Payment') ||
              entry.notes?.includes('[SAVINGS_PAYMENT]');

            if (!isSavingsPayment) {
              cashReceived += amt;
            }
          } else if (entry.entry_type === 'credit' || entry.entry_type === 'opening_balance') {
            // Unpaid bill remainder from older failed tests should not be counted as amount given
            if (!entry.description?.startsWith('Unpaid Bill Remainder')) {
              amountGiven += amt;
            }
          }
        });
        summaryData.today_debit = cashReceived;
        summaryData.today_credit = amountGiven;
      }
    } catch (e) {
      console.warn('Error verifying today ledger cash debits:', e.message);
    }

    // 4. Calculate Total Outstanding Dues and Total Customer Credits/Advances independently:
    // Customer A's credit/advance MUST NEVER reduce Customer B's outstanding dues.
    try {
      const { data: accounts } = await supabase
        .from('customer_accounts')
        .select('outstanding_balance, advance_balance, total_credit, total_debit');

      if (accounts && accounts.length > 0) {
        let sumOutstanding = 0;
        let sumAdvance = 0;

        accounts.forEach((acc) => {
          const raw = (Number(acc.total_credit || 0)) - (Number(acc.total_debit || 0));
          let out = 0;
          let adv = 0;

          if (acc.advance_balance !== undefined && acc.advance_balance !== null) {
            out = Math.max(0, Number(acc.outstanding_balance || 0));
            adv = Math.max(0, Number(acc.advance_balance || 0));
          } else {
            if (raw > 0) {
              out = raw;
              adv = 0;
            } else if (raw < 0) {
              out = 0;
              adv = Math.abs(raw);
            }
          }

          sumOutstanding += out;
          sumAdvance += adv;
        });

        summaryData.total_outstanding = sumOutstanding;
        summaryData.total_advance = sumAdvance;
        summaryData.net_receivable = sumOutstanding - sumAdvance;
      } else {
        summaryData.total_outstanding = Math.max(0, Number(summaryData.total_outstanding || 0));
        summaryData.total_advance = Number(summaryData.total_advance || 0);
        summaryData.net_receivable = summaryData.total_outstanding - summaryData.total_advance;
      }
    } catch (e) {
      summaryData.total_outstanding = Math.max(0, Number(summaryData.total_outstanding || 0));
      summaryData.total_advance = Number(summaryData.total_advance || 0);
      summaryData.net_receivable = summaryData.total_outstanding - summaryData.total_advance;
    }

    // 5. Net Change Today:
    // Net change in customer outstanding dues today = Amount Given - Cash Payments Received
    const todayCredit = Number(summaryData.today_credit) || 0;
    const todayDebit = Number(summaryData.today_debit) || 0;
    summaryData.today_profit = todayCredit - todayDebit;

    return summaryData;
  },

  subscribeToChanges: (callback) => {
    const channelId = `dashboard-changes-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_accounts' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_savings_accounts' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_savings_transactions' }, callback)
      .subscribe();
    return channel;
  },
};
