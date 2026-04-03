import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { Resend } from "npm:resend@2.0.0";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  action: 'send_welcome' | 'send_nurturing' | 'send_newsletter' | 'send_custom';
  to: string | string[];
  subject?: string;
  content?: string;
  template_type?: string;
  lead_id?: string;
  sequence_step?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!Deno.env.get("RESEND_API_KEY")) {
      throw new Error("Resend API key not configured");
    }
    
    const { action, to, subject, content, template_type, lead_id, sequence_step }: EmailRequest = await req.json();
    console.log(`Processing email action: ${action}`);

    switch (action) {
      case 'send_welcome':
        return await sendWelcomeEmail(to as string, lead_id);
      
      case 'send_nurturing':
        return await sendNurturingEmail(to as string, lead_id, sequence_step || 1);
      
      case 'send_newsletter':
        return await sendNewsletterEmail(to, subject, content);
      
      case 'send_custom':
        if (!subject || !content) throw new Error('Subject and content are required for custom emails');
        return await sendCustomEmail(to, subject, content);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Error in email automation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function sendWelcomeEmail(to: string, leadId?: string) {
  console.log(`📧 Sending welcome email to ${to}...`);
  
  const subject = "Welcome to FounderLens - Your AI-Powered Business Opportunity Discovery Platform";
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <header style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to FounderLens!</h1>
      </header>
      
      <div style="padding: 30px;">
        <h2 style="color: #333; margin-bottom: 20px;">Discover Your Next Business Opportunity</h2>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Thank you for joining FounderLens! You're now part of a community of forward-thinking entrepreneurs 
          who use AI to discover and validate business opportunities.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">What's Next?</h3>
          <ul style="color: #666; line-height: 1.6;">
            <li>🔍 <strong>Discover Opportunities:</strong> Our AI scans Reddit, Twitter, and other platforms to find real business opportunities</li>
            <li>📊 <strong>Validate Ideas:</strong> Get automated market validation and competitor analysis</li>
            <li>🚀 <strong>Launch Faster:</strong> Generate MVP prototypes and landing pages with AI</li>
            <li>📈 <strong>Track Progress:</strong> Monitor your opportunity pipeline and validation progress</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://founderlens.io/discovery" 
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; 
                    font-weight: bold; font-size: 16px;">
            Start Discovering Opportunities
          </a>
        </div>
        
        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          Over the next few days, we'll send you tips and insights to help you maximize your success with FounderLens.
        </p>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #999; font-size: 14px; text-align: center;">
            Questions? Reply to this email or contact us at support@founderlens.io
          </p>
        </div>
      </div>
    </div>
  `;

  const emailResponse = await resend.emails.send({
    from: "FounderLens <hello@founderlens.io>",
    to: [to],
    subject: subject,
    html: htmlContent,
  });

  // Record email sent
  await supabase
    .from('email_notifications')
    .insert({
      recipient_email: to,
      subject: subject,
      template_type: 'welcome',
      status: 'sent',
      sent_at: new Date().toISOString()
    });

  // Update lead if provided
  if (leadId) {
    await supabase
      .from('marketing_leads')
      .update({
        last_interaction: new Date().toISOString(),
        status: 'engaged'
      })
      .eq('id', leadId);
  }

  // Record analytics
  await supabase
    .from('marketing_analytics')
    .insert({
      metric_name: 'welcome_email_sent',
      metric_type: 'count',
      metric_value: 1,
      platform: 'email',
      metadata: {
        recipient: to,
        lead_id: leadId,
        email_id: emailResponse.data?.id
      }
    });

  console.log('✅ Welcome email sent successfully');
  return new Response(
    JSON.stringify({
      success: true,
      email_id: emailResponse.data?.id,
      message: 'Welcome email sent successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendNurturingEmail(to: string, leadId?: string, step: number = 1) {
  console.log(`📧 Sending nurturing email (step ${step}) to ${to}...`);
  
  const nurturingTemplates = {
    1: {
      subject: "Your First Business Opportunity Awaits",
      content: `
        <h2>Ready to Discover Your Next Big Opportunity?</h2>
        <p>Many successful entrepreneurs started by identifying a single pain point in the market. 
        FounderLens has already discovered several opportunities that match your interests.</p>
        <p><strong>Here's what you can do today:</strong></p>
        <ul>
          <li>Review your personalized opportunity feed</li>
          <li>Start validating your top 3 opportunities</li>
          <li>Join our community of 500+ active founders</li>
        </ul>
        <a href="https://founderlens.io/opportunities" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0;">View Your Opportunities</a>
      `
    },
    2: {
      subject: "Market Validation Made Simple",
      content: `
        <h2>Turn Ideas Into Validated Opportunities</h2>
        <p>The difference between successful founders and dreamers? Validation.</p>
        <p>Our AI helps you validate opportunities by analyzing:</p>
        <ul>
          <li>Real market demand from social media discussions</li>
          <li>Competitor analysis and market gaps</li>
          <li>Potential customer segments and pain points</li>
        </ul>
        <p><strong>Success Story:</strong> Sarah used FounderLens to validate her SaaS idea and launched to $5K MRR in 3 months.</p>
        <a href="https://founderlens.io/validation" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0;">Start Validation Workflow</a>
      `
    },
    3: {
      subject: "From Idea to MVP in Record Time",
      content: `
        <h2>Launch Faster With AI-Generated MVPs</h2>
        <p>Speed matters in entrepreneurship. While others are still planning, you could be collecting real user feedback.</p>
        <p>FounderLens can generate:</p>
        <ul>
          <li>Landing pages optimized for conversion</li>
          <li>MVP prototypes based on validated opportunities</li>
          <li>Go-to-market strategies tailored to your audience</li>
        </ul>
        <p>Ready to move from idea to reality?</p>
        <a href="https://founderlens.io/mvp-generator" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0;">Generate Your MVP</a>
      `
    }
  };

  const template = nurturingTemplates[step as keyof typeof nurturingTemplates] || nurturingTemplates[1];
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px;">
      ${template.content}
      
      <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
        <p style="color: #999; font-size: 14px; text-align: center;">
          Not interested? <a href="#" style="color: #667eea;">Unsubscribe here</a> | 
          Questions? Email support@founderlens.io
        </p>
      </div>
    </div>
  `;

  const emailResponse = await resend.emails.send({
    from: "FounderLens <hello@founderlens.io>",
    to: [to],
    subject: template.subject,
    html: htmlContent,
  });

  // Record email sent
  await supabase
    .from('email_notifications')
    .insert({
      recipient_email: to,
      subject: template.subject,
      template_type: `nurturing_step_${step}`,
      status: 'sent',
      sent_at: new Date().toISOString()
    });

  // Update lead nurturing sequence
  if (leadId) {
    await supabase
      .from('lead_automation_sequences')
      .update({
        sequence_step: step + 1,
        next_action_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days later
      })
      .eq('lead_id', leadId);
  }

  // Record analytics
  await supabase
    .from('marketing_analytics')
    .insert({
      metric_name: 'nurturing_email_sent',
      metric_type: 'count',
      metric_value: 1,
      platform: 'email',
      metadata: {
        recipient: to,
        lead_id: leadId,
        sequence_step: step,
        email_id: emailResponse.data?.id
      }
    });

  console.log(`✅ Nurturing email (step ${step}) sent successfully`);
  return new Response(
    JSON.stringify({
      success: true,
      email_id: emailResponse.data?.id,
      message: `Nurturing email step ${step} sent successfully`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendNewsletterEmail(to: string | string[], subject?: string, content?: string) {
  console.log('📧 Sending newsletter email...');
  
  const recipients = Array.isArray(to) ? to : [to];
  
  const defaultSubject = "Weekly Business Opportunities & Insights from FounderLens";
  const defaultContent = `
    <h2>This Week's Top Business Opportunities</h2>
    <p>Discover the most promising opportunities our AI has found across Reddit, Twitter, and industry forums.</p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3>🔥 Trending This Week</h3>
      <ul>
        <li><strong>AI-Powered Customer Support:</strong> 47 discussions about businesses struggling with customer service automation</li>
        <li><strong>E-commerce Analytics:</strong> Growing demand for better inventory management tools</li>
        <li><strong>Remote Team Communication:</strong> New pain points emerging in hybrid work environments</li>
      </ul>
    </div>
    
    <a href="https://founderlens.io/opportunities" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0;">View All Opportunities</a>
  `;

  const emailResponse = await resend.emails.send({
    from: "FounderLens Newsletter <newsletter@founderlens.io>",
    to: recipients,
    subject: subject || defaultSubject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px;">
        ${content || defaultContent}
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #999; font-size: 14px; text-align: center;">
            Unsubscribe | Update preferences | FounderLens.io
          </p>
        </div>
      </div>
    `,
  });

  // Record analytics
  await supabase
    .from('marketing_analytics')
    .insert({
      metric_name: 'newsletter_sent',
      metric_type: 'count',
      metric_value: recipients.length,
      platform: 'email',
      metadata: {
        recipients_count: recipients.length,
        subject: subject || defaultSubject,
        email_id: emailResponse.data?.id
      }
    });

  console.log(`✅ Newsletter sent to ${recipients.length} recipients`);
  return new Response(
    JSON.stringify({
      success: true,
      email_id: emailResponse.data?.id,
      recipients_count: recipients.length,
      message: 'Newsletter sent successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendCustomEmail(to: string | string[], subject: string, content: string) {
  console.log('📧 Sending custom email...');
  
  const recipients = Array.isArray(to) ? to : [to];
  
  const emailResponse = await resend.emails.send({
    from: "FounderLens <hello@founderlens.io>",
    to: recipients,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px;">
        ${content}
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #999; font-size: 14px; text-align: center;">
            FounderLens - AI-Powered Business Opportunity Discovery
          </p>
        </div>
      </div>
    `,
  });

  console.log(`✅ Custom email sent to ${recipients.length} recipients`);
  return new Response(
    JSON.stringify({
      success: true,
      email_id: emailResponse.data?.id,
      recipients_count: recipients.length,
      message: 'Custom email sent successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

serve(handler);