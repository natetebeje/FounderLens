import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Rocket, ExternalLink, RefreshCw, Users, Target,
  CheckCircle2, Clock, AlertCircle, Zap, TrendingUp, Bot,
  ChevronRight, Plus, Loader2, BarChart3, Package, Palette, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAICompanies, AICompany, PaperclipAgent } from '@/hooks/useAICompanies';
import { ModernNavigation } from '@/components/ModernNavigation';
import { ModernBackground } from '@/components/ui/modern-background';

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

function stageLabel(stage: AICompany['stage']): { label: string; color: string; bg: string } {
  switch (stage) {
    case 'launched': return { label: 'Launched', color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
    case 'growing':  return { label: 'Growing',  color: 'text-blue-400',  bg: 'bg-blue-500/15 border-blue-500/30' };
    default:         return { label: 'Building', color: 'text-indigo-400', bg: 'bg-indigo-500/15 border-indigo-500/30' };
  }
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-green-400';
  if (score >= 45) return 'text-yellow-400';
  return 'text-red-400';
}

function agentRoleColor(role: string) {
  switch (role) {
    case 'ceo': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    case 'cto': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'cmo': return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
    case 'engineer': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    default:    return 'bg-green-500/20 text-green-300 border-green-500/30';
  }
}

function agentDisplayName(agent: PaperclipAgent): string {
  return agent.name || agent.role.toUpperCase();
}

// ─── Company Card ─────────────────────────────────────────────────────────────

function CompanyCard({ company, navigate }: { company: AICompany; navigate: ReturnType<typeof useNavigate> }) {
  const stage = stageLabel(company.stage);
  const totalIssues = company.openIssues.length + company.doneIssues.length;
  const spendPct = company.budgetCents > 0
    ? Math.min(100, Math.round((company.monthlySpendCents / company.budgetCents) * 100))
    : 0;
  const activeGoal = company.goals.find(g => g.status === 'active') || company.goals[0];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm overflow-hidden hover:border-white/20 transition-all group">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${stage.bg} ${stage.color}`}>
                {stage.label === 'Building' && <Rocket className="w-3 h-3" />}
                {stage.label === 'Growing' && <TrendingUp className="w-3 h-3" />}
                {stage.label === 'Launched' && <CheckCircle2 className="w-3 h-3" />}
                {stage.label}
              </span>
              <span className={`text-xs font-bold ${scoreColor(company.opportunityScore)}`}>
                {company.opportunityScore}/100
              </span>
              {company.loading && (
                <Loader2 className="w-3 h-3 text-white/30 animate-spin" />
              )}
            </div>
            <h3 className="text-lg font-bold text-white leading-tight truncate">
              {company.productName}
            </h3>
            <p className="text-xs text-white/40 mt-0.5 truncate">{company.targetMarket}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="text-white/40 hover:text-white h-8 px-2 gap-1"
              onClick={() => navigate(`/validation/${company.opportunityId}`)}
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="text-xs">Validate</span>
            </Button>
            <a
              href={company.paperclipCompanyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-xs font-medium hover:bg-indigo-500/25 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Dashboard
            </a>
          </div>
        </div>

        {/* Goal */}
        {activeGoal && (
          <div className="mt-3 flex items-start gap-2">
            <Target className="w-3.5 h-3.5 text-white/30 mt-0.5 shrink-0" />
            <p className="text-xs text-white/50 line-clamp-1">{activeGoal.title}</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {totalIssues > 0 && (
        <div className="px-6 py-3 border-b border-white/8">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-white/40">MVP Progress</span>
            <span className="text-xs font-medium text-white/70">
              {company.doneIssues.length}/{totalIssues} tasks done
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
              style={{ width: `${company.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Agent grid */}
      <div className="px-6 py-4 border-b border-white/8">
        <div className="flex items-center gap-1.5 mb-3">
          <Users className="w-3.5 h-3.5 text-white/30" />
          <span className="text-xs text-white/40">{company.agents.length} agents</span>
        </div>
        {company.loading ? (
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-7 w-16 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {company.agents.map(agent => (
              <div
                key={agent.id}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium ${agentRoleColor(agent.role)}`}
                title={`${agentDisplayName(agent)} — ${agent.status}`}
              >
                <Bot className="w-2.5 h-2.5" />
                {agentDisplayName(agent)}
              </div>
            ))}
            {company.agents.length === 0 && (
              <span className="text-xs text-white/25">No agents loaded</span>
            )}
          </div>
        )}
      </div>

      {/* Open issues + CEO summary */}
      <div className="px-6 py-4 border-b border-white/8">
        <div className="grid grid-cols-2 gap-4">

          {/* Open issues */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-white/30" />
              <span className="text-xs text-white/40">Open tasks</span>
            </div>
            {company.loading ? (
              <div className="space-y-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 rounded bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : company.openIssues.length > 0 ? (
              <ul className="space-y-1">
                {company.openIssues.slice(0, 3).map(issue => (
                  <li key={issue.id} className="flex items-start gap-1.5">
                    <span className={`mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full ${
                      issue.priority === 'critical' ? 'bg-red-400' :
                      issue.priority === 'high' ? 'bg-orange-400' :
                      'bg-white/20'
                    }`} />
                    <span className="text-xs text-white/60 line-clamp-1">{issue.title}</span>
                  </li>
                ))}
                {company.openIssues.length > 3 && (
                  <li className="text-xs text-white/30 pl-3">
                    +{company.openIssues.length - 3} more
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-xs text-white/25">No open tasks</p>
            )}
          </div>

          {/* CEO Summary */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Bot className="w-3.5 h-3.5 text-yellow-400/60" />
              <span className="text-xs text-white/40">CEO update</span>
            </div>
            {company.loading ? (
              <div className="space-y-1">
                <div className="h-4 rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
              </div>
            ) : company.ceoLastSummary ? (
              <p className="text-xs text-white/60 leading-relaxed line-clamp-4">
                {company.ceoLastSummary}
              </p>
            ) : (
              <p className="text-xs text-white/25 italic">
                Trigger a CEO heartbeat to see the first update
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Branding panel — shows after Brand agent first heartbeat */}
      {company.brandPackage && (
        <BrandingPanel brand={company.brandPackage} />
      )}

      {/* Footer — skills + budget + time */}
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Skills */}
          {company.installedSkills.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Package className="w-3 h-3 text-white/25" />
              <span className="text-xs text-white/40">
                {company.installedSkills.length} skill{company.installedSkills.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Budget */}
          {company.budgetCents > 0 && (
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3 h-3 text-white/25" />
              <span className="text-xs text-white/40">
                ${(company.monthlySpendCents / 100).toFixed(2)} / ${(company.budgetCents / 100).toFixed(0)}/mo
              </span>
              {spendPct >= 80 && (
                <AlertCircle className="w-3 h-3 text-orange-400" />
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-white/25">
          <Clock className="w-3 h-3" />
          {timeAgo(company.lastActivityAt)}
        </div>
      </div>
    </div>
  );
}

// ─── Branding Panel ───────────────────────────────────────────────────────────

function BrandingPanel({ brand }: { brand: NonNullable<AICompany['brandPackage']> }) {
  const [expanded, setExpanded] = useState(false);
  const topName = brand.names?.[0];
  const topDomains = brand.domainResults?.[0]?.domains || [];
  const availableDomain = topDomains.find(d => d.status === 'available');

  return (
    <div className="border-t border-white/8 px-6 py-4">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-medium text-white/70">Brand Identity</span>
          {topName && (
            <span className="text-xs text-purple-300 font-semibold">· {topName.name}</span>
          )}
          {availableDomain && (
            <span className="text-xs text-green-400">· {availableDomain.domain} ✓</span>
          )}
        </div>
        <ChevronRight className={`w-3.5 h-3.5 text-white/30 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">

          {/* Name options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(brand.names || []).map((n, i) => {
              const domains = brand.domainResults?.[i]?.domains || [];
              const available = domains.find(d => d.status === 'available');
              return (
                <div key={n.name} className={`rounded-xl p-3 border ${
                  i === 0
                    ? 'border-purple-500/30 bg-purple-500/8'
                    : 'border-white/8 bg-white/3'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {i === 0 && <span className="text-[10px] text-purple-400 font-medium">TOP PICK</span>}
                    <span className="text-sm font-bold text-white">{n.name}</span>
                  </div>
                  <p className="text-xs text-white/50 italic mb-2">"{n.tagline}"</p>
                  <div className="flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5 text-white/20" />
                    {available ? (
                      <a
                        href={`https://www.namecheap.com/domains/registration/results/?domain=${available.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-green-400 hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        {available.domain} available →
                      </a>
                    ) : (
                      <span className="text-[10px] text-white/30">
                        {domains.find(d => d.status === 'taken')?.domain || 'checking...'} taken
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
              <span className="text-xs text-white/40">Palette</span>
              {[brand.colorPalette.primary, brand.colorPalette.secondary, brand.colorPalette.accent].map((c, i) => (
                <div key={i} className="flex items-center gap-1.5" title={c.name}>
                  <div
                    className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-xs text-white/40 font-mono">{c.hex}</span>
                </div>
              ))}
            </div>
          )}

          {/* Brand voice */}
          {brand.brandVoice?.tone && (
            <div>
              <span className="text-xs text-white/40">Voice: </span>
              <span className="text-xs text-white/60">{brand.brandVoice.tone}</span>
            </div>
          )}

          {/* Social handles */}
          {brand.socialHandleSuggestions?.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-white/40">Handles:</span>
              {brand.socialHandleSuggestions.slice(0, 4).map(h => (
                <span key={h} className="text-xs font-mono text-purple-300/70 bg-purple-500/10 px-2 py-0.5 rounded">
                  {h}
                </span>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
        <Building2 className="w-10 h-10 text-indigo-400/60" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">No AI companies yet</h2>
      <p className="text-white/50 max-w-md mb-8 leading-relaxed">
        Validate an opportunity, chat with the Idea Coach to generate a Product Proposal,
        then click <strong className="text-white/70">Build This</strong> to launch your first AI company.
      </p>
      <Button
        onClick={() => navigate('/opportunities')}
        className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
      >
        <Plus className="w-4 h-4" />
        Go to My Opportunities
      </Button>
      <p className="text-xs text-white/25 mt-4">
        Your AI company gets a CEO, CTO, Engineer, CMO, and Growth agent — all working autonomously.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Companies() {
  const navigate = useNavigate();
  const { companies, loading, error, refresh } = useAICompanies();

  return (
    <ModernBackground variant="mesh">
      <ModernNavigation />

      <div className="min-h-screen pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">

          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h1 className="text-2xl font-bold text-white">My AI Companies</h1>
              </div>
              <p className="text-sm text-white/50">
                {companies.length === 0 && !loading
                  ? 'No companies launched yet'
                  : `${companies.length} compan${companies.length !== 1 ? 'ies' : 'y'} running on `}
                {companies.length > 0 && (
                  <a
                    href="https://build.founderlens.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline"
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
                className="text-white/50 hover:text-white gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/opportunities')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Opportunity
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          {companies.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                {
                  label: 'Companies',
                  value: companies.length,
                  icon: <Building2 className="w-4 h-4 text-indigo-400" />,
                },
                {
                  label: 'Agents Working',
                  value: companies.reduce((s, c) => s + c.agents.length, 0),
                  icon: <Bot className="w-4 h-4 text-yellow-400" />,
                },
                {
                  label: 'Tasks Open',
                  value: companies.reduce((s, c) => s + c.openIssues.length, 0),
                  icon: <Target className="w-4 h-4 text-cyan-400" />,
                },
                {
                  label: 'Tasks Done',
                  value: companies.reduce((s, c) => s + c.doneIssues.length, 0),
                  icon: <CheckCircle2 className="w-4 h-4 text-green-400" />,
                },
              ].map(stat => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {stat.icon}
                    <span className="text-xs text-white/40">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Content */}
          {loading && companies.length === 0 ? (
            <div className="flex items-center justify-center py-24 gap-3 text-white/40">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading your AI companies...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-300">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                className="mt-3 text-red-300 hover:text-red-200"
              >
                Try again
              </Button>
            </div>
          ) : companies.length === 0 ? (
            <EmptyState navigate={navigate} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {companies.map(company => (
                <CompanyCard
                  key={company.paperclipCompanyId}
                  company={company}
                  navigate={navigate}
                />
              ))}
            </div>
          )}

          {/* Paperclip credit */}
          {companies.length > 0 && (
            <div className="mt-12 text-center">
              <p className="text-xs text-white/20">
                AI companies run on{' '}
                <a
                  href="https://build.founderlens.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white/60 transition-colors"
                >
                  build.founderlens.io
                </a>
                {' '}· Powered by{' '}
                <a
                  href="https://github.com/paperclipai/paperclip"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white/60 transition-colors"
                >
                  Paperclip
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </ModernBackground>
  );
}
