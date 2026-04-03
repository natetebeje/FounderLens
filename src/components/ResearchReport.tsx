import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Brain, TrendingUp, AlertTriangle, Target, ExternalLink,
  ChevronDown, ChevronUp, MessageSquare, Zap, Shield,
  CheckCircle2, XCircle, AlertCircle, BookOpen, Smartphone,
  Globe, Users, Lightbulb, BarChart3, ArrowUpRight,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Competitor { name: string; description: string; gap: string }
interface AppStoreApp { name: string; rating: number; ratingCount: number; description: string; platform: string; url: string }
interface Citation { title: string; url: string }

interface ResearchReportProps {
  opportunityTitle?: string;
  // Core scores
  opportunityScore?: number;
  verdict?: 'strong' | 'moderate' | 'weak' | 'insufficient_data';
  verdictReason?: string;
  recommendation?: string;
  // Brief
  briefSummary?: string;
  // Evidence
  demandSignals?: string[];
  painPoints?: string[];
  competitors?: Competitor[];
  marketGaps?: string[];
  risks?: string[];
  // Sources
  competitorApps?: AppStoreApp[];
  analogousMarkets?: string[];
  webCitations?: Citation[];
  dataQuality?: 'rich' | 'moderate' | 'sparse';
  totalDataPoints?: number;
  evidenceSources?: string[];
  // Full report
  fullReport?: string;
  // Legacy fields
  analysis?: any;
  sources?: any;
  researchScore?: number;
  demandSignalsLegacy?: string[];
  className?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-500 dark:text-red-400';
}

function scoreBg(score: number) {
  if (score >= 70) return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800';
  if (score >= 40) return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800';
  return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800';
}

