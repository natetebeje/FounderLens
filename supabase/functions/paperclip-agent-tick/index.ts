/**
 * FounderLens × Paperclip — Agent Tick Scheduler
 *
 * Wakes Paperclip agents so they actually make progress on the backlog.
 * Paperclip's internal heartbeat defaults to 3600s (1 hour) and is not
 * tunable per agent via the creation API, so FounderLens becomes the
 * scheduler: this function is called by pg_cron every 5 minutes (mode=all),
 * by launch-to-paperclip immediately after launch (mode=one), and by the
 * manual "Run agents now" button in AICompaniesTab (mode=one).
 *
 * For each active company it lists the agents via Paperclip's API, then
 * POSTs a synthetic heartbeat to each agent's corresponding Supabase edge
 * function. One failing agent does not block the rest (Promise.allSettled).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Maps Paperclip agent (role, name) → Supabase edge function name.
// Growth shares the `engineer` role in Paperclip but has a distinct function;
// Brand uses `general` role with the name "Brand".
function functionForAgent(agent: { role?: string; name?: string }): string | null {
  const role = (agent.role || '').toLowerCase();
  const name = (agent.name || '').toLowerCase();
  if (role === 'ceo') return 'paperclip-agent-ceo';
  if (role === 'cto') return 'paperclip-agent-cto';
  if (role === 'cmo') return 'paperclip-agent-cmo';
  // Use startsWith so re-launches that create "Growth 2" / "Engineer 2" / "Brand 2"
  // still route to the right function.
  if (role === 'engineer' && name.startsWith('growth')) return 'paperclip-agent-growth';
  if (role === 'engineer') return 'paperclip-agent-engineer';
  if (role === 'general' && name.startsWith('brand')) return 'paperclip-agent-branding';
  return null;
}

interface TickResult {
  role: string;
  name: string;
  status: 'ok' | 'skipped' | 'error';
  error?: string;
}

async function listCompanyAgents(companyId: string): Promise<any[]> {
  const url = `${Deno.env.get('PAPERCLIP_API_URL')}/api/companies/${companyId}/agents`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${Deno.env.get('PAPERCLIP_BOARD_API_KEY')}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paperclip GET /companies/${companyId}/agents → ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  return Array.isArray(json) ? json : (json.agents || json.data || []);
}

async function tickCompany(
  companyId: string,
  opportunityId: string | undefined,
  wakeReason: string
): Promise<{ companyId: string; agents: TickResult[]; error?: string }> {
  let agents: any[];
  try {
    agents = await listCompanyAgents(companyId);
  } catch (err: any) {
    return { companyId, agents: [], error: err.message || String(err) };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  const results = await Promise.allSettled(
    agents.map(async (agent: any): Promise<TickResult> => {
      const fn = functionForAgent(agent);
      if (!fn) {
        return { role: agent.role || '?', name: agent.name || '?', status: 'skipped', error: 'no function mapping' };
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'x-founderlens-opportunity-id': opportunityId || '',
        },
        body: JSON.stringify({
          runId: crypto.randomUUID(),
          agentId: agent.id,
          companyId,
          context: { wakeReason },
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        return {
          role: agent.role || '?',
          name: agent.name || '?',
          status: 'error',
          error: `${res.status}: ${body.slice(0, 200)}`,
        };
      }
      return { role: agent.role || '?', name: agent.name || '?', status: 'ok' };
    })
  );

  const flat: TickResult[] = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { role: agents[i]?.role || '?', name: agents[i]?.name || '?', status: 'error', error: String(r.reason) }
  );

  return { companyId, agents: flat };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { mode, companyId, opportunityId, wakeReason } = body as {
      mode?: 'all' | 'one';
      companyId?: string;
      opportunityId?: string;
      wakeReason?: string;
    };
    const reason = wakeReason || 'founderlens-tick';

    if (mode === 'one') {
      if (!companyId) {
        return new Response(JSON.stringify({ error: 'companyId required for mode=one' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const result = await tickCompany(companyId, opportunityId, reason);
      return new Response(JSON.stringify({ success: true, mode: 'one', ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // mode === 'all' (default) — iterate every active Paperclip company.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: workflows, error } = await supabase
      .from('validation_workflows')
      .select('opportunity_id, paperclip_company_id')
      .not('paperclip_company_id', 'is', null);

    if (error) throw new Error(`Failed to load active companies: ${error.message}`);

    const rows = workflows || [];
    console.log(`paperclip-agent-tick mode=all → ${rows.length} active companies`);

    const companies = await Promise.all(
      rows.map(r => tickCompany(r.paperclip_company_id, r.opportunity_id, reason))
    );

    return new Response(JSON.stringify({ success: true, mode: 'all', count: rows.length, companies }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('paperclip-agent-tick error:', err?.message, err?.stack);
    return new Response(JSON.stringify({ error: err?.message || 'Tick failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
