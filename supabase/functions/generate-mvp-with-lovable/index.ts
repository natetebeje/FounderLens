
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

    console.log('Generating real MVP with Lovable for opportunity:', opportunity.title);

    // Get comprehensive market intelligence data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: marketData, error: marketError } = await supabase
      .from('automated_market_intelligence')
      .select('*')
      .eq('opportunity_id', opportunity.id)
      .maybeSingle();

    if (marketError) {
      console.error('Error fetching market data:', marketError);
    }

    const { data: validationData, error: validationError } = await supabase
      .from('validation_workflows')
      .select('*')
      .eq('opportunity_id', opportunity.id)
      .maybeSingle();

    if (validationError) {
      console.error('Error fetching validation data:', validationError);
    }

    // Generate comprehensive Lovable prompt using BAB framework
    const lovablePrompt = generateLovablePrompt({
      opportunity,
      marketData,
      validationData
    });

    // Create Smart Launch data
    const smartLaunchData = generateSmartLaunchData({
      opportunity,
      marketData,
      lovablePrompt
    });

    const mvpProject = {
      projectId: `mvp-${opportunity.id}`,
      lovablePrompt: lovablePrompt,
      smartLaunch: smartLaunchData,
      marketIntelligence: {
        competitors: marketData?.competitor_analysis?.competitors || [],
        pricingStrategy: marketData?.pricing_research?.pricing_models || [],
        marketTrends: marketData?.trends_analysis?.trends || [],
        swotAnalysis: marketData?.swot_analysis || {},
        confidenceScore: marketData?.confidence_score || 0
      },
      validation: {
        automatedScore: validationData?.automated_score || 0,
        validationResults: validationData?.automated_validation_results || {},
        status: validationData?.status || 'not_started'
      },
      generatedAt: new Date().toISOString(),
      estimatedDevelopmentTime: '2-3 minutes',
      expectedComponents: calculateExpectedComponents(opportunity, marketData),
      technicalSpecs: generateTechnicalSpecs(opportunity, marketData)
    };

    console.log('Real MVP project generated successfully');

    return new Response(JSON.stringify(mvpProject), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-mvp-with-lovable function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to generate MVP with Lovable'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateLovablePrompt({ opportunity, marketData, validationData }) {
  const swot = marketData?.swot_analysis || {};
  const competitors = marketData?.competitor_analysis?.competitors || [];
  const pricing = marketData?.pricing_research || {};
  const trends = marketData?.trends_analysis?.trends || [];

  // Extract pain points from problem statement and SWOT weaknesses
  const painPoints = extractPainPoints(opportunity, swot);
  
  // Extract desired outcomes from solution approach and SWOT strengths
  const desiredOutcomes = extractDesiredOutcomes(opportunity, swot);
  
  // Generate competitive positioning
  const competitiveEdge = generateCompetitiveEdge(opportunity, competitors, swot);

  const prompt = `Create a high-converting landing page for "${opportunity.title}" using React, TypeScript, and Tailwind CSS.

## Project Overview
Build a modern, conversion-optimized landing page that follows the Before-After-Bridge copywriting framework for ${opportunity.target_market}.

## Above the Fold Section
- **Headline**: "${generateHeadline(opportunity, painPoints)}"
- **Subheadline**: "${generateSubheadline(opportunity)}"
- **Hero Benefits** (3-5 bullet points):
${generateHeroBenefits(opportunity, desiredOutcomes).map(benefit => `  • ${benefit}`).join('\n')}
- **Primary CTA**: "${generatePrimaryCTA(opportunity)}"
- **Hero Image/Video**: Placeholder for product demo or hero imagery

## Pain Points Section ("Before")
**Section Title**: "${generatePainSectionTitle(painPoints)}"

${painPoints.map((pain, index) => `
**Pain Point ${index + 1}**: ${pain.title}
${pain.description}
`).join('\n')}

**Belief Deconstruction**: 
"${generateBeliefDeconstruction(opportunity, competitors)}"

## Desired Outcome Section ("After")
**Section Title**: "Imagine ${generateAfterVision(opportunity)}"

${desiredOutcomes.map((outcome, index) => `
**Outcome ${index + 1}**: ${outcome.title}
${outcome.description}
`).join('\n')}

## Product Introduction Section
**Product Name**: ${opportunity.title}
**Tagline**: "${generateTagline(opportunity, competitiveEdge)}"

**How It Works (3 Steps)**:
${generateHowItWorks(opportunity).map((step, index) => `${index + 1}. ${step}`).join('\n')}

**Founder Message**: 
"${generateFounderMessage(opportunity)}"

## Features & Benefits Section
${generateFeaturesAndBenefits(opportunity, marketData).map(feature => `
- **${feature.name}**: ${feature.description}
`).join('')}

## Pricing Section
${generatePricingSection(pricing, opportunity)}

## Social Proof Section
- **Testimonials**: Include 3-4 realistic testimonials based on target market
- **Trust Indicators**: ${generateTrustIndicators(opportunity)}

## FAQ Section
${generateFAQ(opportunity, pricing).map(faq => `
**Q**: ${faq.question}
**A**: ${faq.answer}
`).join('\n')}

## Final CTA Section
**Urgency Message**: "${generateUrgencyMessage(opportunity)}"
**Final CTA**: "${generateFinalCTA(opportunity)}"

## Technical Requirements
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with modern design
- **Components**: 
  - Responsive navigation header
  - Hero section with video/image placeholder
  - Testimonial carousel
  - Pricing cards with hover effects
  - Contact/signup form with email validation
  - Mobile-optimized design
  - Smooth scrolling navigation
  - Call-to-action buttons with hover states

- **Integrations**:
  - Email signup form (prepare for email service integration)
  - Contact form with form validation
  ${pricing.pricing_models?.length > 0 ? '- Payment integration placeholder (Stripe-ready)' : ''}
  - Analytics tracking placeholder
  - Social media links

## Design Specifications
- **Color Scheme**: Modern, professional palette that conveys trust and innovation
- **Typography**: Clean, readable fonts with clear hierarchy
- **Layout**: Single-page application with smooth sections
- **Mobile**: Fully responsive design with mobile-first approach
- **Performance**: Optimized images and fast loading
- **Accessibility**: WCAG 2.1 AA compliant

## Business Logic
- Form validation and error handling
- Loading states for all interactions
- Success/error messaging for form submissions
- Newsletter signup functionality
- Contact form with proper validation

Create a complete, functional landing page that converts visitors into customers by addressing their pain points and clearly demonstrating the value proposition.`;

  return prompt;
}

