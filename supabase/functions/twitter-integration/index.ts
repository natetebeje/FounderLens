import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { createHmac } from "node:crypto";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_KEY = Deno.env.get("TWITTER_CONSUMER_KEY")?.trim();
const API_SECRET = Deno.env.get("TWITTER_CONSUMER_SECRET")?.trim();
const ACCESS_TOKEN = Deno.env.get("TWITTER_ACCESS_TOKEN")?.trim();
const ACCESS_TOKEN_SECRET = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")?.trim();

interface TwitterRequest {
  action: 'post_tweet' | 'search_mentions' | 'engage_with_tweet' | 'get_analytics';
  content?: string;
  keywords?: string[];
  tweet_id?: string;
  limit?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    validateEnvironmentVariables();
    
    const { action, content, keywords = [], tweet_id, limit = 50 }: TwitterRequest = await req.json();
    console.log(`Processing Twitter action: ${action}`);

    switch (action) {
      case 'post_tweet':
        if (!content) throw new Error('Content is required for posting tweets');
        return await postTweet(content);
      
      case 'search_mentions':
        return await searchMentions(keywords, limit);
      
      case 'engage_with_tweet':
        if (!tweet_id) throw new Error('Tweet ID is required for engagement');
        return await engageWithTweet(tweet_id);
      
      case 'get_analytics':
        return await getAnalytics();
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Error in Twitter integration:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

function validateEnvironmentVariables() {
  if (!API_KEY) throw new Error("Missing TWITTER_CONSUMER_KEY environment variable");
  if (!API_SECRET) throw new Error("Missing TWITTER_CONSUMER_SECRET environment variable");
  if (!ACCESS_TOKEN) throw new Error("Missing TWITTER_ACCESS_TOKEN environment variable");
  if (!ACCESS_TOKEN_SECRET) throw new Error("Missing TWITTER_ACCESS_TOKEN_SECRET environment variable");
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&")
  )}`;
  
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  const hmacSha1 = createHmac("sha1", signingKey);
  const signature = hmacSha1.update(signatureBaseString).digest("base64");

  return signature;
}

function generateOAuthHeader(method: string, url: string): string {
  const oauthParams = {
    oauth_consumer_key: API_KEY!,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN!,
    oauth_version: "1.0",
  };

  const signature = generateOAuthSignature(method, url, oauthParams, API_SECRET!, ACCESS_TOKEN_SECRET!);

  const signedOAuthParams = { ...oauthParams, oauth_signature: signature };

  return "OAuth " + Object.entries(signedOAuthParams)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(", ");
}

async function postTweet(content: string) {
  console.log('📢 Posting tweet to Twitter...');
  
  const url = 'https://api.x.com/2/tweets';
  const method = 'POST';
  const oauthHeader = generateOAuthHeader(method, url);

  const response = await fetch(url, {
    method: method,
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: content }),
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    throw new Error(`Twitter API error: ${response.status} - ${responseText}`);
  }

  const tweetData = JSON.parse(responseText);
  
  // Store analytics
  await supabase
    .from('marketing_analytics')
    .insert({
      metric_name: 'tweet_posted',
      metric_type: 'count',
      metric_value: 1,
      platform: 'twitter',
      metadata: {
        tweet_id: tweetData.data?.id,
        content_length: content.length,
        posted_at: new Date().toISOString()
      }
    });

  // Update content status if this was from marketing_content
  const { data: contentRecord } = await supabase
    .from('marketing_content')
    .select('id')
    .eq('content', content)
    .eq('platform', 'twitter')
    .eq('status', 'draft')
    .single();

  if (contentRecord) {
    await supabase
      .from('marketing_content')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        engagement_data: { tweet_id: tweetData.data?.id }
      })
      .eq('id', contentRecord.id);
  }

  console.log('✅ Tweet posted successfully');
  return new Response(
    JSON.stringify({
      success: true,
      tweet: tweetData,
      message: 'Tweet posted successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function searchMentions(keywords: string[], limit: number) {
  console.log('🔍 Searching Twitter mentions...');
  
  const url = 'https://api.x.com/2/tweets/search/recent';
  const query = keywords.map(kw => `"${kw}"`).join(' OR ');
  const params = new URLSearchParams({
    query: `${query} -is:retweet lang:en`,
    max_results: Math.min(limit, 100).toString(),
    'tweet.fields': 'created_at,author_id,public_metrics,context_annotations',
    'user.fields': 'username,name,public_metrics'
  });

  const method = 'GET';
  const fullUrl = `${url}?${params}`;
  const oauthHeader = generateOAuthHeader(method, url);

  const response = await fetch(fullUrl, {
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Twitter search API error: ${response.status}`);
  }

  const data = await response.json();
  const tweets = data.data || [];

  // Store high-value mentions as leads
  const leads = tweets
    .filter((tweet: any) => tweet.public_metrics.retweet_count > 2 || tweet.public_metrics.like_count > 10)
    .map((tweet: any) => ({
      source_platform: 'twitter',
      source_url: `https://twitter.com/user/status/${tweet.id}`,
      contact_info: {
        twitter_id: tweet.author_id,
        tweet_id: tweet.id
      },
      lead_data: {
        content: tweet.text,
        created_at: tweet.created_at,
        metrics: tweet.public_metrics,
        keywords_matched: keywords.filter(kw => 
          tweet.text.toLowerCase().includes(kw.toLowerCase())
        )
      },
      engagement_score: Math.min(100, 
        (tweet.public_metrics.like_count * 2) + 
        (tweet.public_metrics.retweet_count * 5) + 
        (tweet.public_metrics.reply_count * 3)
      ),
      status: 'new'
    }));

  if (leads.length > 0) {
    await supabase
      .from('marketing_leads')
      .insert(leads);
  }

  // Record analytics
  await supabase
    .from('marketing_analytics')
    .insert({
      metric_name: 'twitter_mentions_found',
      metric_type: 'count',
      metric_value: tweets.length,
      platform: 'twitter',
      metadata: {
        keywords_searched: keywords,
        high_value_leads: leads.length,
        search_timestamp: new Date().toISOString()
      }
    });

  return new Response(
    JSON.stringify({
      mentions_found: tweets.length,
      leads_identified: leads.length,
      mentions: tweets.slice(0, 10) // Return first 10 for preview
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function engageWithTweet(tweetId: string) {
  console.log(`💬 Engaging with tweet ${tweetId}...`);
  
  // For safety, we'll just record the engagement opportunity
  // Real implementation would like/retweet/reply based on content analysis
  
  await supabase
    .from('lead_interactions')
    .insert({
      platform: 'twitter',
      interaction_type: 'engagement_opportunity',
      interaction_data: {
        tweet_id: tweetId,
        action: 'queued_for_engagement',
        timestamp: new Date().toISOString()
      }
    });

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Engagement opportunity recorded'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getAnalytics() {
  console.log('📊 Fetching Twitter analytics...');
  
  // Get recent Twitter metrics from our database
  const { data: analytics } = await supabase
    .from('marketing_analytics')
    .select('*')
    .eq('platform', 'twitter')
    .gte('date_recorded', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('created_at', { ascending: false });

  const summary = {
    tweets_posted: analytics?.filter(a => a.metric_name === 'tweet_posted').length || 0,
    mentions_found: analytics?.filter(a => a.metric_name === 'twitter_mentions_found')
      .reduce((sum, a) => sum + a.metric_value, 0) || 0,
    total_engagement: analytics?.reduce((sum, a) => sum + (a.metric_value || 0), 0) || 0,
    last_7_days: analytics?.length || 0
  };

  return new Response(
    JSON.stringify({ analytics: summary, detailed_metrics: analytics }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

serve(handler);