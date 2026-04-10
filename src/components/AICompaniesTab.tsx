/**
 * AICompaniesTab
 *
 * Embeddable version of the AI Companies view — used inside BuildLab's
 * "My Companies" tab. No page wrapper, no nav. Theme-aware throughout.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Rocket, ExternalLink, RefreshCw, Users, Target,
  CheckCircle2, Clock, AlertCircle, Zap, TrendingUp, Bot,
  ChevronRight, Plus, Loader2, BarChart3, Package, Palette, Globe, Trash2, Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAICompanies, AICompany, PaperclipAgent } from '@/hooks/useAICompanies';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function stageVariant(stage: AICompany['stage']): 'default' | 'secondary' | 'outline' {
  switch (stage) {
    case 'launched': return 'default';
    case 'growing':  return 'secondary';
    default:         return 'outline';
  }
}

function stageLabel(stage: AICompany['stage']): string {
  switch (stage) {
    case 'launched': return 'Launched';
    case 'growing':  return 'Growing';
    default:         return 'Building';
  }
}

function agentRoleColor(role: string): string {
  switch (role) {
    case 'ceo':      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'cto':      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'cmo':      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300';
    case 'engineer': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300';
    default:         return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  }
}

function agentDisplayName(agent: PaperclipAgent): string {
  return agent.name || agent.role.toUpperCase();
}

// ─── Branding panel ───────────────────────────────────────────────────────────

function BrandingPanel({ brand }: { brand: NonNullable<AICompany['brandPackage']> }) {
  const [expanded, setExpanded] = useState(false);
  const topName = brand.names?.[0];
  const topDomains = brand.domainResults?.[0]?.domains || [];
  const availableDomain = topDomains.find(d => d.status === 'available');

  return (
    <div className="border-t border-border px-4 py-3">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between group text-left"
      >
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
          <span className="text-xs font-medium text-foreground">Brand Identity</span>
          {topName && (
            <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
              · {topName.name}
            </span>
          )}
          {availableDomain && (
            <span className="text-xs text-green-600 dark:text-green-400">
              · {availableDomain.domain} ✓
            </span>
          )}
        </div>
        <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Name options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(brand.names || []).map((n, i) => {
              const domains = brand.domainResults?.[i]?.domains || [];
              const available = domains.find(d => d.status === 'available');
              return (
                <div key={n.name} className={`rounded-lg p-3 border ${
                  i === 0
                    ? 'border-purple-200 bg-purple-50 dark:border-purple-700/50 dark:bg-purple-900/20'
                    : 'border-border bg-muted/40'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {i === 0 && (
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wide">
                        Top pick
                      </span>
                    )}
                    <span className="text-sm font-bold text-foreground">{n.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic mb-2">"{n.tagline}"</p>
                  <div className="flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5 text-muted-foreground" />
                    {available ? (
                      <a
                        href={`https://www.namecheap.com/domains/registration/results/?domain=${available.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-green-600 dark:text-green-400 hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        {available.domain} available →
                      </a>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        {domains.find(d => d.status === 'taken')?.domain || '—'} taken
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Color palette */}
          {brand.colorPalette && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Palette</span>
              {[brand.colorPalette.primary, brand.colorPalette.secondary, brand.colorPalette.accent].map((c, i) => (
                <div key={i} className="flex items-center gap-1.5" title={c.name}>
                  <div
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-xs text-muted-foreground font-mono">{c.hex}</span>
                </div>
              ))}
            </div>
          )}

          {/* Voice + handles */}
          {brand.brandVoice?.tone && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Voice:</span> {brand.brandVoice.tone}
            </p>
          )}
          {brand.socialHandleSuggestions?.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Handles:</span>
              {brand.socialHandleSuggestions.slice(0, 4).map(h => (
                <code key={h} className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">
                  {h}
                </code>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Company card ─────────────────────────────────────────────────────────────

function CompanyCard({
  company,
  navigate,
  onDelete,
  onRunAgents,
}: {
  company: AICompany;
  navigate: ReturnType<typeof useNavigate>;
  onDelete: (company: AICompany) => void;
  onRunAgents: (company: AICompany) => Promise<void>;
}) {
  const totalIssues = company.openIssues.length + company.doneIssues.length;
  const spendPct = company.budgetCents > 0
    ? Math.min(100, Math.round((company.monthlySpendCents / company.budgetCents) * 100))
    : 0;
  const activeGoal = company.goals.find(g => g.status === 'active') || company.goals[0];
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const handleDeleteConfirmed = async () => {
    setDeleting(true);
    try {
      await onDelete(company);
      setDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleRunAgents = async () => {
    setRunning(true);
    try {
      await onRunAgents(company);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <CardContent className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant={stageVariant(company.stage)} className="text-xs">
                {stageLabel(company.stage) === 'Building' && <Rocket className="w-3 h-3 mr-1" />}
                {stageLabel(company.stage) === 'Growing' && <TrendingUp className="w-3 h-3 mr-1" />}
                {stageLabel(company.stage) === 'Launched' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {stageLabel(company.stage)}
              </Badge>
              <span className={`text-xs font-bold ${
                company.opportunityScore >= 70 ? 'text-green-600 dark:text-green-400' :
                company.opportunityScore >= 45 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {company.opportunityScore}/100
              </span>
              {company.loading && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />}
            </div>
            <h3 className="font-semibold text-foreground leading-tight truncate">{company.productName}</h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{company.targetMarket}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => navigate(`/validation/${company.opportunityId}`)}
            >
              <Zap className="w-3 h-3 mr-1" />
              Validate
            </Button>
            {company.paperclipCompanyUrl && (
              <a
                href={company.paperclipCompanyUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1">
                  <ExternalLink className="w-3 h-3" />
                  Dashboard
                </Button>
              </a>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
              title="Run agents now"
              disabled={running}
              onClick={handleRunAgents}
            >
              {running ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </Button>
            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                  title="Delete company"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {company.productName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will attempt to delete the company from Paperclip and will always
                    reset the FounderLens linkage so this card disappears from the Build page.
                    If Paperclip does not support server-side deletion, you may need to
                    remove the company from the Paperclip dashboard manually. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleting}
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteConfirmed();
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {deleting ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Deleting…</>
                    ) : (
                      'Delete'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Goal */}
        {activeGoal && (
          <div className="flex items-start gap-1.5 mt-2">
            <Target className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground line-clamp-1">{activeGoal.title}</p>
          </div>
        )}
      </CardContent>

      {/* Progress */}
      {totalIssues > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">MVP Progress</span>
            <span className="text-xs font-medium text-foreground">
              {company.doneIssues.length}/{totalIssues}
            </span>
          </div>
          <Progress value={company.progressPercent} className="h-1.5" />
        </div>
      )}

      {/* Agents */}
      <div className="px-4 pb-3 border-t border-border pt-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{company.agents.length} agents</span>
        </div>
        {company.loading ? (
          <div className="flex gap-1.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-6 w-14 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {company.agents.map(agent => (
              <span
                key={agent.id}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${agentRoleColor(agent.role)}`}
              >
                <Bot className="w-2.5 h-2.5" />
                {agentDisplayName(agent)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Issues + CEO summary */}
      <div className="px-4 pb-3 border-t border-border pt-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-foreground mb-1.5">Open tasks</p>
            {company.loading ? (
              <div className="space-y-1">
                {[...Array(2)].map((_, i) => <div key={i} className="h-3.5 rounded bg-muted animate-pulse" />)}
              </div>
            ) : company.openIssues.length > 0 ? (
              <ul className="space-y-1">
                {company.openIssues.slice(0, 3).map(issue => (
                  <li key={issue.id} className="flex items-start gap-1.5">
                    <span className={`mt-1 shrink-0 w-1.5 h-1.5 rounded-full ${
                      issue.priority === 'critical' ? 'bg-red-500' :
                      issue.priority === 'high' ? 'bg-orange-500' : 'bg-muted-foreground/40'
                    }`} />
                    <span className="text-xs text-muted-foreground line-clamp-1">{issue.title}</span>
                  </li>
                ))}
                {company.openIssues.length > 3 && (
                  <li className="text-xs text-muted-foreground pl-3">
                    +{company.openIssues.length - 3} more
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No open tasks</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-foreground mb-1.5">CEO update</p>
            {company.loading ? (
              <div className="space-y-1">
                <div className="h-3.5 rounded bg-muted animate-pulse" />
                <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
              </div>
            ) : company.ceoLastSummary ? (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                {company.ceoLastSummary}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Trigger a CEO heartbeat to see the first update
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Brand panel */}
      {company.brandPackage && <BrandingPanel brand={company.brandPackage} />}

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3">
          {company.installedSkills.length > 0 && (
            <div className="flex items-center gap-1">
              <Package className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {company.installedSkills.length} skills
              </span>
            </div>
          )}
          {company.budgetCents > 0 && (
            <div className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                ${(company.monthlySpendCents / 100).toFixed(2)} / ${(company.budgetCents / 100).toFixed(0)}/mo
              </span>
              {spendPct >= 80 && <AlertCircle className="w-3 h-3 text-orange-500" />}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {timeAgo(company.lastActivityAt)}
        </div>
      </div>
    </Card>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <Building2 className="w-8 h-8 text-primary/60" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">No AI companies yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        Validate an opportunity, then click <strong>Launch AI Company</strong> from the results page
        to create your first AI company. Optionally, chat with the Idea Coach first for a richer proposal.
      </p>
      <Button onClick={() => navigate('/opportunities')} variant="outline" size="sm" className="gap-2">
        <Plus className="w-3.5 h-3.5" />
        Go to My Opportunities
      </Button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AICompaniesTab() {
  const navigate = useNavigate();
  const { companies, loading, error, refresh } = useAICompanies();

  const totalAgents = companies.reduce((s, c) => s + c.agents.length, 0);
  const totalOpen   = companies.reduce((s, c) => s + c.openIssues.length, 0);
  const totalDone   = companies.reduce((s, c) => s + c.doneIssues.length, 0);

  const handleDeleteCompany = async (company: AICompany) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const supabaseUrl = 'https://phppdhsozkpsquxlfezg.supabase.co';
      const res = await fetch(`${supabaseUrl}/functions/v1/delete-paperclip-company`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ opportunityId: company.opportunityId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Delete failed');
      }

      if (data.deletedFromPaperclip) {
        toast.success(`${company.productName} deleted`, {
          description: data.note || 'Removed from Paperclip and FounderLens.',
        });
      } else {
        toast.warning(`${company.productName} removed from FounderLens`, {
          description: data.note || 'The card has been removed, but the Paperclip company may still exist — check the Paperclip dashboard.',
          duration: 8000,
        });
      }

      refresh();
    } catch (err: any) {
      toast.error('Delete failed', {
        description: err.message || 'Unknown error. The company was not removed.',
      });
      throw err;
    }
  };

  const handleRunAgents = async (company: AICompany) => {
    const toastId = toast.loading(`Waking ${company.productName} agents...`);
    try {
      const supabaseUrl = 'https://phppdhsozkpsquxlfezg.supabase.co';
      const res = await fetch(`${supabaseUrl}/functions/v1/paperclip-agent-tick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'one',
          companyId: company.paperclipCompanyId,
          opportunityId: company.opportunityId,
          wakeReason: 'manual-trigger',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Tick failed (${res.status})`);
      }

      const okCount = (data.agents || []).filter((a: any) => a.status === 'ok').length;
      const errCount = (data.agents || []).filter((a: any) => a.status === 'error').length;

      if (errCount === 0) {
        toast.success(`${okCount} agents running`, {
          id: toastId,
          description: 'Check the Paperclip dashboard in ~60 seconds for new activity.',
        });
      } else {
        toast.warning(`${okCount} running, ${errCount} failed`, {
          id: toastId,
          description: 'Some agents failed to wake. Check Supabase logs for details.',
          duration: 8000,
        });
      }

      // Give agents a moment to post their first actions, then refresh.
      setTimeout(() => refresh(), 3000);
    } catch (err: any) {
      toast.error('Failed to wake agents', {
        id: toastId,
        description: err.message || 'Unknown error.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">My AI Companies</h2>
          <p className="text-sm text-muted-foreground">
            {companies.length === 0 && !loading
              ? 'No companies launched yet'
              : `${companies.length} compan${companies.length !== 1 ? 'ies' : ''} running on `}
            {companies.length > 0 && (
              <a
                href="https://build.founderlens.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                build.founderlens.io
              </a>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/opportunities')}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Opportunity
          </Button>
        </div>
      </div>

      {/* Stats */}
      {companies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Companies', value: companies.length, icon: <Building2 className="w-4 h-4 text-primary" /> },
            { label: 'Agents Working', value: totalAgents, icon: <Bot className="w-4 h-4 text-yellow-600 dark:text-yellow-400" /> },
            { label: 'Tasks Open', value: totalOpen, icon: <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" /> },
            { label: 'Tasks Done', value: totalDone, icon: <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" /> },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  {stat.icon}
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Content */}
      {loading && companies.length === 0 ? (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading your AI companies...</span>
        </div>
      ) : error ? (
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" size="sm" onClick={refresh} className="mt-3">
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : companies.length === 0 ? (
        <EmptyState navigate={navigate} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {companies.map(company => (
            <CompanyCard
              key={company.paperclipCompanyId}
              company={company}
              navigate={navigate}
              onDelete={handleDeleteCompany}
              onRunAgents={handleRunAgents}
            />
          ))}
        </div>
      )}

      {companies.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Powered by{' '}
          <a href="https://github.com/paperclipai/paperclip" target="_blank" rel="noopener noreferrer"
            className="hover:text-foreground transition-colors">Paperclip
          </a>
          {' '}· running on{' '}
          <a href="https://build.founderlens.io" target="_blank" rel="noopener noreferrer"
            className="hover:text-foreground transition-colors">build.founderlens.io
          </a>
        </p>
      )}
    </div>
  );
}
