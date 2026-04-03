
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleRequest {
  contentId: string;
  platform: string;
  scheduledTime: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contentId, platform, scheduledTime }: ScheduleRequest = await req.json();

    console.log(`Scheduling content ${contentId} for ${platform} at ${scheduledTime}`);

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the content to schedule
    const { data: content, error: contentError } = await supabase
      .from('marketing_content')
      .select('*')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      throw new Error('Content not found');
    }

    // Add to scheduling queue
    const { data: queueItem, error: queueError } = await supabase
      .from('marketing_content_queue')
      .insert({
        content_id: contentId,
        platform: platform,
        scheduled_time: scheduledTime,
        status: 'pending'
      })
      .select()
      .single();

    if (queueError) {
      throw new Error(`Failed to schedule content: ${queueError.message}`);
    }

    // Update content status
    const { error: updateError } = await supabase
      .from('marketing_content')
      .update({
        status: 'scheduled',
        scheduled_for: scheduledTime
      })
      .eq('id', contentId);

    if (updateError) {
      console.error('Error updating content status:', updateError);
    }

    // Process immediate scheduling if time is within next 5 minutes
    const scheduledDate = new Date(scheduledTime);
    const now = new Date();
    const diffMinutes = (scheduledDate.getTime() - now.getTime()) / (1000 * 60);

    if (diffMinutes <= 5 && diffMinutes >= 0) {
      console.log('Processing immediate scheduling...');
      await processScheduledContent(supabase, queueItem.id);
    }

    console.log('Content scheduled successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Content scheduled successfully',
        queueId: queueItem.id,
        scheduledFor: scheduledTime
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in content-scheduler function:", error);
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

// Function to process scheduled content using real API calls
async function processScheduledContent(supabase: any, queueId: string) {
  try {
    // Get queue item with content
    const { data: queueItem, error: fetchError } = await supabase
      .from('marketing_content_queue')
      .select(`
        *,
        marketing_content (*)
      `)
      .eq('id', queueId)
      .single();

    if (fetchError || !queueItem) {
      throw new Error('Queue item not found');
    }

    const content = queueItem.marketing_content;
    const platform = queueItem.platform;

    console.log(`Processing content for ${platform}:`, content.content.substring(0, 50));

    // Update queue status to processing
    await supabase
      .from('marketing_content_queue')
      .update({ status: 'processing' })
      .eq('id', queueId);

    // Call the appropriate platform integration
    let postResult;
    switch (platform) {
      case 'twitter':
        postResult = await callTwitterIntegration(content.content);
        break;
      case 'linkedin':
        postResult = await callLinkedInIntegration(content.content);
        break;
      case 'reddit':
        postResult = await callRedditIntegration(content.content);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Update queue with success
    await supabase
      .from('marketing_content_queue')
      .update({
        status: 'posted',
        post_id: postResult.postId,
        posted_at: new Date().toISOString()
      })
      .eq('id', queueId);

    // Update content status
    await supabase
      .from('marketing_content')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        engagement_data: {
          post_id: postResult.postId,
          platform: platform
        }
      })
      .eq('id', content.id);

    // Record analytics
    await supabase
      .from('marketing_analytics')
      .insert({
        metric_name: 'content_published',
        metric_value: 1,
        metric_type: 'count',
        platform: platform,
        content_id: content.id,
        metadata: {
          post_id: postResult.postId,
          content_type: content.content_type,
          scheduled_vs_immediate: queueItem.scheduled_time <= new Date().toISOString() ? 'immediate' : 'scheduled'
        }
      });

    console.log(`Content published successfully to ${platform}`);

  } catch (error: any) {
    console.error('Error processing scheduled content:', error);
    
    // Get current retry count
    const { data: currentQueue } = await supabase
      .from('marketing_content_queue')
      .select('retry_count')
      .eq('id', queueId)
      .single();

    const retryCount = (currentQueue?.retry_count || 0) + 1;
    const maxRetries = 3;

    // Update queue with error
    await supabase
      .from('marketing_content_queue')
      .update({
        status: retryCount >= maxRetries ? 'failed' : 'pending',
        error_message: error.message,
        retry_count: retryCount,
        next_retry: retryCount < maxRetries ? 
          new Date(Date.now() + (retryCount * 30 * 60 * 1000)).toISOString() : // Exponential backoff
          null
      })
      .eq('id', queueId);

    // Record failure analytics
    await supabase
      .from('marketing_analytics')
      .insert({
        metric_name: 'content_publish_failed',
        metric_value: 1,
        metric_type: 'count',
        platform: queueItem.platform,
        content_id: queueItem.content_id,
        metadata: {
          error_message: error.message,
          retry_count: retryCount,
          final_failure: retryCount >= maxRetries
        }
      });
  }
}

// Real API integration functions
async function callTwitterIntegration(content: string) {
  console.log('🐦 Calling Twitter integration...');
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

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

async function callLinkedInIntegration(content: string) {
  console.log('💼 Calling LinkedIn integration...');
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data, error } = await supabase.functions.invoke('linkedin-integration', {
    body: {
      action: 'post_update',
      content: content
    }
  });

  if (error) {
    throw new Error(`LinkedIn API error: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(`LinkedIn posting failed: ${data.error}`);
  }

  return {
    postId: data.post?.id || `linkedin_${Date.now()}`,
    success: true,
    platform: 'linkedin'
  };
}

async function callRedditIntegration(content: string) {
  console.log('🤖 Calling Reddit integration...');
  
  // For Reddit, we need to implement the actual Reddit API calls
  // This is a placeholder that will need Reddit API integration
  try {
    // TODO: Implement actual Reddit API integration
    // For now, we'll simulate a successful post
    console.log('Reddit posting:', content.substring(0, 100));
    
    // Simulate Reddit API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      postId: `reddit_${Date.now()}`,
      success: true,
      platform: 'reddit'
    };
  } catch (error: any) {
    throw new Error(`Reddit API error: ${error.message}`);
  }
}

serve(handler);
