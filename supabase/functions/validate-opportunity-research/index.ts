import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  RedditPost,
  searchReddit as searchRedditShared,
  generateRedditSearchPlan,
} from '../_shared/reddit-search.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TYPES
// ============================================================================

interface WebSearchResult {
  query: string;
  summary: string;
  citations: { title: string; url: string; snippet?: string }[];
}

interface AppStoreApp {
  name: string;
  rating: number;
  ratingCount: number;
  description: string;
  platform: 'ios' | 'android' | 'web';
  url: string;
  price?: string;
}

interface HackerNewsStory {
  title: string;
  points: number;
  numComments: number;
  url: string;
  storyText: string;
  objectID: string;
}

interface GoogleTrendsData {
  trend: 'up' | 'down' | 'stable';
  score: number;
  searchVolume: number;
  relatedQueries: string[];
  isRealData: boolean;
  trendHistory?: { date: string; value: number }[];
}

interface DuckDuckGoResult {
  title: string;
  url: string;
  snippet: string;
}

interface ResearchReport {
  // Evidence from web
  communityEvidence: WebSearchResult;
  competitorApps: AppStoreApp[];
  competitorEvidence: WebSearchResult;
  twitterEvidence: WebSearchResult;
  analogousMarkets: WebSearchResult;
  // New sources
  hackerNewsPosts: HackerNewsStory[];
  quoraForumResults: DuckDuckGoResult[];
  googleTrends: GoogleTrendsData | null;
  // Analysis
  demandSignals: string[];
  painPoints: string[];
  competitors: { name: string; description: string; gap: string }[];
  marketGaps: string[];
  risks: string[];
  // Scores
  dataQuality: 'rich' | 'moderate' | 'sparse';
  evidenceSources: string[];
  totalDataPoints: number;
  // Verdict
  opportunityScore: number;
  verdict: 'strong' | 'moderate' | 'weak' | 'insufficient_data';
  verdictReason: string;
  recommendation: string;
  // Report
  briefSummary: string;
  fullReport: string;
  researchedAt: string;
}

// ============================================================================
// STEP 1: WEB SEARCH VIA OPENAI RESPONSES API
// Uses GPT-4o with live web search — finds real citations from across the internet
// ============================================================================

async function webSearch(
  query: string,
  apiKey: string
): Promise<WebSearchResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        tools: [{ type: 'web_search_preview' }],
        input: query,
      }),
    });

    if (!response.ok) {
      console.warn(`Web search failed: ${response.status}`);
      return { query, summary: '', citations: [] };
    }

    const data = await response.json();
    const outputs = data.output || [];
    let text = '';
    const queriesRun: string[] = [];
    const citations: { title: string; url: string; snippet?: string }[] = [];

    for (const out of outputs) {
      if (out.type === 'message') {
        for (const c of out.content || []) {
          if (c.type === 'output_text') {
            text = c.text || '';
            for (const ann of c.annotations || []) {
              if (ann.type === 'url_citation') {
                citations.push({ title: ann.title || '', url: ann.url || '' });
              }
            }
          }
        }
      }
      if (out.type === 'web_search_call') {
        queriesRun.push(out.action?.query || '');
      }
    }

    console.log(`🔍 Search: "${queriesRun[0] || query}" → ${citations.length} citations`);
    return { query: queriesRun[0] || query, summary: text, citations };
  } catch (err) {
    console.error('Web search error:', err);
    return { query, summary: '', citations: [] };
  }
}

// ============================================================================
// STEP 2: APP STORE COMPETITOR RESEARCH (iTunes API - free, no key needed)
// ============================================================================

async function searchAppStore(
  opportunity: { title: string; targetMarket: string; description: string }
): Promise<AppStoreApp[]> {
  const apps: AppStoreApp[] = [];
  const seen = new Set<string>();

  // Build search terms from opportunity
  const words = opportunity.title.toLowerCase().split(' ').filter(w => w.length > 3);
  const searchTerms = [
    opportunity.title,
    words.slice(0, 3).join(' '),
    // Extract key domain terms
    opportunity.targetMarket.split(' ').slice(0, 3).join(' '),
  ];

  for (const term of searchTerms.slice(0, 2)) {
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=10&country=us`;
      const res = await fetch(url, { headers: { 'User-Agent': 'FounderLens/1.0' } });
      if (!res.ok) continue;

      const data = await res.json();
      for (const app of data.results || []) {
        if (seen.has(app.trackId)) continue;
        seen.add(app.trackId);
        apps.push({
          name: app.trackName,
          rating: app.averageUserRating || 0,
          ratingCount: app.userRatingCount || 0,
          description: (app.description || '').substring(0, 300),
          platform: 'ios',
          url: app.trackViewUrl || '',
          price: app.formattedPrice || 'Free',
        });
      }
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error('App Store search error:', e);
    }
  }

  return apps.sort((a, b) => b.ratingCount - a.ratingCount).slice(0, 8);
}

// ============================================================================
// STEP 3B: HACKERNEWS SEARCH (Algolia API — free, no key needed)
// ============================================================================

async function searchHackerNews(
  queries: string[],
  limit = 15
): Promise<HackerNewsStory[]> {
  const all: HackerNewsStory[] = [];
  const seen = new Set<string>();

  for (const query of queries.slice(0, 3)) {
    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=10`;
      const res = await fetch(url, { headers: { 'User-Agent': 'FounderLens/1.0' } });
      if (!res.ok) continue;

      const data = await res.json();
      for (const hit of data.hits || []) {
        if (seen.has(hit.objectID)) continue;
        seen.add(hit.objectID);
        all.push({
          title: hit.title || '',
          points: hit.points || 0,
          numComments: hit.num_comments || 0,
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          storyText: (hit.story_text || '').substring(0, 300),
          objectID: hit.objectID,
        });
      }
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.warn('HackerNews search error:', e);
    }
  }

  return all.sort((a, b) => b.points - a.points).slice(0, limit);
}

