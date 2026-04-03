import { supabase } from '@/integrations/supabase/client';
import { trackGuestEvent } from './guestAnalytics';
import { productionLogger } from './productionLogger';

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
  duration?: number;
}

export interface TransferOptions {
  maxRetries?: number;
  baseDelay?: number;
  progressCallback?: (progress: number, message: string) => void;
  timeoutMs?: number;
}

// Enhanced transfer service with production-grade features
export class EnhancedGuestTransferService {
  private static readonly DEFAULT_OPTIONS: Required<TransferOptions> = {
    maxRetries: 3,
    baseDelay: 1000,
    progressCallback: () => {},
    timeoutMs: 45000, // 45 seconds max
  };

  static async transferGuestOpportunities(
    userId: string, 
    organizationId: string,
    options: TransferOptions = {}
  ): Promise<TransferResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const startTime = new Date();
    
    productionLogger.logTransferAttempt(userId, organizationId, startTime);
    opts.progressCallback(10, 'Starting transfer...');

    try {
      // Create transfer operation with timeout
      const transferPromise = this.performTransferWithRetry(userId, organizationId, opts);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Transfer timeout')), opts.timeoutMs)
      );

      const result = await Promise.race([transferPromise, timeoutPromise]);
      const duration = Date.now() - startTime.getTime();

      if (result.success) {
        productionLogger.logTransferSuccess(userId, result.opportunitiesTransferred, duration);
        opts.progressCallback(100, 'Transfer completed successfully!');
      } else {
        productionLogger.logTransferFailure(userId, result.error || 'Unknown error', duration);
      }

