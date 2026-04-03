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
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Target,
  MessageSquare,
  Calendar
} from 'lucide-react';
import SimpleRedditValidation from './SimpleRedditValidation';

interface SimplifiedMarketValidationProps {
  opportunity: any;
  className?: string;
  onValidationComplete?: (score: number) => void;
}

interface MarketData {
  searchVolume: number;
  trend: string;
  competitiveness: string;
  confidence: number;
  insights?: string;
  lastUpdated: string;
}

interface RedditData {
  totalDiscussions: number;
  validationScore: number;
  overallSummary: string;
}

export const SimplifiedMarketValidation: React.FC<SimplifiedMarketValidationProps> = ({
  opportunity,
  className = '',
  onValidationComplete
}) => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [redditData, setRedditData] = useState<RedditData | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [showRedditValidation, setShowRedditValidation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load market intelligence
  const loadMarketData = async () => {
    if (!opportunity?.title) return;

    setIsLoadingMarket(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('market-intelligence', {
        body: {
          market: opportunity.title,
          userId: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) throw error;

      const marketInfo: MarketData = {
        searchVolume: data.searchVolume?.volume || 0,
        trend: data.trendDirection || 'stable',
        competitiveness: data.competitiveness || 'medium',
        confidence: data.confidence || 0,
        insights: data.insights,
        lastUpdated: new Date().toISOString()
      };

      setMarketData(marketInfo);
      
      toast({
        title: "Market Data Loaded",
        description: "Market intelligence analysis complete.",
      });

    } catch (error) {
      console.error('Market validation failed:', error);
      setError('Failed to load market data. Please try again.');
      toast({
        title: "Validation Error",
        description: "Could not load market data.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMarket(false);
    }
  };

  // Handle Reddit validation results
  const handleRedditResults = (results: any) => {
    const redditInfo: RedditData = {
      totalDiscussions: results.totalDiscussions || 0,
      validationScore: results.validationScore || 0,
      overallSummary: results.overallSummary || ''
    };
    
    setRedditData(redditInfo);
    
    toast({
      title: "Reddit Analysis Complete",
      description: `Found ${redditInfo.totalDiscussions} relevant discussions.`,
    });
  };

  // Calculate overall validation score
  const getOverallScore = () => {
    if (!marketData && !redditData) return 0;
    
    const marketScore = marketData?.confidence || 0;
    const redditScore = redditData?.validationScore || 0;
    
    if (marketData && redditData) {
      return Math.round((marketScore + redditScore) / 2);
    } else if (marketData) {
      return marketScore;
    } else if (redditData) {
      return redditScore;
    }
    
    return 0;
  };

  // Get validation status
  const getValidationStatus = (score: number) => {
    if (score >= 70) return { label: 'Strong', color: 'bg-green-100 text-green-800 border-green-300' };
    if (score >= 50) return { label: 'Moderate', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    if (score >= 30) return { label: 'Weak', color: 'bg-orange-100 text-orange-800 border-orange-300' };
    return { label: 'Poor', color: 'bg-red-100 text-red-800 border-red-300' };
  };

  // Auto-load market data on mount
  useEffect(() => {
    if (opportunity?.title) {
      loadMarketData();
    }
  }, [opportunity?.title]);

  // Notify parent of validation completion
  useEffect(() => {
    const score = getOverallScore();
    if (score > 0) {
      onValidationComplete?.(score);
    }
  }, [marketData, redditData]);

  const overallScore = getOverallScore();
  const status = getValidationStatus(overallScore);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Score Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Market Validation</CardTitle>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{overallScore}%</div>
              <Badge className={`${status.color} border`}>
                {status.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Market Intelligence */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Market Intelligence
            </CardTitle>
            <Button 
              onClick={loadMarketData} 
              disabled={isLoadingMarket}
              variant="outline"
              size="sm"
            >
              {isLoadingMarket ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isLoadingMarket ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingMarket ? (
            <div className="text-center py-6">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-sm text-muted-foreground">Analyzing market data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <Button onClick={loadMarketData} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          ) : marketData ? (
            <div className="space-y-4">
              {/* Market Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Search className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-700">
                    {marketData.searchVolume >= 1000 ? `${Math.round(marketData.searchVolume/1000)}K` : marketData.searchVolume}
                  </div>
                  <div className="text-sm text-blue-600">Search Volume</div>
                </div>
                
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <Users className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                  <div className="text-lg font-bold text-amber-700 capitalize">
                    {marketData.competitiveness}
                  </div>
                  <div className="text-sm text-amber-600">Competition</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-700">
                    {marketData.confidence}%
                  </div>
                  <div className="text-sm text-green-600">Confidence</div>
                </div>
              </div>

              {/* Market Insights */}
              {marketData.insights && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Key Insights
                  </h4>
                  <p className="text-sm text-blue-800">{marketData.insights}</p>
                </div>
              )}

              {/* Last Updated */}
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Updated: {new Date(marketData.lastUpdated).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">No market data available</p>
              <Button onClick={loadMarketData} variant="outline" size="sm">
                Load Market Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reddit Validation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              Reddit Community Analysis
            </CardTitle>
            {!showRedditValidation && (
              <Button 
                onClick={() => setShowRedditValidation(true)}
                variant="outline"
                size="sm"
              >
                Start Analysis
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showRedditValidation ? (
            <SimpleRedditValidation 
              market={opportunity?.title || ''} 
              onResults={handleRedditResults}
            />
          ) : redditData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-700">
                    {redditData.totalDiscussions}
                  </div>
                  <div className="text-sm text-purple-600">Discussions Found</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-700">
                    {redditData.validationScore}%
                  </div>
                  <div className="text-sm text-green-600">Validation Score</div>
                </div>
              </div>

              {redditData.overallSummary && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2">Community Insights</h4>
                  <p className="text-sm text-purple-800">{redditData.overallSummary}</p>
                </div>
              )}

              <Button 
                onClick={() => setShowRedditValidation(true)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                View Full Analysis
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Analyze Reddit discussions to understand community needs and validate your opportunity
              </p>
              <Button 
                onClick={() => setShowRedditValidation(true)}
                variant="default"
                size="sm"
              >
                Start Reddit Analysis
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Combined Summary */}
      {(marketData || redditData) && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="text-lg">Validation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Validation Score</span>
                <Badge className={`${status.color} border text-sm px-3 py-1`}>
                  {overallScore}% - {status.label}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {overallScore >= 70 ? (
                  "✅ Strong validation signals detected. Consider proceeding with development."
                ) : overallScore >= 50 ? (
                  "⚠️ Moderate validation. Consider additional research before proceeding."
                ) : overallScore >= 30 ? (
                  "🔍 Weak validation signals. Significant research needed before proceeding."
                ) : (
                  "❌ Poor validation. Consider pivoting or exploring alternative approaches."
                )}
              </div>

              {marketData && redditData && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    Market Intelligence: {marketData.confidence}% • 
                    Reddit Analysis: {redditData.validationScore}%
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SimplifiedMarketValidation;
