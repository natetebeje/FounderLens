import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  opportunityId: string;
  title: string;
  description: string;
  targetMarket: string;
  problemStatement: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { opportunityId, title, description, targetMarket, problemStatement }: ValidationRequest = await req.json();

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get opportunity data including any existing research intelligence
    const { data: opportunityData, error: opportunityError } = await supabaseClient
      .from('business_opportunities')
      .select('reddit_analysis')
      .eq('id', opportunityId)
      .single();

    if (opportunityError) {
      console.error('Error fetching opportunity data:', opportunityError);
    }

    // Get existing research intelligence data if available
    const { data: researchData } = await supabaseClient
      .from('automated_market_intelligence')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .single();

    // Run enhanced automated validations in parallel
    const [
      competitorAnalysis, 
      marketSizing, 
      pricingResearch, 
      trendsAnalysis, 
      swotAnalysis, 
      communityValidation,
      customerValidation,
      financialValidation,
      technicalValidation
    ] = await Promise.all([
      analyzeCompetitors(title, description, targetMarket, openaiApiKey),
      analyzeMarketSize(title, description, targetMarket, openaiApiKey),
      analyzePricing(title, description, targetMarket, openaiApiKey),
      analyzeTrends(title, description, targetMarket, openaiApiKey),
      analyzeSwot(title, description, targetMarket, problemStatement, openaiApiKey),
      analyzeCommunityValidation(title, description, targetMarket, opportunityData?.reddit_analysis, openaiApiKey),
      analyzeCustomerValidation(title, description, targetMarket, problemStatement, openaiApiKey),
      analyzeFinancialViability(title, description, targetMarket, openaiApiKey),
      analyzeTechnicalFeasibility(title, description, openaiApiKey)
    ]);

    // Calculate enhanced confidence score with new validation types
    const confidenceScore = calculateAdvancedConfidenceScore({
      competitorAnalysis,
      marketSizing,
      pricingResearch,
      trendsAnalysis,
      communityValidation,
      customerValidation,
      financialValidation,
      technicalValidation,
      researchData
    });

    // Store enhanced results in automated_market_intelligence table
    const { error: insertError } = await supabaseClient
      .from('automated_market_intelligence')
      .upsert({
        opportunity_id: opportunityId,
        competitor_analysis: competitorAnalysis,
        market_sizing: marketSizing,
        pricing_research: pricingResearch,
        trends_analysis: trendsAnalysis,
        swot_analysis: swotAnalysis,
        confidence_score: confidenceScore
      });

    if (insertError) throw insertError;

    // Generate comprehensive recommendation
    const recommendation = generateIntelligentRecommendation({
      competitorAnalysis,
      marketSizing,
      pricingResearch,
      trendsAnalysis,
      communityValidation,
      customerValidation,
      financialValidation,
      technicalValidation,
      confidenceScore,
      researchData
    });

    // Update validation workflow with enhanced automated results
    const { error: updateError } = await supabaseClient
      .from('validation_workflows')
      .update({
        automated_validation_results: {
          competitorAnalysis,
          marketSizing,
          pricingResearch,
          trendsAnalysis,
          swotAnalysis,
          communityValidation,
          customerValidation,
          financialValidation,
          technicalValidation
        },
        automated_score: confidenceScore,
        automated_recommendation: recommendation,
        last_automated_validation: new Date().toISOString()
      })
      .eq('opportunity_id', opportunityId);

    if (updateError) throw updateError;

    // Auto-create smart AI tasks to replace manual ones
    await createSmartValidationTasks(supabaseClient, opportunityId, {
      customerValidation,
      financialValidation,
      technicalValidation
    });

    return new Response(
      JSON.stringify({
        success: true,
        confidenceScore,
        recommendation,
        results: {
          competitorAnalysis,
          marketSizing,
          pricingResearch,
          trendsAnalysis,
          swotAnalysis,
          communityValidation,
          customerValidation,
          financialValidation,
          technicalValidation
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in automated validation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

async function analyzeCompetitors(title: string, description: string, targetMarket: string, apiKey: string) {
  const prompt = `Analyze competitors for this business opportunity:
Title: ${title}
Description: ${description}
Target Market: ${targetMarket}

Provide a JSON response with:
- directCompetitors: array of 3-5 main competitors with names and brief descriptions
- indirectCompetitors: array of 2-3 indirect competitors
- competitiveAdvantages: array of potential advantages this opportunity could have
- threats: array of competitive threats
- marketPosition: suggested positioning strategy`;

  return await callOpenAI(prompt, apiKey);
}

async function analyzeMarketSize(title: string, description: string, targetMarket: string, apiKey: string) {
  const prompt = `Analyze market size for this business opportunity:
Title: ${title}
Description: ${description}
Target Market: ${targetMarket}

Provide a JSON response with:
- tamEstimate: Total Addressable Market estimate with reasoning
- samEstimate: Serviceable Addressable Market estimate
- somEstimate: Serviceable Obtainable Market estimate
- marketGrowthRate: estimated annual growth rate
- marketTrends: array of relevant market trends
- targetCustomerCount: estimated number of potential customers`;

  return await callOpenAI(prompt, apiKey);
}

async function analyzePricing(title: string, description: string, targetMarket: string, apiKey: string) {
  const prompt = `Analyze pricing strategy for this business opportunity:
Title: ${title}
Description: ${description}
Target Market: ${targetMarket}

Provide a JSON response with:
- pricingModel: recommended pricing model (subscription, one-time, freemium, etc.)
- priceRange: suggested price range with low/high estimates
- competitorPricing: analysis of how competitors price similar solutions
- valueProposition: key value drivers that justify pricing
- pricingSensitivity: assessment of target market's price sensitivity`;

  return await callOpenAI(prompt, apiKey);
}

async function analyzeTrends(title: string, description: string, targetMarket: string, apiKey: string) {
  const prompt = `Analyze trends for this business opportunity:
Title: ${title}
Description: ${description}
Target Market: ${targetMarket}

Provide a JSON response with:
- industryTrends: array of relevant industry trends
- technologyTrends: array of relevant technology trends
- consumerTrends: array of relevant consumer behavior trends
- regulatoryTrends: array of relevant regulatory changes
- opportunityTiming: assessment of market timing (early, perfect, late)
- riskFactors: array of trend-related risks`;

  return await callOpenAI(prompt, apiKey);
}

async function analyzeSwot(title: string, description: string, targetMarket: string, problemStatement: string, apiKey: string) {
  const prompt = `Perform a SWOT analysis for this business opportunity:
Title: ${title}
Description: ${description}
Target Market: ${targetMarket}
Problem Statement: ${problemStatement}

Provide a JSON response with:
- strengths: array of 3-4 internal strengths this opportunity has
- weaknesses: array of 3-4 internal weaknesses or challenges
- opportunities: array of 3-4 external opportunities in the market
- threats: array of 3-4 external threats or risks
- strategicInsights: array of 2-3 key strategic insights from the analysis
- overallAssessment: brief overall strategic assessment (2-3 sentences)

Be specific and actionable. Focus on business-relevant factors.`;

  return await callOpenAI(prompt, apiKey);
}

async function analyzeCommunityValidation(title: string, description: string, targetMarket: string, redditAnalysis: any, apiKey: string) {
  // If we have real Reddit data, use it
  if (redditAnalysis && Object.keys(redditAnalysis).length > 0) {
    return {
      discussionVolume: redditAnalysis.discussion_volume || 0,
      engagementRate: redditAnalysis.community_validation || 0,
      painPointIntensity: redditAnalysis.pain_point_intensity || 0,
      sourceSubreddits: redditAnalysis.source_subreddits || [],
      isLiveData: true,
      authenticityScore: 95,
      communityInsights: redditAnalysis.community_insights || []
    };
  }

  // Fallback to AI analysis if no Reddit data
  const prompt = `Analyze community validation for this business opportunity:
Title: ${title}
Description: ${description}
Target Market: ${targetMarket}

Provide a JSON response with:
- discussionVolume: estimated number of relevant discussions (0-100)
- engagementRate: estimated community engagement percentage (0-100)
- painPointIntensity: how intensely the community feels this pain (0-100)
- sourceSubreddits: array of relevant subreddit names
- communityInsights: array of 2-3 key insights about community sentiment
- isLiveData: false (since this is AI-generated)
- authenticityScore: confidence in the analysis (0-100)`;

  const aiResult = await callOpenAI(prompt, apiKey);
  
  return {
    discussionVolume: aiResult.discussionVolume || 0,
    engagementRate: aiResult.engagementRate || 0,
    painPointIntensity: aiResult.painPointIntensity || 0,
    sourceSubreddits: aiResult.sourceSubreddits || [],
    isLiveData: false,
    authenticityScore: aiResult.authenticityScore || 60,
    communityInsights: aiResult.communityInsights || []
  };
}

async function analyzeCustomerValidation(title: string, description: string, targetMarket: string, problemStatement: string, apiKey: string) {
  const prompt = `Analyze customer validation for this business opportunity:
Title: ${title}
Description: ${description}
Target Market: ${targetMarket}
Problem Statement: ${problemStatement}

Provide a JSON response with:
- customerSegments: array of 2-3 primary customer segments with demographics
- painPointIntensity: score 0-100 for how severe the problem is
- solutionFit: score 0-100 for how well the solution addresses the problem
- willingnessToPay: estimated percentage of customers willing to pay
- customerAcquisitionChannels: array of 3-4 most effective acquisition channels
- customerLifetimeValue: estimated CLV range
- churnRisk: assessment of customer retention challenges
- validationMethods: recommended methods to validate with real customers`;

  return await callOpenAI(prompt, apiKey);
}

async function analyzeFinancialViability(title: string, description: string, targetMarket: string, apiKey: string) {
  const prompt = `Analyze financial viability for this business opportunity:
Title: ${title}
Description: ${description}
Target Market: ${targetMarket}

Provide a JSON response with:
- revenueModel: recommended revenue model (subscription, one-time, marketplace, etc.)
- unitEconomics: basic unit economics analysis with CAC and LTV estimates
- breakEvenAnalysis: estimated timeline to break even
- fundingRequirements: estimated capital needed for launch and first year
- profitabilityTimeline: estimated timeline to profitability
- keyFinancialRisks: array of main financial risks
- scalabilityFactors: factors that could drive rapid revenue growth
- cashFlowProjection: basic first-year cash flow assessment`;

  return await callOpenAI(prompt, apiKey);
}

async function analyzeTechnicalFeasibility(title: string, description: string, apiKey: string) {
  const prompt = `Analyze technical feasibility for this business opportunity:
Title: ${title}
Description: ${description}

Provide a JSON response with:
- technicalComplexity: score 0-100 for overall development complexity
- developmentTimeline: estimated development time in months
- technologyStack: recommended technology stack
- infrastructureNeeds: basic infrastructure requirements
- scalabilityRequirements: technical scalability considerations
- securityRequirements: key security considerations
- integrationComplexity: complexity of required third-party integrations
- maintenanceRequirements: ongoing technical maintenance needs
- technicalRisks: array of key technical risks
- mvpFeasibility: assessment of minimum viable product development`;

  return await callOpenAI(prompt, apiKey);
}

async function createSmartValidationTasks(supabaseClient: any, opportunityId: string, validationResults: any) {
  const smartTasks = [];

  // Customer validation task
  if (validationResults.customerValidation?.painPointIntensity < 70) {
    smartTasks.push({
      opportunity_id: opportunityId,
      title: 'Customer Pain Point Validation',
      description: `AI detected moderate pain point intensity (${validationResults.customerValidation.painPointIntensity}/100). Validate customer pain points through direct customer interviews.`,
      task_type: 'customer_validation',
      status: 'pending',
      priority: 'high',
      is_automated: false,
      estimated_hours: 8,
      progress_percentage: 0
    });
  }

  // Financial validation task
  if (validationResults.financialValidation?.profitabilityTimeline > 24) {
    smartTasks.push({
      opportunity_id: opportunityId,
      title: 'Financial Model Validation',
      description: `AI estimates ${validationResults.financialValidation.profitabilityTimeline} months to profitability. Validate financial assumptions and create detailed projections.`,
      task_type: 'financial_validation',
      status: 'pending',
      priority: 'medium',
      is_automated: false,
      estimated_hours: 6,
      progress_percentage: 0
    });
  }

  // Technical validation task
  if (validationResults.technicalValidation?.technicalComplexity > 70) {
    smartTasks.push({
      opportunity_id: opportunityId,
      title: 'Technical Architecture Review',
      description: `AI detected high technical complexity (${validationResults.technicalValidation.technicalComplexity}/100). Review technical architecture and validate development approach.`,
      task_type: 'technical_validation',
      status: 'pending',
      priority: 'medium',
      is_automated: false,
      estimated_hours: 4,
      progress_percentage: 0
    });
  }

  // Insert smart tasks if any were created
  if (smartTasks.length > 0) {
    const { error } = await supabaseClient
      .from('validation_tasks')
      .insert(smartTasks);
    
    if (error) {
      console.error('Error creating smart validation tasks:', error);
    }
  }
}

async function callOpenAI(prompt: string, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: 'You are a business analyst expert. Always respond with valid JSON only, no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Invalid OpenAI response structure:', data);
    throw new Error('Invalid response structure from OpenAI');
  }
  
  const content = data.choices[0].message.content;
  console.log('OpenAI response content:', content);
  
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse JSON from OpenAI:', content);
    // Return a fallback object if JSON parsing fails
    return {
      analysis: content,
      error: 'Could not parse as JSON',
      fallback: true
    };
  }
}

// Extract a number from any LLM response value (string, number, object)
function extractNum(val: any): number {
  if (val == null) return NaN;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Extract first number from strings like "18-24 months", "$50M", "15%", "3.5x"
    const match = val.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : NaN;
  }
  if (typeof val === 'object') {
    // Try common keys: value, estimate, score, timeline, months
    for (const key of ['value', 'estimate', 'score', 'months', 'timeline', 'level', 'percentage']) {
      if (val[key] != null) return extractNum(val[key]);
    }
  }
  return NaN;
}

