import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-REFUND] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      throw new Error("Admin access required");
    }
    logStep("Admin access verified");

    const { paymentIntentId, chargeId, amount, reason } = await req.json();
    
    if (!paymentIntentId && !chargeId) {
      throw new Error("Either paymentIntentId or chargeId is required");
    }
    
    if (!amount || amount <= 0) {
      throw new Error("Valid amount is required");
    }

    logStep("Request validated", { paymentIntentId, chargeId, amount, reason });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Process the refund with Stripe
    let refund;
    if (paymentIntentId) {
      refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount,
        reason: reason || 'requested_by_customer',
        metadata: {
          processed_by: user.id,
          admin_email: user.email || '',
        }
      });
    } else {
      refund = await stripe.refunds.create({
        charge: chargeId,
        amount: amount,
        reason: reason || 'requested_by_customer',
        metadata: {
          processed_by: user.id,
          admin_email: user.email || '',
        }
      });
    }

    logStep("Stripe refund created", { refundId: refund.id, status: refund.status });

    // Find the user associated with this payment
    let targetUserId = null;
    if (paymentIntentId) {
      const customers = await stripe.customers.list({ limit: 100 });
      for (const customer of customers.data) {
        const paymentIntents = await stripe.paymentIntents.list({
          customer: customer.id,
          limit: 10
        });
        const foundIntent = paymentIntents.data.find(pi => pi.id === paymentIntentId);
        if (foundIntent && customer.email) {
          // Find user by email
          const { data: userProfile } = await supabaseClient.auth.admin.getUserByEmail(customer.email);
          if (userProfile?.user) {
            targetUserId = userProfile.user.id;
            break;
          }
        }
      }
    }

    // Save refund record to database
    const { data: refundRecord, error: refundError } = await supabaseClient
      .from("refunds")
      .insert({
        stripe_refund_id: refund.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_charge_id: chargeId,
        user_id: targetUserId,
        amount: amount,
        currency: refund.currency,
        reason: reason,
        status: refund.status,
        processed_by: user.id,
        metadata: {
          stripe_metadata: refund.metadata,
          stripe_receipt_number: refund.receipt_number,
        }
      })
      .select()
      .single();

    if (refundError) {
      logStep("Error saving refund record", { error: refundError });
      throw new Error(`Failed to save refund record: ${refundError.message}`);
    }

    logStep("Refund record saved", { refundRecordId: refundRecord.id });

    // Log admin action for audit trail
    const { error: auditError } = await supabaseClient
      .from("admin_audit_log")
      .insert({
        admin_user_id: user.id,
        action_type: "refund_processed",
        target_user_id: targetUserId,
        action_details: {
          refund_id: refund.id,
          amount: amount,
          currency: refund.currency,
          reason: reason,
          payment_intent_id: paymentIntentId,
          charge_id: chargeId
        }
      });

    if (auditError) {
      logStep("Error saving audit log", { error: auditError });
    }

    return new Response(JSON.stringify({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        created: refund.created,
      },
      record_id: refundRecord.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in process-refund", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});