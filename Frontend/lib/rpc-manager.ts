/**
 * RPC Manager with Batching, Fallback, and Rate Limiting
 * 
 * This module provides optimized RPC call management with:
 * - Batch fetching of multiple accounts
 * - RPC endpoint fallback for reliability
 * - Request queuing and rate limiting
 * - Recent blockhash caching
 * 
 * **Validates: Requirements 3.1, 6.1**
 */

import { Connection, PublicKey, AccountInfo, Commitment } from '@solana/web3.js';
import { SOLANA_CONFIG } from './config';
import { withCache, CacheKeys } from './cache';
import { logger } from './logger';
import { errorTracker } from './error-tracker';

/**
 * RPC request queue item
 */
interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  priority: number;
}

/**
 * Blockhash cache entry
 */
interface BlockhashCache {
  blockhash: string;
  lastValidBlockHeight: number;
  timestamp: number;
}

/**
 * RPC Manager class for optimized blockchain interactions
 */
class RPCManager {
  private connections: Connection[];
  private currentEndpointIndex: number = 0;
  private requestQueue: QueuedRequest<any>[] = [];
  private isProcessingQueue: boolean = false;
  private requestsInFlight: number = 0;
  private maxConcurrentRequests: number = 10;
  private blockhashCache: BlockhashCache | null = null;
  private blockhashCacheTTL: number = 30000; // 30 seconds

  constructor() {
    // Initialize connections with primary and fallback endpoints
    const endpoints = [SOLANA_CONFIG.rpcUrl, ...SOLANA_CONFIG.rpcFallbacks];
    this.connections = endpoints.map(url => new Connection(url, 'confirmed'));
  }

  /**
   * Gets the current active connection
   */
  getConnection(): Connection {
    return this.connections[this.currentEndpointIndex];
  }

  /**
   * Switches to the next RPC endpoint (fallback)
   */
  private switchToNextEndpoint(): void {
    const fromIndex = this.currentEndpointIndex;
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.connections.length;
    console.warn(`Switched to RPC endpoint ${this.currentEndpointIndex + 1}/${this.connections.length}`);
    logger.rpcEndpointSwitched(fromIndex, this.currentEndpointIndex);
  }

  /**
   * Executes an RPC call with automatic fallback on failure
   * 
   * @param operation - Function that performs the RPC call
   * @param maxRetries - Maximum number of retry attempts
   * @returns Promise resolving to the operation result
   */
  async executeWithFallback<T>(
    operation: (connection: Connection) => Promise<T>,
    maxRetries: number = 2
  ): Promise<T> {
    let lastError: Error | null = null;
    const startIndex = this.currentEndpointIndex;
    const startTime = Date.now();
    const endpoint = this.connections[this.currentEndpointIndex].rpcEndpoint;

    // Track RPC request
    logger.rpcRequest('executeWithFallback', endpoint);
    errorTracker.trackRPCRequest(endpoint);

    // Try each endpoint once
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const connection = this.getConnection();
        const currentEndpoint = this.connections[this.currentEndpointIndex].rpcEndpoint;
        const result = await operation(connection);
        
        // Track successful RPC response
        const duration = Date.now() - startTime;
        logger.rpcResponse('executeWithFallback', currentEndpoint, duration);
        errorTracker.trackRPCSuccess(currentEndpoint, duration);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const currentEndpoint = this.connections[this.currentEndpointIndex].rpcEndpoint;
        console.warn(`RPC call failed on endpoint ${this.currentEndpointIndex + 1}:`, lastError.message);
        
        // Track RPC failure
        logger.rpcError('executeWithFallback', currentEndpoint, lastError);
        errorTracker.trackRPCFailure(currentEndpoint, lastError.message);

        // Switch to next endpoint if available
        if (this.connections.length > 1 && attempt < maxRetries) {
          this.switchToNextEndpoint();

          // If we've tried all endpoints, wait before retrying
          if (this.currentEndpointIndex === startIndex) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }
    }

