import { supabase } from '../../lib/supabase';
import { customerApi } from '../api/customers';
import { ledgerApi } from '../api/ledger';
import { isValidEmail, isValidPhone } from '../../utils/validation';
import { getAuthErrorMessage } from '../../utils/formatters';

export const authService = {
  /**
   * Authenticate user strictly via Supabase Auth & load DB profile role
   */
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email address and password are required.');
    }

    // 1. Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      const formattedErr = getAuthErrorMessage(error);
      throw new Error(formattedErr);
    }

    const authUser = data.user;
    if (!authUser) {
      throw new Error('Authentication succeeded but user identity was not returned.');
    }

    // 2. Load User Profile from DB (Role Resolution)
    const profile = await this.getUserProfile(authUser.id);
    const resolvedRole = profile?.role || 'customer';

    // 3. Load Customer Record & Check Status (if Customer)
    let customerRecord = null;
    if (resolvedRole === 'customer') {
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('*, account:customer_accounts(*)')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (custErr) {
        console.error('Error loading customer record:', custErr);
      }

      customerRecord = custData;

      if (custData && custData.status === 'blocked') {
        await supabase.auth.signOut();
        throw new Error('Your customer account has been blocked. Please contact support.');
      }

      if (custData && custData.status === 'inactive') {
        await supabase.auth.signOut();
        throw new Error('Your customer account is currently inactive. Please contact Shrishail Multi Services.');
      }
    }

    const sessionUser = {
      id: authUser.id,
      email: authUser.email,
      name: profile?.name || authUser.user_metadata?.name || authUser.email.split('@')[0],
      role: resolvedRole,
      phone: profile?.phone || authUser.user_metadata?.phone || '',
      status: customerRecord?.status || 'active',
      customerRecord,
      avatar: profile?.avatar_url || null,
    };

    return { success: true, user: sessionUser };
  },

  /**
   * Customer Self-Registration Flow
   */
  async signUp(customerData) {
    const { name, phone, email, password, address, notes } = customerData;

    if (!name || !phone || !email || !password) {
      throw new Error('Please fill in all mandatory fields.');
    }
    if (!isValidPhone(phone)) {
      throw new Error('Enter a valid 10-digit Indian mobile number.');
    }
    if (!isValidEmail(email)) {
      throw new Error('Enter a valid email address.');
    }

    // Check duplicate customer in DB
    const dupCheck = await customerApi.checkDuplicate(phone, email);
    if (dupCheck.isDuplicate) {
      throw new Error(dupCheck.message);
    }

    // 1. Create Supabase Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
          phone: phone.trim(),
          role: 'customer',
        },
      },
    });

    if (authError) {
      const formattedErr = getAuthErrorMessage(authError);
      throw new Error(formattedErr);
    }

    const userId = authData.user?.id;
    if (!userId) throw new Error('Failed to generate authentication user identity.');

    // 2. Create Customer Record with status 'pending_approval'
    const { data: customerRecord, error: custError } = await supabase
      .from('customers')
      .insert([{
        user_id: userId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        is_login_enabled: true,
        status: 'pending_approval',
      }])
      .select(`*, account:customer_accounts(*)`)
      .single();

    if (custError) throw new Error(custError.message);

    // 3. Create ₹0.00 Opening Balance Ledger Entry
    try {
      await ledgerApi.addLedgerEntry({
        customer_id: customerRecord.id,
        account_id: customerRecord.account?.id,
        entry_type: 'opening_balance',
        amount: 0,
        description: 'Self-registration opening account balance',
        reference_no: 'INIT/REG',
        notes: 'Initial registration ledger entry',
      }, { id: userId, name });
    } catch (e) {
      console.warn('Ledger opening balance post handled:', e.message);
    }

    return { success: true, user: authData.user, customer: customerRecord };
  },

  /**
   * Enable Login for Existing Manually Created Customer
   */
  async enableLoginForCustomer(customerId, email, password) {
    if (!email || !password) {
      throw new Error('Email address and temporary password are required.');
    }

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (!existingCustomer) throw new Error('Customer record not found.');

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: existingCustomer.name,
          phone: existingCustomer.phone,
          role: 'customer',
        },
      },
    });

    if (authError) {
      const formattedErr = getAuthErrorMessage(authError);
      throw new Error(formattedErr);
    }

    const { error: updateError } = await supabase
      .from('customers')
      .update({
        user_id: authData.user.id,
        email: email.trim(),
        is_login_enabled: true,
        status: existingCustomer.status === 'pending_approval' ? 'active' : existingCustomer.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId);

    if (updateError) throw new Error(updateError.message);

    return { success: true };
  },

  /**
   * Log out user from Supabase Auth session
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Signout error:', error.message);
    return { success: true };
  },

  /**
   * Send Password Reset Email via Supabase Auth
   */
  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      const formattedErr = getAuthErrorMessage(error);
      throw new Error(formattedErr);
    }
    return { success: true };
  },

  /**
   * Fetch User Profile Record from database
   */
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (error) console.error('Error fetching user profile:', error.message);
    return data;
  },

  /**
   * Get Current Session User from Supabase Auth & Profiles table
   */
  async getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const profile = await this.getUserProfile(session.user.id);
    
    let customerRecord = null;
    if (profile?.role === 'customer') {
      const { data: custData } = await supabase
        .from('customers')
        .select('*, account:customer_accounts(*)')
        .eq('user_id', session.user.id)
        .maybeSingle();
      customerRecord = custData;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: profile?.name || session.user.user_metadata?.name || session.user.email,
      role: profile?.role || 'customer',
      phone: profile?.phone || '',
      status: customerRecord?.status || 'active',
      customerRecord,
      avatar: profile?.avatar_url || null,
    };
  },

  /**
   * Subscribe to Supabase Auth State Changes
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser();
        callback(event, user);
      } else {
        callback(event, null);
      }
    });
  },

  /**
   * Update Profile Details (Full Name and Phone Number)
   * Persists changes to both public.profiles and auth user metadata
   */
  async updateProfile(userId, { name, phone }) {
    if (!userId) throw new Error('User identifier is missing.');

    const trimmedName = name ? name.trim() : '';
    if (!trimmedName) {
      throw new Error('Full name cannot be empty.');
    }

    let cleanPhone = null;
    if (phone && phone.trim()) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 10 && !(digits.length === 12 && digits.startsWith('91'))) {
        throw new Error('Please enter a valid 10-digit mobile number.');
      }
      cleanPhone = digits.length === 12 ? digits.slice(2) : digits;
    }

    // 1. Update public.profiles record
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({
        name: trimmedName,
        phone: cleanPhone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (profileError) {
      throw new Error(profileError.message || 'Failed to update user profile.');
    }

    // 2. Synchronize to Supabase Auth user metadata
    try {
      await supabase.auth.updateUser({
        data: {
          name: trimmedName,
          phone: cleanPhone,
        },
      });
    } catch (metaErr) {
      console.warn('Auth metadata sync notice:', metaErr.message);
    }

    // 3. If customer record exists for this user, keep customer details in sync
    try {
      await supabase
        .from('customers')
        .update({
          name: trimmedName,
          ...(cleanPhone ? { phone: cleanPhone } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } catch (custErr) {
      // Non-blocking if user is admin/staff
      console.warn('Customer table sync notice:', custErr.message);
    }

    // Return the fresh current user object
    return await this.getCurrentUser();
  },

  /**
   * Securely Change Password via Supabase Auth
   * Validates current credentials by re-authenticating before calling updateUser
   */
  async changePassword({ email, currentPassword, newPassword }) {
    if (!email) throw new Error('Account email is required.');
    if (!currentPassword) throw new Error('Please enter your current password.');
    if (!newPassword) throw new Error('Please enter your new password.');
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters in length.');
    }

    // 1. Verify current credentials against Supabase Auth
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: currentPassword,
    });

    if (verifyError) {
      throw new Error('Current password is incorrect. Please verify and try again.');
    }

    // 2. Perform authoritative password update via Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      const formatted = getAuthErrorMessage(updateError);
      throw new Error(formatted || 'Failed to update password.');
    }

    return { success: true };
  }
};
