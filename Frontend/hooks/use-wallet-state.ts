'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletError } from '@solana/wallet-adapter-base';
import { logger } from '@/lib/logger';
import { errorTracker } from '@/lib/error-tracker';

/**
 * Wallet state interface
 */
export interface WalletState {
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  address: string | null;
  error: WalletError | Error | null;
  hasError: boolean;
}

/**
 * useWalletState Hook
 * 
 * Manages wallet connection state with proper error handling.
 * Handles connection success, failure, and disconnection scenarios.
 * 
 * Validates Requirements 1.3, 1.4, 1.5:
 * - Handles connection success state
 * - Handles connection failure with error display
 * - Handles disconnection and state cleanup
 * 
 * @returns Wallet state and error management functions
 */
export function useWalletState() {
  const wallet = useWallet();
  const [error, setError] = useState<WalletError | Error | null>(null);

  // Build wallet state object
  const walletState: WalletState = {
    connected: wallet.connected,
    connecting: wallet.connecting,
    disconnecting: wallet.disconnecting,
    address: wallet.publicKey?.toBase58() || null,
    error,
    hasError: error !== null,
  };

  // Handle wallet errors
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      // Clear error on successful connection
      setError(null);
      // Log successful connection
      logger.walletConnected(wallet.publicKey.toBase58());
    }
  }, [wallet.connected, wallet.publicKey]);

  // Listen for wallet adapter errors
  useEffect(() => {
    const handleError = (error: WalletError) => {
      console.error('Wallet error:', error);
      setError(error);
      errorTracker.trackError('wallet_connection', error.message);
    };

    // The wallet adapter emits errors through the wallet object
    // We'll catch them in the connect/disconnect handlers
  }, []);

  // Handle disconnection - clear all state
  useEffect(() => {
    if (!wallet.connected && !wallet.connecting && !wallet.disconnecting) {
      // Wallet is fully disconnected, clear error state
      setError(null);
      // Log disconnection
      logger.walletDisconnected();
    }
  }, [wallet.connected, wallet.connecting, wallet.disconnecting]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Connect wallet with error handling
   */
  const connectWallet = useCallback(async () => {
    try {
      setError(null);
      await wallet.connect();
    } catch (err) {
      const walletError = err as WalletError | Error;
      console.error('Failed to connect wallet:', walletError);
      logger.walletConnectionFailed(walletError);
      errorTracker.trackError('wallet_connection', walletError.message);
      setError(walletError);
      throw walletError;
    }
  }, [wallet]);

  /**
   * Disconnect wallet with error handling and state cleanup
   */
  const disconnectWallet = useCallback(async () => {
    try {
      setError(null);
      await wallet.disconnect();
      // State cleanup happens automatically via useEffect
    } catch (err) {
      const walletError = err as WalletError | Error;
      console.error('Failed to disconnect wallet:', walletError);
      errorTracker.trackError('wallet_connection', walletError.message);
      setError(walletError);
      throw walletError;
    }
  }, [wallet]);

  return {
    ...walletState,
    clearError,
    connectWallet,
    disconnectWallet,
  };
}

/**
 * Format wallet error for display
 */
export function formatWalletError(error: WalletError | Error | null): string {
  if (!error) return '';

  // Handle wallet adapter specific errors
  if ('error' in error && error.error) {
    return error.error.message || 'Wallet connection failed';
  }

  // Handle standard errors
  if (error.message) {
    // User rejected connection
    if (error.message.includes('User rejected')) {
      return 'Connection request was rejected';
    }
    
    // Wallet not found
    if (error.message.includes('not found') || error.message.includes('not installed')) {
      return 'Wallet not found. Please install a Solana wallet.';
    }
    
    // Network errors
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return 'Network error. Please check your connection and try again.';
    }

    return error.message;
  }

  return 'An unknown error occurred';
}
