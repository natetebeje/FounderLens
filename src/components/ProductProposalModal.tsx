import { useState } from 'react';
import { X, Download, Copy, Check, Rocket, ChevronRight, Target, Users, Zap, DollarSign, TrendingUp, AlertTriangle, ArrowRight, BarChart3, Loader2, ExternalLink, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { SkillsPicker } from './SkillsPicker';

// ============================================================================
// TYPES
// ============================================================================

interface ProductProposal {
  productName?: string;
  oneLiner?: string;
  tagline?: string;
  problemStatement?: string;
  targetUser?: {
    persona?: string;
    jobsToBeDone?: string[];
    painPoints?: string[];
    currentAlternatives?: string[];
  };
  solution?: {
    coreFeatures?: string[];
    uniqueDifferentiator?: string;
    unfairAdvantage?: string;
  };
  marketOpportunity?: {
    targetMarketSize?: string;
    serviceableMarket?: string;
    competitorGaps?: string[];
  };
  mvpScope?: {
    mustHave?: string[];
    niceToHave?: string[];
    outOfScope?: string[];
  };
  monetization?: {
    model?: string;
    pricing?: string;
    rationale?: string;
  };
  goToMarket?: {
    primaryChannel?: string;
    channels?: string[];
    launchStrategy?: string;
    first30Days?: string;
  };
  risks?: string[];
  nextSteps?: string[];
  researchBacking?: {
    opportunityScore?: number;
    dataPoints?: number;
    verdict?: string;
    keyEvidence?: string[];
  };
}

interface ProductProposalModalProps {
  proposal: ProductProposal;
  opportunityTitle: string;
  opportunityId: string;
  onClose: () => void;
  existingCompanyId?: string;
  existingCompanyUrl?: string;
}

// ============================================================================
// MAIN MODAL
// ============================================================================

export function ProductProposalModal({
  proposal,
  opportunityTitle,
  opportunityId,
  onClose,
  existingCompanyId,
  existingCompanyUrl,
}: ProductProposalModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'build' | 'launch'>('overview');
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launchResult, setLaunchResult] = useState<{
    companyId: string;
    companyUrl: string;
    companyName: string;
    agentCount: number;
    issueCount: number;
  } | null>(existingCompanyId ? { companyId: existingCompanyId, companyUrl: existingCompanyUrl || 'https://build.founderlens.io', companyName: proposal.productName || opportunityTitle, agentCount: 5, issueCount: 0 } : null);

  const handleLaunch = async () => {
    if (launchResult) {
      window.open(launchResult.companyUrl, '_blank');
      return;
    }
    setLaunching(true);
    setLaunchError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ||
        'https://phppdhsozkpsquxlfezg.supabase.co';
      const res = await fetch(`${supabaseUrl}/functions/v1/launch-to-paperclip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ opportunityId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Launch failed');
      setLaunchResult({
        companyId: data.companyId,
        companyUrl: data.companyUrl,
        companyName: data.companyName,
        agentCount: data.agentCount,
        issueCount: data.issueCount,
      });
      // Auto-switch to launch tab
      setActiveTab('launch');
    } catch (err: any) {
      setLaunchError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLaunching(false);
    }
  };

  const handleCopyMarkdown = async () => {
    const md = generateMarkdown(proposal, opportunityTitle);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const score = proposal.researchBacking?.opportunityScore;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0d0d1a] border border-white/10 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium">
                Product Proposal
              </div>
              {score && (
                <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  score >= 70 ? 'bg-green-500/20 text-green-300' :
                  score >= 45 ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {score}/100 Opportunity Score
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-white truncate">
              {proposal.productName || opportunityTitle}
            </h2>
            {proposal.oneLiner && (
              <p className="text-sm text-white/60 mt-0.5 line-clamp-2">{proposal.oneLiner}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 shrink-0">
          {(['overview', 'build', 'launch'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-indigo-400 border-b-2 border-indigo-500'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {tab === 'overview' ? 'Overview' : tab === 'build' ? 'What to Build' : 'Go to Market'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {activeTab === 'overview' && (
            <>
              {/* Tagline */}
              {proposal.tagline && (
                <div className="text-center py-3">
                  <p className="text-lg font-medium text-white/80 italic">"{proposal.tagline}"</p>
                </div>
              )}

              {/* Problem */}
              {proposal.problemStatement && (
                <Section icon={<Target className="w-4 h-4" />} title="Problem Statement">
                  <p className="text-sm text-white/70 leading-relaxed">{proposal.problemStatement}</p>
                </Section>
              )}

              {/* Target User */}
              {proposal.targetUser && (
                <Section icon={<Users className="w-4 h-4" />} title="Target User">
                  {proposal.targetUser.persona && (
                    <p className="text-sm text-white/80 font-medium mb-2">{proposal.targetUser.persona}</p>
                  )}
                  {proposal.targetUser.painPoints && proposal.targetUser.painPoints.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wide mb-1.5">Key Pain Points</p>
                      <ul className="space-y-1">
                        {proposal.targetUser.painPoints.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                            <ChevronRight className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {proposal.targetUser.currentAlternatives && proposal.targetUser.currentAlternatives.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-white/40 uppercase tracking-wide mb-1.5">Currently Using</p>
                      <div className="flex flex-wrap gap-1.5">
                        {proposal.targetUser.currentAlternatives.map((a, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-white/5 text-white/60 text-xs">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {/* Market Opportunity */}
              {proposal.marketOpportunity && (
                <Section icon={<BarChart3 className="w-4 h-4" />} title="Market Opportunity">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {proposal.marketOpportunity.targetMarketSize && (
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-xs text-white/40 mb-1">Total Market (TAM)</p>
                        <p className="text-sm font-semibold text-white">{proposal.marketOpportunity.targetMarketSize}</p>
                      </div>
                    )}
                    {proposal.marketOpportunity.serviceableMarket && (
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-xs text-white/40 mb-1">Serviceable Market (SAM)</p>
                        <p className="text-sm font-semibold text-white">{proposal.marketOpportunity.serviceableMarket}</p>
                      </div>
                    )}
                  </div>
                  {proposal.marketOpportunity.competitorGaps && proposal.marketOpportunity.competitorGaps.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wide mb-1.5">Competitor Gaps to Exploit</p>
                      <ul className="space-y-1">
                        {proposal.marketOpportunity.competitorGaps.map((g, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-green-300/80">
                            <span className="text-green-400 mt-0.5">▲</span>
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Section>
              )}

              {/* Research Backing */}
              {proposal.researchBacking && (
                <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-4">
                  <p className="text-xs text-indigo-400 uppercase tracking-wide mb-2">Research Backing</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    {score && (
                      <div className="flex items-center gap-1.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          score >= 70 ? 'bg-green-500/20 text-green-300' :
                          score >= 45 ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>{score}</div>
                        <span className="text-xs text-white/60">Opportunity Score</span>
                      </div>
                    )}
                    {proposal.researchBacking.dataPoints && (
                      <div className="text-xs text-white/60">
                        <span className="font-semibold text-white">{proposal.researchBacking.dataPoints}</span> data points analyzed
                      </div>
                    )}
                    {proposal.researchBacking.verdict && (
                      <div className="text-xs text-white/60 capitalize">{proposal.researchBacking.verdict} signal</div>
                    )}
                  </div>
                  {proposal.researchBacking.keyEvidence && proposal.researchBacking.keyEvidence.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {proposal.researchBacking.keyEvidence.slice(0, 3).map((e, i) => (
                        <li key={i} className="text-xs text-white/50 flex items-start gap-1.5">
                          <span className="text-indigo-400 mt-0.5">·</span>{e}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'build' && (
            <>
              {/* Solution */}
              {proposal.solution && (
                <Section icon={<Zap className="w-4 h-4" />} title="Your Solution">
                  {proposal.solution.uniqueDifferentiator && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 mb-3">
                      <p className="text-xs text-indigo-400 mb-1">Unique Differentiator</p>
                      <p className="text-sm text-white font-medium">{proposal.solution.uniqueDifferentiator}</p>
                    </div>
                  )}
                  {proposal.solution.unfairAdvantage && (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 mb-3">
                      <p className="text-xs text-purple-400 mb-1">Unfair Advantage</p>
                      <p className="text-sm text-white font-medium">{proposal.solution.unfairAdvantage}</p>
                    </div>
                  )}
                  {proposal.solution.coreFeatures && proposal.solution.coreFeatures.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Core Features</p>
                      <ul className="space-y-1.5">
                        {proposal.solution.coreFeatures.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Section>
              )}

              {/* MVP Scope */}
              {proposal.mvpScope && (
                <Section icon={<Target className="w-4 h-4" />} title="MVP Scope">
                  {proposal.mvpScope.mustHave && proposal.mvpScope.mustHave.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-green-400 uppercase tracking-wide mb-1.5">Must Have (v1)</p>
                      <ul className="space-y-1">
                        {proposal.mvpScope.mustHave.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                            <span className="text-green-400 mt-0.5">✓</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {proposal.mvpScope.niceToHave && proposal.mvpScope.niceToHave.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-yellow-400/80 uppercase tracking-wide mb-1.5">Nice to Have (v2)</p>
                      <ul className="space-y-1">
                        {proposal.mvpScope.niceToHave.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/50">
                            <span className="text-yellow-400/60 mt-0.5">○</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {proposal.mvpScope.outOfScope && proposal.mvpScope.outOfScope.length > 0 && (
                    <div>
                      <p className="text-xs text-white/30 uppercase tracking-wide mb-1.5">Out of Scope</p>
                      <ul className="space-y-1">
                        {proposal.mvpScope.outOfScope.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/30">
                            <span className="mt-0.5">✗</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Section>
              )}

              {/* Monetization */}
              {proposal.monetization && (
                <Section icon={<DollarSign className="w-4 h-4" />} title="Monetization">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {proposal.monetization.model && (
                      <span className="px-3 py-1 rounded-full bg-green-500/15 text-green-300 text-sm font-medium capitalize">
                        {proposal.monetization.model}
                      </span>
                    )}
                    {proposal.monetization.pricing && (
                      <span className="text-sm font-semibold text-white">{proposal.monetization.pricing}</span>
                    )}
                  </div>
                  {proposal.monetization.rationale && (
                    <p className="text-sm text-white/60 leading-relaxed">{proposal.monetization.rationale}</p>
                  )}
                </Section>
              )}

              {/* Risks */}
              {proposal.risks && proposal.risks.length > 0 && (
                <Section icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />} title="Key Risks">
                  <ul className="space-y-1.5">
                    {proposal.risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                        <span className="text-yellow-400/70 mt-0.5 shrink-0">⚠</span>{r}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </>
          )}

          {activeTab === 'launch' && (
            <>
              {/* Go to Market */}
              {proposal.goToMarket && (
                <Section icon={<TrendingUp className="w-4 h-4" />} title="Go-to-Market">
                  {proposal.goToMarket.primaryChannel && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 mb-3">
                      <p className="text-xs text-indigo-400 mb-1">Primary Channel (Most Validated)</p>
                      <p className="text-sm text-white font-medium">{proposal.goToMarket.primaryChannel}</p>
                    </div>
                  )}
                  {proposal.goToMarket.channels && proposal.goToMarket.channels.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-white/40 uppercase tracking-wide mb-1.5">All Channels</p>
                      <div className="flex flex-wrap gap-1.5">
                        {proposal.goToMarket.channels.map((c, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-white/5 text-white/70 text-xs">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {proposal.goToMarket.launchStrategy && (
                    <div className="mb-3">
                      <p className="text-xs text-white/40 uppercase tracking-wide mb-1.5">Launch Strategy</p>
                      <p className="text-sm text-white/70 leading-relaxed">{proposal.goToMarket.launchStrategy}</p>
                    </div>
                  )}
                  {proposal.goToMarket.first30Days && (
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wide mb-1.5">First 30 Days</p>
                      <p className="text-sm text-white/70 leading-relaxed">{proposal.goToMarket.first30Days}</p>
                    </div>
                  )}
                </Section>
              )}

              {/* Next Steps */}
              {proposal.nextSteps && proposal.nextSteps.length > 0 && (
                <Section icon={<ArrowRight className="w-4 h-4 text-green-400" />} title="Immediate Next Steps">
                  <ol className="space-y-2">
                    {proposal.nextSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                        <span className="w-6 h-6 rounded-full bg-green-500/15 text-green-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </Section>
              )}

              {/* Skills Picker — appears after company is launched */}
              {launchResult && (
                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                  <SkillsPicker
                    opportunityId={opportunityId}
                    companyId={launchResult.companyId}
                    compact
                    onDone={(installed) => console.log('Skills installed:', installed)}
                  />
                </div>
              )}

              {/* Launch CTA */}
              {launchResult ? (
                // ── Success state ──────────────────────────────────────────
                <div className="rounded-2xl bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-7 h-7 text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Your AI Company is Live</h3>
                  <p className="text-sm text-white/60 mb-1">
                    <span className="font-semibold text-white">{launchResult.companyName}</span> is running on
                    build.founderlens.io
                  </p>
                  <div className="flex items-center justify-center gap-4 text-xs text-white/50 mb-4">
                    <span>✓ {launchResult.agentCount} agents hired</span>
                    <span>✓ {launchResult.issueCount} tasks seeded</span>
                    <span>✓ 3 projects created</span>
                  </div>
                  <Button
                    className="bg-green-600 hover:bg-green-500 text-white font-semibold w-full"
                    onClick={() => window.open(launchResult.companyUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Company Dashboard
                  </Button>
                  <p className="text-xs text-white/30 mt-2">
                    build.founderlens.io · Powered by Paperclip
                  </p>
                </div>
              ) : (
                // ── Pre-launch state ───────────────────────────────────────
                <div className="rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 p-5 text-center">
                  <Rocket className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <h3 className="text-base font-bold text-white mb-1">Ready to Build?</h3>
                  <p className="text-sm text-white/60 mb-4">
                    {launching
                      ? 'Hiring your AI team — CEO, CTO, Engineer, CMO, and Growth...'
                      : 'One click launches a real AI company — 5 agents briefed from your proposal and research, working in 30 seconds.'}
                    <span className="block mt-1 text-xs text-indigo-400">Powered by Paperclip × FounderLens</span>
                  </p>
                  {launchError && (
                    <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300 text-left">
                      {launchError}
                    </div>
                  )}
                  {launching ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-indigo-300">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-medium">Building your company...</span>
                      </div>
                      <div className="text-xs text-white/40 space-y-1">
                        <div>Creating company · Setting goal · Hiring team</div>
                        <div>Seeding backlog · Injecting research context</div>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold w-full"
                      onClick={handleLaunch}
                      disabled={launching}
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      Build This
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="text-xs text-white/30">
            Generated by FounderLens Idea Coach
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyMarkdown}
              className="text-white/60 hover:text-white text-xs gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Markdown'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION WRAPPER
// ============================================================================

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/3 border border-white/8 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-indigo-400">{icon}</div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// MARKDOWN EXPORT
// ============================================================================

function generateMarkdown(proposal: ProductProposal, fallbackTitle: string): string {
  const lines: string[] = [];
  lines.push(`# ${proposal.productName || fallbackTitle}`);
  if (proposal.oneLiner) lines.push(`\n> ${proposal.oneLiner}`);
  if (proposal.tagline) lines.push(`\n*"${proposal.tagline}"*`);

  if (proposal.problemStatement) {
    lines.push('\n## Problem');
    lines.push(proposal.problemStatement);
  }

  if (proposal.targetUser) {
    lines.push('\n## Target User');
    if (proposal.targetUser.persona) lines.push(`**Persona:** ${proposal.targetUser.persona}`);
    if (proposal.targetUser.painPoints?.length) {
      lines.push('\n**Pain Points:**');
      proposal.targetUser.painPoints.forEach(p => lines.push(`- ${p}`));
    }
  }

  if (proposal.solution) {
    lines.push('\n## Solution');
    if (proposal.solution.uniqueDifferentiator) lines.push(`**Differentiator:** ${proposal.solution.uniqueDifferentiator}`);
    if (proposal.solution.unfairAdvantage) lines.push(`**Unfair Advantage:** ${proposal.solution.unfairAdvantage}`);
    if (proposal.solution.coreFeatures?.length) {
      lines.push('\n**Core Features:**');
      proposal.solution.coreFeatures.forEach((f, i) => lines.push(`${i + 1}. ${f}`));
    }
  }

  if (proposal.mvpScope) {
    lines.push('\n## MVP Scope');
    if (proposal.mvpScope.mustHave?.length) {
      lines.push('\n**Must Have (v1):**');
      proposal.mvpScope.mustHave.forEach(f => lines.push(`- [ ] ${f}`));
    }
    if (proposal.mvpScope.niceToHave?.length) {
      lines.push('\n**Nice to Have (v2):**');
      proposal.mvpScope.niceToHave.forEach(f => lines.push(`- ${f}`));
    }
  }

  if (proposal.monetization) {
    lines.push('\n## Monetization');
    if (proposal.monetization.model) lines.push(`**Model:** ${proposal.monetization.model}`);
    if (proposal.monetization.pricing) lines.push(`**Pricing:** ${proposal.monetization.pricing}`);
    if (proposal.monetization.rationale) lines.push(`\n${proposal.monetization.rationale}`);
  }

  if (proposal.goToMarket) {
    lines.push('\n## Go-to-Market');
    if (proposal.goToMarket.primaryChannel) lines.push(`**Primary Channel:** ${proposal.goToMarket.primaryChannel}`);
    if (proposal.goToMarket.launchStrategy) lines.push(`\n${proposal.goToMarket.launchStrategy}`);
    if (proposal.goToMarket.first30Days) lines.push(`\n**First 30 Days:** ${proposal.goToMarket.first30Days}`);
  }

  if (proposal.risks?.length) {
    lines.push('\n## Risks');
    proposal.risks.forEach(r => lines.push(`- ⚠ ${r}`));
  }

  if (proposal.nextSteps?.length) {
    lines.push('\n## Next Steps');
    proposal.nextSteps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }

  if (proposal.researchBacking) {
    lines.push('\n---');
    lines.push(`*Generated by FounderLens Idea Coach · Opportunity Score: ${proposal.researchBacking.opportunityScore || 'N/A'}/100 · ${proposal.researchBacking.dataPoints || 0} data points analyzed*`);
  }

  return lines.join('\n');
}