function VerdictBadge({ verdict }: { verdict?: string }) {
  const config: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    strong: { label: 'Strong Opportunity', icon: CheckCircle2, className: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' },
    moderate: { label: 'Moderate Signal', icon: AlertCircle, className: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800' },
    weak: { label: 'Weak Signal', icon: XCircle, className: 'text-red-500 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' },
    insufficient_data: { label: 'Needs More Research', icon: AlertCircle, className: 'text-gray-500 bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700' },
  };
  const c = config[verdict || 'insufficient_data'] || config.insufficient_data;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${c.className}`}>
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </span>
  );
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^## (.*$)/gm, '<h2 class="text-base font-semibold mt-5 mb-2">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-sm font-semibold mt-4 mb-1">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 mb-1 text-sm list-disc">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 mb-1 text-sm list-decimal">$2</li>')
    .replace(/\[(\d+)\]/g, '<sup class="text-primary text-xs font-semibold">[$1]</sup>')
    .replace(/\n{2,}/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br/>');
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ResearchReport: React.FC<ResearchReportProps> = ({
  opportunityTitle,
  opportunityScore,
  verdict,
  verdictReason,
  recommendation,
  briefSummary,
  demandSignals = [],
  painPoints = [],
  competitors = [],
  marketGaps = [],
  risks = [],
  competitorApps = [],
  analogousMarkets = [],
  webCitations = [],
  dataQuality,
  totalDataPoints = 0,
  evidenceSources = [],
  fullReport,
  analysis,
  sources,
  researchScore,
  className = '',
}) => {
  const [showFullReport, setShowFullReport] = useState(false);
  const [showAllCitations, setShowAllCitations] = useState(false);

  // Normalise — handle both new and legacy shapes
  const score = opportunityScore ?? researchScore ?? analysis?.overallSentiment?.score ?? 0;
  const tldr = briefSummary ?? analysis?.overallSentiment?.summary ?? '';
  const signals = demandSignals.length > 0 ? demandSignals
    : (analysis?.frustrationQuotes?.slice(0, 5).map((q: any) => q.quote) ?? []);
  const pains = painPoints.length > 0 ? painPoints
    : (analysis?.painPointCategories?.slice(0, 5).map((p: any) => p.category) ?? []);
  const gaps = marketGaps.length > 0 ? marketGaps
    : (analysis?.marketGaps?.slice(0, 4).map((g: any) => g.gap) ?? []);
  const comps = competitors.length > 0 ? competitors
    : (analysis?.currentSolutionComplaints?.slice(0, 4).map((c: any) => ({ name: c.solution, description: '', gap: c.complaints?.[0] || '' })) ?? []);
  const visibleCitations = showAllCitations ? webCitations : webCitations.slice(0, 4);

  if (!tldr && signals.length === 0 && pains.length === 0 && score === 0) return null;

  return (
    <div className={`space-y-4 ${className}`}>

      {/* ── Brief Summary Card ── */}
      <Card className={`border ${scoreBg(score)}`}>
        <CardContent className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Brain className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-semibold">Research Report</span>
                {verdict && <VerdictBadge verdict={verdict} />}
              </div>
              {tldr && (
                <p className="text-sm leading-relaxed text-foreground/80 italic border-l-2 border-primary/40 pl-3">
                  {tldr}
                </p>
              )}
            </div>
            <div className={`flex-shrink-0 flex flex-col items-center rounded-xl px-4 py-2.5 min-w-[76px] border ${scoreBg(score)}`}>
              <span className={`text-2xl font-bold leading-none ${scoreColor(score)}`}>{score}</span>
              <span className="text-xs text-muted-foreground mt-1 text-center">Opp. Score</span>
            </div>
          </div>

          {/* Evidence source pills */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {totalDataPoints > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> {totalDataPoints} data points
              </span>
            )}
            {evidenceSources.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-xs px-2 py-0">{s}</Badge>
            ))}
            {dataQuality && (
              <Badge variant="outline" className={`text-xs ${dataQuality === 'rich' ? 'text-green-600' : dataQuality === 'moderate' ? 'text-yellow-600' : 'text-orange-500'}`}>
                {dataQuality === 'rich' ? '✓ Rich data' : dataQuality === 'moderate' ? '~ Moderate data' : '⚠ Sparse data'}
              </Badge>
            )}
          </div>

          {/* Quick findings — 3 columns */}
          <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
            <div className="bg-background/60 rounded-lg p-2.5 border border-border/50">
              <div className="font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Demand Signals
              </div>
              <div className="text-muted-foreground">{signals.length} found</div>
            </div>
            <div className="bg-background/60 rounded-lg p-2.5 border border-border/50">
              <div className="font-semibold text-orange-500 mb-1 flex items-center gap-1">
                <Smartphone className="w-3 h-3" /> Competitors
              </div>
              <div className="text-muted-foreground">{comps.length + competitorApps.length} found</div>
            </div>
            <div className="bg-background/60 rounded-lg p-2.5 border border-border/50">
              <div className="font-semibold text-blue-500 mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Web Sources
              </div>
              <div className="text-muted-foreground">{webCitations.length} cited</div>
            </div>
          </div>

          {/* View full report button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowFullReport(v => !v)}
          >
            {showFullReport ? (
              <><ChevronUp className="w-4 h-4 mr-2" /> Hide Full Report</>
            ) : (
              <><BookOpen className="w-4 h-4 mr-2" /> View Full Research Report</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Full Report (expandable) ── */}
      {showFullReport && (
        <div className="space-y-4">

          {/* Demand Signals */}
          {signals.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Demand Signals
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {signals.map((s, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <Zap className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/80">{s}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Pain Points */}
          {pains.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Pain Points Found
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {pains.map((p, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-1.5" />
                    <span className="text-foreground/80">{p}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Competitor Apps from App Store */}
          {competitorApps.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                  Existing Apps Found
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {competitorApps.slice(0, 5).map((app, i) => (
                  <a
                    key={i}
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-2.5 rounded-lg border border-border hover:border-primary/20 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">{app.name}</span>
                        {app.rating > 0 && (
                          <span className="text-xs text-yellow-500">★ {app.rating.toFixed(1)}</span>
                        )}
                        {app.ratingCount > 0 && (
                          <span className="text-xs text-muted-foreground">({app.ratingCount.toLocaleString()} ratings)</span>
                        )}
                        <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{app.description}</p>
                    </div>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Competitor Analysis */}
          {comps.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-purple-500" />
                  Competitive Landscape
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {comps.slice(0, 5).map((c, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/40 border border-border/50">
                    <div className="font-semibold text-sm">{c.name}</div>
                    {c.description && <div className="text-xs text-muted-foreground mt-0.5">{c.description}</div>}
                    {c.gap && (
                      <div className="text-xs text-primary mt-1.5 flex items-start gap-1">
                        <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span>Gap: {c.gap}</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Analogous Markets */}
          {analogousMarkets.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-teal-500" />
                  Analogous Market Research
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-3">
                  When direct community data is sparse, we study similar markets that have solved analogous problems.
                </p>
                <div className="flex flex-wrap gap-2">
                  {analogousMarkets.map((m, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Market Gaps */}
          {gaps.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Market Gaps
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {gaps.map((g, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="text-yellow-500 font-bold text-xs mt-0.5">▲</span>
                    <span className="text-foreground/80">{g}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Risks */}
          {risks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-red-500" />
                  Key Risks
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {risks.map((r, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/80">{r}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommendation */}
          {recommendation && (
            <Card className={`border ${scoreBg(score)}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className={`w-4 h-4 ${scoreColor(score)}`} />
                  Researcher Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed">{recommendation}</p>
                {verdictReason && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{verdictReason}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Full Markdown Report */}
          {fullReport && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Full Research Report
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed markdown-content"
                  dangerouslySetInnerHTML={{ __html: `<p class="mb-3">${renderMarkdown(fullReport)}</p>` }}
                />
              </CardContent>
            </Card>
          )}

          {/* Web Citations */}
          {webCitations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  Sources & Citations
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {visibleCitations.map((c, i) => (
                  <a
                    key={i}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-60 group-hover:opacity-100" />
                    <span className="line-clamp-1 group-hover:underline">{c.title || c.url}</span>
                  </a>
                ))}
                {webCitations.length > 4 && (
                  <Button variant="ghost" size="sm" className="text-xs w-full mt-1" onClick={() => setShowAllCitations(v => !v)}>
                    {showAllCitations ? 'Show fewer' : `+ ${webCitations.length - 4} more sources`}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Collapse */}
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setShowFullReport(false)}>
            <ChevronUp className="w-4 h-4 mr-2" /> Collapse Report
          </Button>
        </div>
      )}
    </div>
  );
};

export default ResearchReport;
