import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("🔄 Processing pending queue items...");

    // Get pending items that are ready to be processed
    const { data: pendingItems, error } = await supabase
      .from('marketing_content_queue')
      .select(`
        *,
        marketing_content (*)
      `)
      .eq('status', 'pending')
      .or('next_retry.is.null,next_retry.lte.' + new Date().toISOString())
      .limit(10);

    if (error) {
      throw new Error(`Failed to fetch pending items: ${error.message}`);
    }

    if (!pendingItems || pendingItems.length === 0) {
      console.log("✅ No pending items to process");
      return new Response(
        JSON.stringify({ message: "No pending items to process", processed: 0 }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`📋 Found ${pendingItems.length} items to process`);

    // Process each item
    const results = [];
    for (const item of pendingItems) {
      try {
        console.log(`🔄 Processing item ${item.id} for ${item.platform}`);
        
        // Update to processing status
        await supabase
          .from('marketing_content_queue')
          .update({ status: 'processing' })
          .eq('id', item.id);

        // Call the appropriate platform integration
        let postResult;
        switch (item.platform) {
          case 'linkedin':
            postResult = await callLinkedInIntegration(supabase, item.marketing_content.content);
            break;
          case 'twitter':
            postResult = await callTwitterIntegration(supabase, item.marketing_content.content);
            break;
          case 'reddit':
            postResult = await callRedditIntegration(supabase, item.marketing_content.content);
            break;
          default:
            throw new Error(`Unsupported platform: ${item.platform}`);
        }

        // Update queue with success
        await supabase
          .from('marketing_content_queue')
          .update({
            status: 'posted',
            post_id: postResult.postId,
            posted_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', item.id);

        // Update content status
        await supabase
          .from('marketing_content')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            engagement_data: {
              post_id: postResult.postId,
              platform: item.platform
            }
          })
          .eq('id', item.content_id);

        console.log(`✅ Successfully processed item ${item.id}`);
        results.push({ id: item.id, status: 'success', platform: item.platform });

      } catch (error: any) {
        console.error(`❌ Error processing item ${item.id}:`, error);
        
        // Get current retry count
        const retryCount = (item.retry_count || 0) + 1;
        const maxRetries = 3;
        
        // Calculate next retry time with exponential backoff
        const nextRetry = retryCount < maxRetries ? 
          new Date(Date.now() + (Math.pow(2, retryCount) * 30 * 60 * 1000)).toISOString() : 
          null;

        // Update queue with error
        await supabase
          .from('marketing_content_queue')
          .update({
            status: retryCount >= maxRetries ? 'failed' : 'pending',
            error_message: error.message,
            retry_count: retryCount,
            next_retry: nextRetry
          })
          .eq('id', item.id);

        results.push({ 
          id: item.id, 
          status: 'error', 
          error: error.message,
          platform: item.platform,
          retry_count: retryCount,
          will_retry: retryCount < maxRetries
        });
      }
    }

    console.log(`🏁 Queue processing complete. Processed ${results.length} items`);

    return new Response(
      JSON.stringify({
        message: "Queue processing complete",
        processed: results.length,
        results: results
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("❌ Error in queue processor:", error);
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

async function callLinkedInIntegration(supabase: any, content: string) {
  console.log('💼 Calling LinkedIn integration...');
  
  const { data, error } = await supabase.functions.invoke('linkedin-integration', {
    body: {
      action: 'post_update',
      content: content
    }
  });

  if (error) {
    console.error('LinkedIn API error details:', error);
    throw new Error(`LinkedIn API error: ${error.message}`);
  }

  if (!data || !data.success) {
    console.error('LinkedIn posting failed:', data);
    throw new Error(`LinkedIn posting failed: ${data?.error || 'Unknown error'}`);
  }

  return {
    postId: data.post?.id || `linkedin_${Date.now()}`,
    success: true,
    platform: 'linkedin'
  };
}

async function callTwitterIntegration(supabase: any, content: string) {
  console.log('🐦 Calling Twitter integration...');
  
  const { data, error } = await supabase.functions.invoke('twitter-integration', {
    body: {
      action: 'post_tweet',
      content: content
    }
  });

  if (error) {
    throw new Error(`Twitter API error: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(`Twitter posting failed: ${data.error}`);
  }

  return {
    postId: data.tweet?.data?.id || `twitter_${Date.now()}`,
    success: true,
    platform: 'twitter'
  };
}

async function callRedditIntegration(supabase: any, content: string) {
  console.log('🤖 Calling Reddit integration...');
  
  // Simulate Reddit posting for now
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    postId: `reddit_${Date.now()}`,
    success: true,
    platform: 'reddit'
  };
}

serve(handler);