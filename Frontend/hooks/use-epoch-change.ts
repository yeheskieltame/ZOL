'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameState } from './use-game-state';
import { parseGameStatus } from '@/lib/transformers';
import type { GameState } from '@/lib/idl/types';

/**
 * Epoch change event types
 */
export type EpochChangeEvent = 
  | { type: 'epoch_ended'; epochNumber: number; status: 'settlement' }
  | { type: 'epoch_started'; epochNumber: number; status: 'active' }
  | { type: 'status_changed'; epochNumber: number; oldStatus: string; newStatus: string };

/**
 * Return type for useEpochChange hook
 */
export interface UseEpochChangeReturn {
  /** The current epoch number */
  currentEpoch: number | null;
  /** The current game status */
  currentStatus: 'active' | 'settlement' | 'paused' | null;
  /** Whether an epoch change was recently detected */
  epochChanged: boolean;
  /** The most recent epoch change event */
  lastEvent: EpochChangeEvent | null;
  /** Function to clear the epoch changed flag */
  clearEpochChanged: () => void;
}

/**
 * useEpochChange Hook
 * 
 * Monitors the game state for epoch changes and status transitions.
 * This hook:
 * - Polls game state for status changes
 * - Detects when epoch ends (status becomes Settlement)
 * - Detects when new epoch starts (epoch number increments)
 * - Triggers data refresh callbacks on epoch change
 * 
 * **Validates: Requirements 10.1, 10.2**
 * 
 * @returns {UseEpochChangeReturn} Object containing epoch change detection state
 * 
 * @example
 * ```tsx
 * function GameComponent() {
 *   const { currentEpoch, currentStatus, epochChanged, lastEvent } = useEpochChange();
 *   
 *   useEffect(() => {
 *     if (epochChanged && lastEvent?.type === 'epoch_ended') {
 *       // Show notification that epoch has ended
 *       toast.info('Epoch has ended! Settlement in progress...');
 *     }
 *   }, [epochChanged, lastEvent]);
 *   
 *   return <div>Current Epoch: {currentEpoch}</div>;
 * }
 * ```
 */
export function useEpochChange(): UseEpochChangeReturn {
  const { gameState, refetch } = useGameState();
  
  // Track previous state to detect changes
  const previousEpochRef = useRef<number | null>(null);
  const previousStatusRef = useRef<string | null>(null);
  
  // State for epoch change detection
  const [currentEpoch, setCurrentEpoch] = useState<number | null>(null);
  const [currentStatus, setCurrentStatus] = useState<'active' | 'settlement' | 'paused' | null>(null);
  const [epochChanged, setEpochChanged] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<EpochChangeEvent | null>(null);

  /**
   * Clears the epoch changed flag
   */
  const clearEpochChanged = useCallback(() => {
    setEpochChanged(false);
  }, []);

  /**
   * Monitors game state for changes
   * **Validates: Requirements 10.1, 10.2**
   */
  useEffect(() => {
    if (!gameState) {
      return;
    }

    const epochNumber = Number(gameState.epochNumber);
    const status = parseGameStatus(gameState.status);

    // Update current state
    setCurrentEpoch(epochNumber);
    setCurrentStatus(status);

    // Check if this is the first load
    if (previousEpochRef.current === null) {
      previousEpochRef.current = epochNumber;
      previousStatusRef.current = status;
      return;
    }

    // Detect epoch number change (new epoch started)
    // **Validates: Requirement 10.2**
    if (epochNumber > previousEpochRef.current) {
      const event: EpochChangeEvent = {
        type: 'epoch_started',
        epochNumber,
        status: 'active',
      };
      
      setLastEvent(event);
      setEpochChanged(true);
      
      // Trigger data refresh
      refetch();
      
      console.log(`[EpochChange] New epoch started: ${epochNumber}`);
    }
    
    // Detect status change to Settlement (epoch ended)
    // **Validates: Requirement 10.1**
    else if (status !== previousStatusRef.current) {
      if (status === 'settlement' && previousStatusRef.current === 'active') {
        const event: EpochChangeEvent = {
          type: 'epoch_ended',
          epochNumber,
          status: 'settlement',
        };
        
        setLastEvent(event);
        setEpochChanged(true);
        
        // Trigger data refresh
        refetch();
        
        console.log(`[EpochChange] Epoch ${epochNumber} ended, entering settlement`);
      } else {
        const event: EpochChangeEvent = {
          type: 'status_changed',
          epochNumber,
          oldStatus: previousStatusRef.current || 'unknown',
          newStatus: status,
        };
        
        setLastEvent(event);
        setEpochChanged(true);
        
        console.log(`[EpochChange] Status changed from ${previousStatusRef.current} to ${status}`);
      }
    }

    // Update previous state
    previousEpochRef.current = epochNumber;
    previousStatusRef.current = status;
  }, [gameState, refetch]);

  return {
    currentEpoch,
    currentStatus,
    epochChanged,
    lastEvent,
    clearEpochChanged,
  };
}
