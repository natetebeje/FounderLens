import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LIFETIME-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Processing lifetime purchase webhook");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const sig = req.headers.get("stripe-signature");
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!sig || !webhookSecret) {
      throw new Error("Missing Stripe signature or webhook secret");
    }

    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    logStep("Webhook event constructed", { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Check if this is a lifetime purchase
      const isLifetime = session.metadata?.is_lifetime === "true";
      if (!isLifetime) {
        logStep("Not a lifetime purchase, skipping");
        return new Response("OK", { status: 200 });
      }

      const userId = session.metadata?.user_id;
      const planTier = session.metadata?.plan_tier;

      if (!userId || !planTier) {
        throw new Error("Missing user_id or plan_tier in session metadata");
      }

      logStep("Processing lifetime purchase", { userId, planTier, sessionId: session.id });

      // Create lifetime subscription record
      const { error: subscriptionError } = await supabaseClient
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan_tier: planTier,
          status: "active",
          is_lifetime: true,
          lifetime_purchase_date: new Date().toISOString(),
          lifetime_terms_version: "v1",
          stripe_customer_id: session.customer as string,
          current_period_start: new Date().toISOString(),
          // Set a far future date for lifetime subscriptions
          current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 100 years
        });

      if (subscriptionError) {
        throw new Error(`Failed to create lifetime subscription: ${subscriptionError.message}`);
      }

      // Invalidate subscription cache
      const { error: cacheError } = await supabaseClient.rpc("invalidate_subscription_cache", {
        p_user_id: userId
      });

      if (cacheError) {
        logStep("Cache invalidation failed", { error: cacheError.message });
      }

      logStep("Lifetime subscription created successfully", { userId, planTier });
    }

    return new Response("OK", { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in lifetime purchase webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});