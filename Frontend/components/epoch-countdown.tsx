'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatTimeRemaining } from '@/lib/transformers';

/**
 * Props for EpochCountdown component
 */
export interface EpochCountdownProps {
  /** Epoch end timestamp in seconds (bigint) */
  epochEndTs: bigint;
  /** Optional CSS class name */
  className?: string;
  /** Whether to show the clock icon */
  showIcon?: boolean;
}

/**
 * EpochCountdown Component
 * 
 * Displays a real-time countdown to the end of the current epoch.
 * Updates every second to show accurate time remaining.
 * 
 * **Validates: Requirements 10.4, 10.5**
 * 
 * @param props - Component props
 * @returns React component
 * 
 * @example
 * ```tsx
 * <EpochCountdown epochEndTs={gameState.epochEndTs} showIcon />
 * ```
 */
export function EpochCountdown({ epochEndTs, className = '', showIcon = true }: EpochCountdownProps) {
  // State for real-time countdown
  const [timeRemaining, setTimeRemaining] = useState<string>(() => formatTimeRemaining(epochEndTs));
  const [isExpired, setIsExpired] = useState<boolean>(false);

  /**
   * Update countdown every second
   * **Validates: Requirement 10.4**
   */
  useEffect(() => {
    // Update immediately
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const endTime = Number(epochEndTs);
      const secondsRemaining = endTime - now;

      if (secondsRemaining <= 0) {
        setTimeRemaining('Epoch Ended');
        setIsExpired(true);
      } else {
        setTimeRemaining(formatTimeRemaining(epochEndTs));
        setIsExpired(false);
      }
    };

    updateCountdown();

    // Set up interval to update every second
    const interval = setInterval(updateCountdown, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [epochEndTs]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && (
        <Clock 
          className={`h-4 w-4 ${isExpired ? 'text-red-500' : 'text-muted-foreground'}`} 
        />
      )}
      <span className={`font-mono ${isExpired ? 'text-red-500 font-semibold' : ''}`}>
        {timeRemaining}
      </span>
    </div>
  );
}
