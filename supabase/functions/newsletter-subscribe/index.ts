import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscribeRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: SubscribeRequest = await req.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
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
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip");

    // Check if email already exists
    const { data: existing } = await supabase
      .from("newsletter_subscriptions")
      .select("id, is_active")
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      if (existing.is_active) {
        return new Response(
          JSON.stringify({ message: "Email already subscribed" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      } else {
        // Reactivate existing subscription
        await supabase
          .from("newsletter_subscriptions")
          .update({ 
            is_active: true, 
            subscribed_at: new Date().toISOString(),
            user_agent: userAgent,
            ip_address: ip
          })
          .eq("id", existing.id);
      }
    } else {
      // Insert new subscription
      const { error: insertError } = await supabase
        .from("newsletter_subscriptions")
        .insert({
          email: email.toLowerCase(),
          user_agent: userAgent,
          ip_address: ip,
          source: "website"
        });

      if (insertError) {
        console.error("Database error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to subscribe" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // Send welcome email
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    try {
      await resend.emails.send({
        from: "FounderLens <newsletter@founderlens.com>",
        to: [email],
        subject: "Welcome to FounderLens Newsletter!",
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h1 style="color: #1a1a1a; margin-bottom: 24px;">Welcome to FounderLens!</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Thank you for subscribing to our newsletter! You'll now receive:
            </p>
            <ul style="color: #4a4a4a; font-size: 16px; line-height: 1.8; margin-bottom: 20px;">
              <li>Weekly business opportunity insights</li>
              <li>Market validation tips and strategies</li>
              <li>Founder success stories and case studies</li>
              <li>Early access to new features</li>
            </ul>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              We're excited to help you discover and validate your next big business opportunity!
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://founderlens.com" style="background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Get Started with FounderLens
              </a>
            </div>
            <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
              You can unsubscribe at any time by clicking the unsubscribe link in our emails.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Don't fail the subscription if email fails
    }

    console.log(`Newsletter subscription successful for: ${email}`);

    return new Response(
      JSON.stringify({ 
        message: "Successfully subscribed to newsletter!",
        email: email 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in newsletter-subscribe function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);