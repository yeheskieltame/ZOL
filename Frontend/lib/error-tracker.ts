/**
 * Error tracking system for monitoring error rates and patterns
 * Tracks error rates by type, transaction failure reasons, and RPC endpoint health
 * 
 * **Validates: Requirements 9.1, 9.2**
 */

import { logger } from './logger';

export type ErrorType = 
  | 'wallet_connection'
  | 'wallet_signature'
  | 'transaction_simulation'
  | 'transaction_submission'
  | 'transaction_confirmation'
  | 'rpc_network'
  | 'rpc_timeout'
  | 'rpc_rate_limit'
  | 'account_not_found'
  | 'insufficient_funds'
  | 'program_error'
  | 'unknown';

export interface ErrorRecord {
  timestamp: number;
  type: ErrorType;
  message: string;
  metadata?: Record<string, any>;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorRate: number; // errors per minute
  recentErrors: ErrorRecord[];
}

export interface TransactionFailureStats {
  totalFailures: number;
  failuresByReason: Record<string, number>;
  failureRate: number; // percentage of failed transactions
}

export interface RPCEndpointHealth {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  lastError?: string;
  lastErrorTime?: number;
  isHealthy: boolean;
}

class ErrorTracker {
  private errors: ErrorRecord[] = [];
  private transactionAttempts: number = 0;
  private transactionFailures: Map<string, number> = new Map();
  private rpcEndpoints: Map<string, RPCEndpointHealth> = new Map();
  private readonly MAX_ERROR_HISTORY = 500;
  private readonly ERROR_RATE_WINDOW = 60000; // 1 minute

  /**
   * Track an error occurrence
   */
  trackError(type: ErrorType, message: string, metadata?: Record<string, any>): void {
    const errorRecord: ErrorRecord = {
      timestamp: Date.now(),
      type,
      message,
      metadata,
    };

    this.errors.push(errorRecord);

    // Trim error history if exceeding max size
    if (this.errors.length > this.MAX_ERROR_HISTORY) {
      this.errors = this.errors.slice(-this.MAX_ERROR_HISTORY);
    }

    // Log to logger using appropriate method based on category
    const category = this.getCategoryForErrorType(type);
    if (category === 'wallet') {
      logger.walletConnectionFailed(new Error(message));
    } else if (category === 'transaction') {
      logger.transactionFailed(undefined, type, new Error(message), metadata);
    } else if (category === 'rpc') {
      logger.rpcError('unknown', metadata?.endpoint || 'unknown', new Error(message));
    }
  }

  /**
   * Track a transaction attempt
   */
  trackTransactionAttempt(): void {
    this.transactionAttempts++;
  }

  /**
   * Track a transaction failure with reason
   */
  trackTransactionFailure(reason: string, metadata?: Record<string, any>): void {
    const count = this.transactionFailures.get(reason) || 0;
    this.transactionFailures.set(reason, count + 1);

    this.trackError('transaction_submission', `Transaction failed: ${reason}`, metadata);
  }

  /**
   * Track RPC request
   */
  trackRPCRequest(endpoint: string): void {
    const health = this.getOrCreateEndpointHealth(endpoint);
    health.totalRequests++;
    this.rpcEndpoints.set(endpoint, health);
  }

  /**
   * Track successful RPC response
   */
  trackRPCSuccess(endpoint: string, latency: number): void {
    const health = this.getOrCreateEndpointHealth(endpoint);
    health.successfulRequests++;
    
    // Update average latency
    const totalLatency = health.averageLatency * (health.successfulRequests - 1) + latency;
    health.averageLatency = totalLatency / health.successfulRequests;
    
    health.isHealthy = this.calculateEndpointHealth(health);
    this.rpcEndpoints.set(endpoint, health);
  }

