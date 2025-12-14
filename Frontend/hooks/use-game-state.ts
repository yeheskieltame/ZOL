'use client';

import { useState, useEffect, useCallback } from 'react';
import { useZolProgram } from './use-zol-program';
import { getGameStatePDA } from '@/lib/pda';
import { GAME_CONSTANTS } from '@/lib/config';
import { withCache, CacheKeys, invalidateCache } from '@/lib/cache';
import { executeRPCWithFallback } from '@/lib/rpc-manager';
import type { GameState } from '@/lib/idl/types';

/**
 * Return type for useGameState hook
 */
export interface UseGameStateReturn {
  /** The current game state data from the blockchain */
  gameState: GameState | null;
  /** Whether the data is currently being fetched */
  loading: boolean;
  /** Any error that occurred during fetching */
  error: Error | null;
  /** Function to manually trigger a data refresh */
  refetch: () => Promise<void>;
}

/**
 * useGameState Hook
 * 
 * Fetches and manages the Game State Account data from the blockchain.
 * This hook:
 * - Fetches the Game State Account using the derived PDA
 * - Deserializes account data using the IDL
 * - Implements polling for real-time updates (10 second interval)
 * - Handles loading and error states
 * 
 * The game state includes:
 * - Current epoch number, start time, and end time
 * - Faction data (TVL, player count, score)
 * - Total TVL across all factions
 * - Game status (Active, Settlement, Paused)
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * @returns {UseGameStateReturn} Object containing gameState, loading, error, and refetch function
 * 
 * @example
 * ```tsx
 * function ArenaPage() {
 *   const { gameState, loading, error, refetch } = useGameState();
 *   
 *   if (loading) return <div>Loading game state...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!gameState) return <div>No game state available</div>;
 *   
 *   return (
 *     <div>
 *       <h1>Epoch {gameState.epochNumber.toString()}</h1>
 *       <p>Total TVL: {gameState.totalTvl.toString()}</p>
 *       {gameState.factions.map(faction => (
 *         <div key={faction.id}>
 *           <h2>{faction.name}</h2>
 *           <p>TVL: {faction.tvl.toString()}</p>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useGameState(): UseGameStateReturn {
  const { program, isReady } = useZolProgram();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetches the game state from the blockchain with caching
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
   */
  const fetchGameState = useCallback(async () => {
    // Cannot fetch without a ready program
    if (!program || !isReady) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use cache with SWR pattern (10s TTL)
      const result = await withCache(
        CacheKeys.gameState(),
        async () => {
          // Derive the Game State PDA
          // **Validates: Requirement 3.1**
          const [gameStatePDA] = getGameStatePDA();

          // Fetch the account data from the blockchain with RPC fallback
          // The program.account API automatically deserializes using the IDL
          // **Validates: Requirements 3.2, 3.3, 3.4**
          const accountData = await executeRPCWithFallback(async () => {
            return await program.account.gameState.fetch(gameStatePDA);
          });

          // Convert the account data to our GameState type
          const fetchedGameState: GameState = {
            admin: accountData.admin.toString(),
            epochNumber: BigInt(accountData.epochNumber.toString()),
            epochStartTs: BigInt(accountData.epochStartTs.toString()),
            epochEndTs: BigInt(accountData.epochEndTs.toString()),
            totalTvl: BigInt(accountData.totalTvl.toString()),
            factions: accountData.factions.map(faction => ({
              id: faction.id,
              name: faction.name,
              tvl: BigInt(faction.tvl.toString()),
              score: BigInt(faction.score.toString()),
            })),
            status: accountData.status,
          };

          return fetchedGameState;
        },
        {
          ttl: GAME_CONSTANTS.CACHE_TTL.GAME_STATE,
          staleWhileRevalidate: true,
        }
      );

      setGameState(result.data);
      setLoading(false);
    } catch (err) {
      // **Validates: Requirement 3.5**
      const error = err instanceof Error ? err : new Error('Failed to fetch game state');
      console.error('Error fetching game state:', error);
      setError(error);
      setLoading(false);
      setGameState(null);
    }
  }, [program, isReady]);

  /**
   * Manual refetch function exposed to consumers
   * Invalidates cache before fetching
   */
  const refetch = useCallback(async () => {
    invalidateCache(CacheKeys.gameState());
    await fetchGameState();
  }, [fetchGameState]);

  /**
   * Initial fetch and polling setup
   * **Validates: Requirement 3.1 (polling for real-time updates)**
   */
  useEffect(() => {
    // Fetch immediately on mount or when program becomes ready
    fetchGameState();

    // Set up polling interval (10 seconds)
    const pollInterval = setInterval(() => {
      fetchGameState();
    }, GAME_CONSTANTS.POLL_INTERVAL);

    // Cleanup interval on unmount
    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchGameState]);

  return {
    gameState,
    loading,
    error,
    refetch,
  };
}
