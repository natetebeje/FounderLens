/**
 * FounderLens × Paperclip — CMO Agent Runtime
 *
 * Drafts content, writes positioning copy, plans campaigns, and proposes
 * acquisition experiments grounded in the FounderLens research data.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, PaperclipClient, loadAgentContext,
  thinkAndAct, executeActions, formatIssueList, formatSkills,
} from '../_shared/agent-runtime.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { runId, agentId, companyId, context = {} } = body;
    const opportunityId = req.headers.get('x-founderlens-opportunity-id') || undefined;

    console.log(`CMO heartbeat — company: ${companyId}, wake: ${context.wakeReason}`);

    const pc = new PaperclipClient(runId);
    const ctx = await loadAgentContext(
      pc, runId, agentId, companyId,
      context.taskId, context.wakeReason || 'scheduled',
      opportunityId
    );

    const proposal = ctx.proposal;
    const research = ctx.research;
    const productName = proposal.productName || ctx.company.name;
    const persona = proposal.targetUser?.persona || research.painPoints?.[0] || 'target user';
    const primaryChannel = proposal.goToMarket?.primaryChannel || 'community forums';
    const differentiator = proposal.solution?.uniqueDifferentiator || '';
    const competitors = (research.competitors || []).slice(0, 3);
    const painPoints = proposal.targetUser?.painPoints || research.painPoints || [];

    // Load specific task if triggered
    let currentTask: any = null;
    if (context.taskId) {
      try { currentTask = await pc.getIssue(context.taskId); } catch { /* ignore */ }
    }
    if (!currentTask && ctx.myIssues.length > 0) {
      currentTask = ctx.myIssues.find((i: any) => i.status === 'todo') || ctx.myIssues[0];
    }

    const systemPrompt = `You are the CMO of ${productName}.

YOUR TARGET USER: ${persona}
PRIMARY CHANNEL: ${primaryChannel}
OUR DIFFERENTIATOR: ${differentiator}

YOUR JOB this heartbeat:
- Produce ONE complete, ready-to-use marketing output — not a plan, the actual content
- Outputs: Reddit post, Twitter thread, landing page copy, email sequence, positioning statement, or campaign brief
- Ground every piece of content in the validated research data (pain points, competitor gaps)

CONTENT RULES:
- Lead with the PROBLEM, not the solution — your user needs to feel understood first
- Use the exact language your target users use (from the research data)
- Reference specific competitor gaps: "Unlike [X], we..." converts better than generic claims
- Every piece must pass: "Would my target user share this?" test
- No corporate jargon, no "leverage", no "synergy"

COMPETITOR GAPS TO REFERENCE:
${competitors.map((c: any) => `- vs ${c.name}: ${c.gap}`).join('\n') || 'See research data'}

Return JSON only.`;

    const userPrompt = `Marketing state for ${productName}:

## Your Current Task
${currentTask ? `
Title: "${currentTask.title}"
Description: ${(currentTask.description || '').slice(0, 400)}
` : 'No specific task. Produce the most impactful content piece for this stage.'}

## Your Queue (${ctx.myIssues.length} issues)
${formatIssueList(ctx.myIssues)}

## Validated Pain Points (use this language)
${painPoints.map((p: string) => `- ${p}`).join('\n') || 'See research data'}

## Demand Signals
${(research.demandSignals || []).map((d: string) => `- ${d}`).join('\n') || 'See research data'}

## Research & Proposal Context
${formatSkills(ctx.skills)}

## Wake Reason: ${context.wakeReason || 'Scheduled'}

Produce your content output. Return JSON:
{
  "reasoning": "What content are you creating and why is it the highest-impact thing to do right now?",
  "actions": [
    {
      "type": "add_comment | create_issue | update_issue | no_action",
      "issueId": "${currentTask?.id || ''}",
      "comment": "## Content Output\\n\\n[Full ready-to-use content piece — not a brief, the actual content]\\n\\n## Why This Will Work\\n[1-2 sentences grounded in research]\\n\\n## Where to Post\\n[Specific subreddits, channels, or platforms]\\n\\n## Success Metric\\n[How we'll know if this worked]",
      "status": "done | in_progress",
      "title": "issue title (for create_issue)",
      "description": "marketing task description",
      "priority": "high | medium",
      "assigneeAgentName": "CMO | Growth",
      "projectName": "Marketing",
      "reason": "reason for no_action"
    }
  ],
  "summary": "1-2 sentences: what content did you create this heartbeat?"
}`;

    const thought = await thinkAndAct(systemPrompt, userPrompt, 2500);
    const actionLog = await executeActions(pc, ctx, thought);

    console.log(`CMO done. Actions: ${actionLog.length}. Summary: ${thought.summary}`);

    return new Response(JSON.stringify({
      success: true, agentId, role: 'cmo',
      summary: thought.summary, actionsExecuted: actionLog,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('CMO agent error:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message, summary: `CMO error: ${err.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
