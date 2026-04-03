import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TYPES
// ============================================================================

interface HNResult {
  title: string;
  url: string | null;
  author: string;
  points: number;
  numComments: number;
  createdAt: string;
  objectID: string;
  storyText: string | null;
}

interface HNComment {
  text: string;
  author: string;
  points: number;
  createdAt: string;
  objectID: string;
  storyTitle: string;
}

interface RedditPost {
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  score: number;
  numComments: number;
  permalink: string;
  createdUtc: number;
  upvoteRatio: number;
  topComments: { body: string; author: string; score: number }[];
}

interface SearchPlan {
  queries: string[];
  hnQueries: string[];
  subreddits: string[];
  keywords: string[];
  webQueries: string[];
  localLanguageQueries: string[];
}

interface WebForumResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

// ============================================================================
// STEP 1: AI-POWERED SEARCH PLANNING (GigaBrain-inspired)
// Instead of naive keyword extraction, use AI to generate targeted queries
// ============================================================================

async function generateSearchPlan(
  opportunity: { title: string; description: string; targetMarket: string; problemStatement: string; tags?: string[] },
  apiKey: string
): Promise<SearchPlan> {
  const prompt = `You are a research query strategist. Given a business opportunity, generate highly specific search queries to find REAL community discussions about the EXACT problem this opportunity solves.

## OPPORTUNITY
- **Title**: ${opportunity.title}
- **Description**: ${opportunity.description}
- **Target Market**: ${opportunity.targetMarket}
- **Problem**: ${opportunity.problemStatement}
- **Tags**: ${(opportunity.tags || []).join(', ')}

## YOUR TASK
Generate search queries that will find people discussing THIS SPECIFIC problem or need. Think like a researcher on GigaBrain/Reddit who wants to find threads where people are:
1. Complaining about the exact problem this product solves
2. Asking for a solution like this
3. Discussing alternatives/competitors in this exact space
4. Sharing frustrations with existing tools in this exact domain

## RULES
- Queries must be SPECIFIC and UNIQUE to this opportunity — not generic business/startup queries
- Extract the CORE subject domain (e.g., for "AI Language Learning for Amharic" the core domain is "Amharic language learning", NOT "AI" or "startups")
- Include the most distinctive keywords from the title and problem (proper nouns, niche terms, specific technologies)
- Include queries about competing solutions in this EXACT space (name real competitors if you know them)
- Include queries about the target audience's SPECIFIC pain points (not generic "frustrated with tools")
- Subreddits must be where THIS topic's users actually hang out (not r/startups or r/entrepreneur unless the topic is literally about startup tools)
- Each query should target a DIFFERENT angle: problem-focused, solution-focused, competitor-focused, audience-focused

Return JSON:
{
  "queries": ["5-8 Reddit search queries - specific to this exact topic"],
  "hnQueries": ["3-5 Hacker News search queries - more technical/startup angle"],
  "subreddits": ["6-10 specific subreddits where this topic's target users hang out"],
  "keywords": ["8-12 relevance keywords - a result MUST relate to at least one of these to be considered relevant"],
  "webQueries": ["3-5 web search queries to find forum discussions, blog posts, Quora, Facebook groups, Stack Exchange, etc. - use 'site:' operators like 'site:quora.com' or 'site:facebook.com/groups' when useful"],
  "localLanguageQueries": ["2-4 search queries in the TARGET MARKET's local language if the opportunity serves a non-English market, otherwise empty array. E.g., for Amharic learners include queries in Amharic script. For Spanish market, include Spanish queries."]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Return valid JSON only. No markdown, no explanation.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error(`OpenAI query planning failed: ${response.status}`);
    const data = await response.json();
    const plan = JSON.parse(data.choices[0].message.content);

    return {
      queries: (plan.queries || []).slice(0, 8),
      hnQueries: (plan.hnQueries || []).slice(0, 5),
      subreddits: (plan.subreddits || []).slice(0, 10),
      keywords: (plan.keywords || []).slice(0, 12),
      webQueries: (plan.webQueries || []).slice(0, 5),
      localLanguageQueries: (plan.localLanguageQueries || []).slice(0, 4),
    };
  } catch (error) {
    console.error('Search plan generation failed, using fallback:', error);
    return generateFallbackSearchPlan(opportunity);
  }
}

function generateFallbackSearchPlan(opportunity: {
  title: string; description: string; targetMarket: string; problemStatement: string; tags?: string[]
}): SearchPlan {
  // Extract meaningful terms from the opportunity
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'how', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'not', 'no', 'nor', 'than', 'too', 'very', 'just', 'about', 'above', 'after', 'again', 'all', 'also', 'any', 'because', 'before', 'between', 'both', 'each', 'few', 'more', 'most', 'other', 'over', 'same', 'some', 'such', 'then', 'there', 'through', 'under', 'until', 'your', 'their', 'into']);

  const allText = `${opportunity.title} ${opportunity.description} ${opportunity.targetMarket} ${opportunity.problemStatement}`;
  const keywords = allText.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  const uniqueKeywords = [...new Set(keywords)].slice(0, 12);
  const titleWords = opportunity.title.replace(/[^a-z0-9\s-]/gi, '').trim();

  return {
    queries: [
      titleWords,
      `${opportunity.problemStatement.split('.')[0]}`,
      `${opportunity.targetMarket} problems`,
      `${titleWords} alternative`,
      `${titleWords} frustrating`,
    ],
    hnQueries: [
      titleWords,
      `${opportunity.targetMarket} solution`,
      `${opportunity.problemStatement.split('.')[0]}`,
    ],
    subreddits: ['startups', 'entrepreneur'],
    keywords: uniqueKeywords,
    webQueries: [
      `${titleWords} forum discussion`,
      `${titleWords} site:quora.com`,
    ],
    localLanguageQueries: [],
  };
}

// ============================================================================
// STEP 2: SEARCH HACKER NEWS
// ============================================================================

async function searchHackerNews(queries: string[], limit: number = 30): Promise<{ stories: HNResult[]; comments: HNComment[] }> {
  const allStories: HNResult[] = [];
  const allComments: HNComment[] = [];

  for (const query of queries.slice(0, 5)) {
    try {
      // Search stories
      const storyUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${Math.ceil(limit / queries.length)}&numericFilters=points>1`;
      const storyResponse = await fetch(storyUrl);
      if (storyResponse.ok) {
        const data = await storyResponse.json();
        for (const hit of data.hits || []) {
          allStories.push({
            title: hit.title || '',
            url: hit.url || null,
            author: hit.author || '',
            points: hit.points || 0,
            numComments: hit.num_comments || 0,
            createdAt: hit.created_at || '',
            objectID: hit.objectID || '',
            storyText: hit.story_text || null,
          });
        }
      }

      // Search comments (without appending generic frustration words)
      const commentUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=comment&hitsPerPage=${Math.ceil(limit / queries.length)}&numericFilters=points>1`;
      const commentResponse = await fetch(commentUrl);
      if (commentResponse.ok) {
        const data = await commentResponse.json();
        for (const hit of data.hits || []) {
          if (hit.comment_text && hit.comment_text.length > 30) {
            allComments.push({
              text: stripHtml(hit.comment_text).substring(0, 500),
              author: hit.author || '',
              points: hit.points || 0,
              createdAt: hit.created_at || '',
              objectID: hit.objectID || '',
              storyTitle: hit.story_title || '',
            });
          }
        }
      }
    } catch (error) {
      console.error(`HN search failed for "${query}":`, error);
    }

    await new Promise(r => setTimeout(r, 200));
  }

  const uniqueStories = Array.from(new Map(allStories.map(s => [s.objectID, s])).values());
  const uniqueComments = Array.from(new Map(allComments.map(c => [c.objectID, c])).values());

  return {
    stories: uniqueStories.sort((a, b) => b.points - a.points).slice(0, limit),
    comments: uniqueComments.sort((a, b) => b.points - a.points).slice(0, limit),
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

// ============================================================================
// STEP 3: SEARCH REDDIT
// Uses OAuth when REDDIT_CLIENT_ID/SECRET are set; falls back to PullPush.io
// which bypasses Reddit's 403 datacenter IP blocks (GigaBrain strategy).
// ============================================================================

let _cachedRedditToken: { token: string; expiresAt: number } | null = null;

async function getRedditToken(): Promise<string | null> {
  const clientId = Deno.env.get('REDDIT_CLIENT_ID');
  const clientSecret = Deno.env.get('REDDIT_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  if (_cachedRedditToken && Date.now() < _cachedRedditToken.expiresAt - 60_000) {
    return _cachedRedditToken.token;
  }

  try {
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'FounderLens/1.0 (by /u/founderlens_app)',
      },
      body: 'grant_type=client_credentials',
    });
    if (response.ok) {
      const data = await response.json();
      _cachedRedditToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
      console.log('✅ Reddit OAuth token obtained');
      return _cachedRedditToken.token;
    }
    console.warn(`⚠️ Reddit OAuth failed (${response.status}) — falling back to PullPush`);
  } catch (error) {
    console.error('Reddit auth error:', error);
  }
  return null;
}

async function searchReddit(
  token: string | null,
  queries: string[],
  subreddits: string[],
  limit: number = 30
): Promise<RedditPost[]> {
  if (token) {
    console.log('🔐 Using Reddit OAuth API');
    return _searchRedditOAuth(token, queries, subreddits, limit);
  }
  console.log('🔄 Using PullPush fallback (bypasses Reddit datacenter blocks)');
  return _searchPullPush(queries, limit);
}

async function _searchRedditOAuth(
  token: string,
  queries: string[],
  subreddits: string[],
  limit: number
): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = [];
  const headers = {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'FounderLens/1.0 (by /u/founderlens_app)',
  };

  for (const subreddit of subreddits.slice(0, 8)) {
    for (const query of queries.slice(0, 4)) {
      try {
        const url = `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(query)}&sort=relevance&t=year&limit=10&restrict_sr=on`;
        const response = await fetch(url, { headers });
        if (!response.ok) continue;

        const data = await response.json();
        for (const child of data?.data?.children || []) {
          const post = child.data;
          if (!post || post.score < 2) continue;

          let topComments: { body: string; author: string; score: number }[] = [];
          try {
            const commentsUrl = `https://oauth.reddit.com/r/${subreddit}/comments/${post.id}?sort=top&limit=6`;
            const commentsResponse = await fetch(commentsUrl, { headers });
            if (commentsResponse.ok) {
              const commentsData = await commentsResponse.json();
              topComments = (commentsData?.[1]?.data?.children || [])
                .filter((c: any) => c.data?.body && c.data.body !== '[deleted]' && c.data.body.length > 20)
                .slice(0, 6)
                .map((c: any) => ({ body: c.data.body.substring(0, 500), author: c.data.author || '', score: c.data.score || 0 }));
            }
          } catch (e) { /* ignore */ }

          allPosts.push({
            title: post.title || '',
            selftext: (post.selftext || '').substring(0, 1000),
            author: post.author || '',
            subreddit: post.subreddit || subreddit,
            score: post.score || 0,
            numComments: post.num_comments || 0,
            permalink: `https://reddit.com${post.permalink || ''}`,
            createdUtc: post.created_utc || 0,
            upvoteRatio: post.upvote_ratio || 0,
            topComments,
          });
        }
        await new Promise(r => setTimeout(r, 300));
      } catch (error) {
        console.error(`OAuth search error r/${subreddit}:`, error);
      }
    }
  }

  const unique = Array.from(new Map(allPosts.map(p => [p.permalink, p])).values());
  return unique.sort((a, b) => b.score - a.score).slice(0, limit);
}

