// App Configuration
export const APP_CONFIG = {
  name: 'FounderLens',
  description: 'Evidence-first Build Lab that helps solo founders and small product teams validate, build, and launch to first revenue in weeks—not months.',
  url: 'https://founderlens.com',
  supportEmail: 'support@founderlens.io',
  version: '1.0.0',
} as const;

// Feature Limits by Plan
export const PLAN_LIMITS = {
  free: {
    opportunities: 9, // 3 discoveries × 3 opportunities each
    team_members: 1,
    ai_generations: 5,
    validations: 2,
  },
  basic: {
    opportunities: 75, // 25 discoveries × 3 opportunities each
    team_members: 3,
    ai_generations: 50,
    validations: 10,
  },
  pro: {
    opportunities: null, // unlimited
    team_members: 10,
    ai_generations: null, // unlimited
    validations: null, // unlimited
  },
  pro_lifetime: {
    opportunities: null, // unlimited
    team_members: 10,
    ai_generations: 1000, // 1,000 per month
    validations: null, // unlimited
    storage_gb: 50,
    api_calls: 10000, // 10,000 per month
  },
  enterprise: {
    opportunities: null, // unlimited
    team_members: null, // unlimited
    ai_generations: null, // unlimited
    validations: null, // unlimited
  },
} as const;

// Lifetime Plan Pricing
export const LIFETIME_PLANS = {
  pro_lifetime: {
    name: 'Professional Lifetime',
    price: 1397, // $1,397 one-time
    originalMonthlyPrice: 99,
    multiplier: 14.1,
    description: 'All Professional features, yours forever',
    limitations: [
      '1,000 AI generations per month',
      '50GB storage limit',
      '10,000 API calls per month',
      'Email support only',
      'Major version upgrades may require migration'
    ]
  }
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  stripe: {
    createCheckout: '/functions/v1/create-checkout',
    customerPortal: '/functions/v1/customer-portal',
  },
  ai: {
    generateOpportunities: '/functions/v1/generate-opportunities',
    runValidation: '/functions/v1/run-automated-validation',
  },
} as const;

// Validation Status
export const VALIDATION_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

// Organization Roles
export const ORG_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  DISCOVERY_INTENT: 'discovery_intent',
  ONBOARDING_PROGRESS: 'onboarding_progress',
  THEME: 'theme',
} as const;