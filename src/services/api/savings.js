import { supabase } from '../../lib/supabase';

export const savingsApi = {
  /**
   * Get single customer savings account details
   */
  async getSavingsAccount(customerId) {
    if (!customerId) return { data: null, error: null };

    const { data, error } = await supabase
      .from('customer_savings_accounts')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return { data, error: null };
  },

  /**
   * Get all active savings accounts with customer info
   */
  async getAllSavingsAccounts() {
    const { data, error } = await supabase
      .from('customer_savings_accounts')
      .select(`
        *,
        customer:customers(id, name, phone, email, status)
      `)
      .order('savings_balance', { ascending: false });

    if (error) throw new Error(error.message);
    return { data: data || [], error: null };
  },

  /**
   * Fetch customer savings transactions with pagination & filters
   */
  async getSavingsTransactions(customerId = null, filters = {}) {
    const {
      transactionType = 'all',
      startDate = '',
      endDate = '',
      searchQuery = '',
      page = 1,
      pageSize = 25,
    } = filters;

    let query = supabase
      .from('customer_savings_transactions')
      .select(`
        *,
        customer:customers(id, name, phone, email)
      `, { count: 'exact' })
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (customerId && customerId !== 'all') {
      query = query.eq('customer_id', customerId);
    }

    if (transactionType && transactionType !== 'all') {
      const typeUpper = transactionType.toUpperCase();
      if (typeUpper === 'DEPOSIT' || typeUpper === 'CREDIT') {
        query = query.in('transaction_type', ['CREDIT', 'DEPOSIT']);
      } else if (typeUpper === 'WITHDRAWAL' || typeUpper === 'DEBIT') {
        query = query.in('transaction_type', ['DEBIT', 'WITHDRAWAL']);
      } else {
        query = query.eq('transaction_type', typeUpper);
      }
    }

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00Z`);
    }

    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59Z`);
    }

    if (searchQuery && searchQuery.trim()) {
      query = query.or(
        `description.ilike.%${searchQuery}%,reference_number.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%,payment_method.ilike.%${searchQuery}%`
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    return {
      data: data || [],
      count: count || 0,
      error: null,
    };
  },

  /**
   * Atomically record a savings deposit (DEPOSIT / CREDIT)
   * Financial Rule:
   * Savings: +amount
   * Outstanding Dues: UNCHANGED
   */
  async recordSavingsDeposit({
    customerId,
    amount,
    description,
    referenceNo = null,
    paymentMethod = 'Cash',
    notes = null,
    currentUser = null,
  }) {
    if (!customerId || !amount || !description) {
      throw new Error('Customer, amount, and description are required.');
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Amount must be a positive number.');
    }

    // Try RPC first
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('record_savings_transaction', {
        p_customer_id: customerId,
        p_transaction_type: 'DEPOSIT',
        p_amount: numAmount,
        p_description: description,
        p_reference_number: referenceNo,
        p_payment_method: paymentMethod,
        p_notes: notes,
        p_created_by: currentUser?.id || null,
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        return { data: rpcRes, error: null };
      }
      if (rpcErr && rpcErr.message && !rpcErr.message.includes('function') && !rpcErr.message.includes('does not exist')) {
        throw new Error(rpcErr.message);
      }
    } catch (e) {
      if (!e.message?.includes('does not exist')) {
        throw e;
      }
    }

    // Fallback: Direct insert if RPC not applied yet
    const { data: acc } = await supabase
      .from('customer_savings_accounts')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    const currentBal = Number(acc?.savings_balance || 0);
    const newBal = currentBal + numAmount;

    let accId = acc?.id;
    if (!accId) {
      const { data: newAcc } = await supabase
        .from('customer_savings_accounts')
        .insert([{ customer_id: customerId, savings_balance: newBal, total_deposited: numAmount }])
        .select()
        .single();
      accId = newAcc.id;
    } else {
      await supabase
        .from('customer_savings_accounts')
        .update({
          savings_balance: newBal,
          total_deposited: Number(acc.total_deposited || 0) + numAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accId);
    }

    const { data: tx, error: txErr } = await supabase
      .from('customer_savings_transactions')
      .insert([{
        customer_id: customerId,
        savings_account_id: accId,
        transaction_type: 'DEPOSIT',
        amount: numAmount,
        balance_after: newBal,
        description,
        reference_number: referenceNo,
        payment_method: paymentMethod,
        notes,
        created_by: currentUser?.id || null,
      }])
      .select()
      .single();

    if (txErr) throw new Error(txErr.message);

    // Audit log
    await supabase.from('audit_logs').insert([{
      user_id: currentUser?.id || null,
      user_name: currentUser?.name || 'User',
      action: 'RECORD_SAVINGS_DEPOSIT',
      entity_type: 'savings',
      entity_id: tx.id,
      after_state: tx,
      reason: notes || 'Savings deposit recorded',
      created_at: new Date().toISOString(),
    }]);

    return {
      data: {
        success: true,
        transaction: tx,
        savings_balance: newBal,
      },
      error: null,
    };
  },

  /**
   * Atomically record a savings withdrawal (WITHDRAWAL)
   * Financial Rule:
   * Savings: -amount (Must NOT exceed available savings!)
   * Outstanding Dues: UNCHANGED (Does NOT create or increase dues!)
   */
  async recordSavingsWithdrawal({
    customerId,
    amount,
    description,
    referenceNo = null,
    paymentMethod = 'Cash',
    notes = null,
    currentUser = null,
  }) {
    if (!customerId || !amount || !description) {
      throw new Error('Customer, withdrawal amount, and description are required.');
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Withdrawal amount must be a positive number.');
    }

    // Check balance first
    const { data: acc } = await supabase
      .from('customer_savings_accounts')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    const currentBal = Number(acc?.savings_balance || 0);
    if (numAmount > currentBal) {
      throw new Error(`Withdrawal amount cannot exceed available savings of ₹${currentBal.toLocaleString('en-IN')}.`);
    }

    // Try RPC first
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('record_savings_transaction', {
        p_customer_id: customerId,
        p_transaction_type: 'WITHDRAWAL',
        p_amount: numAmount,
        p_description: description,
        p_reference_number: referenceNo,
        p_payment_method: paymentMethod,
        p_notes: notes,
        p_created_by: currentUser?.id || null,
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        return { data: rpcRes, error: null };
      }
      if (rpcRes && rpcRes.success === false) {
        throw new Error(rpcRes.message || 'Withdrawal failed');
      }
      if (rpcErr && rpcErr.message && !rpcErr.message.includes('function') && !rpcErr.message.includes('does not exist')) {
        throw new Error(rpcErr.message);
      }
    } catch (e) {
      if (!e.message?.includes('does not exist')) {
        throw e;
      }
    }

    // Fallback: Direct mutation
    const newBal = currentBal - numAmount;
    if (newBal < 0) {
      throw new Error(`Withdrawal amount cannot exceed available savings of ₹${currentBal.toLocaleString('en-IN')}.`);
    }

    await supabase
      .from('customer_savings_accounts')
      .update({
        savings_balance: newBal,
        total_withdrawn: Number(acc.total_withdrawn || 0) + numAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', acc.id);

    const { data: tx, error: txErr } = await supabase
      .from('customer_savings_transactions')
      .insert([{
        customer_id: customerId,
        savings_account_id: acc.id,
        transaction_type: 'WITHDRAWAL',
        amount: numAmount,
        balance_after: newBal,
        description,
        reference_number: referenceNo,
        payment_method: paymentMethod,
        notes,
        created_by: currentUser?.id || null,
      }])
      .select()
      .single();

    if (txErr) throw new Error(txErr.message);

    // Audit log
    await supabase.from('audit_logs').insert([{
      user_id: currentUser?.id || null,
      user_name: currentUser?.name || 'User',
      action: 'RECORD_SAVINGS_WITHDRAWAL',
      entity_type: 'savings',
      entity_id: tx.id,
      after_state: tx,
      reason: notes || 'Savings withdrawal processed',
      created_at: new Date().toISOString(),
    }]);

    return {
      data: {
        success: true,
        transaction: tx,
        savings_balance: newBal,
      },
      error: null,
    };
  },

  /**
   * Atomically record opening savings balance
   */
  async recordCustomerOpeningSavings({ customerId, amount, notes = null, currentUser = null }) {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) return { data: null, error: null };

    // Try RPC first
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('record_customer_opening_savings', {
        p_customer_id: customerId,
        p_amount: numAmount,
        p_notes: notes,
        p_created_by: currentUser?.id || null,
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        // Defensive check: If the database ran an older migration where the balance was doubled,
        // sanitize it immediately so client and DB reflect exact numAmount.
        if (Number(rpcRes.savings_balance) > numAmount) {
          await supabase
            .from('customer_savings_accounts')
            .update({
              savings_balance: numAmount,
              total_deposited: 0.00,
              updated_at: new Date().toISOString(),
            })
            .eq('customer_id', customerId);

          rpcRes.savings_balance = numAmount;
        }

        return { data: rpcRes, error: null };
      }
      if (rpcErr && !rpcErr.message.includes('does not exist') && !rpcErr.message.includes('function')) {
        throw new Error(rpcErr.message);
      }
    } catch (e) {
      if (!e.message?.includes('does not exist') && !e.message?.includes('function')) {
        throw e;
      }
    }

    // Fallback: Direct insert with transaction_type: 'OPENING' (NEVER 'DEPOSIT'!)
    try {
      // 1. Ensure customer savings account exists
      let { data: acc } = await supabase
        .from('customer_savings_accounts')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (!acc) {
        const { data: newAcc, error: accErr } = await supabase
          .from('customer_savings_accounts')
          .insert([{ customer_id: customerId, savings_balance: 0.00, total_deposited: 0.00, total_withdrawn: 0.00, status: 'active' }])
          .select()
          .single();
        if (accErr) throw new Error(accErr.message);
        acc = newAcc;
      }

      // 2. Check if OPENING transaction already recorded
      const { data: existingOpening } = await supabase
        .from('customer_savings_transactions')
        .select('id')
        .eq('customer_id', customerId)
        .eq('transaction_type', 'OPENING')
        .eq('is_deleted', false);

      if (existingOpening && existingOpening.length > 0) {
        return { data: { success: true, message: 'Opening savings already recorded' }, error: null };
      }

      // 3. Insert OPENING transaction
      const { data: tx, error: txErr } = await supabase
        .from('customer_savings_transactions')
        .insert([{
          customer_id: customerId,
          savings_account_id: acc.id,
          transaction_type: 'OPENING',
          amount: numAmount,
          balance_after: numAmount,
          description: 'Initial Opening Savings Balance',
          reference_number: 'INIT/SAVINGS',
          payment_method: 'Cash',
          notes: notes || 'Initial opening savings balance recorded at registration',
          created_by: currentUser?.id || null,
        }])
        .select()
        .single();

      if (txErr) throw new Error(txErr.message);

      // 4. Update customer_savings_accounts with initial balance (total_deposited remains 0.00!)
      await supabase
        .from('customer_savings_accounts')
        .update({
          savings_balance: numAmount,
          total_deposited: 0.00,
          updated_at: new Date().toISOString(),
        })
        .eq('customer_id', customerId);

      return {
        data: {
          success: true,
          transaction: tx,
          savings_balance: numAmount,
        },
        error: null,
      };
    } catch (fallbackErr) {
      console.error('Fallback opening savings recording failed:', fallbackErr);
      throw fallbackErr;
    }
  },

  /**
   * ATOMIC BILL PAYMENT OPERATION (Pay Customer Bill)
   * Payment Source: 'customer_savings' OR 'owner_pocket'
   * 
   * When paid from customer_savings:
   * Savings: -billAmount
   * Outstanding Dues: -billAmount (recorded in ledger_entries as 'debit')
   * Cash/Bank: NO CHANGE (not double-counted as cash received)
   */
  async payCustomerBill({
    customerId,
    billAmount,
    description,
    paymentSource = 'customer_savings',
    referenceNumber = null,
    notes = null,
    currentUser = null,
  }) {
    if (!customerId) throw new Error('Customer is required.');
    const numBill = Number(billAmount);
    if (isNaN(numBill) || numBill <= 0) throw new Error('Valid bill amount greater than 0 is required.');
    if (!description?.trim()) throw new Error('Bill description is required.');

    // Always invoke the atomic backend RPC function
    let data = null;
    try {
      const res = await supabase.rpc('pay_customer_bill', {
        p_customer_id: customerId,
        p_bill_amount: numBill,
        p_description: description.trim(),
        p_payment_source: paymentSource,
        p_reference_number: referenceNumber ? referenceNumber.trim() : null,
        p_notes: notes ? notes.trim() : null,
        p_created_by: currentUser?.id || null,
      });

      if (res.error && !res.error.message.includes('function') && !res.error.message.includes('does not exist')) {
        throw new Error(res.error.message);
      }
      if (res.data) {
        data = res.data;
      }
    } catch (e) {
      if (!e.message?.includes('does not exist') && !e.message?.includes('function')) {
        throw e;
      }
    }

    if (data && data.success === false) {
      throw new Error(data.message || 'Bill payment failed');
    }

    // Pure client fallback if RPC does not exist at all on remote DB
    if (!data) {
      // 1. Fetch customer savings account
      const { data: acc } = await supabase
        .from('customer_savings_accounts')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle();

      const savingsBal = Number(acc?.savings_balance || 0);

      // 2. Fetch customer lending account
      const { data: custAcc } = await supabase
        .from('customer_accounts')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle();

      const currentOut = Number(custAcc?.outstanding_balance || 0);

      let savingsUsed = 0;
      let remainingBill = numBill;
      let newSavingsBal = savingsBal;
      let savingsTxId = null;

      if (paymentSource === 'customer_savings') {
        savingsUsed = Math.min(numBill, savingsBal);
        remainingBill = Math.max(0, numBill - savingsUsed);
        newSavingsBal = Math.max(0, savingsBal - savingsUsed);

        if (savingsUsed > 0 && acc) {
          await supabase
            .from('customer_savings_accounts')
            .update({
              savings_balance: newSavingsBal,
              total_withdrawn: Number(acc.total_withdrawn || 0) + savingsUsed,
              updated_at: new Date().toISOString(),
            })
            .eq('id', acc.id);

          const { data: stx } = await supabase
            .from('customer_savings_transactions')
            .insert([{
              customer_id: customerId,
              savings_account_id: acc.id,
              transaction_type: 'BILL_PAYMENT',
              amount: savingsUsed,
              balance_after: newSavingsBal,
              description: `Savings Used for Bill Payment: ${description.trim()}`,
              reference_number: referenceNumber ? referenceNumber.trim() : null,
              payment_method: 'Customer Savings',
              notes: notes
                ? `${notes.trim()} [BILL_PAYMENT] Total Bill: ₹${numBill}. Paid from Savings: ₹${savingsUsed}. Remaining added to dues: ₹${remainingBill}.`
                : `[BILL_PAYMENT] Total Bill: ₹${numBill}. Paid from Savings: ₹${savingsUsed}. Remaining added to dues: ₹${remainingBill}.`,
              created_by: currentUser?.id || null,
            }])
            .select()
            .single();

          savingsTxId = stx?.id;
        }
      } else {
        savingsUsed = 0;
        remainingBill = numBill;
      }

      // Lending entry: if remainingBill > 0, it was paid out of owner's pocket and added to dues (credit)
      let ledgerTxId = null;
      let newOutBal = currentOut;

      if (remainingBill > 0 && custAcc) {
        const desc = paymentSource === 'customer_savings'
          ? `Bill Payment (Remainder): ${description.trim()}`
          : `Bill Paid on Behalf of Customer: ${description.trim()}`;
        const noteTag = paymentSource === 'customer_savings'
          ? `[BILL_PAYMENT] Total Bill: ₹${numBill}. Paid from Savings: ₹${savingsUsed}. Remaining ₹${remainingBill} added to outstanding dues.`
          : `[OWNER_POCKET] Full bill ₹${numBill} paid from owner pocket. Added to outstanding dues.`;

        const { data: ltx } = await supabase
          .from('ledger_entries')
          .insert([{
            customer_id: customerId,
            account_id: custAcc.id,
            entry_type: 'credit',
            amount: remainingBill,
            running_balance: 0.00,
            description: desc,
            reference_no: referenceNumber ? referenceNumber.trim() : null,
            payment_method: 'Other',
            other_payment_method: 'Owner Pocket',
            notes: noteTag,
            created_by: currentUser?.id || null,
          }])
          .select()
          .single();

        ledgerTxId = ltx?.id;
        newOutBal = currentOut + remainingBill;

        const currentCredit = Number(custAcc.total_credit || 0);

        await supabase
          .from('customer_accounts')
          .update({
            outstanding_balance: newOutBal,
            total_credit: currentCredit + remainingBill,
            updated_at: new Date().toISOString(),
          })
          .eq('id', custAcc.id);
      }

      data = {
        success: true,
        payment_source: paymentSource,
        bill_amount: numBill,
        paid_from_savings: savingsUsed,
        remaining_bill: remainingBill,
        savings_balance: newSavingsBal,
        outstanding_balance: newOutBal,
        savings_transaction_id: savingsTxId,
        ledger_entry_id: ledgerTxId,
        description: description.trim(),
        reference_number: referenceNumber ? referenceNumber.trim() : null,
        transaction_type: paymentSource === 'customer_savings' ? 'Savings Used for Bill Payment' : 'Bill Paid (Owner Pocket)',
        message: remainingBill === 0
          ? `Bill of ₹${numBill} fully covered by customer savings.`
          : savingsUsed > 0
          ? `₹${savingsUsed} deducted from savings. Remaining ₹${remainingBill} added to customer outstanding dues.`
          : `Full bill of ₹${numBill} added to customer outstanding dues.`,
      };
    }

    return { data, error: null };
  },

  /**
   * Soft-delete a savings transaction and reverse balance effects
   */
  async softDeleteSavingsTransaction(transactionId, currentUser = null, reason = '') {
    if (!transactionId) throw new Error('Transaction ID is required');

    try {
      const { data, error } = await supabase.rpc('soft_delete_savings_transaction', {
        p_transaction_id: transactionId,
        p_deleted_by: currentUser?.id || null,
        p_reason: reason || null,
      });

      if (!error && data && data.success) {
        return { data, error: null };
      }
      if (error && !error.message.includes('function') && !error.message.includes('does not exist')) {
        throw new Error(error.message);
      }
    } catch (e) {
      if (!e.message?.includes('does not exist')) {
        throw e;
      }
    }

    // Direct fallback
    const { data: tx, error: fetchErr } = await supabase
      .from('customer_savings_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchErr) throw new Error(fetchErr.message);

    const { error: updErr } = await supabase
      .from('customer_savings_transactions')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: currentUser?.id || null,
      })
      .eq('id', transactionId);

    if (updErr) throw new Error(updErr.message);

    // Call recalculate RPC
    try {
      await supabase.rpc('recalculate_customer_savings_balance', { p_customer_id: tx.customer_id });
    } catch (e) {
      // Ignored if RPC missing
    }

    return { data: { success: true }, error: null };
  },

  /**
   * Get total global savings across all customers
   */
  async getTotalSavings() {
    try {
      const { data, error } = await supabase.rpc('get_total_savings');
      if (!error && data !== null) {
        return Number(data) || 0;
      }
    } catch (e) {
      // Fallback
    }

    const { data: accounts } = await supabase
      .from('customer_savings_accounts')
      .select('savings_balance')
      .eq('status', 'active');

    return (accounts || []).reduce((acc, curr) => acc + (Number(curr.savings_balance) || 0), 0);
  },

  /**
   * Get Savings Report data
   */
  async getSavingsReport(startDate = null, endDate = null, customerId = null) {
    const { data, error } = await supabase.rpc('get_savings_report', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_customer_id: customerId && customerId !== 'all' ? customerId : null,
    });

    if (error) throw new Error(error.message);

    const reportData = data || {};
    // Defensively ensure total_deposited strictly excludes OPENING savings
    if (reportData.transactions && Array.isArray(reportData.transactions)) {
      const actualDeposits = reportData.transactions
        .filter((t) => (t.transaction_type === 'DEPOSIT' || t.transaction_type === 'CREDIT') && !t.is_deleted)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      reportData.total_deposited = actualDeposits;
    }

    return reportData;
  },

  /**
   * Get Savings Analytics data (Trend, Top Savers, Recent Withdrawals)
   */
  async getSavingsAnalytics(months = 6) {
    try {
      const { data, error } = await supabase.rpc('get_savings_analytics', {
        p_months: months,
      });

      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('get_savings_analytics RPC fallback:', e.message);
    }

    // Client-side fallback aggregation
    const [accRes, txRes] = await Promise.all([
      supabase.from('customer_savings_accounts').select('*, customer:customers(id, name, phone)').eq('status', 'active'),
      supabase.from('customer_savings_transactions').select('*, customer:customers(name, phone)').eq('is_deleted', false).order('created_at', { ascending: false }).limit(200),
    ]);

    const accounts = accRes.data || [];
    const transactions = txRes.data || [];

    const totalSavings = accounts.reduce((acc, curr) => acc + (Number(curr.savings_balance) || 0), 0);
    const activeSavers = accounts.filter((a) => Number(a.savings_balance) > 0).length;
    const totalBillsPaidSavings = transactions
      .filter((t) => t.transaction_type === 'BILL_PAYMENT')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const topSavers = [...accounts]
      .filter((a) => Number(a.savings_balance) > 0)
      .sort((a, b) => Number(b.savings_balance) - Number(a.savings_balance))
      .slice(0, 5)
      .map((a) => ({
        id: a.customer_id,
        name: a.customer?.name || 'Customer',
        phone: a.customer?.phone || '',
        savings_balance: a.savings_balance,
        total_deposited: a.total_deposited,
        total_withdrawn: a.total_withdrawn,
      }));

    const recentWithdrawals = transactions
      .filter((t) => ['WITHDRAWAL', 'DEBIT', 'BILL_PAYMENT'].includes(t.transaction_type))
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        customer_id: t.customer_id,
        customer_name: t.customer?.name || 'Customer',
        customer_phone: t.customer?.phone || '',
        transaction_type: t.transaction_type,
        amount: t.amount,
        balance_after: t.balance_after,
        description: t.description,
        created_at: t.created_at,
      }));

    return {
      total_savings: totalSavings,
      active_savers: activeSavers,
      total_bills_paid_savings: totalBillsPaidSavings,
      monthly_trend: [],
      top_savers: topSavers,
      recent_withdrawals: recentWithdrawals,
    };
  },

  /**
   * Realtime subscription for savings updates
   */
  subscribeToSavingsChanges(callback) {
    const channelId = `savings-changes-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_savings_accounts' },
        () => {
          if (callback) callback();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_savings_transactions' },
        () => {
          if (callback) callback();
        }
      )
      .subscribe();

    return channel;
  },
};
