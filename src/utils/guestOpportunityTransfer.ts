import { supabase } from '@/integrations/supabase/client';
import { trackGuestEvent } from './guestAnalytics';

export interface GuestOpportunity {
  id: number;
  title: string;
  description: string;
  problem_statement: string;
  target_market: string;
  solution_approach: string;
  market_size_estimate: string;
  competition_level: string;
  difficulty_level: string;
  time_to_market: string;
  founder_fit_score: number;
  ai_confidence_score: number;
  opportunity_tags: string[];
}

export interface GuestAnswers {
  frustration: string;
  skills: string;
  timeCommitment: string;
}

export const transferGuestOpportunities = async (
  userId: string, 
  organizationId: string
): Promise<{ success: boolean; opportunitiesTransferred: number; error?: string }> => {
  try {
    // Get guest opportunities and answers from localStorage
    const guestOpportunitiesStr = localStorage.getItem('guestOpportunities');
    const guestAnswersStr = localStorage.getItem('guestAnswers');

    if (!guestOpportunitiesStr || !guestAnswersStr) {
      return { success: false, opportunitiesTransferred: 0, error: 'No guest data found' };
    }

    const guestOpportunities: GuestOpportunity[] = JSON.parse(guestOpportunitiesStr);
    const guestAnswers: GuestAnswers = JSON.parse(guestAnswersStr);

    if (!guestOpportunities.length) {
      return { success: false, opportunitiesTransferred: 0, error: 'No opportunities to transfer' };
    }

    // Transform guest opportunities to database format
    const opportunitiesToInsert = guestOpportunities.map(opportunity => ({
      user_id: userId,
      organization_id: organizationId,
      title: opportunity.title,
      description: opportunity.description,
      problem_statement: opportunity.problem_statement,
      target_market: opportunity.target_market,
      solution_approach: opportunity.solution_approach,
      market_size_estimate: opportunity.market_size_estimate,
      competition_level: opportunity.competition_level,
      difficulty_level: opportunity.difficulty_level,
      time_to_market: opportunity.time_to_market,
      founder_fit_score: opportunity.founder_fit_score,
      ai_confidence_score: opportunity.ai_confidence_score,
      opportunity_tags: opportunity.opportunity_tags,
      source: 'discovery',
      validation_status: 'not_started',
      is_favorited: false
    }));

    // Insert opportunities into database
    const { data, error } = await supabase
      .from('business_opportunities')
      .insert(opportunitiesToInsert)
      .select();

    if (error) {
      console.error('Error inserting guest opportunities:', error);
      return { success: false, opportunitiesTransferred: 0, error: error.message };
    }

    // Track successful conversion
    trackGuestEvent('guest_opportunities_transferred', {
      opportunities_count: guestOpportunities.length,
      user_id: userId,
      organization_id: organizationId,
      answers: guestAnswers
    });

    // Clean up localStorage
    localStorage.removeItem('guestOpportunities');
    localStorage.removeItem('guestAnswers');
    localStorage.removeItem('useGuestAnswers');

    console.log(`Successfully transferred ${guestOpportunities.length} guest opportunities`);
    
    return { 
      success: true, 
      opportunitiesTransferred: guestOpportunities.length 
    };

  } catch (error) {
    console.error('Error in transferGuestOpportunities:', error);
    return { 
      success: false, 
      opportunitiesTransferred: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};