function calculateAdvancedConfidenceScore(results: any): number {
  let score = 0;

  // Baseline: credit for each non-fallback analysis section that has meaningful content
  const sections = [
    results.competitorAnalysis,
    results.marketSizing,
    results.customerValidation,
    results.financialValidation,
    results.technicalValidation,
    results.communityValidation,
  ];
  const validSections = sections.filter(s => s != null && typeof s === 'object' && !s.fallback && Object.keys(s).length > 1);
  score += validSections.length * 3; // 3 points per present section (up to 18)

  // Market Analysis Component (25% weight)
  if (results.competitorAnalysis && !results.competitorAnalysis.fallback) {
    const competitors = results.competitorAnalysis.directCompetitors;
    const advantages = results.competitorAnalysis.competitiveAdvantages;
    if (Array.isArray(competitors) && competitors.length >= 3) score += 8;
    else if (Array.isArray(competitors) && competitors.length >= 1) score += 4;
    if (Array.isArray(advantages) && advantages.length >= 2) score += 6;
    else if (Array.isArray(advantages) && advantages.length >= 1) score += 3;
  }
  if (results.marketSizing && !results.marketSizing.fallback) {
    if (results.marketSizing.tamEstimate) score += 6;
    const growthRate = extractNum(results.marketSizing.marketGrowthRate);
    if (!isNaN(growthRate) && growthRate > 0) score += 5;
  }

  // Customer Validation Component (25% weight)
  if (results.customerValidation && !results.customerValidation.fallback) {
    const cv = results.customerValidation;
    const pain = extractNum(cv.painPointIntensity);
    const fit = extractNum(cv.solutionFit);
    const wtp = extractNum(cv.willingnessToPay);
    if (!isNaN(pain)) { if (pain >= 70) score += 8; else if (pain >= 50) score += 5; else if (pain > 0) score += 2; }
    if (!isNaN(fit)) { if (fit >= 70) score += 8; else if (fit >= 50) score += 5; else if (fit > 0) score += 2; }
    if (!isNaN(wtp)) { if (wtp >= 60) score += 9; else if (wtp >= 40) score += 6; else if (wtp > 0) score += 3; }
  }

  // Financial Viability Component (20% weight)
  if (results.financialValidation && !results.financialValidation.fallback) {
    const fv = results.financialValidation;
    const profit = extractNum(fv.profitabilityTimeline);
    const breakEven = extractNum(fv.breakEvenAnalysis);
    const ltv = extractNum(fv.unitEconomics?.ltvCacRatio);
    if (!isNaN(profit)) { if (profit <= 18) score += 7; else if (profit <= 36) score += 4; else score += 2; }
    if (!isNaN(breakEven)) { if (breakEven <= 12) score += 6; else if (breakEven <= 24) score += 3; else score += 1; }
    if (!isNaN(ltv)) { if (ltv >= 3) score += 7; else if (ltv >= 2) score += 4; else score += 1; }
    // Give credit just for having financial data even if numbers don't parse
    if (isNaN(profit) && isNaN(breakEven) && fv.revenueModel) score += 5;
  }

  // Technical Feasibility Component (15% weight)
  if (results.technicalValidation && !results.technicalValidation.fallback) {
    const tv = results.technicalValidation;
    const complexity = extractNum(tv.technicalComplexity);
    const devTime = extractNum(tv.developmentTimeline);
    if (!isNaN(complexity)) { if (complexity <= 50) score += 8; else if (complexity <= 70) score += 5; else score += 2; }
    if (!isNaN(devTime)) { if (devTime <= 6) score += 7; else if (devTime <= 12) score += 4; else score += 2; }
    // Credit for having technical analysis
    if (isNaN(complexity) && isNaN(devTime) && tv.technologyStack) score += 5;
  }

  // SWOT Analysis Component (up to 10 points)
  const swot = results.swotAnalysis || results.swot_analysis;
  if (swot && !swot.fallback) {
    for (const key of ['strengths', 'weaknesses', 'opportunities', 'threats']) {
      if (Array.isArray(swot[key]) && swot[key].length > 0) score += 2.5;
    }
  }

  // Community & Trends Component (15% weight)
  if (results.communityValidation && !results.communityValidation.fallback) {
    const cv = results.communityValidation;
    const volume = extractNum(cv.discussionVolume);
    const pain = extractNum(cv.painPointIntensity);
    const engagement = extractNum(cv.engagementRate);
    if (!isNaN(volume) && volume >= 30) score += 5;
    else if (!isNaN(volume) && volume > 0) score += 2;
    if (!isNaN(pain) && pain >= 60) score += 5;
    else if (!isNaN(pain) && pain > 0) score += 2;
    if (!isNaN(engagement) && engagement >= 20) score += 5;
    else if (!isNaN(engagement) && engagement > 0) score += 2;
  }

  // Real data bonus
  if (results.researchData?.competitor_analysis?.googleTrends?.isRealData) {
    score += 5;
  }

  return Math.min(score, 100);
}

