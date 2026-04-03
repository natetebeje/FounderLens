import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

interface AnalysisRequest {
  discussion: {
    title: string;
    content: string;
    comments: any[];
    subreddit: string;
    engagement: {
      score: number;
      comments: number;
      upvote_ratio?: number;
    };
  };
  analysisType: 'comprehensive' | 'pain_points' | 'solutions' | 'market_signals';
}

// GigaBrain-style comprehensive analysis with follow-up questions
async function analyzeWithOpenAI(discussion: any, analysisType: string): Promise<any> {
  const { title, content, comments, subreddit, engagement } = discussion;
  
  const commentsText = comments.map((c: any) => `Comment by ${c.author}: ${c.body}`).join('\n\n');
  
  if (analysisType === 'comprehensive') {
    return await comprehensiveAnalysis(discussion);
  } else if (analysisType === 'follow_up_questions') {
    return await generateFollowUpQuestions(discussion);
  } else if (analysisType === 'overall_summary') {
    return await generateOverallSummary([discussion]);
  }
  
  // Default analysis
  const prompt = `
You are GigaBrain AI - an expert market researcher analyzing Reddit discussions for business opportunities with extreme precision and relevance.

DISCUSSION DETAILS:
Title: ${title}
Subreddit: r/${subreddit}
Content: ${content || 'No additional content'}
Top Comments: ${commentsText || 'No comments available'}
Engagement: ${engagement.score} upvotes, ${engagement.comments} comments

GIGABRAIN ANALYSIS TASK:
Analyze this discussion with business-focused intelligence. Focus on:

1. BUSINESS PAIN POINTS: Specific business problems, not personal issues
2. MARKET SOLUTIONS: Actual tools, services, or approaches being discussed
3. DEMAND SIGNALS: Clear indicators of market demand and willingness to pay
4. COMPETITIVE LANDSCAPE: What solutions are mentioned and their gaps
5. BUSINESS CONTEXT: Professional vs. personal context classification

Return your analysis in this JSON format:
{
  "summary": "Business-focused 2-3 sentence summary emphasizing market opportunities",
  "painPoints": ["business-specific pain point 1", "professional challenge 2", ...],
  "solutions": ["tool/service 1 mentioned", "approach 2 discussed", ...],
  "marketSignals": ["demand indicator 1", "market validation 2", ...],
  "businessContext": {
    "userType": "professional persona (e.g., 'B2B decision makers', 'startup founders')",
    "context": "business/technical/consumer",
    "expertise": "beginner/intermediate/expert",
    "willingness_to_pay": "evidence of payment willingness or budget discussions"
  },
  "businessOpportunity": "Clear business opportunity with market validation evidence",
  "relevanceScore": 95,
  "confidenceScore": 88
}

CRITICAL: Focus on business relevance. Exclude personal stories unless they reveal business pain points.
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: 'You are GigaBrain AI, a specialized market research AI that provides extremely relevant business insights from online discussions. You excel at distinguishing business opportunities from noise.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2, // Lower temperature for more focused analysis
      max_tokens: 1500
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content_text = data.choices[0].message.content;
  
  try {
    return JSON.parse(content_text);
  } catch (error) {
    console.error('Failed to parse OpenAI response as JSON:', content_text);
    throw new Error('Invalid JSON response from AI analysis');
  }
}

// GigaBrain's comprehensive analysis function
async function comprehensiveAnalysis(discussion: any): Promise<any> {
  const { title, content, comments, subreddit, engagement } = discussion;
  const commentsText = comments.map((c: any) => `Comment by ${c.author}: ${c.body}`).join('\n\n');
  
  const prompt = `
As GigaBrain AI, provide a comprehensive business analysis of this Reddit discussion:

Title: ${title}
Subreddit: r/${subreddit}
Content: ${content || 'No additional content'}
Comments: ${commentsText || 'No comments available'}

Provide deep business intelligence including:
- Market demand validation
- Competitive landscape insights  
- User persona analysis
- Business model implications
- Revenue opportunities
- Market size indicators

Return comprehensive JSON analysis focusing on actionable business insights.
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: 'You are GigaBrain AI specializing in comprehensive business analysis.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 2000
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// GigaBrain's follow-up question generation
async function generateFollowUpQuestions(discussions: any): Promise<any> {
  const prompt = `
Based on this Reddit discussion analysis, generate 5 intelligent follow-up questions that would help validate the business opportunity further.

Focus on:
1. Market size and demand validation
2. Customer willingness to pay and pricing
3. Competition landscape and differentiation
4. Feature prioritization and MVP development
5. Go-to-market strategy and customer acquisition

Discussion: ${discussions.title}

Return JSON with: { "followUpQuestions": ["question 1", "question 2", ...] }
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: 'You are GigaBrain AI generating strategic market research questions.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 800
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// GigaBrain's overall summary generation
async function generateOverallSummary(discussions: any[]): Promise<any> {
  const discussionSummaries = discussions.map(d => `${d.title}: ${d.content || 'No content'}`).join('\n\n');
  
  const prompt = `
Analyze these Reddit discussions and provide a comprehensive market summary like GigaBrain:

${discussionSummaries}

Provide a comprehensive summary focusing on:
1. Overall market demand signals
2. Common pain points across discussions
3. Solution gaps and opportunities  
4. Business model insights
5. Market validation evidence

Return JSON: { "overallSummary": "3-4 sentence comprehensive market intelligence summary", "keyInsights": ["insight 1", "insight 2", ...] }
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: 'You are GigaBrain AI providing comprehensive market intelligence summaries.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1000
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { discussion, analysisType }: AnalysisRequest = await req.json();

    console.log('🧠 GigaBrain analyzing discussion:', discussion.title, 'Type:', analysisType);

    const analysis = await analyzeWithOpenAI(discussion, analysisType);

    console.log('✅ GigaBrain analysis completed:', {
      confidence: analysis.confidenceScore,
      relevance: analysis.relevanceScore,
      type: analysisType
    });

    // Return different structures based on analysis type
    if (analysisType === 'follow_up_questions') {
      return new Response(JSON.stringify({
        success: true,
        followUpQuestions: analysis.followUpQuestions || [],
        analysisType
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (analysisType === 'overall_summary') {
      return new Response(JSON.stringify({
        success: true,
        overallSummary: analysis.overallSummary,
        keyInsights: analysis.keyInsights || [],
        analysisType
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default comprehensive analysis
    return new Response(JSON.stringify({
      success: true,
      summary: analysis.summary,
      painPoints: analysis.painPoints || [],
      solutions: analysis.solutions || [],
      marketSignals: analysis.marketSignals || [],
      businessContext: analysis.businessContext || analysis.demographics || {},
      businessOpportunity: analysis.businessOpportunity,
      relevanceScore: analysis.relevanceScore || 75,
      confidenceScore: analysis.confidenceScore || 75,
      analysisType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI discussion analysis:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});