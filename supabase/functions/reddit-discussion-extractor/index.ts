import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// REDDIT AUTH — OAuth token with auto-refresh
// ============================================================================

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getRedditToken(): Promise<string | null> {
  const clientId = Deno.env.get('REDDIT_CLIENT_ID');
  const clientSecret = Deno.env.get('REDDIT_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  try {
    const creds = btoa(`${clientId}:${clientSecret}`);
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'FounderLens/1.0 (by /u/founderlens_app)',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      console.warn(`Reddit OAuth failed: ${res.status}`);
      return null;
    }
    const data = await res.json();
    cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return cachedToken.token;
  } catch (err) {
    console.error('Reddit token error:', err);
    return null;
  }
}

// ============================================================================
// REDDIT SEARCH — OAuth primary, PullPush fallback (bypasses 403 blocks)
// ============================================================================

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  author: string;
  subreddit: string;
  score: number;
  num_comments: number;
  upvote_ratio: number;
  created_utc: number;
  permalink: string;
  top_comments: { body: string; author: string; score: number }[];
}

async function searchReddit(
  queries: string[],
  subreddits: string[],
  keywords: string[],
  limit: number = 25
): Promise<RedditPost[]> {
  const token = await getRedditToken();

  if (token) {
    console.log('🔐 Using Reddit OAuth API');
    return searchRedditOAuth(token, queries, subreddits, limit);
  }

  console.log('🔄 Reddit OAuth not configured — using PullPush fallback');
  return searchPullPush(queries, keywords, limit);
}

async function searchRedditOAuth(
  token: string,
  queries: string[],
  subreddits: string[],
  limit: number
): Promise<RedditPost[]> {
  const all: RedditPost[] = [];
  const headers = {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'FounderLens/1.0 (by /u/founderlens_app)',
  };

  for (const subreddit of subreddits.slice(0, 6)) {
    for (const query of queries.slice(0, 3)) {
      try {
        const url = `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(query)}&sort=relevance&t=year&limit=10&restrict_sr=on`;
        const res = await fetch(url, { headers });
        if (!res.ok) continue;
        const data = await res.json();
        for (const child of data?.data?.children ?? []) {
          const p = child.data;
          if (!p || p.score < 2) continue;
          all.push({
            id: p.id,
            title: p.title ?? '',
            selftext: (p.selftext ?? '').substring(0, 1000),
            url: p.url ?? '',
            author: p.author ?? '[deleted]',
            subreddit: p.subreddit ?? subreddit,
            score: p.score ?? 0,
            num_comments: p.num_comments ?? 0,
            upvote_ratio: p.upvote_ratio ?? 0,
            created_utc: p.created_utc ?? 0,
            permalink: `https://reddit.com${p.permalink ?? ''}`,
            top_comments: [],
          });
        }
        await delay(300);
      } catch (e) {
        console.error(`OAuth search error for r/${subreddit}:`, e);
      }
    }
  }

  // Fetch top comments for top posts
  const unique = dedup(all).sort((a, b) => b.score - a.score).slice(0, limit);
  for (const post of unique.slice(0, 8)) {
    try {
      const postId = post.permalink.split('/')[6] || post.id;
      const cUrl = `https://oauth.reddit.com/r/${post.subreddit}/comments/${postId}?sort=top&limit=6`;
      const cRes = await fetch(cUrl, { headers });
      if (cRes.ok) {
        const cData = await cRes.json();
        post.top_comments = (cData?.[1]?.data?.children ?? [])
          .filter((c: any) => c.data?.body && c.data.body !== '[deleted]')
          .slice(0, 6)
          .map((c: any) => ({ body: c.data.body.substring(0, 400), author: c.data.author ?? '', score: c.data.score ?? 0 }));
      }
      await delay(200);
    } catch (e) { /* ignore */ }
  }

  return unique;
}

