import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Paperclip REST helper ────────────────────────────────────────────────────

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
    const text = await res.text();
    throw new Error(`Paperclip ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

function list(arr?: string[], fallback = 'None found'): string {
  if (!arr || arr.length === 0) return fallback;
  return arr.map(s => `- ${s}`).join('\n');
}

// ─── Main handler ─────────────────────────────────────────────────────────────
//
// Called by validate-opportunity-research after writing new research to DB.
// Finds the company's CEO agent, creates a "New Research Signals" briefing
// issue, then triggers the CEO heartbeat so the agent wakes immediately.
//
// Body: { opportunityId, researchSummary }
// ─────────────────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { opportunityId, researchSummary } = await req.json();
    if (!opportunityId) {
      return new Response(JSON.stringify({ error: 'opportunityId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ── Look up the Paperclip company for this opportunity ───────────────────
    const { data: workflow } = await serviceSupabase
      .from('validation_workflows')
      .select('paperclip_company_id, reddit_validation_results')
      .eq('opportunity_id', opportunityId)
      .maybeSingle();

    if (!workflow?.paperclip_company_id) {
      // No AI company launched yet — nothing to notify
      return new Response(JSON.stringify({ skipped: true, reason: 'No AI company launched for this opportunity' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const companyId = workflow.paperclip_company_id;
    const research  = workflow.reddit_validation_results || {};

    // ── Look up the CEO agent ────────────────────────────────────────────────
    const agents = await pc('GET', `/companies/${companyId}/agents`);
    const ceo = agents.find((a: any) => a.role === 'ceo' || a.name === 'CEO');
    if (!ceo) {
      console.warn(`No CEO agent found in company ${companyId}`);
      return new Response(JSON.stringify({ skipped: true, reason: 'CEO agent not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Get company goals to link the briefing issue ─────────────────────────
    const goals = await pc('GET', `/companies/${companyId}/goals`);
    const activeGoal = goals.find((g: any) => g.status === 'active') || goals[0];

    // ── Build the research briefing ──────────────────────────────────────────
    const score       = research.opportunityScore || 0;
    const verdict     = research.verdict || 'moderate';
    const dataPoints  = research.totalDataPoints || 0;
    const demandSignals = research.demandSignals || [];
    const painPoints    = research.painPoints || [];
    const marketGaps    = research.marketGaps || [];
    const risks         = research.risks || [];
    const researchedAt  = research.researchedAt
      ? new Date(research.researchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : new Date().toLocaleDateString();

    const scoreEmoji = score >= 70 ? '🟢' : score >= 45 ? '🟡' : '🔴';

    const briefingBody = `## New Community Research Signals

FounderLens just completed a fresh research run for this opportunity.

**${scoreEmoji} Opportunity Score: ${score}/100 (${verdict}) · ${dataPoints} data points · ${researchedAt}**

${researchSummary ? `### Summary\n${researchSummary}\n` : ''}

### Evidence of Demand
${list(demandSignals)}

### Pain Points (from live community data)
${list(painPoints)}

### Market Gaps
${list(marketGaps)}

### Updated Risks
${list(risks)}

---

### CEO Action Required

Based on this updated research, review the current backlog and:
1. Reprioritize any MVP tasks that map to newly confirmed pain points
2. Brief the CMO on updated demand signals for campaign positioning
3. Flag any new risks to the team
4. Update the company goal status if signal strength has changed significantly

@CTO @CMO please review and adjust your current sprint based on this new data.`;

    // ── Create the briefing issue in Paperclip ───────────────────────────────
    const issue = await pc('POST', `/companies/${companyId}/issues`, {
      title: `📡 New Research Signals — ${researchedAt} (Score: ${score}/100)`,
      description: briefingBody,
      status: 'todo',
      priority: score >= 70 ? 'high' : 'medium',
      assigneeAgentId: ceo.id,
      ...(activeGoal ? { goalId: activeGoal.id } : {}),
    });
    console.log(`Created briefing issue: ${issue.id}`);

    // ── Trigger CEO heartbeat immediately ────────────────────────────────────
    // This wakes the CEO agent so it processes the new research right now
    // rather than waiting for the next scheduled heartbeat.
    let heartbeatTriggered = false;
    try {
      await pc('POST', `/agents/${ceo.id}/heartbeat/invoke`);
      heartbeatTriggered = true;
      console.log(`CEO heartbeat triggered for agent ${ceo.id}`);
    } catch (hbErr) {
      // Heartbeat invoke is best-effort — the issue is created either way
      console.warn('Heartbeat invoke failed (non-fatal):', hbErr);
    }

    return new Response(JSON.stringify({
      success: true,
      companyId,
      ceoAgentId: ceo.id,
      briefingIssueId: issue.id,
      heartbeatTriggered,
      opportunityScore: score,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('notify-ceo-new-signals error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Notification failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
