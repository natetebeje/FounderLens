import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Quote,
  Flame,
  TrendingUp,
  AlertTriangle,
  Target,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Search,
  Users,
  Lightbulb,
} from 'lucide-react';

interface FrustrationQuote {
  quote: string;
  source: string;
  context: string;
  frustrationLevel: 'mild' | 'moderate' | 'severe';
}

interface PainPointCategory {
  category: string;
  description: string;
  frequency: 'rare' | 'common' | 'very_common';
  specificExamples: string[];
  currentWorkarounds: string[];
}

interface IndustryTrend {
  trend: string;
  direction: 'growing' | 'declining' | 'stable';
  relevance: string;
  opportunity: string;
}

interface SolutionComplaint {
  solution: string;
  complaints: string[];
  userSentiment: 'negative' | 'mixed' | 'disappointed';
}

interface MarketGap {
  gap: string;
  evidence: string;
  potentialValue: 'low' | 'medium' | 'high';
}

interface OverallSentiment {
  score: number;
  summary: string;
  strongestFrustration: string;
  biggestOpportunity: string;
}

interface ResearchAnalysis {
  frustrationQuotes: FrustrationQuote[];
  painPointCategories: PainPointCategory[];
  industryTrends: IndustryTrend[];
  currentSolutionComplaints: SolutionComplaint[];
  marketGaps: MarketGap[];
  overallSentiment: OverallSentiment;
}

interface SourceData {
  hackerNews: {
    storiesFound: number;
    commentsFound: number;
    totalSearched?: number;
    topStories: { title: string; points: number; comments: number; url: string }[];
  };
  reddit: {
    postsFound: number;
    totalSearched?: number;
    subredditsSearched: string[];
    hasApiAccess: boolean;
    topPosts: { title: string; subreddit: string; score: number; numComments: number; permalink: string }[];
  };
  webForums?: {
    resultsFound: number;
    topResults: { title: string; source: string; url: string }[];
  };
  relevanceFilter?: {
    totalFetched: number;
    relevantKept: number;
    relevanceRatio: number;
  };
}

interface CommunityResearchResultsProps {
  analysis: ResearchAnalysis;
  sources: SourceData;
  researchScore: number;
  totalDataPoints: number;
}

