import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions?: {
    userSegment?: string[];
    planTier?: string[];
    organization?: string[];
  };
  config?: Record<string, any>;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface ABTestVariant {
  key: string;
  name: string;
  weight: number;
  config: Record<string, any>;
}

interface ABTest {
  key: string;
  name: string;
  enabled: boolean;
  variants: ABTestVariant[];
  userVariant?: string;
  conversionGoal: string;
  description?: string;
}

export const useFeatureFlags = () => {
  const [flags, setFlags] = useState<Record<string, FeatureFlag>>({});
  const [abTests, setABTests] = useState<Record<string, ABTest>>({});
  const [userVariants, setUserVariants] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeatureFlags();
    loadABTests();
  }, []);

  const loadFeatureFlags = async () => {
    try {
      // Simulate loading feature flags from a service
      const mockFlags: Record<string, FeatureFlag> = {
        'enhanced-onboarding': {
          key: 'enhanced-onboarding',
          enabled: true,
          rolloutPercentage: 50,
          description: 'New streamlined onboarding flow',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        'ai-suggestions': {
          key: 'ai-suggestions',
          enabled: true,
          rolloutPercentage: 100,
          conditions: {
            planTier: ['pro', 'enterprise']
          },
          description: 'AI-powered optimization suggestions',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        'team-collaboration-v2': {
          key: 'team-collaboration-v2',
          enabled: false,
          rolloutPercentage: 10,
          description: 'New team collaboration features',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        'advanced-analytics': {
          key: 'advanced-analytics',
          enabled: true,
          rolloutPercentage: 25,
          conditions: {
            planTier: ['enterprise']
          },
          description: 'Advanced analytics dashboard',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      setFlags(mockFlags);
    } catch (err) {
      console.error('Failed to load feature flags:', err);
      setError('Failed to load feature flags');
    }
  };

  const loadABTests = async () => {
    try {
      const mockABTests: Record<string, ABTest> = {
        'onboarding-flow': {
          key: 'onboarding-flow',
          name: 'Onboarding Flow Optimization',
          enabled: true,
          conversionGoal: 'onboarding_completion',
          variants: [
            {
              key: 'control',
              name: 'Original Flow',
              weight: 50,
              config: { skipTeamSetup: false, progressBar: false }
            },
            {
              key: 'simplified',
              name: 'Simplified Flow',
              weight: 50,
              config: { skipTeamSetup: true, progressBar: true }
            }
          ],
          description: 'Testing simplified onboarding flow'
        },
        'pricing-page': {
          key: 'pricing-page',
          name: 'Pricing Page Layout',
          enabled: true,
          conversionGoal: 'subscription_signup',
          variants: [
            {
              key: 'control',
              name: 'Standard Layout',
              weight: 60,
              config: { highlightPopular: false, showDiscount: false }
            },
            {
              key: 'highlight',
              name: 'Popular Plan Highlighted',
              weight: 40,
              config: { highlightPopular: true, showDiscount: true }
            }
          ],
          description: 'Testing pricing page variations'
        }
      };

      setABTests(mockABTests);
      
      // Assign user to variants
      const variants: Record<string, string> = {};
      Object.keys(mockABTests).forEach(testKey => {
        const test = mockABTests[testKey];
        if (test.enabled) {
          variants[testKey] = assignUserToVariant(test);
        }
      });
      setUserVariants(variants);
    } catch (err) {
      console.error('Failed to load A/B tests:', err);
      setError('Failed to load A/B tests');
    } finally {
      setIsLoading(false);
    }
  };

  const assignUserToVariant = (test: ABTest): string => {
    // Simple random assignment based on weights
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const variant of test.variants) {
      cumulative += variant.weight;
      if (random <= cumulative) {
        return variant.key;
      }
    }
    
    return test.variants[0].key; // Fallback to first variant
  };

  const isFeatureEnabled = (flagKey: string, userContext?: {
    planTier?: string;
    userSegment?: string;
    organizationId?: string;
  }): boolean => {
    const flag = flags[flagKey];
    if (!flag || !flag.enabled) {
      return false;
    }

    // Check conditions
    if (flag.conditions && userContext) {
      if (flag.conditions.planTier && userContext.planTier) {
        if (!flag.conditions.planTier.includes(userContext.planTier)) {
          return false;
        }
      }
      
      if (flag.conditions.userSegment && userContext.userSegment) {
        if (!flag.conditions.userSegment.includes(userContext.userSegment)) {
          return false;
        }
      }
    }

    // Check rollout percentage
    const userHash = Math.random(); // In real implementation, use consistent user ID hash
    return userHash * 100 <= flag.rolloutPercentage;
  };

  const getFeatureConfig = (flagKey: string, defaultConfig: Record<string, any> = {}): Record<string, any> => {
    const flag = flags[flagKey];
    if (!flag || !isFeatureEnabled(flagKey)) {
      return defaultConfig;
    }
    return { ...defaultConfig, ...flag.config };
  };

  const getABTestVariant = (testKey: string): string | null => {
    const test = abTests[testKey];
    if (!test || !test.enabled) {
      return null;
    }
    return userVariants[testKey] || null;
  };

  const getABTestConfig = (testKey: string, defaultConfig: Record<string, any> = {}): Record<string, any> => {
    const test = abTests[testKey];
    const variantKey = getABTestVariant(testKey);
    
    if (!test || !variantKey) {
      return defaultConfig;
    }

    const variant = test.variants.find(v => v.key === variantKey);
    if (!variant) {
      return defaultConfig;
    }

    return { ...defaultConfig, ...variant.config };
  };

  const trackConversion = async (goal: string, testKey?: string) => {
    try {
      console.log('Tracking conversion:', { goal, testKey, userVariants });
      
      // In a real implementation, this would send data to your analytics service
      const conversionData = {
        goal,
        timestamp: new Date().toISOString(),
        testKey,
        variant: testKey ? userVariants[testKey] : undefined,
        userId: 'current-user-id' // Get from auth context
      };
      
      // Store in local storage for now (in production, send to analytics service)
      const existing = JSON.parse(localStorage.getItem('ab_test_conversions') || '[]');
      existing.push(conversionData);
      localStorage.setItem('ab_test_conversions', JSON.stringify(existing.slice(-100)));
      
    } catch (err) {
      console.error('Failed to track conversion:', err);
    }
  };

  const getAllFlags = () => flags;
  const getAllTests = () => abTests;

  return {
    flags,
    abTests,
    userVariants,
    isLoading,
    error,
    isFeatureEnabled,
    getFeatureConfig,
    getABTestVariant,
    getABTestConfig,
    trackConversion,
    getAllFlags,
    getAllTests
  };
};