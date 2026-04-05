/**
 * FounderLens × Paperclip — Growth Agent Runtime
 *
 * Designs and reports on acquisition experiments. Every experiment must have
 * a hypothesis. Every report must have a "what we learned" conclusion.
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

    console.log(`Growth heartbeat — company: ${companyId}, wake: ${context.wakeReason}`);

    const pc = new PaperclipClient(runId);
    const ctx = await loadAgentContext(
      pc, runId, agentId, companyId,
      context.taskId, context.wakeReason || 'scheduled',
      opportunityId
    );

    const proposal = ctx.proposal;
    const research = ctx.research;
    const productName = proposal.productName || ctx.company.name;
    const persona = proposal.targetUser?.persona || 'target user';
    const primaryChannel = proposal.goToMarket?.primaryChannel || 'community';
    const channels = proposal.goToMarket?.channels || [];
    const communities = research.sources?.analogousMarkets?.markets || channels;

    let currentTask: any = null;
    if (context.taskId) {
      try { currentTask = await pc.getIssue(context.taskId); } catch { /* ignore */ }
    }
    if (!currentTask && ctx.myIssues.length > 0) {
      currentTask = ctx.myIssues.find((i: any) => i.status === 'todo') || ctx.myIssues[0];
    }

    const systemPrompt = `You are the Growth Lead of ${productName}.

TARGET USER: ${persona}
PRIMARY CHANNEL: ${primaryChannel}

YOUR JOB this heartbeat:
- Design one specific acquisition experiment OR report results of a running experiment
- Every experiment MUST have a hypothesis in this format:
  "If we [action], then [metric] will [change] because [reason]"
- Every result report MUST include "What we learned" with an actionable conclusion

VALIDATED COMMUNITIES (from FounderLens research — start here):
${communities.length > 0 ? communities.map((c: string) => `- ${c}`).join('\n') : '- See research data for target communities'}

EXPERIMENT FRAMEWORK (required fields):
- Hypothesis
- Channel (specific platform/community/subreddit)
- Target audience (more specific than just the persona)
- Message (what we say — lead with the problem)
- CTA (one action we want them to take)
- Success metric (specific number, e.g. "5 beta signups in 7 days")
- Duration
- How to measure

Return JSON only.`;

    const userPrompt = `Growth state for ${productName}:

## Current Task
${currentTask ? `
Title: "${currentTask.title}"
Description: ${(currentTask.description || '').slice(0, 400)}
` : 'No specific task. Design the highest-impact acquisition experiment for this stage.'}

## My Queue (${ctx.myIssues.length} issues)
${formatIssueList(ctx.myIssues)}

## Research Data
Pain points:
${(proposal.targetUser?.painPoints || research.painPoints || []).map((p: string) => `- ${p}`).join('\n')}

Demand signals:
${(research.demandSignals || []).map((d: string) => `- ${d}`).join('\n')}

Channels validated by research:
${channels.map((c: string) => `- ${c}`).join('\n') || 'None specified'}

## Company Context
${formatSkills(ctx.skills)}

## Wake Reason: ${context.wakeReason || 'Scheduled'}

Design your experiment or report results. Return JSON:
{
  "reasoning": "What experiment are you designing/reporting and why is it the highest-priority thing?",
  "actions": [
    {
      "type": "add_comment | create_issue | update_issue | no_action",
      "issueId": "${currentTask?.id || ''}",
      "comment": "## Experiment: [Name]\\n\\n**Hypothesis:** If we [action], then [metric] will [change] because [reason]\\n\\n**Channel:** [specific]\\n**Audience:** [specific]\\n**Message:** [what we say]\\n**CTA:** [one action]\\n**Success metric:** [specific number]\\n**Duration:** [X days]\\n**How to measure:** [specific tracking method]\\n\\n## What we learned (if reporting results)\\n[Conclusion + next action]",
      "status": "done | in_progress | todo",
      "title": "Experiment: [Name] (for create_issue)",
      "description": "Full experiment brief",
      "priority": "high | medium",
      "projectName": "Marketing",
      "assigneeAgentName": "Growth | CMO",
      "reason": "reason for no_action"
    }
  ],
  "summary": "1-2 sentences: what experiment did you design or what did you learn?"
}`;

    const thought = await thinkAndAct(systemPrompt, userPrompt, 2000);
    const actionLog = await executeActions(pc, ctx, thought);

    console.log(`Growth done. Actions: ${actionLog.length}. Summary: ${thought.summary}`);

    return new Response(JSON.stringify({
      success: true, agentId, role: 'growth',
      summary: thought.summary, actionsExecuted: actionLog,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Growth agent error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