// PullPush.io — community Pushshift mirror, works from Deno/cloud environments
// This is the GigaBrain-proven strategy for bypassing Reddit's datacenter IP blocks.
async function _searchPullPush(queries: string[], limit: number): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = [];
  console.log('📡 PullPush search with', queries.length, 'queries');

  for (const query of queries.slice(0, 7)) {
    try {
      const url = new URL('https://api.pullpush.io/reddit/search/submission/');
      url.searchParams.set('q', query);
      url.searchParams.set('size', '15');
      url.searchParams.set('score', '>1');

      const res = await fetch(url.toString(), { headers: { 'User-Agent': 'FounderLens/1.0' } });
      if (!res.ok) {
        console.warn(`PullPush ${res.status} for "${query}"`);
        continue;
      }

      const data = await res.json();
      for (const p of data?.data ?? []) {
        if (!p.title) continue;
        allPosts.push({
          title: p.title,
          selftext: (p.selftext ?? '').substring(0, 1000),
          author: p.author ?? '[deleted]',
          subreddit: p.subreddit ?? 'unknown',
          score: p.score ?? 0,
          numComments: p.num_comments ?? 0,
          permalink: p.permalink ? `https://reddit.com${p.permalink}` : `https://reddit.com/r/${p.subreddit}/comments/${p.id}/`,
          createdUtc: p.created_utc ?? 0,
          upvoteRatio: p.upvote_ratio ?? 0,
          topComments: [],
        });
      }
      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      console.error(`PullPush error for "${query}":`, e);
    }
  }

  // Fetch comments for top posts
  const unique = Array.from(new Map(allPosts.map(p => [p.permalink, p])).values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  for (const post of unique.slice(0, 8)) {
    try {
      const postId = post.permalink.split('/')[6] ?? post.permalink.split('/').pop();
      if (!postId) continue;
      const cUrl = new URL('https://api.pullpush.io/reddit/search/comment/');
      cUrl.searchParams.set('link_id', `t3_${postId}`);
      cUrl.searchParams.set('size', '6');
      cUrl.searchParams.set('score', '>1');
      const cRes = await fetch(cUrl.toString(), { headers: { 'User-Agent': 'FounderLens/1.0' } });
      if (cRes.ok) {
        const cData = await cRes.json();
        post.topComments = (cData?.data ?? [])
          .filter((c: any) => c.body && c.body !== '[deleted]' && c.body !== '[removed]')
          .slice(0, 6)
          .map((c: any) => ({ body: c.body.substring(0, 500), author: c.author ?? '', score: c.score ?? 0 }));
      }
      await new Promise(r => setTimeout(r, 300));
    } catch (e) { /* ignore */ }
  }

  console.log(`📬 PullPush returned ${unique.length} posts`);
  return unique;
}

