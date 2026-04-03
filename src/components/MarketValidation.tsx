
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, Minus, Search, Users, Calendar, CheckCircle, AlertCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MarketValidationProps {
  market: string;
  onValidationComplete: (validationData: MarketValidationData) => void;
  onSkip: () => void;
}

interface MarketValidationData {
  searchVolume: number;
  trend: 'up' | 'down' | 'stable';
  trendScore: number;
  competitiveness: 'low' | 'medium' | 'high';
  validated: boolean;
  dataSources?: string[];
  confidence?: number;
  insights?: string[];
  isRealData?: boolean;
  trendHistory?: Array<{ date: string; value: number }>;
}

export const MarketValidation = ({ market, onValidationComplete, onSkip }: MarketValidationProps) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationData, setValidationData] = useState<MarketValidationData | null>(null);
  const [customMarket, setCustomMarket] = useState(market);
  const [error, setError] = useState<string | null>(null);
  const [timeoutWarning, setTimeoutWarning] = useState(false);

  const validateMarket = async (marketTerm: string) => {
    setIsValidating(true);
    setError(null);
    setTimeoutWarning(false);
    
    // Show timeout warning after 10 seconds
    const timeoutTimer = setTimeout(() => {
      setTimeoutWarning(true);
    }, 10000);

    try {
      console.log('🔍 Starting market validation for:', marketTerm);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('market-intelligence', {
        body: {
          market: marketTerm,
          userId: user.id
        }
      });

      clearTimeout(timeoutTimer);

      if (error) {
        console.error('Market intelligence error:', error);
        throw error;
      }

      console.log('✅ Market validation complete:', data);
      
      const validationResult: MarketValidationData = {
        searchVolume: data.searchVolume,
        trend: data.trend,
        trendScore: data.trendScore,
        competitiveness: data.competitiveness,
        validated: data.validated,
        dataSources: data.dataSources,
        confidence: data.confidence,
        insights: data.insights,
        isRealData: data.isRealData || false,
        trendHistory: data.trendHistory
      };
      
      setValidationData(validationResult);
      
      if (data.confidence < 50) {
        toast.warning('Market validation has low confidence. Consider additional research.');
      } else {
        const dataTypeMessage = data.isRealData ? 'with real Google Trends data!' : 'with AI analysis!';
        toast.success(`Market validation completed successfully ${dataTypeMessage}`);
      }
      
    } catch (error) {
      clearTimeout(timeoutTimer);
      console.error('Market validation failed:', error);
      setError(error.message || 'Failed to validate market');
      toast.error('Market validation failed. Please try again.');
    } finally {
      setIsValidating(false);
      setTimeoutWarning(false);
    }
  };

  useEffect(() => {
    if (market) {
      validateMarket(market);
    }
  }, [market]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'down':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };

  const getCompetitivenessColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleContinue = () => {
    if (validationData) {
      onValidationComplete(validationData);
    }
  };

  return (
    <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Search className="w-12 h-12 text-primary" />
        </div>
        <CardTitle className="text-2xl">Market Validation</CardTitle>
        <p className="text-muted-foreground">
          AI-powered market analysis with real-time data insights
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter market or topic to validate"
              value={customMarket}
              onChange={(e) => setCustomMarket(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={() => validateMarket(customMarket)}
              disabled={isValidating || !customMarket.trim()}
              variant="outline"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {isValidating && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground mb-2">Analyzing market with AI intelligence...</p>
              {timeoutWarning && (
                <div className="flex items-center justify-center gap-2 text-amber-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">This is taking longer than usual. Please wait...</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="font-semibold text-red-800">Validation Error</span>
              </div>
              <p className="text-sm text-red-700">{error}</p>
              <Button 
                onClick={() => validateMarket(customMarket)}
                size="sm"
                variant="outline"
                className="mt-2"
              >
                Retry Analysis
              </Button>
            </div>
          )}

          {validationData && !isValidating && (
            <div className="space-y-4">
              {/* Enhanced Data Sources & Confidence with Browse.ai Indicator */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {validationData.dataSources?.map((source, index) => (
                    <Badge 
                      key={index}
                      variant="outline"
                      className={`text-xs ${
                        source.includes('Browse.ai') 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : source.includes('Reddit Community')
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      {source.includes('Browse.ai') && <span className="mr-1">🌐</span>}
                      {source.includes('Reddit') && <span className="mr-1">💬</span>}
                      {source.includes('OpenAI') && <span className="mr-1">🤖</span>}
                      {source}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {validationData.dataSources?.some(s => s.includes('Browse.ai')) ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-orange-500" />
                    )}
                    <span className="text-sm font-medium">
                      {validationData.dataSources?.some(s => s.includes('Browse.ai')) ? 'Live Market Data' : 'AI Analysis'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        validationData.dataSources?.some(s => s.includes('Browse.ai'))
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}
                    >
                      {validationData.dataSources?.some(s => s.includes('Browse.ai')) ? 'Real Data' : 'AI Estimated'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {validationData.confidence}% Confidence
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Market Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">Search Volume</span>
                      {validationData.dataSources?.some(s => s.includes('Browse.ai')) && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                          Scraped
                        </Badge>
                      )}
                    </div>
                    <div className="text-2xl font-bold">{validationData.searchVolume.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      {validationData.dataSources?.some(s => s.includes('Browse.ai')) ? 'Monthly searches (scraped)' : 'Estimated monthly searches'}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">Trend</span>
                      {validationData.dataSources?.some(s => s.includes('Browse.ai')) && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                          Scraped
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(validationData.trend)}
                      <Badge className={`border ${getTrendColor(validationData.trend)}`}>
                        {validationData.trend}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Interest Score: {validationData.trendScore}/100
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">Competition</span>
                    </div>
                    <Badge className={`border ${getCompetitivenessColor(validationData.competitiveness)}`}>
                      {validationData.competitiveness}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">
                      Market entry difficulty
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Insights */}
              {validationData.insights && validationData.insights.length > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">AI Market Insights</h4>
                  <div className="space-y-2">
                    {validationData.insights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-muted-foreground">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enhanced Assessment with Data Source Info */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Market Assessment</h4>
                <p className="text-sm text-muted-foreground">
                  {validationData.validated
                    ? `Strong validation signals detected with ${validationData.confidence}% confidence using ${validationData.dataSources?.some(s => s.includes('Browse.ai')) ? 'Browse.ai scraped data' : 'AI analysis'}. This market shows ${validationData.trend === 'up' ? 'growing' : validationData.trend === 'stable' ? 'stable' : 'declining'} demand patterns.`
                    : `Market validation shows mixed signals with ${validationData.confidence}% confidence using ${validationData.dataSources?.some(s => s.includes('Browse.ai')) ? 'Browse.ai data' : 'AI estimation'}. Consider additional research or market refinement.`}
                </p>
                {!validationData.dataSources?.some(s => s.includes('Browse.ai')) && (
                  <p className="text-xs text-orange-600 mt-2">
                    💡 For more accurate insights, Browse.ai integration will provide real market data from Google Trends and Reddit.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={onSkip}
            className="flex-1"
          >
            Skip Validation
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!validationData}
            variant="hero"
            className="flex-1"
          >
            Continue with This Market
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