function generateIntelligentRecommendation(data: any): string {
  const { confidenceScore, customerValidation, financialValidation, technicalValidation, communityValidation } = data;
  
  let recommendation = '';
  let riskFactors = [];
  let strengths = [];
  
  // Analyze strengths
  if (customerValidation?.painPointIntensity >= 70) strengths.push('strong customer pain validation');
  if (financialValidation?.profitabilityTimeline <= 18) strengths.push('quick path to profitability');
  if (technicalValidation?.technicalComplexity <= 50) strengths.push('manageable technical complexity');
  if (communityValidation?.discussionVolume >= 30) strengths.push('active community interest');
  
  // Analyze risks
  if (customerValidation?.willingnessToPay < 50) riskFactors.push('low willingness to pay');
  if (financialValidation?.profitabilityTimeline > 36) riskFactors.push('long path to profitability');
  if (technicalValidation?.technicalComplexity > 80) riskFactors.push('high technical complexity');
  
  // Generate recommendation based on score and analysis
  if (confidenceScore >= 80) {
    recommendation = `🚀 **STRONG RECOMMENDATION** (${confidenceScore}% confidence)\n\n`;
    recommendation += `**Key Strengths:** ${strengths.join(', ')}\n`;
    recommendation += `**Action:** Proceed to MVP development phase immediately.\n`;
    if (riskFactors.length > 0) {
      recommendation += `**Monitor:** ${riskFactors.join(', ')}`;
    }
  } else if (confidenceScore >= 60) {
    recommendation = `⚠️ **CONDITIONAL RECOMMENDATION** (${confidenceScore}% confidence)\n\n`;
    recommendation += `**Strengths:** ${strengths.join(', ')}\n`;
    recommendation += `**Risks:** ${riskFactors.join(', ')}\n`;
    recommendation += `**Action:** Address key risks before proceeding to development.\n`;
    
    // Specific recommendations based on validation results
    if (customerValidation?.painPointIntensity < 60) {
      recommendation += `\n🎯 **Priority:** Conduct customer interviews to validate pain points`;
    }
    if (financialValidation?.profitabilityTimeline > 24) {
      recommendation += `\n💰 **Priority:** Refine business model and unit economics`;
    }
  } else {
    recommendation = `❌ **NOT RECOMMENDED** (${confidenceScore}% confidence)\n\n`;
    recommendation += `**Major Concerns:** ${riskFactors.join(', ')}\n`;
    recommendation += `**Action:** Consider pivoting or conducting deeper market research.\n`;
    
    if (customerValidation?.painPointIntensity < 40) {
      recommendation += `\n⚠️ **Critical:** Customer pain point validation shows weak market need`;
    }
    if (technicalValidation?.technicalComplexity > 90) {
      recommendation += `\n⚠️ **Critical:** Technical complexity may exceed available resources`;
    }
  }
  
  return recommendation;
}
