/**
 * Cache Utility with Stale-While-Revalidate (SWR) Pattern
 * 
 * This module provides a caching layer for blockchain data fetching
 * with support for:
 * - Time-based cache expiration (TTL)
 * - Stale-while-revalidate for better UX
 * - Automatic cache invalidation
 * - Type-safe cache keys
 * 
 * **Validates: Requirements 3.1, 7.1**
 */

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  /** The cached data */
  data: T;
  /** Timestamp when the data was cached */
  timestamp: number;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Whether stale-while-revalidate is enabled */
  staleWhileRevalidate: boolean;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Enable stale-while-revalidate pattern */
  staleWhileRevalidate?: boolean;
}

/**
 * In-memory cache store
 */
class CacheStore {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Gets a value from the cache
   * 
   * @param key - Cache key
   * @returns The cached data and whether it's stale
   */
  get<T>(key: string): { data: T | null; isStale: boolean } {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return { data: null, isStale: false };
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    const isExpired = age > entry.ttl;

    if (isExpired) {
      if (entry.staleWhileRevalidate) {
        // Return stale data but indicate it needs revalidation
        return { data: entry.data as T, isStale: true };
      } else {
        // Remove expired entry
        this.cache.delete(key);
        return { data: null, isStale: false };
      }
    }

    return { data: entry.data as T, isStale: false };
  }

  /**
   * Sets a value in the cache
   * 
   * @param key - Cache key
   * @param data - Data to cache
   * @param options - Cache options
   */
  set<T>(key: string, data: T, options: CacheOptions): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: options.ttl,
      staleWhileRevalidate: options.staleWhileRevalidate ?? true,
    });
  }

  /**
   * Invalidates a cache entry
   * 
   * @param key - Cache key to invalidate
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidates all cache entries matching a pattern
   * 
   * @param pattern - RegExp pattern to match keys
   */
  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Global cache instance
 */
const cacheStore = new CacheStore();

/**
 * Cache key generators for different data types
 */
export const CacheKeys = {
  gameState: () => 'game-state',
  userPosition: (publicKey: string) => `user-position:${publicKey}`,
  tokenAccount: (owner: string, mint: string) => `token-account:${owner}:${mint}`,
  tokenBalance: (tokenAccount: string) => `token-balance:${tokenAccount}`,
  blockhash: () => 'recent-blockhash',
} as const;

/**
 * Gets cached data with stale-while-revalidate support
 * 
 * @param key - Cache key
 * @returns Cached data and staleness indicator
 */
export function getCached<T>(key: string): { data: T | null; isStale: boolean } {
  return cacheStore.get<T>(key);
}

/**
 * Sets data in cache
 * 
 * @param key - Cache key
 * @param data - Data to cache
 * @param options - Cache options
 */
export function setCached<T>(key: string, data: T, options: CacheOptions): void {
  cacheStore.set(key, data, options);
}

/**
 * Invalidates a specific cache entry
 * 
 * @param key - Cache key to invalidate
 */
export function invalidateCache(key: string): void {
  cacheStore.invalidate(key);
}

/**
 * Invalidates all cache entries matching a pattern
 * 
 * @param pattern - RegExp pattern to match keys
 */
export function invalidateCachePattern(pattern: RegExp): void {
  cacheStore.invalidatePattern(pattern);
}

/**
 * Clears all cached data
 */
export function clearCache(): void {
  cacheStore.clear();
}

/**
 * Gets cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return cacheStore.getStats();
}

/**
 * Higher-order function that wraps a fetch function with caching
 * 
 * @param key - Cache key
 * @param fetchFn - Function that fetches the data
 * @param options - Cache options
 * @returns Cached data or freshly fetched data
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions
): Promise<{ data: T; fromCache: boolean; wasStale: boolean }> {
  const cached = getCached<T>(key);

  if (cached.data !== null) {
    if (cached.isStale) {
      // Return stale data immediately, but trigger background revalidation
      fetchFn()
        .then((freshData) => {
          setCached(key, freshData, options);
        })
        .catch((error) => {
          console.warn(`Background revalidation failed for key ${key}:`, error);
        });

      return { data: cached.data, fromCache: true, wasStale: true };
    }

    // Return fresh cached data
    return { data: cached.data, fromCache: true, wasStale: false };
  }

  // No cached data, fetch fresh
  const freshData = await fetchFn();
  setCached(key, freshData, options);
  return { data: freshData, fromCache: false, wasStale: false };
}

/**
 * Invalidates all user-specific cache entries
 * Useful when a user disconnects their wallet
 * 
 * @param publicKey - User's public key
 */
export function invalidateUserCache(publicKey: string): void {
  invalidateCachePattern(new RegExp(`^user-position:${publicKey}`));
  invalidateCachePattern(new RegExp(`^token-account:${publicKey}`));
  invalidateCachePattern(new RegExp(`^token-balance:.*${publicKey}`));
}

/**
 * Invalidates all transaction-related cache entries
 * Useful after a transaction is confirmed
 */
export function invalidateTransactionCache(): void {
  invalidateCache(CacheKeys.gameState());
  invalidateCachePattern(/^user-position:/);
  invalidateCachePattern(/^token-balance:/);
}
