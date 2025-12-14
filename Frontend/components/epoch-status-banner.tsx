'use client';

import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Props for EpochStatusBanner component
 */
export interface EpochStatusBannerProps {
  /** Current game status */
  status: 'active' | 'settlement' | 'paused' | null;
  /** Current epoch number */
  epochNumber: number | null;
  /** Optional CSS class name */
  className?: string;
}

/**
 * EpochStatusBanner Component
 * 
 * Displays a banner showing the current epoch status.
 * Shows different styles and messages based on the game status.
 * 
 * **Validates: Requirements 10.2, 10.5**
 * 
 * @param props - Component props
 * @returns React component or null if no status
 * 
 * @example
 * ```tsx
 * <EpochStatusBanner 
 *   status="settlement" 
 *   epochNumber={42} 
 * />
 * ```
 */
export function EpochStatusBanner({ status, epochNumber, className = '' }: EpochStatusBannerProps) {
  if (!status || epochNumber === null) {
    return null;
  }

  // Determine banner variant and content based on status
  const getBannerConfig = () => {
    switch (status) {
      case 'settlement':
        return {
          variant: 'default' as const,
          icon: Clock,
          title: '⚔️ Settlement in Progress',
          description: `Epoch ${epochNumber} has ended. Calculating battle results and distributing rewards...`,
          className: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950',
        };
      
      case 'active':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          title: '🎮 Battle Active',
          description: `Epoch ${epochNumber} is live! Deploy your forces and compete for yield.`,
          className: 'border-green-500 bg-green-50 dark:bg-green-950',
        };
      
      case 'paused':
        return {
          variant: 'destructive' as const,
          icon: AlertCircle,
          title: '⏸️ Game Paused',
          description: `Epoch ${epochNumber} is temporarily paused. Please check back later.`,
          className: 'border-red-500 bg-red-50 dark:bg-red-950',
        };
      
      default:
        return null;
    }
  };

  const config = getBannerConfig();
  
  if (!config) {
    return null;
  }

  const Icon = config.icon;

  return (
    <Alert variant={config.variant} className={`${config.className} ${className}`}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription>{config.description}</AlertDescription>
    </Alert>
  );
}
