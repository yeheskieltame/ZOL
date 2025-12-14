'use client';

import { useEffect, useRef } from 'react';
import { useEpochChange } from './use-epoch-change';
import { useGameState } from './use-game-state';
import { formatTimeRemaining } from '@/lib/transformers';
import { toast } from 'sonner';

/**
 * Return type for useEpochNotifications hook
 */
export interface UseEpochNotificationsReturn {
  /** The current epoch number */
  currentEpoch: number | null;
  /** The current game status */
  currentStatus: 'active' | 'settlement' | 'paused' | null;
  /** Time remaining in current epoch (formatted string) */
  timeRemaining: string | null;
}

/**
 * useEpochNotifications Hook
 * 
 * Provides real-time notifications for epoch changes and displays countdown.
 * This hook:
 * - Shows notification when epoch enters Settlement
 * - Shows notification when new epoch starts
 * - Displays time remaining countdown
 * - Updates UI in real-time
 * 
 * **Validates: Requirements 10.2, 10.4, 10.5**
 * 
 * @returns {UseEpochNotificationsReturn} Object containing epoch notification state
 * 
 * @example
 * ```tsx
 * function GameLayout() {
 *   const { currentEpoch, timeRemaining } = useEpochNotifications();
 *   
 *   return (
 *     <div>
 *       <h1>Epoch {currentEpoch}</h1>
 *       <p>Time Remaining: {timeRemaining}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEpochNotifications(): UseEpochNotificationsReturn {
  const { currentEpoch, currentStatus, epochChanged, lastEvent, clearEpochChanged } = useEpochChange();
  const { gameState } = useGameState();
  
  // Track if we've already shown notifications to avoid duplicates
  const shownNotificationsRef = useRef<Set<string>>(new Set());

  /**
   * Show notifications for epoch changes
   * **Validates: Requirements 10.2, 10.5**
   */
  useEffect(() => {
    if (!epochChanged || !lastEvent) {
      return;
    }

    // Create a unique key for this event to prevent duplicate notifications
    const eventKey = `${lastEvent.type}-${lastEvent.epochNumber}`;
    
    // Skip if we've already shown this notification
    if (shownNotificationsRef.current.has(eventKey)) {
      clearEpochChanged();
      return;
    }

    // Show notification based on event type
    if (lastEvent.type === 'epoch_ended') {
      // **Validates: Requirement 10.5**
      toast.warning('⚔️ Epoch Ended!', {
        description: `Epoch ${lastEvent.epochNumber} has ended. Settlement is in progress...`,
        duration: 5000,
      });
      
      shownNotificationsRef.current.add(eventKey);
      console.log(`[Notification] Epoch ${lastEvent.epochNumber} ended`);
    } 
    else if (lastEvent.type === 'epoch_started') {
      // **Validates: Requirement 10.2**
      toast.success('🎮 New Epoch Started!', {
        description: `Epoch ${lastEvent.epochNumber} has begun. Time to battle!`,
        duration: 5000,
      });
      
      shownNotificationsRef.current.add(eventKey);
      console.log(`[Notification] Epoch ${lastEvent.epochNumber} started`);
    }
    else if (lastEvent.type === 'status_changed') {
      // Show notification for other status changes
      toast.info('📢 Status Update', {
        description: `Game status changed to ${lastEvent.newStatus}`,
        duration: 5000,
      });
      
      shownNotificationsRef.current.add(eventKey);
      console.log(`[Notification] Status changed to ${lastEvent.newStatus}`);
    }

    // Clear the epoch changed flag after showing notification
    clearEpochChanged();
  }, [epochChanged, lastEvent, clearEpochChanged]);

  /**
   * Calculate time remaining
   * **Validates: Requirement 10.4**
   */
  const timeRemaining = gameState ? formatTimeRemaining(gameState.epochEndTs) : null;

  return {
    currentEpoch,
    currentStatus,
    timeRemaining,
  };
}
