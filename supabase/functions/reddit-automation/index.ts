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

const REDDIT_CLIENT_ID = Deno.env.get('REDDIT_CLIENT_ID');
const REDDIT_CLIENT_SECRET = Deno.env.get('REDDIT_CLIENT_SECRET');

interface RedditAutomationRequest {
  action: 'discover_opportunities' | 'engage_with_posts' | 'monitor_mentions';
  subreddits?: string[];
  keywords?: string[];
  limit?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, subreddits = [], keywords = [], limit = 50 }: RedditAutomationRequest = await req.json();
    console.log(`Processing Reddit automation: ${action}`);

    switch (action) {
      case 'discover_opportunities':
        return await discoverOpportunities(subreddits, keywords, limit);
      
      case 'engage_with_posts':
        return await engageWithPosts(subreddits, keywords, limit);
      
      case 'monitor_mentions':
        return await monitorMentions(keywords, limit);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Error in Reddit automation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function getRedditAccessToken(): Promise<string> {
  const auth = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`);
  
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'FounderLens/1.0 by automated-bot'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`Failed to get Reddit access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function searchReddit(query: string, subreddit: string = '', limit: number = 25): Promise<any[]> {
  const accessToken = await getRedditAccessToken();
  
  const searchUrl = subreddit 
    ? `https://oauth.reddit.com/r/${subreddit}/search`
    : 'https://oauth.reddit.com/search';
  
  const params = new URLSearchParams({
    q: query,
    sort: 'relevance',
    t: 'week',
    limit: limit.toString(),
    type: 'link'
  });

  if (subreddit) {
    params.append('restrict_sr', 'true');
  }

  const response = await fetch(`${searchUrl}?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'FounderLens/1.0 by automated-bot'
    }
  });

  if (!response.ok) {
    throw new Error(`Reddit API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data?.children || [];
}

async function discoverOpportunities(subreddits: string[], keywords: string[], limit: number) {
  console.log('🔍 Discovering Reddit opportunities...');
  
  const allOpportunities = [];
  const targetSubreddits = subreddits.length > 0 ? subreddits : [
    'startups', 'entrepreneur', 'business', 'smallbusiness', 'marketing'
  ];
  
  const searchKeywords = keywords.length > 0 ? keywords : [
    'need help with', 'looking for tool', 'business problem', 'frustration'
  ];

  for (const subreddit of targetSubreddits) {
    for (const keyword of searchKeywords) {
      try {
        const posts = await searchReddit(keyword, subreddit, Math.ceil(limit / (targetSubreddits.length * searchKeywords.length)));
        
        for (const post of posts) {
          const postData = post.data;
          
          // Analyze post for business opportunity signals
          const opportunityScore = analyzeOpportunityPotential(postData);
          
          if (opportunityScore > 60) {
            const opportunity = {
              source_platform: 'reddit',
              source_url: `https://reddit.com${postData.permalink}`,
              contact_info: {
                reddit_username: postData.author,
                post_title: postData.title
              },
              lead_data: {
                subreddit: postData.subreddit,
                post_score: postData.score,
                num_comments: postData.num_comments,
                created_utc: postData.created_utc,
                opportunity_score: opportunityScore,
                keywords_matched: searchKeywords.filter(kw => 
                  postData.title.toLowerCase().includes(kw.toLowerCase()) ||
                  postData.selftext?.toLowerCase().includes(kw.toLowerCase())
                )
              },
              engagement_score: Math.min(100, opportunityScore + (postData.score * 2) + (postData.num_comments * 5)),
              status: 'new',
              notes: `Auto-discovered from r/${postData.subreddit} - ${postData.title.substring(0, 100)}...`
            };

            allOpportunities.push(opportunity);
          }
        }
      } catch (error: any) {
        console.error(`Error searching r/${subreddit} for "${keyword}":`, error);
      }
    }
  }

  // Store discovered opportunities in database
  if (allOpportunities.length > 0) {
    const { data, error } = await supabase
      .from('marketing_leads')
      .insert(allOpportunities)
      .select('id');

    if (error) {
      console.error('Error storing opportunities:', error);
    } else {
      console.log(`✅ Stored ${data?.length || 0} new opportunities`);
    }
  }

  // Record analytics
  await supabase
    .from('marketing_analytics')
    .insert({
      metric_name: 'reddit_opportunities_discovered',
      metric_type: 'count',
      metric_value: allOpportunities.length,
      platform: 'reddit',
      metadata: {
        subreddits_searched: targetSubreddits,
        keywords_used: searchKeywords,
        avg_opportunity_score: allOpportunities.reduce((acc, opp) => acc + opp.lead_data.opportunity_score, 0) / allOpportunities.length || 0
      }
    });

  return new Response(
    JSON.stringify({
      opportunities_discovered: allOpportunities.length,
      opportunities: allOpportunities.slice(0, 10), // Return top 10 for preview
      subreddits_searched: targetSubreddits.length,
      keywords_used: searchKeywords.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function analyzeOpportunityPotential(postData: any): number {
  let score = 0;
  const title = postData.title.toLowerCase();
  const text = postData.selftext?.toLowerCase() || '';
  const fullText = `${title} ${text}`;

  // Pain point indicators
  const painPointKeywords = [
    'problem', 'issue', 'frustrating', 'difficult', 'struggle', 'challenge',
    'need help', 'looking for', 'any suggestions', 'how do i', 'help me'
  ];
  
  for (const keyword of painPointKeywords) {
    if (fullText.includes(keyword)) {
      score += 15;
    }
  }

  // Business context indicators
  const businessKeywords = [
    'business', 'startup', 'company', 'revenue', 'customers', 'marketing',
    'sales', 'growth', 'scale', 'automation', 'tool', 'software', 'solution'
  ];
  
  for (const keyword of businessKeywords) {
    if (fullText.includes(keyword)) {
      score += 10;
    }
  }

  // Urgency indicators
  const urgencyKeywords = [
    'urgent', 'asap', 'quickly', 'immediate', 'deadline', 'soon'
  ];
  
  for (const keyword of urgencyKeywords) {
    if (fullText.includes(keyword)) {
      score += 20;
    }
  }

  // Budget indicators
  const budgetKeywords = [
    'budget', 'pay', 'cost', 'price', 'invest', 'spend', 'hire'
  ];
  
  for (const keyword of budgetKeywords) {
    if (fullText.includes(keyword)) {
      score += 25;
    }
  }

  // Engagement quality
  if (postData.score > 10) score += 10;
  if (postData.num_comments > 5) score += 15;
  if (postData.upvote_ratio > 0.8) score += 10;

  // Recency boost
  const hoursAgo = (Date.now() / 1000 - postData.created_utc) / 3600;
  if (hoursAgo < 24) score += 15;
  else if (hoursAgo < 72) score += 10;

  return Math.min(100, score);
}

async function engageWithPosts(subreddits: string[], keywords: string[], limit: number) {
  console.log('💬 Engaging with Reddit posts...');
  
  // Find high-potential posts to engage with
  const engagementTargets = [];
  
  for (const subreddit of subreddits) {
    try {
      const posts = await searchReddit(keywords.join(' OR '), subreddit, limit);
      
      for (const post of posts) {
        const postData = post.data;
        const engagementScore = analyzeEngagementPotential(postData);
        
        if (engagementScore > 70) {
          engagementTargets.push({
            post_id: postData.id,
            subreddit: postData.subreddit,
            title: postData.title,
            author: postData.author,
            url: `https://reddit.com${postData.permalink}`,
            engagement_score: engagementScore,
            suggested_approach: suggestEngagementApproach(postData)
          });
        }
      }
    } catch (error: any) {
      console.error(`Error finding engagement targets in r/${subreddit}:`, error);
    }
  }

  // Log engagement opportunities
  await supabase
    .from('lead_interactions')
    .insert(
      engagementTargets.map(target => ({
        platform: 'reddit',
        interaction_type: 'engagement_opportunity',
        interaction_data: target
      }))
    );

  return new Response(
    JSON.stringify({
      engagement_opportunities: engagementTargets.length,
      opportunities: engagementTargets.slice(0, 5) // Top 5 for preview
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function analyzeEngagementPotential(postData: any): number {
  let score = 0;
  const title = postData.title.toLowerCase();
  const text = postData.selftext?.toLowerCase() || '';

  // Look for help-seeking language
  if (title.includes('help') || title.includes('advice')) score += 30;
  if (title.includes('looking for') || title.includes('need')) score += 25;
  if (title.includes('recommend') || title.includes('suggest')) score += 20;

  // Business relevance
  if (title.includes('business') || title.includes('startup')) score += 25;
  if (title.includes('marketing') || title.includes('growth')) score += 20;

  // Engagement metrics
  if (postData.score > 20) score += 15;
  if (postData.num_comments < 10) score += 10; // Less competition for helpful responses
  
  // Recency
  const hoursAgo = (Date.now() / 1000 - postData.created_utc) / 3600;
  if (hoursAgo < 6) score += 20;
  else if (hoursAgo < 24) score += 10;

  return Math.min(100, score);
}

function suggestEngagementApproach(postData: any): string {
  const title = postData.title.toLowerCase();
  
  if (title.includes('tool') || title.includes('software')) {
    return 'Share relevant tool recommendations with genuine value-first approach';
  }
  
  if (title.includes('marketing') || title.includes('growth')) {
    return 'Provide actionable marketing insights and offer to discuss further';
  }
  
  if (title.includes('startup') || title.includes('business')) {
    return 'Share entrepreneurial wisdom and build relationship through helpful advice';
  }
  
  return 'Provide valuable insights related to the pain point mentioned';
}

async function monitorMentions(keywords: string[], limit: number) {
  console.log('👀 Monitoring Reddit mentions...');
  
  const mentions = [];
  
  for (const keyword of keywords) {
    try {
      const posts = await searchReddit(keyword, '', limit);
      
      for (const post of posts) {
        const postData = post.data;
        
        mentions.push({
          keyword: keyword,
          post_id: postData.id,
          subreddit: postData.subreddit,
          title: postData.title,
          author: postData.author,
          url: `https://reddit.com${postData.permalink}`,
          score: postData.score,
          num_comments: postData.num_comments,
          created_utc: postData.created_utc,
          sentiment: analyzeSentiment(postData.title + ' ' + (postData.selftext || ''))
        });
      }
    } catch (error: any) {
      console.error(`Error monitoring mentions for "${keyword}":`, error);
    }
  }

  // Store mentions for tracking
  await supabase
    .from('lead_interactions')
    .insert(
      mentions.map(mention => ({
        platform: 'reddit',
        interaction_type: 'mention_detected',
        interaction_data: mention
      }))
    );

  return new Response(
    JSON.stringify({
      mentions_found: mentions.length,
      mentions: mentions.slice(0, 10) // Top 10 for preview
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function analyzeSentiment(text: string): string {
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'broken', 'useless'];
  const positiveWords = ['good', 'great', 'awesome', 'love', 'best', 'amazing', 'excellent'];
  
  const lowerText = text.toLowerCase();
  let sentiment = 0;
  
  for (const word of negativeWords) {
    if (lowerText.includes(word)) sentiment--;
  }
  
  for (const word of positiveWords) {
    if (lowerText.includes(word)) sentiment++;
  }
  
  if (sentiment > 0) return 'positive';
  if (sentiment < 0) return 'negative';
  return 'neutral';
}

serve(handler);