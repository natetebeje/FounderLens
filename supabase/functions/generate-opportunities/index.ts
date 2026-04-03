import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

function slugifyTitle(title: string): string {
  return title.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Reddit API helpers ───────────────────────────────────────────────

async function getRedditAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get('REDDIT_CLIENT_ID');
  const clientSecret = Deno.env.get('REDDIT_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'FounderLens/1.0.0',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

async function searchReddit(token: string, query: string, subreddit: string): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      q: query, sort: 'relevance', t: 'year', limit: '15', type: 'link', restrict_sr: 'true',
    });
    const res = await fetch(`https://oauth.reddit.com/r/${subreddit}/search?${params}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'FounderLens/1.0.0' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.children?.map((c: any) => c.data) || [];
  } catch {
    return [];
  }
}

// ─── Core generation ──────────────────────────────────────────────────

// ─── Structured output schema for OpenAI ─────────────────────────────
const opportunityJsonSchema = {
  name: 'opportunities_response',
  strict: true,
  schema: {
    type: 'object',
    required: ['opportunities'],
    additionalProperties: false,
    properties: {
      opportunities: {
        type: 'array',
        items: {
          type: 'object',
          required: [
            'title', 'description', 'problem_statement', 'target_market',
            'solution_approach', 'market_size_estimate', 'competition_level',
            'difficulty_level', 'time_to_market', 'founder_fit_score',
            'ai_confidence_score', 'opportunity_tags',
          ],
          additionalProperties: false,
          properties: {
            title: { type: 'string', description: 'Concise opportunity name, max 60 chars' },
            description: { type: 'string', description: '2-3 sentences. Must name a real competitor or existing solution and explain how this differs.' },
            problem_statement: { type: 'string', description: 'Specific problem: who suffers, why existing solutions fall short. Not a vague category.' },
            target_market: { type: 'string', description: 'Specific audience with size qualifier, e.g. "Freelance designers earning $50K-150K who manage 3+ clients"' },
            solution_approach: { type: 'string', description: '2-3 sentences describing what the product concretely does. No marketing fluff.' },
            market_size_estimate: { type: 'string', description: 'Dollar range TAM, e.g. "$2B-5B" or "$50M-200M". Based on real industry data.' },
            competition_level: { type: 'string', enum: ['low', 'medium', 'high'] },
            difficulty_level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            time_to_market: { type: 'string', description: 'Realistic MVP timeline, e.g. "3-6 months for MVP"' },
            founder_fit_score: { type: 'integer', description: '1-100 how well this matches stated skills and time commitment' },
            ai_confidence_score: { type: 'integer', description: '1-100 confidence this is viable before user validation. Most should be 40-70.' },
            opportunity_tags: { type: 'array', items: { type: 'string' }, description: '3-5 specific tags like "b2b-saas", "marketplace", industry verticals' },
          },
        },
      },
    },
  },
};

async function generateOpportunities(
  answers: { frustration: string; skills: string; timeCommitment: string },
  count: number,
  apiKey: string,
  contextualIdea?: string,
): Promise<any[]> {

  const systemPrompt = `You are a rigorous startup analyst. You generate business opportunity briefs grounded in real market conditions.

RULES — every field must reflect verifiable reality:
- Use your training data about actual markets, real companies, and documented trends. If you are uncertain about a specific number, give a conservative range and note it.
- market_size_estimate: Specific dollar-range TAM, e.g. "$2B-5B" or "$50M-200M". Derive from known industry reports (Statista, Grand View Research, IBISWorld, CB Insights, etc.). Never say "Large" or "Moderate".
- competition_level: "low" = fewer than 3 known direct competitors; "medium" = 3-10 competitors; "high" = 10+ competitors or dominated by incumbents. You MUST name 1-2 actual real-world competitors in the description field.
- time_to_market: Realistic MVP timeline factoring in the user's stated time commitment. A person with 5 hrs/week cannot ship a complex SaaS in 2 months.
- founder_fit_score (1-100): Honest match to stated skills + time. Score 30-50 for mismatches (e.g. non-technical founder building deep-tech, 5 hrs/week for complex product).
- ai_confidence_score (1-100): Your confidence BEFORE any validation. Base on: strength of market evidence you can cite, competition gap, founder fit, and technical feasibility. Most should land 40-70. Only exceed 75 with strong evidence.
- problem_statement: Must specify WHO has the problem, WHAT the problem is concretely, and WHY current solutions fail. Bad: "Small businesses need better tools." Good: "Independent restaurants spending 8+ hrs/week manually updating menus across DoorDash, UberEats, and Grubhub because no affordable tool syncs changes across all three platforms."
- target_market: Specific segment with qualifiers. Bad: "small businesses". Good: "Independent restaurant owners with 1-3 locations doing $500K-$2M annual revenue who list on 2+ delivery platforms."
- description: Must reference at least one REAL existing product or company by name and explain how this opportunity differs or improves on it.
- solution_approach: Concrete product description — what it does, how users interact with it, what the core mechanism is. No vague claims.
- opportunity_tags: 3-5 specific, lowercase tags. Use patterns like "b2b-saas", "marketplace", "developer-tools", "fintech", "health-tech", or specific industry verticals.

Never inflate scores to be encouraging. Honest assessment helps founders make real decisions.`;

  const userPrompt = `Generate exactly ${count} business opportunities for this founder:

FRUSTRATION / PROBLEM AREA: "${answers.frustration}"
KEY SKILLS: "${answers.skills}"
TIME COMMITMENT: "${answers.timeCommitment}"
${contextualIdea ? `SPECIFIC IDEA CONTEXT: "${contextualIdea}"` : ''}

Requirements:
1. Each opportunity must directly address their frustration or a closely related problem they'd encounter
2. Leverage their skills as a competitive advantage — the opportunity should be easier for THIS person than for a random founder
3. Be realistically achievable within their time commitment
4. Target a real market with observable demand (cite evidence like community discussions, competitor traction, industry reports)
5. Each opportunity should be meaningfully DIFFERENT from the others — vary the business model, target segment, or approach

For each opportunity, think step-by-step:
- What specific real-world problem exists in this space?
- Who exactly has this problem and how many of them are there?
- What do they use today, and why is it inadequate?
- What would a better solution look like concretely?
- How does this founder's skill set give them an edge?
- What's a realistic TAM based on known market data?`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-2024-08-06',
      response_format: { type: 'json_schema', json_schema: opportunityJsonSchema },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 5000,
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error('RATE_LIMIT_EXCEEDED');
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI API error: ${res.status} ${body.substring(0, 200)}`);
  }

  const result = await res.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in OpenAI response');

  console.log(`OpenAI usage: ${JSON.stringify(result.usage)}`);

  const parsed = JSON.parse(content);
  const opportunities = parsed.opportunities;
  if (!Array.isArray(opportunities) || opportunities.length === 0) {
    throw new Error('Response contains no opportunities array');
  }

  // Validate required fields for each opportunity and set defaults
  return opportunities.slice(0, count).map((opp: any, idx: number) => {
    // Ensure required DB fields are present
    if (!opp.title || !opp.description || !opp.problem_statement || !opp.target_market) {
      console.error(`Opportunity ${idx} missing required fields, skipping:`, JSON.stringify(opp).substring(0, 200));
      return null;
    }

    return {
      title: opp.title.substring(0, 120),
      description: opp.description,
      problem_statement: opp.problem_statement,
      target_market: opp.target_market,
      solution_approach: opp.solution_approach || '',
      market_size_estimate: opp.market_size_estimate || 'Not estimated',
      competition_level: ['low', 'medium', 'high'].includes(opp.competition_level) ? opp.competition_level : 'medium',
      difficulty_level: ['beginner', 'intermediate', 'advanced'].includes(opp.difficulty_level) ? opp.difficulty_level : 'intermediate',
      time_to_market: opp.time_to_market || 'Not estimated',
      ai_confidence_score: Math.max(20, Math.min(80, Number(opp.ai_confidence_score) || 50)),
      founder_fit_score: Math.max(10, Math.min(95, Number(opp.founder_fit_score) || 50)),
      opportunity_tags: Array.isArray(opp.opportunity_tags) ? opp.opportunity_tags.slice(0, 5) : [],
      source: 'discovery',
      validation_status: 'not_started',
    };
  }).filter(Boolean);
}

// ─── Lightweight Reddit signal (no fabrication) ───────────────────────

async function getRedditSignals(
  opportunity: any,
): Promise<{ has_data: boolean; discussion_count: number; subreddits: string[]; sample_titles: string[] }> {
  const token = await getRedditAccessToken();
  if (!token) return { has_data: false, discussion_count: 0, subreddits: [], sample_titles: [] };

  // Build focused search queries from the opportunity
  const queries = [
    opportunity.title.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').slice(0, 4).join(' '),
    opportunity.problem_statement?.split(' ').slice(0, 5).join(' ') || '',
  ].filter(q => q.length > 5);

  const targetSubs = ['startups', 'entrepreneur', 'smallbusiness', 'SaaS', 'indiehackers'];
  const allPosts: any[] = [];
  const foundSubs: string[] = [];

  for (const sub of targetSubs.slice(0, 3)) {
    for (const q of queries.slice(0, 2)) {
      const posts = await searchReddit(token, q, sub);
      if (posts.length > 0 && !foundSubs.includes(sub)) foundSubs.push(sub);
      allPosts.push(...posts);
      await new Promise(r => setTimeout(r, 150)); // rate limit
    }
  }

  // Deduplicate by post id
  const unique = [...new Map(allPosts.map(p => [p.id, p])).values()];
  const sampleTitles = unique.slice(0, 5).map(p => p.title).filter(Boolean);

  return {
    has_data: unique.length > 0,
    discussion_count: unique.length,
    subreddits: foundSubs,
    sample_titles: sampleTitles,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      prompt: rawPrompt,
      count = 3,
      user_id,
      organization_id,
      isGuestMode = false,
      guestSessionId,
      guestContext,
      answers: rawAnswers,
      refreshRedditOnly = false,
      opportunityId,
      opportunityTitle,
      targetMarket,
      problemStatement,
      contextualIdea,
    } = body;

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OpenAI API key not found');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ── Reddit-only refresh ──
    if (refreshRedditOnly && opportunityId) {
      const signals = await getRedditSignals({ title: opportunityTitle || '', problem_statement: problemStatement || '' });
      await supabaseClient.from('business_opportunities').update({
        reddit_analysis: {
          has_data: signals.has_data,
          discussion_count: signals.discussion_count,
          subreddits_analyzed: signals.subreddits,
          sample_titles: signals.sample_titles,
          status: signals.has_data ? 'reddit-data' : 'no-data',
          data_source: 'reddit-api',
          fetched_at: new Date().toISOString(),
        },
      }).eq('id', opportunityId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Parse answers (from prompt or structured answers) ──
    let answers = { frustration: '', skills: '', timeCommitment: '' };
    if (rawAnswers) {
      answers = { frustration: rawAnswers.frustration || '', skills: rawAnswers.skills || '', timeCommitment: rawAnswers.timeCommitment || '' };
    } else if (guestContext) {
      answers = { frustration: guestContext.frustration || '', skills: guestContext.skills || '', timeCommitment: guestContext.timeCommitment || '' };
    } else if (rawPrompt) {
      // Extract from legacy prompt format
      const frustMatch = rawPrompt.match(/(?:Frustration|Interest):\s*(.+)/i);
      const skillsMatch = rawPrompt.match(/Skills?:\s*(.+)/i);
      const timeMatch = rawPrompt.match(/Time\s*(?:Commitment)?:\s*(.+)/i);
      answers.frustration = frustMatch?.[1]?.trim() || '';
      answers.skills = skillsMatch?.[1]?.trim() || '';
      answers.timeCommitment = timeMatch?.[1]?.trim() || '';
    }

    if (!answers.frustration) {
      return new Response(JSON.stringify({ success: false, error: 'Missing frustration/problem input' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Feature limits ──
    let featureLimit = isGuestMode ? 3 : 5;
    if (!isGuestMode && user_id && organization_id) {
      try {
        const { data: allowed, error } = await supabaseClient.rpc('check_feature_limit', {
          p_user_id: user_id, p_organization_id: organization_id, p_feature_name: 'opportunities',
        });
        if (error) { console.error('Feature limit check failed:', error); featureLimit = 3; }
        else if (!allowed) {
          return new Response(JSON.stringify({ success: false, error: 'Feature limit reached. Please upgrade your plan.', needsUpgrade: true }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else { featureLimit = 50; }
      } catch { featureLimit = 3; }
    }

    const generateCount = Math.min(count, featureLimit, 5);

    // ── Generate opportunities ──
    console.log(`Generating ${generateCount} opportunities for: "${answers.frustration.substring(0, 60)}"`);
    const opportunities = await generateOpportunities(answers, generateCount, apiKey, contextualIdea);

    if (opportunities.length === 0) {
      throw new Error('AI generation returned no valid opportunities. Please try rephrasing your input.');
    }

    // ── Get Reddit signals (non-blocking, real data only) ──
    const withReddit = await Promise.all(
      opportunities.map(async (opp) => {
        try {
          const signals = await getRedditSignals(opp);
          return {
            ...opp,
            reddit_analysis: {
              has_data: signals.has_data,
              discussion_count: signals.discussion_count,
              subreddits_analyzed: signals.subreddits,
              sample_titles: signals.sample_titles,
              status: signals.has_data ? 'reddit-data' : 'no-data',
              data_source: 'reddit-api',
              fetched_at: new Date().toISOString(),
            },
          };
        } catch (err) {
          console.error(`Reddit signal failed for "${opp.title}":`, err);
          return {
            ...opp,
            reddit_analysis: { has_data: false, status: 'not-checked', data_source: 'none' },
          };
        }
      }),
    );

    // ── Add user/org context ──
    const readyToSave = withReddit.map(opp => ({
      ...opp,
      user_id: isGuestMode ? null : user_id,
      organization_id: organization_id || null,
      guest_session_id: isGuestMode ? (guestSessionId || null) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // ── Deduplication & save ──
    const { data: existingOpps } = await supabaseClient
      .from('business_opportunities')
      .select('id, title, ai_confidence_score')
      .or(isGuestMode ? `guest_session_id.eq.${guestSessionId}` : `organization_id.eq.${organization_id}`);

    const existingSlugs = new Set((existingOpps || []).map(o => slugifyTitle(o.title)));

    let insertedCount = 0;
    let skippedDuplicates: string[] = [];
    const savedOpportunities: any[] = [];

    for (const opp of readyToSave) {
      const slug = slugifyTitle(opp.title);
      if (existingSlugs.has(slug)) {
        skippedDuplicates.push(opp.title);
        console.log(`Skipped duplicate: ${opp.title}`);
        continue;
      }

      const { data: inserted, error: insertErr } = await supabaseClient
        .from('business_opportunities')
        .insert(opp)
        .select()
        .single();

      if (!insertErr && inserted) {
        savedOpportunities.push(inserted);
        insertedCount++;
        existingSlugs.add(slug);
      } else {
        console.error(`Insert error for "${opp.title}":`, insertErr);
      }
    }

    // ── Track usage ──
    if (!isGuestMode && user_id && organization_id && insertedCount > 0) {
      try {
        await supabaseClient.rpc('increment_usage', {
          p_user_id: user_id, p_organization_id: organization_id, p_resource_type: 'opportunities',
        });
      } catch (err) { console.error('Usage tracking error:', err); }
    }

    console.log(`Done: ${insertedCount} new, ${skippedDuplicates.length} skipped`);

    return new Response(JSON.stringify({
      success: true,
      opportunities: savedOpportunities,
      count: savedOpportunities.length,
      insertedCount,
      skippedDuplicates,
      isGuestMode,
      featureLimit,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Generation error:', error);

    if (error.message === 'RATE_LIMIT_EXCEEDED') {
      return new Response(JSON.stringify({
        success: false, error: 'AI service is busy. Please try again in a minute.', retryAfter: 60,
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: false, error: error.message || 'Failed to generate opportunities',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
