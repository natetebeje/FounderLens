import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, ExternalLink, TrendingUp, Users, Clock, BookmarkPlus, Eye, Sparkles } from 'lucide-react';
import { DiscussionSummarizer } from './DiscussionSummarizer';
import { useAuth } from '@/hooks/useAuth';

interface RedditDiscussion {
  id: string;
  post_id: string;
  title: string;
  selftext?: string;
  url?: string;
  author: string;
  subreddit: string;
  score: number;
  num_comments: number;
  upvote_ratio?: number;
  created_utc: number;
  permalink?: string;
  full_content: any;
  top_comments: any;
  engagement_metrics: any;
  relevance_score: number;
  pain_points_extracted: any;
  solutions_mentioned: any;
  is_marked_for_mvp: boolean;
}

interface RedditDiscussionBrowserProps {
  opportunityId: string;
  organizationId?: string;
}

export const RedditDiscussionBrowser: React.FC<RedditDiscussionBrowserProps> = ({
  opportunityId,
  organizationId,
}) => {
  const { toast } = useToast();
  const { user, session, loading: authLoading, isAuthenticated, refreshSession } = useAuth();
  const [discussions, setDiscussions] = useState<RedditDiscussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiscussion, setSelectedDiscussion] = useState<RedditDiscussion | null>(null);
  const [showSummarizer, setShowSummarizer] = useState(false);
  const [markedForMvp, setMarkedForMvp] = useState<Set<string>>(new Set());
  const [retryCount, setRetryCount] = useState(0);

  // Debug function to check RLS access
  const debugAccess = useCallback(async () => {
    if (!opportunityId) return;
    
    try {
      console.log('🔍 Debugging Reddit discussions access...');
      console.log('User:', user);
      console.log('Opportunity ID:', opportunityId);
      console.log('Organization ID:', organizationId);

      // Call debug function
      const { data: debugData, error: debugError } = await supabase
        .rpc('debug_reddit_discussions_access', { p_opportunity_id: opportunityId });
      
      if (debugError) {
        console.error('❌ Debug function error:', debugError);
      } else {
        console.log('🔧 Debug data:', debugData);
      }
    } catch (error) {
      console.error('💥 Debug access error:', error);
    }
  }, [opportunityId, user, organizationId]);

  const loadDiscussions = useCallback(async () => {
    if (!opportunityId) {
      console.log('⚠️ No opportunity ID provided');
      setLoading(false);
      return;
    }
    
    // Enhanced authentication checks with session validation
    if (authLoading) {
      console.log('⏳ Authentication still loading, waiting...');
      return;
    }
    
    if (!isAuthenticated || !user || !session) {
      console.log('⚠️ User not authenticated properly', { 
        isAuthenticated, 
        hasUser: !!user, 
        hasSession: !!session,
        sessionExpiry: session?.expires_at 
      });
      setLoading(false);
      return;
    }

    // Verify session is still valid
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      console.log('⚠️ Session expired, cannot proceed');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📥 Loading Reddit discussions for opportunity:', opportunityId);
      console.log('🔐 Auth context:', { 
        userId: user.id, 
        sessionValid: true,
        attempt: retryCount + 1,
        sessionToken: session.access_token?.substring(0, 20) + '...'
      });
      
      // Force session refresh to ensure auth context is current
      try {
        const freshSession = await refreshSession();
        if (freshSession) {
          console.log('✅ Session refreshed successfully');
        }
      } catch (sessionError) {
        console.warn('⚠️ Session refresh failed:', sessionError);
      }
      
      // Run debug check first
      await debugAccess();
      
      // Wait a bit for auth context to propagate
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify auth context is properly set in client
      const { data: sessionCheck } = await supabase.auth.getSession();
      if (!sessionCheck.session) {
        console.log('⚠️ No active session in client, retrying...');
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => loadDiscussions(), 1500);
          return;
        }
      }
      
      console.log('🔍 Making query with session:', {
        hasSession: !!sessionCheck.session,
        userId: sessionCheck.session?.user?.id,
        expiresAt: sessionCheck.session?.expires_at
      });
      
      const { data, error } = await supabase
        .from('reddit_discussions')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('relevance_score', { ascending: false });

      console.log('📊 Query result:', { 
        dataCount: data?.length || 0, 
        error: error?.message || null, 
        retryCount 
      });

      if (error) {
        console.error('❌ Error loading discussions:', error);
        
        // If it's an RLS error, try with explicit session token check
        if (error.message.includes('row-level security') && retryCount < 5) {
          console.log('🔄 RLS error, retrying with fresh auth context...');
          setRetryCount(prev => prev + 1);
          
          // Force a session refresh before retrying
          await refreshSession();
          setTimeout(() => loadDiscussions(), 2000);
          return;
        }
        
        toast({
          title: "Error",
          description: `Failed to load discussions: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log(`✅ Successfully loaded ${data?.length || 0} discussions`);
        setRetryCount(0); // Reset retry count on success
        
        const processedData = (data || []).map(d => ({
          ...d,
          top_comments: Array.isArray(d.top_comments) ? d.top_comments : [],
          pain_points_extracted: Array.isArray(d.pain_points_extracted) ? d.pain_points_extracted : [],
          solutions_mentioned: Array.isArray(d.solutions_mentioned) ? d.solutions_mentioned : []
        }));

        setDiscussions(processedData);
        setMarkedForMvp(new Set(processedData?.filter(d => d.is_marked_for_mvp).map(d => d.id) || []));
      }
    } catch (error) {
      console.error('💥 Error loading discussions:', error);
      toast({
        title: "Error",
        description: "Failed to load Reddit discussions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [opportunityId, user, session, isAuthenticated, authLoading, debugAccess, toast, retryCount, refreshSession]);

  useEffect(() => {
    // Only load discussions when authentication is fully established
    if (!authLoading && isAuthenticated && user && session) {
      loadDiscussions();
    }
  }, [loadDiscussions, authLoading, isAuthenticated, user, session]);

  const toggleMvpMark = async (discussionId: string) => {
    try {
      const isCurrentlyMarked = markedForMvp.has(discussionId);
      const newMarkedState = !isCurrentlyMarked;

      const { error } = await supabase
        .from('reddit_discussions')
        .update({ is_marked_for_mvp: newMarkedState })
        .eq('id', discussionId);

      if (error) throw error;

      setMarkedForMvp(prev => {
        const newSet = new Set(prev);
        if (newMarkedState) {
          newSet.add(discussionId);
        } else {
          newSet.delete(discussionId);
        }
        return newSet;
      });

      toast({
        title: "Success",
        description: `Discussion ${newMarkedState ? 'marked' : 'unmarked'} for MVP analysis`,
      });
    } catch (error) {
      console.error('Error updating MVP mark:', error);
      toast({
        title: "Error",
        description: "Failed to update discussion",
        variant: "destructive",
      });
    }
  };

  const formatTimeAgo = (utcSeconds: number) => {
    const now = Date.now() / 1000;
    const diffSeconds = now - utcSeconds;
    const days = Math.floor(diffSeconds / 86400);
    const hours = Math.floor((diffSeconds % 86400) / 3600);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Recent';
  };

  const getEngagementColor = (score: number) => {
    if (score >= 100) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const filteredDiscussions = discussions.filter(discussion =>
    discussion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discussion.subreddit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Establishing secure connection...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <div className="text-center p-8">
          <p className="text-muted-foreground">Please log in to view Reddit discussions.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Reddit Discussion Explorer</h3>
          <p className="text-sm text-muted-foreground">
            {discussions.length} discussions found • {markedForMvp.size} marked for MVP
          </p>
        </div>
        <Button
          onClick={() => setShowSummarizer(true)}
          disabled={markedForMvp.size === 0}
          className="flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Analyze Selected ({markedForMvp.size})
        </Button>
      </div>

      <Input
        placeholder="Search discussions by title or subreddit..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

      <div className="grid gap-4">
        {filteredDiscussions.map((discussion) => (
          <Card key={discussion.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">
                    {discussion.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      r/{discussion.subreddit}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTimeAgo(discussion.created_utc)}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      u/{discussion.author}
                    </span>
                  </CardDescription>
                </div>
                <Badge variant={markedForMvp.has(discussion.id) ? "default" : "secondary"}>
                  {discussion.relevance_score}% match
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {discussion.selftext && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {discussion.selftext}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm">
                  <span className={`flex items-center gap-1 ${getEngagementColor(discussion.score)}`}>
                    <TrendingUp className="w-4 h-4" />
                    {discussion.score} upvotes
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MessageSquare className="w-4 h-4" />
                    {discussion.num_comments} comments
                  </span>
                  {discussion.upvote_ratio && (
                    <span className="text-muted-foreground">
                      {Math.round(discussion.upvote_ratio * 100)}% upvoted
                    </span>
                  )}
                </div>

                {(discussion.pain_points_extracted.length > 0 || discussion.solutions_mentioned.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {discussion.pain_points_extracted.slice(0, 3).map((point, idx) => (
                      <Badge key={idx} variant="destructive" className="text-xs">
                        Pain: {point}
                      </Badge>
                    ))}
                    {discussion.solutions_mentioned.slice(0, 2).map((solution, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        Solution: {solution}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle className="line-clamp-2">{discussion.title}</DialogTitle>
                        <DialogDescription>
                          r/{discussion.subreddit} • u/{discussion.author} • {formatTimeAgo(discussion.created_utc)}
                        </DialogDescription>
                      </DialogHeader>
                      <Tabs defaultValue="content" className="w-full">
                        <TabsList>
                          <TabsTrigger value="content">Content</TabsTrigger>
                          <TabsTrigger value="comments">Comments ({discussion.top_comments.length})</TabsTrigger>
                          <TabsTrigger value="analysis">Analysis</TabsTrigger>
                        </TabsList>
                        <TabsContent value="content" className="space-y-4">
                          <ScrollArea className="h-[400px] p-4">
                            {discussion.selftext ? (
                              <div className="prose prose-sm max-w-none">
                                <p className="whitespace-pre-wrap">{discussion.selftext}</p>
                              </div>
                            ) : (
                              <p className="text-muted-foreground">This is a link post with no text content.</p>
                            )}
                            {discussion.url && (
                              <div className="mt-4 p-4 bg-muted rounded-lg">
                                <a href={discussion.url} target="_blank" rel="noopener noreferrer" 
                                   className="flex items-center gap-2 text-primary hover:underline">
                                  <ExternalLink className="w-4 h-4" />
                                  View Original Link
                                </a>
                              </div>
                            )}
                          </ScrollArea>
                        </TabsContent>
                        <TabsContent value="comments" className="space-y-4">
                          <ScrollArea className="h-[400px] p-4">
                            {(Array.isArray(discussion.top_comments) ? discussion.top_comments : []).map((comment: any, idx: number) => (
                              <div key={idx} className="mb-4 p-4 border rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium">u/{comment.author}</span>
                                  <span className="text-sm text-muted-foreground">{comment.score} points</span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                              </div>
                            ))}
                          </ScrollArea>
                        </TabsContent>
                        <TabsContent value="analysis" className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold mb-2">Pain Points</h4>
                              <div className="space-y-1">
                                {discussion.pain_points_extracted.map((point, idx) => (
                                  <Badge key={idx} variant="destructive" className="block w-fit">
                                    {point}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Solutions Mentioned</h4>
                              <div className="space-y-1">
                                {discussion.solutions_mentioned.map((solution, idx) => (
                                  <Badge key={idx} variant="secondary" className="block w-fit">
                                    {solution}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant={markedForMvp.has(discussion.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleMvpMark(discussion.id)}
                    className="flex items-center gap-2"
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    {markedForMvp.has(discussion.id) ? 'Marked for MVP' : 'Mark for MVP'}
                  </Button>

                  {discussion.permalink && (
                    <Button variant="ghost" size="sm" asChild>
                      <a 
                        href={`https://reddit.com${discussion.permalink}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Reddit
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showSummarizer && (
        <DiscussionSummarizer
          discussionIds={Array.from(markedForMvp)}
          opportunityId={opportunityId}
          organizationId={organizationId}
          onClose={() => setShowSummarizer(false)}
        />
      )}
    </div>
  );
};