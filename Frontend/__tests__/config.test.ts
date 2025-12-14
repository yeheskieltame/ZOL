import { SOLANA_CONFIG, GAME_CONSTANTS, VALIDATION } from '@/lib/config';
import { PublicKey } from '@solana/web3.js';

describe('Configuration', () => {
  describe('SOLANA_CONFIG', () => {
    it('should have valid program ID', () => {
      expect(SOLANA_CONFIG.programId).toBeInstanceOf(PublicKey);
      expect(SOLANA_CONFIG.programId.toString()).toBe('Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv');
    });

    it('should have valid USDC mint', () => {
      expect(SOLANA_CONFIG.usdcMint).toBeInstanceOf(PublicKey);
      expect(SOLANA_CONFIG.usdcMint.toString()).toBe('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');
    });

    it('should have valid cluster configuration', () => {
      expect(SOLANA_CONFIG.cluster).toBe('devnet');
      expect(SOLANA_CONFIG.rpcUrl).toBeTruthy();
    });
  });

  describe('GAME_CONSTANTS', () => {
    it('should have correct USDC decimals', () => {
      expect(GAME_CONSTANTS.USDC_DECIMALS).toBe(6);
    });

    it('should have three factions', () => {
      expect(GAME_CONSTANTS.FACTION_NAMES).toHaveLength(3);
      expect(GAME_CONSTANTS.FACTION_IDS).toHaveLength(3);
    });

    it('should have valid item prices', () => {
      expect(GAME_CONSTANTS.ITEM_PRICES.SWORD).toBe(10_000_000);
      expect(GAME_CONSTANTS.ITEM_PRICES.SHIELD).toBe(2_000_000);
      expect(GAME_CONSTANTS.ITEM_PRICES.SPYGLASS).toBe(5_000_000);
    });
  });

  describe('VALIDATION', () => {
    it('should validate faction IDs correctly', () => {
      expect(VALIDATION.isValidFactionId(0)).toBe(true);
      expect(VALIDATION.isValidFactionId(1)).toBe(true);
      expect(VALIDATION.isValidFactionId(2)).toBe(true);
      expect(VALIDATION.isValidFactionId(3)).toBe(false);
      expect(VALIDATION.isValidFactionId(-1)).toBe(false);
    });

    it('should validate amounts correctly', () => {
      expect(VALIDATION.isValidAmount(1)).toBe(true);
      expect(VALIDATION.isValidAmount(100.5)).toBe(true);
      expect(VALIDATION.isValidAmount(0)).toBe(false);
      expect(VALIDATION.isValidAmount(-1)).toBe(false);
      expect(VALIDATION.isValidAmount(Infinity)).toBe(false);
      expect(VALIDATION.isValidAmount(NaN)).toBe(false);
    });

    it('should validate automation preferences correctly', () => {
      expect(VALIDATION.isValidAutomationPreference('wallet')).toBe(true);
      expect(VALIDATION.isValidAutomationPreference('compound')).toBe(true);
      expect(VALIDATION.isValidAutomationPreference('item')).toBe(true);
      expect(VALIDATION.isValidAutomationPreference('invalid')).toBe(false);
    });
  });
});
