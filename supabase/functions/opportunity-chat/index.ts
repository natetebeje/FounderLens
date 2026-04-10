import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TYPES
// ============================================================================

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ResearchContext {
  opportunityScore?: number;
  verdict?: string;
  briefSummary?: string;
  painPoints?: string[];
  demandSignals?: string[];
  competitors?: { name: string; description: string; gap: string }[];
  marketGaps?: string[];
  risks?: string[];
  analogousMarkets?: string[];
  competitorApps?: { name: string; rating: number; description: string }[];
  webCitations?: { title: string; url: string }[];
  fullReport?: string;
  dataQuality?: string;
  totalDataPoints?: number;
}

// ============================================================================
// PROPOSAL JSON EXTRACTOR
// Resilient to truncation, alternate fence tags, CRLF, and trailing commas.
// Kept in sync with the client-side helper in ProductProposalGenerator.tsx.
// ============================================================================

function extractProposalJson(raw: string): any | null {
  if (!raw) return null;
  const content = raw.replace(/\r\n/g, '\n');

  const labeled =
    content.match(/```proposal-json\s*\n([\s\S]*?)```/) ||
    content.match(/```proposal-json\s*\n([\s\S]*)$/);
  if (labeled) {
    const parsed = safeParseJson(labeled[1]);
    if (parsed) return parsed;
  }

  const generic =
    content.match(/```json\s*\n([\s\S]*?)```/) ||
    content.match(/```json\s*\n([\s\S]*)$/) ||
    content.match(/```\s*\n([\s\S]*?)```/);
  if (generic) {
    const parsed = safeParseJson(generic[1]);
    if (parsed) return parsed;
  }

  const first = content.indexOf('{');
  if (first !== -1) {
    const candidate = sliceBalancedJson(content, first);
    if (candidate) {
      const parsed = safeParseJson(candidate);
      if (parsed) return parsed;
    }
  }

  return null;
}

function safeParseJson(text: string): any | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch { /* try forgiving pass */ }
  const relaxed = trimmed.replace(/,(\s*[}\]])/g, '$1');
  try {
    return JSON.parse(relaxed);
  } catch { return null; }
}

function sliceBalancedJson(content: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return content.slice(start, i + 1);
    }
  }
  return null;
}

// ============================================================================
// SYSTEM PROMPT BUILDER
// Constructs a rich, context-aware prompt from the validation research report.
// The AI already knows everything about this opportunity — no re-explaining needed.
// ============================================================================

