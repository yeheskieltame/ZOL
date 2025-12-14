'use client';

import React, { useMemo, useCallback } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletError } from '@solana/wallet-adapter-base';
import { SOLANA_CONFIG } from '@/lib/config';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletProviderProps {
  children: React.ReactNode;
}

/**
 * WalletProvider Component
 * 
 * Wraps the application with Solana wallet adapter providers.
 * Supports Phantom, Solflare, and other Solana wallets.
 * Configured for the cluster specified in SOLANA_CONFIG.
 * 
 * @param children - React children to wrap with wallet context
 */
export function WalletProvider({ children }: WalletProviderProps) {
  // Configure RPC endpoint from config
  const endpoint = useMemo(() => SOLANA_CONFIG.rpcUrl, []);

  // Initialize wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  // Handle wallet errors
  const onError = useCallback((error: WalletError) => {
    console.error('Wallet error:', error);
    
    // Ignore Phantom service worker errors - they're harmless
    if (error.message?.includes('service worker') || 
        error.message?.includes('disconnected port')) {
      return;
    }
    
    // Log other errors for debugging
    console.error('Wallet adapter error:', error.name, error.message);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={false}
        onError={onError}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
