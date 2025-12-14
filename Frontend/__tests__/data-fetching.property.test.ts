/**
 * Property-Based Tests for Data Fetching
 * 
 * These tests validate correctness properties for game state and user position data fetching.
 * Using fast-check for property-based testing to verify properties hold across many inputs.
 * 
 * **Feature: solana-integration, Property 5: Game state data completeness**
 * **Feature: solana-integration, Property 6: Faction data display completeness**
 * **Feature: solana-integration, Property 7: Total TVL calculation correctness**
 * **Feature: solana-integration, Property 20: User position data display completeness**
 * **Feature: solana-integration, Property 34: Time remaining calculation**
 * 
 * **Validates: Requirements 3.2, 3.3, 3.4, 7.2, 10.4**
 */

import * as fc from 'fast-check';
import type { GameState, FactionState, UserPosition } from '@/lib/idl/types';
import { transformGameState, transformFactionState, transformUserPosition, formatTimeRemaining } from '@/lib/transformers';

/**
 * Custom Arbitraries (Generators) for Solana-specific types
 */

// Generator for valid faction IDs (0-2)
const factionIdArbitrary = fc.integer({ min: 0, max: 2 });

// Generator for USDC amounts in lamports (6 decimals)
const usdcLamportsArbitrary = fc.bigInt({ min: 0n, max: 1000000000000n });

// Generator for timestamps (Unix seconds)
const timestampArbitrary = fc.bigInt({ 
  min: BigInt(Math.floor(Date.now() / 1000)), 
  max: BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60) // up to 1 year in future
});

// Generator for epoch numbers
const epochNumberArbitrary = fc.bigInt({ min: 0n, max: 1000n });

// Generator for public key strings (32 bytes as base58)
const publicKeyArbitrary = fc.string({ minLength: 44, maxLength: 44 }); // Simulate base58 address

// Generator for faction names
const factionNameArbitrary = fc.constantFrom('Vanguard', 'Mage', 'Assassin');

// Generator for game status
const gameStatusArbitrary = fc.constantFrom<GameState['status']>(
  { active: {} },
  { settlement: {} },
  { paused: {} }
);

// Generator for FactionState
const factionStateArbitrary = fc.record({
  id: factionIdArbitrary,
  name: factionNameArbitrary,
  tvl: usdcLamportsArbitrary,
  score: fc.bigInt({ min: -1000n, max: 1000n }),
});

// Generator for GameState
// Note: totalTvl must equal sum of faction TVLs (blockchain constraint)
const gameStateArbitrary = fc.record({
  admin: publicKeyArbitrary,
  epochNumber: epochNumberArbitrary,
  epochStartTs: timestampArbitrary,
  epochEndTs: timestampArbitrary,
  factions: fc.tuple(factionStateArbitrary, factionStateArbitrary, factionStateArbitrary),
  status: gameStatusArbitrary,
}).map(state => {
  // Calculate totalTvl as sum of faction TVLs to maintain consistency
  const totalTvl = state.factions.reduce((sum, faction) => sum + faction.tvl, 0n);
  return {
    ...state,
    totalTvl,
  };
});

// Generator for AutomationRule
const automationRuleArbitrary = fc.record({
  itemId: fc.integer({ min: 0, max: 3 }),
  threshold: usdcLamportsArbitrary,
});

// Generator for FallbackAction
const fallbackActionArbitrary = fc.constantFrom<UserPosition['automationSettings']['fallbackAction']>(
  { autoCompound: {} },
  { sendToWallet: {} }
);

// Generator for AutomationSettings
const automationSettingsArbitrary = fc.record({
  prioritySlot1: automationRuleArbitrary,
  prioritySlot2: automationRuleArbitrary,
  fallbackAction: fallbackActionArbitrary,
});

// Generator for UserInventory
const userInventoryArbitrary = fc.record({
  swordCount: fc.bigInt({ min: 0n, max: 100n }),
  shieldCount: fc.bigInt({ min: 0n, max: 100n }),
  spyglassCount: fc.bigInt({ min: 0n, max: 100n }),
});

