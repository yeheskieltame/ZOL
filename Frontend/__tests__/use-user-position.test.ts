/**
 * Tests for useUserPosition hook
 * Validates user position fetching, registration check, and error handling
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useUserPosition } from '@/hooks/use-user-position';
import { useZolProgram } from '@/hooks/use-zol-program';
import { getUserPositionPDA } from '@/lib/pda';
import { GAME_CONSTANTS } from '@/lib/config';

// Mock dependencies
jest.mock('@solana/wallet-adapter-react');
jest.mock('@/hooks/use-zol-program');
jest.mock('@/lib/pda');

describe('useUserPosition', () => {
  const mockPublicKey = new PublicKey('11111111111111111111111111111111');
  const mockUserPositionPDA = '11111111111111111111111111111111';
  
  const mockUserPositionData = {
    owner: mockPublicKey.toString(),
    factionId: 0,
    depositedAmount: { toString: () => '500000000' },
    lastDepositEpoch: { toString: () => '1' },
    automationSettings: {
      prioritySlot1: {
        itemId: 1,
        threshold: { toString: () => '100000000' },
      },
      prioritySlot2: {
        itemId: 2,
        threshold: { toString: () => '50000000' },
      },
      fallbackAction: { autoCompound: {} },
    },
    inventory: {
      swordCount: { toString: () => '5' },
      shieldCount: { toString: () => '3' },
      spyglassCount: { toString: () => '2' },
    },
  };

  const mockProgram = {
    account: {
      userPosition: {
        fetch: jest.fn(),
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (getUserPositionPDA as jest.Mock).mockReturnValue([mockUserPositionPDA, 255]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('when wallet is not connected', () => {
    beforeEach(() => {
      (useWallet as jest.Mock).mockReturnValue({
        publicKey: null,
      });

      (useZolProgram as jest.Mock).mockReturnValue({
        program: mockProgram,
        isReady: true,
      });
    });

    it('should not fetch user position', () => {
      renderHook(() => useUserPosition());

      expect(mockProgram.account.userPosition.fetch).not.toHaveBeenCalled();
    });

    it('should set loading to false', async () => {
      const { result } = renderHook(() => useUserPosition());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set isRegistered to false', () => {
      const { result } = renderHook(() => useUserPosition());

      expect(result.current.isRegistered).toBe(false);
    });

    it('should have null userPosition', () => {
      const { result } = renderHook(() => useUserPosition());

      expect(result.current.userPosition).toBeNull();
    });
  });

  describe('when wallet is connected and program is ready', () => {
    beforeEach(() => {
      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      (useZolProgram as jest.Mock).mockReturnValue({
        program: mockProgram,
        isReady: true,
      });

      mockProgram.account.userPosition.fetch.mockResolvedValue(mockUserPositionData);
    });

    it('should fetch user position on mount', async () => {
      renderHook(() => useUserPosition());

      await waitFor(() => {
        expect(mockProgram.account.userPosition.fetch).toHaveBeenCalledWith(mockUserPositionPDA);
      });
    });

    it('should set userPosition with fetched data', async () => {
      const { result } = renderHook(() => useUserPosition());

      await waitFor(() => {
        expect(result.current.userPosition).not.toBeNull();
      });

      expect(result.current.userPosition?.owner).toBe(mockPublicKey.toString());
      expect(result.current.userPosition?.factionId).toBe(0);
      expect(result.current.userPosition?.depositedAmount).toBe(500000000n);
      expect(result.current.userPosition?.inventory.swordCount).toBe(5n);
    });

    it('should set isRegistered to true', async () => {
      const { result } = renderHook(() => useUserPosition());

      await waitFor(() => {
        expect(result.current.isRegistered).toBe(true);
      });
    });

    it('should set loading to false after fetch', async () => {
      const { result } = renderHook(() => useUserPosition());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should have no error after successful fetch', async () => {
      const { result } = renderHook(() => useUserPosition());

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should poll for updates at configured interval', async () => {
      renderHook(() => useUserPosition());

      await waitFor(() => {
        expect(mockProgram.account.userPosition.fetch).toHaveBeenCalledTimes(1);
      });

      // Advance time by poll interval
      jest.advanceTimersByTime(GAME_CONSTANTS.USER_POSITION_POLL_INTERVAL);

      await waitFor(() => {
        expect(mockProgram.account.userPosition.fetch).toHaveBeenCalledTimes(2);
      });

      // Advance time again
      jest.advanceTimersByTime(GAME_CONSTANTS.USER_POSITION_POLL_INTERVAL);

      await waitFor(() => {
        expect(mockProgram.account.userPosition.fetch).toHaveBeenCalledTimes(3);
      });
    });

    it('should support manual refetch', async () => {
      const { result } = renderHook(() => useUserPosition());

      await waitFor(() => {
        expect(mockProgram.account.userPosition.fetch).toHaveBeenCalledTimes(1);
      });

      // Call refetch manually
      await result.current.refetch();

      expect(mockProgram.account.userPosition.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('when user is not registered', () => {
    beforeEach(() => {
      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      (useZolProgram as jest.Mock).mockReturnValue({
        program: mockProgram,
        isReady: true,
      });
    });

    it('should handle account not found error', async () => {
      const accountNotFoundError = new Error('Account does not exist');
      mockProgram.account.userPosition.fetch.mockRejectedValue(accountNotFoundError);

      const { result } = renderHook(() => useUserPosition());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isRegistered).toBe(false);
      expect(result.current.userPosition).toBeNull();
      expect(result.current.error).toBeNull(); // Not an error, just not registered
    });

    it('should handle AccountNotFound error code', async () => {
      const accountNotFoundError = { code: 'AccountNotFound', message: 'Account not found' };
      mockProgram.account.userPosition.fetch.mockRejectedValue(accountNotFoundError);

      const { result } = renderHook(() => useUserPosition());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isRegistered).toBe(false);
      expect(result.current.userPosition).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      (useZolProgram as jest.Mock).mockReturnValue({
        program: mockProgram,
        isReady: true,
      });
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Network error');
      mockProgram.account.userPosition.fetch.mockRejectedValue(mockError);

      const { result } = renderHook(() => useUserPosition());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe('Network error');
      expect(result.current.userPosition).toBeNull();
      expect(result.current.isRegistered).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it('should handle non-Error exceptions', async () => {
      mockProgram.account.userPosition.fetch.mockRejectedValue('String error');

      const { result } = renderHook(() => useUserPosition());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error?.message).toBe('Failed to fetch user position');
    });

    it('should clear error on successful refetch', async () => {
      const mockError = new Error('Network error');
      mockProgram.account.userPosition.fetch.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useUserPosition());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Fix the mock to succeed
      mockProgram.account.userPosition.fetch.mockResolvedValue(mockUserPositionData);

      // Refetch
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      expect(result.current.userPosition).not.toBeNull();
      expect(result.current.isRegistered).toBe(true);
    });
  });

  describe('when program is not ready', () => {
    beforeEach(() => {
      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      (useZolProgram as jest.Mock).mockReturnValue({
        program: null,
        isReady: false,
      });
    });

    it('should not fetch user position', () => {
      renderHook(() => useUserPosition());

      expect(mockProgram.account.userPosition.fetch).not.toHaveBeenCalled();
    });

    it('should set loading to false', async () => {
      const { result } = renderHook(() => useUserPosition());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
      });

      (useZolProgram as jest.Mock).mockReturnValue({
        program: mockProgram,
        isReady: true,
      });

      mockProgram.account.userPosition.fetch.mockResolvedValue(mockUserPositionData);
    });

    it('should stop polling on unmount', async () => {
      const { unmount } = renderHook(() => useUserPosition());

      await waitFor(() => {
        expect(mockProgram.account.userPosition.fetch).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Advance time - should not trigger more fetches
      jest.advanceTimersByTime(GAME_CONSTANTS.USER_POSITION_POLL_INTERVAL * 3);

      // Should still be 1 call (no new calls after unmount)
      expect(mockProgram.account.userPosition.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