// Legacy wrapper — called from serve() which previously passed a token separately
async function searchRedditPublic(
  queries: string[],
  subreddits: string[],
  limit: number = 25
): Promise<RedditPost[]> {
  return _searchPullPush(queries, limit);
}

// STEP 3b: WEB FORUM SEARCH (Quora, forums, blogs via DuckDuckGo)
// Diversifies sources beyond just HN and Reddit
// ============================================================================

async function searchWebForums(queries: string[], limit: number = 15): Promise<WebForumResult[]> {
  const results: WebForumResult[] = [];

  for (const query of queries.slice(0, 4)) {
    try {
      // Primary: DuckDuckGo HTML search (more stable than Lite)
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `q=${encodeURIComponent(query)}`,
      });

      if (response.ok) {
        const html = await response.text();

        // Parse DDG HTML results — uses class="result__a" for links and class="result__snippet" for snippets
        const linkPattern = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        const snippetPattern = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

        const links: { url: string; title: string }[] = [];
        let match;
        while ((match = linkPattern.exec(html)) !== null) {
          const href = match[1];
          // DDG wraps URLs in a redirect — extract the actual URL
          const actualUrl = href.includes('uddg=') ? decodeURIComponent(href.split('uddg=')[1]?.split('&')[0] || href) : href;
          links.push({ url: actualUrl, title: stripHtml(match[2]) });
        }

        const snippets: string[] = [];
        while ((match = snippetPattern.exec(html)) !== null) {
          snippets.push(stripHtml(match[1]));
        }

        // If primary parsing found nothing, try Lite format as fallback
        if (links.length === 0) {
          const liteResultPattern = /<a[^>]+href="([^"]+)"[^>]*class="result-link"[^>]*>([^<]+)<\/a>/gi;
          const liteSnippetPattern = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;
          while ((match = liteResultPattern.exec(html)) !== null) {
            links.push({ url: match[1], title: stripHtml(match[2]) });
          }
          while ((match = liteSnippetPattern.exec(html)) !== null) {
            snippets.push(stripHtml(match[1]));
          }
        }

        if (links.length === 0) {
          console.warn(`⚠️ DDG returned ${html.length} bytes of HTML but no results parsed for query: "${query}"`);
        }

        for (let i = 0; i < Math.min(links.length, 5); i++) {
          const link = links[i];
          // Only include results from forums/Q&A/discussion sites
          const isForumSite = /quora|stackexchange|stackoverflow|facebook\.com\/groups|forum|community|discuss|medium\.com|dev\.to|producthunt|babycenter|whattoexpect|mumsnet|healthline|reddit|ycombinator|indiehackers|twitter|x\.com|linkedin|pinterest|tumblr|wordpress|blogspot|substack|hackernoon|towardsdatascience|freecodecamp/i.test(link.url);
          if (isForumSite || snippets[i]?.length > 30) {
            results.push({
              title: link.title,
              snippet: (snippets[i] || '').substring(0, 300),
              url: link.url,
              source: extractDomain(link.url),
            });
          }
        }
      } else {
        console.warn(`⚠️ DDG search returned status ${response.status} for query: "${query}"`);
      }

      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      console.error(`Web search failed for "${query}":`, error);
    }
  }

  // Deduplicate by URL
  const unique = Array.from(new Map(results.map(r => [r.url, r])).values());
  console.log(`🌐 Web forum search found ${unique.length} results`);
  return unique.slice(0, limit);
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return hostname;
  } catch {
    return 'web';
  }
}

