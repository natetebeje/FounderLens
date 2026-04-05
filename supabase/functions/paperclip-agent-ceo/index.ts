/**
 * FounderLens × Paperclip — CEO Agent Runtime
 *
 * Wakes on Paperclip heartbeat. Reviews the company state,
 * delegates work, posts OKR updates, and keeps the team unblocked.
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

    console.log(`CEO heartbeat — company: ${companyId}, wake: ${context.wakeReason}`);

    const pc = new PaperclipClient(runId);
    const ctx = await loadAgentContext(
      pc, runId, agentId, companyId,
      context.taskId, context.wakeReason || 'scheduled',
      opportunityId
    );

    // ── Build system prompt ────────────────────────────────────────────────────
    const proposal = ctx.proposal;
    const research = ctx.research;
    const productName = proposal.productName || ctx.company.name || 'the product';
    const oneLiner = proposal.oneLiner || ctx.company.description || '';
    const score = research.opportunityScore || 0;

    const ctoAgent = ctx.agents.find((a: any) => a.name === 'CTO');
    const cmoAgent = ctx.agents.find((a: any) => a.name === 'CMO');
    const engineerAgent = ctx.agents.find((a: any) => a.name === 'Engineer');
    const growthAgent = ctx.agents.find((a: any) => a.name === 'Growth');

    const ctoIssues = ctx.openIssues.filter((i: any) => i.assigneeAgentId === ctoAgent?.id);
    const cmoIssues = ctx.openIssues.filter((i: any) => i.assigneeAgentId === cmoAgent?.id);
    const engineerIssues = ctx.openIssues.filter((i: any) => i.assigneeAgentId === engineerAgent?.id);

    const systemPrompt = `You are the CEO of ${productName} — an early-stage SaaS startup.

MISSION: ${oneLiner}
RESEARCH SCORE: ${score}/100

YOUR RESPONSIBILITIES this heartbeat:
1. Review the open backlog — is the team working on the right things?
2. If CTO has fewer than 2 open issues, create a new engineering task from the MVP must-haves
3. If CMO has fewer than 2 open issues, create a new marketing/content task
4. If any issue has been in_progress for too long with no update, add a check-in comment
5. Post a brief OKR status update on the company goal (weekly, on Monday heartbeats)
6. If the wake reason is a new research signal briefing, acknowledge it and reprioritize

DECISION RULES:
- Always prefer the highest-pain-point feature next, not the most technically interesting
- Don't create more than 3 new issues per heartbeat — quality over quantity
- Mark tasks done only when they have a concrete output (spec, code, copy) posted as a comment
- Budget is $20/month — flag if you see unusual activity

Return JSON only.`;

    const userPrompt = `Current company state for ${productName}:

## Company Goal
${ctx.activeGoal ? `"${ctx.activeGoal.title}" (${ctx.activeGoal.status})` : 'No active goal found'}

## Open Backlog (${ctx.openIssues.length} total)
CTO's issues (${ctoIssues.length}):
${formatIssueList(ctoIssues)}

CMO's issues (${cmoIssues.length}):
${formatIssueList(cmoIssues)}

Engineer's issues (${engineerIssues.length}):
${formatIssueList(engineerIssues)}

My issues (${ctx.myIssues.length}):
${formatIssueList(ctx.myIssues)}

## Wake Reason
${context.wakeReason || 'Scheduled heartbeat'}
${context.taskId ? `Triggered by issue: ${context.taskId}` : ''}

## Company Knowledge
${formatSkills(ctx.skills)}

## MVP Must-Haves (validated)
${(proposal.mvpScope?.mustHave || research.demandSignals || []).map((f: string) => `- ${f}`).join('\n') || 'Not yet defined'}

## Key Pain Points to Solve
${(proposal.targetUser?.painPoints || research.painPoints || []).map((p: string) => `- ${p}`).join('\n') || 'Not yet defined'}

Now decide what to do. Return JSON:
{
  "reasoning": "2-3 sentences on what you observed and why you're taking these actions",
  "actions": [
    {
      "type": "create_issue | update_issue | add_comment | update_goal | no_action",
      "title": "issue title (for create_issue)",
      "description": "detailed markdown description (for create_issue)",
      "priority": "urgent | high | medium | low",
      "assigneeAgentName": "CTO | Engineer | CMO | Growth | CEO",
      "projectName": "MVP | Marketing | Operations",
      "issueId": "id (for update_issue or add_comment)",
      "status": "todo | in_progress | done | blocked",
      "comment": "comment body in markdown",
      "goalStatus": "active | achieved | planned",
      "reason": "reason for no_action"
    }
  ],
  "summary": "1-2 sentence plain-english summary of what you did this heartbeat"
}`;

    const thought = await thinkAndAct(systemPrompt, userPrompt, 2000);
    const actionLog = await executeActions(pc, ctx, thought);

    console.log(`CEO done. Actions: ${actionLog.length}. Summary: ${thought.summary}`);

    return new Response(JSON.stringify({
      success: true,
      agentId,
      role: 'ceo',
      summary: thought.summary,
      reasoning: thought.reasoning,
      actionsExecuted: actionLog,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('CEO agent error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
