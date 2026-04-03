import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Lightbulb,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowRight
} from 'lucide-react';

interface MarketIntelligenceProps {
  opportunity: any;
  className?: string;
  onAnalysisComplete?: () => void;
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

export const MarketIntelligenceSection: React.FC<MarketIntelligenceProps> = ({
  opportunity,
  className = '',
  onAnalysisComplete
}) => {
  const [marketData, setMarketData] = useState<MarketIntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const { toast } = useToast();

  const loadMarketIntelligence = async () => {
    if (!opportunity?.id) return;

    setIsLoading(true);
    setError(null);
    setLoadingStatus('Initializing market analysis...');
    
    try {
      console.log('🔍 Loading market intelligence for:', opportunity.title);
      
      setLoadingStatus('Checking for cached data...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UX

      setLoadingStatus('Triggering Browse.ai market research...');
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

      setLoadingStatus('Processing market data...');
      await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause for UX

      console.log('✅ Market intelligence loaded:', data);
      
      // Validate data quality
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format received from API');
      }

      setMarketData(data);
      setLastChecked(new Date().toISOString());
      setError(null);

      // Notify parent that analysis is complete
      onAnalysisComplete?.();

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
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  // Load cached data on mount, but don't auto-trigger new analysis
  useEffect(() => {
    const loadCachedData = async () => {
      if (!opportunity?.id) return;
      
      try {
        // Only check for existing cached data, don't trigger new analysis
        const cacheKey = `market_${opportunity.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const { data } = await supabase
          .from('market_cache')
          .select('*')
          .eq('cache_key', cacheKey)
          .maybeSingle(); // Use maybeSingle instead of single to handle no data gracefully
        
        if (data && data.cached_data) {
          console.log('📋 Loading cached market intelligence for:', opportunity.title);
          setMarketData(data.cached_data as unknown as MarketIntelligenceData);
          setLastChecked(data.updated_at);
        }
      } catch (error) {
        console.log('No cached market data found for:', opportunity.title);
      }
    };
    
    loadCachedData();
  }, [opportunity?.id]);

  const getTrendIcon = (trend: string) => {
    switch (trend?.toLowerCase()) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />;
      default:
        return <Target className="w-4 h-4 text-blue-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend?.toLowerCase()) {
      case 'up':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'down':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getCompetitivenessColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return { label: 'High Confidence', color: 'bg-green-100 text-green-700' };
    if (confidence >= 60) return { label: 'Medium Confidence', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Low Confidence', color: 'bg-red-100 text-red-700' };
  };

  const formatSearchVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
  };

  if (!marketData && !isLoading) {
    return (
      <Card className={`${className}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Real-Time Market Intelligence
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadMarketIntelligence}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Load Market Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <h4 className="font-medium text-gray-700 mb-2">Market Intelligence Available</h4>
            <p className="text-sm text-gray-600 mb-4">
              Get real-time market trends, search volume, and competitive analysis for this opportunity.
            </p>
            <Button onClick={loadMarketIntelligence} disabled={isLoading}>
              <Search className="w-4 h-4 mr-2" />
              Start Market Intelligence
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Real-Time Market Intelligence
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastChecked && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Updated {new Date(lastChecked).toLocaleTimeString()}
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadMarketIntelligence}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh Intelligence
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="relative">
              <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Market Analysis in Progress</h3>
            <p className="text-sm text-muted-foreground mb-4">{loadingStatus}</p>
            <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full animate-pulse w-2/3"></div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">Analysis Failed</h3>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Button onClick={loadMarketIntelligence} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        ) : marketData ? (
          <>
            {/* AI Summary Section - GigaBrain Style */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Market Intelligence Summary</h3>
                  <p className="text-sm text-gray-600">Comprehensive analysis of market trends and opportunities</p>
                </div>
              </div>
              
              {marketData.insights ? (
                <div className="bg-white/70 rounded-lg p-4 border border-blue-100">
                  <p className="text-gray-800 leading-relaxed">{marketData.insights}</p>
                </div>
              ) : (
                <div className="bg-white/70 rounded-lg p-4 border border-blue-100">
                  <p className="text-gray-800 leading-relaxed">
                    Market analysis shows <strong>{marketData.confidence || 0}% confidence</strong> in this opportunity. 
                    Search volume indicates <strong>{marketData.trendDirection || 'stable'}</strong> market interest with 
                    <strong>{marketData.competitiveness || 'medium'}</strong> competition levels.
                  </p>
                </div>
              )}
            </div>

            {/* Key Metrics - Enhanced Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(marketData.trendDirection)}
                    <Badge variant="outline" className={getTrendColor(marketData.trendDirection)}>
                      {marketData.trendDirection || 'Stable'}
                    </Badge>
                  </div>
                </div>
                <div className="text-3xl font-bold text-blue-700 mb-2">
                  {formatSearchVolume(marketData.searchVolume?.volume || 0)}
                </div>
                <div className="text-sm font-medium text-blue-900">Monthly Search Volume</div>
                <div className="text-xs text-blue-600 mt-1">Google Trends data</div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-amber-500 rounded-lg">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="outline" className={getCompetitivenessColor(marketData.competitiveness)}>
                    {marketData.competitiveness || 'Medium'}
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-amber-700 mb-2 capitalize">
                  {marketData.competitiveness || 'Medium'}
                </div>
                <div className="text-sm font-medium text-amber-900">Market Competition</div>
                <div className="text-xs text-amber-600 mt-1">Competitive landscape analysis</div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="outline" className={getConfidenceBadge(marketData.confidence || 0).color}>
                    {getConfidenceBadge(marketData.confidence || 0).label}
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-green-700 mb-2">
                  {marketData.confidence || 0}%
                </div>
                <div className="text-sm font-medium text-green-900">Validation Confidence</div>
                <div className="text-xs text-green-600 mt-1">AI-powered analysis</div>
              </div>
            </div>

            {/* Market Opportunities - Enhanced */}
            {marketData.marketGaps && marketData.marketGaps.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-green-900">Market Opportunities</h4>
                    <p className="text-sm text-green-700">Identified gaps and potential areas for innovation</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {marketData.marketGaps.map((gap, index) => (
                    <div key={index} className="bg-white/70 rounded-lg p-4 border border-green-100 hover:bg-white/90 transition-colors">
                      <div className="flex items-start gap-3">
                        <ArrowRight className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 font-medium">{gap}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Competitors - Enhanced */}
            {marketData.competitors && marketData.competitors.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gray-600 rounded-lg">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Key Competitors</h4>
                    <p className="text-sm text-gray-600">Major players in the market landscape</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {marketData.competitors.map((competitor, index) => (
                    <Badge key={index} variant="secondary" className="text-sm px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50">
                      {competitor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Score Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Market Validation Score</h4>
                    <p className="text-sm text-gray-600">Overall market opportunity assessment</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-purple-700">{marketData.confidence || 0}%</div>
                  <Badge className={`${getConfidenceBadge(marketData.confidence || 0).color} border mt-1`}>
                    {getConfidenceBadge(marketData.confidence || 0).label}
                  </Badge>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-white/70 rounded-lg border border-purple-100">
                <p className="text-sm text-gray-700">
                  {marketData.confidence >= 80 ? (
                    "🎯 Excellent market opportunity with strong validation signals. High confidence for proceeding with development."
                  ) : marketData.confidence >= 60 ? (
                    "✅ Good market potential with solid validation. Consider additional research to strengthen confidence."
                  ) : marketData.confidence >= 40 ? (
                    "⚠️ Moderate market signals. Additional validation and market research recommended before proceeding."
                  ) : (
                    "🔍 Low confidence signals. Significant market research and validation needed before investment."
                  )}
                </p>
              </div>
            </div>

            {/* Data Sources Footer */}
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
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};