// ============================================================================
// STEP 3c: MULTILINGUAL SEARCH SUPPORT
// For non-English markets, search in local language too
// ============================================================================

async function searchMultilingual(
  queries: string[],
  apiKey: string
): Promise<{ stories: HNResult[]; comments: HNComment[] }> {
  // Use the local language queries for HN search (HN Algolia handles multilingual)
  if (queries.length === 0) {
    return { stories: [], comments: [] };
  }
  // Search HN and web with these queries — HN may have limited results
  // but web forums in other languages can have rich data
  return searchHackerNews(queries, 10);
}

// ============================================================================
// STEP 4: AI-POWERED RELEVANCE FILTERING (GigaBrain's core insight)
// Filter out noise BEFORE deep analysis — only keep results actually about the topic
// ============================================================================

async function filterForRelevance(
  opportunity: { title: string; description: string; targetMarket: string; problemStatement: string },
  hnStories: HNResult[],
  hnComments: HNComment[],
  redditPosts: RedditPost[],
  keywords: string[],
  apiKey: string
): Promise<{ stories: HNResult[]; comments: HNComment[]; posts: RedditPost[] }> {

  // First pass: keyword-based pre-filter to reduce what we send to AI
  const keywordsLower = keywords.map(k => k.toLowerCase());
  const opportunityTerms = `${opportunity.title} ${opportunity.description} ${opportunity.targetMarket} ${opportunity.problemStatement}`
    .toLowerCase();

  function hasKeywordOverlap(text: string): boolean {
    const lower = text.toLowerCase();
    return keywordsLower.some(kw => lower.includes(kw));
  }

  const preFilteredStories = hnStories.filter(s =>
    hasKeywordOverlap(s.title) || (s.storyText && hasKeywordOverlap(s.storyText))
  );
  const preFilteredComments = hnComments.filter(c =>
    hasKeywordOverlap(c.text) || hasKeywordOverlap(c.storyTitle)
  );
  const preFilteredPosts = redditPosts.filter(p =>
    hasKeywordOverlap(p.title) || hasKeywordOverlap(p.selftext)
  );

  // If keyword filtering eliminated everything, include top items by score
  // (the AI query was likely specific enough that results might still be relevant)
  const stories = preFilteredStories.length > 0 ? preFilteredStories : hnStories.slice(0, 10);
  const comments = preFilteredComments.length > 0 ? preFilteredComments : hnComments.slice(0, 15);
  const posts = preFilteredPosts.length > 0 ? preFilteredPosts : redditPosts.slice(0, 10);

  // Second pass: AI relevance scoring for borderline cases
  // Build a concise list of items for AI to score
  const items: { id: string; type: string; text: string }[] = [];

  stories.slice(0, 15).forEach(s => {
    items.push({ id: `hn_story_${s.objectID}`, type: 'hn_story', text: `${s.title} ${s.storyText || ''}`.substring(0, 200) });
  });
  comments.slice(0, 20).forEach(c => {
    items.push({ id: `hn_comment_${c.objectID}`, type: 'hn_comment', text: `[Story: ${c.storyTitle}] ${c.text}`.substring(0, 200) });
  });
  posts.slice(0, 15).forEach(p => {
    items.push({ id: `reddit_${p.permalink}`, type: 'reddit', text: `[r/${p.subreddit}] ${p.title} ${p.selftext}`.substring(0, 200) });
  });

  if (items.length === 0) {
    return { stories: [], comments: [], posts: [] };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a relevance filter. Return valid JSON only.',
          },
          {
            role: 'user',
            content: `Rate each item's relevance to this business opportunity on a scale of 0-10.

OPPORTUNITY: "${opportunity.title}"
PROBLEM: "${opportunity.problemStatement}"
TARGET MARKET: "${opportunity.targetMarket}"

An item is relevant (7+) if it discusses the SAME topic, industry, problem, or target audience.
An item is somewhat relevant (4-6) if it discusses a closely related topic.
An item is irrelevant (0-3) if it discusses a completely different topic or generic complaints.

ITEMS:
${items.map((item, i) => `[${i}] ${item.text}`).join('\n')}

Return JSON: { "scores": [number, number, ...] } — one score per item in order.`,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      const scores: number[] = result.scores || [];

      // Build sets of relevant IDs (score >= 3 — lowered from 4 to avoid dropping borderline-relevant results)
      const relevantIds = new Set<string>();
      items.forEach((item, i) => {
        if ((scores[i] || 0) >= 3) {
          relevantIds.add(item.id);
        }
      });

      let filteredStories = stories.filter(s => relevantIds.has(`hn_story_${s.objectID}`));
      let filteredComments = comments.filter(c => relevantIds.has(`hn_comment_${c.objectID}`));
      let filteredPosts = posts.filter(p => relevantIds.has(`reddit_${p.permalink}`));

      // If AI filtering eliminated everything (or nearly everything) but we had input data,
      // keep the top-scored items — this prevents returning 0 results for legitimate searches
      const totalFiltered = filteredStories.length + filteredComments.length + filteredPosts.length;
      if (totalFiltered < 3 && items.length > 0) {
        console.warn(`⚠️ AI relevance filter only kept ${totalFiltered}/${items.length} items — supplementing with top-scored items`);
        const scoredItems = items.map((item, i) => ({ ...item, score: scores[i] || 0 }));
        scoredItems.sort((a, b) => b.score - a.score);
        // Keep enough items to reach at least 5 total (or all items if fewer available)
        const keepCount = Math.min(items.length, Math.max(5, 5 - totalFiltered));
        const keepIds = new Set(scoredItems.slice(0, keepCount).map(item => item.id));
        // Merge — add items from keepIds that aren't already in the filtered sets
        const existingIds = new Set([
          ...filteredStories.map(s => `hn_story_${s.objectID}`),
          ...filteredComments.map(c => `hn_comment_${c.objectID}`),
          ...filteredPosts.map(p => `reddit_${p.permalink}`),
        ]);
        for (const id of keepIds) {
          if (!existingIds.has(id)) {
            // Add the supplemental item to the appropriate filtered list
            const story = stories.find(s => `hn_story_${s.objectID}` === id);
            if (story) { filteredStories.push(story); continue; }
            const comment = comments.find(c => `hn_comment_${c.objectID}` === id);
            if (comment) { filteredComments.push(comment); continue; }
            const post = posts.find(p => `reddit_${p.permalink}` === id);
            if (post) { filteredPosts.push(post); }
          }
        }
      }

      console.log(`🎯 Relevance filter: ${filteredStories.length}/${stories.length} stories, ${filteredComments.length}/${comments.length} comments, ${filteredPosts.length}/${posts.length} posts kept`);

      return {
        stories: filteredStories,
        comments: filteredComments,
        posts: filteredPosts,
      };
    }
  } catch (error) {
    console.error('Relevance filtering failed, using pre-filtered results:', error);
  }

  // Fallback: return keyword-filtered results
  return { stories, comments, posts };
}

