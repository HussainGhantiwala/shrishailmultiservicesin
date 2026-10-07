import { supabase } from '../../lib/supabase';

/**
 * Pure Balance Calculation Engine
 */
export const calculateBalances = (entries = []) => {
  const activeEntries = entries.filter((e) => !e.is_deleted);

  let totalCredit = 0;
  let totalDebit = 0;
  let totalPaid = 0;
  let totalSavingsPaid = 0;
  let totalAdjustment = 0;

  activeEntries.forEach((entry) => {
    const amt = Number(entry.amount) || 0;
    if (entry.entry_type === 'credit' || entry.entry_type === 'opening_balance') {
      totalCredit += amt;
    } else if (entry.entry_type === 'debit') {
      totalDebit += amt;
      const isSavingsPayment =
        entry.payment_method === 'Customer Savings' ||
        entry.description?.startsWith('Savings Used for Bill Payment') ||
        entry.notes?.includes('[SAVINGS_PAYMENT]');

      if (isSavingsPayment) {
        totalSavingsPaid += amt;
      } else {
        totalPaid += amt;
      }
    } else if (entry.entry_type === 'adjustment') {
      totalAdjustment += amt;
    }
  });

  const rawBalance = (totalCredit + totalAdjustment) - totalDebit;
  const outstandingBalance = Math.max(0, rawBalance);
  const advanceBalance = Math.max(0, -rawBalance);
  const netReceivable = outstandingBalance - advanceBalance;

  return {
    totalCredit,
    totalDebit,
    totalPaid,
    totalSavingsPaid,
    totalAdjustment,
    rawBalance,
    outstandingBalance,
    advanceBalance,
    netReceivable,
  };
};

/**
 * Calculates per-customer running balance from oldest to newest entries
 */