// ============================================================================
// STEP 3C: DUCKDUCKGO HTML SEARCH (Quora, StackOverflow, forums — no key)
// ============================================================================

async function searchDuckDuckGo(
  query: string,
  siteFilter = 'site:quora.com OR site:stackoverflow.com OR site:reddit.com'
): Promise<DuckDuckGoResult[]> {
  try {
    const fullQuery = `${query} ${siteFilter}`;
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(fullQuery)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return [];

    const html = await res.text();
    const results: DuckDuckGoResult[] = [];

    // Parse DuckDuckGo HTML results — extract links and snippets
    const resultBlocks = html.split('class="result__a"').slice(1);
    for (const block of resultBlocks.slice(0, 10)) {
      const hrefMatch = block.match(/href="([^"]+)"/);
      const titleMatch = block.match(/>([^<]+)</);
      // Snippet is in the next result__snippet element
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([^<]+)/);

      if (hrefMatch && titleMatch) {
        let href = hrefMatch[1];
        // DuckDuckGo wraps URLs — extract the actual URL
        const uddgMatch = href.match(/uddg=([^&]+)/);
        if (uddgMatch) href = decodeURIComponent(uddgMatch[1]);

        results.push({
          title: titleMatch[1].trim(),
          url: href,
          snippet: (snippetMatch?.[1] || '').trim(),
        });
      }
    }

    return results;
  } catch (e) {
    console.warn('DuckDuckGo search error:', e);
    return [];
  }
}

// ============================================================================
// STEP 3D: GOOGLE TRENDS (SerpAPI with AI fallback)
// ============================================================================

async function getGoogleTrends(
  title: string,
  targetMarket: string,
  apiKey: string
): Promise<GoogleTrendsData> {
  const serpApiKey = Deno.env.get('SERP_API_KEY');

  if (serpApiKey) {
    try {
      // Use shorter keyword for Google Trends (long titles return no data)
      const words = title.split(' ').filter((w: string) => w.length > 3);
      const keyword = words.slice(0, 3).join(' ') || title.split(' ').slice(0, 3).join(' ');
      const url = `https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(keyword)}&data_type=TIMESERIES&api_key=${serpApiKey}`;
      console.log(`📊 Google Trends: querying "${keyword}"...`);
      const res = await fetch(url);

      if (res.ok) {
        const data = await res.json();
        console.log(`📊 Google Trends response keys: ${Object.keys(data).join(', ')}`);
        const timelineData = data.interest_over_time?.timeline_data || [];
        const relatedQueries = data.related_queries?.top?.map((q: any) => q.query) ||
          data.related_queries?.rising?.map((q: any) => q.query) || [];

        if (timelineData.length > 0) {
          // Calculate trend direction from last 12 data points
          const recentData = timelineData.slice(-12);
          const firstHalf = recentData.slice(0, 6);
          const secondHalf = recentData.slice(6);

          const firstAvg = firstHalf.reduce((sum: number, item: any) => {
            const val = item.values?.[0]?.extracted_value ?? item.value ?? 0;
            return sum + val;
          }, 0) / (firstHalf.length || 1);
          const secondAvg = secondHalf.reduce((sum: number, item: any) => {
            const val = item.values?.[0]?.extracted_value ?? item.value ?? 0;
            return sum + val;
          }, 0) / (secondHalf.length || 1);

          const trend: 'up' | 'down' | 'stable' =
            secondAvg > firstAvg * 1.2 ? 'up' :
            secondAvg < firstAvg * 0.8 ? 'down' : 'stable';

          const latestValue = timelineData[timelineData.length - 1]?.values?.[0]?.extracted_value ??
            timelineData[timelineData.length - 1]?.value ?? 30;

          return {
            trend,
            score: latestValue,
            searchVolume: Math.round(latestValue * 500),
            relatedQueries: relatedQueries.slice(0, 5),
            isRealData: true,
            trendHistory: timelineData.map((item: any) => ({
              date: item.date || '',
              value: item.values?.[0]?.extracted_value ?? item.value ?? 0,
            })),
          };
        } else {
          // SerpAPI returned data but no timeline — still use related queries
          console.log(`📊 Google Trends: no timeline data, but got response`);
          return {
            trend: 'stable' as const,
            score: 40,
            searchVolume: 8000,
            relatedQueries: relatedQueries.slice(0, 5),
            isRealData: true,
            trendHistory: [],
          };
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`📊 Google Trends SerpAPI error ${res.status}: ${errText.slice(0, 200)}`);
      }
    } catch (e) {
      console.warn('SerpAPI Google Trends error:', e);
    }
  } else {
    console.log('📊 No SERP_API_KEY env var found');
  }

  // Fallback: return conservative static estimate (avoids extra OpenAI call that triggers rate limits)
  return {
    trend: 'stable',
    score: 40,
    searchVolume: 8000,
    relatedQueries: [`${title} alternative`, `best ${title.toLowerCase()}`],
    isRealData: false,
    trendHistory: [],
  };
}

