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

interface SchedulerRequest {
  action: 'run_all_automations' | 'schedule_content' | 'process_workflows' | 'health_check';
  force?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, force = false }: SchedulerRequest = await req.json();
    console.log(`🕐 Scheduler executing: ${action}`);

    switch (action) {
      case 'run_all_automations':
        return await runAllAutomations(force);
      
      case 'schedule_content':
        return await scheduleContent();
      
      case 'process_workflows':
        return await processWorkflows();
      
      case 'health_check':
        return await healthCheck();
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Error in automated scheduler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function runAllAutomations(force: boolean) {
  console.log('🚀 Running all automations...');
  
  const results = {
    timestamp: new Date().toISOString(),
    automations_run: [],
    total_success: 0,
    total_errors: 0
  };

  // 1. Execute automation workflows
  try {
    const workflowResponse = await supabase.functions.invoke('automation-engine', {
      body: { action: 'execute_workflows' }
    });
    
    results.automations_run.push({
      name: 'workflow_execution',
      status: workflowResponse.error ? 'failed' : 'success',
      result: workflowResponse.data || workflowResponse.error
    });
    
    if (!workflowResponse.error) results.total_success++;
    else results.total_errors++;
  } catch (error: any) {
    results.automations_run.push({
      name: 'workflow_execution',
      status: 'failed',
      error: error.message
    });
    results.total_errors++;
  }

  // 2. Process content posting queue
  try {
    const contentResponse = await supabase.functions.invoke('automation-engine', {
      body: { action: 'process_content_queue' }
    });
    
    results.automations_run.push({
      name: 'content_posting',
      status: contentResponse.error ? 'failed' : 'success',
      result: contentResponse.data || contentResponse.error
    });
    
    if (!contentResponse.error) results.total_success++;
    else results.total_errors++;
  } catch (error: any) {
    results.automations_run.push({
      name: 'content_posting',
      status: 'failed',
      error: error.message
    });
    results.total_errors++;
  }

  // 3. Process lead nurturing
  try {
    const leadResponse = await supabase.functions.invoke('automation-engine', {
      body: { action: 'process_lead_nurturing' }
    });
    
    results.automations_run.push({
      name: 'lead_nurturing',
      status: leadResponse.error ? 'failed' : 'success',
      result: leadResponse.data || leadResponse.error
    });
    
    if (!leadResponse.error) results.total_success++;
    else results.total_errors++;
  } catch (error: any) {
    results.automations_run.push({
      name: 'lead_nurturing',
      status: 'failed',
      error: error.message
    });
    results.total_errors++;
  }

  // 4. Discover Reddit opportunities (every 4 hours)
  const shouldRunRedditDiscovery = force || await shouldRunAutomation('reddit_discovery', 4 * 60 * 60 * 1000);
  
  if (shouldRunRedditDiscovery) {
    try {
      const redditResponse = await supabase.functions.invoke('reddit-automation', {
        body: {
          action: 'discover_opportunities',
          subreddits: ['startups', 'entrepreneur', 'business', 'smallbusiness'],
          keywords: ['need help', 'looking for', 'problem with', 'frustration'],
          limit: 100
        }
      });
      
      results.automations_run.push({
        name: 'reddit_discovery',
        status: redditResponse.error ? 'failed' : 'success',
        result: redditResponse.data || redditResponse.error
      });
      
      if (!redditResponse.error) results.total_success++;
      else results.total_errors++;
      
      // Update last run timestamp
      await updateAutomationTimestamp('reddit_discovery');
    } catch (error: any) {
      results.automations_run.push({
        name: 'reddit_discovery',
        status: 'failed',
        error: error.message
      });
      results.total_errors++;
    }
  }

  // 5. Generate daily content (once per day)
  const shouldGenerateContent = force || await shouldRunAutomation('daily_content_generation', 24 * 60 * 60 * 1000);
  
  if (shouldGenerateContent) {
    try {
      const contentTypes = ['social_post', 'blog_outline', 'email_subject'];
      const platforms = ['twitter', 'linkedin'];
      const topics = [
        'startup growth strategies',
        'business automation tips',
        'entrepreneurship lessons',
        'marketing automation',
        'productivity hacks'
      ];

      for (const platform of platforms) {
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        const randomType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
        
        await supabase.functions.invoke('ai-content-generator', {
          body: {
            contentType: randomType,
            topic: randomTopic,
            platform: platform,
            targetAudience: 'entrepreneurs',
            tone: 'professional',
            keywords: ['growth', 'automation', 'business']
          }
        });
      }
      
      results.automations_run.push({
        name: 'daily_content_generation',
        status: 'success',
        result: { content_pieces_generated: platforms.length }
      });
      results.total_success++;
      
      await updateAutomationTimestamp('daily_content_generation');
    } catch (error: any) {
      results.automations_run.push({
        name: 'daily_content_generation',
        status: 'failed',
        error: error.message
      });
      results.total_errors++;
    }
  }

  // 6. Generate leads (every 6 hours)
  const shouldGenerateLeads = force || await shouldRunAutomation('lead_generation', 6 * 60 * 60 * 1000);
  
  if (shouldGenerateLeads) {
    try {
      const leadResponse = await supabase.functions.invoke('lead-generation', {
        body: {
          platform: 'twitter',
          keywords: ['startup', 'business', 'entrepreneur', 'marketing'],
          maxLeads: 25,
          targetAudience: 'entrepreneurs'
        }
      });
      
      results.automations_run.push({
        name: 'lead_generation',
        status: leadResponse.error ? 'failed' : 'success',
        result: leadResponse.data || leadResponse.error
      });
      
      if (!leadResponse.error) results.total_success++;
      else results.total_errors++;
      
      await updateAutomationTimestamp('lead_generation');
    } catch (error: any) {
      results.automations_run.push({
        name: 'lead_generation',
        status: 'failed',
        error: error.message
      });
      results.total_errors++;
    }
  }

  // 7. Performance optimization (daily)
  const shouldOptimize = force || await shouldRunAutomation('performance_optimization', 24 * 60 * 60 * 1000);
  
  if (shouldOptimize) {
    try {
      const optimizationResponse = await supabase.functions.invoke('automation-engine', {
        body: { action: 'run_optimization' }
      });
      
      results.automations_run.push({
        name: 'performance_optimization',
        status: optimizationResponse.error ? 'failed' : 'success',
        result: optimizationResponse.data || optimizationResponse.error
      });
      
      if (!optimizationResponse.error) results.total_success++;
      else results.total_errors++;
      
      await updateAutomationTimestamp('performance_optimization');
    } catch (error: any) {
      results.automations_run.push({
        name: 'performance_optimization',
        status: 'failed',
        error: error.message
      });
      results.total_errors++;
    }
  }

  // Record overall automation metrics
  await supabase
    .from('marketing_analytics')
    .insert({
      metric_name: 'automation_cycle_complete',
      metric_type: 'execution',
      metric_value: results.total_success,
      platform: 'automation',
      metadata: {
        total_automations: results.automations_run.length,
        success_count: results.total_success,
        error_count: results.total_errors,
        forced_run: force,
        execution_details: results.automations_run
      }
    });

  console.log(`✅ Automation cycle complete: ${results.total_success} successful, ${results.total_errors} errors`);

  return new Response(
    JSON.stringify(results),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function shouldRunAutomation(automationName: string, intervalMs: number): Promise<boolean> {
  const { data } = await supabase
    .from('marketing_analytics')
    .select('created_at')
    .eq('metric_name', `${automationName}_last_run`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return true; // Never run before

  const lastRun = new Date(data.created_at);
  const now = new Date();
  const timeSinceLastRun = now.getTime() - lastRun.getTime();

  return timeSinceLastRun >= intervalMs;
}

async function updateAutomationTimestamp(automationName: string) {
  await supabase
    .from('marketing_analytics')
    .insert({
      metric_name: `${automationName}_last_run`,
      metric_type: 'timestamp',
      metric_value: Date.now(),
      platform: 'automation',
      metadata: { automation_name: automationName }
    });
}

async function scheduleContent() {
  console.log('📅 Scheduling content for optimal posting times...');
  
  // Get unscheduled content
  const { data: content, error } = await supabase
    .from('marketing_content')
    .select('*')
    .eq('status', 'draft')
    .is('scheduled_for', null)
    .limit(20);

  if (error) throw error;

  const scheduled = [];
  
  for (const item of content || []) {
    // Calculate optimal posting time based on platform and content type
    const optimalTime = calculateOptimalPostingTime(item.platform, item.content_type);
    
    // Add to content automation queue
    const { data: queueItem, error: queueError } = await supabase
      .from('content_automation_queue')
      .insert({
        content_id: item.id,
        platform: item.platform || 'twitter',
        scheduled_time: optimalTime.toISOString(),
        post_data: {
          content: item.content,
          content_type: item.content_type,
          target_audience: item.target_audience
        }
      })
      .select('id')
      .single();

    if (!queueError) {
      // Update content status
      await supabase
        .from('marketing_content')
        .update({
          status: 'scheduled',
          scheduled_for: optimalTime.toISOString()
        })
        .eq('id', item.id);

      scheduled.push({
        content_id: item.id,
        platform: item.platform,
        scheduled_time: optimalTime.toISOString(),
        queue_id: queueItem.id
      });
    }
  }

  return new Response(
    JSON.stringify({
      content_scheduled: scheduled.length,
      scheduled_items: scheduled
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function calculateOptimalPostingTime(platform: string, contentType: string): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Platform-specific optimal times (in hours, 24-hour format)
  const optimalTimes: Record<string, number[]> = {
    twitter: [9, 12, 15, 18], // 9 AM, 12 PM, 3 PM, 6 PM
    linkedin: [8, 12, 17], // 8 AM, 12 PM, 5 PM  
    reddit: [10, 14, 20], // 10 AM, 2 PM, 8 PM
    email: [10, 14] // 10 AM, 2 PM
  };

  const times = optimalTimes[platform] || optimalTimes.twitter;
  const randomOptimalHour = times[Math.floor(Math.random() * times.length)];
  
  // Schedule for the next occurrence of this optimal time
  const scheduledTime = new Date(tomorrow);
  scheduledTime.setHours(randomOptimalHour, Math.floor(Math.random() * 60), 0, 0);
  
  // Add some randomization to avoid posting everything at exactly the same time
  const randomMinutes = Math.floor(Math.random() * 30) - 15; // ±15 minutes
  scheduledTime.setMinutes(scheduledTime.getMinutes() + randomMinutes);
  
  return scheduledTime;
}

async function processWorkflows() {
  console.log('⚙️ Processing automation workflows...');
  
  // Call the database function to process automation queue
  const { error } = await supabase.rpc('process_automation_queue');
  
  if (error) {
    console.error('Error processing workflows:', error);
    throw error;
  }

  // Also process content posting and lead nurturing
  await Promise.all([
    supabase.rpc('process_content_posting_queue'),
    supabase.rpc('process_lead_nurturing')
  ]);

  return new Response(
    JSON.stringify({
      status: 'success',
      message: 'All workflow queues processed',
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function healthCheck() {
  console.log('🏥 Running automation health check...');
  
  const health = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: [],
    warnings: [],
    errors: []
  };

  // Check active workflows
  try {
    const { data: workflows, error } = await supabase
      .from('automation_workflows')
      .select('id, name, is_active, last_execution, failure_count')
      .eq('is_active', true);

    if (error) throw error;

    health.checks.push({
      name: 'active_workflows',
      status: 'pass',
      count: workflows?.length || 0
    });

    // Check for workflows with high failure rates
    const problematicWorkflows = workflows?.filter(w => 
      w.failure_count > 5 && 
      (!w.last_execution || new Date(w.last_execution) < new Date(Date.now() - 24 * 60 * 60 * 1000))
    );

    if (problematicWorkflows && problematicWorkflows.length > 0) {
      health.warnings.push({
        type: 'workflow_failures',
        message: `${problematicWorkflows.length} workflows have high failure rates`,
        workflows: problematicWorkflows.map(w => ({ id: w.id, name: w.name, failure_count: w.failure_count }))
      });
    }

  } catch (error: any) {
    health.errors.push({
      check: 'active_workflows',
      error: error.message
    });
    health.status = 'degraded';
  }

  // Check content queue
  try {
    const { data: queueStats } = await supabase
      .from('content_automation_queue')
      .select('status, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const pendingCount = queueStats?.filter(q => q.status === 'pending').length || 0;
    const failedCount = queueStats?.filter(q => q.status === 'failed').length || 0;

    health.checks.push({
      name: 'content_queue',
      status: 'pass',
      pending_items: pendingCount,
      failed_items: failedCount
    });

    if (failedCount > 10) {
      health.warnings.push({
        type: 'content_queue_failures',
        message: `${failedCount} failed content posts in the last 24 hours`
      });
    }

  } catch (error: any) {
    health.errors.push({
      check: 'content_queue',
      error: error.message
    });
    health.status = 'degraded';
  }

  // Check recent executions
  try {
    const { data: executions } = await supabase
      .from('automation_executions')
      .select('execution_status, started_at')
      .gte('started_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('started_at', { ascending: false });

    const recentFailures = executions?.filter(e => e.execution_status === 'failed').length || 0;

    health.checks.push({
      name: 'recent_executions',
      status: recentFailures > 5 ? 'warn' : 'pass',
      total_executions: executions?.length || 0,
      failed_executions: recentFailures
    });

  } catch (error: any) {
    health.errors.push({
      check: 'recent_executions',
      error: error.message
    });
    health.status = 'degraded';
  }

  if (health.errors.length > 0) {
    health.status = 'unhealthy';
  } else if (health.warnings.length > 0) {
    health.status = 'degraded';
  }

  // Store health check results
  await supabase
    .from('marketing_analytics')
    .insert({
      metric_name: 'automation_health_check',
      metric_type: 'status',
      metric_value: health.status === 'healthy' ? 100 : (health.status === 'degraded' ? 50 : 0),
      platform: 'automation',
      metadata: health
    });

  return new Response(
    JSON.stringify(health),
    { 
      status: health.status === 'healthy' ? 200 : (health.status === 'degraded' ? 202 : 500),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

serve(handler);