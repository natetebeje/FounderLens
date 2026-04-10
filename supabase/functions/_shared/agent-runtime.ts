/**
 * FounderLens × Paperclip — Shared Agent Runtime
 *
 * Every agent Edge Function imports this module.
 * Handles: Paperclip API auth, context loading, GPT-4o, response posting.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-founderlens-opportunity-id',
};

// ─── Paperclip API client ─────────────────────────────────────────────────────

export class PaperclipClient {
  private baseUrl: string;
  private apiKey: string;
  private runId: string;

  constructor(runId: string) {
    this.baseUrl = Deno.env.get('PAPERCLIP_API_URL') ?? '';
    // Use the board API key for agent operations
    this.apiKey = Deno.env.get('PAPERCLIP_BOARD_API_KEY') ?? '';
    this.runId = runId;
  }

  private async request(method: string, path: string, body?: object): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Paperclip-Run-Id': this.runId,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Paperclip ${method} ${path} → ${res.status}: ${err}`);
    }
    return res.json();
  }

  // Agent identity
  async getAgent(agentId: string, companyId?: string) {
    const qs = companyId ? `?companyId=${companyId}` : '';
    return this.request('GET', `/agents/${agentId}${qs}`);
  }
  async getOrgChart(companyId: string) { return this.request('GET', `/companies/${companyId}/org`); }

  // Goals
  async getGoals(companyId: string) { return this.request('GET', `/companies/${companyId}/goals`); }
  async updateGoal(goalId: string, data: object) { return this.request('PATCH', `/goals/${goalId}`, data); }

  // Issues
  async getIssues(companyId: string, params?: { status?: string; assigneeAgentId?: string; projectId?: string }) {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request('GET', `/companies/${companyId}/issues${qs}`);
  }
  async getIssue(issueId: string) { return this.request('GET', `/issues/${issueId}`); }
  async createIssue(companyId: string, data: object) { return this.request('POST', `/companies/${companyId}/issues`, data); }
  async updateIssue(issueId: string, data: object) { return this.request('PATCH', `/issues/${issueId}`, data); }
  async checkoutIssue(issueId: string, agentId: string, expectedStatuses = ['todo', 'backlog']) {
    return this.request('POST', `/issues/${issueId}/checkout`, { agentId, expectedStatuses });
  }
  async releaseIssue(issueId: string) { return this.request('POST', `/issues/${issueId}/release`); }

  // Comments
  async addComment(issueId: string, body: string) {
    return this.request('POST', `/issues/${issueId}/comments`, { body });
  }

  // Projects
  async getProjects(companyId: string) { return this.request('GET', `/companies/${companyId}/projects`); }

  // Skills (agent knowledge base)
  async getSkills(companyId: string) {
    return this.request('GET', `/companies/${companyId}/skills`).catch(() => []);
  }

  // Company
  async getCompany(companyId: string) { return this.request('GET', `/companies/${companyId}`); }
  async getAgents(companyId: string) { return this.request('GET', `/companies/${companyId}/agents`); }
}

// ─── Agent context loader ─────────────────────────────────────────────────────

export interface AgentContext {
  runId: string;
  agentId: string;
  companyId: string;
  taskId?: string;
  wakeReason: string;
  opportunityId?: string;
  // Loaded from Paperclip
  agent: any;
  company: any;
  agents: any[];
  activeGoal: any;
  openIssues: any[];
  myIssues: any[];
  skills: any[];
  // Loaded from Supabase
  proposal: any;
  research: any;
  opportunity: any;
}

export async function loadAgentContext(
  pc: PaperclipClient,
  runId: string,
  agentId: string,
  companyId: string,
  taskId: string | undefined,
  wakeReason: string,
  opportunityId: string | undefined
): Promise<AgentContext> {
  // Load from Paperclip in parallel
  const [agent, company, agents, goals, openIssues, skills] = await Promise.all([
    pc.getAgent(agentId, companyId),
    pc.getCompany(companyId),
    pc.getAgents(companyId),
    pc.getGoals(companyId),
    pc.getIssues(companyId, { status: 'todo,in_progress,blocked' }),
    pc.getSkills(companyId),
  ]);

  const activeGoal = goals.find((g: any) => g.status === 'active') || goals[0];
  const myIssues = openIssues.filter((i: any) => i.assigneeAgentId === agentId);

  // Load from Supabase if opportunityId is available
  let proposal: any = {};
  let research: any = {};
  let opportunity: any = {};

  if (opportunityId) {
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const [wf, opp] = await Promise.all([
      serviceSupabase
        .from('validation_workflows')
        .select('product_proposal, reddit_validation_results')
        .eq('opportunity_id', opportunityId)
        .maybeSingle(),
      serviceSupabase
        .from('business_opportunities')
        .select('title, description, target_market, problem_statement')
        .eq('id', opportunityId)
        .maybeSingle(),
    ]);
    proposal = wf.data?.product_proposal || {};
    research = wf.data?.reddit_validation_results || {};
    opportunity = opp.data || {};
  }

  return {
    runId, agentId, companyId, taskId, wakeReason, opportunityId,
    agent, company, agents, activeGoal,
    openIssues, myIssues, skills,
    proposal, research, opportunity,
  };
}

// ─── GPT-4o caller ────────────────────────────────────────────────────────────

export interface AgentThought {
  reasoning: string;
  actions: {
    type: 'create_issue' | 'update_issue' | 'add_comment' | 'update_goal' | 'no_action';
    issueId?: string;
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeAgentName?: string;
    projectName?: string;
    comment?: string;
    goalStatus?: string;
    reason?: string;
  }[];
  summary: string; // 1-2 sentence summary posted as run result
}

export async function thinkAndAct(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2000
): Promise<AgentThought> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content) as AgentThought;
}

// ─── Action executor ──────────────────────────────────────────────────────────

export async function executeActions(
  pc: PaperclipClient,
  ctx: AgentContext,
  thought: AgentThought
): Promise<string[]> {
  const log: string[] = [];

  for (const action of thought.actions) {
    try {
      switch (action.type) {
        case 'create_issue': {
          // Resolve assignee agent ID from name
          const assignee = action.assigneeAgentName
            ? ctx.agents.find((a: any) =>
                a.name.toLowerCase() === action.assigneeAgentName!.toLowerCase()
              )
            : null;

          // Resolve project ID from name
          const projects = await pc.getProjects(ctx.companyId);
          const project = action.projectName
            ? projects.find((p: any) =>
                p.name.toLowerCase().includes(action.projectName!.toLowerCase())
              )
            : null;

          const issue = await pc.createIssue(ctx.companyId, {
            title: action.title,
            description: action.description || '',
            status: action.status || 'todo',
            priority: action.priority || 'medium',
            ...(assignee ? { assigneeAgentId: assignee.id } : {}),
            ...(project ? { projectId: project.id } : {}),
            ...(ctx.activeGoal ? { goalId: ctx.activeGoal.id } : {}),
          });
          log.push(`Created issue: "${action.title}" (${issue.id})`);
          break;
        }

        case 'update_issue': {
          if (!action.issueId) break;
          await pc.updateIssue(action.issueId, {
            ...(action.status ? { status: action.status } : {}),
            ...(action.priority ? { priority: action.priority } : {}),
            ...(action.comment ? { comment: action.comment } : {}),
          });
          log.push(`Updated issue ${action.issueId}: ${action.status || 'commented'}`);
          break;
        }

        case 'add_comment': {
          if (!action.issueId || !action.comment) break;
          await pc.addComment(action.issueId, action.comment);
          log.push(`Commented on issue ${action.issueId}`);
          break;
        }

        case 'update_goal': {
          if (!ctx.activeGoal || !action.goalStatus) break;
          await pc.updateGoal(ctx.activeGoal.id, { status: action.goalStatus });
          log.push(`Updated goal status: ${action.goalStatus}`);
          break;
        }

        case 'no_action': {
          log.push(`No action: ${action.reason || 'nothing needed'}`);
          break;
        }
      }
    } catch (err: any) {
      log.push(`Action failed (${action.type}): ${err.message}`);
    }
  }

  return log;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatIssueList(issues: any[], max = 8): string {
  if (!issues || issues.length === 0) return 'None';
  return issues.slice(0, max)
    .map(i => `- [${i.status}] ${i.priority ? `[${i.priority}]` : ''} "${i.title}" (id: ${i.id})`)
    .join('\n');
}

export function formatSkills(skills: any[]): string {
  if (!skills || skills.length === 0) return 'No skills loaded.';
  return skills.map((s: any) => `### ${s.name}\n${(s.content || '').slice(0, 600)}`).join('\n\n');
}

export function agentName(agents: any[], id: string): string {
  return agents.find((a: any) => a.id === id)?.name || id;
}
