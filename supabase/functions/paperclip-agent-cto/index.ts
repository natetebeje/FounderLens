/**
 * FounderLens × Paperclip — CTO Agent Runtime
 *
 * Breaks down MVP must-haves into engineering tasks, estimates complexity,
 * writes ADRs, and ensures the Engineer always has clear work to do.
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

    console.log(`CTO heartbeat — company: ${companyId}, wake: ${context.wakeReason}`);

    const pc = new PaperclipClient(runId);
    const ctx = await loadAgentContext(
      pc, runId, agentId, companyId,
      context.taskId, context.wakeReason || 'scheduled',
      opportunityId
    );

    const proposal = ctx.proposal;
    const research = ctx.research;
    const productName = proposal.productName || ctx.company.name;
    const mustHaves = proposal.mvpScope?.mustHave || research.demandSignals?.slice(0, 4) || [];
    const outOfScope = proposal.mvpScope?.outOfScope || [];

    const engineerAgent = ctx.agents.find((a: any) => a.name === 'Engineer');
    const engineerIssues = ctx.openIssues.filter((i: any) =>
      i.assigneeAgentId === engineerAgent?.id
    );

    const systemPrompt = `You are the CTO of ${productName}.

YOUR RESPONSIBILITIES this heartbeat:
1. Review Engineer's queue — if they have fewer than 2 clear tasks, break down a must-have into a specific, actionable issue
2. If a task is vague (no acceptance criteria), add a clarifying comment with specific requirements
3. Write an ADR (Architecture Decision Record) as an issue comment when making significant technical decisions
4. Keep scope locked — if any issue is out of scope for V1, comment to defer it
5. Prioritize by pain point intensity — the most validated pain point gets built first

ENGINEERING PRINCIPLES:
- Always prefer the simplest stack that can ship fastest
- Every engineering issue must have: what to build, acceptance criteria, edge cases
- No premature optimization — get it working first, then optimize with data

Return JSON only.`;

    const userPrompt = `State of ${productName} engineering:

## MVP Must-Haves (build in this order)
${mustHaves.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n') || 'None defined yet'}

## Out of Scope V1
${outOfScope.map((f: string) => `- ${f}`).join('\n') || 'None defined'}

## Engineer's Current Queue (${engineerIssues.length} issues)
${formatIssueList(engineerIssues)}

## My Queue (${ctx.myIssues.length} issues)
${formatIssueList(ctx.myIssues)}

## All Open Issues (${ctx.openIssues.length} total)
${formatIssueList(ctx.openIssues, 10)}

## Product Context
Target user: ${proposal.targetUser?.persona || research.painPoints?.[0] || 'Not defined'}
Differentiator: ${proposal.solution?.uniqueDifferentiator || 'Not defined'}

## Technical Knowledge
${formatSkills(ctx.skills)}

## Wake Reason: ${context.wakeReason || 'Scheduled'}

Decide what to do. Return JSON:
{
  "reasoning": "What did you observe? Why are you taking these specific actions?",
  "actions": [
    {
      "type": "create_issue | update_issue | add_comment | no_action",
      "title": "Specific engineering task title (for create_issue)",
      "description": "Markdown with: ## What to Build, ## Acceptance Criteria, ## Edge Cases to Handle, ## Technical Notes",
      "priority": "urgent | high | medium | low",
      "assigneeAgentName": "Engineer | CTO",
      "projectName": "MVP",
      "issueId": "id (for update/comment)",
      "comment": "ADR or clarification in markdown",
      "reason": "reason for no_action"
    }
  ],
  "summary": "1-2 sentence plain-english summary of what you did"
}`;

    const thought = await thinkAndAct(systemPrompt, userPrompt, 2000);
    const actionLog = await executeActions(pc, ctx, thought);

    console.log(`CTO done. Actions: ${actionLog.length}. Summary: ${thought.summary}`);

    return new Response(JSON.stringify({
      success: true, agentId, role: 'cto',
      summary: thought.summary, actionsExecuted: actionLog,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('CTO agent error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
