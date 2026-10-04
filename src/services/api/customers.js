import { supabase } from '../../lib/supabase';
import { ledgerApi } from './ledger';
import { savingsApi } from './savings';
import { parseCurrency } from '../../utils/currency';

export const customerApi = {
  /**
   * Get all customers with their customer_accounts and customer_savings_accounts details from Supabase DB
   */
  async getCustomers(query = '', statusFilter = 'all') {
    let q = supabase
      .from('customers')
      .select(`
        *,
        account:customer_accounts(*),
        savings_account:customer_savings_accounts(*)
      `)
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      q = q.eq('status', statusFilter);
    }

    if (query && query.trim()) {
      q = q.or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,gst_number.ilike.%${query}%`);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const normalizedData = (data || []).map((cust) => ({
      ...cust,
      account: Array.isArray(cust.account) ? cust.account[0] : cust.account,
      savings_account: Array.isArray(cust.savings_account) ? cust.savings_account[0] : cust.savings_account,
    }));

    return { data: normalizedData, error: null };
  },

  /**
   * Get customer by ID
   */
  async getCustomerById(id) {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        account:customer_accounts(*),
        savings_account:customer_savings_accounts(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return {
      data: {
        ...data,
        account: Array.isArray(data.account) ? data.account[0] : data.account,
        savings_account: Array.isArray(data.savings_account) ? data.savings_account[0] : data.savings_account,
      },
      error: null,
    };
  },

  /**
   * Check for duplicate phone or email before creation
   */
  async checkDuplicate(phone, email, currentId = null) {
    const { data: phoneMatch } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .neq('id', currentId || '00000000-0000-0000-0000-000000000000');

    if (phoneMatch && phoneMatch.length > 0) {
      return { isDuplicate: true, field: 'phone', message: 'A customer with this phone number already exists.' };
    }

    if (email) {
      const { data: emailMatch } = await supabase
        .from('customers')
        .select('id')
        .eq('email', email)
        .neq('id', currentId || '00000000-0000-0000-0000-000000000000');

      if (emailMatch && emailMatch.length > 0) {
        return { isDuplicate: true, field: 'email', message: 'A customer with this email address already exists.' };
      }
    }

    return { isDuplicate: false };
  },

  /**
   * Create a new customer and trigger automated customer account creation
   * and optional initial opening balance ledger entry
   */
  async createCustomer(customerData, currentUser = null) {
    const dupCheck = await this.checkDuplicate(customerData.phone, customerData.email);
    if (dupCheck.isDuplicate) {
      throw new Error(dupCheck.message);
    }

    // 1. Insert customer record into Supabase
    const { data: customerRecord, error } = await supabase
      .from('customers')
      .insert([{
        name: customerData.name?.trim(),
        phone: customerData.phone?.trim(),
        email: customerData.email?.trim() || null,
        address: customerData.address?.trim() || null,
        gst_number: customerData.gst_number?.trim() || null,
        notes: customerData.notes?.trim() || null,
        is_login_enabled: Boolean(customerData.is_login_enabled),
        status: customerData.status || 'active',
      }])
      .select(`*, account:customer_accounts(*)`)
      .single();

    if (error) throw new Error(error.message);

    // 2. Handle Opening Balance if provided and > 0
    const rawOpeningBalance = customerData.opening_balance;
    const openingBalance = parseCurrency(rawOpeningBalance);

    if (openingBalance > 0) {
      // First attempt: use atomic database RPC function if available
      let rpcSucceeded = false;
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('record_customer_opening_balance', {
          p_customer_id: customerRecord.id,
          p_amount: openingBalance,
          p_notes: customerData.notes
            ? `Initial opening balance recorded at customer registration. Remarks: ${customerData.notes}`
            : 'Initial opening balance recorded at customer registration',
          p_created_by: currentUser?.id || null,
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
          rpcSucceeded = true;
        }
      } catch (e) {
        console.warn('RPC record_customer_opening_balance attempt fallback:', e.message);
      }

      // If RPC not available or failed, fallback to ledgerApi.addLedgerEntry
      if (!rpcSucceeded) {
        let accountId = (Array.isArray(customerRecord.account)
          ? customerRecord.account[0]?.id
          : customerRecord.account?.id) || null;

        if (!accountId) {
          const { data: acc } = await supabase
            .from('customer_accounts')
            .select('id')
            .eq('customer_id', customerRecord.id)
            .maybeSingle();
          accountId = acc?.id || null;
        }

        // Check if an opening_balance entry already exists to prevent duplicate entries
        const { data: existingOpening } = await supabase
          .from('ledger_entries')
          .select('id')
          .eq('customer_id', customerRecord.id)
          .eq('entry_type', 'opening_balance')
          .eq('is_deleted', false);

        if (!existingOpening || existingOpening.length === 0) {
          await ledgerApi.addLedgerEntry({
            customer_id: customerRecord.id,
            account_id: accountId,
            entry_type: 'opening_balance',
            amount: openingBalance,
            description: 'Initial Opening Balance',
            reference_no: 'INIT/OPENING',
            notes: customerData.notes
              ? `Initial opening balance recorded at customer registration. Remarks: ${customerData.notes}`
              : 'Initial opening balance recorded at customer registration',
          }, currentUser);
        }
      }
    }

    // 3. Handle Opening Savings Balance if provided and > 0 (SEPARATE SAVINGS SYSTEM)
    const rawOpeningSavings = customerData.opening_savings;
    const openingSavings = parseCurrency(rawOpeningSavings);

    if (openingSavings > 0) {
      try {
        await savingsApi.recordCustomerOpeningSavings({
          customerId: customerRecord.id,
          amount: openingSavings,
          notes: customerData.notes
            ? `Initial opening savings recorded at customer registration. Remarks: ${customerData.notes}`
            : 'Initial opening savings recorded at customer registration',
          currentUser,
        });
      } catch (e) {
        console.warn('Error recording opening savings balance:', e.message);
      }
    }

    // 4. Return freshly joined customer data with latest account totals
    const { data: updatedCustomer } = await this.getCustomerById(customerRecord.id);
    return { data: updatedCustomer || customerRecord, error: null };
  },

  /**
   * Update existing customer
   */
  async updateCustomer(id, updateData) {
    const dupCheck = await this.checkDuplicate(updateData.phone, updateData.email, id);
    if (dupCheck.isDuplicate) {
      throw new Error(dupCheck.message);
    }

    const { data, error } = await supabase
      .from('customers')
      .update({
        name: updateData.name,
        phone: updateData.phone,
        email: updateData.email || null,
        address: updateData.address || null,
        gst_number: updateData.gst_number || null,
        notes: updateData.notes || null,
        is_login_enabled: Boolean(updateData.is_login_enabled),
        status: updateData.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`*, account:customer_accounts(*)`)
      .single();

    if (error) throw new Error(error.message);
    return { data, error: null };
  },

  /**
   * Toggle Customer Status (pending_approval / active / inactive / blocked)
   */
  async updateStatus(id, newStatus) {
    const { data, error } = await supabase
      .from('customers')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { data, error: null };
  },

  /**
   * Toggle Portal Login Access for Customer
   */
  async toggleLoginAccess(id, isEnabled) {
    const { data, error } = await supabase
      .from('customers')
      .update({ is_login_enabled: isEnabled, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { data, error: null };
  },

  /**
   * Update Customer Contact Details (Phone / Email) from Receipt flow or Directory
   */
  async updateCustomerContact(id, { phone, email }) {
    if (phone || email) {
      const dupCheck = await this.checkDuplicate(phone || '', email || null, id);
      if (dupCheck.isDuplicate) {
        throw new Error(dupCheck.message);
      }
    }

    const updates = { updated_at: new Date().toISOString() };
    if (phone !== undefined) updates.phone = phone.trim();
    if (email !== undefined) updates.email = email ? email.trim() : null;

    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select(`*, account:customer_accounts(*)`)
      .single();

    if (error) throw new Error(error.message);

    return {
      data: {
        ...data,
        account: Array.isArray(data.account) ? data.account[0] : data.account,
      },
      error: null,
    };
  },
};
