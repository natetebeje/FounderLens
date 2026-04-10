/**
 * Shared Reddit Search Module
 *
 * Global-first search strategy: queries ALL of Reddit by topic/keywords,
 * then optionally supplements with subreddit-scoped search.
 * No hardcoded subreddits — AI generates queries and keywords per opportunity.
 *
 * OAuth primary → PullPush fallback → keyword relevance filtering → dedup + rank.
 */

// ============================================================================
// Types
// ============================================================================

export interface RedditPost {
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

export interface SearchPlan {
  queries: string[];
  subreddits: string[];
  keywords: string[];
}

// ============================================================================
// Helpers
// ============================================================================

export function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export function dedup(posts: RedditPost[]): RedditPost[] {
  const seen = new Set<string>();
  return posts.filter(p => {
    const key = p.permalink || p.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================================
// Reddit OAuth Token
// ============================================================================

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getRedditToken(): Promise<string | null> {
  const clientId = Deno.env.get('REDDIT_CLIENT_ID');
  const clientSecret = Deno.env.get('REDDIT_CLIENT_SECRET');
  console.log(`🔑 Reddit OAuth: clientId=${clientId ? 'set' : 'MISSING'}, clientSecret=${clientSecret ? 'set' : 'MISSING'}`);
  if (!clientId || !clientSecret) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    console.log('🔑 Using cached Reddit token');
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
      const errText = await res.text().catch(() => '');
      console.warn(`Reddit OAuth failed: ${res.status} — ${errText}`);
      return null;
    }
    const data = await res.json();
    console.log(`🔑 Reddit OAuth token acquired (expires in ${data.expires_in}s)`);
    cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return cachedToken.token;
  } catch (err) {
    console.error('Reddit token error:', err);
    return null;
  }
}

// ============================================================================
// Reddit OAuth Search — GLOBAL-FIRST strategy
// ============================================================================

async function searchRedditOAuth(
  token: string,
  queries: string[],
  keywords: string[],
  limit: number,
  subreddits: string[] = []
): Promise<RedditPost[]> {
  const all: RedditPost[] = [];
  const headers = {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'FounderLens/1.0 (by /u/founderlens_app)',
  };

  function extractPost(p: any, fallbackSub?: string) {
    if (!p || !p.title || p.score < 1) return;
    all.push({
      id: p.id,
      title: p.title ?? '',
      selftext: (p.selftext ?? '').substring(0, 1000),
      url: p.url ?? '',
      author: p.author ?? '[deleted]',
      subreddit: p.subreddit ?? fallbackSub ?? 'unknown',
      score: p.score ?? 0,
      num_comments: p.num_comments ?? 0,
      upvote_ratio: p.upvote_ratio ?? 0,
      created_utc: p.created_utc ?? 0,
      permalink: `https://reddit.com${p.permalink ?? ''}`,
      top_comments: [],
    });
  }

  // Pass 1 (PRIMARY): Global search across ALL of Reddit — no subreddit restriction
  console.log(`🔍 Reddit OAuth: global search with ${queries.length} queries...`);
  for (const query of queries.slice(0, 8)) {
    try {
      const url = `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&sort=relevance&t=all&limit=25`;
      console.log(`   🔍 Searching: "${query.slice(0, 60)}"`);
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.warn(`   ⚠️ Reddit OAuth ${res.status} for "${query}" — ${errBody.slice(0, 200)}`);
        continue;
      }
      const data = await res.json();
      const children = data?.data?.children ?? [];
      console.log(`   → ${children.length} results for "${query.slice(0, 40)}"`);
      for (const child of children) {
        extractPost(child.data);
      }
      await delay(300);
    } catch (e) {
      console.error(`OAuth global search error for "${query}":`, e);
    }
  }
  console.log(`   Global search found ${all.length} raw posts`);

  // Pass 2 (SUPPLEMENT): Subreddit-scoped search if subreddits provided
  if (subreddits.length > 0) {
    const beforeCount = all.length;
    for (const subreddit of subreddits.slice(0, 4)) {
      for (const query of queries.slice(0, 2)) {
        try {
          const url = `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(query)}&sort=relevance&t=all&limit=10&restrict_sr=on`;
          const res = await fetch(url, { headers });
          if (!res.ok) continue;
          const data = await res.json();
          for (const child of data?.data?.children ?? []) {
            extractPost(child.data, subreddit);
          }
          await delay(300);
        } catch { /* ignore */ }
      }
    }
    console.log(`   Subreddit supplement found ${all.length - beforeCount} additional posts`);
  }

  // Keyword relevance filter
  const keywordsLower = keywords.map(k => k.toLowerCase());
  let filtered: RedditPost[];
  if (keywordsLower.length > 0) {
    filtered = all.filter(p => {
      const text = `${p.title} ${p.selftext} ${p.subreddit}`.toLowerCase();
      return keywordsLower.some(k => text.includes(k));
    });
    console.log(`   After keyword filter: ${filtered.length} relevant posts (from ${all.length})`);
    // If filter removed too much, keep top posts by score as fallback
    if (filtered.length < 3 && all.length > 0) {
      const topByScore = all.sort((a, b) => b.score - a.score).slice(0, 5);
      for (const p of topByScore) {
        if (!filtered.find(f => f.id === p.id)) filtered.push(p);
      }
    }
  } else {
    filtered = all;
  }

  // Dedup and rank by score
  const unique = dedup(filtered).sort((a, b) => b.score - a.score).slice(0, limit);

  // Pass 3: Fetch top comments for top posts
  for (const post of unique.slice(0, 8)) {
    try {
      const postId = post.permalink.split('/')[6] || post.id;
      const sub = post.subreddit || 'all';
      const cUrl = `https://oauth.reddit.com/r/${sub}/comments/${postId}?sort=top&limit=6`;
      const cRes = await fetch(cUrl, { headers });
      if (cRes.ok) {
        const cData = await cRes.json();
        post.top_comments = (cData?.[1]?.data?.children ?? [])
          .filter((c: any) => c.data?.body && c.data.body !== '[deleted]')
          .slice(0, 6)
          .map((c: any) => ({
            body: c.data.body.substring(0, 400),
            author: c.data.author ?? '',
            score: c.data.score ?? 0,
          }));
      }
      await delay(200);
    } catch { /* ignore */ }
  }

  return unique;
}

// ============================================================================
// PullPush Fallback — global-first with keyword relevance filtering
// ============================================================================

async function searchPullPush(
  queries: string[],
  keywords: string[],
  limit: number,
  subreddits: string[] = []
): Promise<RedditPost[]> {
  const all: RedditPost[] = [];
  const keywordsLower = keywords.map(k => k.toLowerCase());

  function isRelevant(title: string, selftext: string): boolean {
    if (keywordsLower.length === 0) return true;
    const text = `${title} ${selftext}`.toLowerCase();
    return keywordsLower.some(k => text.includes(k));
  }

  function extractPost(p: any, fallbackSub?: string) {
    if (!p || !p.title) return;
    if (!isRelevant(p.title, p.selftext ?? '')) return;
    all.push({
      id: p.id ?? `pp_${Date.now()}_${Math.random()}`,
      title: p.title,
      selftext: (p.selftext ?? '').substring(0, 1000),
      url: p.url ?? '',
      author: p.author ?? '[deleted]',
      subreddit: p.subreddit ?? fallbackSub ?? 'unknown',
      score: p.score ?? 0,
      num_comments: p.num_comments ?? 0,
      upvote_ratio: p.upvote_ratio ?? 0,
      created_utc: p.created_utc ?? 0,
      permalink: p.permalink
        ? `https://reddit.com${p.permalink}`
        : `https://reddit.com/r/${p.subreddit || 'unknown'}/comments/${p.id}/`,
      top_comments: [],
    });
  }

  // Pass 1 (PRIMARY): Global topic search across all Reddit
  console.log(`🔄 PullPush: global search with ${queries.length} queries...`);
  for (const query of queries.slice(0, 6)) {
    try {
      const url = new URL('https://api.pullpush.io/reddit/search/submission/');
      url.searchParams.set('q', query);
      url.searchParams.set('size', '20');
      url.searchParams.set('score', '>0');

      console.log(`   🔍 PullPush: "${query.slice(0, 60)}"`);
      const res = await fetch(url.toString(), { headers: { 'User-Agent': 'FounderLens/1.0' } });
      if (!res.ok) { console.warn(`   ⚠️ PullPush ${res.status} for "${query}"`); continue; }

      const data = await res.json();
      const rawCount = (data?.data ?? []).length;
      const beforeCount = all.length;
      for (const p of data?.data ?? []) {
        extractPost(p);
      }
      console.log(`   → ${rawCount} raw results, ${all.length - beforeCount} passed keyword filter`);
      await delay(350);
    } catch (e) { console.error(`PullPush error for "${query}":`, e); }
  }
  console.log(`   Global search found ${all.length} relevant posts`);

  // Pass 2 (SUPPLEMENT): Subreddit-scoped search if provided
  if (subreddits.length > 0) {
    const beforeCount = all.length;
    for (const subreddit of subreddits.slice(0, 4)) {
      for (const query of queries.slice(0, 2)) {
        try {
          const url = new URL('https://api.pullpush.io/reddit/search/submission/');
          url.searchParams.set('q', query);
          url.searchParams.set('subreddit', subreddit.replace(/^r\//, ''));
          url.searchParams.set('size', '15');
          url.searchParams.set('score', '>1');

          const res = await fetch(url.toString(), { headers: { 'User-Agent': 'FounderLens/1.0' } });
          if (!res.ok) continue;

          const data = await res.json();
          for (const p of data?.data ?? []) {
            extractPost(p, subreddit);
          }
          await delay(300);
        } catch { /* ignore */ }
      }
    }
    console.log(`   Subreddit supplement found ${all.length - beforeCount} additional posts`);
  }

  // Dedup and rank by score
  const unique = dedup(all).sort((a, b) => b.score - a.score).slice(0, limit);

  // Fetch comments for top posts
  for (const post of unique.slice(0, 8)) {
    try {
      const commentUrl = new URL('https://api.pullpush.io/reddit/search/comment/');
      commentUrl.searchParams.set('link_id', `t3_${post.id}`);
      commentUrl.searchParams.set('size', '6');
      commentUrl.searchParams.set('score', '>0');

      const cRes = await fetch(commentUrl.toString(), { headers: { 'User-Agent': 'FounderLens/1.0' } });
      if (cRes.ok) {
        const cData = await cRes.json();
        post.top_comments = (cData?.data ?? [])
          .filter((c: any) => c.body && c.body !== '[deleted]' && c.body !== '[removed]')
          .slice(0, 6)
          .map((c: any) => ({
            body: c.body.substring(0, 400),
            author: c.author ?? '',
            score: c.score ?? 0,
          }));
      }
      await delay(250);
    } catch { /* ignore */ }
  }

  return unique;
}

// ============================================================================
// Main Entry Point — OAuth primary, PullPush fallback
// ============================================================================

export async function searchReddit(
  queries: string[],
  keywords: string[],
  limit: number = 25,
  subreddits: string[] = []
): Promise<RedditPost[]> {
  console.log(`\n🔍 Reddit Search — ${queries.length} queries, ${keywords.length} keywords, ${subreddits.length} optional subreddits`);
  console.log(`   Queries: ${queries.slice(0, 3).map(q => `"${q.slice(0, 50)}"`).join(', ')}`);
  console.log(`   Keywords: ${keywords.slice(0, 5).join(', ')}`);

  const token = await getRedditToken();

  if (token) {
    console.log('🔐 Using Reddit OAuth API (global-first search)');
    const posts = await searchRedditOAuth(token, queries, keywords, limit, subreddits);
    console.log(`✅ Reddit OAuth returned ${posts.length} posts`);

    // If OAuth returned nothing, try PullPush as well
    if (posts.length === 0) {
      console.log('🔄 OAuth returned 0 posts — also trying PullPush...');
      const ppPosts = await searchPullPush(queries, keywords, limit, subreddits);
      console.log(`✅ PullPush returned ${ppPosts.length} posts`);
      return ppPosts;
    }
    return posts;
  }

  console.log('🔄 Reddit OAuth not configured — using PullPush fallback');
  return searchPullPush(queries, keywords, limit, subreddits);
}

// ============================================================================
// AI Search Plan Generation — queries + keywords focused, subreddits optional
// ============================================================================

export async function generateRedditSearchPlan(
  opportunity: { title: string; description: string; target_market: string; opportunity_tags?: string[] },
  apiKey: string | undefined
): Promise<SearchPlan> {
  const opportunityText = `${opportunity.title} ${opportunity.description} ${opportunity.target_market}`.toLowerCase();

  if (!apiKey) {
    // No OpenAI — derive queries and keywords from opportunity text
    const words = opportunityText.split(/\s+/).filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'will', 'been', 'they', 'their', 'about', 'would', 'could', 'should'].includes(w));
    return {
      queries: [
        opportunity.title,
        `${opportunity.target_market} problems`,
        `${opportunity.title} alternative`,
        `best ${opportunity.title.split(' ').slice(-2).join(' ')}`,
        `${opportunity.target_market} frustrations`,
        `help with ${opportunity.title.split(' ').slice(0, 3).join(' ')}`,
      ],
      subreddits: [], // no hardcoded subreddits — global search handles it
      keywords: [...new Set(words)].slice(0, 12),
    };
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a Reddit research expert. Return valid JSON only.',
          },
          {
            role: 'user',
            content: `Generate Reddit search queries to validate this business opportunity. Focus on finding posts where REAL USERS discuss the problem — not startup/business subreddits.

OPPORTUNITY: "${opportunity.title}"
DESCRIPTION: ${opportunity.description}
TARGET MARKET: ${opportunity.target_market}

The queries will be used to search ALL of Reddit globally (not restricted to specific subreddits). Generate queries that match how real people talk about this problem.

Return JSON:
{
  "queries": ["8-10 specific search queries using the target users' natural language. Include: problem-focused queries ('struggling with X', 'hate when Y'), solution-seeking queries ('best app for Z', 'how do you handle X'), competitor queries ('X vs Y', 'alternative to Z'), and emotional queries ('frustrated with X', 'need help with Y')"],
  "keywords": ["10-15 relevance keywords — a search result must contain at least one to be considered relevant. Include the core topic words, synonyms, and related terms the target users would use"],
  "subreddits": ["3-5 optional subreddits where these users might hang out — used only as a supplement, not required"]
}`,
          },
        ],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const plan = JSON.parse(data.choices[0].message.content);
      console.log(`🎯 Reddit search plan: ${plan.queries?.length} queries, ${plan.keywords?.length} keywords, ${plan.subreddits?.length} optional subreddits`);
      return {
        queries: (plan.queries || []).slice(0, 10),
        subreddits: (plan.subreddits || []).slice(0, 5),
        keywords: (plan.keywords || []).slice(0, 15),
      };
    }
  } catch (err) {
    console.error('Reddit search plan generation failed:', err);
  }

  // Fallback — derive from opportunity text
  const words = opportunityText.split(/\s+/).filter(w => w.length > 3);
  return {
    queries: [
      opportunity.title,
      `${opportunity.target_market} problems`,
      `${opportunity.title} alternative`,
      `${opportunity.target_market} frustrations`,
    ],
    subreddits: [],
    keywords: [...new Set(words)].slice(0, 12),
  };
}
