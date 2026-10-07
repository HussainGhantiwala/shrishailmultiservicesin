import { supabase } from '../../lib/supabase';
import { ledgerApi } from './ledger';
import { savingsApi } from './savings';
import { customerTypesApi } from './customerTypes';
import { parseCurrency } from '../../utils/currency';

const CUSTOMER_TYPE_MAP_STORAGE_KEY = 'sms_customer_type_associations';

const getLocalCustomerTypeMap = () => {
  try {
    const raw = localStorage.getItem(CUSTOMER_TYPE_MAP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

const setLocalCustomerType = (customerId, customerTypeId) => {
  try {
    const map = getLocalCustomerTypeMap();
    if (customerTypeId) {
      map[customerId] = customerTypeId;
    } else {
      delete map[customerId];
    }
    localStorage.setItem(CUSTOMER_TYPE_MAP_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Could not cache customer type association:', e);
  }
};

export const customerApi = {
  /**
   * Get all customers with their customer_accounts, customer_savings_accounts,
   * and customer_types details from Supabase DB.
   * Supports statusFilter, customerTypeId filter, and search query.
   */
  async getCustomers(query = '', statusFilter = 'all', customerTypeId = 'all') {
    let data = null;
    let usedRelation = true;

    // 1. Try fetching with foreign key relationship customer_type:customer_types(*)
    let q = supabase
      .from('customers')
      .select(`
        *,
        account:customer_accounts(*),
        savings_account:customer_savings_accounts(*),
        customer_type:customer_types(*)
      `)
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      q = q.eq('status', statusFilter);
    }

    if (customerTypeId && customerTypeId !== 'all') {
      q = q.eq('customer_type_id', customerTypeId);
    }

    if (query && query.trim()) {
      q = q.or(`name.ilike.%${query.trim()}%,phone.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%,gst_number.ilike.%${query.trim()}%`);
    }

    const firstRes = await q;

    if (
      firstRes.error &&
      (firstRes.error.code === 'PGRST200' ||
        firstRes.error.code === 'PGRST205' ||
        firstRes.error.message?.includes('customer_types') ||
        firstRes.error.message?.includes('customer_type_id'))
    ) {
      // 2. Fallback without foreign relationship if migration is pending in DB
      usedRelation = false;
      let fallbackQ = supabase
        .from('customers')
        .select(`
          *,
          account:customer_accounts(*),
          savings_account:customer_savings_accounts(*)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        fallbackQ = fallbackQ.eq('status', statusFilter);
      }

      if (query && query.trim()) {
        fallbackQ = fallbackQ.or(`name.ilike.%${query.trim()}%,phone.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%,gst_number.ilike.%${query.trim()}%`);
      }

      const fallbackRes = await fallbackQ;
      if (fallbackRes.error) throw new Error(fallbackRes.error.message);
      data = fallbackRes.data || [];
    } else if (firstRes.error) {
      throw new Error(firstRes.error.message);
    } else {
      data = firstRes.data || [];
    }

    // 3. Load all Customer Types master records for mapping
    const { data: allTypes } = await customerTypesApi.getCustomerTypes({ activeOnly: false });
    const typeMap = new Map((allTypes || []).map((t) => [t.id, t]));
    const localTypeMap = getLocalCustomerTypeMap();

    // 4. Normalize records and resolve customer_type
    let normalizedData = data.map((cust) => {
      let resolvedType = cust.customer_type
        ? (Array.isArray(cust.customer_type) ? cust.customer_type[0] : cust.customer_type)
        : null;

      const typeId = cust.customer_type_id || localTypeMap[cust.id];

      if (!resolvedType && typeId && typeMap.has(typeId)) {
        resolvedType = typeMap.get(typeId);
      }

      return {
        ...cust,
        customer_type_id: typeId || null,
        customer_type: resolvedType || null,
        account: Array.isArray(cust.account) ? cust.account[0] : cust.account,
        savings_account: Array.isArray(cust.savings_account) ? cust.savings_account[0] : cust.savings_account,
      };
    });

    // 5. Apply customerTypeId filter if relation fallback was used
    if (!usedRelation && customerTypeId && customerTypeId !== 'all') {
      normalizedData = normalizedData.filter(
        (c) => c.customer_type_id === customerTypeId || c.customer_type?.id === customerTypeId
      );
    }

    // 6. Match customer type name if searching via search query
    if (query && query.trim()) {
      const qLower = query.trim().toLowerCase();
      // If user typed a customer type (e.g. 'Farmer'), ensure matching records are returned
      // if not already filtered
      const matchingTypes = (allTypes || []).filter((t) =>
        t.name?.toLowerCase().includes(qLower)
      );
      if (matchingTypes.length > 0 && normalizedData.length === 0) {
        // Query again without search constraint and filter by matching type in memory
        const { data: allCustomersRaw } = await customerApi.getCustomers('', statusFilter, customerTypeId);
        normalizedData = (allCustomersRaw || []).filter((c) =>
          matchingTypes.some((t) => t.id === c.customer_type_id || t.id === c.customer_type?.id)
        );
      }
    }

    return { data: normalizedData, error: null };
  },

  /**
   * Get customer by ID
   */
  async getCustomerById(id) {
    let data = null;

    let res = await supabase
      .from('customers')
      .select(`
        *,
        account:customer_accounts(*),
        savings_account:customer_savings_accounts(*),
        customer_type:customer_types(*)
      `)
      .eq('id', id)
      .single();

    if (
      res.error &&
      (res.error.code === 'PGRST200' ||
        res.error.code === 'PGRST205' ||
        res.error.message?.includes('customer_types'))
    ) {
      res = await supabase
        .from('customers')
        .select(`
          *,
          account:customer_accounts(*),
          savings_account:customer_savings_accounts(*)
        `)
        .eq('id', id)
        .single();
    }

    if (res.error) throw new Error(res.error.message);
    data = res.data;

    // Resolve customer_type
    const localTypeMap = getLocalCustomerTypeMap();
    const typeId = data.customer_type_id || localTypeMap[data.id];
    let resolvedType = data.customer_type
      ? (Array.isArray(data.customer_type) ? data.customer_type[0] : data.customer_type)
      : null;

    if (!resolvedType && typeId) {
      const { data: typeObj } = await customerTypesApi.getCustomerTypeById(typeId);
      resolvedType = typeObj || null;
    }

    return {
      data: {
        ...data,
        customer_type_id: typeId || null,
        customer_type: resolvedType || null,
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

    const customerTypeId = customerData.customer_type_id || null;

    // 1. Insert customer record into Supabase
    let insertPayload = {
      name: customerData.name?.trim(),
      phone: customerData.phone?.trim(),
      email: customerData.email?.trim() || null,
      address: customerData.address?.trim() || null,
      gst_number: customerData.gst_number?.trim() || null,
      notes: customerData.notes?.trim() || null,
      is_login_enabled: Boolean(customerData.is_login_enabled),
      status: customerData.status || 'active',
      customer_type_id: customerTypeId,
    };

    let customerRecord = null;
    let insertRes = await supabase
      .from('customers')
      .insert([insertPayload])
      .select(`*, account:customer_accounts(*)`)
      .single();

    if (
      insertRes.error &&
      (insertRes.error.message?.includes('customer_type_id') ||
        insertRes.error.code === 'PGRST204' ||
        insertRes.error.code === '42703')
    ) {
      // Column customer_type_id not yet created in remote DB, fallback
      delete insertPayload.customer_type_id;
      insertRes = await supabase
        .from('customers')
        .insert([insertPayload])
        .select(`*, account:customer_accounts(*)`)
        .single();
    }

    if (insertRes.error) throw new Error(insertRes.error.message);
    customerRecord = insertRes.data;

    // Remember customer_type_id in local mapping cache for offline/immediate availability
    if (customerTypeId && customerRecord?.id) {
      setLocalCustomerType(customerRecord.id, customerTypeId);
    }

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
   * Update existing customer (including customer_type_id)
   */
  async updateCustomer(id, updateData) {
    const dupCheck = await this.checkDuplicate(updateData.phone, updateData.email, id);
    if (dupCheck.isDuplicate) {
      throw new Error(dupCheck.message);
    }

    const updates = {
      name: updateData.name,
      phone: updateData.phone,
      email: updateData.email || null,
      address: updateData.address || null,
      gst_number: updateData.gst_number || null,
      notes: updateData.notes || null,
      is_login_enabled: Boolean(updateData.is_login_enabled),
      status: updateData.status,
      updated_at: new Date().toISOString(),
    };

    if (updateData.customer_type_id !== undefined) {
      updates.customer_type_id = updateData.customer_type_id || null;
    }

    let res = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select(`*, account:customer_accounts(*)`)
      .single();

    if (
      res.error &&
      (res.error.message?.includes('customer_type_id') ||
        res.error.code === 'PGRST204' ||
        res.error.code === '42703')
    ) {
      delete updates.customer_type_id;
      res = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select(`*, account:customer_accounts(*)`)
        .single();
    }

    if (res.error) throw new Error(res.error.message);

    if (updateData.customer_type_id !== undefined) {
      setLocalCustomerType(id, updateData.customer_type_id || null);
    }

    return this.getCustomerById(id);
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