      return { ...result, duration };

    } catch (error) {
      const duration = Date.now() - startTime.getTime();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      productionLogger.logTransferFailure(userId, errorMessage, duration);
      opts.progressCallback(0, 'Transfer failed');

      return {
        success: false,
        opportunitiesTransferred: 0,
        error: errorMessage,
        retryable: this.isRetryableError(error),
        duration
      };
    }
  }

  private static async performTransferWithRetry(
    userId: string,
    organizationId: string,
    options: Required<TransferOptions>
  ): Promise<TransferResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < options.maxRetries; attempt++) {
      try {
        options.progressCallback(20 + (attempt * 20), `Attempt ${attempt + 1}/${options.maxRetries}...`);

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

        options.progressCallback(40, 'Processing opportunities...');

        // Validate data before insertion
        const validationResult = this.validateGuestData(guestData);
        if (!validationResult.valid) {
          return {
            success: false,
            opportunitiesTransferred: 0,
            error: validationResult.error,
            retryable: false
          };
        }

        options.progressCallback(60, 'Saving to database...');

        // Insert opportunities with optimized query
        const result = await this.insertOpportunitiesOptimized(guestData, userId, organizationId);
        
        if (result.success) {
          options.progressCallback(80, 'Cleaning up...');
          
          // Clean up on success
          this.cleanupGuestData();
          
          // Track successful transfer
          trackGuestEvent('guest_opportunities_transferred', {
            opportunities_count: result.opportunitiesTransferred,
            user_id: userId,
            organization_id: organizationId,
            attempt_number: attempt + 1,
            answers: guestData.answers
          });

          return result;
        }

        // If not successful but retryable, continue to next attempt
        if (result.retryable && attempt < options.maxRetries - 1) {
          const delay = options.baseDelay * Math.pow(2, attempt); // Exponential backoff
          options.progressCallback(30, `Retrying in ${delay/1000}s...`);
          await this.delay(delay);
          continue;
        }

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        productionLogger.error('Transfer attempt failed', lastError, 'transfer', {
          attempt: attempt + 1,
          maxRetries: options.maxRetries,
          userId,
          organizationId
        });

        // If this is the last attempt or error is not retryable, break
        if (attempt === options.maxRetries - 1 || !this.isRetryableError(error)) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = options.baseDelay * Math.pow(2, attempt);
        options.progressCallback(20, `Retrying in ${delay/1000}s...`);
        await this.delay(delay);
      }
    }

    // All attempts failed
    return {
      success: false,
      opportunitiesTransferred: 0,
      error: lastError?.message || 'All retry attempts failed',
      retryable: this.isRetryableError(lastError)
    };
  }

  private static validateGuestData(guestData: { opportunities: GuestOpportunity[], answers: GuestAnswers | null }): { valid: boolean; error?: string } {
    if (!guestData.opportunities || guestData.opportunities.length === 0) {
      return { valid: false, error: 'No opportunities to transfer' };
    }

    // Validate each opportunity has required fields
    for (const opp of guestData.opportunities) {
      if (!opp.title || !opp.description) {
        return { valid: false, error: 'Invalid opportunity data: missing title or description' };
      }
      
      if (typeof opp.founder_fit_score !== 'number' || opp.founder_fit_score < 0 || opp.founder_fit_score > 100) {
        return { valid: false, error: 'Invalid opportunity data: invalid founder fit score' };
      }
    }

    return { valid: true };
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
      productionLogger.error('Error parsing guest data', error instanceof Error ? error : new Error(String(error)), 'transfer');
      return { opportunities: [], answers: null };
    }
  }

  private static async insertOpportunitiesOptimized(
    guestData: { opportunities: GuestOpportunity[], answers: GuestAnswers | null },
    userId: string,
    organizationId: string
  ): Promise<TransferResult> {
    try {
      // Transform guest opportunities to database format with optimizations
      const opportunitiesToInsert = guestData.opportunities.map(opportunity => ({
        user_id: userId,
        organization_id: organizationId,
        title: opportunity.title?.trim(),
        description: opportunity.description?.trim(),
        problem_statement: opportunity.problem_statement?.trim(),
        target_market: opportunity.target_market?.trim(),
        solution_approach: opportunity.solution_approach?.trim(),
        market_size_estimate: opportunity.market_size_estimate?.trim(),
        competition_level: opportunity.competition_level,
        difficulty_level: opportunity.difficulty_level,
        time_to_market: opportunity.time_to_market,
        founder_fit_score: Math.max(0, Math.min(100, opportunity.founder_fit_score)),
        ai_confidence_score: Math.max(0, Math.min(100, opportunity.ai_confidence_score)),
        opportunity_tags: Array.isArray(opportunity.opportunity_tags) ? opportunity.opportunity_tags : [],
        source: 'guest_discovery',
        validation_status: 'not_started',
        is_favorited: false
      }));

      // Use batch insert with error handling
      const { data, error } = await supabase
        .from('business_opportunities')
        .insert(opportunitiesToInsert)
        .select('id');

      if (error) {
        productionLogger.error('Database insert error', error, 'transfer', {
          opportunityCount: opportunitiesToInsert.length,
          userId,
          organizationId
        });
        
        // Determine if this is retryable
        const retryable = this.isDatabaseErrorRetryable(error);
        
        return {
          success: false,
          opportunitiesTransferred: 0,
          error: this.getUserFriendlyError(error),
          retryable
        };
      }

      productionLogger.info('Successfully transferred opportunities', 'transfer', {
        count: opportunitiesToInsert.length,
        userId,
        organizationId,
        insertedIds: data?.map(d => d.id) || []
      });
      
      return {
        success: true,
        opportunitiesTransferred: opportunitiesToInsert.length
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      productionLogger.error('Insert opportunities error', err, 'transfer');
      
      return {
        success: false,
        opportunitiesTransferred: 0,
        error: err.message,
        retryable: this.isRetryableError(error)
      };
    }
  }

  private static isDatabaseErrorRetryable(error: any): boolean {
    const errorCode = error?.code;
    const errorMessage = error?.message?.toLowerCase() || '';
    
    // Non-retryable errors
    if (errorCode === '23505' || errorMessage.includes('duplicate')) return false; // Duplicate key
    if (errorCode === '23503' || errorMessage.includes('foreign key')) return false; // Foreign key violation
    if (errorCode === '42P01' || errorMessage.includes('does not exist')) return false; // Table doesn't exist
    if (errorMessage.includes('permission denied')) return false; // Permission issues
    
    // Retryable errors
    if (errorCode === '08000' || errorMessage.includes('connection')) return true; // Connection issues
    if (errorCode === '08006' || errorMessage.includes('timeout')) return true; // Timeout
    if (errorCode === '53300' || errorMessage.includes('too many connections')) return true; // Connection limit
    
    // Default to retryable for unknown errors
    return true;
  }

  private static getUserFriendlyError(error: any): string {
    const errorMessage = error?.message?.toLowerCase() || '';
    
    if (errorMessage.includes('duplicate')) {
      return 'These opportunities have already been saved to your account';
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return 'Connection issue - please check your internet and try again';
    }
    if (errorMessage.includes('permission')) {
      return 'Permission error - please sign in again';
    }
    
    return 'Failed to save opportunities - please try again';
  }

  private static isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error?.message?.toLowerCase() || '';
    
    // Network and timeout errors are retryable
    if (errorMessage.includes('network') || 
        errorMessage.includes('fetch') || 
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection')) {
      return true;
    }
    
    // Auth errors are not retryable
    if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
      return false;
    }
    
    // Default to not retryable for unknown errors
    return false;
  }

  private static cleanupGuestData(): void {
    try {
      const keysToRemove = [
        'guestOpportunities',
        'guestAnswers', 
        'useGuestAnswers',
        'guestTransferAttempted'
      ];
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      productionLogger.info('Guest data cleanup completed', 'transfer');
    } catch (error) {
      productionLogger.error('Error cleaning up guest data', error instanceof Error ? error : new Error(String(error)), 'transfer');
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check methods
  static async healthCheck(): Promise<{ healthy: boolean; message: string; metrics?: any }> {
    try {
      const metrics = productionLogger.getTransferMetrics();
      
      // Check if transfer success rate is acceptable
      const successRate = metrics.attempts > 0 ? (metrics.successCount / metrics.attempts) * 100 : 100;
      const healthy = successRate >= 80; // 80% success rate threshold
      
      productionLogger.logHealthCheck('guest_transfer', healthy ? 'healthy' : 'degraded', {
        successRate,
        totalAttempts: metrics.attempts,
        averageLatency: metrics.averageLatency
      });
      
      return {
        healthy,
        message: healthy ? 'Transfer service is healthy' : `Transfer success rate is ${successRate.toFixed(1)}%`,
        metrics
      };
    } catch (error) {
      productionLogger.logHealthCheck('guest_transfer', 'unhealthy', { error: error instanceof Error ? error.message : String(error) });
      
      return {
        healthy: false,
        message: 'Health check failed'
      };
    }
  }

  // Static utility methods
  static hasGuestOpportunities(): boolean {
    try {
      const opportunities = localStorage.getItem('guestOpportunities');
      return !!(opportunities && JSON.parse(opportunities).length > 0);
    } catch {
      return false;
    }
  }

  static getGuestOpportunityCount(): number {
    try {
      const opportunities = localStorage.getItem('guestOpportunities');
      return opportunities ? JSON.parse(opportunities).length : 0;
    } catch {
      return 0;
    }
  }
}

// Legacy function for backwards compatibility
export const transferGuestOpportunities = EnhancedGuestTransferService.transferGuestOpportunities.bind(EnhancedGuestTransferService);