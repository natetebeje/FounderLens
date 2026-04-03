
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  BarChart3, 
  Target,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MarketIntelligenceProps {
  opportunityId: string;
}

// Enhanced type guards for JSONB data with proper null checks
const isObject = (value: any): value is Record<string, any> => {
  return value && typeof value === 'object' && !Array.isArray(value);
};

const isArray = (value: any): value is any[] => {
  return Array.isArray(value);
};

const getNestedProperty = (obj: any, path: string): any => {
  if (!isObject(obj)) return null;
  return obj[path] || null;
};

const getNestedArray = (obj: any, path: string): any[] => {
  if (!isObject(obj)) return [];
  const value = obj[path];
  return isArray(value) ? value : [];
};

const EnhancedMarketIntelligenceSection = ({ opportunityId }: MarketIntelligenceProps) => {
  const { data: marketIntelligence, isLoading, error, refetch } = useQuery({
    queryKey: ['market-intelligence', opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automated_market_intelligence')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Market Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !marketIntelligence) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Market Intelligence
          </CardTitle>
          <CardDescription>
            AI-powered market analysis and competitive insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No market intelligence data</h3>
            <p className="text-muted-foreground mb-4">
              Market intelligence analysis hasn't been generated for this opportunity yet.
            </p>
            <Button onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const confidenceScore = marketIntelligence.confidence_score || 0;
  const competitorAnalysis = marketIntelligence.competitor_analysis;
  const marketSizing = marketIntelligence.market_sizing;
  const pricingResearch = marketIntelligence.pricing_research;
  const trendsAnalysis = marketIntelligence.trends_analysis;
  const swotAnalysis = marketIntelligence.swot_analysis;

  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">High Confidence</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Medium Confidence</Badge>;
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Low Confidence</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Market Intelligence
          </CardTitle>
          <CardDescription className="flex items-center gap-2 mt-2">
            AI-powered analysis • {getConfidenceBadge(confidenceScore)}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-2xl font-bold">
                    {getNestedProperty(marketSizing, 'market_size') ? String(getNestedProperty(marketSizing, 'market_size')) : 'N/A'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground text-center">Market Size</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-purple-600" />
                  <span className="text-2xl font-bold">
                    {getNestedArray(competitorAnalysis, 'competitors').length}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground text-center">Competitors</p>
              </div>
            </div>

            {/* SWOT Analysis */}
            {isObject(swotAnalysis) && Object.keys(swotAnalysis).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">SWOT Analysis</h4>
                <div className="grid grid-cols-2 gap-3">
                  {getNestedArray(swotAnalysis, 'strengths').length > 0 && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <h5 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Strengths</h5>
                      <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
                        {getNestedArray(swotAnalysis, 'strengths').slice(0, 3).map((item: any, index: number) => (
                          <li key={index}>• {String(item)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {getNestedArray(swotAnalysis, 'opportunities').length > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Opportunities</h5>
                      <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        {getNestedArray(swotAnalysis, 'opportunities').slice(0, 3).map((item: any, index: number) => (
                          <li key={index}>• {String(item)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="competitors" className="space-y-4">
            {getNestedArray(competitorAnalysis, 'competitors').length > 0 ? (
              <div className="space-y-3">
                {getNestedArray(competitorAnalysis, 'competitors').slice(0, 5).map((competitor: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{isObject(competitor) && competitor.name ? String(competitor.name) : `Competitor ${index + 1}`}</h4>
                      {isObject(competitor) && competitor.market_share && (
                        <Badge variant="outline">{String(competitor.market_share)}% market share</Badge>
                      )}
                    </div>
                    {isObject(competitor) && competitor.description && (
                      <p className="text-sm text-muted-foreground mb-2">{String(competitor.description)}</p>
                    )}
                    {isObject(competitor) && isArray(competitor.strengths) && competitor.strengths.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {competitor.strengths.slice(0, 3).map((strength: any, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{String(strength)}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No competitor data available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            {getNestedArray(pricingResearch, 'pricing_models').length > 0 ? (
              <div className="space-y-3">
                {getNestedArray(pricingResearch, 'pricing_models').map((model: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{isObject(model) && model.name ? String(model.name) : `Pricing Model ${index + 1}`}</h4>
                      {isObject(model) && model.description && (
                        <p className="text-sm text-muted-foreground">{String(model.description)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-bold">{isObject(model) && model.price ? String(model.price) : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pricing data available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            {getNestedArray(trendsAnalysis, 'trends').length > 0 ? (
              <div className="space-y-3">
                {getNestedArray(trendsAnalysis, 'trends').map((trend: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <h4 className="font-medium">{isObject(trend) && trend.name ? String(trend.name) : `Trend ${index + 1}`}</h4>
                    </div>
                    {isObject(trend) && trend.description && (
                      <p className="text-sm text-muted-foreground mb-2">{String(trend.description)}</p>
                    )}
                    {isObject(trend) && trend.impact && (
                      <Badge variant="outline">{String(trend.impact)} impact</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No trend data available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EnhancedMarketIntelligenceSection;
