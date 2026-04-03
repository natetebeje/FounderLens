import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  Users, 
  Search, 
  Clock,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3,
  Globe,
  Calendar,
  Brain,
  MessageSquare,
  Eye,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import SimpleRedditValidation from './SimpleRedditValidation';

interface IntegratedMarketValidationProps {
  opportunity: any;
  className?: string;
  onValidationComplete?: (data: any) => void;
}

interface MarketIntelligenceData {
  searchVolume: {
    volume: number;
    trend: string;
    confidence: number;
  };
  competitiveness: string;
  trendDirection: string;
  confidence: number;
  sources: string[];
  insights: string;
  competitors: string[];
  marketGaps: string[];
  growthPotential: string;
  lastUpdated: string;
  validationScore?: number;
}

interface RedditValidationResult {
  success: boolean;
  discussionsFound: number;
  discussions: any[];
  message: string;
  overallSummary?: string;
  keyInsights?: string[];
  followUpQuestions?: string[];
  validationScore: number;
  totalDiscussions: number;
}

export const IntegratedMarketValidation: React.FC<IntegratedMarketValidationProps> = ({
  opportunity,
  className = '',
  onValidationComplete
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [marketData, setMarketData] = useState<MarketIntelligenceData | null>(null);
  const [redditData, setRedditData] = useState<RedditValidationResult | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [isLoadingReddit, setIsLoadingReddit] = useState(false);
  const [marketStatus, setMarketStatus] = useState<string>('');
  const [redditStatus, setRedditStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { toast } = useToast();

  // Load market intelligence data
  const loadMarketIntelligence = async () => {
    if (!opportunity?.id) return;

    setIsLoadingMarket(true);
    setError(null);
    setMarketStatus('Initializing market analysis...');
    
    try {
      console.log('🔍 Loading market intelligence for:', opportunity.title);
      
      setMarketStatus('Checking for cached data...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setMarketStatus('Triggering Browse.ai market research...');
      const { data, error } = await supabase.functions.invoke('market-intelligence', {
        body: {
          market: opportunity.title,
          userId: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) {
        console.error('❌ Market intelligence error:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        if (errorMessage.includes('Browse.ai')) {
          setError('Browse.ai API is currently unavailable. Using cached or fallback data.');
        } else if (errorMessage.includes('timeout')) {
          setError('Request timed out. Please try again with a shorter market term.');
        } else {
          setError(`API Error: ${errorMessage}`);
        }
        throw error;
      }

      setMarketStatus('Processing market data...');
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log('✅ Market intelligence loaded:', data);
      setMarketData(data);
      setLastChecked(new Date().toISOString());
      setError(null);

      toast({
        title: "Market Intelligence Updated",
        description: "Latest market data has been loaded successfully.",
      });

    } catch (error) {
      console.error('❌ Failed to load market intelligence:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (!error) {
        setError('Failed to connect to market intelligence API');
      }
      
      toast({
        title: "Market Intelligence Error",
        description: errorMessage.includes('Browse.ai') 
          ? "Browse.ai is temporarily unavailable. Showing cached data if available."
          : "Failed to load market data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMarket(false);
      setMarketStatus('');
    }
  };

  // Handle Reddit validation results
  const handleRedditResults = (results: RedditValidationResult) => {
    console.log('📊 Reddit validation completed:', results);
    setRedditData(results);
    
    toast({
      title: "Reddit Analysis Complete",
      description: `Found ${results.totalDiscussions} relevant discussions with AI insights.`,
    });
  };

  // Calculate overall validation score
  const calculateOverallScore = () => {
    if (!marketData && !redditData) return 0;
    
    const marketScore = marketData?.validationScore || marketData?.confidence || 0;
    const redditScore = redditData?.validationScore || 0;
    
    if (marketData && redditData) {
      // Combined score: 60% market intelligence + 40% Reddit validation
      return Math.round(marketScore * 0.6 + redditScore * 0.4);
    } else if (marketData) {
      return marketScore;
    } else if (redditData) {
      return redditScore;
    }
    
    return 0;
  };

  // Get validation status
  const getValidationStatus = () => {
    const score = calculateOverallScore();
    if (score >= 80) return { label: 'Strong', color: 'text-green-600 bg-green-50 border-green-200' };
    if (score >= 60) return { label: 'Moderate', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    if (score >= 40) return { label: 'Weak', color: 'text-orange-600 bg-orange-50 border-orange-200' };
    return { label: 'Insufficient', color: 'text-red-600 bg-red-50 border-red-200' };
  };

  // Auto-load market intelligence on mount
  useEffect(() => {
    if (opportunity?.title) {
      loadMarketIntelligence();
    }
  }, [opportunity?.title]);

  // Notify parent when validation completes
  useEffect(() => {
    if (marketData || redditData) {
      const overallScore = calculateOverallScore();
      onValidationComplete?.({
        marketIntelligence: marketData,
        redditValidation: redditData,
        overallScore,
        status: getValidationStatus().label.toLowerCase()
      });
    }
  }, [marketData, redditData]);

  const validationStatus = getValidationStatus();
  const overallScore = calculateOverallScore();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Overall Score */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Market Validation</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Comprehensive analysis using multiple data sources
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{overallScore}%</div>
              <Badge className={`${validationStatus.color} border`}>
                {validationStatus.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Validation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="market" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Market Intelligence
          </TabsTrigger>
          <TabsTrigger value="reddit" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Reddit Analysis
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Market Intelligence Summary */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    Market Intelligence
                  </CardTitle>
                  {isLoadingMarket ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : marketData ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingMarket ? (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">{marketStatus}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full animate-pulse w-1/2"></div>
                    </div>
                  </div>
                ) : marketData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Search Volume</span>
                      <Badge variant="outline">{marketData.searchVolume?.volume || 'N/A'}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Trend</span>
                      <Badge variant="outline">{marketData.trendDirection || 'Stable'}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Competition</span>
                      <Badge variant="outline">{marketData.competitiveness || 'Medium'}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Confidence</span>
                      <Badge variant="outline">{marketData.confidence || 0}%</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Button 
                      onClick={loadMarketIntelligence} 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Load Market Data
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reddit Analysis Summary */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                    Reddit Analysis
                  </CardTitle>
                  {isLoadingReddit ? (
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  ) : redditData ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {redditData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Discussions Found</span>
                      <Badge variant="outline">{redditData.totalDiscussions}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Validation Score</span>
                      <Badge variant="outline">{redditData.validationScore}%</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Follow-up Questions</span>
                      <Badge variant="outline">{redditData.followUpQuestions?.length || 0}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <strong>Summary:</strong> {redditData.overallSummary?.substring(0, 100)}...
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-sm text-muted-foreground mb-2">
                      Run Reddit analysis to get community insights
                    </div>
                    <Button 
                      onClick={() => setActiveTab('reddit')} 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Start Reddit Analysis
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Combined Insights */}
          {(marketData || redditData) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Combined Market Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {marketData?.insights && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">Market Intelligence</h4>
                      <p className="text-sm text-blue-800">{marketData.insights}</p>
                    </div>
                  )}
                  
                  {redditData?.overallSummary && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="font-semibold text-purple-900 mb-2">Community Insights</h4>
                      <p className="text-sm text-purple-800">{redditData.overallSummary}</p>
                    </div>
                  )}

                  {/* Action Recommendations */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-2">Recommended Actions</h4>
                    <div className="space-y-2 text-sm text-green-800">
                      {overallScore >= 70 ? (
                        <>
                          <div>• Strong validation signals detected - start the Build Track</div>
                          <div>• Consider launching a landing page to capture early interest</div>
                          <div>• Engage with identified communities for user feedback</div>
                        </>
                      ) : overallScore >= 50 ? (
                        <>
                          <div>• Moderate validation - conduct additional market research</div>
                          <div>• Refine your value proposition based on insights</div>
                          <div>• Consider pivoting to address identified pain points</div>
                        </>
                      ) : (
                        <>
                          <div>• Low validation signals - reconsider market approach</div>
                          <div>• Explore alternative markets or customer segments</div>
                          <div>• Gather more user feedback before proceeding</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Market Intelligence Tab */}
        <TabsContent value="market" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  Market Intelligence Analysis
                </CardTitle>
                <Button 
                  onClick={loadMarketIntelligence} 
                  disabled={isLoadingMarket}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isLoadingMarket ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {isLoadingMarket ? 'Analyzing...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingMarket ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-sm text-muted-foreground">{marketStatus}</p>
                  </div>
                </div>
              ) : marketData ? (
                <div className="space-y-6">
                  {/* Market Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Search className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Search Volume</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-700">
                        {marketData.searchVolume?.volume || 'N/A'}
                      </div>
                      <Badge variant="outline" className="mt-2">
                        {marketData.trendDirection || 'Stable'}
                      </Badge>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-900">Competition</span>
                      </div>
                      <Badge variant="outline" className="text-amber-700 bg-amber-100">
                        {marketData.competitiveness || 'Medium'}
                      </Badge>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Confidence</span>
                      </div>
                      <div className="text-2xl font-bold text-green-700">
                        {marketData.confidence || 0}%
                      </div>
                    </div>
                  </div>

                  {/* Market Insights */}
                  {marketData.insights && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Market Insights
                      </h4>
                      <p className="text-sm text-blue-800">{marketData.insights}</p>
                    </div>
                  )}

                  {/* Competitors */}
                  {marketData.competitors && marketData.competitors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Key Competitors
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {marketData.competitors.map((competitor, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {competitor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Market Gaps */}
                  {marketData.marketGaps && marketData.marketGaps.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Market Opportunities
                      </h4>
                      <div className="space-y-1">
                        {marketData.marketGaps.map((gap, index) => (
                          <div key={index} className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                            • {gap}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Sources */}
                  {marketData.sources && marketData.sources.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Data sources: {marketData.sources.join(', ')}</span>
                        {marketData.lastUpdated && (
                          <span>• Last updated: {new Date(marketData.lastUpdated).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-700 mb-2">Analysis Failed</h3>
                  <p className="text-sm text-red-600 mb-4">{error}</p>
                  <Button onClick={loadMarketIntelligence} variant="outline">
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Click "Refresh" to load market intelligence data
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reddit Analysis Tab */}
        <TabsContent value="reddit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                Reddit Community Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleRedditValidation 
                market={opportunity?.title || ''} 
                onResults={handleRedditResults}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Last Updated Info */}
      {lastChecked && (
        <div className="text-center text-xs text-muted-foreground">
          Last validation: {new Date(lastChecked).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default IntegratedMarketValidation;