function generateSmartLaunchData({ opportunity, marketData, lovablePrompt }) {
  return {
    projectTitle: `${opportunity.title} Landing Page`,
    description: `High-converting landing page for ${opportunity.title} - ${opportunity.description}`,
    lovableUrl: 'https://lovable.dev/create',
    autoFillData: {
      prompt: lovablePrompt,
      projectName: opportunity.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
      description: opportunity.description
    },
    nextSteps: [
      'Copy the generated prompt to your clipboard',
      'Click "Smart Launch" to open Lovable with auto-filled prompt',
      'Review and customize the prompt if needed',
      'Click "Create Project" in Lovable',
      'Wait 2-3 minutes for your MVP to be generated',
      'Customize colors, images, and copy to match your brand',
      'Deploy your landing page with one click'
    ],
    estimatedTime: '5-10 minutes from prompt to deployed landing page',
    expectedFeatures: calculateExpectedComponents(opportunity, marketData)
  };
}

function extractPainPoints(opportunity, swot) {
  const painPoints = [];
  
  // Extract from problem statement
  if (opportunity.problem_statement) {
    painPoints.push({
      title: "Current Struggle",
      description: opportunity.problem_statement
    });
  }
  
  // Extract from SWOT weaknesses
  if (swot.weaknesses && Array.isArray(swot.weaknesses)) {
    swot.weaknesses.forEach(weakness => {
      painPoints.push({
        title: "Market Challenge",
        description: weakness
      });
    });
  }
  
  return painPoints.slice(0, 3); // Limit to 3 pain points
}

