/**
 * Tests for data transformation utilities
 */

import {
  lamportsToUsdc,
  usdcToLamports,
  formatTimeRemaining,
  calculateTvlPercentage,
  getFactionName,
  getFactionDisplayId,
  getFactionColor,
  getFactionImage,
  parseGameStatus,
  transformGameState,
  transformFactionState,
  transformUserPosition,
} from '../lib/transformers';
import type { GameState, FactionState, UserPosition } from '../lib/idl/types';

describe('Conversion Functions', () => {
  describe('lamportsToUsdc', () => {
    it('converts lamports to USDC correctly', () => {
      expect(lamportsToUsdc(1_000_000n)).toBe(1);
      expect(lamportsToUsdc(10_000_000n)).toBe(10);
      expect(lamportsToUsdc(500_000n)).toBe(0.5);
      expect(lamportsToUsdc(0n)).toBe(0);
    });
  });

  describe('usdcToLamports', () => {
    it('converts USDC to lamports correctly', () => {
      expect(usdcToLamports(1)).toBe(1_000_000n);
      expect(usdcToLamports(10)).toBe(10_000_000n);
      expect(usdcToLamports(0.5)).toBe(500_000n);
      expect(usdcToLamports(0)).toBe(0n);
    });

    it('handles decimal precision correctly', () => {
      expect(usdcToLamports(1.123456)).toBe(1_123_456n);
      expect(usdcToLamports(1.1234567)).toBe(1_123_456n); // Truncates beyond 6 decimals
    });
  });

  describe('formatTimeRemaining', () => {
    it('formats time remaining correctly', () => {
      const now = Math.floor(Date.now() / 1000);
      
      // 2 days, 14 hours, 32 minutes
      const future1 = BigInt(now + 2 * 86400 + 14 * 3600 + 32 * 60);
      expect(formatTimeRemaining(future1)).toBe('2d 14h 32m');
      
      // 5 hours, 30 minutes
      const future2 = BigInt(now + 5 * 3600 + 30 * 60);
      expect(formatTimeRemaining(future2)).toBe('5h 30m');
      
      // 45 minutes
      const future3 = BigInt(now + 45 * 60);
      expect(formatTimeRemaining(future3)).toBe('45m');
    });

    it('returns 0m for past timestamps', () => {
      const past = BigInt(Math.floor(Date.now() / 1000) - 1000);
      expect(formatTimeRemaining(past)).toBe('0m');
    });

    it('handles edge case of 0 minutes remaining', () => {
      const now = BigInt(Math.floor(Date.now() / 1000));
      expect(formatTimeRemaining(now)).toBe('0m');
    });
  });

  describe('calculateTvlPercentage', () => {
    it('calculates TVL percentage correctly', () => {
      expect(calculateTvlPercentage(50_000_000n, 100_000_000n)).toBe(50);
      expect(calculateTvlPercentage(25_000_000n, 100_000_000n)).toBe(25);
      expect(calculateTvlPercentage(100_000_000n, 100_000_000n)).toBe(100);
    });

    it('handles zero total TVL', () => {
      expect(calculateTvlPercentage(50_000_000n, 0n)).toBe(0);
    });

    it('handles zero faction TVL', () => {
      expect(calculateTvlPercentage(0n, 100_000_000n)).toBe(0);
    });
  });
});

describe('Faction Helper Functions', () => {
  describe('getFactionName', () => {
    it('returns correct faction names', () => {
      expect(getFactionName(0)).toBe('Vanguard');
      expect(getFactionName(1)).toBe('Mage');
      expect(getFactionName(2)).toBe('Assassin');
    });

    it('returns Unknown for invalid IDs', () => {
      expect(getFactionName(-1)).toBe('Unknown');
      expect(getFactionName(3)).toBe('Unknown');
      expect(getFactionName(999)).toBe('Unknown');
    });
  });

  describe('getFactionDisplayId', () => {
    it('returns correct display IDs', () => {
      expect(getFactionDisplayId(0)).toBe('vanguard');
      expect(getFactionDisplayId(1)).toBe('mage');
      expect(getFactionDisplayId(2)).toBe('assassin');
    });

    it('returns unknown for invalid IDs', () => {
      expect(getFactionDisplayId(-1)).toBe('unknown');
      expect(getFactionDisplayId(3)).toBe('unknown');
    });
  });

  describe('getFactionColor', () => {
    it('returns correct colors', () => {
      expect(getFactionColor(0)).toBe('#8B5CF6'); // purple
      expect(getFactionColor(1)).toBe('#06B6D4'); // cyan
      expect(getFactionColor(2)).toBe('#F59E0B'); // yellow
    });

    it('returns gray for invalid IDs', () => {
      expect(getFactionColor(-1)).toBe('#6B7280');
      expect(getFactionColor(3)).toBe('#6B7280');
    });
  });

  describe('getFactionImage', () => {
    it('returns correct image paths', () => {
      expect(getFactionImage(0)).toContain('knight');
      expect(getFactionImage(1)).toContain('mage');
      expect(getFactionImage(2)).toContain('assassin');
    });

    it('returns placeholder for invalid IDs', () => {
      expect(getFactionImage(-1)).toBe('/placeholder.jpg');
      expect(getFactionImage(3)).toBe('/placeholder.jpg');
    });
  });
});

