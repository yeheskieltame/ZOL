/**
 * Tests for useEpochChange hook
 * Validates epoch change detection functionality
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useEpochChange } from '@/hooks/use-epoch-change';
import { useGameState } from '@/hooks/use-game-state';
import type { GameState } from '@/lib/idl/types';

// Mock dependencies
jest.mock('@/hooks/use-game-state');

const mockUseGameState = useGameState as jest.MockedFunction<typeof useGameState>;

describe('useEpochChange', () => {
  const mockRefetch = jest.fn();

  const createMockGameState = (epochNumber: number, status: 'active' | 'settlement' | 'paused'): GameState => ({
    admin: 'AdminPublicKey',
    epochNumber: BigInt(epochNumber),
    epochStartTs: BigInt(Math.floor(Date.now() / 1000) - 86400),
    epochEndTs: BigInt(Math.floor(Date.now() / 1000) + 86400),
    totalTvl: BigInt(1000000000),
    factions: [
      { id: 0, name: 'Vanguard', tvl: BigInt(300000000), score: BigInt(100) },
      { id: 1, name: 'Mage', tvl: BigInt(400000000), score: BigInt(150) },
      { id: 2, name: 'Assassin', tvl: BigInt(300000000), score: BigInt(120) },
    ],
    status: { [status]: {} } as any,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with null values when no game state', () => {
    mockUseGameState.mockReturnValue({
      gameState: null,
      loading: true,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useEpochChange());

    expect(result.current.currentEpoch).toBeNull();
    expect(result.current.currentStatus).toBeNull();
    expect(result.current.epochChanged).toBe(false);
    expect(result.current.lastEvent).toBeNull();
  });

  it('should set current epoch and status on first load', async () => {
    const mockGameState = createMockGameState(1, 'active');
    
    mockUseGameState.mockReturnValue({
      gameState: mockGameState,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useEpochChange());

    await waitFor(() => {
      expect(result.current.currentEpoch).toBe(1);
      expect(result.current.currentStatus).toBe('active');
      expect(result.current.epochChanged).toBe(false); // No change on first load
    });
  });

  it('should detect epoch number change (new epoch started)', async () => {
    const mockGameState1 = createMockGameState(1, 'active');
    
    mockUseGameState.mockReturnValue({
      gameState: mockGameState1,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result, rerender } = renderHook(() => useEpochChange());

    await waitFor(() => {
      expect(result.current.currentEpoch).toBe(1);
    });

    // Simulate epoch change
    const mockGameState2 = createMockGameState(2, 'active');
    mockUseGameState.mockReturnValue({
      gameState: mockGameState2,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    rerender();

    await waitFor(() => {
      expect(result.current.currentEpoch).toBe(2);
      expect(result.current.epochChanged).toBe(true);
      expect(result.current.lastEvent).toEqual({
        type: 'epoch_started',
        epochNumber: 2,
        status: 'active',
      });
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('should detect status change to settlement (epoch ended)', async () => {
    const mockGameState1 = createMockGameState(1, 'active');
    
    mockUseGameState.mockReturnValue({
      gameState: mockGameState1,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result, rerender } = renderHook(() => useEpochChange());

    await waitFor(() => {
      expect(result.current.currentStatus).toBe('active');
    });

    // Simulate status change to settlement
    const mockGameState2 = createMockGameState(1, 'settlement');
    mockUseGameState.mockReturnValue({
      gameState: mockGameState2,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    rerender();

    await waitFor(() => {
      expect(result.current.currentStatus).toBe('settlement');
      expect(result.current.epochChanged).toBe(true);
      expect(result.current.lastEvent).toEqual({
        type: 'epoch_ended',
        epochNumber: 1,
        status: 'settlement',
      });
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('should detect other status changes', async () => {
    const mockGameState1 = createMockGameState(1, 'active');
    
    mockUseGameState.mockReturnValue({
      gameState: mockGameState1,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result, rerender } = renderHook(() => useEpochChange());

    await waitFor(() => {
      expect(result.current.currentStatus).toBe('active');
    });

    // Simulate status change to paused
    const mockGameState2 = createMockGameState(1, 'paused');
    mockUseGameState.mockReturnValue({
      gameState: mockGameState2,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    rerender();

    await waitFor(() => {
      expect(result.current.currentStatus).toBe('paused');
      expect(result.current.epochChanged).toBe(true);
      expect(result.current.lastEvent?.type).toBe('status_changed');
    });
  });

  it('should clear epoch changed flag', async () => {
    const mockGameState1 = createMockGameState(1, 'active');
    
    mockUseGameState.mockReturnValue({
      gameState: mockGameState1,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result, rerender } = renderHook(() => useEpochChange());

    await waitFor(() => {
      expect(result.current.currentEpoch).toBe(1);
    });

    // Simulate epoch change
    const mockGameState2 = createMockGameState(2, 'active');
    mockUseGameState.mockReturnValue({
      gameState: mockGameState2,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    rerender();

    await waitFor(() => {
      expect(result.current.epochChanged).toBe(true);
    });

    // Clear the flag
    result.current.clearEpochChanged();

    await waitFor(() => {
      expect(result.current.epochChanged).toBe(false);
    });
  });
});
