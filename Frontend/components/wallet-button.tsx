'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { SOLANA_CONFIG } from '@/lib/config';
import { formatWalletError } from '@/hooks/use-wallet-state';
import { toast } from 'sonner';

/**
 * WalletButton Component
 * 
 * Displays wallet connection status and provides connect/disconnect functionality.
 * Shows wallet address and SOL balance when connected.
 * Opens wallet selection modal when not connected.
 * 
 * Validates Requirements 1.1, 1.3:
 * - Displays wallet connection options
 * - Shows wallet address and SOL balance when connected
 */
export function WalletButton() {
  const { publicKey, connected, disconnect, wallet, connect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [hasShownConnectToast, setHasShownConnectToast] = useState(false);

  // Fetch SOL balance when wallet is connected
  useEffect(() => {
    if (!publicKey || !connected) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      setIsLoadingBalance(true);
      try {
        const connection = new Connection(SOLANA_CONFIG.rpcUrl, 'confirmed');
        const balanceLamports = await connection.getBalance(publicKey);
        setBalance(balanceLamports / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance(null);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();

    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [publicKey, connected]);

  // Auto-connect when wallet is selected from modal
  useEffect(() => {
    // If a wallet is selected but not connected, and we're not already connecting
    if (wallet && !connected && !connecting) {
      console.log('Wallet selected, attempting to connect:', wallet.adapter.name);
      connect().catch((error) => {
        console.error('Failed to connect wallet:', error);
        // Only show error if it's not a user rejection
        if (!error.message?.includes('User rejected')) {
          const errorMessage = formatWalletError(error as Error);
          toast.error(errorMessage);
        }
      });
    }
  }, [wallet, connected, connecting, connect]);

  // Show success toast when wallet connects (only once)
  useEffect(() => {
    if (connected && publicKey && !hasShownConnectToast) {
      toast.success('Wallet connected successfully');
      setHasShownConnectToast(true);
    }
    
    // Reset flag when disconnected
    if (!connected) {
      setHasShownConnectToast(false);
    }
  }, [connected, publicKey, hasShownConnectToast]);

  // Format wallet address for display
  const formatAddress = (address: string): string => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Handle connect button click - just open the modal
  const handleConnect = () => {
    setVisible(true);
  };

  // Handle disconnect button click
  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      const errorMessage = formatWalletError(error as Error);
      toast.error(errorMessage);
    }
  };

  if (!connected || !publicKey) {
    return (
      <Button
        onClick={handleConnect}
        variant="default"
        className="bg-cyan-600 hover:bg-cyan-700 text-white"
      >
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-end text-sm">
        <span className="text-gray-300 font-mono">
          {formatAddress(publicKey.toBase58())}
        </span>
        {isLoadingBalance ? (
          <span className="text-gray-500 text-xs">Loading...</span>
        ) : balance !== null ? (
          <span className="text-cyan-400 text-xs">
            {balance.toFixed(4)} SOL
          </span>
        ) : null}
      </div>
      <Button
        onClick={handleDisconnect}
        variant="outline"
        size="sm"
        className="border-gray-700 hover:bg-gray-800"
      >
        Disconnect
      </Button>
    </div>
  );
}
