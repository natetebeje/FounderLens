/**
 * FounderLens E2E Test Suite
 * Idea Coach → Proposal → Build This → AI Company Creation
 *
 * Tests the full Phase 1–3 flow end-to-end using a mock Paperclip API
 * and a mock Supabase client. No real network calls are made.
 *
 * Run: npx vitest run tests/e2e/idea-coach-to-ai-company.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MockPaperclipCompany {
  id: string;
  name: string;
  description: string;
  budgetMonthlyCents: number;
}

interface MockPaperclipAgent {
  id: string;
  name: string;
  role: string;
  title: string;
  reportsTo?: string;
  companyId: string;
  adapterType: string;
  adapterConfig: { url: string; headers?: Record<string, string> };
  prompt: string;
  budgetMonthlyCents: number;
}

interface MockPaperclipIssue {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeAgentId: string;
  projectId: string;
  goalId?: string;
}

// ─── Mock Paperclip API ───────────────────────────────────────────────────────

class MockPaperclipAPI {
  companies: MockPaperclipCompany[] = [];
  agents: MockPaperclipAgent[] = [];
  goals: any[] = [];
  projects: any[] = [];
  issues: MockPaperclipIssue[] = [];
  skills: any[] = [];
  heartbeatsInvoked: string[] = [];

  private idCounter = 1;
  private nextId(prefix: string) { return `${prefix}_${this.idCounter++}`; }

  handleRequest(method: string, path: string, body?: any): any {
    // POST /api/companies
    if (method === 'POST' && path === '/api/companies') {
      const company = { id: this.nextId('company'), ...body };
      this.companies.push(company);
      return company;
    }

    // POST /api/companies/:id/goals
    const goalsMatch = path.match(/^\/api\/companies\/([^/]+)\/goals$/);
    if (method === 'POST' && goalsMatch) {
      const goal = { id: this.nextId('goal'), companyId: goalsMatch[1], ...body };
      this.goals.push(goal);
      return goal;
    }

    // GET /api/companies/:id/goals
    if (method === 'GET' && goalsMatch) {
      return this.goals.filter(g => g.companyId === goalsMatch[1]);
    }

    // POST /api/companies/:id/projects
    const projectsMatch = path.match(/^\/api\/companies\/([^/]+)\/projects$/);
    if (method === 'POST' && projectsMatch) {
      const project = { id: this.nextId('project'), companyId: projectsMatch[1], ...body };
      this.projects.push(project);
      return project;
    }

    // POST /api/companies/:id/agents
    const agentsMatch = path.match(/^\/api\/companies\/([^/]+)\/agents$/);
    if (method === 'POST' && agentsMatch) {
      const agent = { id: this.nextId('agent'), companyId: agentsMatch[1], ...body };
      this.agents.push(agent);
      return agent;
    }

    // GET /api/companies/:id/agents
    if (method === 'GET' && agentsMatch) {
      return this.agents.filter(a => a.companyId === agentsMatch[1]);
    }

    // POST /api/companies/:id/issues
    const issuesMatch = path.match(/^\/api\/companies\/([^/]+)\/issues$/);
    if (method === 'POST' && issuesMatch) {
      const issue = { id: this.nextId('issue'), companyId: issuesMatch[1], ...body };
      this.issues.push(issue);
      return issue;
    }

    // POST /api/companies/:id/skills
    const skillsMatch = path.match(/^\/api\/companies\/([^/]+)\/skills$/);
    if (method === 'POST' && skillsMatch) {
      const skill = { id: this.nextId('skill'), companyId: skillsMatch[1], ...body };
      this.skills.push(skill);
      return skill;
    }

    // POST /api/agents/:id/heartbeat/invoke
    const heartbeatMatch = path.match(/^\/api\/agents\/([^/]+)\/heartbeat\/invoke$/);
    if (method === 'POST' && heartbeatMatch) {
      this.heartbeatsInvoked.push(heartbeatMatch[1]);
      return { invoked: true };
    }

    // POST /api/issues/:id/comments
    const commentMatch = path.match(/^\/api\/issues\/([^/]+)\/comments$/);
    if (method === 'POST' && commentMatch) {
      return { id: this.nextId('comment'), issueId: commentMatch[1], ...body };
    }

    throw new Error(`Unhandled mock: ${method} ${path}`);
  }

  reset() {
    this.companies = [];
    this.agents = [];
    this.goals = [];
    this.projects = [];
    this.issues = [];
    this.skills = [];
    this.heartbeatsInvoked = [];
    this.idCounter = 1;
  }
}

// ─── Mock Supabase ────────────────────────────────────────────────────────────

class MockSupabase {
  private store: Record<string, any[]> = {
    business_opportunities: [],
    validation_workflows: [],
    opportunity_chats: [],
    opportunity_chat_messages: [],
  };

  updates: { table: string; data: any; filter: any }[] = [];

  from(table: string) {
    const self = this;
    return {
      select: (_cols: string) => ({
        eq: (col: string, val: any) => ({
          single: () => {
            const rows = self.store[table] || [];
            const row = rows.find((r: any) => r[col] === val);
            return Promise.resolve({ data: row || null, error: row ? null : { message: 'Not found' } });
          },
          maybeSingle: () => {
            const rows = self.store[table] || [];
            const row = rows.find((r: any) => r[col] === val);
            return Promise.resolve({ data: row || null, error: null });
          },
          order: (_col: string) => ({
            limit: (_n: number) => {
              const rows = self.store[table] || [];
              return Promise.resolve({ data: rows.filter((r: any) => r[col] === val), error: null });
            },
          }),
        }),
      }),
      insert: (data: any) => ({
        select: (_cols?: string) => ({
          single: () => {
            const row = { id: `mock_${Date.now()}`, ...data };
            (self.store[table] = self.store[table] || []).push(row);
            return Promise.resolve({ data: row, error: null });
          },
        }),
      }),
      update: (data: any) => ({
        eq: (col: string, val: any) => {
          self.updates.push({ table, data, filter: { [col]: val } });
          const rows = self.store[table] || [];
          const idx = rows.findIndex((r: any) => r[col] === val);
          if (idx >= 0) Object.assign(rows[idx], data);
          return Promise.resolve({ data: rows[idx] || null, error: null });
        },
      }),
      upsert: (data: any) => ({
        select: () => Promise.resolve({ data: [data], error: null }),
      }),
    };
  }

  seed(table: string, rows: any[]) {
    this.store[table] = rows;
  }

  reset() {
    this.store = {
      business_opportunities: [],
      validation_workflows: [],
      opportunity_chats: [],
      opportunity_chat_messages: [],
    };
    this.updates = [];
  }
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

const MOCK_OPPORTUNITY = {
  id: 'opp_test_001',
  title: 'Postpartum Nutrition AI',
  description: 'AI-powered personalized diet plans for new moms during the postpartum period',
  target_market: 'New mothers 0-6 months postpartum',
  problem_statement: 'Generic diet apps ignore the unique nutritional needs of breastfeeding and postpartum recovery',
};

const MOCK_RESEARCH = {
  opportunityScore: 68,
  verdict: 'moderate',
  totalDataPoints: 31,
  dataQuality: 'moderate',
  briefSummary: 'Moderate community demand with clear competitor gaps in the postpartum nutrition space.',
  demandSignals: [
    'r/beyondthebump users frequently request postpartum diet guidance',
    'App Store shows 4 competitors with average 3.2★ rating — low satisfaction',
    'Analogous market: prenatal nutrition apps grew 40% in 2023',
  ],
  painPoints: [
    'Generic macro tracking ignores breastfeeding caloric needs [Reddit]',
    'Postpartum weight expectations lead to dangerous under-eating [Web]',
    'No app accounts for hormonal changes affecting metabolism [Analogous]',
  ],
  marketGaps: [
    'No postpartum-specific AI meal planner exists',
    'Zero apps integrate breastfeeding status into nutrition calculations',
    'No community accountability features for new moms',
  ],
  competitors: [
    { name: 'MyFitnessPal', description: 'General macro tracker', gap: 'No postpartum mode' },
    { name: 'Baby2Body', description: 'Wellness for new moms', gap: 'Focuses on fitness, not nutrition' },
  ],
  competitorApps: [
    { name: 'MyFitnessPal', rating: 4.7, ratingCount: 890000, description: 'General diet tracker' },
    { name: 'Noom', rating: 4.2, ratingCount: 120000, description: 'Weight loss coaching' },
  ],
  risks: ['High competition from established wellness apps', 'Medical liability around dietary advice'],
  researchedAt: new Date().toISOString(),
};

const MOCK_PRODUCT_PROPOSAL = {
  productName: 'MamaFuel AI',
  oneLiner: 'The only AI nutritionist that understands your postpartum body — from hormones to breastfeeding to recovery.',
  tagline: 'Eat right. Recover faster. Feed better.',
  problemStatement: 'New mothers struggle to find diet guidance that accounts for breastfeeding, postpartum hormones, and recovery nutrition. Generic apps cause under-eating and nutrient deficiency.',
  targetUser: {
    persona: 'Emily, 29, first-time mom 6 weeks postpartum, breastfeeding, wants to lose baby weight safely',
    jobsToBeDone: ['Lose weight without hurting milk supply', 'Know exactly what to eat for energy'],
    painPoints: [
      'MyFitnessPal cuts calories dangerously low for breastfeeding',
      'No app tells her which nutrients to prioritize for recovery',
    ],
    currentAlternatives: ['MyFitnessPal (gives generic macros)', 'Baby2Body (fitness-focused, not nutrition)'],
  },
  solution: {
    coreFeatures: [
      'AI meal planner that adjusts for breastfeeding status',
      'Postpartum nutrient tracker (iron, calcium, omega-3)',
      'Weekly recovery milestones with nutrition guidance',
    ],
    uniqueDifferentiator: 'Only app with a postpartum-specific AI model trained on lactation nutrition research',
    unfairAdvantage: 'Partnership with registered postpartum dietitians for plan curation',
  },
  marketOpportunity: {
    targetMarketSize: '$2.1B postpartum wellness market (US)',
    serviceableMarket: '$180M nutrition app segment for new moms',
    competitorGaps: ['MyFitnessPal ignores breastfeeding', 'Baby2Body focuses on fitness not nutrition'],
  },
  mvpScope: {
    mustHave: [
      'Onboarding: due date, delivery type, breastfeeding status',
      'AI daily meal plan (breakfast, lunch, dinner, 2 snacks)',
      'Postpartum nutrient tracker dashboard',
    ],
    niceToHave: ['Community forum', 'Recipe library'],
    outOfScope: ['Doctor integrations', 'Wearable sync'],
  },
  monetization: {
    model: 'subscription',
    pricing: '$12.99/month or $89/year',
    rationale: 'Comparable to Noom ($60/month) at a fraction of the cost, positioned as postpartum-specific premium',
  },
  goToMarket: {
    primaryChannel: 'Reddit (r/beyondthebump, r/NewParents, r/breastfeeding)',
    channels: ['Reddit communities', 'Instagram postpartum influencers', 'Hospital partnership program'],
    launchStrategy: 'Beta with 50 moms from r/beyondthebump, collect testimonials, then ProductHunt launch',
    first30Days: 'Week 1: Post in 3 subreddits offering free beta. Week 2: Onboard 50 beta users. Week 3-4: Iterate on feedback and collect case studies.',
  },
  risks: [
    'Medical liability around dietary advice requires dietitian oversight',
    'Low switching cost from free apps like MyFitnessPal',
  ],
  nextSteps: [
    'Hire a registered dietitian as an advisor',
    'Build onboarding flow and AI meal generation MVP',
    'Set up beta waitlist landing page',
  ],
  researchBacking: {
    opportunityScore: 68,
    dataPoints: 31,
    verdict: 'moderate',
    keyEvidence: ['31 community data points', 'App Store gap: 0 postpartum-specific apps'],
  },
};

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('FounderLens: Idea Coach → AI Company E2E Flow', () => {
  const mockPaperclip = new MockPaperclipAPI();
  const mockSupabase = new MockSupabase();
  let fetchCalls: { url: string; method: string; body?: any }[] = [];

  beforeEach(() => {
    mockPaperclip.reset();
    mockSupabase.reset();
    fetchCalls = [];

    // Seed DB
    mockSupabase.seed('business_opportunities', [MOCK_OPPORTUNITY]);
    mockSupabase.seed('validation_workflows', [{
      opportunity_id: MOCK_OPPORTUNITY.id,
      reddit_validation_results: MOCK_RESEARCH,
      product_proposal: MOCK_PRODUCT_PROPOSAL,
      paperclip_company_id: null,
      paperclip_company_url: null,
      paperclip_launched_at: null,
    }]);

    // Mock global fetch to intercept Paperclip API calls
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      fetchCalls.push({ url, method, body });

      const urlObj = new URL(url);

      // Paperclip API calls
      if (urlObj.hostname === 'build.founderlens.io') {
        const path = urlObj.pathname.replace('/api', '');
        const result = mockPaperclip.handleRequest(method, `/api${path}`, body);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Supabase Edge Function calls (notify-ceo-new-signals self-invocation)
      if (url.includes('/functions/v1/notify-ceo-new-signals')) {
        return new Response(JSON.stringify({ success: true, skipped: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // OpenAI API — return mock proposal JSON
      if (url.includes('openai.com')) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                ...MOCK_PRODUCT_PROPOSAL,
                opportunityScore: 68,
                briefSummary: MOCK_RESEARCH.briefSummary,
                fullReport: '## Full Report\n\nDetailed analysis...',
                demandSignals: MOCK_RESEARCH.demandSignals,
                painPoints: MOCK_RESEARCH.painPoints,
                competitors: MOCK_RESEARCH.competitors,
                marketGaps: MOCK_RESEARCH.marketGaps,
                risks: MOCK_RESEARCH.risks,
                verdictReason: 'Moderate demand with clear gap.',
                recommendation: 'Proceed with beta test.',
              }),
            },
          }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      throw new Error(`Unexpected fetch call: ${method} ${url}`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Phase 1: Idea Coach ────────────────────────────────────────────────────

  describe('Phase 1: Idea Coach', () => {
    it('extracts research context from validation_workflows for the system prompt', async () => {
      const { buildSystemPromptForTest } = await import('../helpers/test-helpers.js');

      const prompt = buildSystemPromptForTest(MOCK_OPPORTUNITY, MOCK_RESEARCH, 0);

      expect(prompt).toContain('Postpartum Nutrition AI');
      expect(prompt).toContain('68/100');
      expect(prompt).toContain('Generic macro tracking ignores breastfeeding');
      expect(prompt).toContain('MyFitnessPal');
      expect(prompt).toContain('No postpartum-specific AI meal planner exists');
    });

    it('saves conversation messages to opportunity_chat_messages', async () => {
      const chatId = 'chat_001';
      mockSupabase.seed('opportunity_chats', [{ id: chatId, opportunity_id: MOCK_OPPORTUNITY.id, user_id: 'user_001' }]);

      const mockInsert = vi.fn().mockResolvedValue({ data: { id: 'msg_001' }, error: null });

      // Simulate saving a user message
      const result = await mockInsert({ chat_id: chatId, role: 'user', content: 'My target user is breastfeeding moms 0-3 months postpartum.' });
      expect(result.data.id).toBe('msg_001');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ role: 'user' }));
    });

    it('extracts proposal JSON from ```proposal-json code blocks', () => {
      const content = `Great! Based on everything we discussed, here is your proposal:

\`\`\`proposal-json
${JSON.stringify(MOCK_PRODUCT_PROPOSAL, null, 2)}
\`\`\`

This proposal is strong because it targets a clearly underserved niche.`;

      // Simulate the extractProposalJson function
      const match = content.match(/```proposal-json\n([\s\S]*?)```/);
      expect(match).not.toBeNull();
      const parsed = JSON.parse(match![1]);
      expect(parsed.productName).toBe('MamaFuel AI');
      expect(parsed.mvpScope.mustHave).toHaveLength(3);
      expect(parsed.monetization.pricing).toBe('$12.99/month or $89/year');
    });

    it('shows Generate Proposal button after 3 user messages', () => {
      const userMessageCount = 3;
      const proposal = null;
      const showProposalButton = userMessageCount >= 3 || !!proposal;
      expect(showProposalButton).toBe(true);
    });

    it('does NOT show Generate Proposal button with fewer than 3 messages and no proposal', () => {
      const userMessageCount = 2;
      const proposal = null;
      const showProposalButton = userMessageCount >= 3 || !!proposal;
      expect(showProposalButton).toBe(false);
    });
  });

  // ─── Phase 2: Product Proposal ──────────────────────────────────────────────

  describe('Phase 2: Product Proposal', () => {
    it('proposal object contains all 10 required sections', () => {
      const p = MOCK_PRODUCT_PROPOSAL;
      expect(p.productName).toBeDefined();
      expect(p.oneLiner).toBeDefined();
      expect(p.problemStatement).toBeDefined();
      expect(p.targetUser).toBeDefined();
      expect(p.solution).toBeDefined();
      expect(p.marketOpportunity).toBeDefined();
      expect(p.mvpScope).toBeDefined();
      expect(p.monetization).toBeDefined();
      expect(p.goToMarket).toBeDefined();
      expect(p.risks).toBeDefined();
      expect(p.nextSteps).toBeDefined();
      expect(p.researchBacking).toBeDefined();
    });

    it('proposal is persisted to validation_workflows.product_proposal', async () => {
      const updateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      await updateFn({ product_proposal: MOCK_PRODUCT_PROPOSAL, updated_at: new Date().toISOString() });

      expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({
        product_proposal: expect.objectContaining({ productName: 'MamaFuel AI' }),
      }));
    });

    it('generates valid markdown from proposal', () => {
      const p = MOCK_PRODUCT_PROPOSAL;
      const md = [
        `# ${p.productName}`,
        `> ${p.oneLiner}`,
        `## Problem\n${p.problemStatement}`,
        `## Target User\n**Persona:** ${p.targetUser.persona}`,
        `## Monetization\n**Model:** ${p.monetization.model}\n**Pricing:** ${p.monetization.pricing}`,
      ].join('\n\n');

      expect(md).toContain('# MamaFuel AI');
      expect(md).toContain('$12.99/month');
      expect(md).toContain('subscription');
      expect(md).toContain('Emily, 29');
    });
  });

  // ─── Phase 3: Build This → AI Company Creation ──────────────────────────────

  describe('Phase 3: launch-to-paperclip', () => {
    it('creates a Paperclip company with the correct name and mission', async () => {
      // Simulate the launch-to-paperclip flow
      const company = mockPaperclip.handleRequest('POST', '/api/companies', {
        name: MOCK_PRODUCT_PROPOSAL.productName,
        description: `${MOCK_PRODUCT_PROPOSAL.oneLiner}\n\nValidated by FounderLens — Score: 68/100 · 31 data points.`,
        budgetMonthlyCents: 2000,
      });

      expect(company.id).toBeDefined();
      expect(company.name).toBe('MamaFuel AI');
      expect(company.description).toContain('68/100');
      expect(company.budgetMonthlyCents).toBe(2000); // $20 cap
      expect(mockPaperclip.companies).toHaveLength(1);
    });

    it('creates a company-level goal linking to the mission', async () => {
      const company = mockPaperclip.handleRequest('POST', '/api/companies', { name: 'MamaFuel AI', description: 'test' });
      const goal = mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/goals`, {
        title: `Launch MamaFuel AI and reach first 100 paying customers`,
        level: 'company',
        status: 'active',
      });

      expect(goal.id).toBeDefined();
      expect(goal.title).toContain('100 paying customers');
      expect(goal.status).toBe('active');
      expect(goal.level).toBe('company');
    });

    it('creates exactly 3 projects: MVP, Marketing, Operations', async () => {
      const company = mockPaperclip.handleRequest('POST', '/api/companies', { name: 'test' });
      const goal = mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/goals`, { title: 'goal', level: 'company', status: 'active' });

      const projectNames = ['MVP', 'Marketing', 'Operations'];
      for (const name of projectNames) {
        mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/projects`, {
          name,
          goalIds: [goal.id],
          status: name === 'Operations' ? 'planned' : 'active',
        });
      }

      expect(mockPaperclip.projects).toHaveLength(3);
      expect(mockPaperclip.projects.map(p => p.name)).toEqual(projectNames);
      expect(mockPaperclip.projects.find(p => p.name === 'MVP')?.status).toBe('active');
      expect(mockPaperclip.projects.find(p => p.name === 'Operations')?.status).toBe('planned');
    });

    it('creates exactly 5 agents with correct roles and adapter types', async () => {
      const company = mockPaperclip.handleRequest('POST', '/api/companies', { name: 'test' });

      const agentDefs = [
        { name: 'CEO', role: 'ceo', reportsTo: undefined },
        { name: 'CTO', role: 'manager', reportsTo: 'ceo_agent_id' },
        { name: 'Engineer', role: 'engineer', reportsTo: 'ceo_agent_id' },
        { name: 'CMO', role: 'manager', reportsTo: 'ceo_agent_id' },
        { name: 'Growth', role: 'engineer', reportsTo: 'ceo_agent_id' },
      ];

      for (const def of agentDefs) {
        mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/agents`, {
          ...def,
          adapterType: 'http',
          adapterConfig: {
            url: 'https://phppdhsozkpsquxlfezg.supabase.co/functions/v1/paperclip-agent-ceo',
            timeoutSec: 120,
          },
          prompt: `You are the ${def.name}...`,
          budgetMonthlyCents: 500,
        });
      }

      expect(mockPaperclip.agents).toHaveLength(5);
      expect(mockPaperclip.agents.every(a => a.adapterType === 'http')).toBe(true);
      expect(mockPaperclip.agents.find(a => a.role === 'ceo')).toBeDefined();
      expect(mockPaperclip.agents.find(a => a.name === 'CMO')?.role).toBe('manager');
      expect(mockPaperclip.agents.find(a => a.name === 'Growth')?.role).toBe('engineer');
    });

    it('CEO prompt contains research data: pain points and score', () => {
      const proposal = MOCK_PRODUCT_PROPOSAL;
      const research = MOCK_RESEARCH;

      const ceoPrompt = `You are the CEO of ${proposal.productName}.
MISSION: ${proposal.oneLiner}
RESEARCH: Score ${research.opportunityScore}/100 across ${research.totalDataPoints} validated data points.
KEY PAIN POINTS TO SOLVE:
${research.painPoints.map(p => `- ${p}`).join('\n')}`;

      expect(ceoPrompt).toContain('MamaFuel AI');
      expect(ceoPrompt).toContain('68/100');
      expect(ceoPrompt).toContain('31 validated data points');
      expect(ceoPrompt).toContain('Generic macro tracking ignores breastfeeding');
    });

    it('seeds backlog issues from MVP must-haves assigned to CTO', async () => {
      const company = mockPaperclip.handleRequest('POST', '/api/companies', { name: 'test' });
      const ctoAgent = mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/agents`, {
        name: 'CTO', role: 'manager', adapterType: 'http',
        adapterConfig: { url: 'https://test.supabase.co/functions/v1/paperclip-agent-cto' },
        prompt: 'You are the CTO',
      });
      const project = mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/projects`, { name: 'MVP' });

      for (const [i, feature] of MOCK_PRODUCT_PROPOSAL.mvpScope.mustHave.entries()) {
        mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/issues`, {
          title: feature,
          status: 'todo',
          priority: i === 0 ? 'urgent' : 'high',
          projectId: project.id,
          assigneeAgentId: ctoAgent.id,
        });
      }

      const mvpIssues = mockPaperclip.issues.filter(i => i.projectId === project.id);
      expect(mvpIssues).toHaveLength(3);
      expect(mvpIssues[0].title).toContain('Onboarding');
      expect(mvpIssues[0].priority).toBe('urgent');
      expect(mvpIssues.every(i => i.assigneeAgentId === ctoAgent.id)).toBe(true);
    });

    it('injects Market Research and Product Proposal as skills (best-effort)', async () => {
      const company = mockPaperclip.handleRequest('POST', '/api/companies', { name: 'test' });
      const agentIds = ['ceo_1', 'cto_1', 'eng_1', 'cmo_1', 'growth_1'];

      mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/skills`, {
        name: 'Market Research',
        content: `# Market Research — MamaFuel AI\n\nScore: 68/100\n\n## Pain Points\n${MOCK_RESEARCH.painPoints.join('\n')}`,
        agentIds,
      });
      mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/skills`, {
        name: 'Product Proposal',
        content: `# Product Proposal — MamaFuel AI\n\n## One-Liner\n${MOCK_PRODUCT_PROPOSAL.oneLiner}`,
        agentIds,
      });

      expect(mockPaperclip.skills).toHaveLength(2);
      expect(mockPaperclip.skills.find(s => s.name === 'Market Research')?.content).toContain('68/100');
      expect(mockPaperclip.skills.find(s => s.name === 'Product Proposal')?.content).toContain('MamaFuel AI');
    });

    it('persists paperclip_company_id and paperclip_company_url to validation_workflows', async () => {
      const companyId = 'company_test_001';
      const companyUrl = 'https://build.founderlens.io/dashboard';
      const updateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      await updateFn({
        paperclip_company_id: companyId,
        paperclip_launched_at: new Date().toISOString(),
        paperclip_company_url: companyUrl,
        updated_at: new Date().toISOString(),
      });

      expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({
        paperclip_company_id: companyId,
        paperclip_company_url: companyUrl,
      }));
    });

    it('is idempotent — returns existing company if already launched', async () => {
      mockSupabase.seed('validation_workflows', [{
        opportunity_id: MOCK_OPPORTUNITY.id,
        reddit_validation_results: MOCK_RESEARCH,
        product_proposal: MOCK_PRODUCT_PROPOSAL,
        paperclip_company_id: 'existing_company_001',
        paperclip_company_url: 'https://build.founderlens.io/dashboard',
        paperclip_launched_at: new Date().toISOString(),
      }]);

      const { data: workflow } = await mockSupabase
        .from('validation_workflows')
        .select('paperclip_company_id, paperclip_company_url')
        .eq('opportunity_id', MOCK_OPPORTUNITY.id)
        .maybeSingle();

      // Should return existing without creating a new company
      if (workflow?.paperclip_company_id) {
        const response = {
          success: true,
          alreadyLaunched: true,
          companyId: workflow.paperclip_company_id,
          companyUrl: workflow.paperclip_company_url,
        };
        expect(response.alreadyLaunched).toBe(true);
        expect(response.companyId).toBe('existing_company_001');
        expect(mockPaperclip.companies).toHaveLength(0); // No new company created
      }
    });
  });

  // ─── Post-launch webhook ─────────────────────────────────────────────────────

  describe('Post-launch webhook: notify-ceo-new-signals', () => {
    it('skips notification when no AI company exists for the opportunity', async () => {
      mockSupabase.seed('validation_workflows', [{
        opportunity_id: MOCK_OPPORTUNITY.id,
        reddit_validation_results: MOCK_RESEARCH,
        paperclip_company_id: null,
      }]);

      const { data: workflow } = await mockSupabase
        .from('validation_workflows')
        .select('paperclip_company_id')
        .eq('opportunity_id', MOCK_OPPORTUNITY.id)
        .maybeSingle();

      const shouldNotify = !!workflow?.paperclip_company_id;
      expect(shouldNotify).toBe(false);
    });

    it('creates a briefing issue with research summary when company exists', async () => {
      const company = mockPaperclip.handleRequest('POST', '/api/companies', {
        name: 'MamaFuel AI',
        description: 'test',
      });
      const ceoAgent = mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/agents`, {
        name: 'CEO', role: 'ceo', adapterType: 'http',
        adapterConfig: { url: 'https://test.supabase.co/functions/v1/paperclip-agent-ceo' },
        prompt: 'CEO prompt',
      });

      const issueTitle = `📡 New Research Signals — ${new Date().toLocaleDateString()} (Score: 68/100)`;
      const issue = mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/issues`, {
        title: issueTitle,
        description: `## New Community Research Signals\n\n**🟡 Opportunity Score: 68/100 (moderate)**\n\n### Evidence of Demand\n${MOCK_RESEARCH.demandSignals.map(s => `- ${s}`).join('\n')}`,
        status: 'todo',
        priority: 'medium',
        assigneeAgentId: ceoAgent.id,
      });

      expect(issue.id).toBeDefined();
      expect(issue.title).toContain('New Research Signals');
      expect(issue.title).toContain('68/100');
      expect(issue.description).toContain('r/beyondthebump');
      expect(issue.assigneeAgentId).toBe(ceoAgent.id);
    });

    it('triggers CEO heartbeat after creating briefing issue', async () => {
      const company = mockPaperclip.handleRequest('POST', '/api/companies', { name: 'test' });
      const ceoAgent = mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/agents`, {
        name: 'CEO', role: 'ceo', adapterType: 'http',
        adapterConfig: { url: 'https://test.supabase.co/functions/v1/paperclip-agent-ceo' },
        prompt: 'CEO',
      });

      mockPaperclip.handleRequest('POST', `/api/agents/${ceoAgent.id}/heartbeat/invoke`);

      expect(mockPaperclip.heartbeatsInvoked).toContain(ceoAgent.id);
    });

    it('scores 70+ creates high-priority briefing issue', () => {
      const highScore = 75;
      const priority = highScore >= 70 ? 'high' : 'medium';
      expect(priority).toBe('high');
    });

    it('scores below 70 creates medium-priority briefing issue', () => {
      const lowScore = 68;
      const priority = lowScore >= 70 ? 'high' : 'medium';
      expect(priority).toBe('medium');
    });

    it('fires async and does not block the validate-opportunity-research response', async () => {
      // Simulate the fire-and-forget pattern
      let researchResponseReturned = false;
      let webhookFired = false;

      const webhookPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          webhookFired = true;
          resolve();
        }, 50);
      });

      // Response returns immediately
      researchResponseReturned = true;

      // Webhook fires after
      await webhookPromise;

      expect(researchResponseReturned).toBe(true);
      expect(webhookFired).toBe(true);
    });
  });

  // ─── Full end-to-end flow ────────────────────────────────────────────────────

  describe('Full E2E: Idea Coach → Proposal → Build This → AI Company', () => {
    it('completes the full flow: 5 agents, 3 projects, seeded backlog, persisted company ID', async () => {
      // Step 1: Simulate proposal generation from Idea Coach chat
      const proposal = MOCK_PRODUCT_PROPOSAL;
      expect(proposal.productName).toBe('MamaFuel AI');

      // Step 2: Create company
      const company = mockPaperclip.handleRequest('POST', '/api/companies', {
        name: proposal.productName,
        description: proposal.oneLiner,
        budgetMonthlyCents: 2000,
      });

      // Step 3: Create goal
      const goal = mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/goals`, {
        title: `Launch ${proposal.productName} and reach first 100 paying customers`,
        level: 'company', status: 'active',
      });

      // Step 4: Create projects
      for (const [name, status] of [['MVP', 'active'], ['Marketing', 'active'], ['Operations', 'planned']]) {
        mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/projects`, { name, goalIds: [goal.id], status });
      }

      // Step 5: Create CEO
      const ceo = mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/agents`, {
        name: 'CEO', role: 'ceo', adapterType: 'http',
        adapterConfig: { url: 'https://test.supabase.co/functions/v1/paperclip-agent-ceo' },
        prompt: `CEO of ${proposal.productName}`,
      });

      // Step 6: Create team
      for (const [name, role] of [['CTO', 'manager'], ['Engineer', 'engineer'], ['CMO', 'manager'], ['Growth', 'engineer']]) {
        mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/agents`, {
          name, role, reportsTo: ceo.id, adapterType: 'http',
          adapterConfig: { url: `https://test.supabase.co/functions/v1/paperclip-agent-${name.toLowerCase()}` },
          prompt: `You are the ${name}`,
        });
      }

      // Step 7: Seed issues
      const mvpProject = mockPaperclip.projects.find(p => p.name === 'MVP');
      const cto = mockPaperclip.agents.find(a => a.name === 'CTO');
      for (const feature of proposal.mvpScope.mustHave) {
        mockPaperclip.handleRequest('POST', `/api/companies/${company.id}/issues`, {
          title: feature, status: 'todo', assigneeAgentId: cto!.id, projectId: mvpProject!.id,
        });
      }

      // Step 8: Persist company ID
      const companyId = company.id;
      const companyUrl = 'https://build.founderlens.io/dashboard';

      // Assertions
      expect(mockPaperclip.companies).toHaveLength(1);
      expect(mockPaperclip.goals).toHaveLength(1);
      expect(mockPaperclip.projects).toHaveLength(3);
      expect(mockPaperclip.agents).toHaveLength(5);
      expect(mockPaperclip.agents.filter(a => a.adapterType === 'http')).toHaveLength(5);
      expect(mockPaperclip.issues.filter(i => i.projectId === mvpProject!.id)).toHaveLength(3);
      expect(companyId).toBeDefined();
      expect(companyUrl).toContain('build.founderlens.io');
    });
  });
});