// ============================================================================
// STEP 4: AI SEARCH PLANNING
// ============================================================================

async function generateSearchPlan(
  opportunity: { title: string; description: string; targetMarket: string; problemStatement: string; tags?: string[] },
  apiKey: string
): Promise<{ queries: string[]; subreddits: string[]; keywords: string[]; analogousMarkets: string[]; webSearchQueries: string[] }> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are an expert startup researcher. Return valid JSON only.' },
          { role: 'user', content: `Generate a research plan to validate this business opportunity. Think like a senior market researcher who has access to the entire internet.

OPPORTUNITY: "${opportunity.title}"
DESCRIPTION: ${opportunity.description}
TARGET MARKET: ${opportunity.targetMarket}
PROBLEM: ${opportunity.problemStatement}

CRITICAL: The Reddit queries are the MOST IMPORTANT part of this plan. Reddit is where real people discuss real frustrations. Generate queries that will find posts where people are:
1. Complaining about the EXACT problem this product solves
2. Asking for help or recommendations in this exact space
3. Sharing their frustrations with existing solutions
4. Discussing workarounds they currently use

Use the EXACT words and phrases that real users would type — NOT startup jargon.

Return JSON:
{
  "queries": ["8 specific Reddit search queries — use natural language like 'meal planning after baby', 'struggling with X', 'need help with Y', 'best app for Z'. Include problem-focused AND solution-seeking queries"],
  "subreddits": ["12 subreddits WHERE THE TARGET USERS actually hang out — think about where these specific people would post (parenting subs, health subs, hobby subs, location subs, etc). NOT r/entrepreneur or r/startups unless the product is literally for entrepreneurs"],
  "keywords": ["10 relevance keywords specific to this topic"],
  "analogousMarkets": ["3-4 analogous communities or markets that have solved a similar problem — e.g. for Ethiopian diaspora networking, think Nigerian diaspora, Indian diaspora, Jewish professional networks"],
  "webSearchQueries": [
    "query to find community pain points on forums/blogs/Twitter",
    "query to find existing competitor apps and platforms",
    "query to find news articles about this market",
    "query to find Quora/Reddit discussions about the problem"
  ]
}` },
        ],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return JSON.parse(data.choices[0].message.content);
    }
  } catch (e) {
    console.error('Search plan error:', e);
  }

  // Fallback
  return {
    queries: [opportunity.title, `${opportunity.targetMarket} problems`, `${opportunity.title} alternative`],
    subreddits: ['Entrepreneur', 'startups', 'smallbusiness'],
    keywords: opportunity.title.toLowerCase().split(' ').filter(w => w.length > 3),
    analogousMarkets: [],
    webSearchQueries: [
      `${opportunity.title} community discussion complaints`,
      `${opportunity.title} competitor apps reviews`,
    ],
  };
}

// ============================================================================
// STEP 5: DEEP AI SYNTHESIS — Acts as a startup researcher
// ============================================================================

