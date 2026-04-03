import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookTriggerRequest {
  event_type: string;
  data: any;
  organization_id?: string;
  user_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_type, data, organization_id, user_id }: WebhookTriggerRequest = await req.json();
    
    console.log(`🔗 Triggering Zapier webhooks for event: ${event_type}`);

    // Get active webhooks for this event type
    const { data: webhooks, error } = await supabase
      .from('zapier_webhooks')
      .select('*')
      .eq('event_type', event_type)
      .eq('is_active', true);

    if (error) throw error;

    if (!webhooks || webhooks.length === 0) {
      console.log(`No active webhooks found for event: ${event_type}`);
      return new Response(
        JSON.stringify({ success: true, webhooks_triggered: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger all matching webhooks
    const triggerPromises = webhooks.map(webhook => {
      // Flatten the data structure for better Zapier compatibility
      const flattenedPayload = {
        event_type,
        organization_id,
        user_id,
        timestamp: new Date().toISOString(),
        webhook_name: webhook.name,
        // Spread the data object to make all fields accessible at root level
        ...(data || {}),
        // Keep original data structure for backward compatibility
        data
      };
      
      return triggerWebhook(webhook, flattenedPayload);
    });

    const results = await Promise.allSettled(triggerPromises);
    
    // Count successful triggers
    const successCount = results.filter(result => result.status === 'fulfilled').length;
    const failureCount = results.filter(result => result.status === 'rejected').length;

    console.log(`✅ Triggered ${successCount} webhooks successfully, ${failureCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        webhooks_triggered: successCount,
        webhooks_failed: failureCount,
        total_webhooks: webhooks.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in webhook handler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function triggerWebhook(webhook: any, payload: any) {
  try {
    console.log(`Triggering webhook: ${webhook.name} (${webhook.webhook_url})`);

    // Make the webhook request
    const response = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FounderLens-Automation/1.0'
      },
      body: JSON.stringify(payload)
    });

    // Update webhook stats
    const updateData: any = {
      trigger_count: webhook.trigger_count + 1,
      last_triggered: new Date().toISOString()
    };

    if (response.ok) {
      updateData.last_success = new Date().toISOString();
      console.log(`✅ Webhook ${webhook.name} triggered successfully`);
    } else {
      updateData.last_error = `HTTP ${response.status}: ${response.statusText}`;
      console.error(`❌ Webhook ${webhook.name} failed: ${response.status} ${response.statusText}`);
    }

    // Update webhook statistics
    await supabase
      .from('zapier_webhooks')
      .update(updateData)
      .eq('id', webhook.id);

    // Log the webhook trigger
    await supabase
      .from('webhook_logs')
      .insert({
        webhook_id: webhook.id,
        event_type: payload.event_type,
        payload: payload,
        status: response.ok ? 'success' : 'failed',
        response_status: response.status,
        response_body: response.ok ? null : await response.text().catch(() => null)
      });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return { webhook_id: webhook.id, status: 'success' };

  } catch (error: any) {
    console.error(`Failed to trigger webhook ${webhook.name}:`, error);
    
    // Log the failed attempt
    await supabase
      .from('webhook_logs')
      .insert({
        webhook_id: webhook.id,
        event_type: payload.event_type,
        payload: payload,
        status: 'failed',
        error_message: error.message
      });

    // Update failure stats
    await supabase
      .from('zapier_webhooks')
      .update({
        trigger_count: webhook.trigger_count + 1,
        last_error: error.message,
        last_triggered: new Date().toISOString()
      })
      .eq('id', webhook.id);

    throw error;
  }
}

// Helper function to trigger webhooks from other parts of the system
export async function triggerZapierWebhooks(eventType: string, data: any, organizationId?: string, userId?: string) {
  try {
    await supabase.functions.invoke('zapier-webhook-handler', {
      body: {
        event_type: eventType,
        data,
        organization_id: organizationId,
        user_id: userId
      }
    });
  } catch (error) {
    console.error(`Failed to trigger Zapier webhooks for ${eventType}:`, error);
  }
}

serve(handler);