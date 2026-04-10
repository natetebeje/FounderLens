import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Attempts to delete a Paperclip company and always clears the FounderLens linkage.
// If Paperclip's DELETE endpoint isn't supported (405/501/404), the FounderLens row
// is still reset so the card disappears from the Build page — the client surfaces
// a note telling the user they may need to clean up in Paperclip manually.
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { opportunityId } = await req.json();
    if (!opportunityId) {
      return new Response(JSON.stringify({ error: 'opportunityId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    );
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Load the workflow row so we know the Paperclip company ID ────────────
    const { data: workflow } = await serviceSupabase
      .from('validation_workflows')
      .select('paperclip_company_id')
      .eq('opportunity_id', opportunityId)
      .maybeSingle();

    const companyId = workflow?.paperclip_company_id;
    if (!companyId) {
      return new Response(JSON.stringify({
        success: true,
        deletedFromPaperclip: false,
        note: 'No Paperclip company was linked to this opportunity.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Try Paperclip DELETE ─────────────────────────────────────────────────
    let deletedFromPaperclip = false;
    let note = '';
    try {
      const url = `${Deno.env.get('PAPERCLIP_API_URL')}/api/companies/${companyId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('PAPERCLIP_BOARD_API_KEY')}`,
        },
      });

      if (res.ok) {
        deletedFromPaperclip = true;
      } else if (res.status === 404) {
        // Company already gone from Paperclip — treat as a successful delete.
        deletedFromPaperclip = true;
        note = 'Company was already absent from Paperclip.';
      } else if (res.status === 405 || res.status === 501) {
        // Paperclip does not support DELETE on /api/companies/:id.
        note = 'Paperclip does not support server-side company deletion. You may need to delete this company from the Paperclip dashboard manually.';
      } else {
        const body = await res.text();
        note = `Paperclip returned ${res.status}. The FounderLens linkage has been reset, but the company may still exist in the Paperclip dashboard. Details: ${body.slice(0, 300)}`;
      }
    } catch (err: any) {
      note = `Paperclip delete request failed: ${err.message || 'unknown error'}. The FounderLens linkage has been reset, but the company may still exist in the Paperclip dashboard.`;
    }

    // ── Always clear the FounderLens linkage ─────────────────────────────────
    const { error: updateError } = await serviceSupabase
      .from('validation_workflows')
      .update({
        paperclip_company_id: null,
        paperclip_company_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('opportunity_id', opportunityId);

    if (updateError) {
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to clear FounderLens linkage: ${updateError.message}`,
        deletedFromPaperclip,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      deletedFromPaperclip,
      note,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('delete-paperclip-company error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Delete failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
