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

export interface TransferResult {
  success: boolean;
  opportunitiesTransferred: number;
  error?: string;
  retryable?: boolean;
}

// Enhanced transfer with retry mechanism and better error handling
export class GuestTransferService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

  static async transferGuestOpportunities(
    userId: string, 
    organizationId: string,
    retryCount = 0
  ): Promise<TransferResult> {
    try {
      console.log(`🔄 Starting guest transfer attempt ${retryCount + 1}/${this.MAX_RETRIES}`);
      
      // Get guest data
      const guestData = this.getGuestData();
      if (!guestData.opportunities.length) {
        return { 
          success: false, 
          opportunitiesTransferred: 0, 
          error: 'No guest opportunities found',
          retryable: false
        };
      }

      // Transform and insert opportunities
      const result = await this.insertOpportunities(guestData, userId, organizationId);
      
      if (!result.success && result.retryable && retryCount < this.MAX_RETRIES - 1) {
        // Wait and retry
        await this.delay(this.RETRY_DELAY * (retryCount + 1));
        return this.transferGuestOpportunities(userId, organizationId, retryCount + 1);
      }

      if (result.success) {
        // Clean up on success
        this.cleanupGuestData();
        
        // Track successful transfer
        trackGuestEvent('guest_opportunities_transferred', {
          opportunities_count: result.opportunitiesTransferred,
          user_id: userId,
          organization_id: organizationId,
          retry_count: retryCount,
          answers: guestData.answers
        });
      }

      return result;

    } catch (error) {
      console.error('Error in enhanced guest transfer:', error);
      
      if (retryCount < this.MAX_RETRIES - 1) {
        await this.delay(this.RETRY_DELAY * (retryCount + 1));
        return this.transferGuestOpportunities(userId, organizationId, retryCount + 1);
      }

      return {
        success: false,
        opportunitiesTransferred: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      };
    }
  }

  private static getGuestData(): { opportunities: GuestOpportunity[], answers: GuestAnswers | null } {
    try {
      const opportunitiesStr = localStorage.getItem('guestOpportunities');
      const answersStr = localStorage.getItem('guestAnswers');
      
      return {
        opportunities: opportunitiesStr ? JSON.parse(opportunitiesStr) : [],
        answers: answersStr ? JSON.parse(answersStr) : null
      };
    } catch (error) {
      console.error('Error parsing guest data:', error);
      return { opportunities: [], answers: null };
    }
  }

  private static async insertOpportunities(
    guestData: { opportunities: GuestOpportunity[], answers: GuestAnswers | null },
    userId: string,
    organizationId: string
  ): Promise<TransferResult> {
    try {
      // Transform guest opportunities to database format
      const opportunitiesToInsert = guestData.opportunities.map(opportunity => ({
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
        opportunity_tags: opportunity.opportunity_tags || [],
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
        console.error('Database insert error:', error);
        
        // Determine if this is retryable
        const retryable = !error.message.includes('duplicate') && 
                          !error.message.includes('foreign key') &&
                          !error.message.includes('not found');
        
        return {
          success: false,
          opportunitiesTransferred: 0,
          error: error.message,
          retryable
        };
      }

      console.log(`✅ Successfully transferred ${opportunitiesToInsert.length} opportunities`);
      
      return {
        success: true,
        opportunitiesTransferred: opportunitiesToInsert.length
      };

    } catch (error) {
      console.error('Insert opportunities error:', error);
      return {
        success: false,
        opportunitiesTransferred: 0,
        error: error instanceof Error ? error.message : 'Database error',
        retryable: true
      };
    }
  }

  private static cleanupGuestData(): void {
    try {
      localStorage.removeItem('guestOpportunities');
      localStorage.removeItem('guestAnswers');
      localStorage.removeItem('useGuestAnswers');
      console.log('🧹 Cleaned up guest data from localStorage');
    } catch (error) {
      console.error('Error cleaning up guest data:', error);
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Check if there are opportunities to transfer
  static hasGuestOpportunities(): boolean {
    try {
      const opportunities = localStorage.getItem('guestOpportunities');
      return !!(opportunities && JSON.parse(opportunities).length > 0);
    } catch {
      return false;
    }
  }

  // Get count of guest opportunities for display
  static getGuestOpportunityCount(): number {
    try {
      const opportunities = localStorage.getItem('guestOpportunities');
      return opportunities ? JSON.parse(opportunities).length : 0;
    } catch {
      return 0;
    }
  }

  // Mark transfer as attempted to prevent multiple attempts
  static markTransferAttempted(): void {
    localStorage.setItem('guestTransferAttempted', Date.now().toString());
  }

  // Check if transfer was recently attempted
  static wasTransferRecentlyAttempted(): boolean {
    try {
      const attempted = localStorage.getItem('guestTransferAttempted');
      if (!attempted) return false;
      
      const attemptTime = parseInt(attempted);
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      
      return attemptTime > fiveMinutesAgo;
    } catch {
      return false;
    }
  }

  // Clear transfer attempt flag
  static clearTransferAttempt(): void {
    localStorage.removeItem('guestTransferAttempted');
  }

  // Background transfer that waits for organization to be ready
  static async startBackgroundTransfer(
    userId: string,
    getOrganizationId: () => string | undefined,
    onSuccess: (result: TransferResult) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const MAX_WAIT_TIME = 30000; // 30 seconds
    const CHECK_INTERVAL = 1000; // 1 second
    let elapsed = 0;

    const attemptTransfer = async (): Promise<void> => {
      const orgId = getOrganizationId();
      
      if (!orgId) {
        if (elapsed < MAX_WAIT_TIME) {
          elapsed += CHECK_INTERVAL;
          setTimeout(attemptTransfer, CHECK_INTERVAL);
          return;
        } else {
          onError('Organization not available after waiting');
          return;
        }
      }

      // Organization is ready, attempt transfer
      try {
        const result = await this.transferGuestOpportunities(userId, orgId);
        if (result.success) {
          onSuccess(result);
        } else {
          onError(result.error || 'Transfer failed');
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    // Start the background process
    attemptTransfer();
  }
}

// Legacy function for backwards compatibility
export const transferGuestOpportunities = GuestTransferService.transferGuestOpportunities.bind(GuestTransferService);