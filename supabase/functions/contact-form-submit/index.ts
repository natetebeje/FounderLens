import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  company?: string;
  subject: string;
  message: string;
  botProtection?: {
    confidence: number;
    interactionData: boolean;
  };
}

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests: number = 3, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const key = `contact_${identifier}`;
  const entry = rateLimitStore.get(key);
  
  if (!entry || now >= entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (entry.count >= maxRequests) {
    return false;
  }
  
  entry.count++;
  return true;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, company, subject, message, botProtection }: ContactRequest = await req.json();

    // Enhanced security headers
    const securityHeaders = {
      ...corsHeaders,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY", 
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy": "default-src 'self'"
    };

    // Rate limiting check
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `${ip}_${email}`;
    
    if (!checkRateLimit(rateLimitKey)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait before submitting again." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...securityHeaders },
        }
      );
    }

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate message length
    if (message.length < 10) {
      return new Response(
        JSON.stringify({ error: "Message must be at least 10 characters long" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Supabase client with service role for bypassing RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user agent and IP for analytics
    const userAgent = req.headers.get("user-agent") || "";
    
    // Log security-relevant information
    console.log(`Contact form submission from IP: ${ip}, UA: ${userAgent.substring(0, 100)}, Bot confidence: ${botProtection?.confidence || 0}`);

    // Insert contact form submission
    const { data: submission, error: insertError } = await supabase
      .from("contact_form_submissions")
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        company: company?.trim() || null,
        subject: subject.trim(),
        message: message.trim(),
        user_agent: userAgent,
        ip_address: ip,
        status: "new",
        metadata: {
          bot_confidence: botProtection?.confidence || 0,
          has_interaction_data: botProtection?.interactionData || false,
          submission_time: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to submit contact form" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...securityHeaders },
        }
      );
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    try {
      // Send confirmation email to user
      await resend.emails.send({
        from: "FounderLens <support@founderlens.io>",
        to: [email],
        subject: "We received your message - FounderLens Support",
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h1 style="color: #1a1a1a; margin-bottom: 24px;">Thank you for contacting us!</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hi ${name},
            </p>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              We've received your message about "<strong>${subject}</strong>" and our team will get back to you within 24 hours.
            </p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1a1a1a; margin-top: 0;">Your Message:</h3>
              <p style="color: #4a4a4a; margin-bottom: 0;">${message}</p>
            </div>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              In the meantime, feel free to explore our platform and discover business opportunities!
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://founderlens.com" style="background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Explore FounderLens
              </a>
            </div>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Best regards,<br>
              The FounderLens Team
            </p>
          </div>
        `,
      });

      // Send notification email to admin
      await resend.emails.send({
        from: "FounderLens <noreply@founderlens.com>",
        to: ["support@founderlens.io"], // Replace with actual admin email
        subject: `New Contact Form Submission: ${subject}`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h1 style="color: #1a1a1a; margin-bottom: 24px;">New Contact Form Submission</h1>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Message:</strong></p>
              <p style="background: white; padding: 15px; border-radius: 4px;">${message}</p>
            </div>
            <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                <strong>Submission ID:</strong> ${submission.id}<br>
                <strong>User Agent:</strong> ${userAgent}<br>
                <strong>IP Address:</strong> ${ip || 'Unknown'}<br>
                <strong>Submitted:</strong> ${new Date().toISOString()}
              </p>
            </div>
          </div>
        `,
      });

    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Don't fail the submission if email fails
    }

    console.log(`Contact form submission successful for: ${email} - Subject: ${subject}`);

    return new Response(
      JSON.stringify({ 
        message: "Message sent successfully! We'll get back to you within 24 hours.",
        submissionId: submission.id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...securityHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in contact-form-submit function:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...securityHeaders },
        }
      );
  }
};

serve(handler);