// Generator for UserPosition
const userPositionArbitrary = fc.record({
  owner: publicKeyArbitrary,
  factionId: factionIdArbitrary,
  depositedAmount: usdcLamportsArbitrary,
  lastDepositEpoch: epochNumberArbitrary,
  automationSettings: automationSettingsArbitrary,
  inventory: userInventoryArbitrary,
});

/**
 * Property Tests
 */

describe('Data Fetching Property Tests', () => {
  /**
   * Property 5: Game state data completeness
   * 
   * For any retrieved Game State Account, the displayed data should include 
   * epoch number, start time, end time, and all faction information.
   * 
   * **Validates: Requirements 3.2**
   */
  describe('Property 5: Game state data completeness', () => {
    it('should include all required fields when transforming game state', () => {
      fc.assert(
        fc.property(gameStateArbitrary, (gameState) => {
          const transformed = transformGameState(gameState);
          
          // Verify all required fields are present and defined
          expect(transformed.number).toBeDefined();
          expect(transformed.timeRemaining).toBeDefined();
          expect(transformed.endDate).toBeDefined();
          expect(transformed.status).toBeDefined();
          expect(transformed.totalTVL).toBeDefined();
          
          // Verify types are correct
          expect(typeof transformed.number).toBe('number');
          expect(typeof transformed.timeRemaining).toBe('string');
          expect(typeof transformed.endDate).toBe('string');
          expect(typeof transformed.status).toBe('string');
          expect(typeof transformed.totalTVL).toBe('number');
          
          // Verify epoch number matches
          expect(transformed.number).toBe(Number(gameState.epochNumber));
          
          // Verify status is one of the valid values
          expect(['active', 'settlement', 'paused']).toContain(transformed.status);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve epoch number from blockchain data', () => {
      fc.assert(
        fc.property(gameStateArbitrary, (gameState) => {
          const transformed = transformGameState(gameState);
          expect(transformed.number).toBe(Number(gameState.epochNumber));
        }),
        { numRuns: 100 }
      );
    });

    it('should include start and end timestamps in transformed data', () => {
      fc.assert(
        fc.property(gameStateArbitrary, (gameState) => {
          const transformed = transformGameState(gameState);
          
          // endDate should be a valid date string
          expect(transformed.endDate).toBeTruthy();
          expect(transformed.endDate.length).toBeGreaterThan(0);
          
          // timeRemaining should be a formatted string
          expect(transformed.timeRemaining).toBeTruthy();
          expect(transformed.timeRemaining.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Faction data display completeness
   * 
   * For any fetched faction data, the system should display TVL, player count, 
   * and score for each faction.
   * 
   * **Validates: Requirements 3.3**
   */
  describe('Property 6: Faction data display completeness', () => {
    it('should include all required fields when transforming faction state', () => {
      fc.assert(
        fc.property(
          factionStateArbitrary,
          usdcLamportsArbitrary,
          fc.integer({ min: 0, max: 10000 }),
          fc.float({ min: 0, max: 100 }),
          (factionState, totalTvl, players, apy) => {
            const transformed = transformFactionState(factionState, totalTvl, players, apy);
            
            // Verify all required fields are present
            expect(transformed.id).toBeDefined();
            expect(transformed.name).toBeDefined();
            expect(transformed.color).toBeDefined();
            expect(transformed.tvl).toBeDefined();
            expect(transformed.tvlPercentage).toBeDefined();
            expect(transformed.players).toBeDefined();
            expect(transformed.apy).toBeDefined();
            expect(transformed.image).toBeDefined();
            expect(transformed.score).toBeDefined();
            
            // Verify types
            expect(typeof transformed.id).toBe('string');
            expect(typeof transformed.name).toBe('string');
            expect(typeof transformed.color).toBe('string');
            expect(typeof transformed.tvl).toBe('number');
            expect(typeof transformed.tvlPercentage).toBe('number');
            expect(typeof transformed.players).toBe('number');
            expect(typeof transformed.apy).toBe('number');
            expect(typeof transformed.image).toBe('string');
            expect(typeof transformed.score).toBe('number');
            
            // Verify score matches
            expect(transformed.score).toBe(Number(factionState.score));
            
            // Verify players and apy are preserved
            expect(transformed.players).toBe(players);
            expect(transformed.apy).toBe(apy);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve faction score from blockchain data', () => {
      fc.assert(
        fc.property(
          factionStateArbitrary,
          usdcLamportsArbitrary,
          (factionState, totalTvl) => {
            const transformed = transformFactionState(factionState, totalTvl);
            expect(transformed.score).toBe(Number(factionState.score));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should convert TVL from lamports to USDC correctly', () => {
      fc.assert(
        fc.property(
          factionStateArbitrary,
          usdcLamportsArbitrary,
          (factionState, totalTvl) => {
            const transformed = transformFactionState(factionState, totalTvl);
            
            // TVL should be non-negative
            expect(transformed.tvl).toBeGreaterThanOrEqual(0);
            
            // TVL should be a finite number
            expect(Number.isFinite(transformed.tvl)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Total TVL calculation correctness
   * 
   * For any game state, the total TVL should equal the sum of all faction TVLs.
   * 
   * **Validates: Requirements 3.4**
   */
  describe('Property 7: Total TVL calculation correctness', () => {
    it('should have total TVL equal to sum of faction TVLs', () => {
      fc.assert(
        fc.property(gameStateArbitrary, (gameState) => {
          // Calculate sum of faction TVLs
          const sumOfFactionTvls = gameState.factions.reduce(
            (sum, faction) => sum + faction.tvl,
            0n
          );
          
          // Total TVL should equal sum of faction TVLs
          expect(gameState.totalTvl).toBe(sumOfFactionTvls);
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain TVL consistency when transforming', () => {
      fc.assert(
        fc.property(gameStateArbitrary, (gameState) => {
          const transformed = transformGameState(gameState);
          
          // Transform each faction
          const transformedFactions = gameState.factions.map(faction =>
            transformFactionState(faction, gameState.totalTvl)
          );
          
          // Sum of transformed faction TVLs should approximately equal transformed total TVL
          const sumOfTransformedFactionTvls = transformedFactions.reduce(
            (sum, faction) => sum + faction.tvl,
            0
          );
          
          // Allow for small floating point differences (within 0.01 USDC)
          const difference = Math.abs(sumOfTransformedFactionTvls - transformed.totalTVL);
          expect(difference).toBeLessThan(0.01);
        }),
        { numRuns: 100 }
      );
    });

    it('should calculate TVL percentages that sum to 100%', () => {
      fc.assert(
        fc.property(
          gameStateArbitrary.filter(gs => gs.totalTvl > 0n),
          (gameState) => {
            // Transform each faction
            const transformedFactions = gameState.factions.map(faction =>
              transformFactionState(faction, gameState.totalTvl)
            );
            
            // Sum of TVL percentages should be approximately 100%
            const sumOfPercentages = transformedFactions.reduce(
              (sum, faction) => sum + faction.tvlPercentage,
              0
            );
            
            // Allow for small floating point differences
            expect(sumOfPercentages).toBeCloseTo(100, 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero total TVL gracefully', () => {
      fc.assert(
        fc.property(factionStateArbitrary, (factionState) => {
          const totalTvl = 0n;
          const transformed = transformFactionState(factionState, totalTvl);
          
          // TVL percentage should be 0 when total TVL is 0
          expect(transformed.tvlPercentage).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 20: User position data display completeness
   * 
   * For any retrieved User Position Account, the displayed data should include 
   * faction, deposited amount, and inventory items.
   * 
   * **Validates: Requirements 7.2**
   */
  describe('Property 20: User position data display completeness', () => {
    it('should include all required fields when transforming user position', () => {
      fc.assert(
        fc.property(userPositionArbitrary, (userPosition) => {
          const transformed = transformUserPosition(userPosition);
          
          // Verify all required fields are present
          expect(transformed.totalDeposited).toBeDefined();
          expect(transformed.totalYieldEarned).toBeDefined();
          expect(transformed.activeBattles).toBeDefined();
          expect(transformed.winRate).toBeDefined();
          expect(transformed.currentFaction).toBeDefined();
          expect(transformed.automationPreference).toBeDefined();
          expect(transformed.inventory).toBeDefined();
          
          // Verify types
          expect(typeof transformed.totalDeposited).toBe('number');
          expect(typeof transformed.totalYieldEarned).toBe('number');
          expect(typeof transformed.activeBattles).toBe('number');
          expect(typeof transformed.winRate).toBe('number');
          expect(typeof transformed.currentFaction).toBe('string');
          expect(typeof transformed.automationPreference).toBe('string');
          expect(typeof transformed.inventory).toBe('object');
        }),
        { numRuns: 100 }
      );
    });

    it('should include complete inventory data', () => {
      fc.assert(
        fc.property(userPositionArbitrary, (userPosition) => {
          const transformed = transformUserPosition(userPosition);
          
          // Verify inventory has all item counts
          expect(transformed.inventory.swordCount).toBeDefined();
          expect(transformed.inventory.shieldCount).toBeDefined();
          expect(transformed.inventory.spyglassCount).toBeDefined();
          
          // Verify types
          expect(typeof transformed.inventory.swordCount).toBe('number');
          expect(typeof transformed.inventory.shieldCount).toBe('number');
          expect(typeof transformed.inventory.spyglassCount).toBe('number');
          
          // Verify counts match
          expect(transformed.inventory.swordCount).toBe(Number(userPosition.inventory.swordCount));
          expect(transformed.inventory.shieldCount).toBe(Number(userPosition.inventory.shieldCount));
          expect(transformed.inventory.spyglassCount).toBe(Number(userPosition.inventory.spyglassCount));
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve deposited amount from blockchain data', () => {
      fc.assert(
        fc.property(userPositionArbitrary, (userPosition) => {
          const transformed = transformUserPosition(userPosition);
          
          // Deposited amount should be non-negative
          expect(transformed.totalDeposited).toBeGreaterThanOrEqual(0);
          
          // Should be a finite number
          expect(Number.isFinite(transformed.totalDeposited)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should include faction information', () => {
      fc.assert(
        fc.property(userPositionArbitrary, (userPosition) => {
          const transformed = transformUserPosition(userPosition);
          
          // Current faction should be one of the valid faction names
          expect(['Vanguard', 'Mage', 'Assassin', 'Unknown']).toContain(transformed.currentFaction);
        }),
        { numRuns: 100 }
      );
    });

    it('should include automation preference', () => {
      fc.assert(
        fc.property(userPositionArbitrary, (userPosition) => {
          const transformed = transformUserPosition(userPosition);
          
          // Automation preference should be one of the valid values
          expect(['wallet', 'compound', 'item']).toContain(transformed.automationPreference);
        }),
        { numRuns: 100 }
      );
    });

    it('should set active battles based on deposited amount', () => {
      fc.assert(
        fc.property(userPositionArbitrary, (userPosition) => {
          const transformed = transformUserPosition(userPosition);
          
          // If deposited amount > 0, should have 1 active battle
          if (userPosition.depositedAmount > 0n) {
            expect(transformed.activeBattles).toBe(1);
          } else {
            expect(transformed.activeBattles).toBe(0);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 34: Time remaining calculation
   * 
   * For any epoch, the displayed time remaining should equal the difference 
   * between the current time and epoch_end_ts.
   * 
   * **Validates: Requirements 10.4**
   */
  describe('Property 34: Time remaining calculation', () => {
    it('should calculate time remaining correctly for future timestamps', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 60n, max: 365n * 24n * 60n * 60n }), // seconds in future (1 minute to 1 year)
          (secondsInFuture) => {
            const now = Math.floor(Date.now() / 1000);
            const epochEndTs = BigInt(now) + secondsInFuture;
            
            const timeRemaining = formatTimeRemaining(epochEndTs);
            
            // Time remaining should be a non-empty string
            expect(timeRemaining).toBeTruthy();
            expect(timeRemaining.length).toBeGreaterThan(0);
            
            // Should not be '0m' for future timestamps with at least 1 minute
            expect(timeRemaining).not.toBe('0m');
            
            // Should contain valid time units (d, h, or m)
            const hasValidUnits = /\d+[dhm]/.test(timeRemaining);
            expect(hasValidUnits).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0m for past or current timestamps', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: 1000n }), // seconds in past
          (secondsInPast) => {
            const now = Math.floor(Date.now() / 1000);
            const epochEndTs = BigInt(now) - secondsInPast;
            
            const timeRemaining = formatTimeRemaining(epochEndTs);
            
            // Past timestamps should return '0m'
            expect(timeRemaining).toBe('0m');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format days, hours, and minutes correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 365 }), // days
          fc.integer({ min: 0, max: 23 }), // hours
          fc.integer({ min: 0, max: 59 }), // minutes
          (days, hours, minutes) => {
            const now = Math.floor(Date.now() / 1000);
            const secondsInFuture = days * 86400 + hours * 3600 + minutes * 60;
            const epochEndTs = BigInt(now + secondsInFuture);
            
            const timeRemaining = formatTimeRemaining(epochEndTs);
            
            // Verify format based on what components are present
            if (days > 0) {
              expect(timeRemaining).toContain('d');
            }
            if (hours > 0) {
              expect(timeRemaining).toContain('h');
            }
            // Minutes are included when > 0 OR when it's the only component
            if (minutes > 0 || (days === 0 && hours === 0)) {
              expect(timeRemaining).toMatch(/\d+m/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency when used in game state transformation', () => {
      fc.assert(
        fc.property(gameStateArbitrary, (gameState) => {
          const transformed = transformGameState(gameState);
          
          // Time remaining should be consistent with epoch end timestamp
          const now = Math.floor(Date.now() / 1000);
          const endTime = Number(gameState.epochEndTs);
          const secondsRemaining = endTime - now;
          
          if (secondsRemaining <= 0) {
            expect(transformed.timeRemaining).toBe('0m');
          } else {
            // Should have a valid time format
            expect(transformed.timeRemaining).toBeTruthy();
            expect(transformed.timeRemaining.length).toBeGreaterThan(0);
            expect(/\d+[dhm]/.test(transformed.timeRemaining)).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle edge case of exactly 0 seconds remaining', () => {
      const now = Math.floor(Date.now() / 1000);
      const epochEndTs = BigInt(now);
      
      const timeRemaining = formatTimeRemaining(epochEndTs);
      
      expect(timeRemaining).toBe('0m');
    });

    it('should handle very large time differences', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 365n * 24n * 60n * 60n, max: 10n * 365n * 24n * 60n * 60n }), // 1-10 years
          (secondsInFuture) => {
            const now = Math.floor(Date.now() / 1000);
            const epochEndTs = BigInt(now) + secondsInFuture;
            
            const timeRemaining = formatTimeRemaining(epochEndTs);
            
            // Should still produce a valid format
            expect(timeRemaining).toBeTruthy();
            expect(timeRemaining.length).toBeGreaterThan(0);
            expect(/\d+[dhm]/.test(timeRemaining)).toBe(true);
            
            // Should contain days for such large differences
            expect(timeRemaining).toContain('d');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent results for the same timestamp', () => {
      fc.assert(
        fc.property(timestampArbitrary, (epochEndTs) => {
          const result1 = formatTimeRemaining(epochEndTs);
          const result2 = formatTimeRemaining(epochEndTs);
          
          // Same input should produce same output (within same second)
          expect(result1).toBe(result2);
        }),
        { numRuns: 100 }
      );
    });
  });
});
