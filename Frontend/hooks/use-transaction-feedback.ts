'use client';

import { useState, useCallback, useEffect } from 'react';
import type { TransactionStatus } from './use-zol-transactions';

/**
 * Transaction feedback state
 */
export interface TransactionFeedbackState {
  /** Whether to show the loading indicator */
  showLoading: boolean;
  /** Whether to show the success modal */
  showSuccess: boolean;
  /** Transaction signature */
  signature: string | null;
  /** Current transaction status */
  status: TransactionStatus;
  /** Operation name for display */
  operationName: string;
}

/**
 * Return type for useTransactionFeedback hook
 */
export interface UseTransactionFeedbackReturn {
  /** Current feedback state */
  feedbackState: TransactionFeedbackState;
  /** Start tracking a transaction */
  startTransaction: (operationName: string) => void;
  /** Update transaction status */
  updateStatus: (status: TransactionStatus, signature?: string) => void;
  /** Close the success modal */
  closeSuccess: () => void;
  /** Reset all feedback state */
  reset: () => void;
}

/**
 * useTransactionFeedback Hook
 * 
 * Manages transaction feedback UI state including loading indicators and success modals.
 * Automatically shows/hides UI elements based on transaction status.
 * Handles the complete transaction lifecycle from submission to confirmation.
 * 
 * This hook implements:
 * - Loading indicator display during transaction processing
 * - Success modal display on transaction confirmation
 * - Automatic state transitions based on transaction status
 * - Manual control for closing modals and resetting state
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.5
 * 
 * @returns {UseTransactionFeedbackReturn} Feedback state and control functions
 * 
 * @example
 * ```tsx
 * function TransactionComponent() {
 *   const { deposit } = useZolTransactions();
 *   const { feedbackState, startTransaction, updateStatus, closeSuccess } = useTransactionFeedback();
 *   
 *   const handleDeposit = async () => {
 *     startTransaction('Deposit');
 *     try {
 *       updateStatus('processing');
 *       const signature = await deposit(1000000);
 *       updateStatus('confirmed', signature);
 *     } catch (error) {
 *       updateStatus('error');
 *     }
 *   };
 *   
 *   return (
 *     <>
 *       <button onClick={handleDeposit}>Deposit</button>
 *       {feedbackState.showLoading && (
 *         <TransactionLoading status={feedbackState.status} signature={feedbackState.signature} />
 *       )}
 *       <TransactionSuccessModal
 *         isOpen={feedbackState.showSuccess}
 *         onClose={closeSuccess}
 *         signature={feedbackState.signature || ''}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useTransactionFeedback(): UseTransactionFeedbackReturn {
  const [feedbackState, setFeedbackState] = useState<TransactionFeedbackState>({
    showLoading: false,
    showSuccess: false,
    signature: null,
    status: 'idle',
    operationName: 'Transaction',
  });

  /**
   * Start tracking a transaction
   * 
   * @param operationName - Name of the operation being performed
   */
  const startTransaction = useCallback((operationName: string) => {
    setFeedbackState({
      showLoading: false,
      showSuccess: false,
      signature: null,
      status: 'idle',
      operationName,
    });
  }, []);

  /**
   * Update transaction status
   * 
   * @param status - New transaction status
   * @param signature - Transaction signature (optional)
   */
  const updateStatus = useCallback((status: TransactionStatus, signature?: string) => {
    setFeedbackState(prev => {
      const newState = {
        ...prev,
        status,
        signature: signature || prev.signature,
      };

      // Show loading for processing status
      if (status === 'processing') {
        newState.showLoading = true;
        newState.showSuccess = false;
      }
      // Show success modal for confirmed/finalized status
      else if (status === 'confirmed' || status === 'finalized') {
        newState.showLoading = false;
        newState.showSuccess = true;
      }
      // Hide everything for error or idle
      else if (status === 'error' || status === 'idle') {
        newState.showLoading = false;
        newState.showSuccess = false;
      }

      return newState;
    });
  }, []);

  /**
   * Close the success modal
   */
  const closeSuccess = useCallback(() => {
    setFeedbackState(prev => ({
      ...prev,
      showSuccess: false,
      status: 'idle',
    }));
  }, []);

  /**
   * Reset all feedback state
   */
  const reset = useCallback(() => {
    setFeedbackState({
      showLoading: false,
      showSuccess: false,
      signature: null,
      status: 'idle',
      operationName: 'Transaction',
    });
  }, []);

  return {
    feedbackState,
    startTransaction,
    updateStatus,
    closeSuccess,
    reset,
  };
}
