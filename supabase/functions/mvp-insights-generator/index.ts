import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MVPInsightRequest {
  summaries: any[];
  opportunityId: string;
  organizationId?: string;
}

async function generateMVPInsights(summaries: any[]): Promise<any[]> {
  const combinedSummaries = summaries.map(s => ({
    summary: s.user_edited_summary || s.ai_generated_summary,
    painPoints: Array.isArray(s.key_pain_points) ? s.key_pain_points : [],
    solutions: Array.isArray(s.proposed_solutions) ? s.proposed_solutions : [],
    marketSignals: Array.isArray(s.market_signals) ? s.market_signals : []
  }));

  const prompt = `
You are a product strategist analyzing Reddit discussions to generate MVP (Minimum Viable Product) insights.

DISCUSSION SUMMARIES:
${combinedSummaries.map((s, i) => `
Summary ${i + 1}:
${s.summary}

Pain Points: ${s.painPoints.join(', ')}
Solutions Mentioned: ${s.solutions.join(', ')}
Market Signals: ${s.marketSignals.join(', ')}
`).join('\n---\n')}

TASK:
Generate specific MVP insights that can guide product development. Focus on:

1. FEATURE REQUESTS: What specific features/functionality do users want?
2. PAIN POINTS: What core problems need to be solved?
3. COMPETITOR ANALYSIS: What existing solutions are mentioned and their weaknesses?
4. PRICING INSIGHTS: What pricing models or cost concerns are discussed?

For each insight, provide:
- Clear title and description
- Supporting evidence from discussions
- Impact score (1-100)
- Implementation complexity (low/medium/high)

Return as JSON array:
[
  {
    "type": "feature_request",
    "title": "Specific feature title",
    "description": "Detailed description of the feature need",
    "supportingEvidence": {
      "userQuotes": ["quote 1", "quote 2"],
      "painPoints": ["related pain point"],
      "frequency": "how often mentioned"
    },
    "impactScore": 85,
    "implementationComplexity": "medium",
    "mvpRelevance": "why this is important for MVP"
  }
]

Generate 5-10 high-quality insights that would be most valuable for MVP development.
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a product strategist who excels at extracting actionable MVP insights from user discussions. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to parse OpenAI response as JSON:', content);
    throw new Error('Invalid JSON response from AI analysis');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { summaries, opportunityId, organizationId }: MVPInsightRequest = await req.json();

    console.log('🎯 Generating MVP insights from', summaries.length, 'summaries');

    const insights = await generateMVPInsights(summaries);

    // Save insights to database
    const insightsToSave = insights.map(insight => ({
      opportunity_id: opportunityId,
      organization_id: organizationId,
      insight_type: insight.type,
      insight_title: insight.title,
      insight_description: insight.description,
      supporting_evidence: insight.supportingEvidence,
      impact_score: insight.impactScore,
      implementation_complexity: insight.implementationComplexity,
      user_validation_count: 0,
      is_included_in_mvp: insight.impactScore >= 70 // Auto-include high impact insights
    }));

    const { data: savedInsights, error: saveError } = await supabase
      .from('mvp_insights')
      .insert(insightsToSave)
      .select();

    if (saveError) {
      console.error('Error saving MVP insights:', saveError);
      throw saveError;
    }

    console.log('✅ Saved', savedInsights?.length || 0, 'MVP insights');

    return new Response(JSON.stringify({
      success: true,
      insights: savedInsights,
      message: `Generated ${insights.length} MVP insights from discussion analysis`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating MVP insights:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});