import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Search, Rocket, ArrowRight, TrendingUp, Users, DollarSign,
  Cpu, Shield, BarChart3, Target, Brain, Copy, Play, RotateCcw,
  Loader2, CheckCircle, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CommunityResearchResults } from './CommunityResearchResults';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ValidationSignalsProps {
  opportunity: any;
  onSignalsComplete?: (result: any) => void;
  initialResults?: any;
  validationStatus?: any;
}

// ── Topic-specific subreddit + query generator ────────────────────────────────
// Ensures we search WHERE the actual target users are, not generic startup subs
function getTopicSearchPlan(opportunity: any): { queries: string[]; subreddits: string[] } {
  const text = `${opportunity.title} ${opportunity.description} ${opportunity.target_market} ${opportunity.problem_statement}`.toLowerCase();

  const domainMap: [RegExp, string[]][] = [
    [/postpartum|maternal|new mom|new mother|after birth|breastfeed|newborn|baby|infant/, ['BabyBumps', 'NewParents', 'breastfeeding', 'Mommit', 'beyondthebump', 'postpartum', 'NewMoms', 'Parenting']],
    [/nutrition|meal plan|diet|food prep|recipe|calorie|eating/, ['nutrition', 'MealPrepSunday', 'EatCheapAndHealthy', 'loseit', 'HealthyFood', 'Cooking']],
    [/fitness|workout|gym|exercise|weight loss|running|lifting/, ['fitness', 'loseit', 'xxfitness', 'running', 'bodyweightfitness', 'gym']],
    [/mental health|anxiety|depression|therapy|stress|burnout/, ['mentalhealth', 'anxiety', 'depression', 'therapy', 'selfimprovement']],
    [/sleep|insomnia|tired|fatigue/, ['sleep', 'insomnia', 'selfimprovement']],
    [/email|inbox|reply|outreach|communication/, ['productivity', 'lifehacks', 'GMail', 'Outlook', 'selfimprovement']],
    [/productivity|workflow|time management|task|planner|organize/, ['productivity', 'getting_things_done', 'selfimprovement', 'LifeProTips', 'ADHD']],
    [/ai tool|ai assistant|chatgpt|llm|machine learning|automation/, ['MachineLearning', 'ChatGPT', 'LocalLLaMA', 'AIAssistants', 'artificial']],
    [/\bsaas\b|software product|software platform|developer tool|web app|mobile app for business/, ['SaaS', 'software', 'ProductManagement', 'webdev']],
    [/coding|programming|developer|engineer/, ['programming', 'webdev', 'learnprogramming', 'cscareerquestions']],
    [/ecommerce|shopify|amazon seller|dropship|online store/, ['ecommerce', 'shopify', 'FulfillmentByAmazon', 'dropship']],
    [/finance|investment|money|budget|savings|debt|frugal/, ['personalfinance', 'investing', 'financialindependence', 'povertyfinance']],
    [/real estate|property|rental|landlord|housing/, ['realestateinvesting', 'RealEstate', 'landlord', 'FirstTimeHomeBuyer']],
    [/education|learning|course|student|teacher|school/, ['Teachers', 'StudentLoans', 'OnlineLearning', 'learnprogramming']],
    [/language learning|translation|multilingual/, ['languagelearning', 'linguistics', 'translation', 'polyglot']],
    [/\bpet\b|\bdog\b|\bcat\b|veterinary|animal care|dog training|cat care/, ['dogs', 'cats', 'Pets', 'DogAdvice', 'AskVet', 'Dogtraining', 'puppy101']],
    [/travel|trip|vacation|backpacking|digital nomad|budget travel|hostel|cheap flight/, ['travel', 'solotravel', 'digitalnomad', 'shoestring', 'TravelHacks', 'backpacking']],
    [/home improvement|interior|decor|renovation|diy/, ['homeimprovement', 'DIY', 'HomeDecorating']],
    [/freelance|consultant|solopreneur|gig work/, ['freelance', 'consulting', 'digitalnomad']],
    [/marketing|seo|content marketing|social media|growth/, ['marketing', 'SEO', 'content_marketing', 'digital_marketing']],
    [/hr|hiring|recruiting|employee|talent acquisition/, ['humanresources', 'recruiting', 'jobs', 'careerguidance']],
    [/startup|founder|entrepreneur|bootstrapped|side project/, ['Entrepreneur', 'startups', 'SideProject', 'indiehackers']],
  ];

  const matchedSubs: string[] = [];
  for (const [pattern, subs] of domainMap) {
    if (pattern.test(text)) matchedSubs.push(...subs);
  }

  const uniqueSubs = [...new Set(matchedSubs)];
  const subreddits = uniqueSubs.length > 0
    ? uniqueSubs.slice(0, 10)
    : ['Entrepreneur', 'startups', 'smallbusiness']; // last resort fallback

  // Generate specific queries based on opportunity details
  const title = opportunity.title || '';
  const targetMarket = opportunity.target_market || '';
  const problem = opportunity.problem_statement || '';

  const queries = [
    title,
    `${targetMarket} problems with ${title.split(' ').slice(0, 3).join(' ')}`,
    `${title} alternative recommendation`,
    `${targetMarket} frustrated with`,
    problem.split('.')[0].slice(0, 80),
    `best app for ${targetMarket}`,
    `${title} reviews`,
    ...(opportunity.opportunity_tags || []).slice(0, 2),
  ].filter(Boolean).filter(q => q.length > 5).slice(0, 8);

  return { queries, subreddits };
}

