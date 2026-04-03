import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Brain, Edit3, Save, X, Lightbulb, Target, TrendingUp } from 'lucide-react';

interface DiscussionSummary {
  id: string;
  discussion_id: string;
  ai_generated_summary: string;
  user_edited_summary: string;
  key_pain_points: any;
  proposed_solutions: any;
  market_signals: any;
  user_demographics: any;
  confidence_score: number;
  is_relevant_for_mvp: boolean;
}

interface DiscussionSummarizerProps {
  discussionIds: string[];
  opportunityId: string;
  organizationId?: string;
  onClose: () => void;
}

export const DiscussionSummarizer: React.FC<DiscussionSummarizerProps> = ({
  discussionIds,
  opportunityId,
  organizationId,
  onClose,
}) => {
  const { toast } = useToast();
  const [summaries, setSummaries] = useState<DiscussionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedSummary, setEditedSummary] = useState('');

  useEffect(() => {
    loadExistingSummaries();
  }, [discussionIds]);

  const loadExistingSummaries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('discussion_summaries')
        .select('*')
        .in('discussion_id', discussionIds)
        .eq('opportunity_id', opportunityId);

      if (error) throw error;
      
      const processedData = (data || []).map(d => ({
        ...d,
        key_pain_points: Array.isArray(d.key_pain_points) ? d.key_pain_points : [],
        proposed_solutions: Array.isArray(d.proposed_solutions) ? d.proposed_solutions : [],
        market_signals: Array.isArray(d.market_signals) ? d.market_signals : []
      }));
      
      setSummaries(processedData);
    } catch (error) {
      console.error('Error loading summaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAISummaries = async () => {
    try {
      setGenerating(true);
      
      // Get discussion details
      const { data: discussions, error: discussionError } = await supabase
        .from('reddit_discussions')
        .select('*')
        .in('id', discussionIds);

      if (discussionError) throw discussionError;

      // Process each discussion
      for (const discussion of discussions) {
        // Skip if summary already exists
        if (summaries.some(s => s.discussion_id === discussion.id)) continue;

        try {
          // Call AI summarization edge function
          const { data: summaryData, error: summaryError } = await supabase.functions.invoke(
            'ai-discussion-analyzer',
            {
              body: {
                discussion: {
                  title: discussion.title,
                  content: discussion.selftext || '',
                  comments: discussion.top_comments || [],
                  subreddit: discussion.subreddit,
                  engagement: {
                    score: discussion.score,
                    comments: discussion.num_comments,
                    upvote_ratio: discussion.upvote_ratio
                  }
                },
                analysisType: 'comprehensive'
              }
            }
          );

          if (summaryError) {
            console.error('Error generating summary:', summaryError);
            continue;
          }

          // Save summary to database
          const { error: insertError } = await supabase
            .from('discussion_summaries')
            .insert({
              discussion_id: discussion.id,
              opportunity_id: opportunityId,
              organization_id: organizationId,
              user_id: (await supabase.auth.getUser()).data.user?.id,
              ai_generated_summary: summaryData.summary,
              key_pain_points: summaryData.painPoints || [],
              proposed_solutions: summaryData.solutions || [],
              market_signals: summaryData.marketSignals || [],
              user_demographics: summaryData.demographics || {},
              confidence_score: summaryData.confidenceScore || 0,
              is_relevant_for_mvp: true
            });

          if (insertError) throw insertError;

        } catch (error) {
          console.error('Error processing discussion:', discussion.id, error);
        }
      }

      // Reload summaries
      await loadExistingSummaries();
      
      toast({
        title: "Success",
        description: "AI analysis completed for selected discussions",
      });

    } catch (error) {
      console.error('Error generating summaries:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI summaries",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const startEditing = (summary: DiscussionSummary) => {
    setEditingId(summary.id);
    setEditedSummary(summary.user_edited_summary || summary.ai_generated_summary);
  };

  const saveEditedSummary = async (summaryId: string) => {
    try {
      const { error } = await supabase
        .from('discussion_summaries')
        .update({ user_edited_summary: editedSummary })
        .eq('id', summaryId);

      if (error) throw error;

      setSummaries(prev => prev.map(s => 
        s.id === summaryId 
          ? { ...s, user_edited_summary: editedSummary }
          : s
      ));

      setEditingId(null);
      setEditedSummary('');

      toast({
        title: "Success",
        description: "Summary updated successfully",
      });
    } catch (error) {
      console.error('Error saving summary:', error);
      toast({
        title: "Error",
        description: "Failed to save summary",
        variant: "destructive",
      });
    }
  };

  const generateMVPInsights = async () => {
    try {
      const relevantSummaries = summaries.filter(s => s.is_relevant_for_mvp);
      
      if (relevantSummaries.length === 0) {
        toast({
          title: "No Data",
          description: "Please mark some summaries as relevant for MVP first",
          variant: "destructive",
        });
        return;
      }

      // Call MVP insights generation edge function
      const { data, error } = await supabase.functions.invoke(
        'mvp-insights-generator',
        {
          body: {
            summaries: relevantSummaries,
            opportunityId,
            organizationId
          }
        }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: `Generated ${data.insights?.length || 0} MVP insights from discussions`,
      });

      onClose();
    } catch (error) {
      console.error('Error generating MVP insights:', error);
      toast({
        title: "Error",
        description: "Failed to generate MVP insights",
        variant: "destructive",
      });
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Discussion Analysis & Summarization
          </DialogTitle>
          <DialogDescription>
            Generate AI-powered summaries and extract MVP insights from {discussionIds.length} selected discussions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {summaries.length} summaries generated • {summaries.filter(s => s.is_relevant_for_mvp).length} marked for MVP
              </p>
            </div>
            <div className="flex items-center gap-2">
              {summaries.length === 0 && (
                <Button 
                  onClick={generateAISummaries}
                  disabled={generating}
                  className="flex items-center gap-2"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Brain className="w-4 h-4" />
                  )}
                  Generate AI Summaries
                </Button>
              )}
              {summaries.length > 0 && (
                <Button 
                  onClick={generateMVPInsights}
                  className="flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  Generate MVP Insights
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : summaries.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Ready to Analyze</h3>
                <p className="text-muted-foreground mb-4">
                  Generate AI-powered summaries to extract valuable insights from your selected discussions
                </p>
                <Button onClick={generateAISummaries} disabled={generating}>
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Brain className="w-4 h-4 mr-2" />
                  )}
                  Start Analysis
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {summaries.map((summary) => (
                  <Card key={summary.id} className="border-l-4 border-l-primary">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">Discussion Summary</CardTitle>
                          <CardDescription className="flex items-center gap-4">
                            <span className={`flex items-center gap-1 ${getConfidenceColor(summary.confidence_score)}`}>
                              <TrendingUp className="w-4 h-4" />
                              {summary.confidence_score}% confidence
                            </span>
                            <Badge variant={summary.is_relevant_for_mvp ? "default" : "secondary"}>
                              {summary.is_relevant_for_mvp ? "MVP Relevant" : "Analysis Only"}
                            </Badge>
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(summary)}
                          className="flex items-center gap-1"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="summary" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="summary">Summary</TabsTrigger>
                          <TabsTrigger value="painpoints">Pain Points</TabsTrigger>
                          <TabsTrigger value="solutions">Solutions</TabsTrigger>
                          <TabsTrigger value="signals">Market Signals</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="summary" className="space-y-4">
                          {editingId === summary.id ? (
                            <div className="space-y-3">
                              <Textarea
                                value={editedSummary}
                                onChange={(e) => setEditedSummary(e.target.value)}
                                placeholder="Edit the summary..."
                                className="min-h-[120px]"
                              />
                              <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => saveEditedSummary(summary.id)}>
                                  <Save className="w-4 h-4 mr-1" />
                                  Save
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                                  <X className="w-4 h-4 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="p-4 bg-muted/50 rounded-lg">
                                <p className="text-sm leading-relaxed">
                                  {summary.user_edited_summary || summary.ai_generated_summary}
                                </p>
                              </div>
                              {summary.user_edited_summary && (
                                <p className="text-xs text-muted-foreground">
                                  ✓ Edited by user
                                </p>
                              )}
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="painpoints" className="space-y-2">
                          {summary.key_pain_points.map((point, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                              <p className="text-sm">{point}</p>
                            </div>
                          ))}
                        </TabsContent>
                        
                        <TabsContent value="solutions" className="space-y-2">
                          {summary.proposed_solutions.map((solution, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                              <Lightbulb className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <p className="text-sm">{solution}</p>
                            </div>
                          ))}
                        </TabsContent>
                        
                        <TabsContent value="signals" className="space-y-2">
                          {summary.market_signals.map((signal, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                              <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <p className="text-sm">{signal}</p>
                            </div>
                          ))}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};