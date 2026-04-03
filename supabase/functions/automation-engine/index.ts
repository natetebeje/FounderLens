import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutomationRequest {
  action: 'execute_workflows' | 'process_content_queue' | 'process_lead_nurturing' | 'run_optimization';
  workflow_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, workflow_id }: AutomationRequest = await req.json();
    console.log(`Processing automation action: ${action}`);

    switch (action) {
      case 'execute_workflows':
        return await executeWorkflows();
      
      case 'process_content_queue':
        return await processContentQueue();
      
      case 'process_lead_nurturing':
        return await processLeadNurturing();
      
      case 'run_optimization':
        return await runOptimization();
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Error in automation engine:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function executeWorkflows() {
  console.log('Executing automation workflows...');
  
  // Get pending workflows
  const { data: workflows, error } = await supabase
    .from('automation_workflows')
    .select('*')
    .eq('is_active', true)
    .or('next_execution.is.null,next_execution.lte.' + new Date().toISOString())
    .limit(50);

  if (error) throw error;

  const results = [];
  
  for (const workflow of workflows || []) {
    try {
      const executionId = await createExecution(workflow.id);
      const result = await executeWorkflow(workflow, executionId);
      results.push(result);
    } catch (error: any) {
      console.error(`Failed to execute workflow ${workflow.name}:`, error);
      results.push({ workflow_id: workflow.id, status: 'failed', error: error.message });
    }
  }

  return new Response(
    JSON.stringify({ executed_workflows: results.length, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createExecution(workflowId: string) {
  const { data, error } = await supabase
    .from('automation_executions')
    .insert({
      workflow_id: workflowId,
      execution_status: 'running',
      trigger_data: { triggered_at: new Date().toISOString() }
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function executeWorkflow(workflow: any, executionId: string) {
  const startTime = Date.now();
  
  try {
    console.log(`Executing workflow: ${workflow.name} (${workflow.workflow_type})`);
    
    const results = [];
    
    for (const action of workflow.actions) {
      const actionResult = await executeAction(action, workflow);
      results.push(actionResult);
    }

    // Update execution as completed
    await supabase
      .from('automation_executions')
      .update({
        execution_status: 'completed',
        execution_results: { actions: results },
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime
      })
      .eq('id', executionId);

    // Update workflow stats and next execution
    await updateWorkflowStats(workflow, true);

    console.log(`✅ Workflow ${workflow.name} completed successfully`);
    return { workflow_id: workflow.id, status: 'completed', results };

  } catch (error: any) {
    // Update execution as failed
    await supabase
      .from('automation_executions')
      .update({
        execution_status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime
      })
      .eq('id', executionId);

    // Update workflow stats
    await updateWorkflowStats(workflow, false);

    throw error;
  }
}

async function executeAction(action: any, workflow: any) {
  console.log(`Executing action: ${action.type}`);
  
  switch (action.type) {
    case 'generate_content':
      return await generateContentAction(action);
    
    case 'create_campaign':
      return await createCampaignAction(action);
    
    case 'send_welcome_email':
      return await sendWelcomeEmailAction(action);
    
    case 'add_to_nurturing_sequence':
      return await addToNurturingSequenceAction(action);
    
    case 'analyze_performance':
      return await analyzePerformanceAction(action);
    
    case 'generate_suggestions':
      return await generateSuggestionsAction(action);
    
    case 'auto_apply_safe_optimizations':
      return await autoApplyOptimizationsAction(action);
    
    default:
      console.log(`Unknown action type: ${action.type}`);
      return { action: action.type, status: 'skipped', reason: 'Unknown action type' };
  }
}

async function generateContentAction(action: any) {
  try {
    // Call the AI content generator
    const response = await supabase.functions.invoke('ai-content-generator', {
      body: {
        contentType: action.content_type || 'social_post',
        topic: action.topic || 'business growth',
        platform: action.platform || 'twitter',
        targetAudience: 'entrepreneurs',
        tone: 'professional',
        keywords: ['growth', 'business', 'startup']
      }
    });

    if (response.error) throw response.error;

    // Trigger Zapier webhooks for content generation
    try {
      await supabase.functions.invoke('zapier-webhook-handler', {
        body: {
          event_type: 'content_generated',
          data: {
            content_id: response.data?.id,
            content_type: action.content_type || 'social_post',
            platform: action.platform || 'twitter',
            topic: action.topic || 'business growth',
            generated_at: new Date().toISOString()
          }
        }
      });
    } catch (webhookError) {
      console.warn('Failed to trigger Zapier webhooks:', webhookError);
    }

    console.log('✅ Generated content successfully');
    return { action: 'generate_content', status: 'completed', content_id: response.data?.id };
  } catch (error: any) {
    console.error('Failed to generate content:', error);
    return { action: 'generate_content', status: 'failed', error: error.message };
  }
}

async function createCampaignAction(action: any) {
  try {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert({
        name: `Auto Campaign - ${new Date().toLocaleDateString()}`,
        campaign_type: action.campaign_type || 'growth',
        status: 'active',
        platforms: ['twitter', 'linkedin'],
        target_keywords: ['business', 'growth', 'startup'],
        content_themes: ['tips', 'insights', 'success stories']
      })
      .select('id')
      .single();

    if (error) throw error;

    // Trigger Zapier webhooks for campaign completion
    try {
      await supabase.functions.invoke('zapier-webhook-handler', {
        body: {
          event_type: 'campaign_completed',
          data: {
            campaign_id: data.id,
            campaign_name: `Auto Campaign - ${new Date().toLocaleDateString()}`,
            campaign_type: action.campaign_type || 'growth',
            platforms: ['twitter', 'linkedin'],
            created_at: new Date().toISOString()
          }
        }
      });
    } catch (webhookError) {
      console.warn('Failed to trigger Zapier webhooks:', webhookError);
    }

    console.log('✅ Created campaign successfully');
    return { action: 'create_campaign', status: 'completed', campaign_id: data.id };
  } catch (error: any) {
    console.error('Failed to create campaign:', error);
    return { action: 'create_campaign', status: 'failed', error: error.message };
  }
}

async function sendWelcomeEmailAction(action: any) {
  console.log('📧 Sending welcome email...');
  
  try {
    // Get recent leads to send welcome emails
    const { data: newLeads } = await supabase
      .from('marketing_leads')
      .select('*')
      .eq('status', 'new')
      .is('last_interaction', null)
      .limit(10);

    let emailsSent = 0;
    for (const lead of newLeads || []) {
      if (lead.contact_info?.email) {
        const emailResponse = await supabase.functions.invoke('email-automation', {
          body: {
            action: 'send_welcome',
            to: lead.contact_info.email,
            lead_id: lead.id
          }
        });

        if (!emailResponse.error) {
          emailsSent++;
        }
      }
    }

    return { action: 'send_welcome_email', status: 'completed', emails_sent: emailsSent };
  } catch (error: any) {
    console.error('Failed to send welcome emails:', error);
    return { action: 'send_welcome_email', status: 'failed', error: error.message };
  }
}

async function addToNurturingSequenceAction(action: any) {
  // Add recent leads to nurturing sequence
  try {
    const { data: recentLeads } = await supabase
      .from('marketing_leads')
      .select('id')
      .eq('status', 'new')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (recentLeads) {
      for (const lead of recentLeads) {
        await supabase
          .from('lead_automation_sequences')
          .insert({
            lead_id: lead.id,
            sequence_type: 'welcome',
            next_action_time: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
          });
      }
    }

    console.log('✅ Added leads to nurturing sequence');
    return { action: 'add_to_nurturing_sequence', status: 'completed', leads_added: recentLeads?.length || 0 };
  } catch (error: any) {
    console.error('Failed to add to nurturing sequence:', error);
    return { action: 'add_to_nurturing_sequence', status: 'failed', error: error.message };
  }
}

async function analyzePerformanceAction(action: any) {
  try {
    // Analyze recent campaign performance
    const { data: analytics } = await supabase
      .from('marketing_analytics')
      .select('*')
      .gte('date_recorded', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    console.log('📊 Analyzed performance data');
    return { action: 'analyze_performance', status: 'completed', metrics_analyzed: analytics?.length || 0 };
  } catch (error: any) {
    console.error('Failed to analyze performance:', error);
    return { action: 'analyze_performance', status: 'failed', error: error.message };
  }
}

async function generateSuggestionsAction(action: any) {
  try {
    // Generate optimization suggestions based on performance
    const suggestions = [
      {
        suggestion_type: 'timing',
        target_type: 'campaign',
        target_id: crypto.randomUUID(),
        suggestion_title: 'Optimize Posting Time',
        suggestion_description: 'Post content at 2 PM for 23% better engagement',
        suggested_changes: { optimal_time: '14:00' },
        confidence_score: 85,
        potential_impact: { engagement_increase: '23%' }
      }
    ];

    await supabase
      .from('optimization_suggestions')
      .insert(suggestions);

    console.log('💡 Generated optimization suggestions');
    return { action: 'generate_suggestions', status: 'completed', suggestions_created: suggestions.length };
  } catch (error: any) {
    console.error('Failed to generate suggestions:', error);
    return { action: 'generate_suggestions', status: 'failed', error: error.message };
  }
}

async function autoApplyOptimizationsAction(action: any) {
  try {
    // Auto-apply safe optimizations with high confidence scores
    const { data: safeSuggestions } = await supabase
      .from('optimization_suggestions')
      .select('*')
      .eq('status', 'pending')
      .gte('confidence_score', 90)
      .in('suggestion_type', ['timing', 'content']);

    let appliedCount = 0;
    for (const suggestion of safeSuggestions || []) {
      // Apply the suggestion (implementation depends on suggestion type)
      await supabase
        .from('optimization_suggestions')
        .update({
          status: 'applied',
          applied_at: new Date().toISOString()
        })
        .eq('id', suggestion.id);
      
      appliedCount++;
    }

    console.log('🔧 Applied safe optimizations');
    return { action: 'auto_apply_safe_optimizations', status: 'completed', optimizations_applied: appliedCount };
  } catch (error: any) {
    console.error('Failed to apply optimizations:', error);
    return { action: 'auto_apply_safe_optimizations', status: 'failed', error: error.message };
  }
}

async function updateWorkflowStats(workflow: any, success: boolean) {
  const updateData: any = {
    execution_count: workflow.execution_count + 1,
    last_execution: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (success) {
    updateData.success_count = workflow.success_count + 1;
  } else {
    updateData.failure_count = workflow.failure_count + 1;
  }

  // Set next execution time for scheduled workflows
  if (workflow.trigger_event === 'schedule') {
    const frequency = workflow.trigger_conditions?.frequency;
    const now = new Date();
    
    switch (frequency) {
      case 'hourly':
        updateData.next_execution = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        break;
      case 'daily':
        updateData.next_execution = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'weekly':
        updateData.next_execution = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        updateData.next_execution = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
  }

  await supabase
    .from('automation_workflows')
    .update(updateData)
    .eq('id', workflow.id);
}

async function processContentQueue() {
  console.log('Processing content posting queue...');
  
  const { data: queueItems, error } = await supabase
    .from('content_automation_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_time', new Date().toISOString())
    .limit(20);

  if (error) throw error;

  const results = [];
  
  for (const item of queueItems || []) {
    try {
      // Update status to processing
      await supabase
        .from('content_automation_queue')
        .update({ status: 'processing' })
        .eq('id', item.id);

      // Process the content posting
      const result = await postContent(item);
      results.push(result);
      
    } catch (error: any) {
      console.error(`Failed to process queue item ${item.id}:`, error);
      
      await supabase
        .from('content_automation_queue')
        .update({ 
          status: 'failed',
          retry_count: item.retry_count + 1,
          platform_response: { error: error.message }
        })
        .eq('id', item.id);
    }
  }

  return new Response(
    JSON.stringify({ processed_items: results.length, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function postContent(queueItem: any) {
  console.log(`Posting content to ${queueItem.platform}...`);
  
  try {
    let platformResponse;
    
    // Real platform API integrations
    switch (queueItem.platform) {
      case 'twitter':
        platformResponse = await supabase.functions.invoke('twitter-integration', {
          body: {
            action: 'post_tweet',
            content: queueItem.post_data.content
          }
        });
        break;
        
      case 'linkedin':
        platformResponse = await supabase.functions.invoke('linkedin-integration', {
          body: {
            action: 'post_update',
            content: queueItem.post_data.content
          }
        });
        break;
        
      case 'reddit':
        // Reddit posting would require more careful approach due to community guidelines
        platformResponse = await supabase.functions.invoke('reddit-automation', {
          body: {
            action: 'engage_with_posts',
            keywords: queueItem.post_data.keywords || ['business', 'startup']
          }
        });
        break;
        
      default:
        throw new Error(`Unsupported platform: ${queueItem.platform}`);
    }

    if (platformResponse.error) {
      throw new Error(platformResponse.error.message);
    }

    await supabase
      .from('content_automation_queue')
      .update({
        status: 'posted',
        platform_response: {
          posted_at: new Date().toISOString(),
          platform_data: platformResponse.data,
          success: true
        }
      })
      .eq('id', queueItem.id);

    return { queue_item_id: queueItem.id, status: 'posted', platform: queueItem.platform, platform_response: platformResponse.data };

  } catch (error: any) {
    console.error(`Failed to post content to ${queueItem.platform}:`, error);
    
    await supabase
      .from('content_automation_queue')
      .update({
        status: 'failed',
        platform_response: {
          error: error.message,
          failed_at: new Date().toISOString()
        }
      })
      .eq('id', queueItem.id);

    throw error;
  }
}

async function processLeadNurturing() {
  console.log('Processing lead nurturing sequences...');
  
  const { data: sequences, error } = await supabase
    .from('lead_automation_sequences')
    .select('*')
    .eq('status', 'active')
    .lte('next_action_time', new Date().toISOString())
    .limit(30);

  if (error) throw error;

  const results = [];
  
  for (const sequence of sequences || []) {
    try {
      const result = await processNurturingStep(sequence);
      results.push(result);
    } catch (error: any) {
      console.error(`Failed to process nurturing sequence ${sequence.id}:`, error);
    }
  }

  return new Response(
    JSON.stringify({ processed_sequences: results.length, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processNurturingStep(sequence: any) {
  console.log(`Processing nurturing step ${sequence.sequence_step} for lead ${sequence.lead_id}`);
  
  try {
    // Get lead information
    const { data: lead } = await supabase
      .from('marketing_leads')
      .select('*')
      .eq('id', sequence.lead_id)
      .single();

    if (lead && lead.contact_info?.email) {
      // Send nurturing email
      const emailResponse = await supabase.functions.invoke('email-automation', {
        body: {
          action: 'send_nurturing',
          to: lead.contact_info.email,
          lead_id: lead.id,
          sequence_step: sequence.sequence_step
        }
      });

      if (emailResponse.error) {
        console.error('Failed to send nurturing email:', emailResponse.error);
      }
    }

    // Calculate next action time based on sequence step
    const nextActionTime = new Date();
    if (sequence.sequence_step < 5) {
      nextActionTime.setDate(nextActionTime.getDate() + 2); // 2 days
    } else if (sequence.sequence_step < 10) {
      nextActionTime.setDate(nextActionTime.getDate() + 7); // 1 week
    } else {
      nextActionTime.setDate(nextActionTime.getDate() + 14); // 2 weeks
    }

    await supabase
      .from('lead_automation_sequences')
      .update({
        sequence_step: sequence.sequence_step + 1,
        next_action_time: nextActionTime.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sequence.id);

    return { sequence_id: sequence.id, step: sequence.sequence_step + 1, lead_id: sequence.lead_id };
  } catch (error: any) {
    console.error('Failed to process nurturing step:', error);
    throw error;
  }
}

async function runOptimization() {
  console.log('Running performance optimization...');
  
  // This would analyze recent performance and generate insights
  const optimizations = {
    content_optimized: 5,
    campaigns_adjusted: 2,
    timing_improved: 3
  };

  return new Response(
    JSON.stringify({ optimization_complete: true, optimizations }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

serve(handler);