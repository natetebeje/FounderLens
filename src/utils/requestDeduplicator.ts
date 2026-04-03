/**
 * Request Deduplicator - Prevents multiple identical requests from running simultaneously
 * Critical for preventing subscription check race conditions
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private readonly cleanupInterval = 30000; // 30 seconds
  private readonly maxAge = 60000; // 1 minute

  constructor() {
    // Cleanup old requests periodically
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    maxAge: number = this.maxAge
  ): Promise<T> {
    const existing = this.pendingRequests.get(key);
    
    // Return existing request if it's still fresh
    if (existing && (Date.now() - existing.timestamp) < maxAge) {
      console.log(`RequestDeduplicator: Reusing pending request for key: ${key}`);
      return existing.promise;
    }

    // Create new request
    console.log(`RequestDeduplicator: Creating new request for key: ${key}`);
    const promise = requestFn().finally(() => {
      // Clean up after completion
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    return promise;
  }

  // Force clear a specific request (useful for cache invalidation)
  invalidate(key: string): void {
    console.log(`RequestDeduplicator: Invalidating key: ${key}`);
    this.pendingRequests.delete(key);
  }

  // Clear all pending requests
  clear(): void {
    console.log('RequestDeduplicator: Clearing all pending requests');
    this.pendingRequests.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.maxAge) {
        this.pendingRequests.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`RequestDeduplicator: Cleaned up ${cleaned} stale requests`);
    }
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator();

// Convenience function for subscription checks
export const deduplicateSubscriptionCheck = <T>(
  userId: string,
  organizationId: string | null,
  requestFn: () => Promise<T>
): Promise<T> => {
  const key = `subscription_check_${userId}_${organizationId || 'null'}`;
  return requestDeduplicator.deduplicate(key, requestFn, 10000); // 10 second dedup window
};