/**
 * Type definitions for Solana and Anchor integration
 */

import { PublicKey, Transaction, Connection } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

declare global {
  namespace Solana {
    /**
     * Wallet adapter types
     */
    interface WalletAdapter {
      publicKey: PublicKey | null;
      connected: boolean;
      connecting: boolean;
      disconnecting: boolean;
      connect(): Promise<void>;
      disconnect(): Promise<void>;
      signTransaction(transaction: Transaction): Promise<Transaction>;
      signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
    }

    /**
     * Game state types from smart contract
     */
    interface GameState {
      admin: PublicKey;
      epochNumber: BN;
      epochStartTs: BN;
      epochEndTs: BN;
      totalTvl: BN;
      factions: FactionState[];
      status: GameStatus;
    }

    interface FactionState {
      id: number;
      name: string;
      tvl: BN;
      score: BN;
    }

    interface UserPosition {
      owner: PublicKey;
      factionId: number;
      depositedAmount: BN;
      lastDepositEpoch: BN;
      automationSettings: AutomationSettings;
      inventory: UserInventory;
    }

    interface AutomationSettings {
      prioritySlot1: AutomationRule;
      prioritySlot2: AutomationRule;
      fallbackAction: FallbackAction;
    }

    interface AutomationRule {
      itemId: number;
      threshold: BN;
    }

    interface UserInventory {
      swordCount: BN;
      shieldCount: BN;
      spyglassCount: BN;
    }

    /**
     * Enums
     */
    type GameStatus = 'Active' | 'Settlement' | 'Paused';
    type FallbackAction = 'AutoCompound' | 'SendToWallet';

    /**
     * Transaction result types
     */
    interface TransactionResult {
      signature: string;
      confirmed: boolean;
      error?: Error;
    }

    /**
     * Error types
     */
    interface BlockchainError extends Error {
      code?: number;
      logs?: string[];
      transactionSignature?: string;
    }
  }
}

export {};