export const computeRunningBalances = (entries = []) => {
  // Group entries by customer_id
  const customerMap = {};
  entries.forEach((entry) => {
    const cid = entry.customer_id || 'unknown';
    if (!customerMap[cid]) customerMap[cid] = [];
    customerMap[cid].push(entry);
  });

  const allComputed = [];

  // Compute running balance per customer
  Object.keys(customerMap).forEach((cid) => {
    const custEntries = customerMap[cid];
    const sorted = [...custEntries].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    let running = 0;

    const computed = sorted.map((entry) => {
      if (!entry.is_deleted) {
        const amt = Number(entry.amount) || 0;
        if (entry.entry_type === 'credit' || entry.entry_type === 'opening_balance') {
          running += amt;
        } else if (entry.entry_type === 'debit') {
          running -= amt;
        } else if (entry.entry_type === 'adjustment') {
          running += amt;
        }
      }
      return {
        ...entry,
        running_balance: running,
      };
    });

    allComputed.push(...computed);
  });

  // Sort final array newest first
  return allComputed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const ledgerApi = {
  /**
   * Fetch paginated ledger entries with filters directly from Supabase DB
   * Supports "All Customers" when customerId is null, '', or 'all'.
   */
  async getLedgerEntries(customerId = null, filters = {}) {
    const {
      searchQuery = '',
      entryType = 'all',
      customerTypeId = 'all',
      startDate = '',
      endDate = '',
      showDeleted = false,
      page = 1,
      pageSize = 25,
    } = filters;

    const isAllCustomers = !customerId || customerId === 'all';

    // 1. Resolve customerTypeId filtering if specified
    let matchingCustomerIds = null;
    let typedActiveCount = 0;
    if (customerTypeId && customerTypeId !== 'all') {
      try {
        const { data: typedCustomers } = await supabase
          .from('customers')
          .select('id, status, customer_type_id')
          .eq('customer_type_id', customerTypeId);

        matchingCustomerIds = (typedCustomers || []).map((c) => c.id);
        typedActiveCount = (typedCustomers || []).filter((c) => c.status === 'active').length;
      } catch (e) {
        matchingCustomerIds = [];
      }

      // Check local associations fallback if schema cache was pending
      try {
        const raw = localStorage.getItem('sms_customer_type_associations');
        if (raw) {
          const map = JSON.parse(raw);
          Object.entries(map).forEach(([cid, tid]) => {
            if (tid === customerTypeId && !matchingCustomerIds.includes(cid)) {
              matchingCustomerIds.push(cid);
            }
          });
        }
      } catch (e) {}

      // If no customers belong to this type, return empty results and 0 balances
      if (matchingCustomerIds.length === 0) {
        return {
          data: [],
          count: 0,
          error: null,
          balances: {
            totalCredit: 0,
            totalDebit: 0,
            totalPaid: 0,
            totalSavingsPaid: 0,
            totalAdjustment: 0,
            rawBalance: 0,
            outstandingBalance: 0,
            advanceBalance: 0,
            netReceivable: 0,
            activeCustomerCount: 0,
          },
        };
      }

      // If viewing a specific customer that is NOT of this type, return empty
      if (!isAllCustomers && !matchingCustomerIds.includes(customerId)) {
        return {
          data: [],
          count: 0,
          error: null,
          balances: {
            totalCredit: 0,
            totalDebit: 0,
            totalPaid: 0,
            totalSavingsPaid: 0,
            totalAdjustment: 0,
            rawBalance: 0,
            outstandingBalance: 0,
            advanceBalance: 0,
            netReceivable: 0,
            activeCustomerCount: 0,
          },
        };
      }
    }

    let query = supabase
      .from('ledger_entries')
      .select(`
        *,
        customer:customers(
          id, name, phone, email, status, customer_type_id,
          account:customer_accounts(id, account_number, outstanding_balance, total_paid, total_credit, total_debit, status)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (!isAllCustomers) {
      query = query.eq('customer_id', customerId);
    } else if (matchingCustomerIds !== null) {
      query = query.in('customer_id', matchingCustomerIds);
    }

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

    // Normalize customer account structure
    const normalizedData = (data || []).map((entry) => {
      const cust = entry.customer;
      const acc = cust?.account ? (Array.isArray(cust.account) ? cust.account[0] : cust.account) : null;
      return {
        ...entry,
        customer: cust ? { ...cust, account: acc } : null,
      };
    });

    const computedEntries = computeRunningBalances(normalizedData);
    let balances = calculateBalances(normalizedData);

    // If a specific customer is selected, query authoritative balances directly from customer_accounts
    if (!isAllCustomers) {
      try {
        const { data: acc } = await supabase
          .from('customer_accounts')
          .select('outstanding_balance, advance_balance, total_paid, total_credit, total_debit')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (acc) {
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

          balances = {
            totalCredit: Number(acc.total_credit || 0),
            totalDebit: Number(acc.total_debit || 0),
            totalPaid: Number(acc.total_paid !== undefined && acc.total_paid !== null ? acc.total_paid : balances.totalPaid),
            totalSavingsPaid: balances.totalSavingsPaid || 0,
            totalAdjustment: 0,
            rawBalance: raw,
            outstandingBalance: out,
            advanceBalance: adv,
            netReceivable: out - adv,
          };
        }
      } catch (e) {
        console.warn('Error fetching customer account authoritative balance:', e.message);
      }
    } else {
      // If viewing All Customers, compute aggregate stats across all accounts:
      // Customer A's credit MUST NEVER reduce Customer B's outstanding dues.
      try {
        let accQuery = supabase
          .from('customer_accounts')
          .select('outstanding_balance, advance_balance, total_paid, total_credit, total_debit, customer_id');

        if (matchingCustomerIds !== null) {
          accQuery = accQuery.in('customer_id', matchingCustomerIds);
        }

        const { data: accountsData } = await accQuery;
        let activeCount = typedActiveCount;
        if (matchingCustomerIds === null) {
          const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('status', 'active');
          activeCount = count;
        }

        let globalOutstanding = 0;
        let globalAdvance = 0;
        let globalCredit = 0;
        let globalDebit = 0;
        let globalPaid = 0;

        (accountsData || []).forEach((acc) => {
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

          globalOutstanding += out;
          globalAdvance += adv;
          globalCredit += Number(acc.total_credit || 0);
          globalDebit += Number(acc.total_debit || 0);
          globalPaid += Number(acc.total_paid !== undefined && acc.total_paid !== null ? acc.total_paid : acc.total_debit || 0);
        });

        balances = {
          totalCredit: globalCredit,
          totalDebit: globalDebit,
          totalPaid: globalPaid,
          totalSavingsPaid: balances.totalSavingsPaid || 0,
          totalAdjustment: 0,
          outstandingBalance: globalOutstanding,
          advanceBalance: globalAdvance,
          netReceivable: globalOutstanding - globalAdvance,
          activeCustomerCount: activeCount || 0,
        };
      } catch (e) {
        console.warn('Error computing all customer global balances:', e.message);
      }
    }

    return {
      data: computedEntries,
      count: count || 0,
      balances,
      error: null,
    };
  },

  /**
   * Add a new Ledger Entry & record Audit Log
   */
  async addLedgerEntry(entryData, currentUser) {
    if (!entryData.customer_id || entryData.amount === undefined || !entryData.entry_type || !entryData.description) {
      throw new Error('Customer, Entry Type, Amount, and Description are required.');
    }

    const newEntry = {
      customer_id: entryData.customer_id,
      account_id: entryData.account_id || null,
      entry_type: entryData.entry_type,
      amount: Number(entryData.amount),
      description: entryData.description,
      reference_no: entryData.reference_no || null,
      payment_method: entryData.payment_method || null,
      other_payment_method: entryData.other_payment_method || null,
      notes: entryData.notes || null,
      created_by: currentUser?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
    };

    const { data, error } = await supabase
      .from('ledger_entries')
      .insert([newEntry])
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Record Audit Log
    await this.logAudit({
      userId: currentUser?.id,
      userName: currentUser?.name,
      action: 'CREATE_LEDGER_ENTRY',
      entityId: data.id,
      afterState: data,
      reason: entryData.notes || 'New ledger entry recorded',
    });

    // Fetch the updated customer account with the new authoritative outstanding balance
    const { data: updatedAccount } = await supabase
      .from('customer_accounts')
      .select('*')
      .eq('customer_id', entryData.customer_id)
      .maybeSingle();

    return {
      data: {
        ...data,
        account: updatedAccount,
      },
      account: updatedAccount,
      error: null,
    };
  },

  /**
   * Update existing Ledger Entry & record Audit Log
   */
  async updateLedgerEntry(id, updateData, currentUser, reason = 'Updated entry details') {
    const { data: existing } = await supabase.from('ledger_entries').select('*').eq('id', id).single();

    const { data, error } = await supabase
      .from('ledger_entries')
      .update({
        entry_type: updateData.entry_type,
        amount: Number(updateData.amount),
        description: updateData.description,
        reference_no: updateData.reference_no || null,
        payment_method: updateData.payment_method || null,
        other_payment_method: updateData.other_payment_method || null,
        notes: updateData.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await this.logAudit({
      userId: currentUser?.id,
      userName: currentUser?.name,
      action: 'UPDATE_LEDGER_ENTRY',
      entityId: id,
      beforeState: existing,
      afterState: data,
      reason,
    });

    const cid = data.customer_id || existing?.customer_id;
    const { data: updatedAccount } = await supabase
      .from('customer_accounts')
      .select('*')
      .eq('customer_id', cid)
      .maybeSingle();

    return {
      data: {
        ...data,
        account: updatedAccount,
      },
      account: updatedAccount,
      error: null,
    };
  },

  /**
   * Soft Delete Ledger Entry
   */
  async softDeleteEntry(id, currentUser, reason = 'Entry soft-deleted by Admin') {
    const { data: existing } = await supabase.from('ledger_entries').select('*').eq('id', id).single();

    const { data, error } = await supabase
      .from('ledger_entries')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: currentUser?.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await this.logAudit({
      userId: currentUser?.id,
      userName: currentUser?.name,
      action: 'SOFT_DELETE_LEDGER_ENTRY',
      entityId: id,
      beforeState: existing,
      afterState: data,
      reason,
    });

    const cid = data.customer_id || existing?.customer_id;
    const { data: updatedAccount } = await supabase
      .from('customer_accounts')
      .select('*')
      .eq('customer_id', cid)
      .maybeSingle();

    return {
      data: {
        ...data,
        account: updatedAccount,
      },
      account: updatedAccount,
      error: null,
    };
  },

  /**
   * Restore Soft-Deleted Entry
   */
  async restoreEntry(id, currentUser, reason = 'Entry restored by Admin') {
    const { data: existing } = await supabase.from('ledger_entries').select('*').eq('id', id).single();

    const { data, error } = await supabase
      .from('ledger_entries')
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await this.logAudit({
      userId: currentUser?.id,
      userName: currentUser?.name,
      action: 'RESTORE_LEDGER_ENTRY',
      entityId: id,
      beforeState: existing,
      afterState: data,
      reason,
    });

    const cid = data.customer_id || existing?.customer_id;
    const { data: updatedAccount } = await supabase
      .from('customer_accounts')
      .select('*')
      .eq('customer_id', cid)
      .maybeSingle();

    return {
      data: {
        ...data,
        account: updatedAccount,
      },
      account: updatedAccount,
      error: null,
    };
  },

  /**
   * Log Audit Trail Entry
   */
  async logAudit({ userId, userName, action, entityId, beforeState, afterState, reason }) {
    const auditRecord = {
      user_id: userId || null,
      user_name: userName || 'User',
      action,
      entity_type: 'ledger',
      entity_id: entityId,
      before_state: beforeState || null,
      after_state: afterState || null,
      reason: reason || null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('audit_logs').insert([auditRecord]);
    if (error) console.warn('Audit log write error:', error.message);
  },

  /**
   * Fetch Audit Logs
   */
  async getAuditLogs(entityId = null) {
    let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
    if (entityId) q = q.eq('entity_id', entityId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { data: data || [] };
  },
};
