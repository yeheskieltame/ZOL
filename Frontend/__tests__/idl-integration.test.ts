/**
 * Tests for IDL integration
 * Validates Requirements 2.1, 2.2, 2.3
 */

import { ZOL_CONTRACT_IDL, ZOL_PROGRAM_ID } from '../lib/idl';
import type { GameState, UserPosition, FactionState } from '../lib/idl';

describe('IDL Integration', () => {
  describe('IDL Loading', () => {
    it('should load the IDL successfully', () => {
      expect(ZOL_CONTRACT_IDL).toBeDefined();
      expect(ZOL_CONTRACT_IDL.address).toBe('Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv');
    });

    it('should export the correct program ID', () => {
      expect(ZOL_PROGRAM_ID).toBe('Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv');
    });

    it('should have metadata', () => {
      expect(ZOL_CONTRACT_IDL.metadata).toBeDefined();
      expect(ZOL_CONTRACT_IDL.metadata.name).toBe('zol_contract');
      expect(ZOL_CONTRACT_IDL.metadata.version).toBe('0.1.0');
    });
  });

  describe('Required Instructions (Requirement 2.3)', () => {
    const requiredInstructions = [
      'registerUser',
      'deposit',
      'withdraw',
      'updateAutomation',
      'initializeGame',
      'initVault',
      'resolveEpoch',
      'executeSettlement',
      'startNewEpoch',
      'injectYield'
    ];

    it('should have all required instructions', () => {
      const instructionNames = ZOL_CONTRACT_IDL.instructions.map((i: any) => i.name);
      
      requiredInstructions.forEach(instruction => {
        expect(instructionNames).toContain(instruction);
      });
    });

    it('should have registerUser instruction with correct structure', () => {
      const registerUser = ZOL_CONTRACT_IDL.instructions.find((i: any) => i.name === 'registerUser');
      
      expect(registerUser).toBeDefined();
      if (!registerUser) return;
      expect(registerUser.args).toHaveLength(1);
      if (!registerUser.args[0]) return;
      expect(registerUser.args[0].name).toBe('factionId');
      expect(registerUser.args[0].type).toBe('u8');
    });

    it('should have deposit instruction with correct structure', () => {
      const deposit = ZOL_CONTRACT_IDL.instructions.find((i: any) => i.name === 'deposit');
      
      expect(deposit).toBeDefined();
      if (!deposit) return;
      expect(deposit.args).toHaveLength(1);
      if (!deposit.args[0]) return;
      expect(deposit.args[0].name).toBe('amount');
      expect(deposit.args[0].type).toBe('u64');
    });

    it('should have withdraw instruction with correct structure', () => {
      const withdraw = ZOL_CONTRACT_IDL.instructions.find((i: any) => i.name === 'withdraw');
      
      expect(withdraw).toBeDefined();
      if (!withdraw) return;
      expect(withdraw.args).toHaveLength(1);
      if (!withdraw.args[0]) return;
      expect(withdraw.args[0].name).toBe('amount');
      expect(withdraw.args[0].type).toBe('u64');
    });

    it('should have updateAutomation instruction with correct structure', () => {
      const updateAutomation = ZOL_CONTRACT_IDL.instructions.find((i: any) => i.name === 'updateAutomation');
      
      expect(updateAutomation).toBeDefined();
      if (!updateAutomation) return;
      expect(updateAutomation.args).toHaveLength(3);
      if (!updateAutomation.args[0] || !updateAutomation.args[1] || !updateAutomation.args[2]) return;
      expect(updateAutomation.args[0].name).toBe('slot1');
      expect(updateAutomation.args[1].name).toBe('slot2');
      expect(updateAutomation.args[2].name).toBe('fallback');
    });
  });

  describe('Account Types', () => {
    it('should have GameState account type', () => {
      const gameState = ZOL_CONTRACT_IDL.accounts.find((a: any) => a.name === 'GameState');
      expect(gameState).toBeDefined();
    });

    it('should have UserPosition account type', () => {
      const userPosition = ZOL_CONTRACT_IDL.accounts.find((a: any) => a.name === 'UserPosition');
      expect(userPosition).toBeDefined();
    });
  });

  describe('Custom Types', () => {
    it('should have FactionState type', () => {
      const factionState = ZOL_CONTRACT_IDL.types.find((t: any) => t.name === 'FactionState');
      expect(factionState).toBeDefined();
    });

    it('should have AutomationSettings type', () => {
      const automationSettings = ZOL_CONTRACT_IDL.types.find((t: any) => t.name === 'AutomationSettings');
      expect(automationSettings).toBeDefined();
    });

    it('should have AutomationRule type', () => {
      const automationRule = ZOL_CONTRACT_IDL.types.find((t: any) => t.name === 'AutomationRule');
      expect(automationRule).toBeDefined();
    });

    it('should have UserInventory type', () => {
      const userInventory = ZOL_CONTRACT_IDL.types.find((t: any) => t.name === 'UserInventory');
      expect(userInventory).toBeDefined();
    });

    it('should have GameStatus enum', () => {
      const gameStatus = ZOL_CONTRACT_IDL.types.find((t: any) => t.name === 'GameStatus');
      expect(gameStatus).toBeDefined();
      expect(gameStatus?.type.kind).toBe('enum');
    });

    it('should have FallbackAction enum', () => {
      const fallbackAction = ZOL_CONTRACT_IDL.types.find((t: any) => t.name === 'FallbackAction');
      expect(fallbackAction).toBeDefined();
      expect(fallbackAction?.type.kind).toBe('enum');
    });
  });

  describe('Error Codes', () => {
    it('should have InvalidFaction error', () => {
      const invalidFaction = ZOL_CONTRACT_IDL.errors.find((e: any) => e.name === 'InvalidFaction');
      expect(invalidFaction).toBeDefined();
      expect(invalidFaction?.code).toBe(6000);
    });

    it('should have InsufficientFunds error', () => {
      const insufficientFunds = ZOL_CONTRACT_IDL.errors.find((e: any) => e.name === 'InsufficientFunds');
      expect(insufficientFunds).toBeDefined();
      expect(insufficientFunds?.code).toBe(6001);
    });

    it('should have EpochNotEnded error', () => {
      const epochNotEnded = ZOL_CONTRACT_IDL.errors.find((e: any) => e.name === 'EpochNotEnded');
      expect(epochNotEnded).toBeDefined();
      expect(epochNotEnded?.code).toBe(6002);
    });
  });

  describe('TypeScript Type Definitions', () => {
    it('should allow creating GameState type', () => {
      const gameState: GameState = {
        admin: 'test',
        epochNumber: BigInt(1),
        epochStartTs: BigInt(Date.now()),
        epochEndTs: BigInt(Date.now() + 259200),
        totalTvl: BigInt(1000000),
        factions: [],
        status: { active: {} }
      };

      expect(gameState).toBeDefined();
      expect(gameState.epochNumber).toBe(BigInt(1));
    });

    it('should allow creating UserPosition type', () => {
      const userPosition: UserPosition = {
        owner: 'test',
        factionId: 0,
        depositedAmount: BigInt(100000),
        lastDepositEpoch: BigInt(1),
        automationSettings: {
          prioritySlot1: { itemId: 0, threshold: BigInt(0) },
          prioritySlot2: { itemId: 0, threshold: BigInt(0) },
          fallbackAction: { autoCompound: {} }
        },
        inventory: {
          swordCount: BigInt(0),
          shieldCount: BigInt(0),
          spyglassCount: BigInt(0)
        }
      };

      expect(userPosition).toBeDefined();
      expect(userPosition.factionId).toBe(0);
    });

    it('should allow creating FactionState type', () => {
      const faction: FactionState = {
        id: 0,
        name: 'Vanguard',
        tvl: BigInt(500000),
        score: BigInt(100)
      };

      expect(faction).toBeDefined();
      expect(faction.name).toBe('Vanguard');
    });
  });

  describe('IDL Structure Validation', () => {
    it('should have instructions array', () => {
      expect(Array.isArray(ZOL_CONTRACT_IDL.instructions)).toBe(true);
      expect(ZOL_CONTRACT_IDL.instructions.length).toBeGreaterThan(0);
    });

    it('should have accounts array', () => {
      expect(Array.isArray(ZOL_CONTRACT_IDL.accounts)).toBe(true);
      expect(ZOL_CONTRACT_IDL.accounts.length).toBeGreaterThan(0);
    });

    it('should have types array', () => {
      expect(Array.isArray(ZOL_CONTRACT_IDL.types)).toBe(true);
      expect(ZOL_CONTRACT_IDL.types.length).toBeGreaterThan(0);
    });

    it('should have errors array', () => {
      expect(Array.isArray(ZOL_CONTRACT_IDL.errors)).toBe(true);
      expect(ZOL_CONTRACT_IDL.errors.length).toBeGreaterThan(0);
    });
  });
});
