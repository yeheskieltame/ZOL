'use client';

import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { ZOL_CONTRACT_IDL } from '@/lib/idl';
import { SOLANA_CONFIG } from '@/lib/config';
import { getRPCConnection } from '@/lib/rpc-manager';
import type { ZolContract } from '@/lib/idl/types';

/**
 * Return type for useZolProgram hook
 */
export interface UseZolProgramReturn {
  /** The Anchor Program instance for interacting with the ZOL contract */
  program: Program<ZolContract> | null;
  /** The program ID of the ZOL contract */
  programId: PublicKey;
  /** The Solana connection instance */
  connection: ReturnType<typeof useConnection>['connection'];
  /** Whether the program is ready to use (wallet connected and program initialized) */
  isReady: boolean;
}

/**
 * useZolProgram Hook
 * 
 * Creates and manages the Anchor provider and program instance for interacting
 * with the ZOL smart contract. This hook:
 * - Sets up the connection to the Solana RPC endpoint
 * - Creates an AnchorProvider with the wallet adapter
 * - Initializes the Program instance with the IDL
 * - Provides a ready state indicating when the program can be used
 * 
 * The program instance is only available when a wallet is connected.
 * 
 * @returns {UseZolProgramReturn} Object containing program, programId, connection, and isReady state
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { program, isReady, programId } = useZolProgram();
 *   
 *   if (!isReady) {
 *     return <div>Please connect your wallet</div>;
 *   }
 *   
 *   // Use program to interact with smart contract
 *   const gameState = await program.account.gameState.fetch(gameStatePDA);
 * }
 * ```
 */
export function useZolProgram(): UseZolProgramReturn {
  // Note: useConnection() is available but we use getRPCConnection() for better fallback support
  useConnection(); // Keep hook call for React rules compliance
  const wallet = useWallet();
  
  // Use RPC manager connection for better performance and fallback
  const connection = useMemo(() => getRPCConnection(), []);
  
  // Program ID from configuration
  const programId = useMemo(() => SOLANA_CONFIG.programId, []);
  
  // Create Anchor provider and program instance
  const program = useMemo(() => {
    // Program requires a connected wallet with signTransaction capability
    if (!wallet.publicKey || !wallet.signTransaction) {
      return null;
    }
    
    try {
      // Create AnchorProvider with wallet adapter
      // The provider combines the connection, wallet, and configuration
      // Use the RPC manager connection for better performance
      const provider = new AnchorProvider(
        connection,
        wallet as any, // Wallet adapter is compatible with Anchor's Wallet interface
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
        }
      );
      
      // Initialize Program instance with IDL, programId, and provider
      // This creates a type-safe interface to the smart contract
      // Anchor 0.29 signature: new Program(idl, programId, provider)
      // Using type assertion because TS types don't match runtime signature
      const ProgramConstructor = Program as any;
      const programInstance = new ProgramConstructor(
        ZOL_CONTRACT_IDL,
        programId,
        provider
      ) as Program<ZolContract>;
      
      return programInstance;
    } catch (error) {
      console.error('Failed to initialize Anchor program:', error);
      return null;
    }
  }, [connection, wallet, wallet.publicKey, wallet.signTransaction, programId]);
  
  // Program is ready when it's successfully initialized
  const isReady = useMemo(() => {
    return program !== null && wallet.connected;
  }, [program, wallet.connected]);
  
  return {
    program,
    programId,
    connection,
    isReady,
  };
}
