
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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

    // Use service role key to bypass RLS for writes
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    
    // Parse request body to get organization ID
    let requestBody: any = {};
    try {
      const body = await req.text();
      if (body) {
        requestBody = JSON.parse(body);
      }
    } catch (e) {
      // Body is optional, continue without it
    }
    
    const requestedOrganizationId = requestBody.organizationId;
    logStep("Request details", { organizationId: requestedOrganizationId });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Use the requested organization ID if provided, otherwise find personal organization
    let targetOrganizationId = requestedOrganizationId;
    
    if (requestedOrganizationId) {
      logStep("Using provided organization ID", { organizationId: requestedOrganizationId });
    } else {
      // Only look for personal organization if no specific org was requested
      // Quick lookup for personal organization first
      const { data: personalOrgData } = await supabaseClient
        .from('organizations')
        .select('id')
        .eq('slug', `personal-${user.id}`)
        .maybeSingle();
        
      if (personalOrgData) {
        targetOrganizationId = personalOrgData.id;
        logStep("Found personal organization quickly", { organizationId: targetOrganizationId });
      } else {
        // Fallback to membership lookup if needed
        const { data: membershipData, error: membershipError } = await supabaseClient
          .from('organization_members')
          .select('organization_id, organizations(slug)')
          .eq('user_id', user.id)
          .eq('role', 'owner')
          .not('organizations.slug', 'is', null)
          .order('joined_at', { ascending: false })
          .limit(5);

        if (membershipError) {
          logStep("Error finding user organizations", { error: membershipError.message });
        }

        // Find personal organization from memberships
        if (membershipData && membershipData.length > 0) {
          const personalMembership = membershipData.find(
            m => m.organizations?.slug?.startsWith(`personal-${user.id}`)
          );
          
          if (personalMembership) {
            targetOrganizationId = personalMembership.organization_id;
            logStep("Found personal organization", { 
              organizationId: targetOrganizationId,
              slug: personalMembership.organizations?.slug
            });
          } else {
            // Just use first organization as fallback
            targetOrganizationId = membershipData[0].organization_id;
            logStep("No personal organization found, using first available", { 
              organizationId: targetOrganizationId,
              availableOrgs: membershipData.length
            });
          }
        }
      }
    }

    // If still no organization, create personal workspace
    if (!targetOrganizationId) {
      logStep("No organizations found, creating personal workspace");
      
      try {
        // First ensure user has a profile
        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profileData) {
          // Create profile if it doesn't exist
          await supabaseClient
            .from('profiles')
            .insert({
              user_id: user.id,
              first_name: user.raw_user_meta_data?.first_name || 'User',
              last_name: user.raw_user_meta_data?.last_name || '',
              full_name: `${user.raw_user_meta_data?.first_name || 'User'} ${user.raw_user_meta_data?.last_name || ''}`.trim(),
              is_admin: false,
              email_verified: user.email_confirmed_at ? true : false,
              onboarding_completed: false
            });
          logStep("Created missing profile for user");
        }

        const workspaceName = profileData?.first_name 
          ? `${profileData.first_name}'s Personal Workspace` 
          : 'Personal Workspace';

        // Check if organization already exists (handle race conditions)
        const { data: existingOrg } = await supabaseClient
          .from('organizations')
          .select('id')
          .eq('slug', `personal-${user.id}`)
          .maybeSingle();

        if (existingOrg) {
          targetOrganizationId = existingOrg.id;
          logStep("Found existing personal organization", { organizationId: targetOrganizationId });
        } else {
          // Create organization
          const { data: newOrg, error: createError } = await supabaseClient
            .from('organizations')
            .insert({
              name: workspaceName,
              slug: `personal-${user.id}`,
              owner_id: user.id
            })
            .select()
            .single();

          if (createError) {
            throw new Error(`Error creating organization: ${createError.message}`);
          }

          targetOrganizationId = newOrg.id;
          logStep("Created personal organization", { organizationId: targetOrganizationId });
        }

        // Ensure user is a member (handle race conditions)
        const { data: existingMembership } = await supabaseClient
          .from('organization_members')
          .select('id')
          .eq('organization_id', targetOrganizationId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingMembership) {
          await supabaseClient
            .from('organization_members')
            .insert({
              organization_id: targetOrganizationId,
              user_id: user.id,
              role: 'owner'
            });
          logStep("Added user as organization member");
        }

      } catch (error) {
        logStep("Error creating personal organization", { error: String(error) });
        // Don't throw here, just log and continue
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, checking for existing subscription");
      
      // Check for existing subscription - prioritize organization-specific, then user-only
      let existingSubscription = null;
      
      if (targetOrganizationId) {
        const { data: orgSpecificSub } = await supabaseClient
          .from("subscriptions")
          .select("plan_tier, status")
          .eq("user_id", user.id)
          .eq("organization_id", targetOrganizationId)
          .maybeSingle();
        
        if (orgSpecificSub) {
          existingSubscription = orgSpecificSub;
          logStep("Found organization-specific subscription", { 
            plan: orgSpecificSub.plan_tier,
            organizationId: targetOrganizationId 
          });
        }
      }
      
      // If no org-specific subscription, check for user-only subscription
      if (!existingSubscription) {
        const { data: userOnlySub } = await supabaseClient
          .from("subscriptions")
          .select("plan_tier, status")
          .eq("user_id", user.id)
          .is("organization_id", null)
          .maybeSingle();
        
        if (userOnlySub) {
          existingSubscription = userOnlySub;
          logStep("Found user-only subscription", { plan: userOnlySub.plan_tier });
        }
      }
      
      // If user has an existing non-free subscription, preserve it (could be manually assigned Pro)
      if (existingSubscription && existingSubscription.plan_tier !== 'free') {
        logStep("Preserving existing subscription", { 
          existingPlan: existingSubscription.plan_tier,
          organizationId: targetOrganizationId 
        });
        
        return new Response(JSON.stringify({ 
          subscribed: existingSubscription.plan_tier !== 'free', 
          plan_tier: existingSubscription.plan_tier,
          status: existingSubscription.status
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // Update subscription status to free only if no existing subscription or existing is free
      if (targetOrganizationId) {
        await supabaseClient.from("subscriptions").upsert({
          user_id: user.id,
          organization_id: targetOrganizationId,
          stripe_customer_id: null,
          plan_tier: 'free',
          status: 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,organization_id' });
        
        logStep("Created free subscription for organization", { organizationId: targetOrganizationId });
      } else {
        logStep("WARNING: No organization ID available, subscription record not created");
      }

      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan_tier: 'free',
        status: 'active'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let planTier = 'free';
    let subscriptionEnd = null;
    let stripeSubscriptionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      // Determine subscription tier from Price ID
      const priceId = subscription.items.data[0].price.id;
      
      // Map Price ID to plan tier
      const priceToTierMapping = {
        "price_1RoCkBGW9fUpbhqb7dMAcfLk": "basic",
        "price_1RoCkbGW9fUpbhqbA8nzfMm2": "pro", 
        "price_1RoCl1GW9fUpbhqbWaP0KrvM": "enterprise"
      };
      
      planTier = priceToTierMapping[priceId as keyof typeof priceToTierMapping] || "basic";
      logStep("Determined plan tier", { priceId, planTier });
    } else {
      logStep("No active subscription found");
    }

    // Update subscription in database
    if (targetOrganizationId) {
      try {
        // Check for existing subscription record
        const { data: existingSub } = await supabaseClient
          .from("subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("organization_id", targetOrganizationId)
          .maybeSingle();
          
        if (existingSub) {
          // Update existing record
          await supabaseClient
            .from("subscriptions")
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: stripeSubscriptionId,
              plan_tier: planTier,
              status: hasActiveSub ? 'active' : 'canceled',
              current_period_end: subscriptionEnd,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingSub.id);
            
          logStep("Updated existing subscription record", { id: existingSub.id });
        } else {
          // Insert new record
          await supabaseClient
            .from("subscriptions")
            .insert({
              user_id: user.id,
              organization_id: targetOrganizationId,
              stripe_customer_id: customerId,
              stripe_subscription_id: stripeSubscriptionId,
              plan_tier: planTier,
              status: hasActiveSub ? 'active' : 'canceled',
              current_period_end: subscriptionEnd,
              updated_at: new Date().toISOString(),
            });
            
          logStep("Created new subscription record");
        }
      } catch (error) {
        logStep("Error updating subscription in database", { error: String(error) });
        throw error;
      }
    } else {
      logStep("WARNING: No organization ID available, subscription record not updated");
    }

    logStep("Updated database with subscription info", { subscribed: hasActiveSub, planTier });
    
    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan_tier: planTier,
      subscription_end: subscriptionEnd,
      status: hasActiveSub ? 'active' : 'canceled'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
