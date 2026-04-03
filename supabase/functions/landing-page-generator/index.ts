
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { opportunity } = await req.json();
    
    if (!opportunity) {
      throw new Error('Opportunity data is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Generating landing page for opportunity:', opportunity.title);

    const prompt = `
Create a compelling landing page for a business opportunity with the following details:

Title: ${opportunity.title}
Description: ${opportunity.description}
Problem: ${opportunity.problem_statement}
Target Market: ${opportunity.target_market}
Market Size: ${opportunity.market_size_estimate}
Competition Level: ${opportunity.competition_level}
Difficulty: ${opportunity.difficulty_level}

Generate a realistic landing page with:
1. A compelling headline (max 60 characters)
2. A subheadline that addresses the problem (max 120 characters)
3. 4-6 key features or benefits
4. 3 pricing tiers with realistic pricing based on market size
5. 2-3 testimonials that sound authentic for this target market
6. A clear call-to-action

Return the response as a JSON object with the following structure:
{
  "headline": "string",
  "subheadline": "string", 
  "features": ["string", "string", ...],
  "pricing": {
    "starter": "string",
    "professional": "string", 
    "enterprise": "string"
  },
  "testimonials": [
    {
      "name": "string",
      "role": "string",
      "quote": "string"
    }
  ],
  "cta": "string"
}

Make it specific to the opportunity and target market. Ensure pricing is realistic for the market size and competition level.
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
            content: 'You are a marketing expert who creates compelling landing pages. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    let landingPage;
    try {
      landingPage = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Failed to parse AI response');
    }

    // Add metadata about generation
    landingPage.isAiGenerated = true;
    landingPage.generatedAt = new Date().toISOString();
    landingPage.confidence = 'high';

    console.log('Successfully generated landing page');

    return new Response(JSON.stringify(landingPage), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in landing-page-generator function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to generate landing page'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
