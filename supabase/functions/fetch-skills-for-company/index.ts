/**
 * FounderLens × skills.sh — Skill Recommender + Injector
 *
 * Given a product proposal and research report, GPT-4o selects the most
 * relevant skills from the skills.sh registry (hosted on GitHub), fetches
 * their SKILL.md content, and injects them into the Paperclip company.
 *
 * Flow:
 * 1. GPT-4o analyzes proposal → picks top 6-8 skills from a curated index
 * 2. Fetch each SKILL.md from GitHub raw content (free, no key needed)
 * 3. POST each skill to Paperclip /companies/{id}/skills
 * 4. Return what was added so the UI can display it
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Agent roles ──────────────────────────────────────────────────────────────
type AgentRole = 'ceo' | 'cto' | 'engineer' | 'cmo' | 'growth';

// ─── skills.sh registry index ─────────────────────────────────────────────────
// Each skill specifies which agent roles should receive it.
// Skills are intentionally scoped — a CMO doesn't need database schema patterns.

const SKILLS_INDEX: {
  name: string;
  repo: string;
  path: string;
  tags: string[];
  roles: AgentRole[]; // which agents get this skill
}[] = [
  // ── Engineering (CTO + Engineer only) ────────────────────────────────────────
  { name: 'supabase-postgres-best-practices', repo: 'supabase/agent-skills', path: 'skills/supabase-postgres-best-practices', tags: ['backend', 'database', 'postgres', 'saas'], roles: ['cto', 'engineer'] },
  { name: 'test-driven-development', repo: 'obra/superpowers', path: 'skills/test-driven-development', tags: ['engineering', 'testing', 'tdd'], roles: ['cto', 'engineer'] },
  { name: 'systematic-debugging', repo: 'obra/superpowers', path: 'skills/systematic-debugging', tags: ['engineering', 'debugging'], roles: ['engineer'] },
  { name: 'api-design-principles', repo: 'wshobson/agents', path: 'skills/api-design-principles', tags: ['backend', 'api', 'engineering'], roles: ['cto', 'engineer'] },
  { name: 'nodejs-backend-patterns', repo: 'wshobson/agents', path: 'skills/nodejs-backend-patterns', tags: ['backend', 'nodejs'], roles: ['cto', 'engineer'] },
  { name: 'typescript-advanced-types', repo: 'wshobson/agents', path: 'skills/typescript-advanced-types', tags: ['frontend', 'typescript'], roles: ['engineer'] },
  { name: 'security-best-practices', repo: 'supercent-io/skills-template', path: 'skills/security-best-practices', tags: ['security', 'backend', 'saas'], roles: ['cto', 'engineer'] },
  { name: 'database-schema-design', repo: 'supercent-io/skills-template', path: 'skills/database-schema-design', tags: ['backend', 'database'], roles: ['cto', 'engineer'] },
  { name: 'backend-testing', repo: 'supercent-io/skills-template', path: 'skills/backend-testing', tags: ['backend', 'testing'], roles: ['engineer'] },
  { name: 'code-review', repo: 'supercent-io/skills-template', path: 'skills/code-review', tags: ['engineering', 'quality'], roles: ['cto'] },
  { name: 'better-auth-best-practices', repo: 'better-auth/skills', path: 'skills/better-auth-best-practices', tags: ['auth', 'security', 'saas'], roles: ['cto', 'engineer'] },

  // ── Frontend / Design (Engineer only) ────────────────────────────────────────
  { name: 'frontend-design', repo: 'anthropics/skills', path: 'skills/frontend-design', tags: ['frontend', 'design', 'ui', 'ux'], roles: ['engineer'] },
  { name: 'web-design-guidelines', repo: 'vercel-labs/agent-skills', path: 'skills/web-design-guidelines', tags: ['frontend', 'design', 'ui'], roles: ['engineer'] },
  { name: 'vercel-react-best-practices', repo: 'vercel-labs/agent-skills', path: 'skills/vercel-react-best-practices', tags: ['frontend', 'react'], roles: ['engineer'] },
  { name: 'shadcn', repo: 'shadcn/ui', path: 'skills/shadcn', tags: ['frontend', 'ui', 'components'], roles: ['engineer'] },
  { name: 'tailwind-design-system', repo: 'wshobson/agents', path: 'skills/tailwind-design-system', tags: ['frontend', 'design', 'css'], roles: ['engineer'] },
  { name: 'web-accessibility', repo: 'supercent-io/skills-template', path: 'skills/web-accessibility', tags: ['frontend', 'accessibility'], roles: ['engineer'] },
  { name: 'sleek-design-mobile-apps', repo: 'sleekdotdesign/agent-skills', path: 'skills/sleek-design-mobile-apps', tags: ['mobile', 'design', 'ui', 'app'], roles: ['engineer'] },

  // ── Marketing (CMO only) ─────────────────────────────────────────────────────
  { name: 'copywriting', repo: 'coreyhaines31/marketingskills', path: 'skills/copywriting', tags: ['marketing', 'copy', 'content', 'landing-page'], roles: ['cmo'] },
  { name: 'content-strategy', repo: 'coreyhaines31/marketingskills', path: 'skills/content-strategy', tags: ['marketing', 'content', 'seo'], roles: ['cmo'] },
  { name: 'social-content', repo: 'coreyhaines31/marketingskills', path: 'skills/social-content', tags: ['social', 'marketing', 'content'], roles: ['cmo'] },
  { name: 'product-marketing-context', repo: 'coreyhaines31/marketingskills', path: 'skills/product-marketing-context', tags: ['marketing', 'product', 'positioning'], roles: ['cmo'] },
  { name: 'marketing-psychology', repo: 'coreyhaines31/marketingskills', path: 'skills/marketing-psychology', tags: ['marketing', 'psychology', 'copy'], roles: ['cmo'] },
  { name: 'ad-creative', repo: 'coreyhaines31/marketingskills', path: 'skills/ad-creative', tags: ['ads', 'marketing', 'creative'], roles: ['cmo'] },

  // ── Growth (Growth + CMO shared) ─────────────────────────────────────────────
  { name: 'launch-strategy', repo: 'coreyhaines31/marketingskills', path: 'skills/launch-strategy', tags: ['launch', 'gtm', 'growth'], roles: ['ceo', 'cmo', 'growth'] },
  { name: 'seo-audit', repo: 'coreyhaines31/marketingskills', path: 'skills/seo-audit', tags: ['seo', 'marketing', 'growth'], roles: ['cmo', 'growth'] },
  { name: 'cold-email', repo: 'coreyhaines31/marketingskills', path: 'skills/cold-email', tags: ['email', 'outreach', 'growth'], roles: ['cmo', 'growth'] },
  { name: 'analytics-tracking', repo: 'coreyhaines31/marketingskills', path: 'skills/analytics-tracking', tags: ['analytics', 'growth', 'data'], roles: ['ceo', 'growth'] },
  { name: 'page-cro', repo: 'coreyhaines31/marketingskills', path: 'skills/page-cro', tags: ['cro', 'conversion', 'landing-page'], roles: ['growth'] },
  { name: 'signup-flow-cro', repo: 'coreyhaines31/marketingskills', path: 'skills/signup-flow-cro', tags: ['cro', 'onboarding', 'saas'], roles: ['engineer', 'growth'] },
  { name: 'referral-program', repo: 'coreyhaines31/marketingskills', path: 'skills/referral-program', tags: ['growth', 'viral', 'referral'], roles: ['ceo', 'growth'] },
  { name: 'ai-seo', repo: 'coreyhaines31/marketingskills', path: 'skills/ai-seo', tags: ['seo', 'ai', 'marketing'], roles: ['cmo', 'growth'] },
  { name: 'free-tool-strategy', repo: 'coreyhaines31/marketingskills', path: 'skills/free-tool-strategy', tags: ['growth', 'saas', 'product-led'], roles: ['ceo', 'growth'] },
  { name: 'churn-prevention', repo: 'coreyhaines31/marketingskills', path: 'skills/churn-prevention', tags: ['retention', 'saas', 'growth'], roles: ['ceo', 'growth'] },

  // ── Pricing / Monetization (CEO + CMO) ───────────────────────────────────────
  { name: 'pricing-strategy', repo: 'coreyhaines31/marketingskills', path: 'skills/pricing-strategy', tags: ['pricing', 'monetization', 'saas'], roles: ['ceo', 'cmo'] },

  // ── Strategy / Planning (CEO only) ───────────────────────────────────────────
  { name: 'brainstorming', repo: 'obra/superpowers', path: 'skills/brainstorming', tags: ['strategy', 'product', 'ideation'], roles: ['ceo'] },
  { name: 'writing-plans', repo: 'obra/superpowers', path: 'skills/writing-plans', tags: ['strategy', 'planning', 'product'], roles: ['ceo'] },
  { name: 'prd', repo: 'github/awesome-copilot', path: 'skills/prd', tags: ['product', 'requirements', 'planning'], roles: ['ceo', 'cto'] },
  { name: 'technical-writing', repo: 'supercent-io/skills-template', path: 'skills/technical-writing', tags: ['documentation', 'writing'], roles: ['cto', 'engineer'] },

  // ── Mobile / App (Engineer + CTO) ────────────────────────────────────────────
  { name: 'building-native-ui', repo: 'expo/skills', path: 'skills/building-native-ui', tags: ['mobile', 'react-native', 'expo', 'app'], roles: ['engineer'] },
  { name: 'expo-deployment', repo: 'expo/skills', path: 'skills/expo-deployment', tags: ['mobile', 'deployment', 'app'], roles: ['cto', 'engineer'] },

  // ── Data / Automation (CEO + Growth) ─────────────────────────────────────────
  { name: 'data-analysis', repo: 'supercent-io/skills-template', path: 'skills/data-analysis', tags: ['data', 'analytics', 'ai'], roles: ['ceo', 'growth'] },
  { name: 'workflow-automation', repo: 'supercent-io/skills-template', path: 'skills/workflow-automation', tags: ['automation', 'ai', 'ops'], roles: ['ceo', 'cto'] },
];

// ─── Fetch SKILL.md from GitHub ───────────────────────────────────────────────

async function fetchSkillContent(repo: string, path: string): Promise<string | null> {
  // Try main branch first, then master
  for (const branch of ['main', 'master']) {
    try {
      const url = `https://raw.githubusercontent.com/${repo}/${branch}/${path}/SKILL.md`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'FounderLens/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const content = await res.text();
        if (content && content.length > 50 && !content.startsWith('404')) {
          return content;
        }
      }
    } catch { /* try next branch */ }
  }
  return null;
}

