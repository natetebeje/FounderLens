import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Rocket,
  ArrowLeft,
  Loader2,
  FileText,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Sparkles,
  DollarSign,
  Users,
  Zap,
  Shield,
  Compass,
  BarChart3,
} from 'lucide-react';
import { ResearchReport } from '@/components/ResearchReport';
import { ProductProposalModal } from '@/components/ProductProposalModal';
import { useToast } from '@/hooks/use-toast';
import { downloadProposalPdf } from '@/lib/proposal-pdf';
import { Download } from 'lucide-react';

interface BuildPrelaunchViewProps {
  opportunityId: string;
  onLaunched: () => void;
  onBack: () => void;
}

interface PrelaunchData {
  opportunity: any;
  workflow: any | null;
  marketIntelligence: any | null;
}

const hasData = (obj: any) =>
  obj != null && typeof obj === 'object' && Object.keys(obj).length > 0;

export function BuildPrelaunchView({ opportunityId, onLaunched, onBack }: BuildPrelaunchViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<PrelaunchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [showProposalModal, setShowProposalModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [oppRes, workflowRes, marketRes] = await Promise.all([
        supabase
          .from('business_opportunities')
          .select('*')
          .eq('id', opportunityId)
          .maybeSingle(),
        supabase
          .from('validation_workflows')
          .select('*')
          .eq('opportunity_id', opportunityId)
          .maybeSingle(),
        supabase
          .from('automated_market_intelligence')
          .select('*')
          .eq('opportunity_id', opportunityId)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      if (cancelled) return;

      if (oppRes.error || !oppRes.data) {
        setLoadError('Opportunity not found.');
        setLoading(false);
        return;
      }

      setData({
        opportunity: oppRes.data,
        workflow: workflowRes.data ?? null,
        marketIntelligence: marketRes.data?.[0] ?? null,
      });
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  const handleLaunch = async () => {
    if (launching) return;
    setLaunching(true);
    setLaunchError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const supabaseUrl =
        import.meta.env.VITE_SUPABASE_URL || 'https://phppdhsozkpsquxlfezg.supabase.co';
      const res = await fetch(`${supabaseUrl}/functions/v1/launch-to-paperclip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ opportunityId }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Launch failed');

      toast({
        title: 'AI Company launched',
        description: `${result.companyName} is live with ${result.agentCount} agents.`,
      });
      onLaunched();
    } catch (err: any) {
      setLaunchError(err.message || 'Launch failed. Please try again.');
    } finally {
      setLaunching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
          <p className="text-sm text-muted-foreground">{loadError || 'Could not load opportunity.'}</p>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { opportunity, workflow, marketIntelligence } = data;
  const reddit = workflow?.reddit_validation_results || {};
  const automatedAi = workflow?.automated_validation_results || {};
  const proposal = workflow?.product_proposal;
  const hasProposal = hasData(proposal);

  // Headline score: mirror the validation page's resolution order.
  // Composite (60% AI + 40% community) is the canonical paired score; fall back to Reddit
  // research score, then any persisted AI score. The validation page itself falls back
  // client-side when automated_score is 0, so we use the Reddit score ahead of it here.
  const compositeScore = workflow?.composite_score || 0;
  const communityScore = reddit?.researchScore ?? reddit?.opportunityScore ?? 0;
  const persistedAiScore =
    workflow?.automated_score ||
    marketIntelligence?.confidence_score ||
    opportunity?.ai_confidence_score ||
    0;
  const headlineScore =
    compositeScore > 0 ? compositeScore : communityScore > 0 ? communityScore : persistedAiScore > 0 ? persistedAiScore : null;

  // Verdict / recommendation
  const verdict = reddit?.verdict as string | undefined;
  const verdictReason = reddit?.verdictReason as string | undefined;
  const recommendation =
    workflow?.automated_recommendation ?? reddit?.recommendation ?? null;
  const briefSummary = reddit?.briefSummary ?? reddit?.analysis?.summary ?? null;

  // Market intelligence (snake_case from table, camelCase from workflow)
  const competitorAnalysis =
    marketIntelligence?.competitor_analysis ?? automatedAi?.competitorAnalysis ?? null;
  const marketSizing =
    marketIntelligence?.market_sizing ?? automatedAi?.marketSizing ?? null;
  const pricingResearch =
    marketIntelligence?.pricing_research ?? automatedAi?.pricingResearch ?? null;
  const trendsAnalysis =
    marketIntelligence?.trends_analysis ?? automatedAi?.trendsAnalysis ?? null;
  const swotAnalysis =
    marketIntelligence?.swot_analysis ?? automatedAi?.swotAnalysis ?? null;

  const alreadyLaunched = !!workflow?.paperclip_company_id;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Back link */}
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to My Companies
      </Button>

      {/* ── Header card ── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                Review & Launch
              </div>
              <CardTitle className="text-2xl leading-tight">{opportunity.title}</CardTitle>
              {opportunity.target_market && (
                <p className="text-sm text-muted-foreground mt-1">{opportunity.target_market}</p>
              )}
            </div>
            {headlineScore != null && (
              <div className="text-right flex-shrink-0">
                <div className="text-4xl font-bold text-primary">{Math.round(headlineScore)}</div>
                <div className="text-xs text-muted-foreground">Validation Score</div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {opportunity.description && (
            <p className="text-sm leading-relaxed">{opportunity.description}</p>
          )}
          {opportunity.problem_statement && (
            <div className="rounded-lg bg-muted/40 border p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Problem
              </div>
              <p className="text-sm">{opportunity.problem_statement}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {verdict && (
              <Badge variant="secondary" className="capitalize">
                <TrendingUp className="h-3 w-3 mr-1" />
                {verdict} signal
              </Badge>
            )}
            {workflow?.status && (
              <Badge variant="outline" className="capitalize">
                {workflow.status.replace(/_/g, ' ')}
              </Badge>
            )}
            {opportunity?.competition_level && (
              <Badge variant="outline" className="capitalize">
                <Users className="h-3 w-3 mr-1" />
                {opportunity.competition_level} competition
              </Badge>
            )}
            {opportunity?.market_size_estimate && (
              <Badge variant="outline">
                <BarChart3 className="h-3 w-3 mr-1" />
                {opportunity.market_size_estimate}
              </Badge>
            )}
            {hasProposal && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400">
                <FileText className="h-3 w-3 mr-1" />
                Product proposal ready
              </Badge>
            )}
          </div>

          {verdictReason && (
            <p className="text-sm text-muted-foreground leading-relaxed">{verdictReason}</p>
          )}
          {recommendation && (
            <div className="rounded-lg bg-muted/40 border p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Recommendation
              </div>
              <p className="text-sm">{recommendation}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Community research (reuses the full ResearchReport renderer) ── */}
      {hasData(reddit) && (reddit.verdict || reddit.briefSummary || reddit.fullReport || reddit.painPoints) && (
        <div>
          <ResearchReport
            opportunityTitle={opportunity.title}
            opportunityScore={reddit.researchScore ?? reddit.opportunityScore}
            verdict={reddit.verdict}
            verdictReason={reddit.verdictReason}
            recommendation={reddit.recommendation}
            briefSummary={briefSummary ?? undefined}
            demandSignals={reddit.demandSignals || []}
            painPoints={reddit.painPoints || []}
            competitors={reddit.competitors || []}
            marketGaps={(reddit.marketGaps || []).map((g: any) => (typeof g === 'string' ? g : g?.gap)).filter(Boolean)}
            risks={reddit.risks || []}
            competitorApps={reddit.competitorApps || []}
            analogousMarkets={reddit.analogousMarkets || []}
            webCitations={reddit.webCitations || []}
            dataQuality={reddit.dataQuality}
            totalDataPoints={reddit.totalDataPoints}
            googleTrends={reddit.googleTrends || undefined}
            fullReport={reddit.fullReport}
            analysis={reddit.analysis}
            sources={reddit.sources}
          />
        </div>
      )}

      {/* ── Market intelligence snapshot ── */}
      {(competitorAnalysis || marketSizing || pricingResearch || trendsAnalysis || swotAnalysis) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              AI Market Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {marketSizing && (
              <IntelBlock
                icon={BarChart3}
                label="Market Sizing"
                content={
                  marketSizing.totalAddressableMarket ||
                  marketSizing.tam ||
                  marketSizing.summary ||
                  marketSizing.analysis
                }
                extra={[
                  marketSizing.serviceableAddressableMarket && `SAM: ${marketSizing.serviceableAddressableMarket}`,
                  marketSizing.serviceableObtainableMarket && `SOM: ${marketSizing.serviceableObtainableMarket}`,
                  marketSizing.growthRate && `Growth: ${marketSizing.growthRate}`,
                ].filter(Boolean) as string[]}
              />
            )}
            {competitorAnalysis && (
              <IntelBlock
                icon={Users}
                label="Competitor Landscape"
                content={
                  competitorAnalysis.summary ||
                  competitorAnalysis.overview ||
                  competitorAnalysis.analysis
                }
                list={
                  Array.isArray(competitorAnalysis.competitors)
                    ? competitorAnalysis.competitors
                        .slice(0, 5)
                        .map((c: any) => c.name || c.title || (typeof c === 'string' ? c : null))
                        .filter(Boolean)
                    : Array.isArray(competitorAnalysis.topCompetitors)
                      ? competitorAnalysis.topCompetitors.slice(0, 5)
                      : undefined
                }
              />
            )}
            {pricingResearch && (
              <IntelBlock
                icon={DollarSign}
                label="Pricing"
                content={
                  pricingResearch.summary ||
                  pricingResearch.recommendedPricing ||
                  pricingResearch.analysis
                }
                extra={[
                  pricingResearch.priceRange && `Range: ${pricingResearch.priceRange}`,
                  pricingResearch.model && `Model: ${pricingResearch.model}`,
                ].filter(Boolean) as string[]}
              />
            )}
            {trendsAnalysis && (
              <IntelBlock
                icon={TrendingUp}
                label="Trends"
                content={
                  trendsAnalysis.summary ||
                  trendsAnalysis.overall ||
                  trendsAnalysis.analysis
                }
                list={
                  Array.isArray(trendsAnalysis.keyTrends)
                    ? trendsAnalysis.keyTrends.slice(0, 5)
                    : undefined
                }
              />
            )}
            {swotAnalysis && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['strengths', 'weaknesses', 'opportunities', 'threats'].map((k) => {
                  const items = swotAnalysis[k];
                  if (!Array.isArray(items) || items.length === 0) return null;
                  return (
                    <div key={k} className="rounded-lg border bg-muted/30 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        {k}
                      </div>
                      <ul className="space-y-1 text-sm">
                        {items.slice(0, 4).map((item: any, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-muted-foreground mt-1">•</span>
                            <span>{typeof item === 'string' ? item : item?.text || item?.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Product proposal ── */}
      {hasProposal && (
        <Card className="border-green-200 dark:border-green-900 bg-green-50/40 dark:bg-green-950/10">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  Product Proposal
                </CardTitle>
                {proposal.productName && (
                  <div className="text-lg font-semibold mt-2">{proposal.productName}</div>
                )}
                {proposal.oneLiner && (
                  <p className="text-sm text-muted-foreground mt-1">{proposal.oneLiner}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => setShowProposalModal(true)}>
                  View full proposal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadProposalPdf(proposal, opportunity.title)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Download PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {proposal.solution?.coreFeatures?.length > 0 && (
              <ProposalBlock
                icon={Zap}
                label="Core Features"
                list={proposal.solution.coreFeatures}
              />
            )}
            {proposal.solution?.uniqueDifferentiator && (
              <ProposalBlock
                icon={Sparkles}
                label="Unique Differentiator"
                text={proposal.solution.uniqueDifferentiator}
              />
            )}
            {proposal.targetUser?.persona && (
              <ProposalBlock
                icon={Target}
                label="Target User"
                text={proposal.targetUser.persona}
                list={proposal.targetUser.painPoints}
                listLabel="Pain points"
              />
            )}
            {proposal.mvpScope?.mustHave?.length > 0 && (
              <ProposalBlock
                icon={CheckCircle}
                label="MVP Must-Have"
                list={proposal.mvpScope.mustHave}
              />
            )}
            {proposal.monetization && (
              <ProposalBlock
                icon={DollarSign}
                label="Monetization"
                text={proposal.monetization.model}
                extra={[
                  proposal.monetization.pricing && `Pricing: ${proposal.monetization.pricing}`,
                  proposal.monetization.rationale,
                ].filter(Boolean)}
              />
            )}
            {proposal.goToMarket && (
              <ProposalBlock
                icon={Compass}
                label="Go To Market"
                text={proposal.goToMarket.launchStrategy || proposal.goToMarket.primaryChannel}
                list={proposal.goToMarket.channels}
                listLabel="Channels"
              />
            )}
            {proposal.risks?.length > 0 && (
              <ProposalBlock icon={Shield} label="Risks" list={proposal.risks} />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── What happens on launch ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            What happens when you launch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>A new AI company is created in Paperclip using the validation report{hasProposal ? ' and your product proposal' : ''}.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Six specialized agents (PM, Engineer, Designer, Marketer, Research, QA) are provisioned with budgets and skills.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>A goal, three projects, and a backlog of issues are generated so agents can start working immediately.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>You can monitor progress from the My Companies tab or open the live dashboard.</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* ── Action buttons ── */}
      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 bg-background/90 backdrop-blur border rounded-xl p-4 shadow-lg">
        {alreadyLaunched ? (
          <>
            <Button
              size="lg"
              className="flex-1"
              onClick={() =>
                window.open(workflow?.paperclip_company_url || 'https://build.founderlens.io', '_blank')
              }
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open AI Company
            </Button>
            <Button size="lg" variant="outline" onClick={onLaunched}>
              View in My Companies
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" className="flex-1" onClick={handleLaunch} disabled={launching}>
              {launching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Launch AI Company
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => navigate(`/validation/${opportunityId}`)}
              disabled={launching}
            >
              Back to Validation
            </Button>
          </>
        )}
      </div>

      {launchError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
          {launchError}
        </div>
      )}

      {showProposalModal && hasProposal && (
        <ProductProposalModal
          proposal={proposal}
          opportunityTitle={opportunity.title}
          opportunityId={opportunityId}
          onClose={() => setShowProposalModal(false)}
          existingCompanyId={workflow?.paperclip_company_id || undefined}
          existingCompanyUrl={workflow?.paperclip_company_url || undefined}
        />
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function IntelBlock({
  icon: Icon,
  label,
  content,
  extra,
  list,
}: {
  icon: React.ElementType;
  label: string;
  content?: string;
  extra?: string[];
  list?: string[];
}) {
  if (!content && !extra?.length && !list?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {content && <p className="text-sm leading-relaxed">{content}</p>}
      {extra && extra.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {extra.map((e, i) => (
            <Badge key={i} variant="secondary" className="text-xs font-normal">
              {e}
            </Badge>
          ))}
        </div>
      )}
      {list && list.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {list.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-muted-foreground mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProposalBlock({
  icon: Icon,
  label,
  text,
  list,
  listLabel,
  extra,
}: {
  icon: React.ElementType;
  label: string;
  text?: string;
  list?: string[];
  listLabel?: string;
  extra?: string[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {text && <p className="text-sm leading-relaxed">{text}</p>}
      {extra && extra.length > 0 && (
        <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
          {extra.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      {list && list.length > 0 && (
        <>
          {listLabel && (
            <div className="text-xs text-muted-foreground mt-2 mb-1">{listLabel}</div>
          )}
          <ul className="space-y-1 text-sm mt-1">
            {list.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-muted-foreground mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
