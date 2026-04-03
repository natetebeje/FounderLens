import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminReplyRequest {
  submissionId: string;
  message: string;
  adminNotes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      console.error('Profile error or not admin:', profileError, profile);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { submissionId, message, adminNotes }: AdminReplyRequest = await req.json();

    if (!submissionId || !message) {
      return new Response(JSON.stringify({ error: 'Submission ID and message are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get the original submission
    const { data: submission, error: submissionError } = await supabase
      .from('contact_form_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      console.error('Error fetching submission:', submissionError);
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Send reply email
    const emailResult = await resend.emails.send({
      from: "FounderLens Support <support@founderlens.io>",
      to: [submission.email],
      subject: `Re: ${submission.subject}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">FounderLens Support</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hi ${submission.name},
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Thank you for contacting us. Here's our response to your inquiry:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Your Original Message:</h3>
              <p style="color: #666; font-style: italic;">"${submission.message}"</p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Our Response:</h3>
              <div style="white-space: pre-wrap; line-height: 1.6;">${message}</div>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">
              If you have any additional questions, feel free to reply to this email or contact us again.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 0;">
              Best regards,<br>
              The FounderLens Support Team
            </p>
          </div>
          
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">This email was sent in response to your inquiry submitted on ${new Date(submission.created_at).toLocaleDateString()}.</p>
          </div>
        </div>
      `,
    });

    if (emailResult.error) {
      console.error('Error sending email:', emailResult.error);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log('Email sent successfully:', emailResult.data);

    // Update submission status and tracking
    const updateData: any = {
      status: 'responded',
      responded_at: new Date().toISOString(),
      responded_by: user.id,
      updated_at: new Date().toISOString()
    };

    if (adminNotes) {
      updateData.admin_notes = adminNotes;
    }

    const { error: updateError } = await supabase
      .from('contact_form_submissions')
      .update(updateData)
      .eq('id', submissionId);

    if (updateError) {
      console.error('Error updating submission:', updateError);
      // Email was sent but update failed - log this but don't fail the request
      console.log('Email sent successfully but failed to update database status');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Reply sent successfully',
      emailId: emailResult.data?.id 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in admin-reply-contact function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);