function buildSystemPrompt(
  opportunity: { title: string; description: string; target_market: string; problem_statement?: string },
  research: ResearchContext,
  messageCount: number
): string {
  const painPointsList = (research.painPoints || []).slice(0, 5).map(p => `  - ${p}`).join('\n');
  const gapsList = (research.marketGaps || []).slice(0, 4).map(g => `  - ${g}`).join('\n');
  const competitorsList = (research.competitors || []).slice(0, 4)
    .map(c => `  - ${c.name}: ${c.description} (Gap: ${c.gap})`).join('\n');
  const demandList = (research.demandSignals || []).slice(0, 4).map(d => `  - ${d}`).join('\n');
  const analogousList = (research.analogousMarkets || []).slice(0, 3).map(a => `  - ${a}`).join('\n');

  const scoreContext = research.opportunityScore
    ? `The FounderLens research engine scored this opportunity ${research.opportunityScore}/100 (${research.verdict || 'moderate'} signal).`
    : 'The opportunity has been reviewed by the FounderLens research engine.';

  const proposalReadiness = messageCount >= 6
    ? '\n\nThe founder has now provided substantial context. If they ask to generate the proposal, do it immediately. If the conversation has covered target user, core differentiator, MVP scope, and monetization — proactively suggest generating the proposal.'
    : '';

  return `You are the FounderLens Idea Coach — a senior startup advisor, product strategist, and co-founder mentor embedded directly in the FounderLens platform.

Your role is to help this founder:
1. Clarify and sharpen their business idea using evidence from the research
2. Ask targeted questions that uncover their unique angle, target user, and competitive moat
3. Challenge weak assumptions using the real data below
4. Guide them toward a clear, buildable product vision
5. Generate a structured Product Proposal when they're ready

## OPPORTUNITY BEING COACHED
Title: "${opportunity.title}"
Description: ${opportunity.description}
Target Market: ${opportunity.target_market}
${opportunity.problem_statement ? `Problem: ${opportunity.problem_statement}` : ''}

## RESEARCH FINDINGS (from FounderLens Research Engine)
${scoreContext}
Data Points Analyzed: ${research.totalDataPoints || 0} (${research.dataQuality || 'moderate'} quality)
${research.briefSummary ? `\nResearch Summary: ${research.briefSummary}` : ''}

### Evidence of Demand
${demandList || '  - Limited direct demand signals found — analogous markets show potential'}

### Pain Points Found
${painPointsList || '  - Not yet identified from community data'}

### Current Competitors
${competitorsList || '  - No major direct competitors identified (potential market gap)'}

### Market Gaps
${gapsList || '  - To be explored in conversation'}

### Analogous Markets
${analogousList || '  - Not yet researched'}

## YOUR COACHING APPROACH

**In early conversation (messages 1-4):** Ask ONE focused question per message. Prioritize:
- "Who is the most specific version of your target user?" (e.g., not "new moms" but "breastfeeding moms 0-3 months postpartum who are trying to lose weight")
- "What's your single unfair advantage?" 
- "If this existed tomorrow, who calls you first and why?"
- "What's the simplest version that would make someone pay $10/month?"

**In mid conversation (messages 5-8):** Start connecting their answers to the research data. Reference specific findings: "Your target user matches the pain points we found — r/beyondthebump users mentioned [X]. That validates your thesis."

**As they near readiness:** Summarize what you've learned and ask if they're ready to generate the proposal.

**Tone:** Direct, warm, intellectually sharp. Like a YC partner in office hours — challenging but supportive. No filler phrases. No "Great question!" Use the research data aggressively to ground every response.

**Length:** Keep responses focused. 3-5 sentences max for questions. Longer only when synthesizing or generating the proposal.${proposalReadiness}

## FOLLOW-UP SUGGESTIONS

After EVERY chat response (but NOT when you are returning a proposal-json block), append a block of exactly this form at the very end of your message:

<followups>
- suggestion 1
- suggestion 2
- suggestion 3
</followups>

Each suggestion is a short next question the founder might naturally ask you, written in first person from the founder's perspective (e.g. "What should my pricing model be?"). Keep each one to 8 words or fewer. Tailor them to what was just discussed so they feel like the natural next step in the conversation. Do NOT include this block when you are returning a proposal-json block.

## GENERATING THE PRODUCT PROPOSAL

When the user asks to generate the proposal (or you determine they're ready), respond with a **single valid JSON object and nothing else** — no markdown, no prose, no code fences, no commentary before or after. Include ALL fields — do not skip any. Use everything you've learned from the conversation PLUS the research data above.

The JSON must follow this exact structure:
{
  "productName": "string",
  "oneLiner": "one sentence that explains the product and who it's for",
  "tagline": "short punchy marketing tagline",
  "problemStatement": "2-3 sentences grounded in research evidence",
  "targetUser": {
    "persona": "specific archetype with demographics",
    "jobsToBeDone": ["what they're trying to accomplish"],
    "painPoints": ["specific frustrations from research"],
    "currentAlternatives": ["what they use now and why it fails"]
  },
  "solution": {
    "coreFeatures": ["must-have feature 1", "must-have feature 2", "must-have feature 3"],
    "uniqueDifferentiator": "what makes this different from every competitor",
    "unfairAdvantage": "why this team/founder can win"
  },
  "marketOpportunity": {
    "targetMarketSize": "estimated TAM with reasoning",
    "serviceableMarket": "realistic SAM",
    "competitorGaps": ["gap 1 from research", "gap 2", "gap 3"]
  },
  "mvpScope": {
    "mustHave": ["feature 1", "feature 2", "feature 3"],
    "niceToHave": ["feature 4", "feature 5"],
    "outOfScope": ["feature 6", "feature 7"]
  },
  "monetization": {
    "model": "subscription | marketplace | freemium | one-time",
    "pricing": "specific price point with tiers if applicable",
    "rationale": "why this pricing will work given the research"
  },
  "goToMarket": {
    "primaryChannel": "most validated acquisition channel from research",
    "channels": ["channel 1", "channel 2", "channel 3"],
    "launchStrategy": "first 30 days plan",
    "first30Days": "concrete week-by-week actions"
  },
  "risks": ["risk 1 from research + conversation", "risk 2", "risk 3"],
  "nextSteps": ["immediate action 1", "action 2", "action 3"],
  "researchBacking": {
    "opportunityScore": 0,
    "dataPoints": 0,
    "verdict": "string",
    "keyEvidence": ["evidence 1 from research", "evidence 2"]
  },
  "summary": "2-3 sentence summary of what makes this proposal strong and where the founder should focus first"
}`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  console.log('[opportunity-chat] build:', 'json-mode-v1');

  try {
    const {
      opportunityId,
      message,
      mode = 'chat', // 'chat' | 'generate_proposal'
    } = await req.json();

    if (!opportunityId || (!message && mode === 'chat')) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    );
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load opportunity
    const { data: opportunity, error: oppError } = await serviceSupabase
      .from('business_opportunities')
      .select('id, title, description, target_market, problem_statement')
      .eq('id', opportunityId)
      .single();

    if (oppError || !opportunity) {
      return new Response(JSON.stringify({ error: 'Opportunity not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load research context from validation_workflows
    const { data: workflow } = await serviceSupabase
      .from('validation_workflows')
      .select('reddit_validation_results, product_proposal')
      .eq('opportunity_id', opportunityId)
      .maybeSingle();

    const research: ResearchContext = workflow?.reddit_validation_results || {};

    // Get or create chat session
    let { data: chat } = await serviceSupabase
      .from('opportunity_chats')
      .select('id')
      .eq('opportunity_id', opportunityId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!chat) {
      const { data: newChat, error: chatError } = await serviceSupabase
        .from('opportunity_chats')
        .insert({ opportunity_id: opportunityId, user_id: user.id })
        .select('id')
        .single();
      if (chatError) throw chatError;
      chat = newChat;
    }

    // Load conversation history
    const { data: historyRows } = await serviceSupabase
      .from('opportunity_chat_messages')
      .select('role, content')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true })
      .limit(40); // last 40 messages for context window management

    const history: ChatMessage[] = (historyRows || []) as ChatMessage[];
    const userMessageCount = history.filter(m => m.role === 'user').length;

    // Build messages array for OpenAI
    const systemPrompt = buildSystemPrompt(opportunity, research, userMessageCount);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
    ];

    // Add current user message (unless generate_proposal with no new message)
    const currentUserMessage = mode === 'generate_proposal'
      ? 'Please generate my Product Proposal now based on everything we have discussed.'
      : message;

    messages.push({ role: 'user', content: currentUserMessage });

    // Save user message to DB
    await serviceSupabase.from('opportunity_chat_messages').insert({
      chat_id: chat.id,
      role: 'user',
      content: currentUserMessage,
    });

    // Stream from OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: mode === 'generate_proposal' ? 8000 : 600,
        stream: true,
        ...(mode === 'generate_proposal'
          ? { response_format: { type: 'json_object' } }
          : {}),
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    });

    if (!openaiResponse.ok) {
      const err = await openaiResponse.text();
      throw new Error(`OpenAI error: ${openaiResponse.status} — ${err}`);
    }

    // Stream response back to client, collect full text for DB save
    let fullAssistantResponse = '';
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const finalize = async () => {
      if (!fullAssistantResponse) return;

      await serviceSupabase.from('opportunity_chat_messages').insert({
        chat_id: chat!.id,
        role: 'assistant',
        content: fullAssistantResponse,
      });

      if (mode === 'generate_proposal') {
        // JSON mode: the whole response IS the JSON.
        try {
          const proposalJson = JSON.parse(fullAssistantResponse);
          await serviceSupabase
            .from('validation_workflows')
            .update({ product_proposal: proposalJson, updated_at: new Date().toISOString() })
            .eq('opportunity_id', opportunityId);
        } catch (e) {
          console.error('[opportunity-chat] generate_proposal JSON.parse failed:',
            (e as Error).message, 'Length:', fullAssistantResponse.length);
        }
      } else if (fullAssistantResponse.includes('```proposal-json')) {
        // Legacy path: the user asked for a proposal inside normal chat mode.
        const proposalJson = extractProposalJson(fullAssistantResponse);
        if (proposalJson) {
          await serviceSupabase
            .from('validation_workflows')
            .update({ product_proposal: proposalJson, updated_at: new Date().toISOString() })
            .eq('opportunity_id', opportunityId);
        } else {
          console.error('[opportunity-chat] Legacy proposal extraction failed. Length:', fullAssistantResponse.length);
        }
      }

      await serviceSupabase
        .from('opportunity_chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chat!.id);
    };

    const stream = new ReadableStream({
      async start(controller) {
        const reader = openaiResponse.body!.getReader();
        let sseBuffer = '';
        let finished = false;

        const handleLine = (rawLine: string): 'done' | 'continue' => {
          const line = rawLine.trim();
          if (!line || !line.startsWith('data: ')) return 'continue';
          const data = line.slice(6);
          if (data === '[DONE]') return 'done';
          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content || '';
            if (token) {
              fullAssistantResponse += token;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
            }
          } catch { /* skip malformed frame */ }
          return 'continue';
        };

        try {
          outer: while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            // Buffer trailing partial line across reads — OpenAI's SSE frames
            // routinely split across chunk boundaries, and naively splitting
            // on '\n' drops the partial token on the floor.
            const lines = sseBuffer.split('\n');
            sseBuffer = lines.pop() ?? '';

            for (const rawLine of lines) {
              if (handleLine(rawLine) === 'done') {
                finished = true;
                break outer;
              }
            }
          }

          // Flush any trailing buffered line.
          if (!finished && sseBuffer) {
            if (handleLine(sseBuffer) === 'done') finished = true;
          }

          await finalize();
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('opportunity-chat error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
