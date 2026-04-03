import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Lightbulb, RefreshCw, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { OpportunityCard } from "@/components/OpportunityCard";
import { OpportunityFilters } from "@/components/OpportunityFilters";
import { OpportunityDetailsModal } from "@/components/OpportunityDetailsModal";
import { WorkspaceActivity } from "@/components/WorkspaceActivity";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EnhancedLoadingSkeleton } from "@/components/EnhancedLoadingSkeleton";
import { EnhancedOpportunityCard } from "@/components/EnhancedOpportunityCard";
import { PaginationControls } from "@/components/PaginationControls";
import { usePagination } from "@/hooks/usePagination";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { logger } from "@/utils/logger";
import { GuestTransferService } from "@/utils/enhancedGuestTransfer";
import { ModernBackground } from "@/components/ui/modern-background";


interface BusinessOpportunity {
  id: string;
  title: string;
  description: string;
  problem_statement: string;
  target_market: string;
  solution_approach: string | null;
  market_size_estimate: string;
  competition_level: string;
  difficulty_level: string;
  time_to_market: string;
  founder_fit_score: number;
  ai_confidence_score: number;
  opportunity_tags: string[];
  is_favorited: boolean;
  validation_status: string;
  assigned_to?: string;
  created_at?: string;
  updated_at?: string;
  source?: 'discovery' | 'mvp_generated' | 'manual' | 'imported';
}

