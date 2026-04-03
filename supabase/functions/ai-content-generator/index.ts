import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContentGenerationRequest {
  contentType: 'social_post' | 'email' | 'blog_post' | 'landing_page';
  platform?: 'twitter' | 'linkedin' | 'reddit' | 'email' | 'blog';
  topic: string;
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'authoritative';
  keywords?: string[];
  campaignId?: string;
  directPost?: boolean;
  // Enhanced fields for opportunity-based content
  opportunity?: {
    id: string;
    title: string;
    description: string;
  };
  autoIntent?: boolean; // Auto-detect campaign intent
}

interface IntentAnalysis {
  intent: 'awareness' | 'problem-aware' | 'solution-aware' | 'comparison' | 'purchase';
  audience: string;
  painPoints: string[];
  desiredOutcome: string;
  recommendedAngle: string;
  cta: string;
  utmSuffix: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      contentType, 
      platform, 
      topic, 
      targetAudience, 
      tone = 'professional', 
      keywords = [], 
      campaignId, 
      directPost = false,
      opportunity,
      autoIntent = true
    }: ContentGenerationRequest = await req.json();

    console.log(`Generating ${contentType} content for ${platform} about: ${topic}`);

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // Step 1: Auto-detect intent if opportunity data is provided
    let intentAnalysis: IntentAnalysis | null = null;
    if (opportunity && autoIntent) {
      console.log('Auto-detecting campaign intent for opportunity:', opportunity.title);
      
      const intentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `You are an expert marketing strategist. Analyze the business opportunity and determine the optimal go-to-market intent and strategy. Return a JSON object with the following structure:
              {
                "intent": "awareness|problem-aware|solution-aware|comparison|purchase",
                "audience": "specific target audience description",
                "painPoints": ["pain point 1", "pain point 2"],
                "desiredOutcome": "what the audience wants to achieve",
                "recommendedAngle": "marketing angle to take",
                "cta": "call-to-action text",
                "utmSuffix": "descriptive utm campaign suffix"
              }`
            },
            {
              role: 'user',
              content: `Analyze this business opportunity:
              
              Title: ${opportunity.title}
              Description: ${opportunity.description}
              
              Additional context:
              - Target Audience: ${targetAudience || 'not specified'}
              - Keywords: ${keywords.join(', ') || 'none'}
              - Content Type: ${contentType}
              - Platform: ${platform || 'general'}
              
              Determine the best marketing intent and strategy.`
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        }),
      });

      if (intentResponse.ok) {
        const intentData = await intentResponse.json();
        try {
          intentAnalysis = JSON.parse(intentData.choices[0].message.content);
          console.log('Intent analysis completed:', intentAnalysis?.intent);
        } catch (parseError) {
          console.warn('Failed to parse intent analysis, continuing with default strategy');
        }
      }
    }

    // Enhanced content generation prompts based on type, platform, and intent
    const getEnhancedPrompt = (contentType: string, platform?: string) => {
      const opportunityContext = opportunity ? 
        `Business Opportunity: "${opportunity.title}" - ${opportunity.description}` : 
        `Topic: "${topic}"`;
      
      const intentContext = intentAnalysis ? `
        Marketing Intent: ${intentAnalysis.intent}
        Target Audience: ${intentAnalysis.audience}
        Key Pain Points: ${intentAnalysis.painPoints.join(', ')}
        Desired Outcome: ${intentAnalysis.desiredOutcome}
        Recommended Angle: ${intentAnalysis.recommendedAngle}
        Suggested CTA: ${intentAnalysis.cta}
      ` : '';

      const baseContext = `
        ${opportunityContext}
        ${intentContext}
        Target Audience: ${targetAudience || intentAnalysis?.audience || 'entrepreneurs and founders'}
        Tone: ${tone}
        Keywords to incorporate: ${keywords.join(', ')}
      `;

      if (contentType === 'social_post' && platform === 'twitter') {
        return `Create an engaging Twitter post using this context:
        ${baseContext}
        
        Requirements:
        - CRITICAL: Target 240-250 characters max to leave room for the link
        - Include relevant hashtags
        - Focus on the specific opportunity and its value proposition
        - Use the recommended marketing angle${intentAnalysis ? ` (${intentAnalysis.recommendedAngle})` : ''}
        - MUST include "founderlens.io" at the end
        - Total post including link must be under 280 characters
        - Make it specific to the opportunity, not generic
        Format: [content] founderlens.io`;
      }
      if (contentType === 'social_post' && platform === 'linkedin') {
        return `Write a professional LinkedIn post using this context:
        ${baseContext}
        
        Requirements:
        - Include a compelling hook related to the specific opportunity
        - Provide valuable insights about this business area
        - Use the recommended marketing angle${intentAnalysis ? ` (${intentAnalysis.recommendedAngle})` : ''}
        - Include clear call-to-action
        - Focus on entrepreneurship, business growth, or industry trends
        - Include "founderlens.io" naturally in the content or at the end
        - Make it specific to the opportunity, not generic`;
      }

      if (contentType === 'social_post' && platform === 'reddit') {
        return `Create a helpful Reddit comment or post using this context:
        ${baseContext}
        
        Requirements:
        - Provide genuine value related to this specific opportunity
        - Be authentic and conversational, avoid being promotional
        - Focus on solving problems or sharing insights about this business area
        - Subtly mention founderlens.io if relevant to the discussion
        - Make it specific to the opportunity and its problem space`;
      }

      if (contentType === 'email') {
        return `Write an email using this context:
        ${baseContext}
        
        Requirements:
        - Include compelling subject line
        - Focus on this specific business opportunity and its value
        - Use the recommended marketing angle${intentAnalysis ? ` (${intentAnalysis.recommendedAngle})` : ''}
        - Include clear call-to-action with founderlens.io
        - Make it specific to the opportunity, not generic`;
      }

      if (contentType === 'blog_post') {
        return `Write a comprehensive blog post using this context:
        ${baseContext}
        
        Requirements:
        - Include engaging title related to the specific opportunity
        - Cover the opportunity area in depth with actionable insights
        - Use the recommended marketing angle${intentAnalysis ? ` (${intentAnalysis.recommendedAngle})` : ''}
        - Include founderlens.io in the call-to-action or conclusion
        - Make it specific to this opportunity and business area`;
      }

      if (contentType === 'landing_page') {
        return `Create landing page copy using this context:
        ${baseContext}
        
        Requirements:
        - Include compelling headline about this specific opportunity
        - Highlight unique value proposition and benefits
        - Use the recommended marketing angle${intentAnalysis ? ` (${intentAnalysis.recommendedAngle})` : ''}
        - Include strong call-to-action with founderlens.io
        - Focus on conversion for this specific opportunity`;
      }

      return `Create ${contentType} content using this context: ${baseContext}`;
    };

    // Generate enhanced prompt
    const prompt = getEnhancedPrompt(contentType, platform);

    // Generate content using OpenAI
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
            content: `You are an expert marketing content creator for FounderLens, an AI-powered business opportunity discovery platform. 
            Create compelling, valuable content that helps entrepreneurs discover and validate business opportunities. 
            Always focus on providing genuine value and insights.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: contentType === 'blog_post' ? 2000 : 500
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let generatedContent = data.choices[0].message.content;

    // Twitter character limit validation and smart truncation
    if (contentType === 'social_post' && platform === 'twitter') {
      console.log(`Twitter post generated: ${generatedContent.length} characters`);
      
      // Ensure founderlens.io is included if not already present
      if (!generatedContent.includes('founderlens.io')) {
        generatedContent = `${generatedContent.trim()} founderlens.io`;
      }
      
      // Final validation and truncation if needed
      if (generatedContent.length > 280) {
        console.log(`Twitter post too long (${generatedContent.length} chars), applying emergency truncation...`);
        
        // Emergency truncation: ensure founderlens.io is preserved
        const linkText = ' founderlens.io';
        const maxContentLength = 280 - linkText.length;
        
        // Remove the link temporarily
        let contentWithoutLink = generatedContent.replace('founderlens.io', '').trim();
        
        // Truncate content if needed
        if (contentWithoutLink.length > maxContentLength) {
          contentWithoutLink = contentWithoutLink.substring(0, maxContentLength - 3) + '...';
        }
        
        // Add link back
        generatedContent = `${contentWithoutLink} founderlens.io`;
        
        console.log(`Emergency truncation applied: ${generatedContent.length} characters`);
      }
      
      // Final safety check
      if (generatedContent.length > 280) {
        console.error(`CRITICAL: Twitter post still over limit: ${generatedContent.length} chars`);
        generatedContent = generatedContent.substring(0, 277) + '...';
      }
      
      console.log(`Final Twitter post: ${generatedContent.length} characters`);
    }

    // Store generated content in database
    const { data: contentRecord, error: insertError } = await supabase
      .from('marketing_content')
      .insert({
        content: generatedContent,
        content_type: contentType,
        platform: platform || null,
        target_audience: { 
          description: targetAudience || intentAnalysis?.audience,
          tone,
          keywords,
          topic: opportunity?.title || topic,
          // Enhanced metadata
          opportunity_id: opportunity?.id,
          intent: intentAnalysis?.intent,
          painPoints: intentAnalysis?.painPoints,
          desiredOutcome: intentAnalysis?.desiredOutcome,
          recommendedAngle: intentAnalysis?.recommendedAngle,
          suggestedCTA: intentAnalysis?.cta,
          utmSuffix: intentAnalysis?.utmSuffix
        },
        status: 'draft'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing content:', insertError);
      throw new Error('Failed to store generated content');
    }

    // If campaign ID provided, link to campaign
    if (campaignId && contentRecord) {
      const { error: campaignError } = await supabase
        .from('marketing_campaigns')
        .update({
          performance_metrics: {
            content_generated: true,
            last_content_id: contentRecord.id
          }
        })
        .eq('id', campaignId);

      if (campaignError) {
        console.error('Error linking to campaign:', campaignError);
      }
    }

    console.log('Content generated and stored successfully');

    let twitterPostResult = null;

    // Content is now always saved as draft - no automatic posting or Zapier triggering
    console.log('Content generated and stored as draft for review');

    // Optional: trigger a general content_generated event for tracking (but not for publishing)
    try {
      await supabase.functions.invoke('zapier-webhook-handler', {
        body: {
          event_type: 'content_generated',
          data: {
            content_id: contentRecord.id,
            content_type: contentType,
            platform: platform || 'email',
            topic: topic,
            target_audience: targetAudience || 'general',
            tone: tone,
            keywords: keywords,
            generated_at: new Date().toISOString(),
            content_preview: generatedContent.substring(0, 100) + '...',
            status: 'draft'
          }
        }
      });
      console.log('Content generation tracked in Zapier');
    } catch (webhookError) {
      console.warn('Failed to track content generation:', webhookError);
      // Don't fail the main operation if webhook fails
    }

    // Extract hashtags from content for social posts
    let hashtags: string[] = [];
    if (contentType === 'social_post') {
      const hashtagRegex = /#[\w]+/g;
      hashtags = generatedContent.match(hashtagRegex) || [];
    }

    return new Response(
      JSON.stringify({
        success: true,
        content: generatedContent,
        contentId: contentRecord.id,
        contentType,
        platform,
        status: 'draft',
        hashtags,
        intent: intentAnalysis?.intent,
        recommendedAngle: intentAnalysis?.recommendedAngle,
        suggestedCTA: intentAnalysis?.cta,
        utmSuffix: intentAnalysis?.utmSuffix
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in ai-content-generator function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);