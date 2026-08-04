import { supabase } from '../../lib/supabase';

export const customerApi = {
  /**
   * Get all customers with their customer_accounts details from Supabase DB
   */
  async getCustomers(query = '', statusFilter = 'all') {
    let q = supabase
      .from('customers')
      .select(`
        *,
        account:customer_accounts(*)
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
        account:customer_accounts(*)
      `)
      .eq('id', id)
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
   */
  async createCustomer(customerData) {
    const dupCheck = await this.checkDuplicate(customerData.phone, customerData.email);
    if (dupCheck.isDuplicate) {
      throw new Error(dupCheck.message);
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([{
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email || null,
        address: customerData.address || null,
        gst_number: customerData.gst_number || null,
        notes: customerData.notes || null,
        is_login_enabled: Boolean(customerData.is_login_enabled),
        status: customerData.status || 'pending_approval',
      }])
      .select(`*, account:customer_accounts(*)`)
      .single();

    if (error) throw new Error(error.message);
    return { data, error: null };
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
  }
};