// ============================================================================
// STEP 5: DEEP ANALYSIS WITH STRICT RELEVANCE ENFORCEMENT
// ============================================================================

interface ResearchAnalysis {
  frustrationQuotes: {
    quote: string;
    source: string;
    context: string;
    frustrationLevel: 'mild' | 'moderate' | 'severe';
  }[];
  painPointCategories: {
    category: string;
    description: string;
    frequency: 'rare' | 'common' | 'very_common';
    specificExamples: string[];
    currentWorkarounds: string[];
  }[];
  industryTrends: {
    trend: string;
    direction: 'growing' | 'declining' | 'stable';
    relevance: string;
    opportunity: string;
  }[];
  currentSolutionComplaints: {
    solution: string;
    complaints: string[];
    userSentiment: 'negative' | 'mixed' | 'disappointed';
  }[];
  marketGaps: {
    gap: string;
    evidence: string;
    potentialValue: 'low' | 'medium' | 'high';
  }[];
  overallSentiment: {
    score: number;
    summary: string;
    strongestFrustration: string;
    biggestOpportunity: string;
  };
}

async function analyzeWithOpenAI(
  opportunity: { title: string; description: string; targetMarket: string; problemStatement: string },
  hnData: { stories: HNResult[]; comments: HNComment[] },
  redditData: RedditPost[],
  webData: WebForumResult[],
  apiKey: string
): Promise<ResearchAnalysis> {
  const hnContext = hnData.comments.slice(0, 20).map(c =>
    `[HN Comment by ${c.author} (${c.points} pts) on "${c.storyTitle}"]: "${c.text}"`
  ).join('\n');

  const hnStoriesContext = hnData.stories.slice(0, 10).map(s =>
    `[HN Story: "${s.title}" (${s.points} pts, ${s.numComments} comments)]${s.storyText ? `: ${s.storyText.substring(0, 200)}` : ''}`
  ).join('\n');

  const redditContext = redditData.slice(0, 15).map(p => {
    const commentsStr = p.topComments.slice(0, 3).map(c =>
      `  - "${c.body.substring(0, 200)}" (${c.score} pts)`
    ).join('\n');
    return `[Reddit r/${p.subreddit}: "${p.title}" (${p.score} pts, ${p.numComments} comments)]\n${p.selftext.substring(0, 200)}\nTop comments:\n${commentsStr}`;
  }).join('\n\n');

  const webContext = webData.slice(0, 10).map(w =>
    `[${w.source}: "${w.title}"]\n${w.snippet}`
  ).join('\n\n');

  const hasRealData = hnData.stories.length > 0 || hnData.comments.length > 0 || redditData.length > 0 || webData.length > 0;
  const totalDataPoints = hnData.stories.length + hnData.comments.length + redditData.length + webData.length;

  const systemPrompt = `You are an expert market researcher for FounderLens. You analyze community discussions to extract actionable insights.

CRITICAL RULES:
1. Every quote, pain point, and insight MUST be DIRECTLY relevant to the specific opportunity: "${opportunity.title}"
2. The opportunity targets: "${opportunity.targetMarket}" and solves: "${opportunity.problemStatement}"
3. Do NOT include generic tech/business frustrations that aren't about this specific topic
4. If a quote is about a different industry/topic entirely, EXCLUDE IT — even if it was in the research data
5. If you don't have enough relevant real data, say so honestly. DO NOT pad results with generic complaints
6. When quoting from real data, use exact words and cite the source. When using industry knowledge, label it as "Industry Research"
7. All pain points, trends, and gaps must relate to ${opportunity.title}'s specific domain

You MUST return a JSON object matching the exact structure requested.`;

  const userPrompt = `Analyze this business opportunity using ONLY relevant community data.

## OPPORTUNITY
- **Title**: ${opportunity.title}
- **Description**: ${opportunity.description}
- **Target Market**: ${opportunity.targetMarket}
- **Problem Statement**: ${opportunity.problemStatement}

## PRE-FILTERED COMMUNITY DATA (already filtered for relevance)

### Hacker News Stories (${hnData.stories.length} relevant):
${hnStoriesContext || 'No relevant HN stories found.'}

### Hacker News Comments (${hnData.comments.length} relevant):
${hnContext || 'No relevant HN comments found.'}

### Reddit Discussions (${redditData.length} relevant):
${redditContext || 'No Reddit discussions found.'}

### Web Forums, Quora & Blogs (${webData.length} results):
${webContext || 'No web forum results found.'}

---

${hasRealData
    ? `You have ${totalDataPoints} pre-filtered data points. Extract insights ONLY from items that are directly about "${opportunity.title}" or its specific problem domain. If a quote discusses an unrelated topic, SKIP IT entirely.`
    : `Very limited community data was found for this specific topic. This itself is a useful signal — it may indicate a niche market or untapped opportunity. Use your deep knowledge of "${opportunity.targetMarket}" and the specific problem of "${opportunity.problemStatement}" to provide research-quality insights. Be specific to THIS domain — do not provide generic business advice. Label all insights as "Industry Research" source.`
  }

Return a JSON object with this structure:
{
  "frustrationQuotes": [
    {
      "quote": "Exact quote from community data (or representative quote from industry knowledge)",
      "source": "HN/Reddit/Industry Research",
      "context": "How this specifically relates to ${opportunity.title}",
      "frustrationLevel": "mild|moderate|severe"
    }
  ],
  "painPointCategories": [
    {
      "category": "Category specific to ${opportunity.targetMarket}",
      "description": "What this pain point is about in context of ${opportunity.title}",
      "frequency": "rare|common|very_common",
      "specificExamples": ["Examples specific to this domain"],
      "currentWorkarounds": ["How people currently deal with this"]
    }
  ],
  "industryTrends": [
    {
      "trend": "Trend specific to this market",
      "direction": "growing|declining|stable",
      "relevance": "How this relates to ${opportunity.title}",
      "opportunity": "What opportunity this creates for this specific product"
    }
  ],
  "currentSolutionComplaints": [
    {
      "solution": "Name of actual competitor/alternative in this space",
      "complaints": ["Specific complaints about this solution"],
      "userSentiment": "negative|mixed|disappointed"
    }
  ],
  "marketGaps": [
    {
      "gap": "Gap specific to ${opportunity.targetMarket}",
      "evidence": "Evidence from the data or industry knowledge",
      "potentialValue": "low|medium|high"
    }
  ],
  "overallSentiment": {
    "score": 0-100,
    "summary": "2-3 sentence summary focused on ${opportunity.title}'s market landscape",
    "strongestFrustration": "The biggest frustration relevant to this specific product",
    "biggestOpportunity": "The biggest opportunity for this specific product"
  }
}

${hasRealData
    ? 'Generate insights based on the real data. Only include 3-8 frustration quotes that are ACTUALLY relevant.'
    : 'Generate 5-8 industry-knowledge-based insights. Be honest that these are research-based, not from live community data.'
  }`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-2024-08-06',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI analysis failed:', response.status, errorText);
    throw new Error(`OpenAI analysis failed: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in OpenAI response');

  return JSON.parse(content) as ResearchAnalysis;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      opportunityId,
      title,
      description,
      targetMarket,
      problemStatement,
      tags,
    } = await req.json();

    if (!opportunityId || !title) {
      return new Response(JSON.stringify({ error: 'Missing required fields: opportunityId, title' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const opportunity = { title, description, targetMarket, problemStatement, tags };

    console.log(`🔬 Starting research for: "${title}"`);

    // Step 1: AI-powered search planning
    console.log('🧠 Generating targeted search plan...');
    const searchPlan = await generateSearchPlan(opportunity, apiKey);
    console.log(`🔍 Search queries: ${searchPlan.queries.join(' | ')}`);
    console.log(`📌 Target subreddits: ${searchPlan.subreddits.join(', ')}`);
    console.log(`🏷️ Relevance keywords: ${searchPlan.keywords.join(', ')}`);

    // Step 2: Search all sources in parallel
    console.log('📡 Searching Hacker News, Reddit, web forums & multilingual sources...');

    const redditToken = await getRedditToken();

    const [hnData, redditData, webResults, multilingualData] = await Promise.all([
      searchHackerNews(searchPlan.hnQueries, 30),
      searchReddit(redditToken, searchPlan.queries, searchPlan.subreddits, 30),
      searchWebForums(searchPlan.webQueries, 15),
      searchMultilingual(searchPlan.localLanguageQueries, apiKey),
    ]);

    // If Reddit returned nothing, try a direct title-based search as fallback
    let finalRedditData = redditData;
    if (redditData.length === 0) {
      console.warn('⚠️ Reddit returned 0 results from planned queries — trying direct title search fallback');
      const titleWords = title.replace(/[^a-z0-9\s]/gi, '').trim();
      const fallbackQueries = [titleWords, ...titleWords.split(/\s+/).filter((w: string) => w.length > 4).slice(0, 2)];
      const fallbackReddit = await searchReddit(redditToken, fallbackQueries, searchPlan.subreddits.slice(0, 3), 15);
      if (fallbackReddit.length > 0) {
        console.log(`✅ Reddit fallback search found ${fallbackReddit.length} posts`);
        finalRedditData = fallbackReddit;
      }
    }

    // If HN returned nothing, try a simpler title-based search
    let finalHnData = hnData;
    if (hnData.stories.length === 0 && hnData.comments.length === 0) {
      console.warn('⚠️ HN returned 0 results from planned queries — trying direct title search fallback');
      const titleWords = title.replace(/[^a-z0-9\s]/gi, '').trim();
      const fallbackHn = await searchHackerNews([titleWords], 15);
      if (fallbackHn.stories.length > 0 || fallbackHn.comments.length > 0) {
        console.log(`✅ HN fallback search found ${fallbackHn.stories.length} stories, ${fallbackHn.comments.length} comments`);
        finalHnData = fallbackHn;
      }
    }

    // Merge multilingual HN results into main HN data
    const mergedHnStories = [...finalHnData.stories, ...multilingualData.stories];
    const mergedHnComments = [...finalHnData.comments, ...multilingualData.comments];
    // Deduplicate
    const uniqueStories = Array.from(new Map(mergedHnStories.map(s => [s.objectID, s])).values());
    const uniqueComments = Array.from(new Map(mergedHnComments.map(c => [c.objectID, c])).values());

    console.log(`📰 HN: ${uniqueStories.length} stories, ${uniqueComments.length} comments`);
    console.log(`💬 Reddit: ${finalRedditData.length} posts`);
    console.log(`🌐 Web forums: ${webResults.length} results`);
    console.log(`🌍 Multilingual: ${multilingualData.stories.length + multilingualData.comments.length} results`);

    // Step 3: AI-powered relevance filtering
    console.log('🎯 Filtering results for relevance...');
    const filtered = await filterForRelevance(
      opportunity, uniqueStories, uniqueComments, finalRedditData, searchPlan.keywords, apiKey
    );
    console.log(`✅ After relevance filter: ${filtered.stories.length} stories, ${filtered.comments.length} comments, ${filtered.posts.length} posts`);

    // Step 5: Deep AI Analysis on ONLY relevant data
    console.log('🧠 Running deep AI analysis on relevant data...');
    const analysis = await analyzeWithOpenAI(
      opportunity,
      { stories: filtered.stories, comments: filtered.comments },
      filtered.posts,
      webResults,
      apiKey
    );
    console.log(`✅ Analysis complete: ${analysis.frustrationQuotes.length} quotes, ${analysis.painPointCategories.length} categories`);

    // Step 6: Calculate research score
    const relevantDataCount = filtered.stories.length + filtered.comments.length + filtered.posts.length + webResults.length;
    const totalDataCount = uniqueStories.length + uniqueComments.length + finalRedditData.length + webResults.length;
    const relevanceRatio = totalDataCount > 0 ? relevantDataCount / totalDataCount : 0;

    // dataRichness only counts REAL community data, not AI-generated quotes/categories
    const dataRichness = Math.min(100,
      (filtered.stories.length * 4) +
      (filtered.comments.length * 3) +
      (filtered.posts.length * 6) +
      (webResults.length * 3)
    );
    const hasAnyRealData = relevantDataCount > 0;
    const rawResearchScore = Math.round(
      (analysis.overallSentiment.score * 0.5) +
      (dataRichness * 0.3) +
      (Math.min(100, analysis.marketGaps.length * 20) * 0.2)
    );
    // If zero real community data found, cap the score — AI-only insights are weak validation
    const researchScore = hasAnyRealData
      ? rawResearchScore
      : Math.min(10, Math.round(rawResearchScore * 0.15));

    // Step 7: Store results
    const researchResults = {
      analysis,
      hasRealCommunityData: hasAnyRealData,
      realDataCount: relevantDataCount,
      sources: {
        hackerNews: {
          storiesFound: filtered.stories.length,
          commentsFound: filtered.comments.length,
          totalSearched: finalHnData.stories.length + finalHnData.comments.length,
          topStories: filtered.stories.slice(0, 5).map(s => ({
            title: s.title,
            points: s.points,
            comments: s.numComments,
            url: s.url,
          })),
        },
        reddit: {
          postsFound: filtered.posts.length,
          totalSearched: finalRedditData.length,
          subredditsSearched: searchPlan.subreddits,
          hasApiAccess: !!redditToken,
          topPosts: filtered.posts.slice(0, 5).map(p => ({
            title: p.title,
            subreddit: p.subreddit,
            score: p.score,
            numComments: p.numComments,
            permalink: p.permalink,
          })),
        },
        webForums: {
          resultsFound: webResults.length,
          topResults: webResults.slice(0, 5).map(w => ({
            title: w.title,
            source: w.source,
            url: w.url,
          })),
        },
        relevanceFilter: {
          totalFetched: totalDataCount,
          relevantKept: relevantDataCount,
          relevanceRatio: Math.round(relevanceRatio * 100),
        },
      },
      researchScore,
      researchedAt: new Date().toISOString(),
    };

    // Update the validation workflow
    const { error: updateError } = await supabaseClient
      .from('validation_workflows')
      .update({
        reddit_validation_results: researchResults,
        last_signal_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('opportunity_id', opportunityId);

    if (updateError) {
      console.error('Failed to update validation workflow:', updateError);
    }

    // Store individual Reddit discussions
    if (filtered.posts.length > 0) {
      for (const post of filtered.posts.slice(0, 20)) {
        try {
          await supabaseClient
            .from('reddit_discussions')
            .upsert({
              opportunity_id: opportunityId,
              post_id: post.permalink.split('/')[4] || post.permalink,
              title: post.title,
              selftext: post.selftext,
              url: `https://reddit.com${post.permalink}`,
              author: post.author,
              subreddit: post.subreddit,
              score: post.score,
              num_comments: post.numComments,
              upvote_ratio: post.upvoteRatio,
              created_utc: post.createdUtc,
              permalink: post.permalink,
              top_comments: post.topComments,
              engagement_metrics: {
                score: post.score,
                num_comments: post.numComments,
                upvote_ratio: post.upvoteRatio,
              },
              relevance_score: Math.min(100, Math.round(post.score / 2 + post.numComments)),
              pain_points_extracted: analysis.frustrationQuotes
                .filter(q => q.source.toLowerCase().includes('reddit'))
                .map(q => q.quote)
                .slice(0, 5),
            }, {
              onConflict: 'post_id,opportunity_id',
            });
        } catch (e) {
          console.error('Reddit discussion insert error:', e);
        }
      }
    }

    console.log(`🎯 Research complete! Score: ${researchScore}/100, Relevance: ${Math.round(relevanceRatio * 100)}%`);

    return new Response(JSON.stringify({
      success: true,
      researchScore,
      analysis,
      sources: researchResults.sources,
      totalDataPoints: relevantDataCount,
      hasRealCommunityData: relevantDataCount > 0,
      realDataCount: relevantDataCount,
      diagnostics: {
        redditAuthAvailable: !!redditToken,
        rawCounts: {
          hnStories: uniqueStories.length,
          hnComments: uniqueComments.length,
          redditPosts: finalRedditData.length,
          webResults: webResults.length,
        },
        afterFilter: {
          stories: filtered.stories.length,
          comments: filtered.comments.length,
          posts: filtered.posts.length,
        },
        searchPlan: {
          queriesCount: searchPlan.queries.length,
          subredditsCount: searchPlan.subreddits.length,
          subreddits: searchPlan.subreddits,
        },
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Research error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Research failed',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
