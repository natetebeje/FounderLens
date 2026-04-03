import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  Quote,
  Flame,
  TrendingUp,
  AlertTriangle,
  Target,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Users,
  Lightbulb,
  ThumbsUp,
  Zap,
  Search,
  ArrowUpRight,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RedditPost {
  post_id?: string;
  id?: string;
  title: string;
  subreddit: string;
  score: number;
  num_comments?: number;
  numComments?: number;
  author: string;
  permalink: string;
  relevance_score?: number;
  engagement_metrics?: { score?: number; comments?: number; upvote_ratio?: number };
}

interface AISummary {
  tldr?: string;
  demandSignals?: string[];
  painPoints?: string[];
  competitorMentions?: string[];
  opportunityScore?: number;
  keyQuotes?: { text: string; source: string; score?: number; url?: string }[];
}

// Legacy deep-analysis shape (validate-opportunity-research returns this)
interface FrustrationQuote { quote: string; source: string; context: string; frustrationLevel: 'mild' | 'moderate' | 'severe' }
interface PainPointCategory { category: string; description: string; frequency: 'rare' | 'common' | 'very_common'; specificExamples: string[] }
interface IndustryTrend { trend: string; direction: 'growing' | 'declining' | 'stable'; relevance: string; opportunity: string }
interface MarketGap { gap: string; evidence: string; potentialValue: 'low' | 'medium' | 'high' }
interface OverallSentiment { score: number; summary: string; strongestFrustration: string; biggestOpportunity: string }

interface DeepAnalysis {
  frustrationQuotes?: FrustrationQuote[];
  painPointCategories?: PainPointCategory[];
  industryTrends?: IndustryTrend[];
  marketGaps?: MarketGap[];
  overallSentiment?: OverallSentiment;
}

