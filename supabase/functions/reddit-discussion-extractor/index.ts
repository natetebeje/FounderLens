import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  RedditPost,
  searchReddit,
  generateRedditSearchPlan,
} from '../_shared/reddit-search.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// AI SUMMARIZATION — FounderLens-branded pain point extraction
// ============================================================================

async function summarizeForFounderLens(
  opportunity: { title: string; description: string; targetMarket: string },
  posts: RedditPost[],
  apiKey: string
): Promise<{
  tldr: string;
  demandSignals: string[];
  painPoints: string[];
  competitorMentions: string[];
  opportunityScore: number;
  keyQuotes: { text: string; source: string; score: number; url?: string }[];
}> {
  if (posts.length === 0) {
    return {
      tldr: 'No community discussions found for this opportunity. Try broader search terms or validate with a different angle.',
      demandSignals: [],
      painPoints: [],
      competitorMentions: [],
      opportunityScore: 0,
      keyQuotes: [],
    };
  }

  const context = posts.slice(0, 10).map((p, i) => {
    const comments = p.top_comments.slice(0, 3).map(c => `  - "${c.body.slice(0, 200)}" (${c.score} pts)`).join('\n');
    return `[Post ${i + 1}] r/${p.subreddit} | ${p.score} upvotes | URL: ${p.permalink} | "${p.title}"\n${p.selftext ? p.selftext.slice(0, 300) : '(no body)'}${comments ? '\nTop comments:\n' + comments : ''}`;
  }).join('\n\n---\n\n');

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are FounderLens's Community Intelligence engine. Analyze Reddit discussions and extract structured validation signals for a business opportunity. Return valid JSON only.`,
          },
          {
            role: 'user',
            content: `Analyze these Reddit discussions to validate the following business opportunity:

OPPORTUNITY: "${opportunity.title}"
DESCRIPTION: ${opportunity.description}
TARGET MARKET: ${opportunity.targetMarket}

REDDIT DISCUSSIONS:
${context}

Return JSON with this exact structure:
{
  "tldr": "2-3 sentence community intelligence summary. What does Reddit think about this problem? Is there real demand? Are people frustrated with existing solutions?",
  "demandSignals": ["up to 5 specific demand signals found — real quotes or paraphrased evidence that people WANT this solution"],
  "painPoints": ["up to 5 specific pain points people mention about this problem or existing solutions"],
  "competitorMentions": ["up to 5 existing products/tools mentioned as alternatives or complaints"],
  "opportunityScore": 0,
  "keyQuotes": [
    { "text": "exact or paraphrased quote from a Reddit comment or post title", "source": "r/subreddit", "score": 0, "url": "https://reddit.com/r/subreddit/comments/postid/" }
  ]
}

opportunityScore: 0-100. Base it on: volume of relevant discussions, intensity of pain expressed, demand signals found, and competitor gaps. 0 = no validation evidence, 100 = overwhelming community demand.
keyQuotes: up to 4 most impactful quotes. score = the post's Reddit upvote score. url = the exact Reddit permalink shown in the [Post N] URL field above — copy the real URL, do not invent one.`,
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
    const data = await res.json();
    const result = JSON.parse(data.choices[0].message.content);
    return {
      tldr: result.tldr ?? '',
      demandSignals: result.demandSignals ?? [],
      painPoints: result.painPoints ?? [],
      competitorMentions: result.competitorMentions ?? [],
      opportunityScore: Math.min(100, Math.max(0, result.opportunityScore ?? 0)),
      keyQuotes: (result.keyQuotes ?? []).slice(0, 4),
    };
  } catch (err) {
    console.error('Summarization error:', err);
    return {
      tldr: `Found ${posts.length} Reddit discussions related to "${opportunity.title}". Community data has been collected — AI summarization requires an OpenAI API key.`,
      demandSignals: posts.slice(0, 3).map(p => `"${p.title}" (${p.score} upvotes, r/${p.subreddit})`),
      painPoints: [],
      competitorMentions: [],
      opportunityScore: Math.min(50, posts.length * 5),
      keyQuotes: posts.slice(0, 3).map(p => ({ text: p.title, source: `r/${p.subreddit}`, score: p.score, url: p.permalink })),
    };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      opportunityId,
      organizationId,
      subreddits = [],
      keywords = [],
      queries = [],
      limit = 25,
    } = await req.json();

    if (!opportunityId) {
      return new Response(JSON.stringify({ error: 'opportunityId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔍 FounderLens Community Intelligence — opportunityId:', opportunityId);

    const { data: opportunity, error: oppError } = await supabase
      .from('business_opportunities')
      .select('title, description, target_market, opportunity_tags')
      .eq('id', opportunityId)
      .maybeSingle();

    if (oppError || !opportunity) {
      return new Response(JSON.stringify({
        success: false,
        error: oppError?.message ?? 'Opportunity not found',
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');

    let searchQueries = queries;
    let searchKeywords = keywords;
    let searchSubreddits = subreddits;

    if (queries.length === 0 || keywords.length === 0) {
      const aiPlan = await generateRedditSearchPlan(opportunity, apiKey);
      if (searchQueries.length === 0) searchQueries = aiPlan.queries;
      if (searchKeywords.length === 0) searchKeywords = aiPlan.keywords;
      if (searchSubreddits.length === 0) searchSubreddits = aiPlan.subreddits;
    }

    console.log(`🔎 Searching with ${searchQueries.length} queries, ${searchKeywords.length} keywords`);

    const posts = await searchReddit(searchQueries, searchKeywords, limit, searchSubreddits);
    console.log(`✅ Found ${posts.length} Reddit posts`);

    const summary = apiKey
      ? await summarizeForFounderLens(
          { title: opportunity.title, description: opportunity.description, targetMarket: opportunity.target_market },
          posts,
          apiKey
        )
      : null;

    // Persist discussions to reddit_discussions table
    for (const post of posts.slice(0, 20)) {
      try {
        await supabase.from('reddit_discussions').upsert({
          opportunity_id: opportunityId,
          post_id: post.id,
          title: post.title,
          selftext: post.selftext,
          url: post.permalink,
          author: post.author,
          subreddit: post.subreddit,
          score: post.score,
          num_comments: post.num_comments,
          upvote_ratio: post.upvote_ratio,
          created_utc: post.created_utc,
          permalink: post.permalink,
          top_comments: post.top_comments,
          engagement_metrics: { score: post.score, num_comments: post.num_comments, upvote_ratio: post.upvote_ratio },
          relevance_score: Math.min(100, post.score + post.num_comments),
          pain_points_extracted: summary?.painPoints ?? [],
          solutions_mentioned: summary?.competitorMentions ?? [],
          full_content: { title: post.title, selftext: post.selftext, top_comments: post.top_comments },
        }, { onConflict: 'post_id,opportunity_id' });
      } catch (e) {
        console.error('Discussion upsert error:', e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      discussionsFound: posts.length,
      discussions: posts.map(p => ({
        post_id: p.id,
        title: p.title,
        subreddit: p.subreddit,
        score: p.score,
        num_comments: p.num_comments,
        author: p.author,
        permalink: p.permalink,
        relevance_score: Math.min(100, p.score + p.num_comments),
        pain_points_extracted: summary?.painPoints ?? [],
        solutions_mentioned: summary?.competitorMentions ?? [],
        engagement_metrics: { score: p.score, comments: p.num_comments, upvote_ratio: p.upvote_ratio },
      })),
      summary,
      message: posts.length > 0
        ? `Found ${posts.length} relevant Reddit discussions`
        : 'No discussions found — try broader search terms',
      overallSummary: summary?.tldr ?? '',
      keyInsights: summary?.demandSignals ?? [],
      marketValidation: {
        demandSignals: summary?.demandSignals ?? [],
        painPoints: summary?.painPoints ?? [],
        competitorMentions: summary?.competitorMentions ?? [],
        opportunityScore: summary?.opportunityScore ?? 0,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('💥 reddit-discussion-extractor error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message ?? 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
