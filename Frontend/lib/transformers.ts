/**
 * Data Transformation Utilities
 * Converts blockchain data to display-friendly formats
 */

import { GAME_CONSTANTS } from './config';
import type { GameState, FactionState, UserPosition } from './idl/types';

/**
 * Conversion Functions
 */

/**
 * Converts USDC lamports (6 decimals) to USDC number
 * @param lamports - Amount in lamports (bigint)
 * @returns Amount in USDC (number)
 */
export function lamportsToUsdc(lamports: bigint): number {
  return Number(lamports) / Math.pow(10, GAME_CONSTANTS.USDC_DECIMALS);
}

/**
 * Converts USDC number to lamports (6 decimals)
 * @param usdc - Amount in USDC (number)
 * @returns Amount in lamports (bigint)
 */
export function usdcToLamports(usdc: number): bigint {
  return BigInt(Math.floor(usdc * Math.pow(10, GAME_CONSTANTS.USDC_DECIMALS)));
}

/**
 * Formats epoch end timestamp to human-readable time remaining
 * @param epochEndTs - Epoch end timestamp in seconds (bigint)
 * @returns Formatted time remaining string (e.g., "2d 14h 32m")
 */
export function formatTimeRemaining(epochEndTs: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const endTime = Number(epochEndTs);
  const secondsRemaining = endTime - now;

  if (secondsRemaining <= 0) {
    return '0m';
  }

  const days = Math.floor(secondsRemaining / 86400);
  const hours = Math.floor((secondsRemaining % 86400) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(' ');
}

/**
 * Calculates TVL percentage for a faction
 * @param factionTvl - Faction TVL in lamports (bigint)
 * @param totalTvl - Total TVL in lamports (bigint)
 * @returns Percentage (0-100)
 */
export function calculateTvlPercentage(factionTvl: bigint, totalTvl: bigint): number {
  if (totalTvl === 0n) {
    return 0;
  }
  return (Number(factionTvl) / Number(totalTvl)) * 100;
}

/**
 * Display Models
 */

export interface FactionDisplay {
  id: string; // "vanguard" | "mage" | "assassin"
  name: string;
  color: string;
  tvl: number; // in USDC (converted from lamports)
  tvlPercentage: number; // calculated from total TVL
  players: number; // derived from on-chain data or indexer
  apy: number; // calculated based on yield distribution
  image: string;
  score: number; // from blockchain
}

export interface PortfolioDisplay {
  totalDeposited: number; // sum of all user deposits
  totalYieldEarned: number; // calculated from history
  activeBattles: number; // number of active positions
  winRate: number; // calculated from battle history
  currentFaction: string;
  automationPreference: 'wallet' | 'compound' | 'item';
  inventory: {
    swordCount: number;
    shieldCount: number;
    spyglassCount: number;
  };
}

export interface EpochDisplay {
  number: number;
  timeRemaining: string; // formatted as "2d 14h 32m"
  endDate: string; // formatted date
  status: 'active' | 'settlement' | 'paused';
  totalTVL: number;
}

/**
 * Data Transformer Functions
 */

/**
 * Maps faction ID to display name
 * @param factionId - Faction ID (0-2)
 * @returns Faction name
 */
export function getFactionName(factionId: number): string {
  if (factionId < 0 || factionId >= GAME_CONSTANTS.FACTION_NAMES.length) {
    return 'Unknown';
  }
  return GAME_CONSTANTS.FACTION_NAMES[factionId];
}

/**
 * Maps faction ID to display ID string
 * @param factionId - Faction ID (0-2)
 * @returns Faction display ID
 */
export function getFactionDisplayId(factionId: number): string {
  const names = ['vanguard', 'mage', 'assassin'];
  if (factionId < 0 || factionId >= names.length) {
    return 'unknown';
  }
  return names[factionId];
}

/**
 * Maps faction ID to color
 * @param factionId - Faction ID (0-2)
 * @returns Color string
 */
export function getFactionColor(factionId: number): string {
  const colors = ['#8B5CF6', '#06B6D4', '#F59E0B']; // purple, cyan, yellow
  if (factionId < 0 || factionId >= colors.length) {
    return '#6B7280'; // gray
  }
  return colors[factionId];
}

/**
 * Maps faction ID to image path
 * @param factionId - Faction ID (0-2)
 * @returns Image path
 */
export function getFactionImage(factionId: number): string {
  const images = [
    '/anime-knight-warrior-purple-armor.jpg',
    '/anime-mage-sorceress-cyan-theme.jpg',
    '/anime-assassin-ninja-yellow-theme.jpg',
  ];
  if (factionId < 0 || factionId >= images.length) {
    return '/placeholder.jpg';
  }
  return images[factionId];
}

/**
 * Parses game status enum to string
 * @param status - Game status enum
 * @returns Status string
 */
export function parseGameStatus(status: GameState['status']): 'active' | 'settlement' | 'paused' {
  if ('active' in status) return 'active';
  if ('settlement' in status) return 'settlement';
  if ('paused' in status) return 'paused';
  return 'active'; // default
}

/**
 * Transforms blockchain GameState to EpochDisplay model
 * @param gameState - GameState from blockchain
 * @returns EpochDisplay model
 */
export function transformGameState(gameState: GameState): EpochDisplay {
  return {
    number: Number(gameState.epochNumber),
    timeRemaining: formatTimeRemaining(gameState.epochEndTs),
    endDate: new Date(Number(gameState.epochEndTs) * 1000).toLocaleString(),
    status: parseGameStatus(gameState.status),
    totalTVL: lamportsToUsdc(gameState.totalTvl),
  };
}

/**
 * Transforms blockchain FactionState to FactionDisplay model
 * @param factionState - FactionState from blockchain
 * @param totalTvl - Total TVL for percentage calculation
 * @param players - Number of players (from indexer or default)
 * @param apy - APY percentage (calculated or default)
 * @returns FactionDisplay model
 */
export function transformFactionState(
  factionState: FactionState,
  totalTvl: bigint,
  players: number = 0,
  apy: number = 0
): FactionDisplay {
  return {
    id: getFactionDisplayId(factionState.id),
    name: factionState.name,
    color: getFactionColor(factionState.id),
    tvl: lamportsToUsdc(factionState.tvl),
    tvlPercentage: calculateTvlPercentage(factionState.tvl, totalTvl),
    players,
    apy,
    image: getFactionImage(factionState.id),
    score: Number(factionState.score),
  };
}

/**
 * Transforms blockchain UserPosition to PortfolioDisplay model
 * @param userPosition - UserPosition from blockchain
 * @param gameState - GameState for additional context
 * @returns PortfolioDisplay model
 */
export function transformUserPosition(
  userPosition: UserPosition,
  gameState?: GameState
): PortfolioDisplay {
  // Determine automation preference from settings
  let automationPreference: 'wallet' | 'compound' | 'item' = 'wallet';
  const fallback = userPosition.automationSettings.fallbackAction;
  
  if ('autoCompound' in fallback) {
    automationPreference = 'compound';
  } else if ('sendToWallet' in fallback) {
    automationPreference = 'wallet';
  }
  
  // Check if user has item purchase rules
  const slot1 = userPosition.automationSettings.prioritySlot1;
  const slot2 = userPosition.automationSettings.prioritySlot2;
  if (slot1.itemId > 0 || slot2.itemId > 0) {
    automationPreference = 'item';
  }

  return {
    totalDeposited: lamportsToUsdc(userPosition.depositedAmount),
    totalYieldEarned: 0, // TODO: Calculate from history when available
    activeBattles: userPosition.depositedAmount > 0n ? 1 : 0,
    winRate: 0, // TODO: Calculate from battle history when available
    currentFaction: getFactionName(userPosition.factionId),
    automationPreference,
    inventory: {
      swordCount: Number(userPosition.inventory.swordCount),
      shieldCount: Number(userPosition.inventory.shieldCount),
      spyglassCount: Number(userPosition.inventory.spyglassCount),
    },
  };
}
