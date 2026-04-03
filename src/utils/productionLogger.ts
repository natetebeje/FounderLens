import { supabase } from '@/integrations/supabase/client';

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface TransferMetrics {
  attempts: number;
  successCount: number;
  failureCount: number;
  averageLatency: number;
  lastAttempt: Date;
  commonErrors: string[];
}

class ProductionLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory
  private sessionId: string;
  private transferMetrics: TransferMetrics = {
    attempts: 0,
    successCount: 0,
    failureCount: 0,
    averageLatency: 0,
    lastAttempt: new Date(),
    commonErrors: []
  };

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startPeriodicCleanup();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPeriodicCleanup() {
    // Clean up old logs every 5 minutes
    setInterval(() => {
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
    }, 5 * 60 * 1000);
  }

  async log(entry: Omit<LogEntry, 'timestamp' | 'sessionId'>): Promise<void> {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date(),
      sessionId: this.sessionId
    };

    // Add to in-memory logs
    this.logs.push(logEntry);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const message = `[${logEntry.level.toUpperCase()}] ${logEntry.message}`;
      const consoleData = { 
        context: logEntry.context, 
        metadata: logEntry.metadata,
        timestamp: logEntry.timestamp 
      };

      switch (logEntry.level) {
        case 'debug':
          console.debug(message, consoleData);
          break;
        case 'info':
          console.info(message, consoleData);
          break;
        case 'warn':
          console.warn(message, consoleData);
          break;
        case 'error':
          console.error(message, consoleData);
          break;
      }
    }

    // Send to remote logging for errors and warnings in production
    if (process.env.NODE_ENV === 'production' && ['error', 'warn'].includes(logEntry.level)) {
      await this.sendToRemoteLogging(logEntry);
    }
  }

  private async sendToRemoteLogging(entry: LogEntry): Promise<void> {
    try {
      // For now, we'll use console logging in production
      // In a real production environment, you would send to external logging services
      // like LogRocket, DataDog, or Sentry
      console.warn(`[PRODUCTION LOG] ${entry.level.toUpperCase()}: ${entry.message}`, {
        context: entry.context,
        metadata: entry.metadata,
        timestamp: entry.timestamp.toISOString()
      });
    } catch (error) {
      // Fallback to basic console if enhanced logging fails
      console.error('Failed to send log to remote:', error);
    }
  }

  // Structured logging methods
  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log({ level: 'debug', message, context, metadata });
  }

  info(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log({ level: 'info', message, context, metadata });
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log({ level: 'warn', message, context, metadata });
  }

  error(message: string, error?: Error, context?: string, metadata?: Record<string, any>): void {
    const errorMetadata = {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };
    
    this.log({ level: 'error', message, context, metadata: errorMetadata });
  }

  // Transfer-specific logging
  logTransferAttempt(userId: string, organizationId: string, startTime: Date): void {
    this.transferMetrics.attempts++;
    this.transferMetrics.lastAttempt = new Date();
    
    this.info('Guest transfer attempt started', 'transfer', {
      userId,
      organizationId,
      attempt: this.transferMetrics.attempts,
      startTime: startTime.toISOString()
    });
  }

  logTransferSuccess(userId: string, transferredCount: number, duration: number): void {
    this.transferMetrics.successCount++;
    this.updateAverageLatency(duration);
    
    this.info('Guest transfer completed successfully', 'transfer', {
      userId,
      transferredCount,
      duration,
      totalAttempts: this.transferMetrics.attempts,
      successRate: (this.transferMetrics.successCount / this.transferMetrics.attempts) * 100
    });
  }

  logTransferFailure(userId: string, error: string, duration: number): void {
    this.transferMetrics.failureCount++;
    this.updateAverageLatency(duration);
    this.addCommonError(error);
    
    this.error('Guest transfer failed', new Error(error), 'transfer', {
      userId,
      duration,
      totalAttempts: this.transferMetrics.attempts,
      failureRate: (this.transferMetrics.failureCount / this.transferMetrics.attempts) * 100,
      commonErrors: this.transferMetrics.commonErrors.slice(0, 5) // Top 5 errors
    });
  }

  private updateAverageLatency(duration: number): void {
    const totalOperations = this.transferMetrics.successCount + this.transferMetrics.failureCount;
    this.transferMetrics.averageLatency = 
      (this.transferMetrics.averageLatency * (totalOperations - 1) + duration) / totalOperations;
  }

  private addCommonError(error: string): void {
    const existingIndex = this.transferMetrics.commonErrors.indexOf(error);
    if (existingIndex > -1) {
      // Move to front if already exists
      this.transferMetrics.commonErrors.splice(existingIndex, 1);
    }
    this.transferMetrics.commonErrors.unshift(error);
    // Keep only top 10 errors
    this.transferMetrics.commonErrors = this.transferMetrics.commonErrors.slice(0, 10);
  }

  // Health check logging
  logHealthCheck(component: string, status: 'healthy' | 'degraded' | 'unhealthy', metrics?: Record<string, any>): void {
    const level = status === 'healthy' ? 'info' : status === 'degraded' ? 'warn' : 'error';
    
    this.log({
      level,
      message: `Health check: ${component} is ${status}`,
      context: 'health_check',
      metadata: {
        component,
        status,
        ...metrics
      }
    });
  }

  // Performance monitoring
  logPerformanceMetric(operation: string, duration: number, success: boolean, metadata?: Record<string, any>): void {
    this.info(`Performance: ${operation}`, 'performance', {
      operation,
      duration,
      success,
      ...metadata
    });
  }

  // Get metrics for monitoring dashboard
  getTransferMetrics(): TransferMetrics {
    return { ...this.transferMetrics };
  }

  // Get recent logs for debugging
  getRecentLogs(limit = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  // Search logs
  searchLogs(query: string, level?: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => {
      const matchesQuery = log.message.toLowerCase().includes(query.toLowerCase()) ||
                          log.context?.toLowerCase().includes(query.toLowerCase());
      const matchesLevel = !level || log.level === level;
      return matchesQuery && matchesLevel;
    });
  }
}

export const productionLogger = new ProductionLogger();