export function CommunityResearchResults({
  analysis,
  sources,
  researchScore,
  totalDataPoints,
}: CommunityResearchResultsProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    quotes: true,
    painPoints: true,
    complaints: false,
    trends: false,
    gaps: false,
    sources: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getFrustrationColor = (level: string) => {
    switch (level) {
      case 'severe': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'moderate': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getFrustrationIcon = (level: string) => {
    switch (level) {
      case 'severe': return <Flame className="h-4 w-4 text-red-400" />;
      case 'moderate': return <AlertTriangle className="h-4 w-4 text-orange-400" />;
      default: return <MessageSquare className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getFrequencyBadge = (freq: string) => {
    switch (freq) {
      case 'very_common': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Very Common</Badge>;
      case 'common': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">Common</Badge>;
      default: return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Occasional</Badge>;
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'growing': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'declining': return <TrendingUp className="h-4 w-4 text-red-400 rotate-180" />;
      default: return <Target className="h-4 w-4 text-blue-400" />;
    }
  };

  const getValueBadge = (value: string) => {
    switch (value) {
      case 'high': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">High Value</Badge>;
      case 'medium': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Medium Value</Badge>;
      default: return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Low Value</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Research Summary Header */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-primary" />
              Community Research Results
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {totalDataPoints} data points
              </Badge>
              <Badge variant="outline" className="text-xs">
                {sources.hackerNews.storiesFound + sources.hackerNews.commentsFound} HN
              </Badge>
              <Badge variant="outline" className="text-xs">
                {sources.reddit.postsFound} Reddit
              </Badge>
              {sources.relevanceFilter && (
                <Badge variant="outline" className="text-xs">
                  {sources.relevanceFilter.relevanceRatio}% relevant
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-2">{analysis.overallSentiment.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="flex items-start gap-2">
                <Flame className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Strongest Frustration</p>
                  <p className="text-sm font-medium">{analysis.overallSentiment.strongestFrustration}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Biggest Opportunity</p>
                  <p className="text-sm font-medium">{analysis.overallSentiment.biggestOpportunity}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frustration Quotes */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection('quotes')}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Quote className="h-5 w-5 text-red-400" />
              What People Are Frustrated About
              <Badge variant="secondary" className="text-xs">{analysis.frustrationQuotes.length} quotes</Badge>
            </CardTitle>
            {expandedSections.quotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {expandedSections.quotes && (
          <CardContent className="space-y-3">
            {analysis.frustrationQuotes.map((q, idx) => (
              <div key={idx} className={`border rounded-lg p-3 ${getFrustrationColor(q.frustrationLevel)}`}>
                <div className="flex items-start gap-2">
                  {getFrustrationIcon(q.frustrationLevel)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium italic">"{q.quote}"</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs opacity-75">
                        {q.source}
                      </Badge>
                      <span className="text-xs opacity-60">{q.context}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Pain Point Categories */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection('painPoints')}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Pain Point Categories
              <Badge variant="secondary" className="text-xs">{analysis.painPointCategories.length} categories</Badge>
            </CardTitle>
            {expandedSections.painPoints ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {expandedSections.painPoints && (
          <CardContent className="space-y-4">
            {analysis.painPointCategories.map((cat, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">{cat.category}</h4>
                  {getFrequencyBadge(cat.frequency)}
                </div>
                <p className="text-sm text-muted-foreground">{cat.description}</p>

                {cat.specificExamples.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Examples:</p>
                    <ul className="space-y-1">
                      {cat.specificExamples.map((ex, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-muted-foreground mt-1">•</span>
                          {ex}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {cat.currentWorkarounds.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Current Workarounds:</p>
                    <div className="flex flex-wrap gap-1">
                      {cat.currentWorkarounds.map((w, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {w}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* What People Hate About Current Solutions */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection('complaints')}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-5 w-5 text-red-400" />
              Current Solution Complaints
              <Badge variant="secondary" className="text-xs">{analysis.currentSolutionComplaints.length}</Badge>
            </CardTitle>
            {expandedSections.complaints ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {expandedSections.complaints && (
          <CardContent className="space-y-3">
            {analysis.currentSolutionComplaints.map((sol, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">{sol.solution}</h4>
                  <Badge
                    className={`text-xs ${
                      sol.userSentiment === 'negative'
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : sol.userSentiment === 'disappointed'
                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}
                  >
                    {sol.userSentiment}
                  </Badge>
                </div>
                <ul className="space-y-1">
                  {sol.complaints.map((c, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-red-400 mt-1">✕</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Industry Trends */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection('trends')}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              Industry Trends
              <Badge variant="secondary" className="text-xs">{analysis.industryTrends.length}</Badge>
            </CardTitle>
            {expandedSections.trends ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {expandedSections.trends && (
          <CardContent className="space-y-3">
            {analysis.industryTrends.map((t, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  {getTrendIcon(t.direction)}
                  <h4 className="font-semibold text-sm">{t.trend}</h4>
                  <Badge variant="outline" className="text-xs capitalize">{t.direction}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{t.relevance}</p>
                <p className="text-sm">
                  <span className="text-green-400 font-medium">Opportunity:</span> {t.opportunity}
                </p>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Market Gaps */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection('gaps')}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-green-400" />
              Market Gaps Identified
              <Badge variant="secondary" className="text-xs">{analysis.marketGaps.length}</Badge>
            </CardTitle>
            {expandedSections.gaps ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {expandedSections.gaps && (
          <CardContent className="space-y-3">
            {analysis.marketGaps.map((g, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-sm">{g.gap}</h4>
                  {getValueBadge(g.potentialValue)}
                </div>
                <p className="text-sm text-muted-foreground">{g.evidence}</p>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Data Sources */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection('sources')}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-5 w-5 text-muted-foreground" />
              Research Sources
            </CardTitle>
            {expandedSections.sources ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {expandedSections.sources && (
          <CardContent className="space-y-4">
            {/* Hacker News */}
            {sources.hackerNews.storiesFound > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <span className="text-orange-400">Y</span> Hacker News
                  <Badge variant="outline" className="text-xs">
                    {sources.hackerNews.storiesFound} stories, {sources.hackerNews.commentsFound} comments
                  </Badge>
                </h4>
                <div className="space-y-2">
                  {sources.hackerNews.topStories.map((story, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm border-l-2 border-orange-500/30 pl-3">
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{story.title}</p>
                        <p className="text-xs text-muted-foreground">{story.points} pts · {story.comments} comments</p>
                      </div>
                      {story.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 shrink-0"
                          onClick={() => window.open(story.url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reddit */}
            {sources.reddit.postsFound > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" /> Reddit
                  <Badge variant="outline" className="text-xs">
                    {sources.reddit.postsFound} posts
                  </Badge>
                </h4>
                <div className="space-y-2">
                  {sources.reddit.topPosts.map((post, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm border-l-2 border-orange-500/30 pl-3">
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{post.title}</p>
                        <p className="text-xs text-muted-foreground">r/{post.subreddit} · {post.score} pts · {post.numComments} comments</p>
                      </div>
                      {post.permalink && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 shrink-0"
                          onClick={() => window.open(`https://reddit.com${post.permalink}`, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!sources.reddit.hasApiAccess && (
              <p className="text-xs text-muted-foreground italic">
                Using Reddit public search. Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET for deeper Reddit research with comment analysis.
              </p>
            )}

            {/* Web Forums */}
            {sources.webForums && sources.webForums.resultsFound > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4 text-blue-500" /> Web Forums & Blogs
                  <Badge variant="outline" className="text-xs">
                    {sources.webForums.resultsFound} results
                  </Badge>
                </h4>
                <div className="space-y-2">
                  {sources.webForums.topResults.map((result, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm border-l-2 border-blue-500/30 pl-3">
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{result.title}</p>
                        <p className="text-xs text-muted-foreground">{result.source}</p>
                      </div>
                      {result.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 shrink-0"
                          onClick={() => window.open(result.url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
