'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { useZolProgram } from './use-zol-program';
import {
  buildRegisterUserTx,
  buildDepositTx,
  buildWithdrawTx,
  buildUpdateAutomationTx,
} from '@/lib/transaction-builders';
import { invalidateTransactionCache } from '@/lib/cache';
import { getCachedBlockhash, executeRPCWithFallback } from '@/lib/rpc-manager';
import type { AutomationRule, FallbackAction } from '@/lib/idl/types';
import { logger } from '@/lib/logger';
import { errorTracker } from '@/lib/error-tracker';

/**
 * Transaction confirmation timeout (30 seconds)
 * After this time, a delay warning should be shown to the user
 */
export const TRANSACTION_DELAY_THRESHOLD = 10000; // 10 seconds

/**
 * Transaction confirmation status
 */
export type TransactionStatus = 'idle' | 'processing' | 'confirmed' | 'finalized' | 'error';

/**
 * Transaction state for tracking individual transactions
 */
export interface TransactionState {
  signature: string | null;
  status: TransactionStatus;
  error: Error | null;
}

/**
 * Return type for useZolTransactions hook
 */
export interface UseZolTransactionsReturn {
  /** Register user with a faction */
  registerUser: (factionId: number) => Promise<string>;
  /** Deposit USDC into user's faction */
  deposit: (amount: number) => Promise<string>;
  /** Withdraw USDC from user's position */
  withdraw: (amount: number) => Promise<string>;
  /** Update automation settings */
  updateAutomation: (
    slot1: AutomationRule,
    slot2: AutomationRule,
    fallback: FallbackAction
  ) => Promise<string>;
  /** Whether any transaction is currently processing */
  isProcessing: boolean;
  /** Current transaction state */
  transactionState: TransactionState;
  /** Clear transaction state */
  clearTransactionState: () => void;
  /** Most recent error */
  error: Error | null;
}

