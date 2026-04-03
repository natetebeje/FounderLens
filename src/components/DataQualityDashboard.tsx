
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Database,
  Filter,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DataQualityMetrics {
  totalOpportunities: number;
  highQualityCount: number;
  mediumQualityCount: number;
  lowQualityCount: number;
  flaggedForReview: number;
  averageConfidenceScore: number;
  lastUpdated: string;
}

interface QualityIssue {
  opportunityId: string;
  opportunityTitle: string;
  issueType: 'irrelevant_content' | 'low_confidence' | 'data_mismatch' | 'generic_analysis';
  severity: 'high' | 'medium' | 'low';
  description: string;
  createdAt: string;
}

export const DataQualityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DataQualityMetrics | null>(null);
  const [qualityIssues, setQualityIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadDataQualityMetrics = async () => {
    try {
      setLoading(true);
      
      // Load business opportunities with validation data
      const { data: opportunities, error } = await supabase
        .from('business_opportunities')
        .select(`
          id,
          title,
          ai_confidence_score,
          validation_status,
          reddit_analysis,
          created_at,
          validation_workflows(
            automated_score,
            automated_validation_results
          )
        `);

      if (error) throw error;

      // Analyze data quality
      const qualityAnalysis = analyzeDataQuality(opportunities || []);
      setMetrics(qualityAnalysis.metrics);
      setQualityIssues(qualityAnalysis.issues);

    } catch (error) {
      console.error('Error loading data quality metrics:', error);
      toast({
        title: "Error loading data quality metrics",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeDataQuality = (opportunities: any[]) => {
    const issues: QualityIssue[] = [];
    let highQuality = 0;
    let mediumQuality = 0;
    let lowQuality = 0;
    let totalConfidence = 0;

    opportunities.forEach(opp => {
      const confidenceScore = opp.ai_confidence_score || 0;
      const redditAnalysis = opp.reddit_analysis || {};
      const validationResults = opp.validation_workflows?.[0]?.automated_validation_results;

      totalConfidence += confidenceScore;

      // Classify quality based on confidence and data completeness
      if (confidenceScore >= 70 && redditAnalysis.has_real_data) {
        highQuality++;
      } else if (confidenceScore >= 40) {
        mediumQuality++;
      } else {
        lowQuality++;
      }

      // Check for quality issues
      if (confidenceScore < 30) {
        issues.push({
          opportunityId: opp.id,
          opportunityTitle: opp.title,
          issueType: 'low_confidence',
          severity: 'high',
          description: `Very low confidence score: ${confidenceScore}%`,
          createdAt: opp.created_at
        });
      }

      // Check Reddit analysis quality
      if (redditAnalysis.pain_points) {
        const irrelevantKeywords = ['boyfriend', 'girlfriend', 'game', 'movie', 'personal'];
        const hasIrrelevantContent = redditAnalysis.pain_points.some((point: string) =>
          irrelevantKeywords.some(keyword => point.toLowerCase().includes(keyword))
        );

        if (hasIrrelevantContent) {
          issues.push({
            opportunityId: opp.id,
            opportunityTitle: opp.title,
            issueType: 'irrelevant_content',
            severity: 'high',
            description: 'Contains irrelevant or personal content in pain points',
            createdAt: opp.created_at
          });
        }
      }

      // Check for generic analysis
      if (validationResults?._qualityMetadata?.isGenericOpportunity) {
        issues.push({
          opportunityId: opp.id,
          opportunityTitle: opp.title,
          issueType: 'generic_analysis',
          severity: 'medium',
          description: 'Analysis appears generic and lacks specificity',
          createdAt: opp.created_at
        });
      }
    });

    return {
      metrics: {
        totalOpportunities: opportunities.length,
        highQualityCount: highQuality,
        mediumQualityCount: mediumQuality,
        lowQualityCount: lowQuality,
        flaggedForReview: issues.filter(i => i.severity === 'high').length,
        averageConfidenceScore: opportunities.length > 0 ? Math.round(totalConfidence / opportunities.length) : 0,
        lastUpdated: new Date().toISOString()
      },
      issues: issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10)
    };
  };

  const refreshData = () => {
    loadDataQualityMetrics();
    toast({
      title: "Data refreshed",
      description: "Quality metrics have been updated"
    });
  };

  useEffect(() => {
    loadDataQualityMetrics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Data Quality Dashboard</h2>
        </div>
        <div className="text-center py-8">Loading quality metrics...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Data Quality Dashboard</h2>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Unable to load data quality metrics. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Data Quality Dashboard</h2>
        </div>
        <Button onClick={refreshData} size="sm" variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quality Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOpportunities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">High Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-green-600">{metrics.highQualityCount}</div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Needs Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-red-600">{metrics.flaggedForReview}</div>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg. Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{metrics.averageConfidenceScore}%</div>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Quality Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>High Quality (70%+ confidence, verified data)</span>
              </div>
              <Badge variant="secondary">{metrics.highQualityCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Medium Quality (40-69% confidence)</span>
              </div>
              <Badge variant="secondary">{metrics.mediumQualityCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Low Quality (&lt;40% confidence)</span>
              </div>
              <Badge variant="secondary">{metrics.lowQualityCount}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Issues */}
      {qualityIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Recent Quality Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {qualityIssues.map((issue, index) => (
                <Alert key={index} className={issue.severity === 'high' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
                  <div className="flex items-start gap-3">
                    {issue.severity === 'high' ? 
                      <XCircle className="w-4 h-4 text-red-600 mt-0.5" /> :
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    }
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{issue.opportunityTitle}</span>
                        <Badge variant={issue.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                          {issue.issueType.replace('_', ' ')}
                        </Badge>
                      </div>
                      <AlertDescription>{issue.description}</AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-gray-500">
        Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};
