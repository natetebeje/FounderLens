import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { planTier } = await req.json();
    if (!planTier || !['basic', 'pro', 'pro_lifetime', 'enterprise'].includes(planTier)) {
      throw new Error("Invalid plan tier");
    }
    logStep("Plan tier validated", { planTier });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Define Price IDs for each plan tier (LIVE mode)
    const priceMapping = {
      basic: { priceId: "price_1RoXTQGW9fUpbhqbFz3KVKzg", name: "Basic Plan", mode: "subscription" },
      pro: { priceId: "price_1RoXTyGW9fUpbhqbl9RdODUb", name: "Professional Plan", mode: "subscription" },
      pro_lifetime: { priceId: "price_1SAi7EGW9fUpbhqbnz8AqpIT", name: "Professional Lifetime", mode: "payment" },
      enterprise: { priceId: "price_1RoXUKGW9fUpbhqbsYEy4ahh", name: "Enterprise Plan", mode: "subscription" }
    };

    const selectedPlan = priceMapping[planTier as keyof typeof priceMapping];
    if (!selectedPlan) {
      throw new Error(`Invalid plan tier: ${planTier}`);
    }
    logStep("Price ID selected", { planTier, priceId: selectedPlan.priceId });

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const isLifetime = selectedPlan.mode === "payment";
    
    const sessionConfig = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      mode: selectedPlan.mode as "subscription" | "payment",
      success_url: `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}${isLifetime ? '&lifetime=true' : ''}`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        plan_tier: planTier,
        user_id: user.id,
        is_lifetime: isLifetime.toString()
      }
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});