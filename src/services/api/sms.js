import { supabase } from '../../lib/supabase';
import { formatRupees } from '../../utils/currency';

/**
 * notificationService / smsApi
 * Backend-driven SMS dispatch service using Supabase Edge Function 'send-sms'
 * Never exposes Fast2SMS credentials to the frontend.
 */
export const notificationService = {
  /**
   * Helper to invoke send-sms edge function with fallback to local client db logging if edge function is unreachable
   */
  async _invokeEdgeSMS({ phone, message, customerId, currentUser, action = 'send_sms' }) {
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          action,
          phone,
          message,
          customer_id: customerId || null,
          created_by: currentUser?.id || null,
        },
      });

      if (error) {
        console.warn('Edge Function invoke error, falling back to direct DB log:', error);
        // Direct DB fallback insert if edge function fails to respond
        const { data: dbLog } = await supabase
          .from('sms_logs')
          .insert([
            {
              customer_id: customerId || null,
              phone: String(phone).replace(/\D/g, '').slice(-10),
              message: message,
              provider: 'Fast2SMS (Edge Fallback)',
              status: 'failed',
              response: { error: error.message || 'Edge Function invocation error' },
              sent_at: new Date().toISOString(),
              created_by: currentUser?.id || null,
            },
          ])
          .select()
          .single();

        return { success: false, error: error.message, status: 'failed', log: dbLog };
      }

      return data || { success: false, error: 'Empty response from send-sms' };
    } catch (err) {
      console.error('Failed to dispatch SMS:', err);
      return { success: false, error: err.message || 'SMS service error' };
    }
  },

  /**
   * Send Welcome SMS when customer registers
   */
  async sendWelcomeSMS({ customerId, phone, customerName, currentUser }) {
    const message = `Welcome to Shrishail Multi Services, ${customerName || 'Valued Customer'}! Your account has been registered successfully. Thank you for choosing us.`;
    return this._invokeEdgeSMS({ phone, message, customerId, currentUser });
  },

  /**
   * Send SMS when credit / amount is given to customer
   */
  async sendAmountGivenSMS({ customerId, phone, customerName, amount, runningBalance, referenceNo, currentUser }) {
    const formattedAmt = typeof amount === 'number' ? formatRupees(amount) : amount;
    const formattedBal = typeof runningBalance === 'number' ? formatRupees(runningBalance) : runningBalance;
    const message = `Dear ${customerName || 'Customer'}, Shrishail Multi Services has issued credit of ${formattedAmt}. Outstanding Balance: ${formattedBal}. Ref: ${referenceNo || 'N/A'}`;
    return this._invokeEdgeSMS({ phone, message, customerId, currentUser });
  },

  /**
   * Send SMS when payment is received from customer
   */
  async sendPaymentReceivedSMS({ customerId, phone, customerName, amount, runningBalance, referenceNo, currentUser }) {
    const formattedAmt = typeof amount === 'number' ? formatRupees(amount) : amount;
    const formattedBal = typeof runningBalance === 'number' ? formatRupees(runningBalance) : runningBalance;
    const message = `Dear ${customerName || 'Customer'}, payment of ${formattedAmt} received with thanks. Updated Outstanding Balance: ${formattedBal}. Ref: ${referenceNo || 'N/A'}. - Shrishail Multi Services`;
    return this._invokeEdgeSMS({ phone, message, customerId, currentUser });
  },

  /**
   * Send Payment Reminder SMS
   */
  async sendReminderSMS({ customerId, phone, customerName, outstandingBalance, currentUser }) {
    const formattedBal = typeof outstandingBalance === 'number' ? formatRupees(outstandingBalance) : outstandingBalance;
    const message = `Dear ${customerName || 'Customer'}, gentle reminder from Shrishail Multi Services. Outstanding balance due: ${formattedBal}. Please settle at your earliest convenience. Thank you!`;
    return this._invokeEdgeSMS({ phone, message, customerId, currentUser });
  },

  /**
   * Send Custom SMS
   */
  async sendCustomSMS({ customerId, phone, message, currentUser }) {
    return this._invokeEdgeSMS({ phone, message, customerId, currentUser });
  },

  /**
   * Check SMS Wallet / Credit Balance
   */
  async checkSMSBalance() {
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { action: 'get_balance' },
      });
      if (error) return { success: false, wallet: 0, error: error.message };
      return data || { success: false, wallet: 0 };
    } catch (err) {
      return { success: false, wallet: 0, error: err.message };
    }
  },

  /**
   * Fetch SMS Dispatch Logs from DB
   */
  async getSMSLogs({ searchQuery = '', page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('sms_logs')
      .select('*, customer:customers(name, phone)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (searchQuery && searchQuery.trim()) {
      query = query.or(`phone.ilike.%${searchQuery}%,message.ilike.%${searchQuery}%,provider.ilike.%${searchQuery}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    return { data: data || [], count: count || 0 };
  },
};

export const smsApi = notificationService;
