/**
 * FounderLens × GigaBrain — Reddit connectivity test endpoint
 * GET /reddit-test?opportunityId=<id>  OR  POST with { query, opportunityId }
 * Tests that PullPush / Reddit OAuth search is working correctly.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let query = "best project management tool alternatives";
  let opportunityId: string | null = null;

  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body.query) query = body.query;
      if (body.opportunityId) opportunityId = body.opportunityId;
    } else {
      const url = new URL(req.url);
      if (url.searchParams.get("query")) query = url.searchParams.get("query")!;
      if (url.searchParams.get("opportunityId")) opportunityId = url.searchParams.get("opportunityId");
    }

    // If opportunityId given, fetch opportunity title as the query
    if (opportunityId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data } = await supabase
        .from("business_opportunities")
        .select("title, target_market")
        .eq("id", opportunityId)
        .maybeSingle();
      if (data) query = data.title;
    }

    const diagnostics: Record<string, any> = {
      query,
      timestamp: new Date().toISOString(),
      env: {
        hasOpenAIKey: !!Deno.env.get("OPENAI_API_KEY"),
        hasRedditClientId: !!Deno.env.get("REDDIT_CLIENT_ID"),
        hasRedditClientSecret: !!Deno.env.get("REDDIT_CLIENT_SECRET"),
      },
    };

    // Test 1: PullPush (always works, no credentials needed)
    const pullPushStart = Date.now();
    try {
      const url = new URL("https://api.pullpush.io/reddit/search/submission/");
      url.searchParams.set("q", query);
      url.searchParams.set("size", "5");
      url.searchParams.set("score", ">1");

      const res = await fetch(url.toString(), { headers: { "User-Agent": "FounderLens/1.0" } });
      const data = await res.json();
      const posts = data?.data ?? [];

      diagnostics.pullpush = {
        status: res.status,
        ok: res.ok,
        postsFound: posts.length,
        latencyMs: Date.now() - pullPushStart,
        sampleTitles: posts.slice(0, 3).map((p: any) => `[r/${p.subreddit}] ${p.title?.slice(0, 60)}`),
      };
    } catch (e) {
      diagnostics.pullpush = { error: String(e), latencyMs: Date.now() - pullPushStart };
    }

    // Test 2: Reddit OAuth (only if credentials are set)
    if (Deno.env.get("REDDIT_CLIENT_ID") && Deno.env.get("REDDIT_CLIENT_SECRET")) {
      const oauthStart = Date.now();
      try {
        const clientId = Deno.env.get("REDDIT_CLIENT_ID")!;
        const clientSecret = Deno.env.get("REDDIT_CLIENT_SECRET")!;
        const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "FounderLens/1.0",
          },
          body: "grant_type=client_credentials",
        });
        const tokenData = await tokenRes.json();
        diagnostics.redditOAuth = {
          tokenStatus: tokenRes.status,
          tokenOk: tokenRes.ok,
          hasToken: !!tokenData.access_token,
          latencyMs: Date.now() - oauthStart,
        };
      } catch (e) {
        diagnostics.redditOAuth = { error: String(e), latencyMs: Date.now() - oauthStart };
      }
    } else {
      diagnostics.redditOAuth = { skipped: true, reason: "REDDIT_CLIENT_ID/SECRET not set — PullPush will be used" };
    }

    // Test 3: OpenAI (if key is set)
    if (Deno.env.get("OPENAI_API_KEY")) {
      const aiStart = Date.now();
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Reply with just: {\"ok\": true}" }],
            max_tokens: 20,
            response_format: { type: "json_object" },
          }),
        });
        diagnostics.openai = {
          status: res.status,
          ok: res.ok,
          latencyMs: Date.now() - aiStart,
        };
      } catch (e) {
        diagnostics.openai = { error: String(e), latencyMs: Date.now() - aiStart };
      }
    } else {
      diagnostics.openai = { skipped: true, reason: "OPENAI_API_KEY not set" };
    }

    const allGood = diagnostics.pullpush?.ok && !diagnostics.pullpush?.error;
    return new Response(JSON.stringify({
      success: allGood,
      message: allGood
        ? `✅ Reddit search working — ${diagnostics.pullpush?.postsFound ?? 0} posts found via PullPush`
        : "⚠️ Reddit search may have issues — check diagnostics",
      diagnostics,
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