export function SimplifiedValidationSignals({
  opportunity,
  onSignalsComplete,
  initialResults,
  validationStatus,
}: ValidationSignalsProps) {
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState<any>(initialResults || null);
  const [researchData, setResearchData] = useState<any>(null);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [discussionSummary, setDiscussionSummary] = useState<any>(null);
  const [aiData, setAiData] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialResults && !results) setResults(initialResults);
  }, [initialResults, results]);

  React.useEffect(() => {
    if (opportunity?.id) loadPersistedData();
  }, [opportunity?.id]);

  // Merge AI data from two sources:
  //   - tableRow: automated_market_intelligence (snake_case, 5 analyses)
  //   - workflowAi: validation_workflows.automated_validation_results (camelCase, 9 analyses)
  // Both can be null. Result has both key conventions so accessors always find data.
  const mergeAiSources = (tableRow: any, workflowAi: any): any => {
    const merged = { ...(workflowAi || {}), ...(tableRow || {}) };
    // Table snake_case fields take precedence when both exist
    if (tableRow) {
      for (const key of ['competitor_analysis', 'market_sizing', 'pricing_research', 'trends_analysis', 'swot_analysis', 'confidence_score']) {
        if (tableRow[key] != null) merged[key] = tableRow[key];
      }
    }
    return merged;
  };

  const loadPersistedData = async () => {
    try {
      const [workflowRes, aiRes] = await Promise.all([
        supabase
          .from('validation_workflows')
          .select('reddit_validation_results, automated_validation_results, automated_score, automated_recommendation')
          .eq('opportunity_id', opportunity.id)
          .single(),
        supabase
          .from('automated_market_intelligence')
          .select('*')
          .eq('opportunity_id', opportunity.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      // DB defaults JSONB to '{}' — must reject empty objects
      const hasData = (obj: any) => obj != null && typeof obj === 'object' && Object.keys(obj).length > 0;

      const redditResults = workflowRes.data?.reddit_validation_results;
      if (hasData(redditResults) && redditResults.analysis) {
        setResearchData(redditResults);
      }
      // Also load previously saved Reddit discussions
      if (opportunity?.id) {
        supabase
          .from('reddit_discussions')
          .select('post_id,title,subreddit,score,num_comments,author,permalink,relevance_score,engagement_metrics,pain_points_extracted')
          .eq('opportunity_id', opportunity.id)
          .order('score', { ascending: false })
          .limit(20)
          .then(({ data }) => { if (data?.length) setDiscussions(data); });
      }
      if (workflowRes.data?.automated_recommendation) {
        setRecommendation(workflowRes.data.automated_recommendation);
      }

      const ai = aiRes.data?.[0] || null;
      const rawWorkflowAi = workflowRes.data?.automated_validation_results;
      const workflowAi = hasData(rawWorkflowAi) ? rawWorkflowAi : null;
      const workflowScore = workflowRes.data?.automated_score || 0;

      const hasRealAiData = ai && (ai.competitor_analysis || ai.market_sizing || ai.swot_analysis);
      const hasRealWorkflowAi = workflowAi && (workflowAi.competitorAnalysis || workflowAi.marketSizing || workflowAi.swotAnalysis);

      if (hasRealAiData || hasRealWorkflowAi) {
        const merged = mergeAiSources(hasRealAiData ? ai : null, workflowAi);
        const dbScore = ai?.confidence_score > 0 ? ai.confidence_score : workflowScore;
        const clientScore = computeClientScore(merged);
        const effectiveScore = dbScore > 0 ? dbScore : (clientScore > 0 ? clientScore : 0);
        setAiData({ ...merged, confidence_score: effectiveScore });
      }
    } catch (e) {
      // No persisted data
    }
  };

  const runAllSignals = async () => {
    if (!opportunity?.id) return;

    setIsRunning(true);
    setProgress(0);
    setCurrentStep('Starting validation...');

    await supabase
      .from('business_opportunities')
      .update({ validation_status: 'in_progress' })
      .eq('id', opportunity.id);

    try {
      setCurrentStep('Running AI market analysis...');
      setProgress(15);

      const aiResponse = await supabase.functions.invoke('run-automated-validation', {
        body: {
          opportunityId: opportunity.id,
          title: opportunity.title,
          description: opportunity.description,
          targetMarket: opportunity.target_market,
          problemStatement: opportunity.problem_statement
        }
      });

      if (aiResponse.error) {
        console.error('AI analysis error:', aiResponse.error);
      } else if (aiResponse.data) {
        setRecommendation(aiResponse.data.recommendation || null);
        // Reload AI data from DB after write
        const { data: freshAi } = await supabase
          .from('automated_market_intelligence')
          .select('*')
          .eq('opportunity_id', opportunity.id)
          .order('created_at', { ascending: false })
          .limit(1);
        const responseResults = aiResponse.data.results || {};
        // Merge table row (5 snake_case fields) with response (9 camelCase fields)
        const merged = mergeAiSources(freshAi?.[0] || null, responseResults);
        const dbScore = freshAi?.[0]?.confidence_score || 0;
        const responseScore = aiResponse.data.confidenceScore || 0;
        const clientScore = computeClientScore(merged);
        setAiData({
          ...merged,
          confidence_score: dbScore > 0 ? dbScore : responseScore > 0 ? responseScore : clientScore,
        });
      }

      setCurrentStep('Searching Reddit, HN & forums for real discussions...');
      setProgress(40);

      const searchPlan = getTopicSearchPlan(opportunity);
      console.log('🎯 Topic subreddits:', searchPlan.subreddits.join(', '));

      const researchResponse = await supabase.functions.invoke('validate-opportunity-research', {
        body: {
          opportunityId: opportunity.id,
          title: opportunity.title,
          description: opportunity.description,
          targetMarket: opportunity.target_market,
          problemStatement: opportunity.problem_statement,
          tags: opportunity.opportunity_tags || [],
          // Pass pre-computed topic-specific subreddits so the function doesn't use generic defaults
          subreddits: searchPlan.subreddits,
          queries: searchPlan.queries,
        }
      });

      if (researchResponse.error) {
        console.error('Research agent error:', researchResponse.error);
      } else if (researchResponse.data?.success) {
        setResearchData({
          analysis: researchResponse.data.analysis,
          sources: researchResponse.data.sources,
          researchScore: researchResponse.data.researchScore,
          totalDataPoints: researchResponse.data.totalDataPoints,
          hasRealCommunityData: researchResponse.data.hasRealCommunityData,
          realDataCount: researchResponse.data.realDataCount,
          researchedAt: new Date().toISOString(),
        });
      }

      // Also run reddit-discussion-extractor for direct Reddit posts + AI TLDR
      setCurrentStep('Extracting Reddit discussions...');
      setProgress(65);
      try {
        const extractResponse = await supabase.functions.invoke('reddit-discussion-extractor', {
          body: {
            opportunityId: opportunity.id,
            queries: searchPlan.queries,
            subreddits: searchPlan.subreddits,
            keywords: [
              ...opportunity.title.toLowerCase().split(' ').filter((w: string) => w.length > 3),
              ...(opportunity.opportunity_tags || []),
            ],
          }
        });
        if (extractResponse.data?.success) {
          if (extractResponse.data.discussions?.length) setDiscussions(extractResponse.data.discussions);
          if (extractResponse.data.summary) setDiscussionSummary(extractResponse.data.summary);
        }
      } catch (e) {
        console.warn('Discussion extractor error:', e);
      }

      setCurrentStep('Calculating validation score...');
      setProgress(80);

      const { data: summaryData, error: summaryError } = await supabase.rpc('update_validation_summary', {
        p_opportunity_id: opportunity.id
      });

      if (summaryError) console.error('Summary update error:', summaryError);

      setProgress(100);
      setCurrentStep('Validation complete!');

      const rawAiScore = summaryData?.ai_score ?? aiResponse?.data?.confidenceScore ?? 0;
      const clientAiScore = computeClientScore(aiResponse?.data?.results || null);
      const aiScore = rawAiScore > 0 ? rawAiScore : clientAiScore;
      const researchScore = researchResponse?.data?.researchScore ?? summaryData?.reddit_score ?? 0;
      const compositeScore = summaryData?.composite_score ||
        Math.round((aiScore * 0.6) + (researchScore * 0.4)) || aiScore || 1;

      const finalResults = {
        composite_score: compositeScore,
        ai_score: aiScore,
        reddit_score: researchScore,
        status: summaryData?.status || (compositeScore >= 70 ? 'ready_to_build' : compositeScore >= 50 ? 'needs_focused_tasks' : 'needs_validation'),
        last_signal_at: summaryData?.last_signal_at || new Date().toISOString(),
      };

      setResults(finalResults);

      await supabase
        .from('business_opportunities')
        .update({ validation_status: 'completed' })
        .eq('id', opportunity.id);

      toast.success('Validation complete!');
      onSignalsComplete?.(finalResults);

    } catch (error) {
      console.error('Error running validation signals:', error);
      toast.error('Failed to complete validation research');
    } finally {
      setIsRunning(false);
    }
  };

  // ── Client-side confidence score calculator (fallback when edge function returns 0) ──
  const computeClientScore = (data: any): number => {
    if (!data) return 0;
    let score = 0;
    let maxScore = 0;

    const extractNum = (val: any): number => {
      if (val == null) return NaN;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const m = val.match(/[\d.]+/);
        return m ? parseFloat(m[0]) : NaN;
      }
      if (typeof val === 'object') {
        for (const k of ['value', 'estimate', 'score', 'months', 'level', 'percentage']) {
          if (val[k] != null) return extractNum(val[k]);
        }
      }
      return NaN;
    };

    const has = (val: any) => val != null && val !== '' && val !== 0;

    // Competitors
    const compData = data.competitor_analysis || data.competitorAnalysis;
    if (compData) {
      maxScore += 15;
      const comps = compData.directCompetitors || [];
      if (comps.length >= 3) score += 15;
      else if (comps.length >= 1) score += 10;
    }

    // Market sizing
    const ms = data.market_sizing || data.marketSizing;
    if (ms) {
      maxScore += 15;
      if (has(ms.tamEstimate)) score += 5;
      if (has(ms.samEstimate)) score += 5;
      if (has(ms.somEstimate)) score += 5;
    }

    // SWOT
    const sw = data.swot_analysis || data.swotAnalysis;
    if (sw) {
      maxScore += 10;
      for (const k of ['strengths', 'weaknesses', 'opportunities', 'threats']) {
        if (sw[k]?.length > 0) score += 2.5;
      }
    }

    // Trends
    const trendsData = data.trends_analysis || data.trendsAnalysis;
    if (trendsData) {
      maxScore += 10;
      const trends = trendsData.industryTrends || [];
      if (trends.length >= 3) score += 10;
      else if (trends.length >= 1) score += 6;
    }

    // Customer validation (only in workflow data, not in automated_market_intelligence table)
    const cv = data.customerValidation;
    if (cv) {
      maxScore += 15;
      const pain = extractNum(cv.painPointIntensity);
      const fit = extractNum(cv.solutionFit);
      const wtp = extractNum(cv.willingnessToPay);
      if (!isNaN(pain)) score += Math.min(5, pain / 20);
      if (!isNaN(fit)) score += Math.min(5, fit / 20);
      if (!isNaN(wtp)) score += Math.min(5, wtp / 20);
      if (!isNaN(pain) || !isNaN(fit) || !isNaN(wtp)) score += 2;
    }

    // Financial validation (only in workflow data)
    const fv = data.financialValidation;
    if (fv) {
      maxScore += 15;
      if (has(fv.revenueModel)) score += 5;
      if (has(fv.breakEvenAnalysis)) score += 3;
      const profitMonths = extractNum(fv.profitabilityTimeline);
      if (!isNaN(profitMonths) && profitMonths <= 24) score += 5;
      else if (!isNaN(profitMonths)) score += 3;
      else if (has(fv.profitabilityTimeline)) score += 2;
    }

    // Technical validation (only in workflow data)
    const tv = data.technicalValidation;
    if (tv) {
      maxScore += 10;
      if (has(tv.developmentTimeline)) score += 3;
      if (has(tv.mvpFeasibility)) score += 3;
      const complexity = extractNum(tv.technicalComplexity);
      if (!isNaN(complexity) && complexity <= 60) score += 4;
      else if (!isNaN(complexity)) score += 2;
    }

    // Pricing
    const pricing = data.pricing_research || data.pricingResearch;
    if (pricing) {
      maxScore += 5;
      score += 5;
    }

    // Community
    const community = data.community_analysis || data.communityValidation;
    if (community) {
      maxScore += 5;
      score += 5;
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  };

  // ── Helpers ──

  const toStr = (val: any): string => {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
      for (const k of ['description', 'text', 'name', 'trend', 'summary', 'value']) {
        if (val[k] && typeof val[k] === 'string') return val[k];
      }
      return JSON.stringify(val);
    }
    return String(val);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800';
    if (score >= 50) return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800';
    return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800';
  };

  const getVerdict = (score: number) => {
    if (score >= 70) return 'Strong Market Signal';
    if (score >= 50) return 'Moderate Signal — Needs Focus';
    return 'Weak Signal — Needs More Research';
  };

  // AI data accessors (handle both table and workflow key shapes)
  const getCompetitors = () => aiData?.competitor_analysis?.directCompetitors || aiData?.competitorAnalysis?.directCompetitors || [];
  const getMarketSizing = () => aiData?.market_sizing || aiData?.marketSizing;
  const getTrends = () => aiData?.trends_analysis?.industryTrends || aiData?.trendsAnalysis?.industryTrends || [];
  const getSwot = () => aiData?.swot_analysis || aiData?.swotAnalysis;
  const getCustomerValidation = () => aiData?.customerValidation;
  const getFinancialValidation = () => aiData?.financialValidation;
  const getTechnicalValidation = () => aiData?.technicalValidation;

  const hasResults = !!(results && results.composite_score != null && results.composite_score > 0);
  const hasAiData = !!aiData;
  const hasCommunityData = !!researchData?.analysis || discussions.length > 0 || !!discussionSummary;

  // Effective scores — use client-side computed score as fallback when DB has 0
  const effectiveAiScore = (results?.ai_score || 0) > 0 ? results.ai_score : (aiData?.confidence_score || 0);
  const rawCommunityScore = researchData?.researchScore || results?.reddit_score || 0;
  // Cap community score when no real data was found (prevents AI-only inflation)
  const effectiveCommunityScore = researchData?.realDataCount === 0
    ? Math.min(5, rawCommunityScore)
    : rawCommunityScore;
  const effectiveOverallScore = (results?.composite_score || 0) > 0
    ? results.composite_score
    : Math.round((effectiveAiScore * 0.6) + (effectiveCommunityScore * 0.4)) || effectiveAiScore || 0;

  // hasResults (set by runAllSignals in this session) always wins.
  // Otherwise, never show as completed for a workflow that hasn't been started.
  const neverStarted = !hasResults &&
    (validationStatus?.status === 'not_started' || validationStatus?.status === 'needs_validation') &&
    !validationStatus?.hasAiValidation && !validationStatus?.hasRedditValidation;
  const isCompleted = !neverStarted && (
    hasResults ||
    !!validationStatus?.hasAiValidation ||
    !!validationStatus?.hasRedditValidation ||
    (hasAiData && aiData?.confidence_score > 0) ||
    (hasAiData && hasCommunityData)
  );

  // ── Copy report ──
  const copyReport = () => {
    const lines = [`# Validation Report: ${opportunity.title}\n`];
    if (hasResults || isCompleted) {
      lines.push(`**Overall Score:** ${effectiveOverallScore}/100 — ${getVerdict(effectiveOverallScore)}`);
      lines.push(`**AI Score:** ${effectiveAiScore}/100 | **Community Score:** ${effectiveCommunityScore}/100\n`);
    }
    if (recommendation) lines.push(`## AI Recommendation\n${recommendation}\n`);
    if (getCompetitors().length > 0) {
      lines.push('## Key Competitors');
      getCompetitors().forEach((c: any) => lines.push(`- **${toStr(c.name || c)}**: ${toStr(c.description)}`));
      lines.push('');
    }
    navigator.clipboard.writeText(lines.join('\n'));
    uiToast({ title: 'Report copied', description: 'Validation report copied to clipboard' });
  };

  return (
    <div className="space-y-6">

      {/* ── Hero: Title + Score + Action ── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-background border border-primary/20 p-6 md:p-8">
        <div className="relative space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <Badge variant={isCompleted ? 'default' : 'secondary'} className="text-sm font-medium">
                {isCompleted ? 'Validation Complete' : 'Market Validation'}
              </Badge>
              <h2 className="text-xl md:text-2xl font-bold">{opportunity?.title}</h2>
              {isCompleted && (
                <p className="text-sm text-muted-foreground">
                  AI analysis + community research results below.
                </p>
              )}
            </div>
            {(hasResults || (isCompleted && effectiveOverallScore > 0)) && (
              <div className="text-right flex-shrink-0">
                <div className={`text-3xl font-bold ${getScoreColor(effectiveOverallScore)}`}>
                  {effectiveOverallScore}%
                </div>
                <div className="text-xs text-muted-foreground">{getVerdict(effectiveOverallScore)}</div>
              </div>
            )}
          </div>

          {/* Step indicators */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Zap, text: 'AI analysis', done: !!validationStatus?.hasAiValidation || hasAiData },
              { icon: Users, text: 'Community research', done: !!validationStatus?.hasRedditValidation || hasCommunityData },
              { icon: TrendingUp, text: 'Scoring', done: isCompleted && hasResults },
            ].map((f, i) => (
              <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                f.done ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-background/50 border-border/50'
              }`}>
                {f.done ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> : <f.icon className="h-4 w-4 text-muted-foreground shrink-0" />}
                <span className={`text-xs md:text-sm font-medium ${f.done ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Action button */}
          <div className="flex items-center gap-3">
            {isCompleted ? (
              <Button onClick={runAllSignals} disabled={isRunning} size="sm" variant="ghost" className="text-muted-foreground">
                {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                {isRunning ? 'Running...' : 'Re-run Validation'}
              </Button>
            ) : (
              <Button onClick={runAllSignals} disabled={isRunning} size="lg">
                {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                {isRunning ? 'Running Analysis...' : 'Run Validation'}
              </Button>
            )}
            {isCompleted && (
              <Button onClick={copyReport} variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy Report
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Progress bar ── */}
      {isRunning && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-primary animate-pulse" />
                <span className="text-sm font-medium">{currentStep}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Score Breakdown (only once) ── */}
      {(hasResults || (isCompleted && effectiveOverallScore > 0)) && (
        <div className="grid grid-cols-3 gap-3">
          <Card className={`border ${getScoreBg(effectiveOverallScore)}`}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl md:text-3xl font-bold ${getScoreColor(effectiveOverallScore)}`}>{effectiveOverallScore}%</div>
              <div className="text-xs text-muted-foreground mt-1">Overall</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl md:text-3xl font-bold ${getScoreColor(effectiveAiScore)}`}>
                {effectiveAiScore}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">AI Analysis</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl md:text-3xl font-bold ${getScoreColor(effectiveCommunityScore)}`}>
                {effectiveCommunityScore}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">Community</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── AI Recommendation ── */}
      {recommendation && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold mb-2">AI Recommendation</h3>
                <div className="text-sm whitespace-pre-line">{recommendation}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── AI Market Intelligence ── */}
      {hasAiData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Market Intelligence
              {aiData.confidence_score != null && <Badge variant="outline">{aiData.confidence_score}/100</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Market Sizing */}
            {getMarketSizing() && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4" /> Market Size
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {getMarketSizing().tamEstimate && (
                    <div>
                      <span className="text-muted-foreground">TAM:</span>{' '}
                      {typeof getMarketSizing().tamEstimate === 'object'
                        ? (getMarketSizing().tamEstimate.value ? `$${(getMarketSizing().tamEstimate.value / 1e6).toFixed(1)}M` : toStr(getMarketSizing().tamEstimate))
                        : toStr(getMarketSizing().tamEstimate)}
                    </div>
                  )}
                  {getMarketSizing().samEstimate && (
                    <div>
                      <span className="text-muted-foreground">SAM:</span>{' '}
                      {typeof getMarketSizing().samEstimate === 'object'
                        ? (getMarketSizing().samEstimate.value ? `$${(getMarketSizing().samEstimate.value / 1e6).toFixed(1)}M` : toStr(getMarketSizing().samEstimate))
                        : toStr(getMarketSizing().samEstimate)}
                    </div>
                  )}
                  {getMarketSizing().somEstimate && (
                    <div>
                      <span className="text-muted-foreground">SOM:</span>{' '}
                      {typeof getMarketSizing().somEstimate === 'object'
                        ? (getMarketSizing().somEstimate.value ? `$${(getMarketSizing().somEstimate.value / 1e6).toFixed(1)}M` : toStr(getMarketSizing().somEstimate))
                        : toStr(getMarketSizing().somEstimate)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Competitors */}
            {getCompetitors().length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4" /> Key Competitors
                </h4>
                <div className="space-y-2">
                  {getCompetitors().slice(0, 5).map((comp: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">{toStr(comp.name || comp)}</span>
                      {comp.description && <span className="text-muted-foreground"> — {toStr(comp.description)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trends */}
            {getTrends().length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm">Market Trends</h4>
                <ul className="space-y-1 text-sm">
                  {getTrends().slice(0, 4).map((t: any, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span> {toStr(t)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SWOT */}
            {getSwot() && (
              <div>
                <h4 className="font-semibold mb-2 text-sm">SWOT</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['strengths', 'weaknesses', 'opportunities', 'threats'].map((key) => {
                    const items = getSwot()[key];
                    if (!items?.length) return null;
                    const colors: Record<string, string> = {
                      strengths: 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400',
                      weaknesses: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400',
                      opportunities: 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400',
                      threats: 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400',
                    };
                    return (
                      <div key={key} className={`p-3 rounded-lg ${colors[key]}`}>
                        <div className="font-medium capitalize mb-1">{key}</div>
                        <ul className="space-y-0.5">
                          {items.slice(0, 3).map((s: any, i: number) => <li key={i}>{toStr(s)}</li>)}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Customer + Financial + Technical in a compact grid */}
            {(getCustomerValidation() || getFinancialValidation() || getTechnicalValidation()) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                {getCustomerValidation() && (
                  <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-1 text-sm">
                      <Users className="h-3.5 w-3.5" /> Customer
                    </h4>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {getCustomerValidation().painPointIntensity != null && <div>Pain intensity: <span className="text-foreground font-medium">{getCustomerValidation().painPointIntensity}/100</span></div>}
                      {getCustomerValidation().solutionFit != null && <div>Solution fit: <span className="text-foreground font-medium">{getCustomerValidation().solutionFit}/100</span></div>}
                      {getCustomerValidation().willingnessToPay != null && <div>Willingness to pay: <span className="text-foreground font-medium">{getCustomerValidation().willingnessToPay}%</span></div>}
                    </div>
                  </div>
                )}
                {getFinancialValidation() && (
                  <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-1 text-sm">
                      <DollarSign className="h-3.5 w-3.5" /> Financial
                    </h4>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {getFinancialValidation().revenueModel && <div>Model: <span className="text-foreground font-medium">{toStr(getFinancialValidation().revenueModel)}</span></div>}
                      {getFinancialValidation().breakEvenAnalysis && <div>Break-even: <span className="text-foreground font-medium">{toStr(getFinancialValidation().breakEvenAnalysis)}</span></div>}
                      {getFinancialValidation().profitabilityTimeline && <div>Profitability: <span className="text-foreground font-medium">{toStr(getFinancialValidation().profitabilityTimeline)}</span></div>}
                    </div>
                  </div>
                )}
                {getTechnicalValidation() && (
                  <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-1 text-sm">
                      <Cpu className="h-3.5 w-3.5" /> Technical
                    </h4>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {getTechnicalValidation().technicalComplexity != null && <div>Complexity: <span className="text-foreground font-medium">{getTechnicalValidation().technicalComplexity}/100</span></div>}
                      {getTechnicalValidation().developmentTimeline && <div>Dev time: <span className="text-foreground font-medium">{toStr(getTechnicalValidation().developmentTimeline)}</span></div>}
                      {getTechnicalValidation().mvpFeasibility && <div>MVP: <span className="text-foreground font-medium">{toStr(getTechnicalValidation().mvpFeasibility)}</span></div>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Community Research (real data from Reddit, HN, forums) ── */}
      {hasCommunityData && (
        <CommunityResearchResults
          // New GigaBrain-style fields (from reddit-discussion-extractor)
          summary={discussionSummary ?? undefined}
          discussions={discussions}
          discussionsFound={discussions.length || researchData?.sources?.reddit?.postsFound}
          // Legacy deep-analysis fields (from validate-opportunity-research)
          analysis={researchData?.analysis}
          sources={researchData?.sources}
          researchScore={researchData?.researchScore}
          totalDataPoints={researchData?.totalDataPoints}
          hasRealCommunityData={researchData?.hasRealCommunityData}
        />
      )}

      {/* ── Build CTA ── */}
      {isCompleted && effectiveOverallScore >= 50 && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Rocket className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-900 dark:text-green-300">Ready to build?</div>
                  <div className="text-sm text-green-700 dark:text-green-400">
                    Scored {effectiveOverallScore}% — market signal is strong enough to move forward
                  </div>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate(`/build?from=opportunity&id=${opportunity.id}`)}>
                Build <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
