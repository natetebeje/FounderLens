import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadGenerationRequest {
  platform: 'twitter' | 'linkedin' | 'reddit';
  keywords: string[];
  maxLeads?: number;
  targetAudience?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platform, keywords, maxLeads = 50, targetAudience }: LeadGenerationRequest = await req.json();

    console.log(`Starting lead generation on ${platform} with keywords:`, keywords);

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let leads: any[] = [];

    // Platform-specific lead generation
    switch (platform) {
      case 'twitter':
        leads = await generateTwitterLeads(keywords, maxLeads);
        break;
      case 'linkedin':
        leads = await generateLinkedInLeads(keywords, maxLeads);
        break;
      case 'reddit':
        leads = await generateRedditLeads(keywords, maxLeads);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Store leads in database
    const leadsToInsert = leads.map(lead => ({
      source_platform: platform,
      source_url: lead.url,
      contact_info: {
        handle: lead.handle,
        name: lead.name,
        profile_url: lead.profileUrl,
        email: lead.email
      },
      lead_data: {
        content: lead.content,
        engagement: lead.engagement,
        followers: lead.followers,
        interests: lead.interests,
        industry: lead.industry,
        target_audience: targetAudience
      },
      engagement_score: calculateEngagementScore(lead),
      status: 'new'
    }));

    const { data: insertedLeads, error: insertError } = await supabase
      .from('marketing_leads')
      .insert(leadsToInsert)
      .select();

    if (insertError) {
      console.error('Error storing leads:', insertError);
      throw new Error('Failed to store leads');
    }

    // Record analytics
    await supabase
      .from('marketing_analytics')
      .insert({
        metric_name: 'leads_generated',
        metric_value: leads.length,
        metric_type: 'count',
        platform: platform,
        metadata: {
          keywords,
          target_audience: targetAudience,
          max_leads: maxLeads
        }
      });

    console.log(`Generated ${leads.length} leads from ${platform}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${leads.length} leads from ${platform}`,
        leads: insertedLeads,
        platform,
        keywords
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in lead-generation function:", error);
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

// Mock Twitter lead generation (replace with real Twitter API)
async function generateTwitterLeads(keywords: string[], maxLeads: number) {
  console.log('Generating Twitter leads for keywords:', keywords);
  
  // Simulate finding relevant tweets and users
  const mockLeads = [];
  for (let i = 0; i < Math.min(maxLeads, 20); i++) {
    mockLeads.push({
      handle: `@startup_founder_${i}`,
      name: `Founder ${i}`,
      profileUrl: `https://twitter.com/startup_founder_${i}`,
      url: `https://twitter.com/startup_founder_${i}/status/123456${i}`,
      content: `Looking for advice on ${keywords[0]} and ${keywords[1] || 'business growth'}`,
      engagement: Math.floor(Math.random() * 100),
      followers: Math.floor(Math.random() * 10000),
      interests: keywords,
      industry: 'Technology'
    });
  }
  
  return mockLeads;
}

// Mock LinkedIn lead generation (replace with real LinkedIn API)
async function generateLinkedInLeads(keywords: string[], maxLeads: number) {
  console.log('Generating LinkedIn leads for keywords:', keywords);
  
  const mockLeads = [];
  for (let i = 0; i < Math.min(maxLeads, 15); i++) {
    mockLeads.push({
      handle: `entrepreneur-${i}`,
      name: `Business Leader ${i}`,
      profileUrl: `https://linkedin.com/in/entrepreneur-${i}`,
      url: `https://linkedin.com/feed/update/entrepreneur-${i}`,
      content: `Discussing ${keywords[0]} strategies for ${keywords[1] || 'startup growth'}`,
      engagement: Math.floor(Math.random() * 200),
      followers: Math.floor(Math.random() * 5000),
      interests: keywords,
      industry: 'Business Services',
      email: `entrepreneur${i}@example.com`
    });
  }
  
  return mockLeads;
}

// Mock Reddit lead generation (replace with real Reddit API)
async function generateRedditLeads(keywords: string[], maxLeads: number) {
  console.log('Generating Reddit leads for keywords:', keywords);
  
  const mockLeads = [];
  const subreddits = ['entrepreneur', 'startups', 'business', 'smallbusiness'];
  
  for (let i = 0; i < Math.min(maxLeads, 25); i++) {
    const subreddit = subreddits[i % subreddits.length];
    mockLeads.push({
      handle: `u/redditor_${i}`,
      name: `Reddit User ${i}`,
      profileUrl: `https://reddit.com/u/redditor_${i}`,
      url: `https://reddit.com/r/${subreddit}/comments/abc${i}`,
      content: `Need help with ${keywords[0]}. Has anyone tried ${keywords[1] || 'market validation'}?`,
      engagement: Math.floor(Math.random() * 50),
      followers: Math.floor(Math.random() * 1000),
      interests: keywords,
      industry: 'Various'
    });
  }
  
  return mockLeads;
}

// Calculate engagement score based on lead data
function calculateEngagementScore(lead: any): number {
  let score = 0;
  
  // Base score from engagement metrics
  score += Math.min(lead.engagement || 0, 50);
  
  // Bonus for followers (but cap it)
  score += Math.min((lead.followers || 0) / 100, 25);
  
  // Bonus for having email
  if (lead.email) score += 15;
  
  // Bonus for relevant content
  if (lead.content && lead.content.length > 50) score += 10;
  
  return Math.min(score, 100); // Cap at 100
}

serve(handler);