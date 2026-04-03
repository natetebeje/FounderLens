import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

const LINKEDIN_ACCESS_TOKEN = Deno.env.get("LINKEDIN_ACCESS_TOKEN");

interface LinkedInRequest {
  action: 'post_update' | 'search_posts' | 'get_company_updates' | 'get_analytics';
  content?: string;
  keywords?: string[];
  company_id?: string;
  limit?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LINKEDIN_ACCESS_TOKEN) {
      throw new Error("LinkedIn access token not configured");
    }
    
    const { action, content, keywords = [], company_id, limit = 50 }: LinkedInRequest = await req.json();
    console.log(`Processing LinkedIn action: ${action}`);

    switch (action) {
      case 'post_update':
        if (!content) throw new Error('Content is required for posting updates');
        return await postUpdate(content);
      
      case 'search_posts':
        return await searchPosts(keywords, limit);
      
      case 'get_company_updates':
        return await getCompanyUpdates(company_id, limit);
      
      case 'get_analytics':
        return await getAnalytics();
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Error in LinkedIn integration:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function getLinkedInProfile() {
  const response = await fetch('https://api.linkedin.com/v2/me', {
    headers: {
      'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`LinkedIn API error: ${response.status}`);
  }

  return await response.json();
}

async function postUpdate(content: string) {
  console.log('📢 Posting update to LinkedIn...');
  
  const profile = await getLinkedInProfile();
  const authorUrn = `urn:li:person:${profile.id}`;

  const postData = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: content
        },
        shareMediaCategory: 'NONE'
      }
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
    }
  };

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify(postData),
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    throw new Error(`LinkedIn post API error: ${response.status} - ${responseText}`);
  }

  const postResult = JSON.parse(responseText);
  
  // Store analytics
  await supabase
    .from('marketing_analytics')
    .insert({
      metric_name: 'linkedin_post_published',
      metric_type: 'count',
      metric_value: 1,
      platform: 'linkedin',
      metadata: {
        post_id: postResult.id,
        content_length: content.length,
        posted_at: new Date().toISOString(),
        author_urn: authorUrn
      }
    });

  // Update content status if this was from marketing_content
  const { data: contentRecord } = await supabase
    .from('marketing_content')
    .select('id')
    .eq('content', content)
    .eq('platform', 'linkedin')
    .eq('status', 'draft')
    .single();

  if (contentRecord) {
    await supabase
      .from('marketing_content')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        engagement_data: { post_id: postResult.id }
      })
      .eq('id', contentRecord.id);
  }

  console.log('✅ LinkedIn post published successfully');
  return new Response(
    JSON.stringify({
      success: true,
      post: postResult,
      message: 'LinkedIn post published successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function searchPosts(keywords: string[], limit: number) {
  console.log('🔍 Searching LinkedIn posts...');
  
  // LinkedIn's search API is limited, so we'll focus on finding company pages and posts
  // that mention our keywords in a more targeted way
  
  const searchResults = [];
  
  for (const keyword of keywords) {
    try {
      // Search for companies related to the keyword
      const response = await fetch(
        `https://api.linkedin.com/v2/companySearch?q=keywords&keywords=${encodeURIComponent(keyword)}&count=${Math.min(limit, 20)}`,
        {
          headers: {
            'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const companies = data.elements || [];
        
        // For each company, we can identify potential leads
        const leads = companies.map((company: any) => ({
          source_platform: 'linkedin',
          source_url: `https://linkedin.com/company/${company.vanityName || company.id}`,
          contact_info: {
            company_name: company.localizedName,
            company_id: company.id,
            industry: company.localizedSpecialties?.join(', ') || 'Unknown'
          },
          lead_data: {
            keyword_matched: keyword,
            company_size: company.staffCount,
            company_type: company.companyType,
            headquarter: company.headquarter,
            follower_count: company.followerCount
          },
          engagement_score: Math.min(100, (company.followerCount || 0) / 100 + 30),
          status: 'new'
        }));

        searchResults.push(...leads);
      }
    } catch (error: any) {
      console.error(`Error searching LinkedIn for "${keyword}":`, error);
    }
  }

  // Store identified leads
  if (searchResults.length > 0) {
    await supabase
      .from('marketing_leads')
      .insert(searchResults.slice(0, 50)); // Limit to avoid overwhelming the system
  }

  // Record analytics
  await supabase
    .from('marketing_analytics')
    .insert({
      metric_name: 'linkedin_companies_found',
      metric_type: 'count',
      metric_value: searchResults.length,
      platform: 'linkedin',
      metadata: {
        keywords_searched: keywords,
        search_timestamp: new Date().toISOString()
      }
    });

  return new Response(
    JSON.stringify({
      companies_found: searchResults.length,
      leads_identified: searchResults.length,
      companies: searchResults.slice(0, 10) // Return first 10 for preview
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getCompanyUpdates(companyId: string | undefined, limit: number) {
  if (!companyId) {
    throw new Error('Company ID is required');
  }

  console.log(`📰 Getting company updates for ${companyId}...`);
  
  const response = await fetch(
    `https://api.linkedin.com/v2/shares?q=owners&owners=urn:li:organization:${companyId}&count=${Math.min(limit, 50)}`,
    {
      headers: {
        'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`LinkedIn company updates API error: ${response.status}`);
  }

  const data = await response.json();
  const updates = data.elements || [];

  // Store as interaction data for analysis
  await supabase
    .from('lead_interactions')
    .insert(
      updates.map((update: any) => ({
        platform: 'linkedin',
        interaction_type: 'company_update_monitored',
        interaction_data: {
          company_id: companyId,
          update_id: update.id,
          content: update.text?.text || '',
          published_at: new Date(update.created?.time || Date.now()).toISOString(),
          engagement: update.totalSocialActivityCounts
        }
      }))
    );

  return new Response(
    JSON.stringify({
      updates_found: updates.length,
      updates: updates.slice(0, 10)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getAnalytics() {
  console.log('📊 Fetching LinkedIn analytics...');
  
  // Get recent LinkedIn metrics from our database
  const { data: analytics } = await supabase
    .from('marketing_analytics')
    .select('*')
    .eq('platform', 'linkedin')
    .gte('date_recorded', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('created_at', { ascending: false });

  const summary = {
    posts_published: analytics?.filter(a => a.metric_name === 'linkedin_post_published').length || 0,
    companies_found: analytics?.filter(a => a.metric_name === 'linkedin_companies_found')
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