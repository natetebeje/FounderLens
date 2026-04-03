import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

interface ResearchReport {
  // Evidence from web
  communityEvidence: WebSearchResult;
  competitorApps: AppStoreApp[];
  competitorEvidence: WebSearchResult;
  twitterEvidence: WebSearchResult;
  analogousMarkets: WebSearchResult;
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
// STEP 3: REDDIT SEARCH (PullPush - two-pass strategy)
// ============================================================================

async function searchReddit(
  queries: string[],
  subreddits: string[],
  limit = 25
): Promise<{ title: string; subreddit: string; score: number; selftext: string; permalink: string; topComments: string[] }[]> {
  const all: any[] = [];
  const targetSubSet = new Set(subreddits.map(s => s.toLowerCase()));

  // Pass 1: global topic search
  for (const query of queries.slice(0, 5)) {
    try {
      const url = new URL('https://api.pullpush.io/reddit/search/submission/');
      url.searchParams.set('q', query);
      url.searchParams.set('size', '20');
      url.searchParams.set('score', '>0');
      const res = await fetch(url.toString(), { headers: { 'User-Agent': 'FounderLens/1.0' } });
      if (!res.ok) continue;
      const data = await res.json();
      for (const p of data?.data ?? []) {
        if (!p.title) continue;
        all.push({ title: p.title, subreddit: p.subreddit || 'unknown', score: p.score || 0, selftext: (p.selftext || '').substring(0, 500), permalink: p.permalink ? `https://reddit.com${p.permalink}` : '', topComments: [] });
      }
      await new Promise(r => setTimeout(r, 300));
    } catch { /* ignore */ }
  }

  // Pass 2: subreddit-scoped
  for (const sub of subreddits.slice(0, 4)) {
    try {
      const url = new URL('https://api.pullpush.io/reddit/search/submission/');
      url.searchParams.set('q', queries[0] || '');
      url.searchParams.set('subreddit', sub);
      url.searchParams.set('size', '10');
      url.searchParams.set('score', '>0');
      const res = await fetch(url.toString(), { headers: { 'User-Agent': 'FounderLens/1.0' } });
      if (!res.ok) continue;
      const data = await res.json();
      for (const p of data?.data ?? []) {
        if (!p.title) continue;
        all.push({ title: p.title, subreddit: p.subreddit || sub, score: p.score || 0, selftext: (p.selftext || '').substring(0, 500), permalink: p.permalink ? `https://reddit.com${p.permalink}` : '', topComments: [] });
      }
      await new Promise(r => setTimeout(r, 300));
    } catch { /* ignore */ }
  }

  // Dedup + rank target subs first
  const seen = new Map<string, any>();
  for (const p of all) { const key = p.permalink || p.title; if (!seen.has(key)) seen.set(key, p); }
  const unique = [...seen.values()];
  unique.sort((a, b) => {
    const aIn = targetSubSet.has(a.subreddit.toLowerCase()) ? 1 : 0;
    const bIn = targetSubSet.has(b.subreddit.toLowerCase()) ? 1 : 0;
    if (aIn !== bIn) return bIn - aIn;
    return b.score - a.score;
  });
  return unique.slice(0, limit);
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

Return JSON:
{
  "queries": ["6 specific Reddit/community search queries using TARGET USERS language, not startup jargon"],
  "subreddits": ["10 subreddits WHERE THE TARGET USERS actually hang out (not r/entrepreneur unless the product is for entrepreneurs)"],
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
    communityEvidence: WebSearchResult;
    competitorApps: AppStoreApp[];
    competitorEvidence: WebSearchResult;
    twitterEvidence: WebSearchResult;
    analogousMarkets: WebSearchResult;
    plan: { analogousMarkets: string[] };
  },
  apiKey: string
): Promise<ResearchReport> {
  const totalDataPoints = data.redditPosts.length + data.communityEvidence.citations.length + data.competitorApps.length + data.competitorEvidence.citations.length + data.twitterEvidence.citations.length + data.analogousMarkets.citations.length;

  const dataQuality: 'rich' | 'moderate' | 'sparse' = totalDataPoints >= 20 ? 'rich' : totalDataPoints >= 8 ? 'moderate' : 'sparse';

  // Build context for the AI
  const redditContext = data.redditPosts.slice(0, 10).map((p, i) =>
    `[Reddit ${i + 1}] r/${p.subreddit} | ${p.score}pts | "${p.title}"\n${p.selftext.slice(0, 200)}`
  ).join('\n\n');

  const webContext = [
    data.communityEvidence.summary ? `COMMUNITY EVIDENCE:\n${data.communityEvidence.summary.slice(0, 600)}` : '',
    data.competitorEvidence.summary ? `COMPETITOR LANDSCAPE:\n${data.competitorEvidence.summary.slice(0, 600)}` : '',
    data.twitterEvidence.summary ? `TWITTER/SOCIAL EVIDENCE:\n${data.twitterEvidence.summary.slice(0, 400)}` : '',
    data.analogousMarkets.summary ? `ANALOGOUS MARKETS:\n${data.analogousMarkets.summary.slice(0, 600)}` : '',
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

  const systemPrompt = `You are a senior startup researcher and market analyst hired to validate a business idea. You have access to:
- Real community discussions from Reddit
- Live web search results with citations  
- App Store competitor data
- Analogous market research

Your job is to produce a thorough, honest validation report. You MUST:
1. Cite real sources when they exist (use [N] citation format)
2. Use analogous market evidence when direct evidence is sparse
3. Be brutally honest about gaps and risks
4. Give a clear go/no-go recommendation with reasoning
5. Distinguish between "no data found" (likely underserved niche) vs "data shows no demand"
6. Think like a VC associate — what would make you excited or concerned about this?

Return valid JSON only.`;

  const userPrompt = `Validate this business opportunity as a senior startup researcher:

## OPPORTUNITY
Title: "${opportunity.title}"
Description: ${opportunity.description}
Target Market: ${opportunity.targetMarket}
Problem: ${opportunity.problemStatement}

## EVIDENCE GATHERED (${totalDataPoints} total data points, quality: ${dataQuality})

${redditPosts_context(data.redditPosts)}

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

SCORING (calculate step by step before deciding):
Step 1 — Reddit evidence: 0 relevant posts = start at 30. 1-5 posts = 40. 6-15 posts = 55. 16+ posts = 65.
Step 2 — Web search quality: citations directly about this problem = +10. Citations about unrelated topics = -10.
Step 3 — Competitor apps: 0 apps = +15 (market gap!). 1-3 apps with gaps = +5. 4+ apps with poor reviews = +10.
Step 4 — Analogous market strength: strong analogous evidence (similar community solved it) = +15. Weak = +0.
Step 5 — Problem urgency: Is this a daily/weekly pain? = +10. Nice-to-have? = +0.

EXAMPLES to calibrate:
- Postpartum nutrition app: Reddit r/beyondthebump has 50+ posts about meal struggles. Multiple apps but none tailored. Score: 72.
- Ethiopian diaspora networking: No Reddit posts, but analogous markets (Nigerian diaspora apps exist, thriving). 6 competitor apps found. Score: 52.  
- Generic SaaS dashboard: Crowded market, 20+ competitors, no clear differentiation evidence. Score: 35.
- Completely novel idea with no data anywhere: Score: 28.

Each opportunity MUST receive a score reflecting ITS specific evidence. Scores MUST vary significantly across different opportunities.`;

  function redditPosts_context(posts: any[]): string {
    if (posts.length === 0) return 'REDDIT: No relevant posts found.';
    return `REDDIT POSTS (${posts.length} found):\n${posts.slice(0, 8).map((p, i) => `[Reddit ${i + 1}] r/${p.subreddit} (${p.score}pts): "${p.title}"\n${p.selftext.slice(0, 150)}`).join('\n\n')}`;
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
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

    if (!res.ok) throw new Error(`OpenAI synthesis failed: ${res.status}`);
    const result = await res.json();
    const report = JSON.parse(result.choices[0].message.content);

    return {
      communityEvidence: data.communityEvidence,
      competitorApps: data.competitorApps,
      competitorEvidence: data.competitorEvidence,
      twitterEvidence: data.twitterEvidence,
      analogousMarkets: data.analogousMarkets,
      demandSignals: report.demandSignals || [],
      painPoints: report.painPoints || [],
      competitors: report.competitors || [],
      marketGaps: report.marketGaps || [],
      risks: report.risks || [],
      dataQuality,
      evidenceSources: report.evidenceSources || [],
      totalDataPoints,
      opportunityScore: Math.min(100, Math.max(0, report.opportunityScore || 0)),
      verdict: report.verdict || 'insufficient_data',
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

    // Step 1: Generate research plan
    console.log('📋 Step 1: Generating research plan...');
    const plan = await generateSearchPlan(opportunity, apiKey);
    console.log(`   Queries: ${plan.queries.slice(0, 3).join(' | ')}`);
    console.log(`   Subreddits: ${plan.subreddits.slice(0, 5).join(', ')}`);
    console.log(`   Analogous markets: ${plan.analogousMarkets.join(', ')}`);

    // Merge client subreddits with AI plan
    const subreddits = [...new Set([...plan.subreddits, ...clientSubreddits])].slice(0, 14);
    const queries = clientQueries.length > 0
      ? [...new Set([...clientQueries, ...plan.queries])].slice(0, 10)
      : plan.queries;

    // Step 2: All searches in parallel
    console.log('\n📡 Step 2: Searching all sources in parallel...');
    const [redditPosts, competitorApps, communityEvidence, competitorEvidence, twitterEvidence, analogousMarketsEvidence] = await Promise.all([

      // Reddit (PullPush two-pass)
      searchReddit(queries, subreddits, 25).then(posts => {
        console.log(`   ✓ Reddit: ${posts.length} posts`);
        return posts;
      }),

      // App Store competitors
      searchAppStore(opportunity).then(apps => {
        console.log(`   ✓ App Store: ${apps.length} competitor apps`);
        return apps;
      }),

      // Community pain points via web search
      webSearch(
        `Find community discussions, Reddit posts, Quora answers, and forum threads about problems faced by ${targetMarket}. Specifically about ${problemStatement}. Find real user complaints and requests for solutions.`,
        apiKey
      ).then(r => { console.log(`   ✓ Community web search: ${r.citations.length} citations`); return r; }),

      // Competitor landscape via web search
      webSearch(
        `What existing apps, platforms, and services exist for "${title}"? Find competitor apps on App Store and Google Play, their user reviews, ratings, and what users complain about. Include any Ethiopian or African diaspora networking apps.`,
        apiKey
      ).then(r => { console.log(`   ✓ Competitor web search: ${r.citations.length} citations`); return r; }),

      // Twitter/X and social evidence
      webSearch(
        `Find Twitter, X, LinkedIn posts, and social media discussions about "${title}" or "${targetMarket}" networking challenges. What are people saying? Any viral discussions?`,
        apiKey
      ).then(r => { console.log(`   ✓ Social/Twitter search: ${r.citations.length} citations`); return r; }),

      // Analogous market research — THE KEY FOR NICHE MARKETS
      plan.analogousMarkets.length > 0
        ? webSearch(
            `Research how analogous communities solved similar problems: ${plan.analogousMarkets.join(', ')}. What networking platforms did they build? What worked? What was the demand like? What can we learn for "${title}"?`,
            apiKey
          ).then(r => { console.log(`   ✓ Analogous markets: ${r.citations.length} citations (${plan.analogousMarkets.join(', ')})`); return r; })
        : Promise.resolve({ query: '', summary: '', citations: [] }),
    ]);

    // Step 3: Deep AI synthesis
    console.log('\n🧠 Step 3: AI synthesis — acting as startup researcher...');
    const report = await synthesizeResearch(
      opportunity,
      { redditPosts, communityEvidence, competitorApps, competitorEvidence, twitterEvidence, analogousMarkets: analogousMarketsEvidence, plan },
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
        reddit: { postsFound: redditPosts.length, topPosts: redditPosts.slice(0, 5).map(p => ({ title: p.title, subreddit: p.subreddit, score: p.score, permalink: p.permalink })) },
        webSearch: { communityResults: communityEvidence.citations.length, competitorResults: competitorEvidence.citations.length, twitterResults: twitterEvidence.citations.length },
        appStore: { appsFound: competitorApps.length },
        analogousMarkets: { results: analogousMarketsEvidence.citations.length, markets: plan.analogousMarkets },
      },
      researchScore: report.opportunityScore,
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
      webCitations: [...communityEvidence.citations, ...competitorEvidence.citations, ...analogousMarketsEvidence.citations]
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