  /**
   * Track RPC failure
   */
  trackRPCFailure(endpoint: string, error: string): void {
    const health = this.getOrCreateEndpointHealth(endpoint);
    health.failedRequests++;
    health.lastError = error;
    health.lastErrorTime = Date.now();
    health.isHealthy = this.calculateEndpointHealth(health);
    
    this.rpcEndpoints.set(endpoint, health);
    this.trackError('rpc_network', `RPC request failed: ${error}`, { endpoint });
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    const now = Date.now();
    const recentErrors = this.errors.filter(
      err => now - err.timestamp < this.ERROR_RATE_WINDOW
    );

    const errorsByType: Record<ErrorType, number> = {
      wallet_connection: 0,
      wallet_signature: 0,
      transaction_simulation: 0,
      transaction_submission: 0,
      transaction_confirmation: 0,
      rpc_network: 0,
      rpc_timeout: 0,
      rpc_rate_limit: 0,
      account_not_found: 0,
      insufficient_funds: 0,
      program_error: 0,
      unknown: 0,
    };

    this.errors.forEach(err => {
      errorsByType[err.type]++;
    });

    return {
      totalErrors: this.errors.length,
      errorsByType,
      errorRate: (recentErrors.length / this.ERROR_RATE_WINDOW) * 60000, // errors per minute
      recentErrors: recentErrors.slice(-10), // last 10 errors
    };
  }

  /**
   * Get transaction failure statistics
   */
  getTransactionFailureStats(): TransactionFailureStats {
    const totalFailures = Array.from(this.transactionFailures.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    const failuresByReason: Record<string, number> = {};
    this.transactionFailures.forEach((count, reason) => {
      failuresByReason[reason] = count;
    });

    const failureRate = this.transactionAttempts > 0
      ? (totalFailures / this.transactionAttempts) * 100
      : 0;

    return {
      totalFailures,
      failuresByReason,
      failureRate,
    };
  }

  /**
   * Get RPC endpoint health status
   */
  getRPCEndpointHealth(endpoint?: string): RPCEndpointHealth | RPCEndpointHealth[] {
    if (endpoint) {
      return this.getOrCreateEndpointHealth(endpoint);
    }
    return Array.from(this.rpcEndpoints.values());
  }

  /**
   * Get all unhealthy RPC endpoints
   */
  getUnhealthyEndpoints(): RPCEndpointHealth[] {
    return Array.from(this.rpcEndpoints.values()).filter(health => !health.isHealthy);
  }

  /**
   * Check if error rate exceeds threshold
   */
  isErrorRateHigh(threshold: number = 10): boolean {
    const stats = this.getErrorStats();
    return stats.errorRate > threshold;
  }

  /**
   * Check if transaction failure rate exceeds threshold
   */
  isTransactionFailureRateHigh(threshold: number = 10): boolean {
    const stats = this.getTransactionFailureStats();
    return stats.failureRate > threshold;
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: ErrorType): ErrorRecord[] {
    return this.errors.filter(err => err.type === type);
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.errors = [];
    this.transactionAttempts = 0;
    this.transactionFailures.clear();
    this.rpcEndpoints.clear();
  }

  /**
   * Export tracking data for analysis
   */
  exportData(): {
    errors: ErrorRecord[];
    errorStats: ErrorStats;
    transactionStats: TransactionFailureStats;
    rpcHealth: RPCEndpointHealth[];
  } {
    return {
      errors: this.errors,
      errorStats: this.getErrorStats(),
      transactionStats: this.getTransactionFailureStats(),
      rpcHealth: Array.from(this.rpcEndpoints.values()),
    };
  }

  // Private helper methods

  private getOrCreateEndpointHealth(endpoint: string): RPCEndpointHealth {
    if (!this.rpcEndpoints.has(endpoint)) {
      this.rpcEndpoints.set(endpoint, {
        endpoint,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        isHealthy: true,
      });
    }
    return this.rpcEndpoints.get(endpoint)!;
  }

  private calculateEndpointHealth(health: RPCEndpointHealth): boolean {
    if (health.totalRequests === 0) return true;

    const successRate = (health.successfulRequests / health.totalRequests) * 100;
    const isRecentlyFailed = health.lastErrorTime 
      ? Date.now() - health.lastErrorTime < 60000 // Failed in last minute
      : false;

    // Endpoint is healthy if success rate > 80% and no recent failures
    return successRate > 80 && !isRecentlyFailed;
  }

  private getCategoryForErrorType(type: ErrorType): 'wallet' | 'transaction' | 'rpc' | 'ui' {
    if (type.startsWith('wallet_')) return 'wallet';
    if (type.startsWith('transaction_')) return 'transaction';
    if (type.startsWith('rpc_')) return 'rpc';
    return 'ui';
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

// Export for testing
export { ErrorTracker };
