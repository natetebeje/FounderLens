import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Quote,
  AlertCircle,
  CheckCircle,
  Target,
  Lightbulb,
  ArrowUp
} from 'lucide-react';

interface CommunityInsights {
  activeCommunities: number;
  topCommunities: Array<{ name: string; discussions: number }>;
  discussionTrends: {
    recent: number;
    growing: boolean;
    sentiment: string;
  };
  validationLevel: 'high' | 'medium' | 'low';
}

interface PainPointAnalysis {
  totalPainPoints: number;
  categories: string[];
  topQuotes: Array<{
    text: string;
    source: string;
    engagement: number;
  }>;
  intensityScore: number;
}

interface EngagementMetrics {
  totalDiscussions: number;
  averageEngagement: number;
  highEngagementPosts: number;
  engagementScore: number;
}

interface CommunityIntelligenceProps {
  communityInsights?: CommunityInsights;
  painPointAnalysis?: PainPointAnalysis;
  engagementMetrics?: EngagementMetrics;
  totalDiscussions?: number;
  dataQuality?: number;
  className?: string;
}

export const CommunityIntelligence: React.FC<CommunityIntelligenceProps> = ({
  communityInsights,
  painPointAnalysis,
  engagementMetrics,
  totalDiscussions = 0,
  dataQuality = 0,
  className = ''
}) => {
  const getValidationStatus = () => {
    if (dataQuality >= 70) return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'High Confidence' };
    if (dataQuality >= 40) return { icon: Target, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Medium Confidence' };
    return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Low Confidence' };
  };

  const formatCategoryName = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const status = getValidationStatus();
  const StatusIcon = status.icon;

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Community Intelligence
          </CardTitle>
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${status.color}`} />
            <Badge variant="outline" className={`${status.color} ${status.bg} ${status.border}`}>
              {status.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overview Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Discussions</span>
            </div>
            <div className="text-xl font-bold text-blue-700">{totalDiscussions}</div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Pain Points</span>
            </div>
            <div className="text-xl font-bold text-green-700">{painPointAnalysis?.totalPainPoints || 0}</div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Communities</span>
            </div>
            <div className="text-xl font-bold text-purple-700">{communityInsights?.activeCommunities || 0}</div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Data Quality</span>
            </div>
            <div className="text-xl font-bold text-orange-700">{dataQuality}%</div>
          </div>
        </div>

        {/* Pain Point Categories */}
        {painPointAnalysis?.categories && painPointAnalysis.categories.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Pain Point Categories
            </h4>
            <div className="flex flex-wrap gap-2">
              {painPointAnalysis.categories.map((category, index) => (
                <Badge key={index} variant="secondary" className="capitalize">
                  {formatCategoryName(category)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Top User Quotes */}
        {painPointAnalysis?.topQuotes && painPointAnalysis.topQuotes.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Quote className="w-4 h-4" />
              Top Community Insights
            </h4>
            <div className="space-y-3">
              {painPointAnalysis.topQuotes.slice(0, 3).map((quote, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-700 italic mb-2">"{quote.text}..."</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Source: {quote.source}</span>
                    <div className="flex items-center gap-1">
                      <ArrowUp className="w-3 h-3" />
                      <span>{quote.engagement}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Community Activity */}
        {communityInsights?.topCommunities && communityInsights.topCommunities.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Communities
            </h4>
            <div className="space-y-2">
              {communityInsights.topCommunities.map((community, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">{community.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {community.discussions} discussions
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engagement Summary */}
        {engagementMetrics && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Engagement Analysis
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Average Engagement:</span>
                <div className="font-bold text-blue-900">{engagementMetrics.averageEngagement} votes</div>
              </div>
              <div>
                <span className="text-blue-700">High-Engagement Posts:</span>
                <div className="font-bold text-blue-900">{engagementMetrics.highEngagementPosts}</div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Level */}
        {communityInsights?.validationLevel && (
          <div className={`rounded-lg p-4 ${status.bg} ${status.border} border`}>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className={`w-4 h-4 ${status.color}`} />
              <span className={`font-medium ${status.color}`}>Market Validation</span>
            </div>
            <p className="text-sm text-gray-700">
              {communityInsights.validationLevel === 'high' && 
                'Strong community validation with active discussions and clear pain points identified.'}
              {communityInsights.validationLevel === 'medium' && 
                'Moderate community interest with some validation signals present.'}
              {communityInsights.validationLevel === 'low' && 
                'Limited community validation - consider expanding research or direct customer outreach.'}
            </p>
          </div>
        )}

        {/* Enhanced No Data State */}
        {totalDiscussions === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <h4 className="font-medium text-gray-700 mb-2">Limited Community Discussions</h4>
            <p className="text-sm text-gray-600 mb-4">
              No relevant business discussions found for this opportunity. This could indicate:
            </p>
            <div className="text-left max-w-md mx-auto space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span><strong>Market Gap:</strong> Potential first-mover advantage with minimal competition</span>
              </div>
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span><strong>Validation Opportunity:</strong> Direct customer research may be needed</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span><strong>Niche Market:</strong> Specialized opportunity with targeted audience</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};