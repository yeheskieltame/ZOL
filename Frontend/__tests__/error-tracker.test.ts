/**
 * Unit tests for the error tracking system
 */

import { ErrorTracker, errorTracker } from '@/lib/error-tracker';

describe('ErrorTracker', () => {
  let testTracker: ErrorTracker;

  beforeEach(() => {
    testTracker = new ErrorTracker();
    testTracker.clear();
  });

  describe('Error tracking', () => {
    it('should track wallet connection errors', () => {
      testTracker.trackError('wallet_connection', 'Connection refused');

      const stats = testTracker.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsByType.wallet_connection).toBe(1);
    });

    it('should track transaction errors', () => {
      testTracker.trackError('transaction_submission', 'Insufficient funds');
      testTracker.trackError('transaction_confirmation', 'Timeout');

      const stats = testTracker.getErrorStats();
      expect(stats.totalErrors).toBe(2);
      expect(stats.errorsByType.transaction_submission).toBe(1);
      expect(stats.errorsByType.transaction_confirmation).toBe(1);
    });

    it('should track RPC errors', () => {
      testTracker.trackError('rpc_network', 'Network error');
      testTracker.trackError('rpc_timeout', 'Request timeout');
      testTracker.trackError('rpc_rate_limit', 'Rate limit exceeded');

      const stats = testTracker.getErrorStats();
      expect(stats.errorsByType.rpc_network).toBe(1);
      expect(stats.errorsByType.rpc_timeout).toBe(1);
      expect(stats.errorsByType.rpc_rate_limit).toBe(1);
    });

    it('should store error metadata', () => {
      testTracker.trackError('program_error', 'Invalid faction', { 
        factionId: 5,
        programId: 'test' 
      });

      const errors = testTracker.getErrorsByType('program_error');
      expect(errors).toHaveLength(1);
      expect(errors[0].metadata?.factionId).toBe(5);
    });

    it('should calculate error rate', () => {
      // Track multiple errors
      for (let i = 0; i < 5; i++) {
        testTracker.trackError('wallet_connection', 'Test error');
      }

      const stats = testTracker.getErrorStats();
      expect(stats.errorRate).toBeGreaterThan(0);
    });

    it('should return recent errors', () => {
      testTracker.trackError('wallet_connection', 'Error 1');
      testTracker.trackError('transaction_submission', 'Error 2');
      testTracker.trackError('rpc_network', 'Error 3');

      const stats = testTracker.getErrorStats();
      expect(stats.recentErrors.length).toBeGreaterThan(0);
      expect(stats.recentErrors.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Transaction failure tracking', () => {
    it('should track transaction attempts', () => {
      testTracker.trackTransactionAttempt();
      testTracker.trackTransactionAttempt();
      testTracker.trackTransactionAttempt();

      const stats = testTracker.getTransactionFailureStats();
      expect(stats.failureRate).toBe(0); // No failures yet
    });

    it('should track transaction failures', () => {
      testTracker.trackTransactionAttempt();
      testTracker.trackTransactionFailure('Insufficient funds');
      testTracker.trackTransactionAttempt();
      testTracker.trackTransactionFailure('User rejected');

      const stats = testTracker.getTransactionFailureStats();
      expect(stats.totalFailures).toBe(2);
      expect(stats.failuresByReason['Insufficient funds']).toBe(1);
      expect(stats.failuresByReason['User rejected']).toBe(1);
      expect(stats.failureRate).toBe(100); // 2 failures out of 2 attempts
    });

    it('should calculate failure rate correctly', () => {
      // 3 attempts, 1 failure = 33.33% failure rate
      testTracker.trackTransactionAttempt();
      testTracker.trackTransactionAttempt();
      testTracker.trackTransactionAttempt();
      testTracker.trackTransactionFailure('Test error');

      const stats = testTracker.getTransactionFailureStats();
      expect(stats.failureRate).toBeCloseTo(33.33, 1);
    });

    it('should check if failure rate is high', () => {
      // Create high failure rate (50%)
      testTracker.trackTransactionAttempt();
      testTracker.trackTransactionFailure('Error 1');
      testTracker.trackTransactionAttempt();
      testTracker.trackTransactionFailure('Error 2');

      expect(testTracker.isTransactionFailureRateHigh(10)).toBe(true);
      expect(testTracker.isTransactionFailureRateHigh(60)).toBe(true); // 50% is still high
    });
  });

  describe('RPC endpoint health tracking', () => {
    it('should track RPC requests', () => {
      const endpoint = 'https://api.devnet.solana.com';

      testTracker.trackRPCRequest(endpoint);
      testTracker.trackRPCRequest(endpoint);

      const health = testTracker.getRPCEndpointHealth(endpoint) as any;
      expect(health.totalRequests).toBe(2);
    });

    it('should track successful RPC responses', () => {
      const endpoint = 'https://api.devnet.solana.com';

      testTracker.trackRPCRequest(endpoint);
      testTracker.trackRPCSuccess(endpoint, 100);
      testTracker.trackRPCRequest(endpoint);
      testTracker.trackRPCSuccess(endpoint, 150);

      const health = testTracker.getRPCEndpointHealth(endpoint) as any;
      expect(health.successfulRequests).toBe(2);
      expect(health.averageLatency).toBe(125); // (100 + 150) / 2
    });

    it('should track RPC failures', () => {
      const endpoint = 'https://api.devnet.solana.com';

      testTracker.trackRPCRequest(endpoint);
      testTracker.trackRPCFailure(endpoint, 'Network error');

      const health = testTracker.getRPCEndpointHealth(endpoint) as any;
      expect(health.failedRequests).toBe(1);
      expect(health.lastError).toBe('Network error');
      expect(health.lastErrorTime).toBeDefined();
    });

    it('should calculate endpoint health status', () => {
      const endpoint = 'https://api.devnet.solana.com';

      // Create healthy endpoint (100% success rate, no recent failures)
      for (let i = 0; i < 10; i++) {
        testTracker.trackRPCRequest(endpoint);
        testTracker.trackRPCSuccess(endpoint, 100);
      }

      const health = testTracker.getRPCEndpointHealth(endpoint) as any;
      expect(health.isHealthy).toBe(true);
    });

    it('should mark endpoint as unhealthy with low success rate', () => {
      const endpoint = 'https://api.devnet.solana.com';

      // Create unhealthy endpoint (50% success rate)
      testTracker.trackRPCRequest(endpoint);
      testTracker.trackRPCSuccess(endpoint, 100);
      testTracker.trackRPCRequest(endpoint);
      testTracker.trackRPCFailure(endpoint, 'Error');

      const health = testTracker.getRPCEndpointHealth(endpoint) as any;
      expect(health.isHealthy).toBe(false);
    });

    it('should get all unhealthy endpoints', () => {
      const endpoint1 = 'https://api.devnet.solana.com';
      const endpoint2 = 'https://api.mainnet-beta.solana.com';

      // Make endpoint1 unhealthy
      testTracker.trackRPCRequest(endpoint1);
      testTracker.trackRPCFailure(endpoint1, 'Error');

      // Make endpoint2 healthy
      testTracker.trackRPCRequest(endpoint2);
      testTracker.trackRPCSuccess(endpoint2, 100);

      const unhealthy = testTracker.getUnhealthyEndpoints();
      expect(unhealthy.length).toBeGreaterThan(0);
      expect(unhealthy[0].endpoint).toBe(endpoint1);
    });

    it('should get all endpoint health statuses', () => {
      testTracker.trackRPCRequest('endpoint1');
      testTracker.trackRPCRequest('endpoint2');

      const allHealth = testTracker.getRPCEndpointHealth() as any[];
      expect(Array.isArray(allHealth)).toBe(true);
      expect(allHealth.length).toBe(2);
    });
  });

  describe('Error rate monitoring', () => {
    it('should check if error rate is high', () => {
      // Create high error rate
      for (let i = 0; i < 15; i++) {
        testTracker.trackError('wallet_connection', 'Test error');
      }

      expect(testTracker.isErrorRateHigh(10)).toBe(true);
      expect(testTracker.isErrorRateHigh(20)).toBe(false);
    });
  });

  describe('Data management', () => {
    it('should get errors by type', () => {
      testTracker.trackError('wallet_connection', 'Error 1');
      testTracker.trackError('wallet_connection', 'Error 2');
      testTracker.trackError('transaction_submission', 'Error 3');

      const walletErrors = testTracker.getErrorsByType('wallet_connection');
      expect(walletErrors).toHaveLength(2);
    });

    it('should clear all tracking data', () => {
      testTracker.trackError('wallet_connection', 'Error');
      testTracker.trackTransactionAttempt();
      testTracker.trackRPCRequest('endpoint');

      testTracker.clear();

      const stats = testTracker.getErrorStats();
      const txStats = testTracker.getTransactionFailureStats();
      const rpcHealth = testTracker.getRPCEndpointHealth() as any[];

      expect(stats.totalErrors).toBe(0);
      expect(txStats.totalFailures).toBe(0);
      expect(rpcHealth).toHaveLength(0);
    });

    it('should export all tracking data', () => {
      testTracker.trackError('wallet_connection', 'Error');
      testTracker.trackTransactionAttempt();
      testTracker.trackTransactionFailure('Failed');
      testTracker.trackRPCRequest('endpoint');

      const exported = testTracker.exportData();

      expect(exported.errors).toBeDefined();
      expect(exported.errorStats).toBeDefined();
      expect(exported.transactionStats).toBeDefined();
      expect(exported.rpcHealth).toBeDefined();
    });
  });

  describe('Error history limits', () => {
    it('should limit error history size', () => {
      // Track more than MAX_ERROR_HISTORY errors
      for (let i = 0; i < 600; i++) {
        testTracker.trackError('wallet_connection', `Error ${i}`);
      }

      const stats = testTracker.getErrorStats();
      expect(stats.totalErrors).toBeLessThanOrEqual(500);
    });
  });
});