function extractDesiredOutcomes(opportunity, swot) {
  const outcomes = [];
  
  // Extract from solution approach
  if (opportunity.solution_approach) {
    outcomes.push({
      title: "Your Solution",
      description: opportunity.solution_approach
    });
  }
  
  // Extract from SWOT strengths and opportunities
  if (swot.strengths && Array.isArray(swot.strengths)) {
    swot.strengths.forEach(strength => {
      outcomes.push({
        title: "Key Advantage",
        description: strength
      });
    });
  }
  
  if (swot.opportunities && Array.isArray(swot.opportunities)) {
    swot.opportunities.slice(0, 1).forEach(opportunity => {
      outcomes.push({
        title: "Market Opportunity",
        description: opportunity
      });
    });
  }
  
  return outcomes.slice(0, 3); // Limit to 3 outcomes
}

function generateCompetitiveEdge(opportunity, competitors, swot) {
  const advantages = [];
  
  if (swot.strengths && Array.isArray(swot.strengths)) {
    advantages.push(...swot.strengths);
  }
  
  if (competitors.length > 0) {
    advantages.push(`Unlike ${competitors[0].name}, we focus specifically on ${opportunity.target_market}`);
  }
  
  return advantages;
}

function generateHeadline(opportunity, painPoints) {
  if (painPoints.length > 0) {
    return `Stop ${painPoints[0].description.split(' ').slice(0, 5).join(' ')}...`;
  }
  return `Transform Your ${opportunity.target_market} Experience`;
}

function generateSubheadline(opportunity) {
  return `${opportunity.description}. Built specifically for ${opportunity.target_market} who want real results.`;
}

function generateHeroBenefits(opportunity, outcomes) {
  const benefits = outcomes.map(outcome => outcome.description);
  
  // Add some default benefits if we don't have enough
  while (benefits.length < 3) {
    benefits.push(`Perfect for ${opportunity.target_market}`);
    benefits.push('Quick setup and easy to use');
    benefits.push('Proven results from day one');
  }
  
  return benefits.slice(0, 5);
}

function generatePrimaryCTA(opportunity) {
  if (opportunity.target_market.toLowerCase().includes('business')) {
    return 'Start Your Free Trial';
  }
  return 'Get Started Today';
}

function generatePainSectionTitle(painPoints) {
  if (painPoints.length > 0) {
    return `Tired of ${painPoints[0].title}?`;
  }
  return 'Struggling With Current Solutions?';
}

function generateBeliefDeconstruction(opportunity, competitors) {
  if (competitors.length > 0) {
    return `Most solutions like ${competitors[0].name} focus on generic approaches. But ${opportunity.target_market} need something different - a solution that understands their specific challenges.`;
  }
  return `The traditional approach isn't working because it doesn't address the real needs of ${opportunity.target_market}.`;
}

function generateAfterVision(opportunity) {
  return `${opportunity.target_market} success looks like`;
}

function generateTagline(opportunity, competitiveEdge) {
  if (competitiveEdge.length > 0) {
    return competitiveEdge[0];
  }
  return `The ${opportunity.target_market} solution that actually works`;
}

function generateHowItWorks(opportunity) {
  const businessFlow = [
    'Sign up and complete your profile',
    'Get personalized recommendations',
    'Track your progress and results'
  ];
  
  const consumerFlow = [
    'Create your account in 30 seconds',
    'Discover personalized options',
    'Enjoy immediate results'
  ];
  
  return opportunity.target_market.toLowerCase().includes('business') ? businessFlow : consumerFlow;
}

function generateFounderMessage(opportunity) {
  return `I created ${opportunity.title} because I was frustrated with the same problems you're facing. As someone who understands ${opportunity.target_market}, I knew there had to be a better way. That's why I built this solution - to give you the results you deserve.`;
}