interface FilterState {
  search: string;
  competition: string[];
  difficulty: string[];
  marketSize: string[];
  timeToMarket: string[];
  validationStatus: string[];
  assignedTo: string[];
  source: string[];
  founderFitMin: number;
  aiConfidenceMin: number;
  tags: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const PAGE_SIZE = 20;

const Opportunities = () => {
  const navigate = useNavigate();
  const { currentOrganization, isLoading: workspaceLoading } = useWorkspace();
  const { canUseFeature, getUsagePercentage, incrementUsage } = useFeatureGating(currentOrganization?.id);
  const isMobile = useIsMobile();
  const [opportunities, setOpportunities] = useState<BusinessOpportunity[]>([]);
  const [user, setUser] = useState<any>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<BusinessOpportunity | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [transferFailed, setTransferFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestOpportunities, setGuestOpportunities] = useState<any[]>([]);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState<string>('');
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedOpportunity, setHighlightedOpportunity] = useState<string | null>(null);
  const opportunityRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    competition: [],
    difficulty: [],
    marketSize: [],
    timeToMarket: [],
    validationStatus: [],
    assignedTo: [],
    source: [],
    founderFitMin: 0,
    aiConfidenceMin: 0,
    tags: [],
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const loadData = useCallback(async () => {
    logger.debug('Starting data load...');
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        navigate("/auth");
        return;
      }
      
      setUser(user);
      await loadOpportunities();
    } catch (error) {
      logger.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const loadOpportunities = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      logger.debug('Loading opportunities for user:', user.id);
      
      const { data: memberships, error: membershipsError } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          organizations!inner(id, name)
        `)
        .eq('user_id', user.id);

      if (membershipsError) {
        logger.error('Error loading memberships:', membershipsError);
        throw membershipsError;
      }

      const organizationIds = memberships?.map(m => m.organization_id) || [];
      logger.debug('Found organizations:', organizationIds.length);
      
      if (organizationIds.length === 0) {
        setOpportunities([]);
        return;
      }

      const { data, error } = await supabase
        .from('business_opportunities')
        .select('*')
        .in('organization_id', organizationIds)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

      if (error) {
        logger.error('Error loading opportunities:', error);
        throw error;
      }

      logger.debug(`Loaded ${data?.length || 0} opportunities`);

      // Fetch validation workflows to get real validation status
      const opportunityIds = (data || []).map(opp => opp.id);
      let workflowMap: Record<string, any> = {};
      if (opportunityIds.length > 0) {
        const { data: workflows } = await supabase
          .from('validation_workflows')
          .select('opportunity_id, status, composite_score, automated_score, reddit_validation_results')
          .in('opportunity_id', opportunityIds);

        if (workflows) {
          for (const wf of workflows) {
            workflowMap[wf.opportunity_id] = wf;
          }
        }
      }

      setOpportunities((data || []).map(opp => {
        const wf = workflowMap[opp.id];
        let validationStatus = opp.validation_status || 'not_started';

        // Derive actual validation status from workflow data
        if (wf) {
          if (wf.composite_score > 0 || wf.status === 'ready_to_build' || wf.status === 'needs_focused_tasks' || wf.status === 'needs_validation' || wf.status === 'completed') {
            validationStatus = 'completed';
          } else if (wf.status === 'in_progress' || wf.automated_score > 0 || wf.reddit_validation_results) {
            validationStatus = 'in_progress';
          }
        }

        return {
          ...opp,
          validation_status: validationStatus,
          source: (opp.source as 'discovery' | 'mvp_generated' | 'manual' | 'imported') || 'discovery'
        };
      }));
    } catch (error) {
      logger.error('Error loading opportunities:', error);
      throw error;
    }
  }, []);

  // Enhanced guest opportunity transfer with background retry
  useEffect(() => {
    if (!user?.id) return;
    
    // Check if there are opportunities to transfer
    if (!GuestTransferService.hasGuestOpportunities()) return;

    // Wait for workspace to load before attempting transfer
    if (workspaceLoading) return;

    // Start background transfer service once workspace is ready
    const startBackgroundTransfer = async () => {
      try {
        setIsTransferring(true);
        setTransferStatus('Preparing workspace...');
        logger.debug('Starting background guest transfer for user:', user.id);
        
        if (currentOrganization?.id) {
          setTransferStatus('Transferring opportunities...');
          // Organization is ready, transfer immediately
          const result = await GuestTransferService.transferGuestOpportunities(
            user.id,
            currentOrganization.id
          );
          
          if (result.success && result.opportunitiesTransferred > 0) {
            setTransferStatus('Success!');
            toast({
              title: "🎉 Opportunities Saved!",
              description: `${result.opportunitiesTransferred} opportunities from your guest session have been saved to your account!`,
            });
            // Clear guest state on success
            setGuestOpportunities([]);
            setTransferFailed(false);
            loadOpportunities();
          } else if (!result.success) {
            logger.warn('Direct transfer failed:', result.error);
            setTransferFailed(true);
            setGuestOpportunities([]);
          }
        } else {
          // No organization yet, mark as failed so we show the retry button
          logger.warn('No organization available for transfer');
          setTransferFailed(true);
        }
        
      } catch (error) {
        logger.error('Error starting background transfer:', error);
        setTransferFailed(true);
        setGuestOpportunities([]);
      } finally {
        setIsTransferring(false);
        setTransferStatus('');
      }
    };

    // Add timeout protection to prevent infinite loading
    const transferTimeout = setTimeout(() => {
      if (isTransferring) {
        logger.warn('Transfer timeout - clearing states');
        setIsTransferring(false);
        setTransferStatus('');
        setTransferFailed(true);
      }
    }, 30000); // 30 second timeout

    startBackgroundTransfer();
    
    return () => {
      clearTimeout(transferTimeout);
    };
  }, [user?.id, currentOrganization?.id, workspaceLoading, toast, loadOpportunities]);

  // Load guest opportunities to show immediately while transfer happens
  useEffect(() => {
    if (GuestTransferService.hasGuestOpportunities()) {
      try {
        const guestData = localStorage.getItem('guestOpportunities');
        if (guestData) {
          const parsed = JSON.parse(guestData);
          setGuestOpportunities(parsed);
        }
      } catch (error) {
        console.error('Error loading guest opportunities:', error);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle highlighting from URL parameters
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    logger.debug('Highlight Effect - highlightId:', highlightId, 'opportunities.length:', opportunities.length);
    
    if (highlightId && opportunities.length > 0) {
      logger.debug('Setting highlighted opportunity:', highlightId);
      setHighlightedOpportunity(highlightId);
      
      setTimeout(() => {
        const element = opportunityRefs.current[highlightId];
        logger.debug('Scroll element found:', !!element);
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);

      setTimeout(() => {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('highlight');
        setSearchParams(newSearchParams, { replace: true });
      }, 1000);
    } else if (highlightId && opportunities.length === 0) {
      logger.debug('Highlight ID found but opportunities not loaded yet');
    }
  }, [searchParams, opportunities.length, setSearchParams]);

  const clearHighlight = useCallback(() => {
    if (highlightedOpportunity) {
      logger.debug('Clearing highlight on user interaction');
      setHighlightedOpportunity(null);
    }
  }, [highlightedOpportunity]);

  // Utility to create slug for deduplication
  const slugifyTitle = (title: string): string => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Calculate evidence strength for sorting
  const getEvidenceStrength = (opportunity: any): number => {
    const redditAnalysis = opportunity.reddit_analysis || {};
    const validationScore = redditAnalysis.validation_score || 0;
    const communityEngagement = redditAnalysis.community_engagement || 0;
    const painPointsCount = (redditAnalysis.pain_points || []).length;
    
    return validationScore * 0.5 + communityEngagement * 0.3 + Math.min(painPointsCount * 5, 20);
  };

  // Calculate validation statistics for onboarding
  const hasValidatedOpportunities = opportunities.some(opp => 
    opp.validation_status === 'completed' || opp.validation_status === 'in_progress'
  );
  const completedValidationsCount = opportunities.filter(opp => 
    opp.validation_status === 'completed'
  ).length;

  const filteredAndSortedOpportunities = useMemo(() => {
    // First, deduplicate by slug (keep most recent)
    const deduplicatedMap = new Map<string, any>();
    
    opportunities.forEach(opportunity => {
      const slug = slugifyTitle(opportunity.title);
      const existing = deduplicatedMap.get(slug);
      
      if (!existing || new Date(opportunity.updated_at || opportunity.created_at) > new Date(existing.updated_at || existing.created_at)) {
        deduplicatedMap.set(slug, opportunity);
      }
    });

    const deduplicatedOpportunities = Array.from(deduplicatedMap.values());

    // Apply filters
    let filtered = deduplicatedOpportunities.filter(opportunity => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          opportunity.title.toLowerCase().includes(searchLower) ||
          opportunity.description.toLowerCase().includes(searchLower) ||
          opportunity.problem_statement.toLowerCase().includes(searchLower) ||
          opportunity.target_market.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (filters.competition.length > 0 && !filters.competition.includes(opportunity.competition_level)) {
        return false;
      }

      if (filters.difficulty.length > 0 && !filters.difficulty.includes(opportunity.difficulty_level)) {
        return false;
      }

      if (filters.marketSize.length > 0 && !filters.marketSize.includes(opportunity.market_size_estimate)) {
        return false;
      }

      if (filters.timeToMarket.length > 0 && !filters.timeToMarket.includes(opportunity.time_to_market)) {
        return false;
      }

      if (filters.validationStatus.length > 0 && !filters.validationStatus.includes(opportunity.validation_status)) {
        return false;
      }

      if (filters.assignedTo.length > 0) {
        const isAssigned = !!opportunity.assigned_to;
        const hasAssignedFilter = filters.assignedTo.includes('assigned');
        const hasUnassignedFilter = filters.assignedTo.includes('unassigned');
        
        if ((isAssigned && !hasAssignedFilter) || (!isAssigned && !hasUnassignedFilter)) {
          return false;
        }
      }

      if (filters.source.length > 0 && !filters.source.includes(opportunity.source || 'discovery')) {
        return false;
      }

      if (opportunity.founder_fit_score < filters.founderFitMin) {
        return false;
      }

      if (opportunity.ai_confidence_score < filters.aiConfidenceMin) {
        return false;
      }

      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => opportunity.opportunity_tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      return true;
    });

    // Sort with evidence strength as default
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'founder_fit_score':
          comparison = a.founder_fit_score - b.founder_fit_score;
          break;
        case 'ai_confidence_score':
          comparison = a.ai_confidence_score - b.ai_confidence_score;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'created_at':
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
        default:
          // Default: sort by evidence strength, then by creation date
          const evidenceA = getEvidenceStrength(a);
          const evidenceB = getEvidenceStrength(b);
          comparison = evidenceB - evidenceA; // Higher evidence first
          
          if (comparison === 0) {
            comparison = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
          }
      }

      // If primary sort values are equal, use id as secondary sort for stable ordering
      if (comparison === 0) {
        comparison = a.id.localeCompare(b.id);
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [opportunities, filters]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    opportunities.forEach(opp => {
      opp.opportunity_tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [opportunities]);

  const toggleFavorite = useCallback(async (opportunityId: string) => {
    clearHighlight();
    try {
      const opportunity = opportunities.find(opp => opp.id === opportunityId);
      if (!opportunity) return;

      const { error } = await supabase
        .from('business_opportunities')
        .update({ is_favorited: !opportunity.is_favorited })
        .eq('id', opportunityId);

      if (error) {
        logger.error('Error updating favorite:', error);
        return;
      }

      setOpportunities(opportunities.map(opp => 
        opp.id === opportunityId 
          ? { ...opp, is_favorited: !opp.is_favorited }
          : opp
      ));

      toast({
        title: opportunity.is_favorited ? "Removed from favorites" : "Added to favorites",
        description: `${opportunity.title} ${opportunity.is_favorited ? 'removed from' : 'added to'} your favorites.`,
      });
    } catch (error) {
      logger.error('Error toggling favorite:', error);
    }
  }, [opportunities, clearHighlight, toast]);

  const handleStartValidation = useCallback((opportunityId: string) => {
    clearHighlight();
    const hasValidatedBefore = localStorage.getItem('hasValidatedBefore');
    if (!hasValidatedBefore) {
      localStorage.setItem('hasValidatedBefore', 'true');
      toast({
        title: "You're making progress! 🚀",
        description: "Starting your first validation workflow - this is where ideas become reality.",
      });
    }
    navigate(`/validation/${opportunityId}`);
  }, [clearHighlight, toast, navigate]);

  const handleDeleteOpportunity = useCallback(async (opportunityId: string) => {
    try {
      const { error } = await supabase
        .from('business_opportunities')
        .delete()
        .eq('id', opportunityId);

      if (error) throw error;

      // Update local state - remove the deleted opportunity
      setOpportunities(prev => prev.filter(opp => opp.id !== opportunityId));

      toast({
        title: "Opportunity deleted",
        description: "The opportunity and all associated data have been permanently deleted.",
      });
    } catch (error: any) {
      console.error('Error deleting opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to delete opportunity. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleViewDetails = useCallback((opportunityId: string) => {
    clearHighlight();
    const opportunity = opportunities.find(opp => opp.id === opportunityId);
    if (opportunity) {
      setSelectedOpportunity(opportunity);
      setIsDetailsModalOpen(true);
    }
  }, [opportunities, clearHighlight]);

  const handleAssigneeChange = useCallback(async (opportunityId: string, assigneeId?: string) => {
    clearHighlight();
    try {
      const { error } = await supabase
        .from('business_opportunities')
        .update({ assigned_to: assigneeId || null })
        .eq('id', opportunityId);

      if (error) throw error;

      setOpportunities(prev => 
        prev.map(opp => 
          opp.id === opportunityId 
            ? { ...opp, assigned_to: assigneeId }
            : opp
        )
      );

      toast({
        title: "Assignment updated",
        description: assigneeId 
          ? "Opportunity has been assigned successfully."
          : "Opportunity has been unassigned.",
      });
    } catch (error) {
      logger.error('Error updating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to update assignment. Please try again.",
        variant: "destructive",
      });
    }
  }, [clearHighlight, toast]);

  const {
    paginatedData: paginatedOpportunities,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage
  } = usePagination(filteredAndSortedOpportunities, { pageSize: PAGE_SIZE });

  // Pull-to-refresh functionality
  const handleRefresh = useCallback(async () => {
    try {
      await loadData();
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(50); // Haptic feedback
      }
      toast({
        title: "Opportunities refreshed",
        description: "Your opportunities have been updated.",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh opportunities. Please try again.",
        variant: "destructive",
      });
    }
  }, [loadData, isMobile, toast]);

  const { pullDistance, isRefreshing: pullRefreshing } = usePullToRefresh(
    handleRefresh,
    80,
    isMobile
  );

  if (loading) {
    return (
      <ModernBackground variant="mesh">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <Badge variant="outline" className="px-4 py-2 mb-4">
              <Target className="w-4 h-4 mr-2" />
              Loading Opportunities...
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Your <span className="text-gradient-primary">Business</span> Opportunities
            </h2>
          </div>
          <EnhancedLoadingSkeleton count={6} showPulse={true} />
        </div>
      </ModernBackground>
    );
  }

  if (error) {
    return (
      <ModernBackground variant="mesh">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="text-center space-y-6 mt-16">
            <div className="flex items-center justify-center">
              <Target className="w-16 h-16 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Loading Error</h2>
              <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
            </div>
            <Button onClick={loadData} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        </div>
      </ModernBackground>
    );
  }

  return (
    <div 
      className="overflow-auto"
      style={{
        transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance, 120)}px)` : 'none',
        transition: pullDistance > 0 ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      <ModernBackground variant="mesh">
      {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-b"
          style={{ height: `${Math.min(pullDistance, 120)}px` }}
        >
          <div className="flex items-center gap-2 text-primary">
            <RefreshCw className={`w-5 h-5 ${pullRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">
              {pullRefreshing ? 'Refreshing...' : pullDistance >= 80 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {transferFailed && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-yellow-800">Guest Opportunities Not Transferred</h3>
                <p className="text-yellow-700 text-sm mt-1">
                  We couldn't automatically save your guest opportunities. Click below to try again.
                </p>
              </div>
              <Button
                onClick={async () => {
                  if (!user?.id || !currentOrganization?.id) return;
                  setIsTransferring(true);
                  setTransferStatus('Retrying transfer...');
                  const result = await GuestTransferService.transferGuestOpportunities(user.id, currentOrganization.id);
                  if (result.success) {
                    setTransferFailed(false);
                    setGuestOpportunities([]);
                    setIsTransferring(false);
                    setTransferStatus('');
                    toast({ title: "✅ Opportunities Saved!", description: `${result.opportunitiesTransferred} opportunities transferred successfully.` });
                    loadOpportunities();
                  } else {
                    setIsTransferring(false);
                    setTransferStatus('');
                    toast({ title: "Transfer Failed", description: result.error || "Please try again later.", variant: "destructive" });
                  }
                }}
                size="sm"
                variant="outline"
              >
                Save Opportunities
              </Button>
            </div>
          </div>
        )}
        
        {(guestOpportunities.length > 0 || isTransferring) && !transferFailed && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-800">
                  {isTransferring ? 'Processing Opportunities' : 'Guest Opportunities Found'}
                </h3>
                <p className="text-blue-700 text-sm mt-1">
                  {isTransferring && transferStatus ? transferStatus : 
                   `${guestOpportunities.length} opportunities from your guest session are being saved to your account...`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-600">
                  {isTransferring ? 'Processing...' : 'Saving...'}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {(opportunities.length === 0 && guestOpportunities.length === 0) ? (
          <div className="text-center space-y-6 mt-16">
            <div className="flex items-center justify-center">
              <Lightbulb className="w-16 h-16 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">No Opportunities Yet</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Start discovering new business opportunities tailored to your skills and interests.
              </p>
            </div>
            <Button onClick={() => {
              if (!canUseFeature('opportunities')) {
                setShowUpgradePrompt(true);
                return;
              }
              navigate("/discovery");
            }} className="gap-2">
              <Zap className="w-4 h-4" />
              {canUseFeature('opportunities') ? 'Discover New Opportunities' : 'Upgrade to Create More'}
            </Button>
          </div>
        ) : (
          <>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8 gap-4">
              <div className="space-y-2">
                <Badge variant="outline" className="px-3 py-1.5 md:px-4 md:py-2">
                  <Target className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                  {opportunities.length + guestOpportunities.length} Opportunities Found
                  {guestOpportunities.length > 0 && (
                    <span className="ml-2 text-xs text-blue-600">
                      ({guestOpportunities.length} being saved)
                    </span>
                  )}
                </Badge>
                <h2 className="text-2xl md:text-4xl font-bold">
                  Your <span className="text-gradient-primary">Business</span> Opportunities
                </h2>
                <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
                  Manage, filter, and validate your personalized business opportunities.
                </p>
              </div>
              
              <Button 
                onClick={() => {
                  if (!canUseFeature('opportunities')) {
                    setShowUpgradePrompt(true);
                    return;
                  }
                  navigate("/discovery");
                }} 
                className="gap-2 self-start md:self-auto"
                size="default"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {canUseFeature('opportunities') ? 'Modify & Generate New Ideas' : 'Upgrade to Create More'}
                </span>
                <span className="sm:hidden">
                  {canUseFeature('opportunities') ? 'New Ideas' : 'Upgrade'}
                </span>
              </Button>
            </div>

            <div className="mb-6">
              <OpportunityFilters
                filters={filters}
                onFiltersChange={setFilters}
                availableTags={availableTags}
                opportunityCount={opportunities.length}
                filteredCount={filteredAndSortedOpportunities.length}
              />
            </div>

            {filteredAndSortedOpportunities.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No opportunities match your filters</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your filters or search terms</p>
                <Button variant="outline" onClick={() => setFilters({
                  search: '',
                  competition: [],
                  difficulty: [],
                  marketSize: [],
                  timeToMarket: [],
                  validationStatus: [],
                  assignedTo: [],
                  source: [],
                  founderFitMin: 0,
                  aiConfidenceMin: 0,
                  tags: [],
                  sortBy: 'created_at',
                  sortOrder: 'desc'
                })}>
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                <div className="flex-1 space-y-6 lg:space-y-8">
                  <div className="grid gap-4 md:gap-6">
                    {paginatedOpportunities.map((opportunity) => (
                      <div
                        key={opportunity.id}
                        ref={(el) => {
                          opportunityRefs.current[opportunity.id] = el;
                        }}
                      >
                        <EnhancedOpportunityCard
                          opportunity={opportunity}
                          onToggleFavorite={toggleFavorite}
                          onStartValidation={handleStartValidation}
                          onViewDetails={handleViewDetails}
                          onAssigneeChange={handleAssigneeChange}
                          onDeleteOpportunity={handleDeleteOpportunity}
                          isHighlighted={highlightedOpportunity === opportunity.id}
                        />
                      </div>
                    ))}
                  </div>

                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    hasNextPage={hasNextPage}
                    hasPreviousPage={hasPreviousPage}
                    onPageChange={goToPage}
                    onNext={nextPage}
                    onPrevious={previousPage}
                    totalItems={filteredAndSortedOpportunities.length}
                    pageSize={PAGE_SIZE}
                  />
                </div>
                
                <div className="hidden lg:block">
                  <WorkspaceActivity />
                </div>
              </div>
            )}
          </>
        )}
      </div>


      <OpportunityDetailsModal
        opportunity={selectedOpportunity}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedOpportunity(null);
        }}
        onRefresh={() => window.location.reload()}
        onToggleFavorite={toggleFavorite}
        onStartValidation={handleStartValidation}
      />
      </ModernBackground>
    </div>
  );
};

export default Opportunities;
