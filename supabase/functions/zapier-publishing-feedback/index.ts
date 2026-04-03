import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PublishingFeedback {
  content_id: string;
  platform: string;
  status: 'success' | 'failed';
  post_id?: string;
  error_message?: string;
  published_at?: string;
  platform_response?: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { content_id, platform, status, post_id, error_message, published_at, platform_response }: PublishingFeedback = await req.json();

    console.log(`📢 Received publishing feedback for content ${content_id} on ${platform}: ${status}`);

    // Update content status in marketing_content table
    const { error: contentError } = await supabase
      .from('marketing_content')
      .update({
        status: status === 'success' ? 'published' : 'failed',
        published_at: status === 'success' ? (published_at || new Date().toISOString()) : null,
        engagement_data: platform_response ? { platform_response } : {}
      })
      .eq('id', content_id);

    if (contentError) {
      console.error('Error updating content status:', contentError);
    }

    // Update or create queue item if it exists
    const { data: existingQueueItem } = await supabase
      .from('marketing_content_queue')
      .select('id')
      .eq('content_id', content_id)
      .eq('platform', platform)
      .single();

    if (existingQueueItem) {
      const { error: queueError } = await supabase
        .from('marketing_content_queue')
        .update({
          status: status === 'success' ? 'posted' : 'failed',
          post_id: post_id || null,
          error_message: error_message || null,
          posted_at: status === 'success' ? (published_at || new Date().toISOString()) : null
        })
        .eq('id', existingQueueItem.id);

      if (queueError) {
        console.error('Error updating queue item:', queueError);
      }
    } else {
      // Create new queue item for tracking
      const { error: insertError } = await supabase
        .from('marketing_content_queue')
        .insert({
          content_id,
          platform,
          status: status === 'success' ? 'posted' : 'failed',
          post_id: post_id || null,
          error_message: error_message || null,
          scheduled_time: published_at || new Date().toISOString(),
          posted_at: status === 'success' ? (published_at || new Date().toISOString()) : null,
          retry_count: 0
        });

      if (insertError) {
        console.error('Error inserting queue item:', insertError);
      }
    }

    // Trigger feedback webhooks
    try {
      await supabase.functions.invoke('zapier-webhook-handler', {
        body: {
          event_type: status === 'success' ? 'content_published_success' : 'content_published_failed',
          data: {
            content_id,
            platform,
            status,
            post_id: post_id || null,
            error_message: error_message || null,
            published_at: published_at || null,
            platform_response: platform_response || null,
            feedback_received_at: new Date().toISOString()
          }
        }
      });
      console.log(`Triggered ${status === 'success' ? 'success' : 'failure'} feedback webhook`);
    } catch (webhookError) {
      console.warn('Failed to trigger feedback webhooks:', webhookError);
    }

    console.log(`✅ Publishing feedback processed successfully for ${content_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Publishing feedback processed for ${platform}`,
        content_id,
        status
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in zapier-publishing-feedback function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);