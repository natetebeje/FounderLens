import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useUsageTracking = (organizationId?: string) => {
  const { toast } = useToast();

  const incrementUsage = useCallback(async (resourceType: string) => {
    if (!organizationId) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Call the increment_usage database function
      const { error } = await supabase.rpc('increment_usage', {
        p_user_id: user.user.id,
        p_organization_id: organizationId,
        p_resource_type: resourceType
      });

      if (error) {
        console.error('Error incrementing usage:', error);
        return;
      }

      console.log(`Usage incremented for ${resourceType}`);
    } catch (error) {
      console.error('Error in incrementUsage:', error);
    }
  }, [organizationId]);

  const checkUsageLimit = useCallback(async (featureName: string): Promise<boolean> => {
    if (!organizationId) return false;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      // Call the check_feature_limit database function
      const { data, error } = await supabase.rpc('check_feature_limit', {
        p_user_id: user.user.id,
        p_organization_id: organizationId,
        p_feature_name: featureName
      });

      if (error) {
        console.error('Error checking feature limit:', error);
        return false;
      }

      return data as boolean;
    } catch (error) {
      console.error('Error in checkUsageLimit:', error);
      return false;
    }
  }, [organizationId]);

  return {
    incrementUsage,
    checkUsageLimit
  };
};