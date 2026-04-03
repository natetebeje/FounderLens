
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, TrendingUp, Users, Target, AlertCircle, CheckCircle, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MarketResearchTaskProps {
  taskId: string;
  title: string;
  description: string;
  opportunity: any;
  onComplete: (taskId: string, results: any) => void;
}

interface ResearchResults {
  googleTrends: {
    trend: string;
    score: number;
    searchVolume: number;
    relatedQueries: string[];
  };
  competitors: Array<{
    name: string;
    strength: string;
    weakness: string;
    marketShare?: string;
  }>;
  marketSize: {
    tam: string;
    sam: string;
    som: string;
    growthRate: string;
  };
  customerInsights: string[];
  dataSources: string[];
  confidence: number;
  researchMethodology: string[];
}

export const MarketResearchTask = ({ 
  taskId, 
  title, 
  description, 
  opportunity, 
  onComplete 
}: MarketResearchTaskProps) => {
  const [isResearching, setIsResearching] = useState(false);
  const [researchResults, setResearchResults] = useState<ResearchResults | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const conductMarketResearch = async () => {
    setIsResearching(true);
    setProgress(0);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('🔍 Starting AI market research for:', opportunity.title);

      // Simulate research progress
      const progressSteps = [
        { name: 'Initializing AI Research', duration: 1000 },
        { name: 'Analyzing Market Trends', duration: 2000 },
        { name: 'Identifying Competitors', duration: 2500 },
        { name: 'Calculating Market Size', duration: 2000 },
        { name: 'Extracting Customer Insights', duration: 1500 },
        { name: 'Finalizing Research Report', duration: 1000 }
      ];

      let currentProgress = 0;
      for (let i = 0; i < progressSteps.length; i++) {
        const step = progressSteps[i];
        currentProgress = ((i + 1) / progressSteps.length) * 100;
        setProgress(currentProgress);
        
        if (i === 2) {
          // Start actual research call during the middle of progress
          const researchCall = supabase.functions.invoke('research-intelligence', {
            body: {
              opportunityId: opportunity.id,
              title: opportunity.title,
              description: opportunity.description,
              targetMarket: opportunity.target_market,
              userId: user.id
            }
          });
          
          // Continue with remaining progress steps
          for (let j = i + 1; j < progressSteps.length; j++) {
            setTimeout(() => {
              const progressValue = ((j + 1) / progressSteps.length) * 100;
              setProgress(progressValue);
            }, progressSteps[j].duration);
          }
          
          // Wait for research to complete
          const { data, error } = await researchCall;
          
          if (error) {
            console.error('Research intelligence error:', error);
            throw error;
          }
          
          setResearchResults(data);
          onComplete(taskId, data);
          
          if (data.confidence < 70) {
            toast.warning('Research completed with moderate confidence. Consider additional validation.');
          } else {
            toast.success('Market research completed successfully!');
          }
          
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, step.duration));
      }

    } catch (error) {
      console.error('Market research failed:', error);
      setError(error.message || 'Failed to conduct market research');
      toast.error('Market research failed. Please try again.');
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-500" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!researchResults && !isResearching && (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">AI-Powered Research Scope</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• AI-driven market trend analysis for "{opportunity.title}"</li>
                <li>• Intelligent competitor landscape mapping</li>
                <li>• Market sizing with growth projections</li>
                <li>• Customer insights from available data sources</li>
                <li>• Research methodology transparency</li>
              </ul>
            </div>
            
            <Button onClick={conductMarketResearch} className="w-full">
              <Brain className="w-4 h-4 mr-2" />
              Start AI Market Research
            </Button>
          </div>
        )}

        {isResearching && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="animate-pulse rounded-full h-8 w-8 bg-blue-100 mx-auto mb-4 flex items-center justify-center">
                <Brain className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-sm text-muted-foreground">AI is conducting comprehensive market research...</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Research Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="font-semibold text-red-800">Research Error</span>
            </div>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {researchResults && (
          <div className="space-y-4">
            {/* Data Sources & Confidence */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Data Sources:</span>
                <span className="text-sm text-muted-foreground">
                  {researchResults.dataSources.join(', ')}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {researchResults.confidence}% Confidence
              </Badge>
            </div>

            {/* Market Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="font-semibold text-sm">Market Trend</span>
                  </div>
                  <div className="text-2xl font-bold">{researchResults.googleTrends.score}/100</div>
                  <div className="text-sm text-muted-foreground">
                    {researchResults.googleTrends.searchVolume.toLocaleString()} monthly searches
                  </div>
                  <Badge variant="outline" className="mt-2">
                    {researchResults.googleTrends.trend}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-sm">Market Size</span>
                  </div>
                  <div className="text-2xl font-bold">{researchResults.marketSize.tam}</div>
                  <div className="text-sm text-muted-foreground">
                    TAM • SAM: {researchResults.marketSize.sam}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Growth: {researchResults.marketSize.growthRate}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Related Queries */}
            {researchResults.googleTrends.relatedQueries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Related Search Queries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {researchResults.googleTrends.relatedQueries.map((query, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {query}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Competitor Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Competitor Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {researchResults.competitors.map((competitor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{competitor.name}</div>
                        <div className="text-sm text-muted-foreground">{competitor.weakness}</div>
                        {competitor.marketShare && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Market Share: {competitor.marketShare}
                          </div>
                        )}
                      </div>
                      <Badge variant={
                        competitor.strength === 'high' ? 'destructive' : 
                        competitor.strength === 'medium' ? 'secondary' : 'default'
                      }>
                        {competitor.strength}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customer Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Customer Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {researchResults.customerInsights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-muted-foreground">{insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Research Methodology */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Research Methodology</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {researchResults.researchMethodology.map((method, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">{method}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Research Summary */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-800">AI Research Complete</span>
              </div>
              <p className="text-sm text-green-700">
                Comprehensive market research completed with {researchResults.confidence}% confidence. 
                The analysis shows {researchResults.googleTrends.trend} market trends with 
                {researchResults.competitors.length} competitors identified.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
