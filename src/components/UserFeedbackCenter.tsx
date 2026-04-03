import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  Star, 
  TrendingUp, 
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Users,
  Target,
  Plus,
  Filter,
  Search,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'feature_request' | 'bug_report' | 'general' | 'review';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in_review' | 'planned' | 'in_progress' | 'completed' | 'declined';
  category: string;
  rating?: number;
  votes: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

interface FeedbackMetrics {
  totalFeedback: number;
  averageRating: number;
  responseTime: number;
  satisfactionScore: number;
  featureRequests: number;
  bugReports: number;
  trends: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

interface FeedbackSurvey {
  id: string;
  title: string;
  type: 'nps' | 'csat' | 'ces' | 'custom';
  status: 'draft' | 'active' | 'completed';
  responses: number;
  score: number;
  createdAt: string;
}

export const UserFeedbackCenter: React.FC = () => {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [metrics, setMetrics] = useState<FeedbackMetrics>({
    totalFeedback: 0,
    averageRating: 0,
    responseTime: 0,
    satisfactionScore: 0,
    featureRequests: 0,
    bugReports: 0,
    trends: { positive: 0, negative: 0, neutral: 0 }
  });
  const [surveys, setSurveys] = useState<FeedbackSurvey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadFeedbackData();
  }, []);

  const loadFeedbackData = async () => {
    setIsLoading(true);
    try {
      // Simulate loading feedback data
      const mockFeedback: FeedbackItem[] = [
        {
          id: '1',
          userId: 'user1',
          userName: 'Sarah Chen',
          userEmail: 'sarah@example.com',
          type: 'feature_request',
          title: 'Better team collaboration tools',
          description: 'Would love to see real-time collaboration features like comments and mentions on opportunities.',
          priority: 'high',
          status: 'planned',
          category: 'Collaboration',
          votes: 23,
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-16T14:20:00Z',
          tags: ['collaboration', 'teams', 'real-time']
        },
        {
          id: '2',
          userId: 'user2',
          userName: 'Mike Johnson',
          userEmail: 'mike@example.com',
          type: 'bug_report',
          title: 'Export functionality not working',
          description: 'When trying to export opportunities to CSV, the download fails with a 500 error.',
          priority: 'critical',
          status: 'in_progress',
          category: 'Export',
          votes: 12,
          createdAt: '2024-01-14T16:45:00Z',
          updatedAt: '2024-01-15T09:15:00Z',
          tags: ['export', 'csv', 'download']
        },
        {
          id: '3',
          userId: 'user3',
          userName: 'Emma Davis',
          userEmail: 'emma@example.com',
          type: 'review',
          title: 'Great product overall!',
          description: 'Really loving the AI suggestions feature. Has helped me discover opportunities I never would have found.',
          priority: 'low',
          status: 'completed',
          category: 'General',
          rating: 5,
          votes: 8,
          createdAt: '2024-01-13T11:20:00Z',
          updatedAt: '2024-01-13T11:20:00Z',
          tags: ['ai', 'positive', 'discovery']
        },
        {
          id: '4',
          userId: 'user4',
          userName: 'Alex Rivera',
          userEmail: 'alex@example.com',
          type: 'feature_request',
          title: 'Mobile app development',
          description: 'A mobile app would be incredibly useful for reviewing opportunities on the go.',
          priority: 'medium',
          status: 'new',
          category: 'Mobile',
          votes: 45,
          createdAt: '2024-01-12T14:30:00Z',
          updatedAt: '2024-01-12T14:30:00Z',
          tags: ['mobile', 'app', 'ios', 'android']
        }
      ];

      const mockMetrics: FeedbackMetrics = {
        totalFeedback: 156,
        averageRating: 4.3,
        responseTime: 2.5,
        satisfactionScore: 87,
        featureRequests: 89,
        bugReports: 23,
        trends: {
          positive: 78,
          negative: 12,
          neutral: 10
        }
      };

      const mockSurveys: FeedbackSurvey[] = [
        {
          id: '1',
          title: 'Net Promoter Score Q1 2024',
          type: 'nps',
          status: 'active',
          responses: 234,
          score: 67,
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          title: 'Feature Satisfaction Survey',
          type: 'csat',
          status: 'completed',
          responses: 156,
          score: 4.2,
          createdAt: '2023-12-15T00:00:00Z'
        }
      ];

      setFeedbackItems(mockFeedback);
      setMetrics(mockMetrics);
      setSurveys(mockSurveys);
    } catch (error) {
      console.error('Failed to load feedback data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feedback data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'feature_request': return <Plus className="h-4 w-4" />;
      case 'bug_report': return <AlertCircle className="h-4 w-4" />;
      case 'review': return <Star className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'destructive';
      case 'in_review': return 'default';
      case 'planned': return 'default';
      case 'in_progress': return 'default';
      case 'completed': return 'secondary';
      case 'declined': return 'outline';
      default: return 'secondary';
    }
  };

  const filteredFeedback = feedbackItems.filter(item => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.userName.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesStatus && matchesSearch;
  });

  const updateFeedbackStatus = async (feedbackId: string, newStatus: string) => {
    setFeedbackItems(prev =>
      prev.map(item =>
        item.id === feedbackId
          ? { ...item, status: newStatus as any, updatedAt: new Date().toISOString() }
          : item
      )
    );

    toast({
      title: 'Status Updated',
      description: 'Feedback status has been updated successfully',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">User Feedback Center</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">User Feedback Center</h2>
        </div>
        
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Survey
        </Button>
      </div>

      {/* Feedback Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalFeedback}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {metrics.averageRating}
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-muted-foreground">Out of 5 stars</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.responseTime}d</div>
            <p className="text-xs text-muted-foreground">Average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.satisfactionScore}%</div>
            <p className="text-xs text-muted-foreground">CSAT score</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="feedback" className="space-y-4">
        <TabsList>
          <TabsTrigger value="feedback">Feedback Items</TabsTrigger>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="feedback" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search feedback..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Types</option>
              <option value="feature_request">Feature Requests</option>
              <option value="bug_report">Bug Reports</option>
              <option value="review">Reviews</option>
              <option value="general">General</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="in_review">In Review</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          {/* Feedback Items */}
          <div className="space-y-4">
            {filteredFeedback.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.type)}
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <Badge variant={getPriorityColor(item.priority)}>
                        {item.priority}
                      </Badge>
                      <Badge variant={getStatusColor(item.status)}>
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4" />
                      <span className="text-sm">{item.votes}</span>
                    </div>
                  </div>
                  <CardDescription>
                    By {item.userName} • {new Date(item.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{item.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <select
                        value={item.status}
                        onChange={(e) => updateFeedbackStatus(item.id, e.target.value)}
                        className="px-2 py-1 text-xs border rounded"
                      >
                        <option value="new">New</option>
                        <option value="in_review">In Review</option>
                        <option value="planned">Planned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="declined">Declined</option>
                      </select>
                      <Button size="sm" variant="outline">
                        Reply
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="surveys" className="space-y-4">
          <div className="grid gap-4">
            {surveys.map((survey) => (
              <Card key={survey.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{survey.title}</CardTitle>
                    <Badge variant={survey.status === 'active' ? 'default' : 'secondary'}>
                      {survey.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {survey.type.toUpperCase()} • {survey.responses} responses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">
                        {survey.type === 'nps' ? survey.score : `${survey.score}/5`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {survey.type === 'nps' ? 'NPS Score' : 'Average Score'}
                      </div>
                    </div>
                    <Button variant="outline">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Feedback Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                    Positive
                  </span>
                  <span className="font-bold">{metrics.trends.positive}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <ThumbsDown className="h-4 w-4 text-red-500" />
                    Negative
                  </span>
                  <span className="font-bold">{metrics.trends.negative}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-500" />
                    Neutral
                  </span>
                  <span className="font-bold">{metrics.trends.neutral}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Feature Requests</span>
                  <span className="font-bold">{metrics.featureRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bug Reports</span>
                  <span className="font-bold">{metrics.bugReports}</span>
                </div>
                <div className="flex justify-between">
                  <span>General Feedback</span>
                  <span className="font-bold">{metrics.totalFeedback - metrics.featureRequests - metrics.bugReports}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};