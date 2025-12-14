'use client';

import { TransactionLoading } from './transaction-loading';
import { TransactionSuccessModal } from './transaction-success-modal';
import type { TransactionStatus } from '@/hooks/use-zol-transactions';

interface TransactionFeedbackProps {
  /** Current transaction status */
  status: TransactionStatus;
  /** Transaction signature */
  signature: string | null;
  /** Operation name for display */
  operationName?: string;
  /** Whether to show delay warning */
  showDelayWarning?: boolean;
  /** Callback when success modal is closed */
  onSuccessClose: () => void;
  /** Optional callback to refresh data after transaction */
  onDataRefresh?: () => void;
}

/**
 * TransactionFeedback Component
 * 
 * Integrated component that displays both loading indicators and success modals
 * for blockchain transactions. Automatically switches between states based on
 * transaction status.
 * 
 * This component combines:
 * - TransactionLoading for processing states
 * - TransactionSuccessModal for confirmed/finalized states
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 * 
 * @param status - Current transaction status
 * @param signature - Transaction signature (if available)
 * @param operationName - Name of the operation being performed
 * @param showDelayWarning - Whether to show delay warning for slow transactions
 * @param onSuccessClose - Callback when success modal is closed
 * @param onDataRefresh - Optional callback to refresh data after transaction
 */
export function TransactionFeedback({
  status,
  signature,
  operationName = 'Transaction',
  showDelayWarning = true,
  onSuccessClose,
  onDataRefresh,
}: TransactionFeedbackProps) {
  // Show loading indicator for processing status
  const showLoading = status === 'processing';
  
  // Show success modal for confirmed or finalized status
  const showSuccess = (status === 'confirmed' || status === 'finalized') && signature !== null;

  return (
    <>
      {/* Loading indicator */}
      {showLoading && (
        <div className="mt-4">
          <TransactionLoading
            status={status}
            signature={signature}
            operationName={operationName}
            showDelayWarning={showDelayWarning}
          />
        </div>
      )}

      {/* Success modal */}
      {showSuccess && (
        <TransactionSuccessModal
          isOpen={showSuccess}
          onClose={onSuccessClose}
          signature={signature!}
          operationName={operationName}
          onDataRefresh={onDataRefresh}
        />
      )}
    </>
  );
}