// ─── Paperclip skill injector ─────────────────────────────────────────────────

async function injectSkillIntoPaperclip(
  companyId: string,
  skillName: string,
  content: string,
  targetAgentIds: string[] // only agents whose role matches this skill
): Promise<boolean> {
  try {
    const res = await fetch(
      `${Deno.env.get('PAPERCLIP_API_URL')}/api/companies/${companyId}/skills`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('PAPERCLIP_BOARD_API_KEY')}`,
        },
        body: JSON.stringify({
          name: skillName,
          content: content.slice(0, 8000),
          ...(targetAgentIds.length > 0 ? { agentIds: targetAgentIds } : {}),
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { opportunityId, companyId, selectedSkills } = await req.json();

    if (!opportunityId || !companyId) {
      return new Response(JSON.stringify({ error: 'opportunityId and companyId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Load proposal + research
    const { data: workflow } = await serviceSupabase
      .from('validation_workflows')
      .select('product_proposal, reddit_validation_results')
      .eq('opportunity_id', opportunityId)
      .maybeSingle();

    const { data: opp } = await serviceSupabase
      .from('business_opportunities')
      .select('title, description, target_market')
      .eq('id', opportunityId)
      .maybeSingle();

    const proposal = workflow?.product_proposal || {};
    const research = workflow?.reddit_validation_results || {};

    // Load company agents from Paperclip — build role → agentId map
    const agentsRes = await fetch(
      `${Deno.env.get('PAPERCLIP_API_URL')}/api/companies/${companyId}/agents`,
      { headers: { 'Authorization': `Bearer ${Deno.env.get('PAPERCLIP_BOARD_API_KEY')}` } }
    );
    const agents: any[] = agentsRes.ok ? await agentsRes.json() : [];

    // Map Paperclip role → agent ID(s)
    // Agent names in our system: CEO, CTO, Engineer, CMO, Growth
    const roleToAgentIds: Record<string, string[]> = {};
    for (const agent of agents) {
      const role = agent.role as string; // 'ceo' | 'cto' | 'cmo' | 'engineer' etc.
      const nameRole = agent.name?.toLowerCase(); // fallback by name
      const key = role || nameRole;
      if (!roleToAgentIds[key]) roleToAgentIds[key] = [];
      roleToAgentIds[key].push(agent.id);
      // Also index by name for Growth agent (role='engineer' but name='Growth')
      if (agent.name) {
        const nameKey = agent.name.toLowerCase();
        if (!roleToAgentIds[nameKey]) roleToAgentIds[nameKey] = [];
        roleToAgentIds[nameKey].push(agent.id);
      }
    }

    // ── If skills are pre-selected by user, use those ─────────────────────────
    let skillsToInstall: typeof SKILLS_INDEX = [];

    if (selectedSkills && selectedSkills.length > 0) {
      // User picked manually from the UI
      skillsToInstall = SKILLS_INDEX.filter(s => selectedSkills.includes(s.name));
    } else if (apiKey) {
      // ── GPT-4o recommends skills automatically ────────────────────────────
      const productName = proposal.productName || opp?.title || 'the product';
      const techContext = [
        proposal.solution?.coreFeatures?.join(', '),
        proposal.mvpScope?.mustHave?.join(', '),
        opp?.description,
      ].filter(Boolean).join('. ');

      const prompt = `You are a startup technology advisor. Analyze this product and recommend the most relevant agent skills to equip the AI company's team.

PRODUCT: "${productName}"
DESCRIPTION: ${opp?.description || ''}
TARGET MARKET: ${opp?.target_market || ''}
CORE FEATURES: ${(proposal.solution?.coreFeatures || []).join(', ')}
MVP SCOPE: ${(proposal.mvpScope?.mustHave || []).join(', ')}
MONETIZATION: ${proposal.monetization?.model || 'subscription'}
GTM: ${proposal.goToMarket?.primaryChannel || 'community'}

AVAILABLE SKILLS (select 6-8 most relevant):
${SKILLS_INDEX.map(s => `- ${s.name} [${s.tags.join(', ')}]`).join('\n')}

Select the 6-8 skills that will give the CEO, CTO, Engineer, CMO, and Growth agents the best domain knowledge for this specific product.

Consider:
- Is this a web app? Mobile app? → pick matching frontend/backend skills
- Does it need auth/security? → better-auth-best-practices
- Is marketing the main channel? → pick 2-3 marketing skills
- Is it SaaS? → pricing-strategy + signup-flow-cro are almost always relevant
- Does it need SEO? Content? → pick accordingly

Return JSON only:
{
  "recommendations": [
    {
      "skillName": "exact-skill-name-from-list",
      "reason": "1 sentence why this skill helps this specific product",
      "assignTo": ["CEO", "CTO", "Engineer", "CMO", "Growth"]
    }
  ]
}`;

      const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 800,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (gptRes.ok) {
        const gptData = await gptRes.json();
        const result = JSON.parse(gptData.choices[0].message.content);
        const recommended = result.recommendations || [];
        skillsToInstall = recommended
          .map((r: any) => SKILLS_INDEX.find(s => s.name === r.skillName))
          .filter(Boolean) as typeof SKILLS_INDEX;
      }
    }

    // Fallback: always include these core SaaS skills
    if (skillsToInstall.length < 3) {
      const coreSkills = ['copywriting', 'launch-strategy', 'pricing-strategy', 'signup-flow-cro', 'analytics-tracking'];
      skillsToInstall = SKILLS_INDEX.filter(s => coreSkills.includes(s.name));
    }

    // ── Fetch and inject each skill to the right agents only ─────────────────
    const results: { name: string; status: 'installed' | 'not_found' | 'failed'; url: string; assignedRoles: string[] }[] = [];

    await Promise.all(
      skillsToInstall.map(async (skill) => {
        const content = await fetchSkillContent(skill.repo, skill.path);
        const skillUrl = `https://skills.sh/${skill.name}`;

        if (!content) {
          results.push({ name: skill.name, status: 'not_found', url: skillUrl, assignedRoles: [] });
          return;
        }

        // Resolve target agent IDs for this skill's roles
        const targetRoles = skill.roles || ['ceo', 'cto', 'engineer', 'cmo', 'growth'];
        const targetAgentIds = [...new Set(
          targetRoles.flatMap(role => {
            // Match by role first, then by name (Growth agent has role='engineer')
            return roleToAgentIds[role] || roleToAgentIds[role === 'growth' ? 'growth' : role] || [];
          })
        )];

        const ok = await injectSkillIntoPaperclip(companyId, skill.name, content, targetAgentIds);
        results.push({
          name: skill.name,
          status: ok ? 'installed' : 'failed',
          url: skillUrl,
          assignedRoles: targetRoles,
        });
      })
    );

    const installed = results.filter(r => r.status === 'installed');
    console.log(`Skills: ${installed.length}/${skillsToInstall.length} installed for company ${companyId}`);

    // Persist which skills were installed
    await serviceSupabase
      .from('validation_workflows')
      .update({
        updated_at: new Date().toISOString(),
        // Store installed skills in the product_proposal for reference
        product_proposal: {
          ...proposal,
          installedSkills: installed.map(r => r.name),
        },
      })
      .eq('opportunity_id', opportunityId);

    return new Response(JSON.stringify({
      success: true,
      companyId,
      skillsIndex: SKILLS_INDEX.map(s => ({
        name: s.name,
        tags: s.tags,
        url: `https://skills.sh/${s.name}`,
        repo: `https://github.com/${s.repo}`,
      })),
      installed: installed.map(r => r.name),
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('fetch-skills-for-company error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
