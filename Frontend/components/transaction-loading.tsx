'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { TransactionStatus } from '@/hooks/use-zol-transactions';

interface TransactionLoadingProps {
  status: TransactionStatus;
  signature: string | null;
  operationName?: string;
  showDelayWarning?: boolean;
  delayThreshold?: number; // milliseconds
}

/**
 * TransactionLoading Component
 * 
 * Displays loading indicators and status for blockchain transactions.
 * Shows different states: processing, confirmed, finalized, with visual feedback.
 * Displays delay notification when transaction takes longer than expected.
 * 
 * Requirements: 11.1, 11.3, 11.4
 * 
 * @param status - Current transaction status
 * @param signature - Transaction signature (if available)
 * @param operationName - Name of the operation being performed
 * @param showDelayWarning - Whether to show delay warning
 * @param delayThreshold - Time in ms before showing delay warning (default: 10000)
 */
export function TransactionLoading({
  status,
  signature,
  operationName = 'Transaction',
  showDelayWarning = true,
  delayThreshold = 10000,
}: TransactionLoadingProps) {
  const [showDelay, setShowDelay] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Track elapsed time and show delay warning
  useEffect(() => {
    if (status !== 'processing') {
      setShowDelay(false);
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    
    // Update elapsed time every second
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);
      
      if (showDelayWarning && elapsed > delayThreshold) {
        setShowDelay(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, showDelayWarning, delayThreshold]);

  if (status === 'idle') {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Status indicator */}
      <div className="flex items-center gap-3">
        {status === 'processing' && (
          <>
            <Spinner className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {operationName} in progress...
              </p>
              <p className="text-xs text-gray-500">
                Waiting for blockchain confirmation
              </p>
            </div>
          </>
        )}
        
        {status === 'confirmed' && (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {operationName} confirmed
              </p>
              <p className="text-xs text-gray-500">
                Transaction has been confirmed on the blockchain
              </p>
            </div>
          </>
        )}
        
        {status === 'finalized' && (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {operationName} finalized
              </p>
              <p className="text-xs text-gray-500">
                Transaction has been finalized on the blockchain
              </p>
            </div>
          </>
        )}
        
        {status === 'error' && (
          <>
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {operationName} failed
              </p>
              <p className="text-xs text-gray-500">
                An error occurred during transaction processing
              </p>
            </div>
          </>
        )}
      </div>

      {/* Delay warning */}
      {showDelay && status === 'processing' && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <Clock className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-yellow-900">
              Transaction is taking longer than expected
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              This can happen during network congestion. Your transaction is still being processed.
              {elapsedTime > 0 && ` (${Math.floor(elapsedTime / 1000)}s elapsed)`}
            </p>
          </div>
        </div>
      )}

      {/* Transaction signature (if available) */}
      {signature && status !== 'error' && (
        <div className="text-xs text-gray-500 font-mono break-all">
          Signature: {signature.slice(0, 8)}...{signature.slice(-8)}
        </div>
      )}
    </div>
  );
}
