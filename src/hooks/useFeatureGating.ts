
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUsageTracking } from './useUsageTracking';
import { useSubscription } from './useSubscription';
import { logger } from '@/utils/logger';

interface FeatureLimits {
  opportunities: number | null;
  team_members: number | null;
  ai_generations: number | null;
  validations: number | null;
  advanced_analytics: number | null;
  enterprise_features: number | null;
}

interface UsageData {
  opportunities: number;
  team_members: number;
  ai_generations: number;
  validations: number;
  advanced_analytics: number;
  enterprise_features: number;
}

export const useFeatureGating = (organizationId?: string) => {
  const { plan_tier, loading: subscriptionLoading } = useSubscription();
  const { incrementUsage: trackUsage } = useUsageTracking(organizationId);
  const [limits, setLimits] = useState<FeatureLimits>({
    opportunities: null,
    team_members: null,
    ai_generations: null,
    validations: null,
    advanced_analytics: null,
    enterprise_features: null
  });
  const [usage, setUsage] = useState<UsageData>({
    opportunities: 0,
    team_members: 0,
    ai_generations: 0,
    validations: 0,
    advanced_analytics: 0,
    enterprise_features: 0
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchLimitsAndUsage = useCallback(async () => {
    if (!organizationId || subscriptionLoading) return;
    
    try {
      setLoading(true);
      
      // Check if current user is admin - enhanced logging
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('user_id', user.id)
          .single();
        
        const adminStatus = profileData?.is_admin || false;
        setIsAdmin(adminStatus);
        console.log('useFeatureGating: Admin status check:', {
          userId: user.id,
          isAdmin: adminStatus,
          organizationId,
          planTier: plan_tier
        });
      }
      
      // Fetch feature limits for current plan
      const { data: limitsData, error: limitsError } = await supabase
        .from('feature_gates')
        .select('feature_name, limit_value')
        .eq('plan_tier', plan_tier);

      if (limitsError) throw limitsError;

      // Initialize with database values - no hardcoded fallbacks
      const newLimits: FeatureLimits = {
        opportunities: null,
        team_members: null,
        ai_generations: null,
        validations: null,
        advanced_analytics: null,
        enterprise_features: null
      };

      // Apply database values
      limitsData?.forEach(limit => {
        if (limit.feature_name in newLimits) {
          newLimits[limit.feature_name as keyof FeatureLimits] = limit.limit_value;
        }
      });

      setLimits(newLimits);

      // Get real usage counts using the database function
      const resourceTypes = ['opportunities', 'team_members', 'ai_generations', 'validations'];
      const newUsage: UsageData = {
        opportunities: 0,
        team_members: 0,
        ai_generations: 0,
        validations: 0,
        advanced_analytics: 0,
        enterprise_features: 0
      };

      for (const resourceType of resourceTypes) {
        try {
          const { data: count, error } = await supabase.rpc('get_real_usage_count', {
            p_organization_id: organizationId,
            p_resource_type: resourceType
          });

          if (!error && count !== null) {
            switch (resourceType) {
              case 'opportunities':
                newUsage.opportunities = count;
                break;
              case 'team_members':
                newUsage.team_members = count;
                break;
              case 'ai_generations':
                newUsage.ai_generations = count;
                break;
              case 'validations':
                newUsage.validations = count;
                break;
            }
          }
        } catch (error) {
          logger.error(`Error fetching usage for ${resourceType}:`, error);
        }
      }

      setUsage(newUsage);
    } catch (error) {
      logger.error('Error fetching feature limits and usage:', error);
    } finally {
      setLoading(false);
    }
  }, [plan_tier, organizationId, subscriptionLoading]);

  useEffect(() => {
    fetchLimitsAndUsage();
  }, [fetchLimitsAndUsage]);

  const canUseFeature = useCallback((feature: keyof FeatureLimits): boolean => {
    // Admins bypass all feature limits - enhanced logging
    if (isAdmin) {
      console.log('useFeatureGating: Admin bypass activated for feature:', feature, 'organizationId:', organizationId);
      return true;
    }
    
    const limit = limits[feature];
    const currentUsage = usage[feature];
    
    console.log('useFeatureGating: Feature check:', {
      feature,
      limit,
      currentUsage,
      organizationId,
      planTier: plan_tier,
      isAdmin
    });
    
    // Null limit means unlimited
    if (limit === null) return true;
    
    const canUse = currentUsage < limit;
    if (!canUse) {
      console.warn('useFeatureGating: Feature limit reached!', {
        feature,
        limit,
        currentUsage,
        organizationId,
        planTier: plan_tier,
        isAdmin
      });
    }
    
    return canUse;
  }, [isAdmin, limits, usage, organizationId, plan_tier]);

  const getUsagePercentage = useCallback((feature: keyof FeatureLimits): number => {
    const limit = limits[feature];
    const currentUsage = usage[feature];
    
    // Unlimited features show 0%
    if (limit === null) return 0;
    
    return Math.min((currentUsage / limit) * 100, 100);
  }, [limits, usage]);

  const getRemainingUsage = useCallback((feature: keyof FeatureLimits): number | null => {
    const limit = limits[feature];
    const currentUsage = usage[feature];
    
    // Null limit means unlimited
    if (limit === null) return null;
    
    return Math.max(limit - currentUsage, 0);
  }, [limits, usage]);

  const incrementUsage = useCallback((featureName: keyof FeatureLimits) => {
    trackUsage(featureName);
    // Update local state optimistically
    setUsage(prev => ({
      ...prev,
      [featureName]: (prev[featureName] || 0) + 1
    }));
  }, [trackUsage]);

  return {
    limits,
    usage,
    loading,
    canUseFeature,
    getUsagePercentage,
    getRemainingUsage,
    incrementUsage,
    planTier: plan_tier,
    isAdmin
  };
};