function generateFeaturesAndBenefits(opportunity, marketData) {
  const features = [];
  
  // Base features for all opportunities
  features.push({
    name: 'Easy Setup',
    description: 'Get started in minutes, not hours'
  });
  
  features.push({
    name: 'Personalized Experience',
    description: `Tailored specifically for ${opportunity.target_market}`
  });
  
  // Add features based on market data
  if (marketData?.trends_analysis?.trends) {
    marketData.trends_analysis.trends.slice(0, 2).forEach(trend => {
      features.push({
        name: 'Market-Aligned',
        description: `Leverages ${trend}`
      });
    });
  }
  
  return features;
}

function generatePricingSection(pricing, opportunity) {
  if (!pricing.pricing_models || pricing.pricing_models.length === 0) {
    return `
**Simple Pricing**
- **Free Trial**: 14 days free
- **Monthly**: $29/month
- **Annual**: $290/year (Save 17%)
`;
  }
  
  return pricing.pricing_models.map(model => `
**${model.name || 'Plan'}**: ${model.price || '$29/month'}
${model.features ? model.features.join(', ') : 'All essential features included'}
`).join('\n');
}

function generateTrustIndicators(opportunity) {
  return `Money-back guarantee, SSL secured, trusted by ${opportunity.target_market}`;
}

function generateFAQ(opportunity, pricing) {
  const faqs = [
    {
      question: `Is this right for ${opportunity.target_market}?`,
      answer: `Yes! ${opportunity.title} was specifically designed for ${opportunity.target_market}. ${opportunity.description}`
    },
    {
      question: 'How quickly will I see results?',
      answer: 'Most users see improvements within the first week of using the platform.'
    }
  ];
  
  if (pricing.pricing_models && pricing.pricing_models.length > 0) {
    faqs.push({
      question: 'What if I want to cancel?',
      answer: 'You can cancel anytime. No long-term contracts or hidden fees.'
    });
  }
  
  return faqs;
}

function generateUrgencyMessage(opportunity) {
  return `Join thousands of ${opportunity.target_market} who are already transforming their results`;
}

function generateFinalCTA(opportunity) {
  return `Start Your ${opportunity.title} Journey Today`;
}

function calculateExpectedComponents(opportunity, marketData) {
  let componentCount = 15; // Base components
  
  // Add components based on complexity
  if (marketData?.pricing_research?.pricing_models?.length > 1) {
    componentCount += 3; // Pricing comparison components
  }
  
  if (opportunity.target_market.toLowerCase().includes('business')) {
    componentCount += 5; // B2B specific components
  }
  
  return {
    total: componentCount,
    breakdown: {
      'Landing Page Sections': 8,
      'UI Components': 6,
      'Forms & Interactions': 4,
      'Responsive Elements': componentCount - 18
    }
  };
}

function generateTechnicalSpecs(opportunity, marketData) {
  const specs = {
    framework: 'React 18 with TypeScript',
    styling: 'Tailwind CSS with custom design system',
    components: [
      'Responsive Navigation',
      'Hero Section with CTA',
      'Feature Showcase',
      'Testimonial Carousel',
      'Pricing Cards',
      'Contact Forms',
      'Footer with Links'
    ],
    integrations: [
      'Email Newsletter Signup',
      'Contact Form with Validation'
    ],
    performance: {
      'Initial Load': '< 2 seconds',
      'Mobile Optimized': 'Yes',
      'SEO Ready': 'Yes'
    }
  };
  
  // Add premium integrations based on market data
  if (marketData?.pricing_research?.pricing_models?.length > 0) {
    specs.integrations.push('Stripe Payment Integration Ready');
  }
  
  if (opportunity.target_market.toLowerCase().includes('business')) {
    specs.integrations.push('CRM Integration Ready', 'Analytics Tracking');
  }
  
  return specs;
}
