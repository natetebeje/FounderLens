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

// ─── skills.sh registry index ─────────────────────────────────────────────────
// Curated from the skills.sh leaderboard. Each entry maps to a GitHub raw path.
// Format: { name, description, repo, path, tags }

const SKILLS_INDEX = [
  // ── Engineering ─────────────────────────────────────────────────────────────
  { name: 'supabase-postgres-best-practices', repo: 'supabase/agent-skills', path: 'skills/supabase-postgres-best-practices', tags: ['backend', 'database', 'postgres', 'supabase', 'saas'] },
  { name: 'test-driven-development', repo: 'obra/superpowers', path: 'skills/test-driven-development', tags: ['engineering', 'testing', 'quality', 'tdd'] },
  { name: 'systematic-debugging', repo: 'obra/superpowers', path: 'skills/systematic-debugging', tags: ['engineering', 'debugging', 'backend', 'frontend'] },
  { name: 'api-design-principles', repo: 'wshobson/agents', path: 'skills/api-design-principles', tags: ['backend', 'api', 'engineering', 'saas'] },
  { name: 'nodejs-backend-patterns', repo: 'wshobson/agents', path: 'skills/nodejs-backend-patterns', tags: ['backend', 'nodejs', 'engineering'] },
  { name: 'typescript-advanced-types', repo: 'wshobson/agents', path: 'skills/typescript-advanced-types', tags: ['frontend', 'engineering', 'typescript'] },
  { name: 'security-best-practices', repo: 'supercent-io/skills-template', path: 'skills/security-best-practices', tags: ['security', 'backend', 'saas', 'engineering'] },
  { name: 'database-schema-design', repo: 'supercent-io/skills-template', path: 'skills/database-schema-design', tags: ['backend', 'database', 'engineering'] },
  { name: 'backend-testing', repo: 'supercent-io/skills-template', path: 'skills/backend-testing', tags: ['backend', 'testing', 'engineering'] },
  { name: 'code-review', repo: 'supercent-io/skills-template', path: 'skills/code-review', tags: ['engineering', 'quality'] },
  { name: 'better-auth-best-practices', repo: 'better-auth/skills', path: 'skills/better-auth-best-practices', tags: ['auth', 'security', 'saas', 'backend'] },

  // ── Frontend / Design ────────────────────────────────────────────────────────
  { name: 'frontend-design', repo: 'anthropics/skills', path: 'skills/frontend-design', tags: ['frontend', 'design', 'ui', 'ux'] },
  { name: 'web-design-guidelines', repo: 'vercel-labs/agent-skills', path: 'skills/web-design-guidelines', tags: ['frontend', 'design', 'ui'] },
  { name: 'vercel-react-best-practices', repo: 'vercel-labs/agent-skills', path: 'skills/vercel-react-best-practices', tags: ['frontend', 'react', 'engineering'] },
  { name: 'shadcn', repo: 'shadcn/ui', path: 'skills/shadcn', tags: ['frontend', 'ui', 'components', 'react'] },
  { name: 'tailwind-design-system', repo: 'wshobson/agents', path: 'skills/tailwind-design-system', tags: ['frontend', 'design', 'css', 'ui'] },
  { name: 'web-accessibility', repo: 'supercent-io/skills-template', path: 'skills/web-accessibility', tags: ['frontend', 'accessibility', 'ux'] },
  { name: 'sleek-design-mobile-apps', repo: 'sleekdotdesign/agent-skills', path: 'skills/sleek-design-mobile-apps', tags: ['mobile', 'design', 'ui', 'app'] },

  // ── Marketing / Growth ───────────────────────────────────────────────────────
  { name: 'copywriting', repo: 'coreyhaines31/marketingskills', path: 'skills/copywriting', tags: ['marketing', 'copy', 'content', 'landing-page', 'cmo'] },
  { name: 'launch-strategy', repo: 'coreyhaines31/marketingskills', path: 'skills/launch-strategy', tags: ['marketing', 'launch', 'gtm', 'growth', 'cmo'] },
  { name: 'content-strategy', repo: 'coreyhaines31/marketingskills', path: 'skills/content-strategy', tags: ['marketing', 'content', 'seo', 'cmo'] },
  { name: 'seo-audit', repo: 'coreyhaines31/marketingskills', path: 'skills/seo-audit', tags: ['seo', 'marketing', 'growth'] },
  { name: 'social-content', repo: 'coreyhaines31/marketingskills', path: 'skills/social-content', tags: ['social', 'marketing', 'content', 'cmo'] },
  { name: 'cold-email', repo: 'coreyhaines31/marketingskills', path: 'skills/cold-email', tags: ['email', 'outreach', 'growth', 'sales'] },
  { name: 'pricing-strategy', repo: 'coreyhaines31/marketingskills', path: 'skills/pricing-strategy', tags: ['pricing', 'monetization', 'saas', 'cmo'] },
  { name: 'analytics-tracking', repo: 'coreyhaines31/marketingskills', path: 'skills/analytics-tracking', tags: ['analytics', 'growth', 'data', 'tracking'] },
  { name: 'page-cro', repo: 'coreyhaines31/marketingskills', path: 'skills/page-cro', tags: ['cro', 'conversion', 'landing-page', 'growth'] },
  { name: 'signup-flow-cro', repo: 'coreyhaines31/marketingskills', path: 'skills/signup-flow-cro', tags: ['cro', 'onboarding', 'saas', 'growth'] },
  { name: 'referral-program', repo: 'coreyhaines31/marketingskills', path: 'skills/referral-program', tags: ['growth', 'viral', 'referral', 'marketing'] },
  { name: 'ad-creative', repo: 'coreyhaines31/marketingskills', path: 'skills/ad-creative', tags: ['ads', 'marketing', 'creative', 'growth'] },
  { name: 'ai-seo', repo: 'coreyhaines31/marketingskills', path: 'skills/ai-seo', tags: ['seo', 'ai', 'marketing', 'content'] },
  { name: 'product-marketing-context', repo: 'coreyhaines31/marketingskills', path: 'skills/product-marketing-context', tags: ['marketing', 'product', 'positioning', 'cmo'] },
  { name: 'marketing-psychology', repo: 'coreyhaines31/marketingskills', path: 'skills/marketing-psychology', tags: ['marketing', 'psychology', 'copy', 'conversion'] },
  { name: 'free-tool-strategy', repo: 'coreyhaines31/marketingskills', path: 'skills/free-tool-strategy', tags: ['growth', 'saas', 'product-led', 'marketing'] },
  { name: 'churn-prevention', repo: 'coreyhaines31/marketingskills', path: 'skills/churn-prevention', tags: ['retention', 'saas', 'growth', 'customer-success'] },

  // ── Product / Strategy ───────────────────────────────────────────────────────
  { name: 'brainstorming', repo: 'obra/superpowers', path: 'skills/brainstorming', tags: ['strategy', 'product', 'ideation'] },
  { name: 'writing-plans', repo: 'obra/superpowers', path: 'skills/writing-plans', tags: ['strategy', 'planning', 'product', 'ceo'] },
  { name: 'prd', repo: 'github/awesome-copilot', path: 'skills/prd', tags: ['product', 'requirements', 'planning', 'pm'] },
  { name: 'technical-writing', repo: 'supercent-io/skills-template', path: 'skills/technical-writing', tags: ['documentation', 'writing', 'product'] },

  // ── Mobile / App ─────────────────────────────────────────────────────────────
  { name: 'building-native-ui', repo: 'expo/skills', path: 'skills/building-native-ui', tags: ['mobile', 'react-native', 'expo', 'app'] },
  { name: 'expo-deployment', repo: 'expo/skills', path: 'skills/expo-deployment', tags: ['mobile', 'deployment', 'app', 'expo'] },

  // ── AI / Data ────────────────────────────────────────────────────────────────
  { name: 'data-analysis', repo: 'supercent-io/skills-template', path: 'skills/data-analysis', tags: ['data', 'analytics', 'ai', 'backend'] },
  { name: 'workflow-automation', repo: 'supercent-io/skills-template', path: 'skills/workflow-automation', tags: ['automation', 'ai', 'ops', 'saas'] },
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
  agentIds: string[]
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
          content: content.slice(0, 8000), // Paperclip skill content limit
          ...(agentIds.length > 0 ? { agentIds } : {}),
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

    // Load company agents from Paperclip (to inject skills to all agents)
    const agentsRes = await fetch(
      `${Deno.env.get('PAPERCLIP_API_URL')}/api/companies/${companyId}/agents`,
      { headers: { 'Authorization': `Bearer ${Deno.env.get('PAPERCLIP_BOARD_API_KEY')}` } }
    );
    const agents = agentsRes.ok ? await agentsRes.json() : [];
    const agentIds = agents.map((a: any) => a.id);

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

    // ── Fetch and inject each skill ───────────────────────────────────────────
    const results: { name: string; status: 'installed' | 'not_found' | 'failed'; url: string }[] = [];

    await Promise.all(
      skillsToInstall.map(async (skill) => {
        const content = await fetchSkillContent(skill.repo, skill.path);
        const skillUrl = `https://skills.sh/${skill.name}`;

        if (!content) {
          results.push({ name: skill.name, status: 'not_found', url: skillUrl });
          return;
        }

        const ok = await injectSkillIntoPaperclip(companyId, skill.name, content, agentIds);
        results.push({ name: skill.name, status: ok ? 'installed' : 'failed', url: skillUrl });
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
