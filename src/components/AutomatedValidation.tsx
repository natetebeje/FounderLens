import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Brain, 
  BarChart3, 
  Users, 
  Target, 
  DollarSign, 
  Wrench, 
  TrendingUp, 
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  Info,
  PieChart,
  Calculator
} from 'lucide-react';
import { CommunityIntelligence } from './CommunityIntelligence';
import { DataSourceBadge } from './DataSourceBadge';
import { DataConfidenceBadge } from './DataConfidenceBadge';

interface AutomatedValidationProps {
  opportunity: any;
  workflow: any;
  onValidationComplete: () => void;
}

interface ValidationResults {
  marketSizing?: any;
  competitorAnalysis?: any;
  customerValidation?: any;
  customerDemand?: any;
  financialValidation?: any;
  technicalValidation?: any;
  trendsAnalysis?: any;
  riskAssessment?: any;
  _metadata?: {
    isOpportunitySpecific: boolean;
    analysisRelevance: string;
    lastAnalyzed: string;
    inputData: any;
    scoreBreakdown?: any;
    confidenceLevel?: string;
    riskProfile?: string;
  };
}

const AutomatedValidation = ({ opportunity, workflow, onValidationComplete }: AutomatedValidationProps) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);
  const [validationScore, setValidationScore] = useState<number>(0);
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null);
  const [lastValidated, setLastValidated] = useState<string | null>(null);
  const { toast } = useToast();

  // Helper function to check if validation results contain meaningful data
  const hasMeaningfulValidationData = (results: ValidationResults | null): boolean => {
    if (!results) return false;
    
    // Check if any of the main validation sections contain data
    const hasMarketSizing = results.marketSizing && Object.keys(results.marketSizing).length > 0;
    const hasCompetitorAnalysis = results.competitorAnalysis && Object.keys(results.competitorAnalysis).length > 0;
    const hasCustomerValidation = results.customerValidation && Object.keys(results.customerValidation).length > 0;
    const hasFinancialValidation = results.financialValidation && Object.keys(results.financialValidation).length > 0;
    const hasTechnicalValidation = results.technicalValidation && Object.keys(results.technicalValidation).length > 0;
    const hasTrendsAnalysis = results.trendsAnalysis && Object.keys(results.trendsAnalysis).length > 0;
    const hasRiskAssessment = results.riskAssessment && Object.keys(results.riskAssessment).length > 0;
    
    return hasMarketSizing || hasCompetitorAnalysis || hasCustomerValidation || 
           hasFinancialValidation || hasTechnicalValidation || hasTrendsAnalysis || hasRiskAssessment;
  };

  useEffect(() => {
    // Load existing validation results if available
    if (workflow?.automated_validation_results) {
      console.log('📊 Loading existing validation results:', workflow.automated_validation_results);
      const results = workflow.automated_validation_results;
      
      // Only set validation results if they contain meaningful data
      if (hasMeaningfulValidationData(results)) {
        setValidationResults(results);
        setValidationScore(workflow.automated_score || 0);
        setScoreBreakdown(results._metadata?.scoreBreakdown);
        setLastValidated(workflow.last_automated_validation);
      }
    }
  }, [workflow]);

  const runAutomatedValidation = async () => {
    if (!opportunity) return;

    // Dispatch start event
    window.dispatchEvent(new CustomEvent('ai-validation-started', { 
      detail: { opportunityId: opportunity.id, title: opportunity.title } 
    }));

    setIsValidating(true);
    console.log('🤖 Starting enhanced automated validation for:', opportunity.title);

    try {
      // Call the enhanced validation edge function with opportunity-specific data
      const { data, error } = await supabase.functions.invoke('enhanced-validation', {
        body: {
          opportunityId: opportunity.id,
          title: opportunity.title,
          description: opportunity.description,
          category: opportunity.category || 'General Business',
          redditAnalysis: opportunity.reddit_analysis || {}
        }
      });

      if (error) {
        console.error('❌ Validation error:', error);
        throw error;
      }

      console.log('✅ Enhanced validation completed:', data);

      // Update local state
      setValidationResults(data.results);
      setValidationScore(data.validationScore);
      setScoreBreakdown(data.scoreBreakdown);
      setLastValidated(new Date().toISOString());

      toast({
        title: "Enhanced AI Validation Complete!",
        description: data.message || `Your opportunity scored ${data.validationScore}% with detailed analysis breakdown.`,
      });

      // Dispatch success event
      window.dispatchEvent(new CustomEvent('ai-validation-completed', { 
        detail: { opportunityId: opportunity.id, success: true, score: data.validationScore } 
      }));

      // Notify parent component
      onValidationComplete();

    } catch (error) {
      console.error('❌ Validation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Dispatch error event
      window.dispatchEvent(new CustomEvent('ai-validation-completed', { 
        detail: { opportunityId: opportunity.id, success: false, error: errorMessage } 
      }));
      
      toast({
        title: "Validation Failed",
        description: "There was an error running the automated validation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const renderScoreBreakdown = () => {
    if (!scoreBreakdown) return null;

    return (
      <Card className="mb-6 border-purple-200 bg-purple-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg text-purple-800">Validation Score Breakdown</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(scoreBreakdown).map(([key, data]: [string, any]) => (
              <div key={key} className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-purple-800 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {data.weight}% weight
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-2xl font-bold text-purple-700">
                    {data.score}/100
                  </div>
                  <div className="flex-1">
                    <Progress value={data.score} className="h-2" />
                  </div>
                </div>
                <p className="text-xs text-purple-600">{data.reasoning}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDataQualityIndicator = () => {
    if (!validationResults?._metadata) return null;

    const { isOpportunitySpecific, analysisRelevance, lastAnalyzed, inputData, confidenceLevel, riskProfile } = validationResults._metadata;

    return (
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-800">Analysis Quality & Risk Assessment</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-4 h-4 ${isOpportunitySpecific ? 'text-green-600' : 'text-amber-600'}`} />
              <span className="text-sm">
                <strong>Specific:</strong> {isOpportunitySpecific ? 'Yes' : 'Generic'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm">
                <strong>Relevance:</strong> {analysisRelevance}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <span className="text-sm">
                <strong>Confidence:</strong> {confidenceLevel || 'medium'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${riskProfile === 'high' ? 'text-red-600' : riskProfile === 'medium' ? 'text-amber-600' : 'text-green-600'}`} />
              <span className="text-sm">
                <strong>Risk:</strong> {riskProfile || 'medium'}
              </span>
            </div>
          </div>
          <div className="text-xs text-blue-700 mt-2">
            Input: "{inputData?.title}" ({inputData?.descriptionLength} chars, {inputData?.category}) • Analyzed: {new Date(lastAnalyzed).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderValidationResults = () => {
    if (!validationResults) return null;

    const {
      marketSizing,
      competitorAnalysis,
      customerValidation,
      financialValidation,
      technicalValidation,
      trendsAnalysis,
      riskAssessment
    } = validationResults;

    return (
      <div className="space-y-8">
        {/* Data Quality Indicator */}
        {renderDataQualityIndicator()}

        {/* Score Breakdown */}
        {renderScoreBreakdown()}

        {/* Enhanced Market Sizing Analysis */}
        {marketSizing && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Market Opportunity Analysis
                </CardTitle>
                <div className="flex items-center gap-2">
                  <DataConfidenceBadge confidence={marketSizing.totalAddressableMarket?.confidence === 'high' ? 'high' : 'medium'} />
                  <Badge variant="outline">{marketSizing.marketMaturity || 'unknown'} market</Badge>
                </div>
              </div>
              <CardDescription>
                Comprehensive market sizing for "{opportunity.title}"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Total Addressable Market</h4>
                  <div className="text-2xl font-bold text-blue-700 mb-2">
                    ${((marketSizing.totalAddressableMarket?.value || 0) / 1000000000).toFixed(1)}B
                  </div>
                  <p className="text-sm text-blue-600 mb-2">{marketSizing.totalAddressableMarket?.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {marketSizing.totalAddressableMarket?.sources?.map((source: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">{source}</Badge>
                    ))}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Serviceable Available Market</h4>
                  <div className="text-2xl font-bold text-green-700 mb-2">
                    ${((marketSizing.serviceableAddressableMarket?.value || 0) / 1000000000).toFixed(1)}B
                  </div>
                  <p className="text-sm text-green-600">{marketSizing.serviceableAddressableMarket?.description}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">Serviceable Obtainable Market</h4>
                  <div className="text-2xl font-bold text-purple-700 mb-2">
                    ${((marketSizing.serviceableObtainableMarket?.value || 0) / 1000000).toFixed(0)}M
                  </div>
                  <p className="text-sm text-purple-600">{marketSizing.serviceableObtainableMarket?.timeframe}</p>
                </div>
              </div>
              
              {marketSizing.marketGrowthRate && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-800 mb-2">Market Growth</h4>
                  <div className="flex items-center gap-4">
                    <div className="text-xl font-bold text-amber-700">
                      {(marketSizing.marketGrowthRate.annual * 100).toFixed(1)}% annually
                    </div>
                    <div className="text-sm text-amber-600">{marketSizing.marketGrowthRate.description}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Enhanced Competitor Analysis */}
        {competitorAnalysis && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  Competitive Analysis
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{competitorAnalysis.marketPosition}</Badge>
                  <Badge className={`${competitorAnalysis.competitiveAdvantage?.strength === 'strong' ? 'bg-green-500' : competitorAnalysis.competitiveAdvantage?.strength === 'moderate' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                    {competitorAnalysis.competitiveAdvantage?.strength} advantage
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {competitorAnalysis.directCompetitors?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Direct Competitors</h4>
                  <div className="grid gap-3">
                    {competitorAnalysis.directCompetitors.map((competitor: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 bg-red-50 border-red-200">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-red-900">{competitor.name}</h5>
                          <div className="flex gap-2">
                            <Badge variant="outline">{competitor.fundingStage}</Badge>
                            <Badge variant="secondary">{(competitor.marketShare * 100).toFixed(1)}%</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-red-700 mb-2">{competitor.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-medium text-red-800">Strengths: </span>
                            <span className="text-red-700">{competitor.strengths?.join(', ')}</span>
                          </div>
                          <div>
                            <span className="font-medium text-red-800">Weaknesses: </span>
                            <span className="text-red-700">{competitor.weaknesses?.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {competitorAnalysis.competitiveAdvantage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Your Competitive Advantage</h4>
                  <p className="text-green-700 mb-2">{competitorAnalysis.competitiveAdvantage.description}</p>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline">Moat: {competitorAnalysis.competitiveAdvantage.moatType}</Badge>
                    <Badge variant="outline">Sustainability: {competitorAnalysis.competitiveAdvantage.sustainability}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Enhanced Customer Validation */}
        {customerValidation && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  Customer Validation
                </CardTitle>
                <Badge variant="outline">
                  {customerValidation.targetCustomers?.marketSize?.toLocaleString()} potential customers
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {customerValidation.painPoints?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Customer Pain Points</h4>
                  <div className="grid gap-3">
                    {customerValidation.painPoints.map((painPoint: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3 bg-green-50 border-green-200">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-green-900">{painPoint.description}</h5>
                          <div className="flex gap-2">
                            <Badge variant="outline">{painPoint.frequency}</Badge>
                            <Badge className={`${painPoint.severity >= 8 ? 'bg-red-500' : painPoint.severity >= 6 ? 'bg-yellow-500' : 'bg-green-500'}`}>
                              {painPoint.severity}/10
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="text-green-700"><strong>Current solution:</strong> {painPoint.currentSolution}</p>
                          <p className="text-green-700"><strong>Willingness:</strong> {painPoint.willingness}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {customerValidation.willingnessToPay && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">Pricing Analysis</h4>
                    <div className="text-xl font-bold text-green-700 mb-2">
                      ${customerValidation.willingnessToPay.estimatedRange?.min} - ${customerValidation.willingnessToPay.estimatedRange?.max}
                    </div>
                    <p className="text-sm text-green-600 mb-2">{customerValidation.willingnessToPay.valueProposition}</p>
                    <div className="text-xs">
                      <div>Confidence: {customerValidation.willingnessToPay.confidence}%</div>
                      <div>Anchors: {customerValidation.willingnessToPay.priceAnchors?.join(', ')}</div>
                    </div>
                  </div>
                  
                  {customerValidation.customerAcquisitionCost && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">Customer Acquisition</h4>
                      <div className="text-xl font-bold text-blue-700 mb-2">
                        ${customerValidation.customerAcquisitionCost.estimate} CAC
                      </div>
                      <div className="text-sm text-blue-600 space-y-1">
                        <div>Channel: {customerValidation.customerAcquisitionCost.channel}</div>
                        <div>Payback: {customerValidation.customerAcquisitionCost.paybackPeriod}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Enhanced Financial Validation */}
        {financialValidation && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                  Financial Analysis
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{financialValidation.revenueModel?.type} model</Badge>
                  <DataConfidenceBadge confidence="ai-estimated" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {financialValidation.revenueProjections && (
                <div>
                  <h4 className="font-semibold mb-3">Revenue Projections</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['year1', 'year3', 'year5'].map((year) => {
                      const data = financialValidation.revenueProjections[year];
                      return (
                        <div key={year} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <h5 className="font-semibold text-yellow-800 mb-2">Year {year.slice(-1)}</h5>
                          <div className="text-xl font-bold text-yellow-700 mb-1">
                            ${data?.revenue?.toLocaleString()}
                          </div>
                          <div className="text-sm text-yellow-600 mb-2">
                            {data?.customers?.toLocaleString()} customers
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {data?.confidence} confidence
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {financialValidation.unitEconomics && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-3">Unit Economics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-green-600">LTV/CAC Ratio</div>
                      <div className="text-lg font-bold text-green-700">
                        {financialValidation.unitEconomics.ltvCacRatio}x
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-green-600">Gross Margin</div>
                      <div className="text-lg font-bold text-green-700">
                        {(financialValidation.unitEconomics.grossMargin * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-green-600">LTV</div>
                      <div className="text-lg font-bold text-green-700">
                        ${financialValidation.unitEconomics.ltv}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-green-600">CAC</div>
                      <div className="text-lg font-bold text-green-700">
                        ${financialValidation.unitEconomics.cac}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Risk Assessment */}
        {riskAssessment && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(riskAssessment).filter(([key]) => key !== 'overallRisk').map(([riskType, level]: [string, any]) => (
                  <div key={riskType} className="text-center">
                    <div className="text-sm text-muted-foreground mb-1 capitalize">
                      {riskType.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <Badge className={`${level === 'high' ? 'bg-red-500' : level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}>
                      {level}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Overall Risk Profile:</span>
                  <Badge className={`${riskAssessment.overallRisk === 'high' ? 'bg-red-500' : riskAssessment.overallRisk === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}>
                    {riskAssessment.overallRisk}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {technicalValidation && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-gray-600" />
                Technical Validation
              </h3>
              <DataConfidenceBadge confidence="ai-estimated" />
            </div>
            <div className="grid gap-4">
              {technicalValidation.complexity && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Development Complexity</h4>
                  <div className="text-xl font-bold text-gray-700 mb-2">
                    {technicalValidation.complexity.level}
                  </div>
                  <p className="text-sm text-gray-600">{technicalValidation.complexity.reasoning}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {trendsAnalysis && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Market Trends Analysis
              </h3>
              <DataConfidenceBadge confidence="medium" />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-3">Current Trends</h4>
              {trendsAnalysis.currentTrends && trendsAnalysis.currentTrends.length > 0 ? (
                <ul className="space-y-2">
                  {trendsAnalysis.currentTrends.map((trend: any, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />
                      <span className="text-blue-700 text-sm">
                        {typeof trend === 'string' ? trend : trend?.trend || trend?.description || 'Trend detected'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-blue-700 text-sm">No specific trends identified.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Validation Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-blue-600" />
                AI Signals Check
              </CardTitle>
              <CardDescription className="mt-2">
                AI analyzes key signals for '{opportunity?.title}' to estimate viability.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {validationScore > 0 && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{validationScore}%</div>
                  <div className="text-sm text-muted-foreground">Validation Score</div>
                  {validationResults?._metadata?.confidenceLevel && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {validationResults._metadata.confidenceLevel} confidence
                    </Badge>
                  )}
                </div>
              )}
              <Button 
                onClick={runAutomatedValidation}
                disabled={isValidating}
                size="lg"
                variant="hero"
                className="gap-2"
                data-validation-trigger="true"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running AI Signals...
                  </>
                 ) : hasMeaningfulValidationData(validationResults) ? (
                   <>
                     <RefreshCw className="w-4 h-4" />
                     Re-run Signals
                   </>
                 ) : (
                   <>
                     <Sparkles className="w-4 h-4" />
                     Run AI Signals
                   </>
                 )}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {validationScore > 0 && (
          <CardContent>
            <div className="space-y-4">
              <Progress value={validationScore} className="h-3" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Last analyzed: {lastValidated ? new Date(lastValidated).toLocaleDateString() : 'Never'}
                </span>
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-purple-600" />
                  <span className="text-muted-foreground">Advanced scoring algorithm</span>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Community Intelligence Integration */}
      {validationResults?.customerDemand && (
        <CommunityIntelligence 
          communityInsights={validationResults.customerDemand.communityInsights}
          painPointAnalysis={validationResults.customerDemand.painPointAnalysis}
          engagementMetrics={validationResults.customerDemand.engagementMetrics}
          totalDiscussions={validationResults.customerDemand.totalDiscussions}
          dataQuality={validationResults.customerDemand.dataQuality}
          className="mb-6"
        />
      )}

      {/* Validation Progress Indicator */}
      {isValidating && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Running AI Signals for "{opportunity.title}"...</h3>
                <p className="text-sm text-muted-foreground">
                  Performing sophisticated market analysis, competitive intelligence, customer validation, 
                  financial modeling, and risk assessment with dynamic scoring.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {renderValidationResults()}

    </div>
  );
};

export default AutomatedValidation;
