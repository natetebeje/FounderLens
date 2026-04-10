import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Paperclip REST helpers ───────────────────────────────────────────────────

async function pc(method: string, path: string, body?: object) {
  const url = `${Deno.env.get('PAPERCLIP_API_URL')}/api${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('PAPERCLIP_BOARD_API_KEY')}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Paperclip ${method} ${path} → ${res.status}: ${err}`);
  }
  return res.json();
}

// ─── Proposal field helpers ───────────────────────────────────────────────────

function list(arr?: string[], fallback = 'To be defined'): string {
  if (!arr || arr.length === 0) return fallback;
  return arr.map(s => `- ${s}`).join('\n');
}

function str(val?: string, fallback = 'To be defined'): string {
  return val?.trim() || fallback;
}

// Stringify arbitrary structured data (objects, arrays, strings) for skill markdown.
function blockify(val: any, fallback = 'Not available'): string {
  if (val == null) return fallback;
  if (typeof val === 'string') return val.trim() || fallback;
  try {
    return '```json\n' + JSON.stringify(val, null, 2) + '\n```';
  } catch {
    return fallback;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { opportunityId } = await req.json();
    if (!opportunityId) {
      return new Response(JSON.stringify({ error: 'opportunityId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    );
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Load opportunity + workflow ───────────────────────────────────────────
    const { data: opp } = await serviceSupabase
      .from('business_opportunities')
      .select('id, title, description, target_market, problem_statement')
      .eq('id', opportunityId)
      .single();
    if (!opp) throw new Error('Opportunity not found');

    const { data: workflow } = await serviceSupabase
      .from('validation_workflows')
      .select(`
        product_proposal,
        reddit_validation_results,
        automated_validation_results,
        composite_score,
        automated_score,
        automated_recommendation,
        status,
        paperclip_company_id,
        paperclip_company_url
      `)
      .eq('opportunity_id', opportunityId)
      .maybeSingle();

    // Latest AI market intelligence snapshot for this opportunity.
    const { data: marketIntelRow } = await serviceSupabase
      .from('automated_market_intelligence')
      .select('competitor_analysis, market_sizing, pricing_research, trends_analysis, swot_analysis, confidence_score')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Already launched — return existing
    if (workflow?.paperclip_company_id) {
      // Read the stored URL; if missing, fetch the company prefix from Paperclip
      let companyUrl = workflow.paperclip_company_url;
      if (!companyUrl) {
        try {
          const existing = await pc('GET', `/companies/${workflow.paperclip_company_id}`);
          const prefix = existing.prefix || existing.slug || workflow.paperclip_company_id;
          companyUrl = `${Deno.env.get('PAPERCLIP_API_URL')}/${prefix}/dashboard`;
          // Persist the correct URL for future use
          await serviceSupabase
            .from('validation_workflows')
            .update({ paperclip_company_url: companyUrl })
            .eq('opportunity_id', opportunityId);
        } catch {
          companyUrl = Deno.env.get('PAPERCLIP_API_URL') || 'https://build.founderlens.io';
        }
      }
      return new Response(JSON.stringify({
        success: true,
        alreadyLaunched: true,
        companyId: workflow.paperclip_company_id,
        companyUrl,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const proposal = workflow?.product_proposal || {};
    const research = workflow?.reddit_validation_results || {};
    const automatedAi = workflow?.automated_validation_results || {};

    // Merge AI market intelligence: prefer the dedicated table, fall back to the
    // camelCase blob stored on validation_workflows (same pattern the frontend uses).
    const marketIntel = {
      competitorAnalysis: marketIntelRow?.competitor_analysis ?? automatedAi?.competitorAnalysis ?? null,
      marketSizing:       marketIntelRow?.market_sizing       ?? automatedAi?.marketSizing       ?? null,
      pricingResearch:    marketIntelRow?.pricing_research    ?? automatedAi?.pricingResearch    ?? null,
      trendsAnalysis:     marketIntelRow?.trends_analysis     ?? automatedAi?.trendsAnalysis     ?? null,
      swotAnalysis:       marketIntelRow?.swot_analysis       ?? automatedAi?.swotAnalysis       ?? null,
      confidenceScore:    marketIntelRow?.confidence_score    ?? workflow?.automated_score       ?? null,
    };

    // ── Derive key strings from proposal + research ───────────────────────────
    const productName  = str(proposal.productName, opp.title);
    const oneLiner     = str(proposal.oneLiner, opp.description);
    const problem      = str(proposal.problemStatement, opp.description);
    const persona      = str(proposal.targetUser?.persona, opp.target_market);
    const differentiator = str(proposal.solution?.uniqueDifferentiator);
    const unfairAdv    = str(proposal.solution?.unfairAdvantage);
    const primaryCh    = str(proposal.goToMarket?.primaryChannel, 'Community / content marketing');
    const pricingModel = str(proposal.monetization?.model, 'subscription');
    const pricing      = str(proposal.monetization?.pricing, 'TBD');

    // Composite score is the canonical paired AI+community validation score — prefer
    // it, then fall back through Reddit research, proposal backing, and AI sub-scores.
    const compositeScore = workflow?.composite_score || 0;
    const score =
      compositeScore ||
      research.opportunityScore ||
      proposal.researchBacking?.opportunityScore ||
      workflow?.automated_score ||
      marketIntel.confidenceScore ||
      0;
    const dataPoints    = research.totalDataPoints || proposal.researchBacking?.dataPoints || 0;
    const recommendation = workflow?.automated_recommendation || research.recommendation || '';
    const verdict       = research.verdict || '';

    const mustHaves    = proposal.mvpScope?.mustHave || research.demandSignals?.slice(0, 4) || [];
    const painPoints   = proposal.targetUser?.painPoints || research.painPoints || [];
    const risks        = proposal.risks || research.risks || [];
    const channels     = proposal.goToMarket?.channels || [];
    const competitors  = (research.competitors || []).slice(0, 4);
    const compApps     = (research.competitorApps || []).slice(0, 4);
    const nextSteps    = proposal.nextSteps || [];

    // AI-discovered competitors (beyond the Reddit community view).
    const aiCompetitors: string[] = (() => {
      const ca: any = marketIntel.competitorAnalysis;
      if (!ca) return [];
      if (Array.isArray(ca?.competitors)) {
        return ca.competitors
          .slice(0, 5)
          .map((c: any) =>
            typeof c === 'string'
              ? c
              : [c.name || c.title, c.description || c.summary].filter(Boolean).join(' — '),
          )
          .filter(Boolean);
      }
      if (Array.isArray(ca?.topCompetitors)) return ca.topCompetitors.slice(0, 5);
      return [];
    })();

    // Market sizing summary for goal/description/agent context.
    const tam = marketIntel.marketSizing?.totalAddressableMarket
      || marketIntel.marketSizing?.tam
      || marketIntel.marketSizing?.tamEstimate
      || '';
    const sam = marketIntel.marketSizing?.serviceableAddressableMarket
      || marketIntel.marketSizing?.sam
      || '';
    const som = marketIntel.marketSizing?.serviceableObtainableMarket
      || marketIntel.marketSizing?.som
      || '';
    const marketSizingSummary = [
      tam && `TAM: ${tam}`,
      sam && `SAM: ${sam}`,
      som && `SOM: ${som}`,
    ].filter(Boolean).join(' · ');

    const pricingSummary = marketIntel.pricingResearch
      ? (marketIntel.pricingResearch.summary
          || marketIntel.pricingResearch.recommendedPricing
          || marketIntel.pricingResearch.analysis
          || '')
      : '';

    const trendsSummary = marketIntel.trendsAnalysis
      ? (marketIntel.trendsAnalysis.summary
          || marketIntel.trendsAnalysis.overall
          || marketIntel.trendsAnalysis.analysis
          || '')
      : '';
    const trendKeys = Array.isArray(marketIntel.trendsAnalysis?.keyTrends)
      ? marketIntel.trendsAnalysis.keyTrends.slice(0, 5)
      : [];

    const swot = marketIntel.swotAnalysis || {};
    const swotStrengths = Array.isArray(swot.strengths)
      ? swot.strengths.map((s: any) => typeof s === 'string' ? s : s?.text || s?.description).filter(Boolean).slice(0, 5)
      : [];
    const swotWeaknesses = Array.isArray(swot.weaknesses)
      ? swot.weaknesses.map((s: any) => typeof s === 'string' ? s : s?.text || s?.description).filter(Boolean).slice(0, 5)
      : [];

    const supabaseUrl  = Deno.env.get('SUPABASE_URL') ?? '';

    console.log(`\nLaunching AI company for: "${productName}"`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Create Company
    // ─────────────────────────────────────────────────────────────────────────
    const companyDescription = [
      oneLiner,
      `Validated by FounderLens — Composite Score: ${score}/100${verdict ? ` (${verdict} signal)` : ''} · ${dataPoints} community data points analyzed.`,
      recommendation ? `Recommendation: ${recommendation}` : null,
      `Problem: ${problem}`,
      `Target User: ${persona}`,
      marketSizingSummary ? `Market: ${marketSizingSummary}` : null,
    ].filter(Boolean).join('\n\n');

    const company = await pc('POST', '/companies', {
      name: productName,
      description: companyDescription,
      budgetMonthlyCents: 2000, // $20/mo default cap
    });
    const companyId = company.id;
    const companyPrefix = company.prefix || company.slug || companyId;
    console.log(`Company created: ${companyId} (prefix: ${companyPrefix})`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Create Company Goal
    // ─────────────────────────────────────────────────────────────────────────
    const goalDescription = [
      `## Mission\n${oneLiner}`,
      `## Why This Matters\n${problem}`,
      `## Success Criteria\n- MVP shipped covering all validated must-haves\n- 10 paying customers before adding v2 features\n- Primary acquisition channel (${primaryCh}) showing consistent conversion`,
      `## Validation Backing\n- Composite Score: ${score}/100${verdict ? ` (${verdict} signal)` : ''}\n- Community Data Points: ${dataPoints}\n- Differentiator: ${differentiator}${recommendation ? `\n- Recommendation: ${recommendation}` : ''}${marketSizingSummary ? `\n- Market: ${marketSizingSummary}` : ''}`,
    ].join('\n\n');

    const goal = await pc('POST', `/companies/${companyId}/goals`, {
      title: `Launch ${productName} and reach first 100 paying customers`,
      description: goalDescription,
      level: 'company',
      status: 'active', // Paperclip goal enum: planned|active|achieved|cancelled
    });
    console.log(`Goal created: ${goal.id}`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Create Projects
    // ─────────────────────────────────────────────────────────────────────────
    const [mvpProject, marketingProject, opsProject] = await Promise.all([
      pc('POST', `/companies/${companyId}/projects`, {
        name: 'MVP',
        description: `Build the minimum viable product for ${productName}.\n\nValidated must-haves:\n${list(mustHaves)}\n\nShip these in order of user pain intensity. First paying customer before any v2 features.`,
        goalIds: [goal.id],
        status: 'planned',
      }),
      pc('POST', `/companies/${companyId}/projects`, {
        name: 'Marketing',
        description: `Reach the first 100 target users and convert 10 to paying customers.\n\nPrimary channel: ${primaryCh}\nAll channels:\n${list(channels)}\n\nTarget user: ${persona}`,
        goalIds: [goal.id],
        status: 'planned',
      }),
      pc('POST', `/companies/${companyId}/projects`, {
        name: 'Operations',
        description: `Keep ${productName} running smoothly.\n\nBudget: $20/month cap\nWeekly rituals: Monday priorities, Wednesday check-in, Friday retro\nEscalation: alert CEO at 80% budget or critical user bug`,
        goalIds: [goal.id],
        status: 'planned',
      }),
    ]);
    console.log(`Projects created: MVP=${mvpProject.id}, Marketing=${marketingProject.id}`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Create Agents (CEO first, then team reporting to CEO)
    // ─────────────────────────────────────────────────────────────────────────

    const ceoSystemPrompt = `You are the CEO of ${productName}.

MISSION: ${oneLiner}

PROBLEM YOU'RE SOLVING: ${problem}

TARGET USER: ${persona}

YOUR UNFAIR ADVANTAGE: ${unfairAdv}

VALIDATION BACKING: FounderLens validated this opportunity with a composite score of ${score}/100${verdict ? ` (${verdict} signal)` : ''} — combining AI market intelligence and ${dataPoints} community data points from Reddit, web search, App Store, and analogous markets.
${recommendation ? `\nRECOMMENDATION: ${recommendation}\n` : ''}
${swotStrengths.length ? `STRATEGIC STRENGTHS (from SWOT):\n${list(swotStrengths)}\n` : ''}
${swotWeaknesses.length ? `STRATEGIC WEAKNESSES TO MANAGE (from SWOT):\n${list(swotWeaknesses)}\n` : ''}
YOUR RESPONSIBILITIES:
- Review all open issues every heartbeat and ensure the team is unblocked
- Set the top 3 priorities for the week every Monday
- Ensure CTO always has 3+ engineering tasks queued
- Ensure CMO always has 2+ content/marketing tasks queued
- Post a weekly OKR update on the company goal
- Flag any budget concerns when spend approaches the $20/month cap
- Make decisions quickly — if reversible in <2 weeks, decide and move

KEY PAIN POINTS TO SOLVE:
${list(painPoints)}

TOP RISKS TO WATCH:
${list(risks)}

DECISION FRAMEWORK: Ship small things fast. Talk to users every week. Evidence over opinion.`;

    const ceo = await pc('POST', `/companies/${companyId}/agents`, {
      name: 'CEO',
      role: 'ceo',
      title: `CEO of ${productName}`,
      capabilities: `Strategic direction, goal management, team coordination, weekly OKR reporting, budget oversight. Expert in early-stage SaaS for ${opp.target_market}.`,
      adapterType: 'http',
      adapterConfig: {
        url: `${supabaseUrl}/functions/v1/paperclip-agent-ceo`,
        headers: {
          'x-founderlens-opportunity-id': opportunityId,
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'apikey': Deno.env.get('SUPABASE_ANON_KEY'),
        },
        timeoutSec: 120,
      },
      prompt: ceoSystemPrompt,
      budgetMonthlyCents: 600,
    });
    console.log(`CEO created: ${ceo.id}`);

    // CTO, Engineer, CMO, Growth in parallel (all report to CEO)
    const [cto, engineer, cmo, growth] = await Promise.all([

      pc('POST', `/companies/${companyId}/agents`, {
        name: 'CTO',
        role: 'cto',  // Paperclip: ceo|cto|cmo|cfo|engineer|designer|pm|qa|devops|researcher|general
        title: `CTO of ${productName}`,
        reportsTo: ceo.id,
        capabilities: `Technical architecture, MVP scoping, engineering direction, code review, ADR writing. Builds lean, ship-fast systems for ${opp.target_market}.`,
        adapterType: 'http',
        adapterConfig: {
          url: `${supabaseUrl}/functions/v1/paperclip-agent-cto`,
          headers: {
          'x-founderlens-opportunity-id': opportunityId,
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'apikey': Deno.env.get('SUPABASE_ANON_KEY'),
        },
          timeoutSec: 120,
        },
        prompt: `You are the CTO of ${productName}.\n\nMISSION: ${oneLiner}\n\nMVP MUST-HAVES (build in this order):\n${list(mustHaves)}\n\nKEY PAIN POINTS (these inform what we build first):\n${list(painPoints)}\n${trendsSummary || trendKeys.length ? `\nMARKET TRENDS TO ALIGN BUILD WITH:\n${trendsSummary ? trendsSummary + '\n' : ''}${trendKeys.length ? list(trendKeys) : ''}\n` : ''}\nYOUR RESPONSIBILITIES:\n- Break down MVP must-haves into specific, actionable engineering issues\n- Estimate complexity (S/M/L) on every issue\n- Write ADRs for significant architecture decisions\n- Ensure Engineer always has a clearly defined task\n- Always prefer the simplest stack that can reach first revenue\n\nOUT OF SCOPE FOR V1:\n${list(proposal.mvpScope?.outOfScope, 'None specified yet')}`,
        budgetMonthlyCents: 500,
      }),

      pc('POST', `/companies/${companyId}/agents`, {
        name: 'Engineer',
        role: 'engineer',
        title: `Lead Engineer of ${productName}`,
        reportsTo: ceo.id,
        capabilities: `Feature implementation, technical specs, architecture documents, code scaffolding. Full-stack development for SaaS products.`,
        adapterType: 'http',
        adapterConfig: {
          url: `${supabaseUrl}/functions/v1/paperclip-agent-engineer`,
          headers: {
          'x-founderlens-opportunity-id': opportunityId,
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'apikey': Deno.env.get('SUPABASE_ANON_KEY'),
        },
          timeoutSec: 120,
        },
        prompt: `You are the Lead Engineer of ${productName}.\n\nMISSION: ${oneLiner}\n\nYour output for every task must be one of: working code, a detailed implementation spec, or an architecture document. Always post output as a structured comment on the issue. Mark blockers explicitly — never silently stall.\n\nMVP SCOPE:\n${list(mustHaves)}\n${trendsSummary ? `\nMARKET CONTEXT (trends your build should reflect):\n${trendsSummary}\n` : ''}\nIMPLEMENTATION FORMAT:\n## Implementation Plan\n## Key Technical Decisions\n## Acceptance Criteria Check\n## Files Changed`,
        budgetMonthlyCents: 400,
      }),

      pc('POST', `/companies/${companyId}/agents`, {
        name: 'CMO',
        role: 'cmo',
        title: `CMO of ${productName}`,
        reportsTo: ceo.id,
        capabilities: `Brand strategy, content creation, go-to-market execution, community outreach, campaign planning for ${opp.target_market}.`,
        adapterType: 'http',
        adapterConfig: {
          url: `${supabaseUrl}/functions/v1/paperclip-agent-cmo`,
          headers: {
          'x-founderlens-opportunity-id': opportunityId,
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'apikey': Deno.env.get('SUPABASE_ANON_KEY'),
        },
          timeoutSec: 120,
        },
        prompt: `You are the CMO of ${productName}.\n\nTARGET USER: ${persona}\n\nPRIMARY ACQUISITION CHANNEL: ${primaryCh}\nALL CHANNELS:\n${list(channels)}\n\nCOMPETITOR GAPS WE WIN ON (from community research):\n${competitors.map(c => `- vs ${c.name}: ${c.gap}`).join('\n') || list(proposal.marketOpportunity?.competitorGaps)}\n${aiCompetitors.length ? `\nAI-DISCOVERED COMPETITIVE LANDSCAPE (from market intelligence):\n${list(aiCompetitors)}\n` : ''}\nCONTENT PRINCIPLES:\n- Lead with the problem, not the solution\n- Use the exact language your target user uses\n- Reference competitor gaps when positioning\n- Every piece of content must pass: "would my target user share this?"\n\nYOUR RESPONSIBILITIES:\n- Draft 1 piece of content per session (post, email, landing copy, campaign brief)\n- Propose acquisition experiments based on research data\n- 3x/week community posts, 1x/week long-form content`,
        budgetMonthlyCents: 300,
      }),

      pc('POST', `/companies/${companyId}/agents`, {
        name: 'Growth',
        role: 'engineer',
        title: `Growth Lead of ${productName}`,
        reportsTo: ceo.id,
        capabilities: `User acquisition experiments, funnel analytics, conversion optimization, community outreach for ${opp.target_market}.`,
        adapterType: 'http',
        adapterConfig: {
          url: `${supabaseUrl}/functions/v1/paperclip-agent-growth`,
          headers: {
          'x-founderlens-opportunity-id': opportunityId,
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'apikey': Deno.env.get('SUPABASE_ANON_KEY'),
        },
          timeoutSec: 120,
        },
        prompt: `You are the Growth Lead of ${productName}.\n\nTARGET USER: ${persona}\nPRIMARY CHANNEL: ${primaryCh}\n\nVALIDATED COMMUNITIES (from FounderLens research — start here):\n${research.sources?.analogousMarkets?.markets ? list(research.sources.analogousMarkets.markets) : list(channels)}\n${marketSizingSummary ? `\nMARKET SIZING (bound your targets against this):\n${marketSizingSummary}\n` : ''}${pricingSummary ? `\nPRICING RESEARCH:\n${pricingSummary}\n` : ''}\nEXPERIMENT FRAMEWORK (every experiment must have):\n- Hypothesis: If we [action], then [metric] will [change] because [reason]\n- Channel, Audience, Message, CTA, Success metric, Duration\n\nNever propose an experiment without a hypothesis. Never report results without a "what we learned" conclusion.`,
        budgetMonthlyCents: 200,
      }),
    ]);
    console.log(`Team created: CTO=${cto.id}, Engineer=${engineer.id}, CMO=${cmo.id}, Growth=${growth.id}`);

    // Branding Agent — runs once on first heartbeat to generate brand identity
    const branding = await pc('POST', `/companies/${companyId}/agents`, {
      name: 'Brand',
      role: 'general',
      title: `Brand & Identity Lead of ${productName}`,
      reportsTo: ceo.id,
      capabilities: `Brand naming, domain research, visual identity direction, brand voice guidelines, social handle strategy. Expert in startup branding for ${opp.target_market}.`,
      adapterType: 'http',
      adapterConfig: {
        url: `${supabaseUrl}/functions/v1/paperclip-agent-branding`,
        headers: {
          'x-founderlens-opportunity-id': opportunityId,
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'apikey': Deno.env.get('SUPABASE_ANON_KEY'),
        },
        timeoutSec: 120,
      },
      prompt: `You are the Brand & Identity Lead of ${productName}. Your first task is to generate a complete brand identity package: 3 name options with domain availability, taglines, brand voice, color palette, logo concept, and social handles. Post results as a structured issue. On subsequent heartbeats, refine based on founder feedback in issue comments.`,
      budgetMonthlyCents: 200,
    });
    console.log(`Brand agent: ${branding?.id || 'FAILED'}`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: Seed initial backlog issues
    // ─────────────────────────────────────────────────────────────────────────

    // MVP issues from must-haves
    const mvpIssues = mustHaves.slice(0, 5).map((feature: string, i: number) => ({
      title: feature,
      description: `## Feature: ${feature}\n\nThis feature was identified as a validated must-have by the FounderLens research engine.\n\n**Why it matters:**\n${painPoints[i] || `Addresses a core pain point for ${persona}`}\n\n**Acceptance criteria:**\n- Feature works end-to-end for the target user\n- No critical bugs at launch\n- At least 1 real user has tested it\n\n**Priority:** Build this before anything in the nice-to-have list.`,
      status: 'todo',
      priority: (i === 0 ? 'critical' : i === 1 ? 'high' : 'medium'), // valid: critical|high|medium|low
      projectId: mvpProject.id,
      goalId: goal.id,
      assigneeAgentId: cto.id,
    }));

    // Marketing issues from go-to-market channels
    const mktIssues = [
      {
        title: `Set up ${primaryCh} acquisition pipeline`,
        description: `## Task: Launch on ${primaryCh}\n\nThis is the most validated acquisition channel from the FounderLens research for ${productName}.\n\n**Goal:** Reach first 10 target users through this channel.\n\n**Target user:** ${persona}\n\n**Approach:**\n1. Identify the top 5 communities/places where this user hangs out\n2. Draft 3 outreach messages that lead with the problem (not the product)\n3. Post and track response rate\n4. Report learnings back as a comment on this issue`,
        status: 'todo',
        priority: 'high',
        projectId: marketingProject.id,
        goalId: goal.id,
        assigneeAgentId: cmo.id,
      },
      {
        title: 'Write positioning statement and landing page copy',
        description: `## Task: Positioning & Landing Copy\n\nWe win on specificity. Write positioning that speaks directly to ${persona}.\n\n**Unique differentiator:** ${differentiator}\n\n**Competitor we beat:** ${competitors[0]?.name || 'General alternatives'}\n**How:** ${competitors[0]?.gap || 'We go deeper for this specific user'}\n\n**Format needed:**\n- Headline (problem-led, not solution-led)\n- Sub-headline (who it's for + what outcome they get)\n- 3 feature bullets (each tied to a validated pain point)\n- CTA copy`,
        status: 'todo',
        priority: 'high',
        projectId: marketingProject.id,
        goalId: goal.id,
        assigneeAgentId: cmo.id,
      },
    ];

    // Next steps as ops issues
    const opsIssues = nextSteps.slice(0, 3).map((step: string) => ({
      title: step,
      description: `## Action Item: ${step}\n\nThis was identified as an immediate next step in the FounderLens Product Proposal for ${productName}.`,
      status: 'todo',
      priority: 'medium',
      projectId: opsProject.id,
      goalId: goal.id,
      assigneeAgentId: ceo.id,
    }));

    // Create all issues in parallel
    await Promise.all([
      ...mvpIssues.map(issue => pc('POST', `/companies/${companyId}/issues`, issue)),
      ...mktIssues.map(issue => pc('POST', `/companies/${companyId}/issues`, issue)),
      ...opsIssues.map(issue => pc('POST', `/companies/${companyId}/issues`, issue)),
    ]);
    console.log(`Seeded ${mvpIssues.length + mktIssues.length + opsIssues.length} backlog issues`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6: Inject skills (research context as company knowledge)
    // ─────────────────────────────────────────────────────────────────────────

    const marketResearchSkill = `# Market Research — ${productName}

Validated by FounderLens Research Engine
Composite Score: ${score}/100 | Community Data Points: ${dataPoints} | Date: ${new Date().toISOString().split('T')[0]}

## Evidence of Demand
${list(research.demandSignals)}

## Pain Points (from live community research)
${list(painPoints)}

## Competitor Landscape (community signal)
${competitors.map((c: any) => `- **${c.name}**: ${c.description}\n  Gap we exploit: ${c.gap}`).join('\n') || 'No direct competitors found — potential market gap.'}

## App Store Competitors
${compApps.map((a: any) => `- ${a.name} (${a.rating}★): ${(a.description || '').substring(0, 100)}`).join('\n') || 'No direct apps found.'}

## Market Gaps
${list(research.marketGaps)}

## Key Risks
${list(risks)}

---

## AI Market Intelligence

### Market Sizing
${blockify(marketIntel.marketSizing)}

### Competitor Analysis (AI)
${blockify(marketIntel.competitorAnalysis)}

### Pricing Research
${blockify(marketIntel.pricingResearch)}

### Trends Analysis
${blockify(marketIntel.trendsAnalysis)}

### SWOT Analysis
${blockify(marketIntel.swotAnalysis)}

## How to Use This Skill
- **CEO**: Use pain points to prioritize backlog. Highest-pain = built first. Use SWOT to guide strategic bets.
- **CMO**: Use community data to mirror how users talk. Reference the AI competitor analysis when positioning.
- **Growth**: Use market sizing to bound realistic targets. Use pricing research when proposing experiments.
- **Engineer**: Build must-haves in pain-point order, not feature-wishlist order. Align with trends where relevant.`;

    const proposalSkill = `# Product Proposal — ${productName}

## One-Liner
${oneLiner}

## Problem
${problem}

## Target User
${persona}

Pain points:
${list(painPoints)}

Currently using:
${list(proposal.targetUser?.currentAlternatives)}

## Solution
Core features:
${list(proposal.solution?.coreFeatures)}

Differentiator: ${differentiator}
Unfair advantage: ${unfairAdv}

## MVP Scope
Must have:
${list(mustHaves)}

Nice to have (v2+):
${list(proposal.mvpScope?.niceToHave)}

Out of scope:
${list(proposal.mvpScope?.outOfScope)}

## Monetization
Model: ${pricingModel}
Pricing: ${pricing}
Rationale: ${str(proposal.monetization?.rationale)}

## Go-to-Market
Primary channel: ${primaryCh}
All channels: ${channels.join(', ') || 'TBD'}
Launch strategy: ${str(proposal.goToMarket?.launchStrategy)}
First 30 days: ${str(proposal.goToMarket?.first30Days)}`;

    // Full validation snapshot — every fact on the confirmation page reachable to agents.
    const validationReportSkill = `# Validation Report — ${productName}

Generated: ${new Date().toISOString().split('T')[0]}

## Verdict
- Composite Score: ${score}/100${verdict ? ` (${verdict} signal)` : ''}
- Automated (AI) Score: ${workflow?.automated_score ?? 'N/A'}
- Community (Reddit) Score: ${research.researchScore ?? research.opportunityScore ?? 'N/A'}
- Recommendation: ${recommendation || 'N/A'}
- Workflow Status: ${workflow?.status || 'N/A'}

## Brief Summary
${str(research.briefSummary || research.analysis?.summary, 'Not available')}

## Community Research (Reddit + Web)

### Pain Points
${list(research.painPoints)}

### Demand Signals
${list(research.demandSignals)}

### Market Gaps
${list((research.marketGaps || []).map((g: any) => typeof g === 'string' ? g : g?.gap).filter(Boolean))}

### Risks
${list(research.risks)}

### Competitors
${competitors.map((c: any) => `- **${c.name}**: ${c.description || ''}\n  Gap: ${c.gap || ''}`).join('\n') || 'None found.'}

### App Store Competitors
${compApps.map((a: any) => `- ${a.name} (${a.rating}★): ${(a.description || '').substring(0, 120)}`).join('\n') || 'None found.'}

### Web Citations
${(research.webCitations || []).map((c: any) => `- [${c.title || 'source'}](${c.url || ''})`).join('\n') || 'None.'}

### Data Quality
- Quality: ${research.dataQuality || 'moderate'}
- Total data points: ${dataPoints}

### Full Report
${str(research.fullReport, 'Not available')}

---

## AI Market Intelligence

### Confidence Score
${marketIntel.confidenceScore ?? 'N/A'}

### Market Sizing
${blockify(marketIntel.marketSizing)}

### Competitor Analysis
${blockify(marketIntel.competitorAnalysis)}

### Pricing Research
${blockify(marketIntel.pricingResearch)}

### Trends Analysis
${blockify(marketIntel.trendsAnalysis)}

### SWOT Analysis
${blockify(marketIntel.swotAnalysis)}

## How to Use This Skill
Any agent can consult this skill when a decision needs grounding in validation evidence.
Citations from here are the most authoritative source of ground truth for this company.`;

    await Promise.all([
      pc('POST', `/companies/${companyId}/skills`, {
        name: 'Market Research',
        content: marketResearchSkill,
        agentIds: [ceo.id, cto.id, engineer.id, cmo.id, growth.id],
      }).catch(() => console.log('Skills endpoint not available — skipping')),
      pc('POST', `/companies/${companyId}/skills`, {
        name: 'Product Proposal',
        content: proposalSkill,
        agentIds: [ceo.id, cto.id, engineer.id, cmo.id, growth.id],
      }).catch(() => console.log('Skills endpoint not available — skipping')),
      pc('POST', `/companies/${companyId}/skills`, {
        name: 'Validation Report',
        content: validationReportSkill,
        agentIds: [ceo.id, cto.id, engineer.id, cmo.id, growth.id],
      }).catch(() => console.log('Skills endpoint not available — skipping')),
    ]);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7: Persist to Supabase
    // ─────────────────────────────────────────────────────────────────────────
    const companyUrl = `${Deno.env.get('PAPERCLIP_API_URL')}/${companyPrefix}/dashboard`;

    await serviceSupabase
      .from('validation_workflows')
      .update({
        paperclip_company_id: companyId,
        paperclip_launched_at: new Date().toISOString(),
        paperclip_company_url: companyUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('opportunity_id', opportunityId);

    console.log(`\n✓ AI company launched: ${productName} (${companyId})`);

    // Fire an immediate agent round so the branding package, first engineering
    // spec, and first marketing draft appear within ~60s of launch. Not awaited:
    // agent runs can take 30-90s and we don't want to delay the UI response.
    // Paperclip's own heartbeat (default 3600s) + the 5-minute pg_cron tick will
    // keep things moving from here on.
    fetch(`${supabaseUrl}/functions/v1/paperclip-agent-tick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') ?? ''}`,
      },
      body: JSON.stringify({
        mode: 'one',
        companyId,
        opportunityId,
        wakeReason: 'initial-launch',
      }),
    }).catch(err => console.error('Initial agent tick failed (non-fatal):', err));

    return new Response(JSON.stringify({
      success: true,
      companyId,
      companyUrl,
      companyName: productName,
      agentCount: 6,
      issueCount: mvpIssues.length + mktIssues.length + opsIssues.length,
      projectCount: 3,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('launch-to-paperclip error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Launch failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