describe('Game Status Parser', () => {
  it('parses active status', () => {
    expect(parseGameStatus({ active: {} })).toBe('active');
  });

  it('parses settlement status', () => {
    expect(parseGameStatus({ settlement: {} })).toBe('settlement');
  });

  it('parses paused status', () => {
    expect(parseGameStatus({ paused: {} })).toBe('paused');
  });
});

describe('Data Transformer Functions', () => {
  describe('transformGameState', () => {
    it('transforms game state correctly', () => {
      const now = Math.floor(Date.now() / 1000);
      const gameState: GameState = {
        admin: 'AdminPublicKey123',
        epochNumber: 5n,
        epochStartTs: BigInt(now - 86400),
        epochEndTs: BigInt(now + 86400),
        totalTvl: 1000_000_000n,
        factions: [],
        status: { active: {} },
      };

      const result = transformGameState(gameState);

      expect(result.number).toBe(5);
      expect(result.status).toBe('active');
      expect(result.totalTVL).toBe(1000);
      expect(result.timeRemaining).toContain('d');
      expect(result.endDate).toBeTruthy();
    });
  });

  describe('transformFactionState', () => {
    it('transforms faction state correctly', () => {
      const factionState: FactionState = {
        id: 0,
        name: 'Vanguard',
        tvl: 500_000_000n,
        score: 1000n,
      };

      const result = transformFactionState(factionState, 1000_000_000n, 100, 15.5);

      expect(result.id).toBe('vanguard');
      expect(result.name).toBe('Vanguard');
      expect(result.tvl).toBe(500);
      expect(result.tvlPercentage).toBe(50);
      expect(result.players).toBe(100);
      expect(result.apy).toBe(15.5);
      expect(result.score).toBe(1000);
      expect(result.color).toBe('#8B5CF6');
      expect(result.image).toContain('knight');
    });

    it('uses default values for optional parameters', () => {
      const factionState: FactionState = {
        id: 1,
        name: 'Mage',
        tvl: 250_000_000n,
        score: 500n,
      };

      const result = transformFactionState(factionState, 1000_000_000n);

      expect(result.players).toBe(0);
      expect(result.apy).toBe(0);
    });
  });

  describe('transformUserPosition', () => {
    it('transforms user position with wallet preference', () => {
      const userPosition: UserPosition = {
        owner: 'UserPublicKey123',
        factionId: 0,
        depositedAmount: 100_000_000n,
        lastDepositEpoch: 5n,
        automationSettings: {
          prioritySlot1: { itemId: 0, threshold: 0n },
          prioritySlot2: { itemId: 0, threshold: 0n },
          fallbackAction: { sendToWallet: {} },
        },
        inventory: {
          swordCount: 5n,
          shieldCount: 3n,
          spyglassCount: 2n,
        },
      };

      const result = transformUserPosition(userPosition);

      expect(result.totalDeposited).toBe(100);
      expect(result.currentFaction).toBe('Vanguard');
      expect(result.automationPreference).toBe('wallet');
      expect(result.inventory.swordCount).toBe(5);
      expect(result.inventory.shieldCount).toBe(3);
      expect(result.inventory.spyglassCount).toBe(2);
      expect(result.activeBattles).toBe(1);
    });

    it('transforms user position with compound preference', () => {
      const userPosition: UserPosition = {
        owner: 'UserPublicKey123',
        factionId: 1,
        depositedAmount: 50_000_000n,
        lastDepositEpoch: 3n,
        automationSettings: {
          prioritySlot1: { itemId: 0, threshold: 0n },
          prioritySlot2: { itemId: 0, threshold: 0n },
          fallbackAction: { autoCompound: {} },
        },
        inventory: {
          swordCount: 0n,
          shieldCount: 0n,
          spyglassCount: 0n,
        },
      };

      const result = transformUserPosition(userPosition);

      expect(result.automationPreference).toBe('compound');
      expect(result.currentFaction).toBe('Mage');
    });

    it('transforms user position with item preference', () => {
      const userPosition: UserPosition = {
        owner: 'UserPublicKey123',
        factionId: 2,
        depositedAmount: 75_000_000n,
        lastDepositEpoch: 4n,
        automationSettings: {
          prioritySlot1: { itemId: 1, threshold: 10_000_000n },
          prioritySlot2: { itemId: 0, threshold: 0n },
          fallbackAction: { sendToWallet: {} },
        },
        inventory: {
          swordCount: 10n,
          shieldCount: 5n,
          spyglassCount: 3n,
        },
      };

      const result = transformUserPosition(userPosition);

      expect(result.automationPreference).toBe('item');
      expect(result.currentFaction).toBe('Assassin');
    });

    it('handles zero deposited amount', () => {
      const userPosition: UserPosition = {
        owner: 'UserPublicKey123',
        factionId: 0,
        depositedAmount: 0n,
        lastDepositEpoch: 0n,
        automationSettings: {
          prioritySlot1: { itemId: 0, threshold: 0n },
          prioritySlot2: { itemId: 0, threshold: 0n },
          fallbackAction: { sendToWallet: {} },
        },
        inventory: {
          swordCount: 0n,
          shieldCount: 0n,
          spyglassCount: 0n,
        },
      };

      const result = transformUserPosition(userPosition);

      expect(result.totalDeposited).toBe(0);
      expect(result.activeBattles).toBe(0);
    });
  });
});
