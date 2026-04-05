/**
 * FounderLens × Paperclip — Branding Agent Runtime
 *
 * On first heartbeat: generates a complete brand identity package and posts
 * it as a structured Paperclip issue. On subsequent heartbeats: refines
 * based on founder feedback in issue comments.
 *
 * Produces:
 * - 3 brand name options (with rationale + domain availability)
 * - Taglines for each name
 * - Brand voice guidelines
 * - Color palette direction
 * - Logo concept description
 * - Social handle suggestions
 * - Recommended registrar links
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, PaperclipClient, loadAgentContext,
} from '../_shared/agent-runtime.ts';

// ─── Domain availability via RDAP (free, no key, ICANN-operated) ─────────────

async function checkDomain(domain: string): Promise<'available' | 'taken' | 'unknown'> {
  try {
    const res = await fetch(`https://rdap.org/domain/${domain}`, {
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 200) return 'taken';
    if (res.status === 404) return 'available';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

async function checkDomains(name: string): Promise<{ tld: string; domain: string; status: string }[]> {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tlds = ['.com', '.io', '.co', '.app', '.ai'];
  const results = await Promise.all(
    tlds.map(async (tld) => {
      const domain = `${clean}${tld}`;
      const status = await checkDomain(domain);
      return { tld, domain, status };
    })
  );
  return results;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { runId, agentId, companyId, context = {} } = body;
    const opportunityId = req.headers.get('x-founderlens-opportunity-id') || undefined;

    console.log(`Branding Agent heartbeat — company: ${companyId}`);

    const pc = new PaperclipClient(runId);
    const ctx = await loadAgentContext(
      pc, runId, agentId, companyId,
      context.taskId, context.wakeReason || 'scheduled',
      opportunityId
    );

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const proposal = ctx.proposal;
    const research = ctx.research;
    const productName = proposal.productName || ctx.company.name;
    const oneLiner = proposal.oneLiner || ctx.company.description;
    const persona = proposal.targetUser?.persona || research.painPoints?.[0] || '';
    const differentiator = proposal.solution?.uniqueDifferentiator || '';
    const monetization = proposal.monetization?.model || 'subscription';
    const primaryChannel = proposal.goToMarket?.primaryChannel || 'community';

    // Check if branding issue already exists
    const brandingIssue = ctx.openIssues.find((i: any) =>
      i.title.toLowerCase().includes('brand') ||
      i.title.toLowerCase().includes('identity') ||
      i.title.toLowerCase().includes('domain')
    );

    // On subsequent heartbeats: check for feedback and refine
    if (brandingIssue) {
      const comments = await pc.getIssues(companyId).then(() =>
        fetch(`${Deno.env.get('PAPERCLIP_API_URL')}/api/issues/${brandingIssue.id}/comments`, {
          headers: { Authorization: `Bearer ${Deno.env.get('PAPERCLIP_BOARD_API_KEY')}` },
        }).then(r => r.ok ? r.json() : [])
      ).catch(() => []);

      const founderFeedback = comments
        .filter((c: any) => c.body && !c.body.startsWith('##'))
        .map((c: any) => c.body)
        .join('\n');

      if (!founderFeedback) {
        return new Response(JSON.stringify({
          success: true, agentId, role: 'general',
          summary: 'Brand identity package already posted. Waiting for founder feedback.',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Founder left feedback — post refined suggestions
      const refineRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: `You are a brand strategist. The founder gave this feedback on brand name options for "${productName}": "${founderFeedback}". Suggest 2 refined brand names based on their feedback. For each: name, tagline, why it fits their feedback. Keep it short.`,
          }],
        }),
      });
      const refineData = await refineRes.json();
      const refinedSuggestions = refineData.choices[0].message.content;

      await pc.addComment(brandingIssue.id,
        `## Refined Brand Suggestions\n\nBased on your feedback:\n\n${refinedSuggestions}`
      );

      return new Response(JSON.stringify({
        success: true, agentId, role: 'general',
        summary: 'Posted refined brand suggestions based on founder feedback.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── First heartbeat: generate full brand identity package ─────────────────

    // Step 1: GPT-4o generates brand names + identity
    const brandRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'system',
          content: 'You are a world-class brand strategist and naming expert. You\'ve named brands for Y Combinator startups. Return JSON only.',
        }, {
          role: 'user',
          content: `Create a complete brand identity package for this startup:

PRODUCT: "${productName}"
ONE-LINER: ${oneLiner}
TARGET USER: ${persona}
DIFFERENTIATOR: ${differentiator}
MONETIZATION: ${monetization}
PRIMARY CHANNEL: ${primaryChannel}

Generate 3 brand name options. Each name should be:
- Memorable and easy to spell/say
- 1-2 words max
- Relevant to the product and user
- Available as a potential domain (not generic English words)
- Not a direct competitor name

Return JSON:
{
  "names": [
    {
      "name": "BrandName",
      "pronunciation": "how to say it",
      "tagline": "catchy 5-8 word tagline",
      "rationale": "2 sentences why this name works for this specific product and user",
      "feel": "modern|playful|trustworthy|bold|minimal|warm",
      "domainSlug": "brandname" 
    }
  ],
  "brandVoice": {
    "tone": "e.g. warm, expert, encouraging — not clinical or corporate",
    "writingStyle": "2-3 sentences describing how the brand writes",
    "avoid": ["words or tones to avoid"],
    "examples": ["Sample headline", "Sample CTA"]
  },
  "colorPalette": {
    "primary": { "name": "color name", "hex": "#XXXXXX", "rationale": "why" },
    "secondary": { "name": "color name", "hex": "#XXXXXX", "rationale": "why" },
    "accent": { "name": "color name", "hex": "#XXXXXX", "rationale": "why" },
    "background": { "name": "color name", "hex": "#XXXXXX" }
  },
  "logoConceptDescription": "2-3 sentences describing the logo direction (shape, icon concept, typography style). Detailed enough for a designer or AI image tool.",
  "socialHandleSuggestions": ["@handle1", "@handle2", "@handle3"]
}`,
        }],
      }),
    });

    if (!brandRes.ok) throw new Error(`OpenAI branding call failed: ${brandRes.status}`);
    const brandData = await brandRes.json();
    const brand = JSON.parse(brandData.choices[0].message.content);

    // Step 2: Check domain availability for all 3 names in parallel
    console.log('Checking domain availability...');
    const domainResults = await Promise.all(
      brand.names.map(async (nameObj: any) => {
        const domains = await checkDomains(nameObj.domainSlug || nameObj.name);
        return { name: nameObj.name, domains };
      })
    );

    // Step 3: Build the brand identity issue body
    const domainMap = Object.fromEntries(domainResults.map(r => [r.name, r.domains]));

    function domainRow(name: string): string {
      const domains = domainMap[name] || [];
      return domains.map(d => {
        const icon = d.status === 'available' ? '✅' : d.status === 'taken' ? '❌' : '❓';
        const link = d.status === 'available'
          ? `[Register →](https://www.namecheap.com/domains/registration/results/?domain=${d.domain})`
          : '';
        return `${icon} \`${d.domain}\` ${link}`;
      }).join('   ');
    }

    const issueBody = `## 🎨 Brand Identity Package

*Generated by FounderLens Branding Agent — leave a comment with your feedback to refine.*

---

## Brand Names

${brand.names.map((n: any, i: number) => `### Option ${i + 1}: ${n.name}
**Pronunciation:** ${n.pronunciation}
**Tagline:** *"${n.tagline}"*
**Feel:** ${n.feel}

${n.rationale}

**Domain Availability:**
${domainRow(n.name)}
`).join('\n')}

---

## Brand Voice

**Tone:** ${brand.brandVoice.tone}

${brand.brandVoice.writingStyle}

**Avoid:** ${(brand.brandVoice.avoid || []).join(', ')}

**Example headlines:**
${(brand.brandVoice.examples || []).map((e: string) => `- "${e}"`).join('\n')}

---

## Color Palette

| Role | Color | Hex | Rationale |
|------|-------|-----|-----------|
| Primary | ${brand.colorPalette.primary.name} | \`${brand.colorPalette.primary.hex}\` | ${brand.colorPalette.primary.rationale} |
| Secondary | ${brand.colorPalette.secondary.name} | \`${brand.colorPalette.secondary.hex}\` | ${brand.colorPalette.secondary.rationale} |
| Accent | ${brand.colorPalette.accent.name} | \`${brand.colorPalette.accent.hex}\` | ${brand.colorPalette.accent.rationale} |
| Background | ${brand.colorPalette.background.name} | \`${brand.colorPalette.background.hex}\` | — |

---

## Logo Concept

${brand.logoConceptDescription}

*(Use this description with Midjourney, DALL-E, or share with a designer)*

---

## Social Handles

Suggested handles to check across Twitter/X, Instagram, LinkedIn, TikTok:

${(brand.socialHandleSuggestions || []).map((h: string) => `- \`${h}\``).join('\n')}

---

## Next Steps

1. **Pick a name** — reply with which option (or feedback) below
2. **Register the domain** — click a green ✅ link above to register on Namecheap
3. **Check social handles** — search your chosen handle on each platform
4. **Share logo concept** — copy the Logo Concept section into Midjourney or DALL-E
5. Once you've chosen a name, the CMO will update all marketing materials to match

*Leave a comment with your preferred name or any feedback — I'll refine the options.*`;

    // Step 4: Create the issue in Paperclip
    const projects = await pc.getProjects(companyId);
    const opsProject = projects.find((p: any) => p.name === 'Operations') || projects[0];
    const activeGoal = ctx.activeGoal;

    const issue = await pc.createIssue(companyId, {
      title: `🎨 Brand Identity — Name, Domain & Visual Direction`,
      description: issueBody,
      status: 'in_progress',
      priority: 'high',
      assigneeAgentId: agentId,
      ...(opsProject ? { projectId: opsProject.id } : {}),
      ...(activeGoal ? { goalId: activeGoal.id } : {}),
    });

    // Save brand package to Supabase for the dashboard
    if (opportunityId) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const serviceSupabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await serviceSupabase
        .from('validation_workflows')
        .update({
          product_proposal: {
            ...ctx.proposal,
            brandPackage: {
              names: brand.names,
              domainResults,
              colorPalette: brand.colorPalette,
              brandVoice: brand.brandVoice,
              logoConceptDescription: brand.logoConceptDescription,
              socialHandleSuggestions: brand.socialHandleSuggestions,
              generatedAt: new Date().toISOString(),
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('opportunity_id', opportunityId);
    }

    const topName = brand.names[0];
    const availableDomain = domainResults[0]?.domains.find(d => d.status === 'available')?.domain;

    console.log(`Brand package generated for ${productName}. Top name: ${topName?.name}`);

    return new Response(JSON.stringify({
      success: true,
      agentId,
      role: 'general',
      summary: `Brand identity package created with 3 name options. Top pick: "${topName?.name}" — "${topName?.tagline}". ${availableDomain ? `Domain ${availableDomain} is available.` : ''}`,
      issueId: issue.id,
      brandNames: brand.names.map((n: any) => n.name),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Branding agent error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
