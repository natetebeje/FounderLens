// Build Track Mappings for Ideas and Case Studies

export interface BuildTrackMapping {
  opportunityId?: string;
  caseStudySlug?: string;
  buildTrackSlug: string;
  buildTrackTitle: string;
  estimatedHours: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  whatYouWillBuild: string;
  keyFeatures: string[];
  techStack: string[];
}

// Mapping validated ideas to build tracks
export const opportunityToBuildTrack: Record<string, BuildTrackMapping> = {
  // These will be populated as we create build tracks for specific opportunities
  // Example:
  // 'opportunity-uuid-1': {
  //   opportunityId: 'opportunity-uuid-1',
  //   buildTrackSlug: 'saas-analytics-dashboard',
  //   buildTrackTitle: 'Build a SaaS Analytics Dashboard',
  //   estimatedHours: 20,
  //   difficulty: 'intermediate',
  //   prerequisites: ['Basic React knowledge', 'API integration experience'],
  //   whatYouWillBuild: 'A complete analytics dashboard with real-time data visualization',
  //   keyFeatures: ['Real-time charts', 'User authentication', 'Data export', 'Custom filters'],
  //   techStack: ['React', 'TypeScript', 'Supabase', 'Chart.js', 'Tailwind CSS']
  // }
};

// Mapping case studies to build tracks
export const caseStudyToBuildTrack: Record<string, BuildTrackMapping> = {
  // These will be populated based on case studies that have build tracks
  // Example:
  // 'starter-story-case-study-1': {
  //   caseStudySlug: 'starter-story-case-study-1',
  //   buildTrackSlug: 'micro-saas-idea-validator',
  //   buildTrackTitle: 'Build a Micro-SaaS Idea Validator',
  //   estimatedHours: 15,
  //   difficulty: 'beginner',
  //   prerequisites: ['Basic web development knowledge'],
  //   whatYouWillBuild: 'A tool that validates business ideas using AI and community feedback',
  //   keyFeatures: ['Idea submission', 'AI analysis', 'Community voting', 'Results dashboard'],
  //   techStack: ['React', 'Supabase', 'OpenAI API', 'Tailwind CSS']
  // }
};

// Helper functions
export const getBuildTrackForOpportunity = (opportunityId: string): BuildTrackMapping | null => {
  return opportunityToBuildTrack[opportunityId] || null;
};

export const getBuildTrackForCaseStudy = (caseStudySlug: string): BuildTrackMapping | null => {
  return caseStudyToBuildTrack[caseStudySlug] || null;
};

export const hasBuildTrack = (opportunityId?: string, caseStudySlug?: string): boolean => {
  if (opportunityId && opportunityToBuildTrack[opportunityId]) return true;
  if (caseStudySlug && caseStudyToBuildTrack[caseStudySlug]) return true;
  return false;
};

// Default build tracks for common patterns
export const defaultBuildTracks: BuildTrackMapping[] = [
  {
    buildTrackSlug: 'saas-mvp-starter',
    buildTrackTitle: 'Build a SaaS MVP from Scratch',
    estimatedHours: 25,
    difficulty: 'intermediate',
    prerequisites: ['React basics', 'Understanding of APIs'],
    whatYouWillBuild: 'A complete SaaS application with authentication, payments, and core features',
    keyFeatures: ['User authentication', 'Stripe payments', 'Dashboard', 'API integration'],
    techStack: ['React', 'TypeScript', 'Supabase', 'Stripe', 'Tailwind CSS']
  },
  {
    buildTrackSlug: 'ai-powered-tool',
    buildTrackTitle: 'Build an AI-Powered Tool',
    estimatedHours: 18,
    difficulty: 'beginner',
    prerequisites: ['Basic JavaScript knowledge'],
    whatYouWillBuild: 'An AI-powered tool that solves a specific problem using OpenAI',
    keyFeatures: ['AI integration', 'User interface', 'Result saving', 'Usage tracking'],
    techStack: ['React', 'OpenAI API', 'Supabase', 'Tailwind CSS']
  },
  {
    buildTrackSlug: 'marketplace-platform',
    buildTrackTitle: 'Build a Marketplace Platform',
    estimatedHours: 35,
    difficulty: 'advanced',
    prerequisites: ['Advanced React', 'Database design', 'Payment processing'],
    whatYouWillBuild: 'A two-sided marketplace connecting buyers and sellers',
    keyFeatures: ['User profiles', 'Product listings', 'Search & filters', 'Messaging', 'Payments'],
    techStack: ['React', 'TypeScript', 'Supabase', 'Stripe Connect', 'Real-time features']
  }
];

export const getRecommendedBuildTrack = (
  industry?: string, 
  difficulty?: string,
  businessModel?: string
): BuildTrackMapping => {
  // Simple recommendation logic - can be enhanced with AI later
  if (businessModel?.toLowerCase().includes('marketplace')) {
    return defaultBuildTracks[2]; // marketplace-platform
  }
  
  if (industry?.toLowerCase().includes('ai') || industry?.toLowerCase().includes('automation')) {
    return defaultBuildTracks[1]; // ai-powered-tool
  }
  
  // Default to SaaS MVP
  return defaultBuildTracks[0]; // saas-mvp-starter
};