async function searchPullPush(
  queries: string[],
  keywords: string[],
  limit: number
): Promise<RedditPost[]> {
  // PullPush.io — community Pushshift mirror, works from Deno/cloud environments
  const all: RedditPost[] = [];

  for (const query of queries.slice(0, 6)) {
    try {
      const url = new URL('https://api.pullpush.io/reddit/search/submission/');
      url.searchParams.set('q', query);
      url.searchParams.set('size', '15');
      url.searchParams.set('score', '>1');

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'FounderLens/1.0' },
      });

      if (!res.ok) {
        console.warn(`PullPush failed (${res.status}) for query: ${query}`);
        continue;
      }

      const data = await res.json();
      for (const p of data?.data ?? []) {
        if (!p.title) continue;
        // Relevance pre-filter using keywords
        const text = `${p.title} ${p.selftext ?? ''}`.toLowerCase();
        const relevant = keywords.length === 0 || keywords.some(k => text.includes(k.toLowerCase()));
        if (!relevant) continue;

        all.push({
          id: p.id ?? `pullpush_${Date.now()}`,
          title: p.title,
          selftext: (p.selftext ?? '').substring(0, 1000),
          url: p.url ?? '',
          author: p.author ?? '[deleted]',
          subreddit: p.subreddit ?? 'unknown',
          score: p.score ?? 0,
          num_comments: p.num_comments ?? 0,
          upvote_ratio: p.upvote_ratio ?? 0,
          created_utc: p.created_utc ?? 0,
          permalink: p.permalink
            ? `https://reddit.com${p.permalink}`
            : `https://reddit.com/r/${p.subreddit}/comments/${p.id}/`,
          top_comments: [],
        });
      }
      await delay(400);
    } catch (e) {
      console.error(`PullPush error for "${query}":`, e);
    }
  }

  // Fetch comments for top posts via PullPush
  const unique = dedup(all).sort((a, b) => b.score - a.score).slice(0, limit);
  for (const post of unique.slice(0, 8)) {
    try {
      const commentUrl = new URL('https://api.pullpush.io/reddit/search/comment/');
      commentUrl.searchParams.set('link_id', `t3_${post.id}`);
      commentUrl.searchParams.set('size', '6');
      commentUrl.searchParams.set('score', '>1');

      const cRes = await fetch(commentUrl.toString(), {
        headers: { 'User-Agent': 'FounderLens/1.0' },
      });
      if (cRes.ok) {
        const cData = await cRes.json();
        post.top_comments = (cData?.data ?? [])
          .filter((c: any) => c.body && c.body !== '[deleted]' && c.body !== '[removed]')
          .slice(0, 6)
          .map((c: any) => ({ body: c.body.substring(0, 400), author: c.author ?? '', score: c.score ?? 0 }));
      }
      await delay(300);
    } catch (e) { /* ignore */ }
  }

  console.log(`📬 PullPush returned ${unique.length} posts`);
  return unique;
}

function dedup(posts: RedditPost[]): RedditPost[] {
  const seen = new Set<string>();
  return posts.filter(p => {
    const key = p.permalink || p.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

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
  keyQuotes: { text: string; source: string; score: number }[];
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
    return `[Post ${i + 1}] r/${p.subreddit} | ${p.score} upvotes | "${p.title}"\n${p.selftext ? p.selftext.slice(0, 300) : '(no body)'}${comments ? '\nTop comments:\n' + comments : ''}`;
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
    { "text": "exact or paraphrased quote from a Reddit comment", "source": "r/subreddit", "score": 0 }
  ]
}

opportunityScore: 0-100. Base it on: volume of relevant discussions, intensity of pain expressed, demand signals found, and competitor gaps. 0 = no validation evidence, 100 = overwhelming community demand.
keyQuotes: up to 4 most impactful quotes. score = the post's Reddit upvote score.`,
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
    // Basic extractive fallback
    return {
      tldr: `Found ${posts.length} Reddit discussions related to "${opportunity.title}". Community data has been collected — AI summarization requires an OpenAI API key.`,
      demandSignals: posts.slice(0, 3).map(p => `"${p.title}" (${p.score} upvotes, r/${p.subreddit})`),
      painPoints: [],
      competitorMentions: [],
      opportunityScore: Math.min(50, posts.length * 5),
      keyQuotes: posts.slice(0, 3).map(p => ({ text: p.title, source: `r/${p.subreddit}`, score: p.score })),
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

    // Fetch opportunity details
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

    // Build search queries from opportunity data if not provided
    const searchQueries = queries.length > 0 ? queries : [
      opportunity.title,
      `${opportunity.target_market} problem`,
      `${opportunity.title} alternative`,
      `${opportunity.title} frustrating`,
      ...(opportunity.opportunity_tags ?? []).slice(0, 3),
    ];

    const searchKeywords = keywords.length > 0 ? keywords : [
      ...opportunity.title.toLowerCase().split(' ').filter((w: string) => w.length > 3),
      ...(opportunity.opportunity_tags ?? []),
    ];

    const searchSubreddits = subreddits.length > 0 ? subreddits : ['entrepreneur', 'startups', 'smallbusiness'];

    console.log(`🔎 Searching with ${searchQueries.length} queries, ${searchSubreddits.length} subreddits`);

    // Search Reddit (OAuth → PullPush fallback)
    const posts = await searchReddit(searchQueries, searchSubreddits, searchKeywords, limit);
    console.log(`✅ Found ${posts.length} Reddit posts`);

    // AI summarization
    const apiKey = Deno.env.get('OPENAI_API_KEY');
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
      // Legacy fields for backward compatibility
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