    throw lastError || new Error('RPC call failed after all retries');
  }

  /**
   * Adds a request to the queue with priority
   * 
   * @param request - The request to queue
   * @param priority - Priority level (higher = more important)
   */
  private async queueRequest<T>(
    request: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        execute: request,
        resolve,
        reject,
        priority,
      });

      // Sort queue by priority (higher priority first)
      this.requestQueue.sort((a, b) => b.priority - a.priority);

      // Start processing if not already running
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Processes the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      // Wait if we've hit the concurrent request limit
      while (this.requestsInFlight >= this.maxConcurrentRequests) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const request = this.requestQueue.shift();
      if (!request) break;

      this.requestsInFlight++;

      // Execute request without blocking the queue
      request.execute()
        .then(result => {
          request.resolve(result);
        })
        .catch(error => {
          request.reject(error);
        })
        .finally(() => {
          this.requestsInFlight--;
        });
    }

    this.isProcessingQueue = false;
  }

  /**
   * Fetches multiple accounts in a single batched RPC call
   * 
   * @param publicKeys - Array of public keys to fetch
   * @param commitment - Commitment level
   * @returns Promise resolving to array of account info (null if account doesn't exist)
   */
  async batchFetchAccounts(
    publicKeys: PublicKey[],
    commitment: Commitment = 'confirmed'
  ): Promise<(AccountInfo<Buffer> | null)[]> {
    if (publicKeys.length === 0) {
      return [];
    }

    return this.executeWithFallback(async (connection) => {
      // Use getMultipleAccountsInfo for efficient batching
      const accounts = await connection.getMultipleAccountsInfo(publicKeys, commitment);
      return accounts;
    });
  }

  /**
   * Gets a recent blockhash with caching
   * 
   * @param commitment - Commitment level
   * @returns Promise resolving to blockhash and last valid block height
   */
  async getRecentBlockhash(
    commitment: Commitment = 'confirmed'
  ): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    // Check cache first
    if (this.blockhashCache) {
      const age = Date.now() - this.blockhashCache.timestamp;
      if (age < this.blockhashCacheTTL) {
        return {
          blockhash: this.blockhashCache.blockhash,
          lastValidBlockHeight: this.blockhashCache.lastValidBlockHeight,
        };
      }
    }

    // Fetch fresh blockhash
    const result = await this.executeWithFallback(async (connection) => {
      return await connection.getLatestBlockhash(commitment);
    });

    // Update cache
    this.blockhashCache = {
      blockhash: result.blockhash,
      lastValidBlockHeight: result.lastValidBlockHeight,
      timestamp: Date.now(),
    };

    return result;
  }

  /**
   * Fetches an account with queuing and rate limiting
   * 
   * @param publicKey - The account public key
   * @param commitment - Commitment level
   * @param priority - Request priority
   * @returns Promise resolving to account info
   */
  async fetchAccount(
    publicKey: PublicKey,
    commitment: Commitment = 'confirmed',
    priority: number = 0
  ): Promise<AccountInfo<Buffer> | null> {
    return this.queueRequest(
      () => this.executeWithFallback(
        (connection) => connection.getAccountInfo(publicKey, commitment)
      ),
      priority
    );
  }

  /**
   * Invalidates the blockhash cache
   */
  invalidateBlockhashCache(): void {
    this.blockhashCache = null;
  }

  /**
   * Gets statistics about the RPC manager
   */
  getStats(): {
    currentEndpoint: number;
    totalEndpoints: number;
    queueLength: number;
    requestsInFlight: number;
  } {
    return {
      currentEndpoint: this.currentEndpointIndex,
      totalEndpoints: this.connections.length,
      queueLength: this.requestQueue.length,
      requestsInFlight: this.requestsInFlight,
    };
  }
}

/**
 * Global RPC manager instance
 */
const rpcManager = new RPCManager();

/**
 * Gets the current RPC connection
 */
export function getRPCConnection(): Connection {
  return rpcManager.getConnection();
}

/**
 * Executes an RPC operation with automatic fallback
 * 
 * @param operation - Function that performs the RPC call
 * @returns Promise resolving to the operation result
 */
export async function executeRPCWithFallback<T>(
  operation: (connection: Connection) => Promise<T>
): Promise<T> {
  return rpcManager.executeWithFallback(operation);
}

/**
 * Fetches multiple accounts in a single batched call
 * 
 * @param publicKeys - Array of public keys to fetch
 * @param commitment - Commitment level
 * @returns Promise resolving to array of account info
 */
export async function batchFetchAccounts(
  publicKeys: PublicKey[],
  commitment: Commitment = 'confirmed'
): Promise<(AccountInfo<Buffer> | null)[]> {
  return rpcManager.batchFetchAccounts(publicKeys, commitment);
}

/**
 * Gets a recent blockhash with caching
 * 
 * @param commitment - Commitment level
 * @returns Promise resolving to blockhash and last valid block height
 */
export async function getCachedBlockhash(
  commitment: Commitment = 'confirmed'
): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
  return rpcManager.getRecentBlockhash(commitment);
}

/**
 * Fetches an account with queuing and rate limiting
 * 
 * @param publicKey - The account public key
 * @param commitment - Commitment level
 * @param priority - Request priority (higher = more important)
 * @returns Promise resolving to account info
 */
export async function fetchAccountQueued(
  publicKey: PublicKey,
  commitment: Commitment = 'confirmed',
  priority: number = 0
): Promise<AccountInfo<Buffer> | null> {
  return rpcManager.fetchAccount(publicKey, commitment, priority);
}

/**
 * Invalidates the blockhash cache
 */
export function invalidateBlockhashCache(): void {
  rpcManager.invalidateBlockhashCache();
}

/**
 * Gets RPC manager statistics
 */
export function getRPCStats(): {
  currentEndpoint: number;
  totalEndpoints: number;
  queueLength: number;
  requestsInFlight: number;
} {
  return rpcManager.getStats();
}

/**
 * Export the RPC manager for advanced use cases
 */
export { rpcManager };
