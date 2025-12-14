'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useZolProgram } from './use-zol-program';
import { getUserPositionPDA } from '@/lib/pda';
import { GAME_CONSTANTS } from '@/lib/config';
import { withCache, CacheKeys, invalidateCache, invalidateUserCache } from '@/lib/cache';
import { executeRPCWithFallback } from '@/lib/rpc-manager';
import type { UserPosition } from '@/lib/idl/types';

/**
 * Return type for useUserPosition hook
 */
export interface UseUserPositionReturn {
  /** The user's position data from the blockchain */
  userPosition: UserPosition | null;
  /** Whether the user is registered (has a position account) */
  isRegistered: boolean;
  /** Whether the data is currently being fetched */
  loading: boolean;
  /** Any error that occurred during fetching */
  error: Error | null;
  /** Function to manually trigger a data refresh */
  refetch: () => Promise<void>;
}

/**
 * useUserPosition Hook
 * 
 * Fetches and manages the User Position Account data for the connected wallet.
 * This hook:
 * - Fetches the User Position Account using the user's public key
 * - Checks if the user is registered (account exists)
 * - Handles account not found scenario gracefully
 * - Implements data refresh mechanism with polling
 * 
 * The user position includes:
 * - Faction membership
 * - Deposited amount
 * - Last deposit epoch
 * - Automation settings (x402 preferences)
 * - Inventory (sword, shield, spyglass counts)
 * 
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
 * 
 * @returns {UseUserPositionReturn} Object containing userPosition, isRegistered, loading, error, and refetch function
 * 
 * @example
 * ```tsx
 * function PortfolioPage() {
 *   const { userPosition, isRegistered, loading, error } = useUserPosition();
 *   
 *   if (loading) return <div>Loading your position...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!isRegistered) return <div>Please register to start playing</div>;
 *   
 *   return (
 *     <div>
 *       <h1>Your Position</h1>
 *       <p>Faction: {userPosition.factionId}</p>
 *       <p>Deposited: {userPosition.depositedAmount.toString()}</p>
 *       <p>Swords: {userPosition.inventory.swordCount.toString()}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserPosition(): UseUserPositionReturn {
  const { publicKey } = useWallet();
  const { program, isReady } = useZolProgram();
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetches the user position from the blockchain with caching
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
   */
  const fetchUserPosition = useCallback(async () => {
    // Cannot fetch without a wallet connected
    if (!publicKey) {
      setLoading(false);
      setIsRegistered(false);
      setUserPosition(null);
      setError(null);
      // Clear user cache when wallet disconnects
      return;
    }

    // Cannot fetch without a ready program
    if (!program || !isReady) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use cache with SWR pattern (5s TTL)
      const result = await withCache(
        CacheKeys.userPosition(publicKey.toBase58()),
        async () => {
          // Derive the User Position PDA for the connected wallet
          // **Validates: Requirement 7.1**
          const [userPositionPDA] = getUserPositionPDA(publicKey);

          // Fetch the account data from the blockchain with RPC fallback
          // The program.account API automatically deserializes using the IDL
          // **Validates: Requirement 7.2**
          const accountData = await executeRPCWithFallback(async () => {
            return await program.account.userPosition.fetch(userPositionPDA);
          });

          // Convert the account data to our UserPosition type
          const fetchedUserPosition: UserPosition = {
            owner: accountData.owner.toString(),
            factionId: accountData.factionId,
            depositedAmount: BigInt(accountData.depositedAmount.toString()),
            lastDepositEpoch: BigInt(accountData.lastDepositEpoch.toString()),
            automationSettings: {
              prioritySlot1: {
                itemId: accountData.automationSettings.prioritySlot1.itemId,
                threshold: BigInt(accountData.automationSettings.prioritySlot1.threshold.toString()),
              },
              prioritySlot2: {
                itemId: accountData.automationSettings.prioritySlot2.itemId,
                threshold: BigInt(accountData.automationSettings.prioritySlot2.threshold.toString()),
              },
              fallbackAction: accountData.automationSettings.fallbackAction,
            },
            inventory: {
              swordCount: BigInt(accountData.inventory.swordCount.toString()),
              shieldCount: BigInt(accountData.inventory.shieldCount.toString()),
              spyglassCount: BigInt(accountData.inventory.spyglassCount.toString()),
            },
          };

          return fetchedUserPosition;
        },
        {
          ttl: GAME_CONSTANTS.CACHE_TTL.USER_POSITION,
          staleWhileRevalidate: true,
        }
      );

      setUserPosition(result.data);
      setIsRegistered(true);
      setLoading(false);
    } catch (err: any) {
      // Handle account not found scenario
      // **Validates: Requirement 7.3**
      if (err?.message?.includes('Account does not exist') || 
          err?.message?.includes('AccountNotFound') ||
          err?.code === 'AccountNotFound') {
        // User is not registered - this is not an error, just a state
        // **Validates: Requirement 7.4**
        setUserPosition(null);
        setIsRegistered(false);
        setError(null);
        setLoading(false);
      } else {
        // Actual error occurred
        // **Validates: Requirement 7.5**
        const error = err instanceof Error ? err : new Error('Failed to fetch user position');
        console.error('Error fetching user position:', error);
        setError(error);
        setLoading(false);
        setUserPosition(null);
        setIsRegistered(false);
      }
    }
  }, [publicKey, program, isReady]);

  /**
   * Manual refetch function exposed to consumers
   * Invalidates cache before fetching
   * **Validates: Requirement 7.1 (data refresh mechanism)**
   */
  const refetch = useCallback(async () => {
    if (publicKey) {
      invalidateCache(CacheKeys.userPosition(publicKey.toBase58()));
    }
    await fetchUserPosition();
  }, [fetchUserPosition, publicKey]);

  /**
   * Initial fetch and polling setup
   * Polls more frequently than game state (5 seconds) for better UX
   */
  useEffect(() => {
    // Fetch immediately on mount or when dependencies change
    fetchUserPosition();

    // Set up polling interval (5 seconds for user-specific data)
    const pollInterval = setInterval(() => {
      fetchUserPosition();
    }, GAME_CONSTANTS.USER_POSITION_POLL_INTERVAL);

    // Cleanup interval on unmount
    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchUserPosition]);

  /**
   * Clear user cache when wallet disconnects
   */
  useEffect(() => {
    if (!publicKey) {
      // Wallet disconnected, clear all user-specific cache
      return;
    }

    // Cleanup function to clear cache when publicKey changes
    return () => {
      if (publicKey) {
        invalidateUserCache(publicKey.toBase58());
      }
    };
  }, [publicKey]);

  return {
    userPosition,
    isRegistered,
    loading,
    error,
    refetch,
  };
}
