/**
 * FounderLens × Paperclip — Engineer Agent Runtime
 *
 * Works assigned tasks. Produces: implementation specs, code scaffolding,
 * architecture docs. Posts output as structured comments. Never silently stalls.
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

    console.log(`Engineer heartbeat — company: ${companyId}, task: ${context.taskId}`);

    const pc = new PaperclipClient(runId);
    const ctx = await loadAgentContext(
      pc, runId, agentId, companyId,
      context.taskId, context.wakeReason || 'scheduled',
      opportunityId
    );

    const proposal = ctx.proposal;
    const research = ctx.research;
    const productName = proposal.productName || ctx.company.name;

    // Load the specific task if triggered by one
    let currentTask: any = null;
    if (context.taskId) {
      try { currentTask = await pc.getIssue(context.taskId); } catch { /* ignore */ }
    }

    // Pick highest-priority unworked task if no specific task
    if (!currentTask && ctx.myIssues.length > 0) {
      const priority = ['urgent', 'high', 'medium', 'low'];
      currentTask = ctx.myIssues
        .filter((i: any) => i.status === 'todo')
        .sort((a: any, b: any) => priority.indexOf(a.priority) - priority.indexOf(b.priority))[0]
        || ctx.myIssues[0];
    }

    const systemPrompt = `You are the Lead Engineer of ${productName}.

YOUR JOB this heartbeat:
- Work on your assigned task and produce a REAL, CONCRETE output
- Output must be one of: (1) full implementation plan, (2) code scaffolding, (3) architecture doc
- Post the output as a structured comment and mark the issue done or blocked

OUTPUT FORMAT for implementation tasks:
## Implementation Plan
[Step-by-step approach with specific files, functions, and data models]

## Code Scaffolding
\`\`\`typescript
// Actual code or pseudocode with the key logic
\`\`\`

## Key Technical Decisions
[What you chose and why]

## Acceptance Criteria Check
[Confirm each criterion from the issue description]

## Blockers
[Anything you need from CTO before continuing, or "None"]

RULES:
- Never mark done without a concrete output posted
- If blocked, post exactly what you need and mark as blocked
- Use the product context to make opinionated decisions — don't hedge

Return JSON only.`;

    const userPrompt = `You are engineering ${productName}.

## Your Current Task
${currentTask ? `
Title: "${currentTask.title}"
Status: ${currentTask.status}
Priority: ${currentTask.priority}
Description: ${currentTask.description || 'No description provided'}
` : 'No specific task assigned. Pick the most important todo from your queue.'}

## Your Full Queue (${ctx.myIssues.length} issues)
${formatIssueList(ctx.myIssues)}

## Product Context
One-liner: ${proposal.oneLiner || ctx.company.description}
Target user: ${proposal.targetUser?.persona || 'Not defined'}
Differentiator: ${proposal.solution?.uniqueDifferentiator || 'Not defined'}
MVP must-haves: ${(proposal.mvpScope?.mustHave || []).slice(0, 3).join(', ')}

## Technical Knowledge
${formatSkills(ctx.skills)}

Now produce your output. Return JSON:
{
  "reasoning": "What task are you working on and what approach did you choose?",
  "actions": [
    {
      "type": "add_comment | update_issue | create_issue | no_action",
      "issueId": "${currentTask?.id || 'REQUIRED'}",
      "comment": "## Implementation Plan\\n...\\n## Code Scaffolding\\n\`\`\`typescript\\n...\\n\`\`\`\\n## Key Technical Decisions\\n...\\n## Acceptance Criteria Check\\n...\\n## Blockers\\nNone",
      "status": "done | blocked | in_progress",
      "title": "issue title (for create_issue only)",
      "description": "description (for create_issue only)",
      "reason": "reason for no_action"
    }
  ],
  "summary": "1-2 sentences: what did you build or spec this heartbeat?"
}`;

    const thought = await thinkAndAct(systemPrompt, userPrompt, 3000);
    const actionLog = await executeActions(pc, ctx, thought);

    console.log(`Engineer done. Actions: ${actionLog.length}. Summary: ${thought.summary}`);

    return new Response(JSON.stringify({
      success: true, agentId, role: 'engineer',
      summary: thought.summary, actionsExecuted: actionLog,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Engineer agent error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
