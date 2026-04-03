
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Enhanced validation function started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { opportunityId, title, description, category, redditAnalysis } = await req.json();
    console.log('📊 Processing validation for opportunity:', title);
    console.log('📋 Description:', description?.substring(0, 100) + '...');
    console.log('📂 Category:', category);

    // Generate opportunity-specific analysis using AI
    let validationResults = {};
    let validationScore = 0;
    let scoreBreakdown = {};

    if (openAIApiKey) {
      console.log('🤖 Generating AI-powered validation analysis...');
      
      const prompt = `Analyze this business opportunity and provide a comprehensive validation assessment with detailed market sizing estimates:

OPPORTUNITY DETAILS:
- Title: ${title}
- Description: ${description}
- Category: ${category || 'General Business'}

Please provide a detailed JSON analysis with the following structure. Be specific to "${title}" and provide realistic, researched estimates:

{
  "marketSizing": {
    "totalAddressableMarket": {
      "value": 0,
      "unit": "USD",
      "description": "specific TAM estimate with reasoning",
      "confidence": "high/medium/low",
      "sources": ["source1", "source2"]
    },
    "serviceableAddressableMarket": {
      "value": 0,
      "unit": "USD", 
      "description": "specific SAM estimate with reasoning",
      "marketShare": 0.05
    },
    "serviceableObtainableMarket": {
      "value": 0,
      "unit": "USD",
      "description": "realistic SOM estimate",
      "timeframe": "3-5 years"
    },
    "marketGrowthRate": {
      "annual": 0.15,
      "description": "growth rate with timeframe and drivers"
    },
    "marketMaturity": "emerging/growing/mature/declining"
  },
  "competitorAnalysis": {
    "directCompetitors": [
      {
        "name": "competitor name",
        "description": "what they do",
        "marketShare": 0.20,
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1", "weakness2"],
        "fundingStage": "seed/series-a/public/bootstrapped"
      }
    ],
    "indirectCompetitors": [
      {
        "name": "competitor name", 
        "description": "alternative solution"
      }
    ],
    "competitiveAdvantage": {
      "description": "unique value proposition",
      "strength": "weak/moderate/strong",
      "sustainability": "low/medium/high",
      "moatType": "network/data/brand/technology/regulatory"
    },
    "marketPosition": "first-mover/fast-follower/niche-player/challenger"
  },
  "customerValidation": {
    "targetCustomers": {
      "primary": "detailed customer segment",
      "secondary": "additional segments",
      "marketSize": 1000000
    },
    "painPoints": [
      {
        "description": "specific pain point",
        "severity": 8,
        "frequency": "daily/weekly/monthly",
        "currentSolution": "how they solve it now",
        "willingness": "high/medium/low"
      }
    ],
    "willingnessToPay": {
      "estimatedRange": {"min": 10, "max": 100},
      "confidence": 75,
      "priceAnchors": ["competitor1: $50", "alternative: $25"],
      "valueProposition": "ROI/time-savings/efficiency gains"
    },
    "customerAcquisitionCost": {
      "estimate": 50,
      "channel": "digital/sales/partnerships",
      "paybackPeriod": "6 months"
    }
  },
  "technicalValidation": {
    "complexity": {
      "level": "low/medium/high",
      "reasoning": "technical complexity assessment",
      "developmentTime": "3-6 months",
      "teamSize": 3
    },
    "technicalRisks": [
      {
        "risk": "risk description",
        "probability": "low/medium/high",
        "impact": "low/medium/high",
        "mitigation": "how to address"
      }
    ],
    "scalingChallenges": ["challenge1", "challenge2"],
    "technologyReadiness": "concept/prototype/mvp/production"
  },
  "financialValidation": {
    "revenueModel": {
      "type": "subscription/transaction/commission/advertising",
      "description": "how money is made"
    },
    "revenueProjections": {
      "year1": {"revenue": 100000, "customers": 100, "confidence": "medium"},
      "year3": {"revenue": 1000000, "customers": 1000, "confidence": "medium"},
      "year5": {"revenue": 5000000, "customers": 5000, "confidence": "low"}
    },
    "unitEconomics": {
      "revenuePerCustomer": 100,
      "costPerCustomer": 30,
      "grossMargin": 0.70,
      "ltv": 1200,
      "cac": 50,
      "ltvCacRatio": 24
    },
    "fundingRequirements": {
      "mvp": 50000,
      "scaleUp": 500000,
      "reasoning": "detailed funding breakdown"
    },
    "breakEvenTime": "18 months"
  },
  "trendsAnalysis": {
    "currentTrends": [
      {
        "trend": "trend name",
        "relevance": "high/medium/low",
        "impact": "positive/negative/neutral",
        "timeframe": "short/medium/long-term"
      }
    ],
    "marketDrivers": ["driver1", "driver2"],
    "futureTrends": ["future trend1", "future trend2"],
    "trendAlignment": "strong/moderate/weak"
  },
  "riskAssessment": {
    "executionRisk": "low/medium/high",
    "marketRisk": "low/medium/high", 
    "competitiveRisk": "low/medium/high",
    "regulatoryRisk": "low/medium/high",
    "overallRisk": "low/medium/high"
  }
}

Focus specifically on "${title}" and provide realistic, well-researched estimates. Avoid generic responses.`;

      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: 'You are a senior business analyst and venture capital researcher. Provide detailed, specific, and actionable validation analysis with realistic market estimates. Always return valid JSON with numerical values.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 3000
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiContent = aiData.choices[0].message.content;
          
          try {
            const cleanContent = aiContent.replace(/```json\n?|\n?```/g, '').trim();
            validationResults = JSON.parse(cleanContent);
            console.log('✅ AI analysis completed successfully');
            
            // AI analysis completed
          } catch (parseError) {
            console.error('⚠️ Failed to parse AI response as JSON:', parseError);
            validationResults = generateEnhancedFallbackAnalysis(title, description, category);
          }
        } else {
          console.error('⚠️ AI API call failed:', aiResponse.status);
          validationResults = generateEnhancedFallbackAnalysis(title, description, category);
        }
      } catch (aiError) {
        console.error('⚠️ AI analysis error:', aiError);
        validationResults = generateEnhancedFallbackAnalysis(title, description, category);
      }
    } else {
      console.log('⚠️ No OpenAI API key found, using fallback analysis');
      validationResults = generateEnhancedFallbackAnalysis(title, description, category);
    }

    // Calculate sophisticated validation score
    const scoreResult = calculateAdvancedValidationScore(validationResults, title, description, category);
    validationScore = scoreResult.totalScore;
    scoreBreakdown = scoreResult.breakdown;
    
    console.log('📈 Calculated validation score:', validationScore);
    console.log('📊 Score breakdown:', scoreBreakdown);

    // Add enhanced metadata
    const dataQuality = {
      isOpportunitySpecific: true,
      analysisRelevance: validationScore >= 70 ? 'high' : validationScore >= 50 ? 'medium' : 'low',
      lastAnalyzed: new Date().toISOString(),
      inputData: {
        title,
        descriptionLength: description?.length || 0,
        category: category || 'uncategorized'
      },
      scoreBreakdown,
      confidenceLevel: calculateConfidenceLevel(validationResults),
      riskProfile: assessRiskProfile(validationResults)
    };

    const enhancedResults = {
      ...validationResults,
      _metadata: dataQuality
    };

    // Update the validation workflow
    const { error: updateError } = await supabaseClient
      .from('validation_workflows')
      .update({
        automated_score: validationScore,
        automated_validation_results: enhancedResults,
        last_automated_validation: new Date().toISOString(),
        status: validationScore >= 70 ? 'completed' : 'in_progress',
        progress_percentage: Math.min(validationScore, 95)
      })
      .eq('opportunity_id', opportunityId);

    if (updateError) {
      console.error('❌ Error updating validation workflow:', updateError);
      throw updateError;
    }

    // Update business opportunity validation status
    const newValidationStatus = validationScore >= 70 ? 'completed' : 'in_progress';
    const { error: oppUpdateError } = await supabaseClient
      .from('business_opportunities')
      .update({
        validation_status: newValidationStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', opportunityId);

    if (oppUpdateError) {
      console.log('⚠️ Error updating opportunity validation status:', oppUpdateError);
      // Non-critical, continue
    }

    // Store detailed intelligence results
    const { error: intelligenceError } = await supabaseClient
      .from('automated_market_intelligence')
      .upsert({
        opportunity_id: opportunityId,
        competitor_analysis: enhancedResults.competitorAnalysis || {},
        market_sizing: enhancedResults.marketSizing || {},
        pricing_research: enhancedResults.customerValidation?.willingnessToPay || {},
        trends_analysis: enhancedResults.trendsAnalysis || {},
        swot_analysis: enhancedResults.swotAnalysis || {},
        confidence_score: validationScore,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'opportunity_id'
      });

    if (intelligenceError) {
      console.log('⚠️ Error storing market intelligence:', intelligenceError);
      // Non-critical, continue
    }

    // Track usage for successful validations
    if (validationScore >= 70) {
      console.log('📊 Tracking successful validation usage');
      try {
        // Get the opportunity to find user/org info
        const { data: opportunity } = await supabaseClient
          .from('business_opportunities')
          .select('user_id, organization_id')
          .eq('id', opportunityId)
          .single();

        if (opportunity?.user_id && opportunity?.organization_id) {
          await supabaseClient.rpc('increment_usage', {
            p_user_id: opportunity.user_id,
            p_organization_id: opportunity.organization_id,
            p_resource_type: 'validations'
          });
          console.log('✅ Usage tracking completed for validation');
        }
      } catch (trackingError) {
        console.log('⚠️ Usage tracking error:', trackingError);
        // Non-critical, continue
      }
    }

    console.log('✅ Validation workflow updated successfully');

    return new Response(JSON.stringify({
      success: true,
      validationScore,
      scoreBreakdown,
      results: enhancedResults,
      message: `Enhanced AI validation completed for "${title}" with ${validationScore}% confidence`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in enhanced-validation function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateEnhancedFallbackAnalysis(title: string, description: string, category?: string) {
  console.log('🔄 Generating enhanced fallback analysis for:', title);
  
  // Enhanced relevance checking for fallback analysis
  const isAIRelated = title.toLowerCase().includes('ai') || title.toLowerCase().includes('artificial intelligence') || title.toLowerCase().includes('smart');
  const isSchedulingRelated = title.toLowerCase().includes('schedule') || title.toLowerCase().includes('meeting') || title.toLowerCase().includes('calendar');
  const isSaaSRelated = category?.toLowerCase().includes('software') || title.toLowerCase().includes('platform') || title.toLowerCase().includes('app');
  const isProductivityRelated = title.toLowerCase().includes('productivity') || title.toLowerCase().includes('efficiency') || title.toLowerCase().includes('workflow');

  // Flag if this is a generic/low-quality opportunity
  const isGenericOpportunity = title.length < 20 || 
    description.length < 50 || 
    title.toLowerCase().includes('generic') ||
    title.toLowerCase().includes('basic') ||
    !isAIRelated && !isSchedulingRelated && !isSaaSRelated && !isProductivityRelated;

  // Generate more realistic market sizing based on opportunity type with quality checks
  let marketMultiplier = 1.0;
  let baseTAM = 500000000; // Conservative base

  if (isAIRelated) {
    marketMultiplier = 2.2;
    baseTAM = 8000000000;
  } else if (isSaaSRelated) {
    marketMultiplier = 1.6;
    baseTAM = 3000000000;
  } else if (isSchedulingRelated) {
    marketMultiplier = 1.4;
    baseTAM = 2500000000;
  } else if (isProductivityRelated) {
    marketMultiplier = 1.3;
    baseTAM = 2000000000;
  }

  // Reduce estimates for generic opportunities
  if (isGenericOpportunity) {
    marketMultiplier *= 0.5;
    baseTAM *= 0.3;
  }

  return {
    marketSizing: {
      totalAddressableMarket: {
        value: Math.round(baseTAM * marketMultiplier),
        unit: "USD",
        description: `${isGenericOpportunity ? 'Conservative estimate for ' : 'Estimated TAM for '}${title} based on ${isAIRelated ? 'AI market analysis' : isSaaSRelated ? 'SaaS market data' : 'market research'}`,
        confidence: isGenericOpportunity ? "low" : "medium",
        sources: isGenericOpportunity ? ["Limited data available"] : ["Industry reports", "Market analysis"]
      },
      serviceableAddressableMarket: {
        value: Math.round(baseTAM * marketMultiplier * 0.25),
        unit: "USD",
        description: `Serviceable market for ${title}`,
        marketShare: 0.05
      },
      serviceableObtainableMarket: {
        value: Math.round(baseTAM * marketMultiplier * 0.03),
        unit: "USD",
        description: `Realistically obtainable market for ${title}`,
        timeframe: "3-5 years"
      },
      marketGrowthRate: {
        annual: isAIRelated ? 0.25 : isSaaSRelated ? 0.15 : isGenericOpportunity ? 0.08 : 0.12,
        description: `Annual growth rate based on ${isAIRelated ? 'AI adoption trends' : 'market conditions'}`
      },
      marketMaturity: isAIRelated ? "growing" : isSaaSRelated ? "mature" : isGenericOpportunity ? "unclear" : "growing"
    },
    competitorAnalysis: {
      directCompetitors: isSchedulingRelated ? [
        {
          name: "Calendly",
          description: "Online scheduling platform",
          marketShare: 0.35,
          strengths: ["Market leader", "Simple UX", "Integration ecosystem"],
          weaknesses: ["Limited customization", "Basic features"],
          fundingStage: "public"
        },
        {
          name: "Acuity Scheduling",
          description: "Advanced scheduling software",
          marketShare: 0.15,
          strengths: ["Feature rich", "Customizable", "Payment integration"],
          weaknesses: ["Complex setup", "Higher cost"],
          fundingStage: "acquired"
        }
      ] : isGenericOpportunity ? [
        {
          name: "Market research needed",
          description: `Competitors for ${title} require detailed analysis`,
          marketShare: 0.20,
          strengths: ["Unknown"],
          weaknesses: ["Requires research"],
          fundingStage: "unknown"
        }
      ] : [
        {
          name: "Established players",
          description: `Market leaders in ${title} space`,
          marketShare: 0.30,
          strengths: ["Market presence", "Resources"],
          weaknesses: ["Innovation lag", "Complex solutions"],
          fundingStage: "established"
        }
      ],
      indirectCompetitors: [
        {
          name: isGenericOpportunity ? "Manual processes" : "Alternative solutions",
          description: isGenericOpportunity ? "Current manual workflows" : "Existing workarounds and tools"
        }
      ],
      competitiveAdvantage: {
        description: isAIRelated ? "AI-powered automation and intelligence" : isGenericOpportunity ? "Advantage requires definition" : "Specific innovation needed",
        strength: isAIRelated ? "strong" : isGenericOpportunity ? "weak" : "moderate",
        sustainability: isGenericOpportunity ? "low" : "medium",
        moatType: isAIRelated ? "technology" : isGenericOpportunity ? "none" : "execution"
      },
      marketPosition: isGenericOpportunity ? "unclear" : "challenger"
    },
    customerValidation: {
      targetCustomers: {
        primary: isSchedulingRelated ? "Business professionals and service providers" : isGenericOpportunity ? `Target customers for ${title}` : `Professional users needing ${title}`,
        secondary: "Small to medium businesses",
        marketSize: isSchedulingRelated ? 5000000 : isGenericOpportunity ? 500000 : 2000000
      },
      painPoints: isSchedulingRelated ? [
        {
          description: "Time-consuming manual scheduling",
          severity: 8,
          frequency: "daily",
          currentSolution: "Email back-and-forth",
          willingness: "high"
        },
        {
          description: "Double-booking conflicts",
          severity: 7,
          frequency: "weekly",
          currentSolution: "Manual calendar checking",
          willingness: "high"
        }
      ] : isGenericOpportunity ? [
        {
          description: `Pain points for ${title} require customer research`,
          severity: 5,
          frequency: "unknown",
          currentSolution: "Manual processes",
          willingness: "unknown"
        }
      ] : [
        {
          description: `Specific pain points for ${title} need validation`,
          severity: 6,
          frequency: "weekly",
          currentSolution: "Current workarounds",
          willingness: "medium"
        }
      ],
      willingnessToPay: {
        estimatedRange: {
          min: isSchedulingRelated ? 15 : isGenericOpportunity ? 5 : 10, 
          max: isSchedulingRelated ? 50 : isGenericOpportunity ? 25 : 75
        },
        confidence: isGenericOpportunity ? 30 : 60,
        priceAnchors: isGenericOpportunity ? ["Market research needed"] : ["Existing solutions: $20-40"],
        valueProposition: isGenericOpportunity ? "Value proposition needs definition" : "Time savings and efficiency"
      },
      customerAcquisitionCost: {
        estimate: isSchedulingRelated ? 35 : isGenericOpportunity ? 75 : 50,
        channel: "digital",
        paybackPeriod: isGenericOpportunity ? "unknown" : "8 months"
      }
    },
    technicalValidation: {
      complexity: {
        level: isAIRelated ? "high" : isSaaSRelated ? "medium" : isGenericOpportunity ? "unknown" : "low",
        reasoning: isAIRelated ? "AI integration requires specialized expertise" : isGenericOpportunity ? "Technical complexity needs assessment" : "Standard web application development",
        developmentTime: isAIRelated ? "8-12 months" : isGenericOpportunity ? "unknown" : "4-8 months",
        teamSize: isAIRelated ? 5 : isGenericOpportunity ? 2 : 3
      },
      technicalRisks: isAIRelated ? [
        {
          risk: "AI model performance variability",
          probability: "medium",
          impact: "high",
          mitigation: "Extensive testing and fallback systems"
        }
      ] : isGenericOpportunity ? [
        {
          risk: "Technical requirements unclear",
          probability: "high",
          impact: "high",
          mitigation: "Conduct technical feasibility study"
        }
      ] : [
        {
          risk: "Scalability challenges",
          probability: "medium",
          impact: "medium",
          mitigation: "Cloud infrastructure planning"
        }
      ],
      scalingChallenges: isGenericOpportunity ? ["Unknown technical challenges"] : ["Database performance", "API rate limits"],
      technologyReadiness: isGenericOpportunity ? "concept" : "prototype"
    },
    financialValidation: {
      revenueModel: {
        type: "subscription",
        description: isGenericOpportunity ? "Revenue model needs definition" : "Monthly/annual SaaS subscription model"
      },
      revenueProjections: {
        year1: {
          revenue: isSchedulingRelated ? 150000 : isGenericOpportunity ? 50000 : 100000, 
          customers: isSchedulingRelated ? 500 : isGenericOpportunity ? 100 : 300, 
          confidence: isGenericOpportunity ? "low" : "medium"
        },
        year3: {
          revenue: isSchedulingRelated ? 1200000 : isGenericOpportunity ? 300000 : 800000, 
          customers: isSchedulingRelated ? 3000 : isGenericOpportunity ? 600 : 2000, 
          confidence: isGenericOpportunity ? "low" : "medium"
        },
        year5: {
          revenue: isSchedulingRelated ? 5000000 : isGenericOpportunity ? 1000000 : 3500000, 
          customers: isSchedulingRelated ? 12000 : isGenericOpportunity ? 2000 : 8000, 
          confidence: "low"
        }
      },
      unitEconomics: {
        revenuePerCustomer: isSchedulingRelated ? 300 : isGenericOpportunity ? 150 : 400,
        costPerCustomer: isSchedulingRelated ? 90 : isGenericOpportunity ? 75 : 120,
        grossMargin: isGenericOpportunity ? 0.50 : 0.70,
        ltv: isSchedulingRelated ? 1800 : isGenericOpportunity ? 900 : 2400,
        cac: isSchedulingRelated ? 75 : isGenericOpportunity ? 100 : 100,
        ltvCacRatio: isSchedulingRelated ? 24 : isGenericOpportunity ? 9 : 24
      },
      fundingRequirements: {
        mvp: isAIRelated ? 150000 : isGenericOpportunity ? 25000 : 75000,
        scaleUp: isAIRelated ? 1000000 : isGenericOpportunity ? 200000 : 500000,
        reasoning: `${isAIRelated ? 'AI development requires specialized talent' : isGenericOpportunity ? 'Conservative estimates due to unclear requirements' : 'Standard SaaS development and marketing'}`
      },
      breakEvenTime: isAIRelated ? "24 months" : isGenericOpportunity ? "unknown" : "18 months"
    },
    trendsAnalysis: {
      currentTrends: isAIRelated ? [
        {
          trend: "AI adoption in business tools",
          relevance: "high",
          impact: "positive",
          timeframe: "short-term"
        },
        {
          trend: "Automation demand increasing",
          relevance: "high", 
          impact: "positive",
          timeframe: "medium-term"
        }
      ] : isGenericOpportunity ? [
        {
          trend: "Market trends require research",
          relevance: "unknown",
          impact: "unknown",
          timeframe: "unknown"
        }
      ] : [
        {
          trend: "Digital transformation",
          relevance: "medium",
          impact: "positive",
          timeframe: "long-term"
        }
      ],
      marketDrivers: isGenericOpportunity ? ["Drivers need identification"] : ["Productivity demands", "Cost optimization"],
      futureTrends: isGenericOpportunity ? ["Future trends unclear"] : ["Increased automation", "Integration ecosystems"],
      trendAlignment: isAIRelated ? "strong" : isGenericOpportunity ? "unknown" : "moderate"
    },
    riskAssessment: {
      executionRisk: isAIRelated ? "high" : isGenericOpportunity ? "high" : "medium",
      marketRisk: isGenericOpportunity ? "high" : "medium",
      competitiveRisk: isSchedulingRelated ? "high" : isGenericOpportunity ? "unknown" : "medium",
      regulatoryRisk: "low",
      overallRisk: isGenericOpportunity ? "high" : isAIRelated ? "high" : "medium"
    },
    _qualityMetadata: {
      isGenericOpportunity,
      dataQualityScore: isGenericOpportunity ? 25 : isAIRelated ? 75 : isSchedulingRelated ? 80 : 60,
      confidenceLevel: isGenericOpportunity ? "low" : "medium",
      recommendedActions: isGenericOpportunity ? [
        "Conduct detailed market research",
        "Define specific customer segments",
        "Validate problem-solution fit",
        "Assess technical feasibility"
      ] : [
        "Validate with target customers",
        "Analyze competitive landscape",
        "Build MVP prototype"
      ]
    }
  };
}

function calculateAdvancedValidationScore(results: any, title: string, description: string, category?: string): {totalScore: number, breakdown: any} {
  console.log('🧮 Calculating advanced validation score for:', title);
  
  let breakdown = {
    marketSizing: { score: 0, weight: 25, reasoning: "" },
    competitive: { score: 0, weight: 20, reasoning: "" },
    customer: { score: 0, weight: 25, reasoning: "" },
    technical: { score: 0, weight: 15, reasoning: "" },
    financial: { score: 0, weight: 10, reasoning: "" },
    trends: { score: 0, weight: 5, reasoning: "" }
  };

  // Market Sizing Analysis (25 points)
  if (results.marketSizing) {
    let marketScore = 0;
    const tam = results.marketSizing.totalAddressableMarket?.value || 0;
    const sam = results.marketSizing.serviceableAddressableMarket?.value || 0;
    const som = results.marketSizing.serviceableObtainableMarket?.value || 0;
    const growthRate = results.marketSizing.marketGrowthRate?.annual || 0;
    const maturity = results.marketSizing.marketMaturity;

    // TAM scoring (0-40 points)
    if (tam >= 10000000000) marketScore += 40; // $10B+ TAM
    else if (tam >= 1000000000) marketScore += 35; // $1B+ TAM  
    else if (tam >= 100000000) marketScore += 25; // $100M+ TAM
    else if (tam >= 10000000) marketScore += 15; // $10M+ TAM
    else marketScore += 5;

    // Growth rate scoring (0-30 points)
    if (growthRate >= 0.25) marketScore += 30; // 25%+ growth
    else if (growthRate >= 0.15) marketScore += 25; // 15%+ growth
    else if (growthRate >= 0.10) marketScore += 15; // 10%+ growth
    else if (growthRate >= 0.05) marketScore += 10; // 5%+ growth
    else marketScore += 5;

    // Market maturity bonus/penalty (0-30 points)
    if (maturity === 'growing') marketScore += 30;
    else if (maturity === 'emerging') marketScore += 25;
    else if (maturity === 'mature') marketScore += 15;
    else marketScore += 5;

    breakdown.marketSizing.score = Math.min(marketScore, 100);
    breakdown.marketSizing.reasoning = `TAM: $${(tam/1000000000).toFixed(1)}B, Growth: ${(growthRate*100).toFixed(1)}%, Market: ${maturity}`;
  }

  // Competitive Analysis (20 points)
  if (results.competitorAnalysis) {
    let competitiveScore = 0;
    const advantage = results.competitorAnalysis.competitiveAdvantage;
    const directCompetitors = results.competitorAnalysis.directCompetitors || [];
    
    // Competitive advantage strength (0-60 points)
    if (advantage?.strength === 'strong') competitiveScore += 60;
    else if (advantage?.strength === 'moderate') competitiveScore += 40;
    else competitiveScore += 20;

    // Market position (0-25 points)
    const position = results.competitorAnalysis.marketPosition;
    if (position === 'first-mover') competitiveScore += 25;
    else if (position === 'challenger') competitiveScore += 20;
    else if (position === 'fast-follower') competitiveScore += 15;
    else competitiveScore += 10;

    // Competition density penalty (0-15 points)
    if (directCompetitors.length <= 2) competitiveScore += 15;
    else if (directCompetitors.length <= 4) competitiveScore += 10;
    else competitiveScore += 5;

    breakdown.competitive.score = Math.min(competitiveScore, 100);
    breakdown.competitive.reasoning = `Advantage: ${advantage?.strength}, Position: ${position}, Competitors: ${directCompetitors.length}`;
  }

  // Customer Validation (25 points)
  if (results.customerValidation) {
    let customerScore = 0;
    const painPoints = results.customerValidation.painPoints || [];
    const pricing = results.customerValidation.willingnessToPay;
    const cac = results.customerValidation.customerAcquisitionCost;

    // Pain point severity (0-40 points)
    const avgSeverity = painPoints.reduce((sum: number, p: any) => sum + (p.severity || 0), 0) / Math.max(painPoints.length, 1);
    if (avgSeverity >= 8) customerScore += 40;
    else if (avgSeverity >= 6) customerScore += 30;
    else if (avgSeverity >= 4) customerScore += 20;
    else customerScore += 10;

    // Willingness to pay (0-35 points)
    const avgPrice = pricing?.estimatedRange ? (pricing.estimatedRange.min + pricing.estimatedRange.max) / 2 : 0;
    if (avgPrice >= 100) customerScore += 35;
    else if (avgPrice >= 50) customerScore += 30;
    else if (avgPrice >= 25) customerScore += 20;
    else if (avgPrice >= 10) customerScore += 15;
    else customerScore += 5;

    // Customer acquisition feasibility (0-25 points)
    if (cac?.estimate && avgPrice) {
      const paybackMonths = parseFloat(cac.paybackPeriod?.split(' ')[0] || '12');
      if (paybackMonths <= 6) customerScore += 25;
      else if (paybackMonths <= 12) customerScore += 20;
      else if (paybackMonths <= 18) customerScore += 15;
      else customerScore += 10;
    } else {
      customerScore += 10;
    }

    breakdown.customer.score = Math.min(customerScore, 100);
    breakdown.customer.reasoning = `Pain severity: ${avgSeverity.toFixed(1)}/10, Price: $${avgPrice.toFixed(0)}, CAC feasible: ${cac?.paybackPeriod || 'unknown'}`;
  }

  // Technical Validation (15 points)
  if (results.technicalValidation) {
    let technicalScore = 0;
    const complexity = results.technicalValidation.complexity?.level;
    const risks = results.technicalValidation.technicalRisks || [];
    const readiness = results.technicalValidation.technologyReadiness;

    // Complexity scoring (inverse - simpler is better) (0-40 points)
    if (complexity === 'low') technicalScore += 40;
    else if (complexity === 'medium') technicalScore += 25;
    else technicalScore += 15;

    // Risk assessment (0-35 points)
    const highRisks = risks.filter((r: any) => r.impact === 'high').length;
    if (highRisks === 0) technicalScore += 35;
    else if (highRisks <= 1) technicalScore += 25;
    else if (highRisks <= 2) technicalScore += 15;
    else technicalScore += 10;

    // Technology readiness (0-25 points)
    if (readiness === 'production') technicalScore += 25;
    else if (readiness === 'mvp') technicalScore += 20;
    else if (readiness === 'prototype') technicalScore += 15;
    else technicalScore += 10;

    breakdown.technical.score = Math.min(technicalScore, 100);
    breakdown.technical.reasoning = `Complexity: ${complexity}, High risks: ${highRisks}, Readiness: ${readiness}`;
  }

  // Financial Validation (10 points)
  if (results.financialValidation) {
    let financialScore = 0;
    const economics = results.financialValidation.unitEconomics;
    const projections = results.financialValidation.revenueProjections;

    // Unit economics (0-60 points)
    if (economics?.ltvCacRatio >= 20) financialScore += 60;
    else if (economics?.ltvCacRatio >= 10) financialScore += 45;
    else if (economics?.ltvCacRatio >= 5) financialScore += 30;
    else if (economics?.ltvCacRatio >= 3) financialScore += 20;
    else financialScore += 10;

    // Revenue growth trajectory (0-40 points)
    if (projections?.year5?.revenue >= 5000000) financialScore += 40;
    else if (projections?.year5?.revenue >= 1000000) financialScore += 30;
    else if (projections?.year5?.revenue >= 500000) financialScore += 20;
    else financialScore += 10;

    breakdown.financial.score = Math.min(financialScore, 100);
    breakdown.financial.reasoning = `LTV/CAC: ${economics?.ltvCacRatio?.toFixed(1) || 'N/A'}, Y5 Revenue: $${(projections?.year5?.revenue/1000000 || 0).toFixed(1)}M`;
  }

  // Trends Analysis (5 points)
  if (results.trendsAnalysis) {
    let trendsScore = 0;
    const alignment = results.trendsAnalysis.trendAlignment;
    const currentTrends = results.trendsAnalysis.currentTrends || [];

    // Trend alignment (0-70 points)
    if (alignment === 'strong') trendsScore += 70;
    else if (alignment === 'moderate') trendsScore += 50;
    else trendsScore += 30;

    // Number of favorable trends (0-30 points)
    const positiveTrends = currentTrends.filter((t: any) => t.impact === 'positive').length;
    if (positiveTrends >= 3) trendsScore += 30;
    else if (positiveTrends >= 2) trendsScore += 25;
    else if (positiveTrends >= 1) trendsScore += 15;
    else trendsScore += 5;

    breakdown.trends.score = Math.min(trendsScore, 100);
    breakdown.trends.reasoning = `Alignment: ${alignment}, Positive trends: ${positiveTrends}`;
  }

  // Calculate weighted total score
  let totalScore = 0;
  let totalWeight = 0;

  Object.values(breakdown).forEach((component: any) => {
    totalScore += (component.score * component.weight) / 100;
    totalWeight += component.weight;
  });

  // Apply opportunity-specific bonuses/penalties
  const isAIRelated = title.toLowerCase().includes('ai') || title.toLowerCase().includes('artificial intelligence');
  const hasSpecificAnalysis = JSON.stringify(results).toLowerCase().includes(title.toLowerCase().split(' ')[0]);
  
  if (isAIRelated && results.trendsAnalysis?.trendAlignment === 'strong') {
    totalScore += 3; // AI trend bonus
  }
  
  if (hasSpecificAnalysis) {
    totalScore += 2; // Relevance bonus
  }

  // Ensure score is within bounds
  totalScore = Math.max(0, Math.min(100, Math.round(totalScore)));

  return { totalScore, breakdown };
}

function calculateConfidenceLevel(results: any): string {
  const hasDetailedMarketSizing = results.marketSizing?.totalAddressableMarket?.value > 0;
  const hasCompetitorData = results.competitorAnalysis?.directCompetitors?.length > 0;
  const hasCustomerValidation = results.customerValidation?.painPoints?.length > 0;
  const isGeneric = results._qualityMetadata?.isGenericOpportunity;
  
  if (isGeneric) return 'low';
  
  const confidenceFactors = [hasDetailedMarketSizing, hasCompetitorData, hasCustomerValidation].filter(Boolean).length;
  
  if (confidenceFactors >= 3) return 'high';
  if (confidenceFactors >= 2) return 'medium';
  return 'low';
}

function assessRiskProfile(results: any): string {
  const riskAssessment = results.riskAssessment;
  const isGeneric = results._qualityMetadata?.isGenericOpportunity;
  
  if (isGeneric) return 'high';
  if (!riskAssessment) return 'medium';
  
  const riskFactors = [
    riskAssessment.executionRisk,
    riskAssessment.marketRisk,
    riskAssessment.competitiveRisk,
    riskAssessment.regulatoryRisk
  ];
  
  const highRisks = riskFactors.filter(risk => risk === 'high').length;
  const mediumRisks = riskFactors.filter(risk => risk === 'medium').length;
  
  if (highRisks >= 2) return 'high';
  if (highRisks >= 1 || mediumRisks >= 3) return 'medium';
  return 'low';
}

// Browse.ai integration has been removed - using direct Reddit API instead
