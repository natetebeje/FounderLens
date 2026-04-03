import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { SimplifiedValidationSignals } from "@/components/SimplifiedValidationSignals";
import { ModernBackground } from "@/components/ui/modern-background";

const ValidationWorkflowSimplified = () => {
  const { opportunityId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization } = useWorkspace();

  const [opportunity, setOpportunity] = useState<any>(null);
  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<any>(null);

  const loadData = async (silent = false) => {
    if (!opportunityId) return;

    if (!silent) setLoading(true);
    try {
      const { data: opportunityData, error: oppError } = await supabase
        .from('business_opportunities')
        .select('*')
        .eq('id', opportunityId)
        .single();

      if (oppError) throw oppError;
      setOpportunity(opportunityData);

      const { data: workflowData, error: workflowError } = await supabase
        .rpc('get_or_create_validation_workflow', {
          p_opportunity_id: opportunityId
        });

      if (workflowError) throw workflowError;
      setWorkflow(workflowData?.[0]);

    } catch (error) {
      console.error('Error loading data:', error);
      if (!silent) setError('Failed to load validation data');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [opportunityId]);

  const getCurrentValidationStatus = () => {
    if (!workflow) return { score: 0, status: 'needs_validation', hasAiValidation: false, hasRedditValidation: false };

    // DB defaults JSONB columns to '{}' — an empty object is truthy in JS,
    // so we must check for non-empty objects to avoid false positives.
    const hasData = (obj: any) => obj != null && typeof obj === 'object' && Object.keys(obj).length > 0;

    const neverRun = workflow.status === 'not_started' || workflow.status === 'needs_validation';
    const hasRealResults = hasData(workflow.automated_validation_results) || hasData(workflow.reddit_validation_results);
    const hasRun = !neverRun || hasRealResults;

    const persistedResults = hasRun ? {
      composite_score: workflow.composite_score || 0,
      status: workflow.status,
      ai_score: workflow.automated_score || 0,
      reddit_score: 0,
      last_signal_at: workflow.last_signal_at
    } : null;

    return {
      score: persistedResults?.composite_score || validationResults?.composite_score || 0,
      status: hasRun ? (workflow.status || 'needs_validation') : (validationResults?.status || 'not_started'),
      hasAiValidation: hasRun && (!!workflow.automated_score || hasData(workflow.automated_validation_results)),
      hasRedditValidation: hasRun && hasData(workflow.reddit_validation_results),
      persistedResults
    };
  };

  const handleSignalsComplete = (results: any) => {
    setValidationResults(results);
    loadData(true);
  };

  if (loading) {
    return (
      <ModernBackground variant="mesh" className="pt-16">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => navigate('/opportunities')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </ModernBackground>
    );
  }

  if (error || !opportunity) {
    return (
      <ModernBackground variant="mesh" className="pt-16">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => navigate('/opportunities')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error || 'Opportunity not found'}</p>
            <Button onClick={() => loadData()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </ModernBackground>
    );
  }

  const validationStatus = getCurrentValidationStatus();

  return (
    <ModernBackground variant="mesh" className="pt-16">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/opportunities')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Opportunities
          </Button>
        </div>

        {/* Single-flow Validation */}
        <SimplifiedValidationSignals
          opportunity={opportunity}
          onSignalsComplete={handleSignalsComplete}
          initialResults={validationStatus.persistedResults || validationResults}
          validationStatus={validationStatus}
        />
      </div>
    </ModernBackground>
  );
};

export default ValidationWorkflowSimplified;
