import { PublicKey } from '@solana/web3.js';

/**
 * Solana and ZOL Contract Configuration
 * Centralized configuration for blockchain interactions
 */

export const SOLANA_CONFIG = {
  // Cluster configuration
  cluster: (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet') as 'devnet' | 'mainnet-beta' | 'testnet',
  
  // RPC endpoints
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  rpcFallbacks: [
    process.env.NEXT_PUBLIC_SOLANA_RPC_FALLBACK_1,
    process.env.NEXT_PUBLIC_SOLANA_RPC_FALLBACK_2,
  ].filter(Boolean) as string[],
  
  // Program IDs
  programId: new PublicKey(
    process.env.NEXT_PUBLIC_ZOL_PROGRAM_ID || 'Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv'
  ),
  
  // Token configuration (USDC mint that matches the vault)
  usdcMint: new PublicKey(
    process.env.NEXT_PUBLIC_USDC_MINT || 'Ej7gfSCq8F8jZy2ifZJVHXVr7HLeFrtzaBKVWADDYBu9'
  ),
} as const;

/**
 * Game Constants
 */
export const GAME_CONSTANTS = {
  // USDC token decimals
  USDC_DECIMALS: 6,
  
  // Epoch duration (3 days in seconds)
  EPOCH_DURATION: 259200,
  
  // Faction configuration
  FACTION_NAMES: ['Vanguard', 'Mage', 'Assassin'] as const,
  FACTION_IDS: [0, 1, 2] as const,
  
  // Item prices in USDC lamports (6 decimals)
  ITEM_PRICES: {
    SWORD: 10_000_000, // 10 USDC
    SHIELD: 2_000_000, // 2 USDC
    SPYGLASS: 5_000_000, // 5 USDC
  },
  
  // Polling intervals
  POLL_INTERVAL: 10000, // Poll blockchain every 10 seconds
  USER_POSITION_POLL_INTERVAL: 5000, // Poll user position every 5 seconds
  
  // Cache TTLs (in milliseconds)
  CACHE_TTL: {
    GAME_STATE: 10000, // 10 seconds
    USER_POSITION: 5000, // 5 seconds
    TOKEN_ACCOUNTS: 30000, // 30 seconds
  },
} as const;

/**
 * PDA Seeds
 */
export const PDA_SEEDS = {
  GAME_STATE: 'game_state',
  USER: 'user',
  VAULT: 'vault',
} as const;

/**
 * Transaction Configuration
 */
export const TRANSACTION_CONFIG = {
  // Confirmation commitment level
  commitment: 'confirmed' as const,
  
  // Preflight commitment
  preflightCommitment: 'confirmed' as const,
  
  // Skip preflight checks
  skipPreflight: false,
  
  // Max retries for transaction confirmation
  maxRetries: 3,
  
  // Timeout for transaction confirmation (30 seconds)
  confirmationTimeout: 30000,
} as const;

/**
 * Validation helpers
 */
export const VALIDATION = {
  // Validate faction ID
  isValidFactionId: (id: number): boolean => {
    return GAME_CONSTANTS.FACTION_IDS.includes(id as 0 | 1 | 2);
  },
  
  // Validate USDC amount (must be positive)
  isValidAmount: (amount: number): boolean => {
    return amount > 0 && Number.isFinite(amount);
  },
  
  // Validate automation preference
  isValidAutomationPreference: (pref: string): pref is 'wallet' | 'compound' | 'item' => {
    return ['wallet', 'compound', 'item'].includes(pref);
  },
} as const;

/**
 * Type exports for configuration
 */
export type FactionId = typeof GAME_CONSTANTS.FACTION_IDS[number];
export type FactionName = typeof GAME_CONSTANTS.FACTION_NAMES[number];
export type AutomationPreference = 'wallet' | 'compound' | 'item';
export type Cluster = typeof SOLANA_CONFIG.cluster;
