/**
 * Tests for useGameState hook
 * Validates game state fetching, polling, and error handling
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useGameState } from '@/hooks/use-game-state';
import { useZolProgram } from '@/hooks/use-zol-program';
import { getGameStatePDA } from '@/lib/pda';
import { GAME_CONSTANTS } from '@/lib/config';

// Mock dependencies
jest.mock('@/hooks/use-zol-program');
jest.mock('@/lib/pda');

describe('useGameState', () => {
  const mockGameStatePDA = 'GameStatePDA111111111111111111111111111';
  const mockGameStateData = {
    admin: 'Admin11111111111111111111111111111111111',
    epochNumber: { toString: () => '1' },
    epochStartTs: { toString: () => '1700000000' },
    epochEndTs: { toString: () => '1700259200' },
    totalTvl: { toString: () => '1000000000' },
    factions: [
      {
        id: 0,
        name: 'Vanguard',
        tvl: { toString: () => '400000000' },
        score: { toString: () => '100' },
      },
      {
        id: 1,
        name: 'Mage',
        tvl: { toString: () => '350000000' },
        score: { toString: () => '90' },
      },
      {
        id: 2,
        name: 'Assassin',
        tvl: { toString: () => '250000000' },
        score: { toString: () => '80' },
      },
    ],
    status: { active: {} },
  };

  const mockProgram = {
    account: {
      gameState: {
        fetch: jest.fn(),
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (getGameStatePDA as jest.Mock).mockReturnValue([mockGameStatePDA, 255]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('when program is not ready', () => {
    beforeEach(() => {
      (useZolProgram as jest.Mock).mockReturnValue({
        program: null,
        isReady: false,
      });
    });

    it('should not fetch game state', () => {
      renderHook(() => useGameState());

      expect(mockProgram.account.gameState.fetch).not.toHaveBeenCalled();
    });

    it('should set loading to false', async () => {
      const { result } = renderHook(() => useGameState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should have null gameState', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.gameState).toBeNull();
    });
  });

  describe('when program is ready', () => {
    beforeEach(() => {
      (useZolProgram as jest.Mock).mockReturnValue({
        program: mockProgram,
        isReady: true,
      });

      mockProgram.account.gameState.fetch.mockResolvedValue(mockGameStateData);
    });

    it('should fetch game state on mount', async () => {
      renderHook(() => useGameState());

      await waitFor(() => {
        expect(mockProgram.account.gameState.fetch).toHaveBeenCalledWith(mockGameStatePDA);
      });
    });

    it('should set gameState with fetched data', async () => {
      const { result } = renderHook(() => useGameState());

      await waitFor(() => {
        expect(result.current.gameState).not.toBeNull();
      });

      expect(result.current.gameState?.epochNumber).toBe(1n);
      expect(result.current.gameState?.totalTvl).toBe(1000000000n);
      expect(result.current.gameState?.factions).toHaveLength(3);
      expect(result.current.gameState?.factions[0].name).toBe('Vanguard');
    });

    it('should set loading to false after fetch', async () => {
      const { result } = renderHook(() => useGameState());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should have no error after successful fetch', async () => {
      const { result } = renderHook(() => useGameState());

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should poll for updates at configured interval', async () => {
      renderHook(() => useGameState());

      await waitFor(() => {
        expect(mockProgram.account.gameState.fetch).toHaveBeenCalledTimes(1);
      });

      // Advance time by poll interval
      jest.advanceTimersByTime(GAME_CONSTANTS.POLL_INTERVAL);

      await waitFor(() => {
        expect(mockProgram.account.gameState.fetch).toHaveBeenCalledTimes(2);
      });

      // Advance time again
      jest.advanceTimersByTime(GAME_CONSTANTS.POLL_INTERVAL);

      await waitFor(() => {
        expect(mockProgram.account.gameState.fetch).toHaveBeenCalledTimes(3);
      });
    });

    it('should support manual refetch', async () => {
      const { result } = renderHook(() => useGameState());

      await waitFor(() => {
        expect(mockProgram.account.gameState.fetch).toHaveBeenCalledTimes(1);
      });

      // Call refetch manually
      await result.current.refetch();

      expect(mockProgram.account.gameState.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      (useZolProgram as jest.Mock).mockReturnValue({
        program: mockProgram,
        isReady: true,
      });
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Network error');
      mockProgram.account.gameState.fetch.mockRejectedValue(mockError);

      const { result } = renderHook(() => useGameState());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe('Network error');
      expect(result.current.gameState).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should handle non-Error exceptions', async () => {
      mockProgram.account.gameState.fetch.mockRejectedValue('String error');

      const { result } = renderHook(() => useGameState());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe('Failed to fetch game state');
    });

    it('should clear error on successful refetch', async () => {
      const mockError = new Error('Network error');
      mockProgram.account.gameState.fetch.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useGameState());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Fix the mock to succeed
      mockProgram.account.gameState.fetch.mockResolvedValue(mockGameStateData);

      // Refetch
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      expect(result.current.gameState).not.toBeNull();
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      (useZolProgram as jest.Mock).mockReturnValue({
        program: mockProgram,
        isReady: true,
      });

      mockProgram.account.gameState.fetch.mockResolvedValue(mockGameStateData);
    });

    it('should stop polling on unmount', async () => {
      const { unmount } = renderHook(() => useGameState());

      await waitFor(() => {
        expect(mockProgram.account.gameState.fetch).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Advance time - should not trigger more fetches
      jest.advanceTimersByTime(GAME_CONSTANTS.POLL_INTERVAL * 3);

      // Should still be 1 call (no new calls after unmount)
      expect(mockProgram.account.gameState.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