interface CommunityResearchResultsProps {
  // New shape from reddit-discussion-extractor
  summary?: AISummary;
  discussions?: RedditPost[];
  discussionsFound?: number;
  // Legacy shape from validate-opportunity-research
  analysis?: DeepAnalysis;
  sources?: {
    reddit?: { postsFound?: number; topPosts?: RedditPost[]; hasApiAccess?: boolean };
    hackerNews?: { storiesFound?: number };
  };
  researchScore?: number;
  totalDataPoints?: number;
  hasRealCommunityData?: boolean;
  // Shared
  dataQuality?: number;
  className?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function opportunityScoreColor(score: number) {
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-500 dark:text-red-400';
}

function opportunityScoreLabel(score: number) {
  if (score >= 70) return 'Strong Demand';
  if (score >= 40) return 'Moderate Demand';
  if (score > 0) return 'Weak Signal';
  return 'No Signal';
}

function frequencyBadge(freq: string) {
  if (freq === 'very_common') return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs">Very Common</Badge>;
  if (freq === 'common') return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-xs">Common</Badge>;
  return <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs">Rare</Badge>;
}

function frustrationColor(level: string) {
  if (level === 'severe') return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
  if (level === 'moderate') return 'border-l-orange-400 bg-orange-50 dark:bg-orange-900/10';
  return 'border-l-yellow-400 bg-yellow-50 dark:bg-yellow-900/10';
}

// ── Component ─────────────────────────────────────────────────────────────────

export const CommunityResearchResults: React.FC<CommunityResearchResultsProps> = ({
  summary,
  discussions = [],
  discussionsFound,
  analysis,
  sources,
  researchScore,
  totalDataPoints,
  hasRealCommunityData,
  dataQuality,
  className = '',
}) => {
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [showPainPoints, setShowPainPoints] = useState(false);

  // Normalise data across both response shapes
  const score = summary?.opportunityScore ?? researchScore ?? dataQuality ?? 0;
  const tldr = summary?.tldr ?? analysis?.overallSentiment?.summary ?? '';
  const demandSignals = summary?.demandSignals ?? [];
  const painPoints = summary?.painPoints ?? analysis?.painPointCategories?.map(p => p.category) ?? [];
  const competitorMentions = summary?.competitorMentions ?? [];
  const keyQuotes = summary?.keyQuotes ?? analysis?.frustrationQuotes?.slice(0, 4).map(q => ({ text: q.quote, source: q.source, score: 0, url: undefined })) ?? [];
  const redditPosts: RedditPost[] = discussions.length > 0 ? discussions : (sources?.reddit?.topPosts ?? []);
  const postCount = discussionsFound ?? sources?.reddit?.postsFound ?? redditPosts.length;
  const deepAnalysis = analysis;

  const visiblePosts = showAllPosts ? redditPosts : redditPosts.slice(0, 4);

  return (
    <div className={`space-y-5 ${className}`}>

      {/* ── Score + TLDR header ── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="w-5 h-5 text-primary" />
              Community Intelligence
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${opportunityScoreColor(score)}`}>{score}</span>
              <div>
                <div className="text-xs text-muted-foreground">Opportunity Score</div>
                <Badge variant="outline" className={`text-xs ${opportunityScoreColor(score)}`}>
                  {opportunityScoreLabel(score)}
                </Badge>
              </div>
            </div>
          </div>
          <Progress value={score} className="h-1.5 mt-2" />
        </CardHeader>

        {tldr && (
          <CardContent className="pt-0">
            <p className="text-sm leading-relaxed text-foreground/80 italic border-l-2 border-primary/40 pl-3">
              {tldr}
            </p>
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {postCount} posts</span>
              {totalDataPoints && <span className="flex items-center gap-1"><Search className="w-3.5 h-3.5" /> {totalDataPoints} data points</span>}
              {(hasRealCommunityData === false) && (
                <Badge variant="outline" className="text-orange-500 border-orange-400 text-xs">AI only — no community data</Badge>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Demand signals ── */}
      {demandSignals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Demand Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {demandSignals.map((signal, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <Zap className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground/80">{signal}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Pain points ── */}
      {(painPoints.length > 0 || (deepAnalysis?.painPointCategories?.length ?? 0) > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Pain Points
              </CardTitle>
              {deepAnalysis?.painPointCategories && deepAnalysis.painPointCategories.length > 3 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowPainPoints(v => !v)}>
                  {showPainPoints ? 'Show less' : `+${deepAnalysis.painPointCategories!.length - 3} more`}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {deepAnalysis?.painPointCategories ? (
              (showPainPoints ? deepAnalysis.painPointCategories : deepAnalysis.painPointCategories.slice(0, 3)).map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Flame className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{p.category.replace(/_/g, ' ')}</span>
                      {frequencyBadge(p.frequency)}
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                  </div>
                </div>
              ))
            ) : (
              painPoints.map((pt, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <Flame className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80">{pt}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Key quotes ── */}
      {keyQuotes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Quote className="w-4 h-4 text-primary" />
              What People Are Saying
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {keyQuotes.map((q, i) => {
              const level = (q as any).frustrationLevel ?? 'moderate';
              const hasLink = !!q.url;
              const Wrapper = hasLink ? 'a' : 'div';
              return (
                <Wrapper
                  key={i}
                  {...(hasLink ? {
                    href: q.url,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: `block border-l-4 pl-3 py-2 rounded-r text-sm ${frustrationColor(level)} group transition-opacity hover:opacity-90`,
                  } : {
                    className: `border-l-4 pl-3 py-2 rounded-r text-sm ${frustrationColor(level)}`,
                  })}
                >
                  <p className="italic text-foreground/80">"{q.text}"</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{q.source}</span>
                    {(q.score ?? 0) > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <ThumbsUp className="w-3 h-3" /> {q.score}
                      </span>
                    )}
                    {hasLink && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-3 h-3" /> View on Reddit
                      </span>
                    )}
                  </div>
                </Wrapper>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Competitor mentions ── */}
      {competitorMentions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-blue-500" />
              Competitors Mentioned
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-wrap gap-2">
            {competitorMentions.map((c, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Market gaps (deep analysis) ── */}
      {(deepAnalysis?.marketGaps?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Market Gaps
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {deepAnalysis!.marketGaps!.slice(0, 4).map((g, i) => (
              <div key={i} className="text-sm flex gap-2">
                <span className={`mt-0.5 text-xs font-bold ${g.potentialValue === 'high' ? 'text-green-500' : g.potentialValue === 'medium' ? 'text-yellow-500' : 'text-gray-400'}`}>
                  {g.potentialValue === 'high' ? '▲' : g.potentialValue === 'medium' ? '▷' : '▽'}
                </span>
                <div>
                  <span className="font-medium">{g.gap}</span>
                  {g.evidence && <p className="text-xs text-muted-foreground mt-0.5">{g.evidence}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Reddit source posts ── */}
      {redditPosts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-[#FF4500]" />
                Source Posts from Reddit
              </CardTitle>
              <Badge variant="outline" className="text-xs">{postCount} found</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {visiblePosts.map((post, i) => (
              <a
                key={post.post_id ?? post.id ?? i}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/30 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                    <ArrowUpRight className="inline w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">{post.subreddit?.startsWith('r/') ? post.subreddit : `r/${post.subreddit}`}</Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ThumbsUp className="w-3 h-3" /> {post.score}
                    </span>
                    {(post.num_comments ?? post.numComments ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="w-3 h-3" /> {post.num_comments ?? post.numComments}
                      </span>
                    )}
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
              </a>
            ))}

            {redditPosts.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs mt-1"
                onClick={() => setShowAllPosts(v => !v)}
              >
                {showAllPosts ? (
                  <><ChevronUp className="w-3.5 h-3.5 mr-1" /> Show fewer</>
                ) : (
                  <><ChevronDown className="w-3.5 h-3.5 mr-1" /> Show all {redditPosts.length} posts</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ── */}
      {redditPosts.length === 0 && !tldr && (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No community data yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Run validation to search Reddit for discussions about this opportunity.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CommunityResearchResults;