async function synthesizeResearch(
  opportunity: { title: string; description: string; targetMarket: string; problemStatement: string },
  data: {
    redditPosts: any[];
    redditWebSearch: WebSearchResult;
    communityEvidence: WebSearchResult;
    competitorApps: AppStoreApp[];
    competitorEvidence: WebSearchResult;
    twitterEvidence: WebSearchResult;
    analogousMarkets: WebSearchResult;
    hackerNewsPosts: HackerNewsStory[];
    quoraForumResults: DuckDuckGoResult[];
    googleTrends: GoogleTrendsData | null;
    plan: { analogousMarkets: string[] };
  },
  apiKey: string
): Promise<ResearchReport> {
  const totalDataPoints = data.redditPosts.length + data.redditWebSearch.citations.length + data.communityEvidence.citations.length + data.competitorApps.length + data.competitorEvidence.citations.length + data.twitterEvidence.citations.length + data.analogousMarkets.citations.length + data.hackerNewsPosts.length + data.quoraForumResults.length;

  const dataQuality: 'rich' | 'moderate' | 'sparse' = totalDataPoints >= 20 ? 'rich' : totalDataPoints >= 8 ? 'moderate' : 'sparse';

  // Build context for the AI — Reddit is the primary signal
  const redditContext = data.redditPosts.slice(0, 12).map((p, i) =>
    `[Reddit ${i + 1}] r/${p.subreddit} | ${p.score}pts | "${p.title}"\n${p.selftext.slice(0, 250)}`
  ).join('\n\n');

  // Reddit web search summary (from OpenAI web search with site:reddit.com)
  const redditWebContext = data.redditWebSearch.summary
    ? `\n\nREDDIT WEB SEARCH FINDINGS:\n${data.redditWebSearch.summary.slice(0, 800)}`
    : '';

  // HackerNews context
  const hnContext = data.hackerNewsPosts.length > 0
    ? `HACKERNEWS DISCUSSIONS (${data.hackerNewsPosts.length} stories):\n${data.hackerNewsPosts.slice(0, 5).map((s, i) => `[HN ${i + 1}] ${s.title} (${s.points}pts, ${s.numComments} comments) — ${s.url}`).join('\n')}`
    : '';

  // Quora/forum context
  const quoraContext = data.quoraForumResults.length > 0
    ? `QUORA & FORUM DISCUSSIONS (${data.quoraForumResults.length} results):\n${data.quoraForumResults.slice(0, 5).map((r, i) => `[Forum ${i + 1}] "${r.title}" — ${r.snippet.slice(0, 150)}\n  ${r.url}`).join('\n')}`
    : '';

  // Google Trends context
  const trendsContext = data.googleTrends
    ? `GOOGLE TRENDS (${data.googleTrends.isRealData ? 'REAL API DATA' : 'AI ESTIMATED'}):\n- Search Interest: ${data.googleTrends.score}/100\n- Trend Direction: ${data.googleTrends.trend}\n- Estimated Monthly Search Volume: ${data.googleTrends.searchVolume}\n- Related Queries: ${data.googleTrends.relatedQueries.join(', ')}`
    : '';

  const webContext = [
    data.communityEvidence.summary ? `COMMUNITY EVIDENCE:\n${data.communityEvidence.summary.slice(0, 600)}` : '',
    data.competitorEvidence.summary ? `COMPETITOR LANDSCAPE:\n${data.competitorEvidence.summary.slice(0, 600)}` : '',
    data.twitterEvidence.summary ? `TWITTER/SOCIAL EVIDENCE:\n${data.twitterEvidence.summary.slice(0, 400)}` : '',
    data.analogousMarkets.summary ? `ANALOGOUS MARKETS:\n${data.analogousMarkets.summary.slice(0, 600)}` : '',
    hnContext,
    quoraContext,
    trendsContext,
  ].filter(Boolean).join('\n\n');

  const appContext = data.competitorApps.length > 0
    ? `COMPETITOR APPS FOUND:\n${data.competitorApps.slice(0, 6).map(a => `- ${a.name} (${a.rating}★, ${a.ratingCount} ratings): ${a.description.slice(0, 150)}`).join('\n')}`
    : 'No direct competitor apps found on App Store.';

  // Clean, deduplicate and filter citations
  function cleanCitation(c: { title: string; url: string }): { title: string; url: string } {
    // Remove UTM tracking params added by OpenAI web search
    let url = c.url;
    try {
      const u = new URL(url);
      u.searchParams.delete('utm_source');
      u.searchParams.delete('utm_medium');
      u.searchParams.delete('utm_campaign');
      url = u.toString();
    } catch { /* keep original */ }
    return { title: c.title, url };
  }

  const rawCitations = [
    ...data.redditWebSearch.citations,
    ...data.communityEvidence.citations,
    ...data.competitorEvidence.citations,
    ...data.twitterEvidence.citations,
    ...data.analogousMarkets.citations,
  ].map(cleanCitation);

  // Deduplicate by URL and filter out clearly irrelevant generic sites
  const seenUrls = new Set<string>();
  const allCitations = rawCitations.filter(c => {
    if (!c.url || seenUrls.has(c.url)) return false;
    seenUrls.add(c.url);
    return true;
  }).slice(0, 15);

  const citationContext = allCitations.map((c, i) => `[${i + 1}] ${c.title} — ${c.url}`).join('\n');

  const thinDataProtocol = dataQuality === 'sparse' ? `

THIN DATA PROTOCOL (data quality is sparse — this niche has limited direct community data):
You MUST:
1. Heavily leverage analogous market evidence to fill gaps
2. For each finding, explicitly label whether it comes from "Community Data" or "AI Research (analogous to [market])"
3. In the briefSummary, note that evidence is primarily from analogous markets
4. In the fullReport, add a "## Data Confidence" section explaining what was directly observed vs inferred from analogous markets
5. Do NOT penalize niche markets just because they have less Reddit discussion — thin data in a niche can indicate an underserved market opportunity
` : '';

  const systemPrompt = `You are a senior startup researcher and market analyst hired to validate a business idea. You have access to:
- Real community discussions from Reddit and HackerNews
- Quora answers and forum threads
- Live web search results with citations
- App Store competitor data
- Google Trends search interest data
- Analogous market research
- Twitter/X social sentiment

Your job is to produce a thorough, honest validation report. You MUST:
1. Cite real sources when they exist (use [N] citation format)
2. Use analogous market evidence when direct evidence is sparse
3. Be brutally honest about gaps and risks
4. Give a clear go/no-go recommendation with reasoning
5. Distinguish between "no data found" (likely underserved niche) vs "data shows no demand"
6. Think like a VC associate — what would make you excited or concerned about this?
7. Reference Google Trends data to indicate whether search demand is growing, stable, or declining
${thinDataProtocol}
Return valid JSON only.`;

  const userPrompt = `Validate this business opportunity as a senior startup researcher:

## OPPORTUNITY
Title: "${opportunity.title}"
Description: ${opportunity.description}
Target Market: ${opportunity.targetMarket}
Problem: ${opportunity.problemStatement}

## EVIDENCE GATHERED (${totalDataPoints} total data points, quality: ${dataQuality})

### PRIMARY SOURCE — REDDIT (most important signal)
Reddit is where real users discuss real frustrations. This is the strongest validation signal.
${redditPosts_context(data.redditPosts)}

### SECONDARY SOURCES
${webContext}

${appContext}

## SOURCES FOUND
${citationContext || 'No direct citations found — using AI domain knowledge and analogous market research'}

---

Provide a comprehensive startup research report. JSON format:
{
  "demandSignals": ["up to 6 specific demand signals — cite sources with [N] when available. Include analogous market evidence if direct evidence is sparse"],
  "painPoints": ["up to 6 specific pain points from direct evidence OR analogous communities. Label source: [Reddit], [Web], [Analogous: Nigerian diaspora], [AI Research], etc."],
  "competitors": [
    { "name": "competitor name", "description": "what they do", "gap": "what they're missing that your product could solve" }
  ],
  "marketGaps": ["up to 5 specific unmet needs or gaps in the current market"],
  "risks": ["up to 4 honest risks or concerns about this opportunity"],
  "opportunityScore": 0,
  "verdict": "strong|moderate|weak|insufficient_data",
  "verdictReason": "2-3 sentences explaining the verdict",
  "recommendation": "Specific, actionable go/no-go recommendation with next steps",
  "briefSummary": "3-4 sentences: what is this market, what evidence exists, what is the opportunity? Written for the founder to quickly understand the finding.",
  "fullReport": "Full markdown research report with sections: ## Market Overview, ## Evidence of Demand, ## Competitive Landscape, ## Analogous Markets, ## Key Risks, ## Recommendation. Include citations [N] where available. Min 400 words. Be specific, not generic.",
  "evidenceSources": ["list of source types used: Reddit, Web Search, App Store, Analogous Markets, AI Research"],
  "dataQuality": "${dataQuality}"
}

opportunityScore: CRITICAL — Score each opportunity based on actual evidence strength. Do NOT default to 65.

SCORING (calculate step by step — Reddit is THE primary signal):
Step 1 — Reddit evidence (MOST IMPORTANT — 50% of score):
  0 relevant posts = start at 20. This means users aren't actively frustrated about this problem.
  1-3 posts = 35. Minimal signal.
  4-10 posts with real frustration = 50. Solid signal.
  10-20 posts across multiple subreddits = 65. Strong demand signal.
  20+ posts with high engagement (50+ upvotes) = 75. Very strong.
Step 2 — Quality of Reddit posts: Posts with 50+ upvotes where users describe specific pain = +10. Generic low-engagement posts = +0.
Step 3 — Web search + competitor evidence: citations directly about this problem = +5. Good competitor gaps = +5.
Step 4 — Analogous market strength: strong analogous evidence = +10. Weak = +0.
Step 5 — Problem urgency: Daily/weekly pain? = +5. Nice-to-have? = +0.

EXAMPLES to calibrate:
- Postpartum nutrition app: Reddit r/beyondthebump has 50+ posts about meal struggles. Multiple apps but none tailored. Score: 72.
- Ethiopian diaspora networking: No Reddit posts, but analogous markets (Nigerian diaspora apps exist, thriving). 6 competitor apps found. Score: 52.  
- Generic SaaS dashboard: Crowded market, 20+ competitors, no clear differentiation evidence. Score: 35.
- Completely novel idea with no data anywhere: Score: 28.

Each opportunity MUST receive a score reflecting ITS specific evidence. Scores MUST vary significantly across different opportunities.`;

  function redditPosts_context(posts: any[]): string {
    const postsBlock = posts.length === 0
      ? 'No direct Reddit API posts found.'
      : `REDDIT POSTS (${posts.length} found — this is the strongest validation signal):\n${posts.slice(0, 12).map((p, i) => `[Reddit ${i + 1}] r/${p.subreddit} (${p.score} upvotes): "${p.title}"\n${p.selftext.slice(0, 250)}`).join('\n\n')}`;
    return `${postsBlock}${redditWebContext}`;
  }

  try {
    // Wait a moment before synthesis to let rate limits recover from web searches
    await new Promise(r => setTimeout(r, 2000));

    // Retry up to 2 times on rate limit (429) errors
    let res: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          temperature: 0.2,
          max_tokens: 4000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (res.ok || res.status !== 429) break;
      console.warn(`⚠️ Synthesis rate limited (attempt ${attempt + 1}/3), waiting...`);
      await new Promise(r => setTimeout(r, (attempt + 1) * 3000));
    }

    if (!res || !res.ok) throw new Error(`OpenAI synthesis failed: ${res?.status}`);
    const result = await res.json();
    const report = JSON.parse(result.choices[0].message.content);

    // ── Deterministic score calculation ─────────────────────────────────────
    // GPT tends to anchor at 65. We compute a formula-based score from the
    // actual evidence counts and use it to VALIDATE or CORRECT GPT's score.
    function computeEvidenceScore(): number {
      let score = 30; // baseline

      // Reddit evidence (direct posts + web search citations)
      const redditCount = data.redditPosts.length;
      const redditWebCits = data.redditWebSearch.citations.filter((c: any) => c.url?.includes('reddit.com')).length;
      const redditTotal = Math.max(redditCount, redditWebCits);
      if (redditTotal === 0) score += 0;
      else if (redditTotal <= 3) score += 8;
      else if (redditTotal <= 10) score += 15;
      else if (redditTotal <= 20) score += 20;
      else score += 25;

      // Web search quality — community citations about this specific topic
      const webCits = data.communityEvidence.citations.length + data.twitterEvidence.citations.length;
      if (webCits === 0) score -= 5;
      else if (webCits >= 4) score += 10;
      else score += 5;

      // Competitor apps — presence means validated demand, absence means gap
      const appCount = data.competitorApps.length;
      if (appCount === 0) score += 15; // untapped gap
      else if (appCount <= 3) score += 8;  // some competition, room to differentiate
      else score += 5; // crowded, need strong differentiation

      // Analogous market citations
      const analogousCits = data.analogousMarkets.citations.length;
      if (analogousCits >= 4) score += 15;
      else if (analogousCits >= 1) score += 8;

      // Competitor evidence (people researching alternatives = validated pain)
      const compCits = data.competitorEvidence.citations.length;
      if (compCits >= 3) score += 8;
      else if (compCits >= 1) score += 4;

      // HackerNews discussions
      const hnCount = data.hackerNewsPosts.length;
      if (hnCount >= 5) score += 8;
      else if (hnCount >= 1) score += 4;

      // Quora/forum results
      const quoraCount = data.quoraForumResults.length;
      if (quoraCount >= 5) score += 6;
      else if (quoraCount >= 1) score += 3;

      // Google Trends
      if (data.googleTrends) {
        if (data.googleTrends.trend === 'up' && data.googleTrends.score > 60) score += 8;
        else if (data.googleTrends.trend === 'stable' && data.googleTrends.score > 40) score += 4;
        else if (data.googleTrends.trend === 'down') score -= 5;
      }

      return Math.min(95, Math.max(15, score));
    }

    const evidenceScore = computeEvidenceScore();
    const gptScore = Math.min(100, Math.max(0, report.opportunityScore || 0));

    // If GPT score is suspiciously close to 65 (±5), use evidence score instead
    // Otherwise blend: 60% GPT insight + 40% evidence formula
    const isGptDefaulting = Math.abs(gptScore - 65) <= 5 && gptScore !== 0;
    const finalScore = isGptDefaulting
      ? evidenceScore
      : Math.round(gptScore * 0.6 + evidenceScore * 0.4);

    // ─────────────────────────────────────────────────────────────────────────

    return {
      communityEvidence: data.communityEvidence,
      competitorApps: data.competitorApps,
      competitorEvidence: data.competitorEvidence,
      twitterEvidence: data.twitterEvidence,
      analogousMarkets: data.analogousMarkets,
      hackerNewsPosts: data.hackerNewsPosts,
      quoraForumResults: data.quoraForumResults,
      googleTrends: data.googleTrends,
      demandSignals: report.demandSignals || [],
      painPoints: report.painPoints || [],
      competitors: report.competitors || [],
      marketGaps: report.marketGaps || [],
      risks: report.risks || [],
      dataQuality,
      evidenceSources: report.evidenceSources || [],
      totalDataPoints,
      opportunityScore: finalScore,
      verdict: finalScore >= 70 ? 'strong' : finalScore >= 45 ? 'moderate' : finalScore >= 25 ? 'weak' : 'insufficient_data',
      verdictReason: report.verdictReason || '',
      recommendation: report.recommendation || '',
      briefSummary: report.briefSummary || '',
      fullReport: report.fullReport || '',
      researchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Synthesis error:', err);
    throw err;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const {
      opportunityId,
      title,
      description,
      targetMarket,
      problemStatement,
      tags,
      subreddits: clientSubreddits = [],
      queries: clientQueries = [],
    } = await req.json();

    if (!opportunityId || !title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const opportunity = { title, description, targetMarket, problemStatement, tags };

    console.log(`\n🔬 FounderLens Research Engine v2 — "${title}"`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Step 1: Generate research plans
    console.log('📋 Step 1: Generating research plans...');
    const [plan, redditPlan] = await Promise.all([
      generateSearchPlan(opportunity, apiKey),
      generateRedditSearchPlan(
        { title, description, target_market: targetMarket, opportunity_tags: tags },
        apiKey
      ),
    ]);
    console.log(`   General plan — Queries: ${plan.queries.slice(0, 3).join(' | ')}`);
    console.log(`   Analogous markets: ${plan.analogousMarkets.join(', ')}`);
    console.log(`   Reddit plan — Queries: ${redditPlan.queries.slice(0, 3).join(' | ')}`);
    console.log(`   Reddit keywords: ${redditPlan.keywords.slice(0, 5).join(', ')}`);

    // Merge client queries with AI plan (for non-Reddit searches)
    const subreddits = [...new Set([...redditPlan.subreddits, ...plan.subreddits, ...clientSubreddits])].slice(0, 10);
    const queries = clientQueries.length > 0
      ? [...new Set([...clientQueries, ...plan.queries])].slice(0, 10)
      : plan.queries;

    // Reddit-specific queries and keywords from the dedicated Reddit plan
    const redditQueries = clientQueries.length > 0
      ? [...new Set([...clientQueries, ...redditPlan.queries])].slice(0, 10)
      : redditPlan.queries;
    const redditKeywords = redditPlan.keywords;

    // Step 2: Search all sources
    // Batch 1: Non-OpenAI sources in parallel
    console.log('\n📡 Step 2a: Searching APIs in parallel...');
    const [rawRedditPosts, competitorApps, hackerNewsPosts, quoraForumResults, googleTrendsData] = await Promise.all([
      searchRedditShared(redditQueries, redditKeywords, 25, subreddits).then(posts => {
        console.log(`   ✓ Reddit (OAuth/PullPush): ${posts.length} posts`);
        return posts;
      }),
      searchAppStore(opportunity).then(apps => {
        console.log(`   ✓ App Store: ${apps.length} competitor apps`);
        return apps;
      }),
      searchHackerNews(queries, 15).then(stories => {
        console.log(`   ✓ HackerNews: ${stories.length} stories`);
        return stories;
      }),
      searchDuckDuckGo(
        `${title} ${targetMarket} ${problemStatement.split('.')[0]}`,
      ).then(results => {
        console.log(`   ✓ Quora/forums: ${results.length} results`);
        return results;
      }),
      getGoogleTrends(title, targetMarket, apiKey).then(trends => {
        console.log(`   ✓ Google Trends: ${trends.trend} (score: ${trends.score}, ${trends.isRealData ? 'real data' : 'AI estimated'})`);
        return trends;
      }),
    ]);

    // Map RedditPost (from shared module) to the simple format used by synthesis
    const redditPosts = rawRedditPosts.map(p => ({
      title: p.title,
      subreddit: p.subreddit,
      score: p.score,
      selftext: p.selftext,
      permalink: p.permalink,
      topComments: p.top_comments.map(c => c.body),
    }));
    console.log(`   📬 Reddit: ${redditPosts.length} relevant posts from OAuth/PullPush`);

    // Batch 2: OpenAI web searches (sequential to avoid 429 rate limits)
    console.log('\n📡 Step 2b: Running OpenAI web searches (sequential)...');
    const problemShort = problemStatement.split('.')[0].slice(0, 80);

    // Only run Reddit web search as fallback if OAuth/PullPush found very few posts
    let redditWebSearch: WebSearchResult = { query: '', summary: '', citations: [] };
    if (redditPosts.length < 5) {
      console.log(`   📌 Reddit API found only ${redditPosts.length} posts — supplementing with web search...`);
      const rq = `Search Reddit for posts about: ${redditQueries[0] || title}. Find Reddit threads where people discuss ${problemShort}. Only return Reddit.com URLs.`;
      redditWebSearch = await webSearch(rq, apiKey);
      // Extract any Reddit URLs from web search into redditPosts
      const seenUrls = new Set(redditPosts.map(p => p.permalink));
      for (const cite of redditWebSearch.citations) {
        if (cite.url?.includes('reddit.com') && !seenUrls.has(cite.url)) {
          seenUrls.add(cite.url);
          const subMatch = cite.url.match(/reddit\.com\/r\/([^\/]+)/);
          redditPosts.push({
            title: cite.title || '',
            subreddit: subMatch?.[1] || 'unknown',
            score: 10,
            selftext: cite.snippet || '',
            permalink: cite.url,
            topComments: [],
          });
        }
      }
      console.log(`   ✓ Reddit web search fallback: ${redditWebSearch.citations.length} citations, now ${redditPosts.length} total posts`);
      await new Promise(r => setTimeout(r, 1500));
    }

    const communityEvidence = await webSearch(
      `${targetMarket} "${problemShort}" community discussions complaints frustrations forum Quora`,
      apiKey
    );
    console.log(`   ✓ Community + social web search: ${communityEvidence.citations.length} citations`);

    await new Promise(r => setTimeout(r, 1500));

    const competitorEvidence = await webSearch(
      `${title} app review complaints alternatives "${targetMarket}"`,
      apiKey
    );
    console.log(`   ✓ Competitor web search: ${competitorEvidence.citations.length} citations`);

    // Twitter evidence is now merged into communityEvidence above
    const twitterEvidence: WebSearchResult = { query: '', summary: '', citations: [] };

    await new Promise(r => setTimeout(r, 1500));

    const analogousMarketsEvidence = plan.analogousMarkets.length > 0
      ? await webSearch(
          `${plan.analogousMarkets.join(', ')} community platform solutions demand "${title}"`,
          apiKey
        ).then(r => { console.log(`   ✓ Analogous markets: ${r.citations.length} citations (${plan.analogousMarkets.join(', ')})`); return r; })
      : { query: '', summary: '', citations: [] } as WebSearchResult;

    // Step 3: Deep AI synthesis
    console.log('\n🧠 Step 3: AI synthesis — acting as startup researcher...');
    const report = await synthesizeResearch(
      opportunity,
      { redditPosts, redditWebSearch, communityEvidence, competitorApps, competitorEvidence, twitterEvidence, analogousMarkets: analogousMarketsEvidence, hackerNewsPosts, quoraForumResults, googleTrends: googleTrendsData, plan },
      apiKey
    );

    console.log(`\n✅ Research complete!`);
    console.log(`   Score: ${report.opportunityScore}/100 (${report.verdict})`);
    console.log(`   Data points: ${report.totalDataPoints} (${report.dataQuality} quality)`);
    console.log(`   Sources: ${report.evidenceSources.join(', ')}`);

    // Step 4: Persist to Supabase
    const researchResults = {
      analysis: {
        frustrationQuotes: report.painPoints.map(p => ({ quote: p, source: 'Research', context: '', frustrationLevel: 'moderate' })),
        painPointCategories: report.painPoints.map(p => ({ category: p, description: '', frequency: 'common', specificExamples: [], currentWorkarounds: [] })),
        industryTrends: [],
        currentSolutionComplaints: report.competitors.map(c => ({ solution: c.name, complaints: [c.gap], userSentiment: 'mixed' })),
        marketGaps: report.marketGaps.map(g => ({ gap: g, evidence: '', potentialValue: 'high' })),
        overallSentiment: {
          score: report.opportunityScore,
          summary: report.briefSummary,
          strongestFrustration: report.painPoints[0] || '',
          biggestOpportunity: report.marketGaps[0] || '',
        },
      },
      sources: {
        reddit: { postsFound: redditPosts.length, webSearchCitations: redditWebSearch.citations.length, topPosts: redditPosts.slice(0, 8).map(p => ({ title: p.title, subreddit: p.subreddit, score: p.score, permalink: p.permalink })) },
        webSearch: { communityResults: communityEvidence.citations.length, competitorResults: competitorEvidence.citations.length, twitterResults: twitterEvidence.citations.length },
        appStore: { appsFound: competitorApps.length },
        analogousMarkets: { results: analogousMarketsEvidence.citations.length, markets: plan.analogousMarkets },
        hackerNews: { storiesFound: hackerNewsPosts.length, topStories: hackerNewsPosts.slice(0, 5).map(s => ({ title: s.title, points: s.points, numComments: s.numComments, url: s.url })) },
        quoraForums: { resultsFound: quoraForumResults.length },
        googleTrends: googleTrendsData,
      },
      researchScore: report.opportunityScore,
      opportunityScore: report.opportunityScore,  // stored twice for compatibility
      totalDataPoints: report.totalDataPoints,
      dataQuality: report.dataQuality,
      verdict: report.verdict,
      verdictReason: report.verdictReason,
      recommendation: report.recommendation,
      briefSummary: report.briefSummary,
      fullReport: report.fullReport,
      competitors: report.competitors,
      demandSignals: report.demandSignals,
      risks: report.risks,
      hasRealCommunityData: report.totalDataPoints > 5,
      realDataCount: report.totalDataPoints,
      researchedAt: report.researchedAt,
      // ── Persistence fix: fields needed to restore full report on reload ──
      painPoints: report.painPoints,
      competitorApps: competitorApps.slice(0, 8),
      analogousMarkets: plan.analogousMarkets,   // string[] — market names
      marketGaps: report.marketGaps,             // string[] — flat gap strings
      evidenceSources: report.evidenceSources,
      googleTrends: googleTrendsData,
      hackerNewsPosts: hackerNewsPosts.slice(0, 8),
      quoraForumResults: quoraForumResults.slice(0, 8),
      webCitations: [
        ...communityEvidence.citations,
        ...competitorEvidence.citations,
        ...twitterEvidence.citations,
        ...analogousMarketsEvidence.citations,
      ]
        .map(c => {
          let url = c.url || '';
          try {
            const u = new URL(url);
            u.searchParams.delete('utm_source');
            u.searchParams.delete('utm_medium');
            u.searchParams.delete('utm_campaign');
            url = u.toString();
          } catch { /* keep original */ }
          return { title: c.title, url };
        })
        .filter((c, i, arr) => c.url && arr.findIndex(x => x.url === c.url) === i)
        .slice(0, 15),
    };

    await supabaseClient
      .from('validation_workflows')
      .update({
        reddit_validation_results: researchResults,
        last_signal_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        composite_score: report.opportunityScore,
        status: report.opportunityScore >= 70 ? 'ready_to_build' : report.opportunityScore >= 40 ? 'needs_focused_tasks' : 'needs_validation',
      })
      .eq('opportunity_id', opportunityId);

    // ── Post-launch webhook: ping CEO agent with new research signals ─────────
    // Fires asynchronously (best-effort). If the opportunity has an AI company
    // launched on build.founderlens.io, the CEO gets a briefing issue + heartbeat.
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    fetch(`${supabaseUrl}/functions/v1/notify-ceo-new-signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        opportunityId,
        researchSummary: report.briefSummary,
      }),
    }).then(r => {
      if (r.ok) r.json().then(d => {
        if (d.skipped) console.log(`CEO webhook skipped: ${d.reason}`);
        else console.log(`CEO notified: issue=${d.briefingIssueId}, heartbeat=${d.heartbeatTriggered}`);
      });
    }).catch(e => console.warn('CEO webhook failed (non-fatal):', e.message));
    // ─────────────────────────────────────────────────────────────────────────

    return new Response(JSON.stringify({
      success: true,
      researchScore: report.opportunityScore,
      analysis: researchResults.analysis,
      sources: researchResults.sources,
      totalDataPoints: report.totalDataPoints,
      hasRealCommunityData: researchResults.hasRealCommunityData,
      realDataCount: report.totalDataPoints,
      dataQuality: report.dataQuality,
      verdict: report.verdict,
      verdictReason: report.verdictReason,
      recommendation: report.recommendation,
      briefSummary: report.briefSummary,
      fullReport: report.fullReport,
      demandSignals: report.demandSignals,
      painPoints: report.painPoints,
      competitors: report.competitors,
      marketGaps: report.marketGaps,
      risks: report.risks,
      competitorApps: competitorApps.slice(0, 6),
      analogousMarkets: plan.analogousMarkets,
      googleTrends: googleTrendsData,
      hackerNewsPosts: hackerNewsPosts.slice(0, 5),
      quoraForumResults: quoraForumResults.slice(0, 5),
      webCitations: [...redditWebSearch.citations, ...communityEvidence.citations, ...competitorEvidence.citations, ...analogousMarketsEvidence.citations]
        .map(c => {
          let url = c.url || '';
          try { const u = new URL(url); u.searchParams.delete('utm_source'); u.searchParams.delete('utm_medium'); u.searchParams.delete('utm_campaign'); url = u.toString(); } catch {}
          return { title: c.title, url };
        })
        .filter((c, i, arr) => c.url && arr.findIndex(x => x.url === c.url) === i) // dedup
        .slice(0, 12),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('💥 Research engine error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || 'Research failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
