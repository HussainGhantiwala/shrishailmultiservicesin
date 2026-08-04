import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Standard Supabase CORS headers for browser preflight and API requests
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-custom-header",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

// Helper for consistent JSON responses with CORS headers
const jsonResponse = (data: Record<string, any>, status: number = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
};

serve(async (req: Request) => {
  // 1. Explicitly handle CORS preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY") ||
      "";
    const fast2smsApiKey = Deno.env.get("FAST2SMS_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Safely parse JSON request body
    const body = await req.json().catch(() => ({}));
    const {
      action = "send_sms",
      phone,
      message,
      customer_id,
      created_by,
    } = body;

    // Action 1: Check Wallet Balance
    if (action === "get_balance") {
      if (!fast2smsApiKey) {
        console.error("FAST2SMS_API_KEY secret is missing in Supabase environment.");
        return jsonResponse({
          success: false,
          error: "FAST2SMS_API_KEY secret is not configured in Supabase Secrets.",
          wallet: 0,
        });
      }

      try {
        const balanceRes = await fetch("https://www.fast2sms.com/dev/wallet", {
          method: "GET",
          headers: {
            authorization: fast2smsApiKey,
          },
        });

        const balanceStatus = balanceRes.status;
        const balanceData = await balanceRes.json().catch(() => ({}));

        console.log(`Fast2SMS Wallet API Status [HTTP ${balanceStatus}]:`, balanceData);

        return jsonResponse({
          success: balanceRes.ok && balanceData.return !== false,
          wallet: balanceData.wallet ?? balanceData.credit ?? 0,
          response: balanceData,
        });
      } catch (err: any) {
        console.error("Fast2SMS Wallet API Fetch Error:", err);
        return jsonResponse({
          success: false,
          error: err.message || "Failed to reach Fast2SMS wallet API.",
          wallet: 0,
        });
      }
    }

    // Action 2: Send Quick SMS (route: "q")
    if (!phone || !message) {
      return jsonResponse({
        success: false,
        error: "Phone number and message payload are required.",
      });
    }

    // Sanitize to 10-digit Indian phone number
    const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      return jsonResponse({
        success: false,
        error: "Invalid mobile number. Must be a valid 10-digit phone number.",
      });
    }

    let smsStatus = "failed";
    let apiResponse: Record<string, any> = {};
    let providerError: string | null = null;

    if (!fast2smsApiKey) {
      providerError = "FAST2SMS_API_KEY environment secret is not configured in Supabase Secrets.";
      apiResponse = { error: providerError };
      console.error(providerError);
    } else {
      try {
        // Fast2SMS Quick SMS Route Payload (route: "q")
        const payload = {
          route: "q",
          message: message,
          language: "english",
          flash: 0,
          numbers: cleanPhone,
        };

        console.log(`Dispatching Fast2SMS Quick SMS to +91 ${cleanPhone}...`, payload);

        const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            authorization: fast2smsApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const httpStatus = smsRes.status;
        const httpStatusText = smsRes.statusText;
        apiResponse = await smsRes.json().catch(() => ({}));

        console.log(`Fast2SMS Response [HTTP ${httpStatus} ${httpStatusText}]:`, apiResponse);

        // Evaluate return state from Fast2SMS
        if (smsRes.ok && (apiResponse.return === true || apiResponse.status_code === 200)) {
          smsStatus = "sent";
        } else {
          smsStatus = "failed";
          // Extract provider's exact error message
          providerError =
            apiResponse.message ||
            (Array.isArray(apiResponse.message) ? apiResponse.message.join(", ") : null) ||
            apiResponse.error ||
            apiResponse.status_text ||
            `Fast2SMS HTTP ${httpStatus} ${httpStatusText}`;
        }
      } catch (err: any) {
        console.error("Network error while calling Fast2SMS API:", err);
        providerError = err.message || "Network error while calling Fast2SMS API.";
        apiResponse = { error: providerError };
        smsStatus = "failed";
      }
    }

    // Always log every dispatch attempt into sms_logs table
    let logRecord = null;
    try {
      const { data } = await supabase
        .from("sms_logs")
        .insert([
          {
            customer_id: customer_id || null,
            phone: cleanPhone,
            message: message,
            provider: "Fast2SMS",
            status: smsStatus,
            response: {
              ...apiResponse,
              provider_error: providerError,
            },
            sent_at: new Date().toISOString(),
            created_by: created_by || null,
          },
        ])
        .select()
        .single();
      logRecord = data;
    } catch (logErr) {
      console.error("Failed to insert into sms_logs:", logErr);
    }

    return jsonResponse({
      success: smsStatus === "sent",
      status: smsStatus,
      phone: cleanPhone,
      message: message,
      error: providerError,
      response: apiResponse,
      log_id: logRecord?.id,
    });
  } catch (err: any) {
    console.error("Internal Edge Function Error:", err);
    return jsonResponse(
      {
        success: false,
        error: err.message || "Internal server error inside send-sms Edge Function.",
      },
      200
    );
  }
});
