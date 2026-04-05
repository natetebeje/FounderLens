/**
 * useAICompanies
 *
 * Loads all AI companies launched by the current user from:
 * 1. Supabase — validation_workflows (paperclip_company_id, product_proposal, research)
 * 2. Paperclip API — live company state (agents, goals, open issues)
 *
 * Merges both into a single enriched company object for the dashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaperclipAgent {
  id: string;
  name: string;
  role: string;
  status: string;
  budgetMonthlyCents: number;
  spentMonthlyCents: number;
}

export interface PaperclipGoal {
  id: string;
  title: string;
  status: string;
  level: string;
}

export interface PaperclipIssue {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeAgentId?: string;
}

export interface AICompany {
  // From Supabase
  opportunityId: string;
  opportunityTitle: string;
  targetMarket: string;
  paperclipCompanyId: string;
  paperclipCompanyUrl: string;
  launchedAt: string;
  opportunityScore: number;
  verdict: string;
  productName: string;
  // From Paperclip (live)
  agents: PaperclipAgent[];
  goals: PaperclipGoal[];
  openIssues: PaperclipIssue[];
  doneIssues: PaperclipIssue[];
  installedSkills: string[];
  // Derived
  stage: 'building' | 'launched' | 'growing';
  progressPercent: number;
  monthlySpendCents: number;
  budgetCents: number;
  ceoLastSummary: string;
  lastActivityAt: string;
  loading: boolean;
  error: string | null;
}

// ─── Paperclip API fetcher ────────────────────────────────────────────────────

const PAPERCLIP_URL = 'https://build.founderlens.io';
const BOARD_KEY = 'fl_board_850f2f7eec5551692b8a736bf3a74aeabaf4e3c8373684560f3130d5fa8fd2a6';

async function pcGet(path: string): Promise<any> {
  const res = await fetch(`${PAPERCLIP_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${BOARD_KEY}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Paperclip ${path} → ${res.status}`);
  return res.json();
}

// ─── Derive stage from issue progress ────────────────────────────────────────

function deriveStage(doneCount: number, totalCount: number): AICompany['stage'] {
  if (totalCount === 0) return 'building';
  const pct = doneCount / totalCount;
  if (pct >= 0.8) return 'launched';
  if (pct >= 0.4) return 'growing';
  return 'building';
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useAICompanies() {
  const [companies, setCompanies] = useState<AICompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1 — Load all launched companies from Supabase
      const { data: rows, error: dbErr } = await supabase
        .from('validation_workflows')
        .select(`
          opportunity_id,
          paperclip_company_id,
          paperclip_company_url,
          paperclip_launched_at,
          product_proposal,
          reddit_validation_results,
          business_opportunities!inner (
            title,
            target_market
          )
        `)
        .not('paperclip_company_id', 'is', null)
        .order('paperclip_launched_at', { ascending: false });

      if (dbErr) throw dbErr;
      if (!rows || rows.length === 0) {
        setCompanies([]);
        setLoading(false);
        return;
      }

      // 2 — Initialise with Supabase data immediately (fast render)
      const initial: AICompany[] = rows.map((row: any) => {
        const opp = row.business_opportunities;
        const proposal = row.product_proposal || {};
        const research = row.reddit_validation_results || {};
        return {
          opportunityId: row.opportunity_id,
          opportunityTitle: opp?.title || 'Untitled',
          targetMarket: opp?.target_market || '',
          paperclipCompanyId: row.paperclip_company_id,
          paperclipCompanyUrl: row.paperclip_company_url || `${PAPERCLIP_URL}/dashboard`,
          launchedAt: row.paperclip_launched_at,
          opportunityScore: parseInt(research.opportunityScore) || 0,
          verdict: research.verdict || 'moderate',
          productName: proposal.productName || opp?.title || 'Untitled',
          agents: [],
          goals: [],
          openIssues: [],
          doneIssues: [],
          installedSkills: proposal.installedSkills || [],
          stage: 'building',
          progressPercent: 0,
          monthlySpendCents: 0,
          budgetCents: 2000,
          ceoLastSummary: '',
          lastActivityAt: row.paperclip_launched_at,
          loading: true,
          error: null,
        };
      });

      setCompanies(initial);

      // 3 — Enrich each company with live Paperclip data in parallel
      await Promise.all(
        initial.map(async (company, idx) => {
          try {
            const [agents, goals, allIssues] = await Promise.all([
              pcGet(`/companies/${company.paperclipCompanyId}/agents`).catch(() => []),
              pcGet(`/companies/${company.paperclipCompanyId}/goals`).catch(() => []),
              pcGet(`/companies/${company.paperclipCompanyId}/issues`).catch(() => []),
            ]);

            const openIssues = allIssues.filter((i: any) =>
              ['todo', 'in_progress', 'blocked'].includes(i.status)
            );
            const doneIssues = allIssues.filter((i: any) => i.status === 'done');
            const totalIssues = allIssues.length;

            const monthlySpend = agents.reduce(
              (sum: number, a: any) => sum + (a.spentMonthlyCents || 0), 0
            );
            const budgetTotal = agents.reduce(
              (sum: number, a: any) => sum + (a.budgetMonthlyCents || 0), 0
            );

            const stage = deriveStage(doneIssues.length, totalIssues);
            const progressPercent = totalIssues > 0
              ? Math.round((doneIssues.length / totalIssues) * 100)
              : 0;

            // Grab latest CEO comment as the heartbeat summary
            const ceoAgent = agents.find((a: any) =>
              a.role === 'ceo' || a.name === 'CEO'
            );
            let ceoLastSummary = '';
            if (ceoAgent && openIssues.length > 0) {
              // Try to get latest comment from first issue assigned to CEO
              const ceoIssue = openIssues.find(
                (i: any) => i.assigneeAgentId === ceoAgent.id
              ) || openIssues[0];
              if (ceoIssue) {
                const comments = await pcGet(`/issues/${ceoIssue.id}/comments`)
                  .catch(() => []);
                if (comments.length > 0) {
                  const latest = comments[comments.length - 1];
                  ceoLastSummary = (latest.body || '').slice(0, 180);
                }
              }
            }

            // Latest activity = most recent issue updated_at
            const lastActivityAt = allIssues.length > 0
              ? allIssues.sort((a: any, b: any) =>
                  new Date(b.updatedAt || b.createdAt || 0).getTime() -
                  new Date(a.updatedAt || a.createdAt || 0).getTime()
                )[0]?.updatedAt || company.launchedAt
              : company.launchedAt;

            setCompanies(prev => prev.map((c, i) =>
              i === idx ? {
                ...c,
                agents,
                goals,
                openIssues,
                doneIssues,
                stage,
                progressPercent,
                monthlySpendCents: monthlySpend,
                budgetCents: budgetTotal || 2000,
                ceoLastSummary,
                lastActivityAt,
                loading: false,
                error: null,
              } : c
            ));
          } catch (err: any) {
            setCompanies(prev => prev.map((c, i) =>
              i === idx ? { ...c, loading: false, error: err.message } : c
            ));
          }
        })
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { companies, loading, error, refresh: load };
}
