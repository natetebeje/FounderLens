/**
 * FounderLens × Paperclip — Engineer Agent Runtime (v2)
 *
 * On every heartbeat:
 * 1. Reads assigned tasks from Paperclip
 * 2. Calls GPT-4o with full codebase context to generate code
 * 3. Opens a GitHub PR on natetebeje/FounderLens with the generated files
 * 4. Posts the PR link as a comment on the Paperclip issue
 * 5. Marks the issue done (or blocked with a specific question)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders,
  PaperclipClient,
  loadAgentContext,
  formatIssueList,
  formatSkills,
} from '../_shared/agent-runtime.ts';

// ─── GitHub API client ────────────────────────────────────────────────────────

const GITHUB_REPO = 'natetebeje/FounderLens';
const GITHUB_API  = 'https://api.github.com';

async function gh(method: string, path: string, body?: object): Promise<any> {
  const token = Deno.env.get('GITHUB_TOKEN');
  if (!token) throw new Error('GITHUB_TOKEN not set in Supabase secrets');

  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'FounderLens-Engineer-Agent/1.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub ${method} ${path} → ${res.status}: ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

// ─── Get existing file SHA (needed for updates) ───────────────────────────────

async function getFileSha(filePath: string, branch: string): Promise<string | null> {
  try {
    const data = await gh('GET', `/repos/${GITHUB_REPO}/contents/${filePath}?ref=${branch}`);
    return data.sha || null;
  } catch {
    return null; // file doesn't exist yet — creating new
  }
}

// ─── Encode content to base64 for GitHub API ─────────────────────────────────

function toBase64(content: string): string {
  return btoa(unescape(encodeURIComponent(content)));
}

// ─── Create branch, commit files, open PR ────────────────────────────────────

interface FileChange {
  path: string;
  content: string;
}

async function openPR(opts: {
  branchName: string;
  title: string;
  body: string;
  files: FileChange[];
}): Promise<{ prUrl: string; prNumber: number }> {
  // 1. Get HEAD SHA of main
  const refData = await gh('GET', `/repos/${GITHUB_REPO}/git/ref/heads/main`);
  const headSha = refData.object.sha;

  // 2. Create branch
  await gh('POST', `/repos/${GITHUB_REPO}/git/refs`, {
    ref: `refs/heads/${opts.branchName}`,
    sha: headSha,
  });

  // 3. Commit each file to the branch
  for (const file of opts.files) {
    const existingSha = await getFileSha(file.path, opts.branchName);
    await gh('PUT', `/repos/${GITHUB_REPO}/contents/${file.path}`, {
      message: opts.title,
      content: toBase64(file.content),
      branch: opts.branchName,
      ...(existingSha ? { sha: existingSha } : {}),
    });
  }

  // 4. Open PR
  const pr = await gh('POST', `/repos/${GITHUB_REPO}/pulls`, {
    title: opts.title,
    body: opts.body,
    head: opts.branchName,
    base: 'main',
  });

  return { prUrl: pr.html_url, prNumber: pr.number };
}

// ─── GPT-4o code generator ────────────────────────────────────────────────────

async function generateCode(
  task: { title: string; description: string },
  context: {
    productName: string;
    codemapSkill: string;
    architectureSkill: string;
    githubSkill: string;
    openIssues: any[];
  },
  apiKey: string
): Promise<{
  reasoning: string;
  files: FileChange[];
  prTitle: string;
  prBody: string;
  branchName: string;
  isBlocked: boolean;
  blockerQuestion?: string;
}> {
  const prompt = `You are the Lead Engineer of ${context.productName}, a SaaS platform.

You have the full codebase map, architecture guide, and GitHub workflow below.
Your job is to implement the assigned task and return the complete file contents.

## TASK
Title: "${task.title}"
Description: ${task.description || 'No additional description provided.'}

## CODEBASE MAP
${context.codemapSkill.slice(0, 3000)}

## ARCHITECTURE RULES
${context.architectureSkill.slice(0, 3000)}

## GITHUB WORKFLOW
${context.githubSkill.slice(0, 1500)}

## INSTRUCTIONS
1. Analyze the task. If it's too vague or risky (touches auth, billing, or needs info you don't have), set isBlocked=true and ask ONE specific question.
2. If you can implement it, generate the complete file(s) with production-quality code.
3. Follow ALL architecture rules — shadcn/ui components, theme-aware colors, correct import paths.
4. For new React components: use Card, Button, Badge from shadcn/ui. Use text-foreground/text-muted-foreground (never text-white).
5. For new Edge Functions: follow the Deno TypeScript template exactly.
6. Branch name: feat/TASK-NAME-IN-KEBAB-CASE (max 40 chars, lowercase, hyphens only).

Return JSON only:
{
  "reasoning": "2-3 sentences explaining your approach",
  "isBlocked": false,
  "blockerQuestion": null,
  "branchName": "feat/...",
  "prTitle": "feat: ...",
  "prBody": "## What this PR does\\n...\\n## Changes\\n- file.tsx — description\\n## Testing\\n...\\nGenerated by FounderLens Engineer Agent",
  "files": [
    {
      "path": "src/components/MyComponent.tsx",
      "content": "import React from 'react';\\n// full file content here..."
    }
  ]
}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { runId, agentId, companyId, context = {} } = body;
    const opportunityId = req.headers.get('x-founderlens-opportunity-id') || undefined;

    console.log(`Engineer heartbeat — company: ${companyId}, task: ${context.taskId}`);

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const pc = new PaperclipClient(runId);
    const ctx = await loadAgentContext(
      pc, runId, agentId, companyId,
      context.taskId, context.wakeReason || 'scheduled',
      opportunityId
    );

    const proposal = ctx.proposal;
    const productName = proposal.productName || ctx.company.name || 'FounderLens';

    // Find current task
    let currentTask: any = null;
    if (context.taskId) {
      try { currentTask = await pc.getIssue(context.taskId); } catch { /* ignore */ }
    }
    // Pick highest-priority todo if no specific task
    if (!currentTask && ctx.myIssues.length > 0) {
      const priority = ['critical', 'high', 'medium', 'low'];
      currentTask = ctx.myIssues
        .filter((i: any) => i.status === 'todo')
        .sort((a: any, b: any) =>
          priority.indexOf(a.priority) - priority.indexOf(b.priority)
        )[0] || ctx.myIssues[0];
    }

    if (!currentTask) {
      return new Response(JSON.stringify({
        success: true, agentId, role: 'engineer',
        summary: 'No tasks assigned. Waiting for CTO to create engineering issues.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Working on: "${currentTask.title}"`);

    // Extract skill content
    const codemapSkill = ctx.skills.find((s: any) =>
      s.name === 'codebase-map' || s.name === 'Codebase Map'
    )?.content || '';
    const architectureSkill = ctx.skills.find((s: any) =>
      s.name === 'architecture' || s.name === 'Architecture'
    )?.content || '';
    const githubSkill = ctx.skills.find((s: any) =>
      s.name === 'github-workflow' || s.name === 'GitHub Workflow'
    )?.content || '';

    // Mark issue in_progress
    try {
      await pc.updateIssue(currentTask.id, { status: 'in_progress' });
    } catch { /* non-fatal */ }

    // Generate code with GPT-4o
    const result = await generateCode(
      { title: currentTask.title, description: currentTask.description || '' },
      { productName, codemapSkill, architectureSkill, githubSkill, openIssues: ctx.openIssues },
      apiKey
    );

    if (result.isBlocked) {
      // Post blocker question, mark as blocked
      await pc.addComment(currentTask.id,
        `## 🚧 Blocked\n\n${result.blockerQuestion || 'Need clarification before proceeding.'}\n\n*@CTO please advise.*`
      );
      await pc.updateIssue(currentTask.id, { status: 'blocked' });

      return new Response(JSON.stringify({
        success: true, agentId, role: 'engineer',
        summary: `Blocked on "${currentTask.title}": ${result.blockerQuestion}`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!result.files || result.files.length === 0) {
      await pc.addComment(currentTask.id, `## Engineer Update\n\n${result.reasoning}\n\nNo files to commit — this task may need refinement.`);
      return new Response(JSON.stringify({
        success: true, agentId, role: 'engineer',
        summary: `No files generated for "${currentTask.title}".`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Open GitHub PR
    console.log(`Opening PR: "${result.prTitle}" with ${result.files.length} file(s)`);
    const { prUrl, prNumber } = await openPR({
      branchName: result.branchName,
      title: result.prTitle,
      body: result.prBody,
      files: result.files,
    });

    console.log(`PR opened: ${prUrl}`);

    // Post PR link as Paperclip comment
    const fileList = result.files.map(f => `- \`${f.path}\``).join('\n');
    await pc.addComment(currentTask.id,
      `## ✅ Pull Request Opened\n\n**[${result.prTitle}](${prUrl})** — PR #${prNumber}\n\n### Reasoning\n${result.reasoning}\n\n### Files Changed\n${fileList}\n\n### Next Steps\n1. Review the PR on GitHub\n2. Run the app locally to test\n3. Merge when satisfied\n4. SSH to VPS and run \`/opt/deploy-founderlens.sh\` to deploy\n\n*Generated by FounderLens Engineer Agent*`
    );

    // Mark issue done
    await pc.updateIssue(currentTask.id, { status: 'done' });

    return new Response(JSON.stringify({
      success: true,
      agentId,
      role: 'engineer',
      summary: `Opened PR #${prNumber}: "${result.prTitle}" with ${result.files.length} file(s). ${prUrl}`,
      prUrl,
      prNumber,
      filesChanged: result.files.map(f => f.path),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Engineer agent error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