/**
 * useZolTransactions Hook
 * 
 * Provides functions for executing transactions on the ZOL smart contract.
 * Handles transaction signing, submission, and confirmation polling.
 * Tracks transaction state including signatures, confirmation status, and errors.
 * 
 * This hook implements:
 * - Transaction building using the transaction-builders module
 * - Transaction signing with the connected wallet
 * - Transaction submission to the blockchain
 * - Confirmation polling with status updates
 * - Error handling for all transaction types
 * 
 * Requirements: 4.2, 5.2, 6.2, 8.2, 11.1, 11.2, 11.3
 * 
 * @returns {UseZolTransactionsReturn} Transaction functions and state
 * 
 * @example
 * ```tsx
 * function DepositComponent() {
 *   const { deposit, isProcessing, transactionState } = useZolTransactions();
 *   
 *   const handleDeposit = async () => {
 *     try {
 *       const signature = await deposit(1000000); // 1 USDC
 *       console.log('Transaction confirmed:', signature);
 *     } catch (error) {
 *       console.error('Deposit failed:', error);
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={handleDeposit} disabled={isProcessing}>
 *         {isProcessing ? 'Processing...' : 'Deposit'}
 *       </button>
 *       {transactionState.status === 'confirmed' && (
 *         <p>Transaction confirmed: {transactionState.signature}</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useZolTransactions(): UseZolTransactionsReturn {
  const { program, connection, isReady } = useZolProgram();
  const wallet = useWallet();
  
  // Transaction state management
  const [transactionState, setTransactionState] = useState<TransactionState>({
    signature: null,
    status: 'idle',
    error: null,
  });
  
  const [error, setError] = useState<Error | null>(null);
  
  // Derived state
  const isProcessing = transactionState.status === 'processing';
  
  /**
   * Clear transaction state
   */
  const clearTransactionState = useCallback(() => {
    setTransactionState({
      signature: null,
      status: 'idle',
      error: null,
    });
    setError(null);
  }, []);
  
  /**
   * Execute a transaction with signing and confirmation
   * 
   * @param buildTx - Function that builds the transaction
   * @param operationName - Name of the operation for error messages
   * @returns Promise resolving to the transaction signature
   */
  const executeTransaction = useCallback(
    async (
      buildTx: () => Promise<Transaction>,
      operationName: string
    ): Promise<string> => {
      // Track transaction attempt
      errorTracker.trackTransactionAttempt();
      
      // Validate prerequisites
      if (!isReady || !program || !wallet.publicKey || !wallet.signTransaction) {
        const error = new Error('Wallet not connected or program not ready');
        setError(error);
        setTransactionState({
          signature: null,
          status: 'error',
          error,
        });
        errorTracker.trackTransactionFailure('Wallet not connected', { operation: operationName });
        throw error;
      }
      
      try {
        // Set processing state
        setTransactionState({
          signature: null,
          status: 'processing',
          error: null,
        });
        setError(null);
        
        // Build the transaction
        const transaction = await buildTx();
        
        // Get recent blockhash (cached for performance)
        const { blockhash, lastValidBlockHeight } = await getCachedBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;
        
        // Log signature request
        logger.walletSignatureRequested(operationName);
        
        // Sign the transaction with the wallet
        const signedTransaction = await wallet.signTransaction(transaction);
        
        // Send the signed transaction with RPC fallback
        const signature = await executeRPCWithFallback((conn) =>
          conn.sendRawTransaction(
            signedTransaction.serialize(),
            {
              skipPreflight: false,
              preflightCommitment: 'confirmed',
            }
          )
        );
        
        // Log transaction submission
        logger.transactionSubmitted(signature, operationName);
        
        // Update state with signature
        setTransactionState({
          signature,
          status: 'processing',
          error: null,
        });
        
        // Confirm the transaction with RPC fallback
        const confirmation = await executeRPCWithFallback((conn) =>
          conn.confirmTransaction(
            {
              signature,
              blockhash,
              lastValidBlockHeight,
            },
            'confirmed'
          )
        );
        
        if (confirmation.value.err) {
          const errorMsg = `Transaction failed: ${JSON.stringify(confirmation.value.err)}`;
          logger.transactionFailed(signature, operationName, new Error(errorMsg));
          errorTracker.trackTransactionFailure('Transaction confirmation error', { 
            operation: operationName,
            signature,
            error: confirmation.value.err 
          });
          throw new Error(errorMsg);
        }
        
        // Log transaction confirmation
        logger.transactionConfirmed(signature, operationName);
        
        // Update state to confirmed
        setTransactionState({
          signature,
          status: 'confirmed',
          error: null,
        });
        
        // Invalidate cache after successful transaction
        // This ensures fresh data is fetched on next request
        invalidateTransactionCache();
        
        // Poll for finalized status (optional, don't wait for it)
        executeRPCWithFallback((conn) =>
          conn.confirmTransaction(
            {
              signature,
              blockhash,
              lastValidBlockHeight,
            },
            'finalized'
          )
        ).then(() => {
          logger.transactionFinalized(signature, operationName);
          setTransactionState(prev => ({
            ...prev,
            status: 'finalized',
          }));
        }).catch(err => {
          console.warn('Failed to confirm finalized status:', err);
        });
        
        return signature;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(`${operationName} failed: ${err}`);
        console.error(`${operationName} error:`, error);
        
        // Log transaction failure
        logger.transactionFailed(undefined, operationName, error);
        
        // Check if user rejected the transaction
        if (error.message.includes('User rejected') || error.message.includes('rejected')) {
          logger.walletSignatureRejected(operationName);
          errorTracker.trackError('wallet_signature', 'User rejected transaction', { operation: operationName });
        } else {
          errorTracker.trackTransactionFailure(error.message, { operation: operationName });
        }
        
        setError(error);
        setTransactionState({
          signature: null,
          status: 'error',
          error,
        });
        
        throw error;
      }
    },
    [isReady, program, wallet, connection]
  );
  
  /**
   * Register user with a faction
   * 
   * Creates and submits a transaction to register the user with the specified faction.
   * Validates the faction ID and creates the user position account.
   * 
   * @param factionId - The faction ID to join (0-2)
   * @returns Promise resolving to the transaction signature
   * @throws {Error} If wallet not connected, validation fails, or transaction fails
   * 
   * **Validates: Requirements 4.2**
   */
  const registerUser = useCallback(
    async (factionId: number): Promise<string> => {
      if (!program || !wallet.publicKey) {
        throw new Error('Wallet not connected or program not ready');
      }
      
      return executeTransaction(
        () => buildRegisterUserTx(program, wallet.publicKey!, factionId),
        'Register user'
      );
    },
    [program, wallet.publicKey, executeTransaction]
  );
  
  /**
   * Deposit USDC into user's faction
   * 
   * Creates and submits a transaction to deposit USDC. Validates the amount
   * and checks the user's USDC balance before submitting.
   * 
   * @param amount - The amount to deposit in USDC lamports (6 decimals)
   * @returns Promise resolving to the transaction signature
   * @throws {Error} If wallet not connected, validation fails, or transaction fails
   * 
   * **Validates: Requirements 5.2**
   */
  const deposit = useCallback(
    async (amount: number): Promise<string> => {
      if (!program || !wallet.publicKey) {
        throw new Error('Wallet not connected or program not ready');
      }
      
      return executeTransaction(
        () => buildDepositTx(program, connection, wallet.publicKey!, amount),
        'Deposit'
      );
    },
    [program, wallet.publicKey, connection, executeTransaction]
  );
  
  /**
   * Withdraw USDC from user's position
   * 
   * Creates and submits a transaction to withdraw USDC. Validates the amount
   * doesn't exceed the deposited amount by fetching current position data.
   * 
   * @param amount - The amount to withdraw in USDC lamports (6 decimals)
   * @returns Promise resolving to the transaction signature
   * @throws {Error} If wallet not connected, validation fails, or transaction fails
   * 
   * **Validates: Requirements 6.2**
   */
  const withdraw = useCallback(
    async (amount: number): Promise<string> => {
      if (!program || !wallet.publicKey) {
        throw new Error('Wallet not connected or program not ready');
      }
      
      return executeTransaction(
        () => buildWithdrawTx(program, connection, wallet.publicKey!, amount),
        'Withdraw'
      );
    },
    [program, wallet.publicKey, connection, executeTransaction]
  );
  
  /**
   * Update automation settings
   * 
   * Creates and submits a transaction to update the user's x402 automation settings.
   * Validates the automation rules and fallback action.
   * 
   * @param slot1 - First priority automation rule
   * @param slot2 - Second priority automation rule
   * @param fallback - Fallback action when rules don't apply
   * @returns Promise resolving to the transaction signature
   * @throws {Error} If wallet not connected, validation fails, or transaction fails
   * 
   * **Validates: Requirements 8.2**
   */
  const updateAutomation = useCallback(
    async (
      slot1: AutomationRule,
      slot2: AutomationRule,
      fallback: FallbackAction
    ): Promise<string> => {
      if (!program || !wallet.publicKey) {
        throw new Error('Wallet not connected or program not ready');
      }
      
      return executeTransaction(
        () => buildUpdateAutomationTx(program, wallet.publicKey!, slot1, slot2, fallback),
        'Update automation'
      );
    },
    [program, wallet.publicKey, executeTransaction]
  );
  
  return {
    registerUser,
    deposit,
    withdraw,
    updateAutomation,
    isProcessing,
    transactionState,
    clearTransactionState,
    error,
  };
}
