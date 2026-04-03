import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Copy, TrendingUp, Users, Target, AlertCircle, ExternalLink, DollarSign, Shield, Cpu, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CommunityResearchResults } from './CommunityResearchResults';

interface ValidationReportProps {
  opportunityId: string;
  compact?: boolean;
  onViewFullReport?: () => void;
}

export function ValidationReportSimple({ opportunityId, compact = false, onViewFullReport }: ValidationReportProps) {
  const [aiData, setAiData] = useState<any>(null);
  const [workflowData, setWorkflowData] = useState<any>(null);
  const [redditData, setRedditData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadReportData();
  }, [opportunityId]);

  const loadReportData = async () => {
    try {
      // Load all data sources in parallel
      const [aiResult, redditResult, workflowResult] = await Promise.all([
        supabase
          .from('automated_market_intelligence')
          .select('*')
          .eq('opportunity_id', opportunityId)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('reddit_discussions')
          .select('*')
          .eq('opportunity_id', opportunityId)
          .order('relevance_score', { ascending: false })
          .limit(10),
        supabase
          .from('validation_workflows')
          .select('automated_validation_results, automated_score, automated_recommendation, reddit_validation_results, composite_score, status')
          .eq('opportunity_id', opportunityId)
          .single(),
      ]);

      setAiData(aiResult.data?.[0] || null);
      setRedditData(redditResult.data || []);
      setWorkflowData(workflowResult.data || null);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get AI results from either automated_market_intelligence or workflow fallback
  const getAiResults = () => {
    if (aiData) return aiData;
    if (workflowData?.automated_validation_results) {
      return {
        ...workflowData.automated_validation_results,
        confidence_score: workflowData.automated_score || 0,
      };
    }
    return null;
  };

  // Get community data from reddit_discussions or workflow fallback
  const getCommunityData = () => {
    if (redditData.length > 0) return { type: 'discussions' as const, data: redditData };
    if (workflowData?.reddit_validation_results?.analysis) {
      return { type: 'analysis' as const, data: workflowData.reddit_validation_results };
    }
    return null;
  };

  const effectiveAi = getAiResults();
  const communityResult = getCommunityData();

  const getOverallScore = () => {
    if (workflowData?.composite_score) return workflowData.composite_score;

    const aiScore = effectiveAi?.confidence_score || 0;
    const redditScore = redditData.length > 0
      ? Math.round(redditData.reduce((sum, d) => sum + (d.relevance_score || 0), 0) / redditData.length)
      : 0;

    return Math.round((aiScore * 0.6) + (redditScore * 0.4)) || aiScore;
  };

  const getStatusColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusText = (score: number) => {
    if (score >= 70) return 'Ready to Build';
    if (score >= 50) return 'Needs Focus';
    return 'Needs Validation';
  };

  const copyReport = () => {
    const overallScore = getOverallScore();
    const ai = effectiveAi;

    const markdown = `# Validation Report

## Executive Summary
- **Overall Score**: ${overallScore}/100
- **Status**: ${getStatusText(overallScore)}
- **AI Market Score**: ${ai?.confidence_score || 0}/100
- **Community Validation**: ${redditData.length} discussions analyzed

## Market Intelligence
${ai ? `
### Market Size
- TAM: ${ai.market_sizing?.tamEstimate?.value ? `$${(ai.market_sizing.tamEstimate.value / 1000000).toFixed(1)}M` : ai.market_sizing?.tamEstimate || 'N/A'}
- SAM: ${ai.market_sizing?.samEstimate?.value ? `$${(ai.market_sizing.samEstimate.value / 1000000).toFixed(1)}M` : ai.market_sizing?.samEstimate || 'N/A'}

### Competitive Landscape
${ai.competitor_analysis?.directCompetitors?.map((comp: any) => `- **${comp.name}**: ${comp.description}`).join('\n') || ai.competitorAnalysis?.directCompetitors?.map((comp: any) => `- **${comp.name}**: ${comp.description}`).join('\n') || 'No competitor data available'}

### Key Insights
${ai.trends_analysis?.industryTrends?.map((trend: string) => `- ${trend}`).join('\n') || ai.trendsAnalysis?.industryTrends?.map((trend: string) => `- ${trend}`).join('\n') || 'No trend data available'}
` : 'No AI analysis data available'}

## Community Signals
${redditData.length > 0 ? `
### Top Discussions
${redditData.slice(0, 5).map(d => `- **${d.title}** (Score: ${d.relevance_score}/100)
  - Subreddit: r/${d.subreddit}
  - Comments: ${d.num_comments}
`).join('\n')}
` : 'No community discussions found'}

${workflowData?.automated_recommendation ? `## AI Recommendation\n${workflowData.automated_recommendation}` : ''}
`;

    navigator.clipboard.writeText(markdown);
    toast({
      title: "Report copied",
      description: "Validation report copied to clipboard as Markdown"
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-48 bg-muted rounded-lg"></div>
          <div className="h-48 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  const overallScore = getOverallScore();
  const hasAnyData = effectiveAi || communityResult;

  // Helper to safely access nested AI fields (handles both table and workflow shapes)
  const getCompetitors = () =>
    effectiveAi?.competitor_analysis?.directCompetitors ||
    effectiveAi?.competitorAnalysis?.directCompetitors ||
    [];
  const getMarketSizing = () => effectiveAi?.market_sizing || effectiveAi?.marketSizing;
  const getTrends = () =>
    effectiveAi?.trends_analysis?.industryTrends ||
    effectiveAi?.trendsAnalysis?.industryTrends ||
    [];
  const getSwot = () => effectiveAi?.swot_analysis || effectiveAi?.swotAnalysis;
  const getCustomerValidation = () => effectiveAi?.customerValidation;
  const getFinancialValidation = () => effectiveAi?.financialValidation;
  const getTechnicalValidation = () => effectiveAi?.technicalValidation;

  // Safely convert any value to a renderable string
  const toStr = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
      // Common patterns from LLM responses
      if (val.description) return String(val.description);
      if (val.text) return String(val.text);
      if (val.name) return String(val.name);
      if (val.trend) return String(val.trend);
      if (val.summary) return String(val.summary);
      if (val.value) return String(val.value);
      return JSON.stringify(val);
    }
    return String(val);
  };

  if (compact) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Validation Summary
              </span>
              {onViewFullReport && (
                <Button onClick={onViewFullReport} variant="outline" size="sm">
                  View Full Report
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className={`text-2xl font-bold ${getStatusColor(overallScore)}`}>
                  {overallScore}/100
                </div>
                <p className="text-xs text-muted-foreground">Overall Score</p>
              </div>
              <div>
                <Badge
                  variant={overallScore >= 70 ? "default" : overallScore >= 50 ? "secondary" : "destructive"}
                  className="text-xs"
                >
                  {getStatusText(overallScore)}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Status</p>
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {redditData.length}
                </div>
                <p className="text-xs text-muted-foreground">Discussions</p>
              </div>
            </div>

            {effectiveAi && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium mb-2">Key Insights</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {getMarketSizing()?.tamEstimate && (
                    <div>
                      <span className="text-muted-foreground">Market Size:</span>{' '}
                      {typeof getMarketSizing().tamEstimate === 'object'
                        ? `$${(getMarketSizing().tamEstimate.value / 1000000).toFixed(1)}M TAM`
                        : getMarketSizing().tamEstimate}
                    </div>
                  )}
                  {getCompetitors().length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Competitors:</span>{' '}
                      {getCompetitors().length} identified
                    </div>
                  )}
                </div>
              </div>
            )}

            {redditData.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium mb-2">Top Community Discussions</h4>
                <div className="space-y-2">
                  {redditData.slice(0, 3).map((discussion) => (
                    <div key={discussion.id} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{discussion.title}</div>
                        <div className="text-muted-foreground">
                          r/{discussion.subreddit} • {discussion.num_comments} comments
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {discussion.relevance_score}/100
                        </Badge>
                        {discussion.permalink && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(`https://reddit.com${discussion.permalink}`, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Executive Summary
          </CardTitle>
          <Button onClick={copyReport} variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Copy Report
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getStatusColor(overallScore)}`}>
                {overallScore}/100
              </div>
              <p className="text-sm text-muted-foreground">Overall Score</p>
            </div>
            <div className="text-center">
              <Badge
                variant={overallScore >= 70 ? "default" : overallScore >= 50 ? "secondary" : "destructive"}
                className="text-sm"
              >
                {getStatusText(overallScore)}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">Status</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">
                {effectiveAi?.confidence_score || 0}/100
              </div>
              <p className="text-sm text-muted-foreground">AI Confidence</p>
            </div>
          </div>

          {/* AI Recommendation */}
          {workflowData?.automated_recommendation && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold mb-2 text-sm">AI Recommendation</h4>
              <div className="text-sm whitespace-pre-line">
                {workflowData.automated_recommendation}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Market Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Intelligence
            {effectiveAi?.confidence_score && (
              <Badge variant="outline">{effectiveAi.confidence_score}/100</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {effectiveAi ? (
            <div className="space-y-5">
              {/* Market Sizing */}
              {getMarketSizing() && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Market Size
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {getMarketSizing().tamEstimate && (
                      <div>
                        <span className="text-muted-foreground">TAM:</span>{' '}
                        {typeof getMarketSizing().tamEstimate === 'object'
                          ? (getMarketSizing().tamEstimate.value
                              ? `$${(getMarketSizing().tamEstimate.value / 1000000).toFixed(1)}M`
                              : getMarketSizing().tamEstimate.description || 'N/A')
                          : getMarketSizing().tamEstimate}
                      </div>
                    )}
                    {getMarketSizing().samEstimate && (
                      <div>
                        <span className="text-muted-foreground">SAM:</span>{' '}
                        {typeof getMarketSizing().samEstimate === 'object'
                          ? (getMarketSizing().samEstimate.value
                              ? `$${(getMarketSizing().samEstimate.value / 1000000).toFixed(1)}M`
                              : getMarketSizing().samEstimate.description || 'N/A')
                          : getMarketSizing().samEstimate}
                      </div>
                    )}
                    {getMarketSizing().somEstimate && (
                      <div>
                        <span className="text-muted-foreground">SOM:</span>{' '}
                        {typeof getMarketSizing().somEstimate === 'object'
                          ? (getMarketSizing().somEstimate.value
                              ? `$${(getMarketSizing().somEstimate.value / 1000000).toFixed(1)}M`
                              : getMarketSizing().somEstimate.description || 'N/A')
                          : getMarketSizing().somEstimate}
                      </div>
                    )}
                  </div>
                  {getMarketSizing().marketGrowthRate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Growth: {typeof getMarketSizing().marketGrowthRate === 'object'
                        ? getMarketSizing().marketGrowthRate.description || `${(getMarketSizing().marketGrowthRate.annual * 100).toFixed(0)}% annually`
                        : getMarketSizing().marketGrowthRate}
                    </p>
                  )}
                </div>
              )}

              {/* Competitors */}
              {getCompetitors().length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Key Competitors
                  </h4>
                  <div className="space-y-2">
                    {getCompetitors().slice(0, 5).map((comp: any, idx: number) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{toStr(comp.name || comp)}:</span>{' '}
                        <span className="text-muted-foreground">{toStr(comp.description)}</span>
                        {comp.strengths?.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1 ml-4">
                            Strengths: {comp.strengths.map(toStr).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trends */}
              {getTrends().length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Market Trends</h4>
                  <ul className="space-y-1 text-sm">
                    {getTrends().slice(0, 4).map((trend: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        {toStr(trend)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SWOT */}
              {getSwot() && (
                <div>
                  <h4 className="font-semibold mb-2">SWOT Analysis</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {getSwot().strengths?.length > 0 && (
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <div className="font-medium text-green-700 dark:text-green-400 mb-1">Strengths</div>
                        <ul className="space-y-1">
                          {getSwot().strengths.slice(0, 3).map((s: any, i: number) => (
                            <li key={i} className="text-xs">{toStr(s)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {getSwot().weaknesses?.length > 0 && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <div className="font-medium text-red-700 dark:text-red-400 mb-1">Weaknesses</div>
                        <ul className="space-y-1">
                          {getSwot().weaknesses.slice(0, 3).map((w: any, i: number) => (
                            <li key={i} className="text-xs">{toStr(w)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {getSwot().opportunities?.length > 0 && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <div className="font-medium text-blue-700 dark:text-blue-400 mb-1">Opportunities</div>
                        <ul className="space-y-1">
                          {getSwot().opportunities.slice(0, 3).map((o: any, i: number) => (
                            <li key={i} className="text-xs">{toStr(o)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {getSwot().threats?.length > 0 && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                        <div className="font-medium text-yellow-700 dark:text-yellow-400 mb-1">Threats</div>
                        <ul className="space-y-1">
                          {getSwot().threats.slice(0, 3).map((t: any, i: number) => (
                            <li key={i} className="text-xs">{toStr(t)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Validation */}
              {getCustomerValidation() && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Customer Validation
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    {getCustomerValidation().painPointIntensity != null && (
                      <div>
                        <span className="text-muted-foreground">Pain Intensity:</span>{' '}
                        <span className="font-medium">{getCustomerValidation().painPointIntensity}/100</span>
                      </div>
                    )}
                    {getCustomerValidation().solutionFit != null && (
                      <div>
                        <span className="text-muted-foreground">Solution Fit:</span>{' '}
                        <span className="font-medium">{getCustomerValidation().solutionFit}/100</span>
                      </div>
                    )}
                    {getCustomerValidation().willingnessToPay != null && (
                      <div>
                        <span className="text-muted-foreground">Willingness to Pay:</span>{' '}
                        <span className="font-medium">{getCustomerValidation().willingnessToPay}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financial & Technical */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getFinancialValidation() && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Financial
                    </h4>
                    <div className="space-y-1 text-sm">
                      {getFinancialValidation().revenueModel && (
                        <div><span className="text-muted-foreground">Model:</span> {typeof getFinancialValidation().revenueModel === 'object' ? getFinancialValidation().revenueModel.type : getFinancialValidation().revenueModel}</div>
                      )}
                      {getFinancialValidation().breakEvenAnalysis && (
                        <div><span className="text-muted-foreground">Break-even:</span> {typeof getFinancialValidation().breakEvenAnalysis === 'object' ? getFinancialValidation().breakEvenAnalysis.timeline || getFinancialValidation().breakEvenAnalysis.description : `${getFinancialValidation().breakEvenAnalysis} months`}</div>
                      )}
                      {getFinancialValidation().profitabilityTimeline && (
                        <div><span className="text-muted-foreground">Profitability:</span> {typeof getFinancialValidation().profitabilityTimeline === 'object' ? getFinancialValidation().profitabilityTimeline.description : `${getFinancialValidation().profitabilityTimeline} months`}</div>
                      )}
                    </div>
                  </div>
                )}
                {getTechnicalValidation() && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      Technical
                    </h4>
                    <div className="space-y-1 text-sm">
                      {getTechnicalValidation().technicalComplexity != null && (
                        <div><span className="text-muted-foreground">Complexity:</span> {getTechnicalValidation().technicalComplexity}/100</div>
                      )}
                      {getTechnicalValidation().developmentTimeline && (
                        <div><span className="text-muted-foreground">Dev Time:</span> {typeof getTechnicalValidation().developmentTimeline === 'object' ? getTechnicalValidation().developmentTimeline.description : `${getTechnicalValidation().developmentTimeline} months`}</div>
                      )}
                      {getTechnicalValidation().mvpFeasibility && (
                        <div><span className="text-muted-foreground">MVP:</span> {typeof getTechnicalValidation().mvpFeasibility === 'object' ? getTechnicalValidation().mvpFeasibility.assessment || getTechnicalValidation().mvpFeasibility.description : getTechnicalValidation().mvpFeasibility}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertCircle className="h-4 w-4" />
              AI analysis did not return data. Try re-running validation from above.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Community Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Community Signals
            {redditData.length > 0 && (
              <Badge variant="outline">{redditData.length} discussions</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {communityResult?.type === 'discussions' ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Top Discussions</h4>
                <div className="space-y-3">
                   {redditData.slice(0, 5).map((discussion) => (
                     <div key={discussion.id} className="border-l-2 border-muted pl-3">
                       <div className="flex items-start justify-between gap-2">
                         <div className="flex-1 min-w-0">
                           <h5 className="font-medium text-sm line-clamp-2">{discussion.title}</h5>
                           <div className="text-xs text-muted-foreground mt-1">
                             r/{discussion.subreddit} • {discussion.num_comments} comments
                           </div>
                         </div>
                         <div className="flex items-center gap-1">
                           <Badge variant="outline" className="text-xs">
                             {discussion.relevance_score}/100
                           </Badge>
                           {discussion.permalink && (
                             <Button
                               variant="ghost"
                               size="sm"
                               className="h-6 w-6 p-0"
                               onClick={() => window.open(`https://reddit.com${discussion.permalink}`, '_blank')}
                             >
                               <ExternalLink className="h-3 w-3" />
                             </Button>
                           )}
                         </div>
                       </div>
                     </div>
                   ))}
                </div>
              </div>

              {redditData.some(d => d.pain_points_extracted?.length > 0) && (
                <div>
                  <h4 className="font-semibold mb-2">Pain Points Identified</h4>
                  <ul className="space-y-1 text-sm">
                    {redditData
                      .flatMap(d => d.pain_points_extracted || [])
                      .slice(0, 5)
                      .map((point: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          {point}
                        </li>
                      ))
                    }
                  </ul>
                </div>
              )}
            </div>
          ) : communityResult?.type === 'analysis' ? (
            <CommunityResearchResults
              analysis={communityResult.data.analysis}
              sources={communityResult.data.sources || { hackerNews: { storiesFound: 0, commentsFound: 0, topStories: [] }, reddit: { postsFound: 0, subredditsSearched: [], hasApiAccess: false, topPosts: [] } }}
              researchScore={communityResult.data.researchScore || 0}
              totalDataPoints={communityResult.data.totalDataPoints || 0}
            />
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertCircle className="h-4 w-4" />
              No community discussions found for this opportunity.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
