/**
 * Property-Based Tests for Transaction Builders
 * 
 * These tests validate correctness properties for transaction building functions
 * using fast-check for property-based testing.
 * 
 * **Feature: solana-integration, Property 9: Faction ID validation**
 * **Feature: solana-integration, Property 10: Registration transaction structure**
 * **Feature: solana-integration, Property 13: Deposit amount validation**
 * **Feature: solana-integration, Property 15: Deposit transaction instruction completeness**
 * **Feature: solana-integration, Property 18: Withdrawal amount validation**
 * **Feature: solana-integration, Property 19: Withdrawal transaction instruction completeness**
 * **Feature: solana-integration, Property 24: Payout preference validation**
 * **Feature: solana-integration, Property 26: Automation transaction completeness**
 * 
 * **Validates: Requirements 4.1, 4.2, 5.1, 5.3, 6.2, 6.3, 8.1, 8.3**
 */

import * as fc from 'fast-check';
import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import {
  buildRegisterUserTx,
  buildDepositTx,
  buildWithdrawTx,
  buildUpdateAutomationTx,
  TransactionBuilderError,
} from '@/lib/transaction-builders';
import type { ZolContract, AutomationRule, FallbackAction } from '@/lib/idl/types';
import * as pdaModule from '@/lib/pda';
import * as tokenAccountModule from '@/lib/token-account';

// Mock modules
jest.mock('@/lib/pda');
jest.mock('@/lib/token-account');

/**
 * Custom Arbitraries (Generators) for Solana-specific types
 */

// Pool of known-valid Solana addresses
const VALID_ADDRESSES = [
  'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
  'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'So11111111111111111111111111111111111111112',
];

// Generator for valid PublicKey
const publicKeyArbitrary = fc.integer({ min: 0, max: VALID_ADDRESSES.length - 1 })
  .map(index => new PublicKey(VALID_ADDRESSES[index]));

// Generator for valid faction IDs (0-2)
const validFactionIdArbitrary = fc.integer({ min: 0, max: 2 });

// Generator for invalid faction IDs (outside 0-2 range)
const invalidFactionIdArbitrary = fc.oneof(
  fc.integer({ min: -1000, max: -1 }),
  fc.integer({ min: 3, max: 1000 })
);

// Generator for valid amounts (positive numbers)
const validAmountArbitrary = fc.bigInt({ min: 1n, max: 1000000000000n })
  .map(n => Number(n));

// Generator for invalid amounts (zero or negative)
const invalidAmountArbitrary = fc.oneof(
  fc.constant(0),
  fc.integer({ min: -1000000, max: -1 })
);

// Generator for valid item IDs (0-2 for sword, shield, spyglass)
const validItemIdArbitrary = fc.integer({ min: 0, max: 2 });

// Generator for invalid item IDs
const invalidItemIdArbitrary = fc.oneof(
  fc.integer({ min: -1000, max: -1 }),
  fc.integer({ min: 3, max: 1000 })
);

// Generator for valid thresholds (positive bigints)
const validThresholdArbitrary = fc.bigInt({ min: 1n, max: 1000000000000n });

// Generator for invalid thresholds (zero or negative)
const invalidThresholdArbitrary = fc.oneof(
  fc.constant(0n),
  fc.bigInt({ min: -1000000n, max: -1n })
);

// Generator for valid AutomationRule
const validAutomationRuleArbitrary = fc.record({
  itemId: validItemIdArbitrary,
  threshold: validThresholdArbitrary,
});

// Generator for valid FallbackAction
const validFallbackActionArbitrary = fc.oneof(
  fc.constant({ autoCompound: {} } as FallbackAction),
  fc.constant({ sendToWallet: {} } as FallbackAction)
);

// Generator for invalid FallbackAction
const invalidFallbackActionArbitrary = fc.oneof(
  fc.constant({ invalidAction: {} } as any),
  fc.constant({} as any),
  fc.constant({ autoCompound: {}, sendToWallet: {} } as any)
);

/**
 * Mock Setup Helpers
 */

function createMockProgram(
  depositedAmount: bigint = 500000000n,
  userBalance: bigint = 1000000000n
): jest.Mocked<Program<ZolContract>> {
  const mockTransaction = new Transaction();
  const mockMethodsBuilder = {
    accounts: jest.fn().mockReturnThis(),
    transaction: jest.fn().mockResolvedValue(mockTransaction),
  };

  const mockProgram = {
    programId: Keypair.generate().publicKey,
    methods: {
      registerUser: jest.fn().mockReturnValue(mockMethodsBuilder),
      deposit: jest.fn().mockReturnValue(mockMethodsBuilder),
      withdraw: jest.fn().mockReturnValue(mockMethodsBuilder),
      updateAutomation: jest.fn().mockReturnValue(mockMethodsBuilder),
    },
    account: {
      userPosition: {
        fetch: jest.fn().mockResolvedValue({
          owner: Keypair.generate().publicKey,
          factionId: 0,
          depositedAmount,
          lastDepositEpoch: BigInt(1),
          automationSettings: {
            prioritySlot1: { itemId: 0, threshold: BigInt(10000000) },
            prioritySlot2: { itemId: 1, threshold: BigInt(5000000) },
            fallbackAction: { autoCompound: {} },
          },
          inventory: {
            swordCount: BigInt(0),
            shieldCount: BigInt(0),
            spyglassCount: BigInt(0),
          },
        }),
      },
    },
  } as any;

  // Setup PDA mocks
  (pdaModule.getUserPositionPDA as jest.Mock).mockReturnValue([Keypair.generate().publicKey, 255]);
  (pdaModule.getGameStatePDA as jest.Mock).mockReturnValue([Keypair.generate().publicKey, 254]);
  (pdaModule.getVaultPDA as jest.Mock).mockReturnValue([Keypair.generate().publicKey, 253]);

  // Setup token account mocks
  (tokenAccountModule.getAssociatedTokenAddress as jest.Mock).mockResolvedValue(Keypair.generate().publicKey);
  (tokenAccountModule.getTokenBalance as jest.Mock).mockResolvedValue(userBalance);

  return mockProgram;
}

function createMockConnection(): jest.Mocked<Connection> {
  return {
    getAccountInfo: jest.fn(),
    getTokenAccountBalance: jest.fn(),
  } as any;
}

/**
 * Property Tests
 */

describe('Transaction Builders Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 9: Faction ID validation
   * 
   * For any faction selection, the system should validate that the faction ID 
   * is in the range [0, 2].
   * 
   * **Validates: Requirements 4.1**
   */
  describe('Property 9: Faction ID validation', () => {
    it('should accept all valid faction IDs (0, 1, 2)', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validFactionIdArbitrary,
          async (userPublicKey, factionId) => {
            const mockProgram = createMockProgram();
            
            const tx = await buildRegisterUserTx(mockProgram, userPublicKey, factionId);
            
            expect(tx).toBeInstanceOf(Transaction);
            expect(mockProgram.methods.registerUser).toHaveBeenCalledWith(factionId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject all invalid faction IDs (outside 0-2)', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          invalidFactionIdArbitrary,
          async (userPublicKey, factionId) => {
            const mockProgram = createMockProgram();
            
            await expect(buildRegisterUserTx(mockProgram, userPublicKey, factionId))
              .rejects.toThrow(TransactionBuilderError);
            
            await expect(buildRegisterUserTx(mockProgram, userPublicKey, factionId))
              .rejects.toThrow(/Invalid faction ID/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate faction ID before building transaction', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          invalidFactionIdArbitrary,
          async (userPublicKey, factionId) => {
            const mockProgram = createMockProgram();
            
            try {
              await buildRegisterUserTx(mockProgram, userPublicKey, factionId);
              throw new Error('Should have thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(TransactionBuilderError);
              expect(mockProgram.methods.registerUser).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide consistent validation results', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          fc.integer({ min: -10, max: 10 }),
          async (userPublicKey, factionId) => {
            const mockProgram1 = createMockProgram();
            const mockProgram2 = createMockProgram();
            
            const isValid = factionId >= 0 && factionId <= 2;
            
            if (isValid) {
              await expect(buildRegisterUserTx(mockProgram1, userPublicKey, factionId))
                .resolves.toBeInstanceOf(Transaction);
              await expect(buildRegisterUserTx(mockProgram2, userPublicKey, factionId))
                .resolves.toBeInstanceOf(Transaction);
            } else {
              await expect(buildRegisterUserTx(mockProgram1, userPublicKey, factionId))
                .rejects.toThrow(TransactionBuilderError);
              await expect(buildRegisterUserTx(mockProgram2, userPublicKey, factionId))
                .rejects.toThrow(TransactionBuilderError);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Registration transaction structure
   * 
   * For any user registration, the created transaction should call the 
   * register_user instruction with the correct faction ID.
   * 
   * **Validates: Requirements 4.2**
   */
  describe('Property 10: Registration transaction structure', () => {
    it('should call register_user instruction with correct faction ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validFactionIdArbitrary,
          async (userPublicKey, factionId) => {
            const mockProgram = createMockProgram();
            
            await buildRegisterUserTx(mockProgram, userPublicKey, factionId);
            
            expect(mockProgram.methods.registerUser).toHaveBeenCalledWith(factionId);
            expect(mockProgram.methods.registerUser).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include all required accounts in transaction', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validFactionIdArbitrary,
          async (userPublicKey, factionId) => {
            const mockProgram = createMockProgram();
            
            await buildRegisterUserTx(mockProgram, userPublicKey, factionId);
            
            const methodsBuilder = (mockProgram.methods.registerUser as jest.Mock).mock.results[0].value;
            expect(methodsBuilder.accounts).toHaveBeenCalledWith(
              expect.objectContaining({
                userPosition: expect.any(PublicKey),
                gameState: expect.any(PublicKey),
                user: userPublicKey,
                systemProgram: expect.any(PublicKey),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should derive correct PDAs for transaction', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validFactionIdArbitrary,
          async (userPublicKey, factionId) => {
            const mockProgram = createMockProgram();
            
            await buildRegisterUserTx(mockProgram, userPublicKey, factionId);
            
            expect(pdaModule.getUserPositionPDA).toHaveBeenCalledWith(userPublicKey, mockProgram.programId);
            expect(pdaModule.getGameStatePDA).toHaveBeenCalledWith(mockProgram.programId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return a valid Transaction object', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validFactionIdArbitrary,
          async (userPublicKey, factionId) => {
            const mockProgram = createMockProgram();
            
            const tx = await buildRegisterUserTx(mockProgram, userPublicKey, factionId);
            
            expect(tx).toBeInstanceOf(Transaction);
            expect(tx).toHaveProperty('instructions');
            expect(tx).toHaveProperty('signatures');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 13: Deposit amount validation
   * 
   * For any deposit amount entered by a user, the system should validate that 
   * the amount is greater than zero.
   * 
   * **Validates: Requirements 5.1**
   */
  describe('Property 13: Deposit amount validation', () => {
    it('should accept all positive deposit amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validAmountArbitrary,
          async (userPublicKey, amount) => {
            const mockProgram = createMockProgram(500000000n, BigInt(amount) * 2n);
            const mockConnection = createMockConnection();
            
            const tx = await buildDepositTx(mockProgram, mockConnection, userPublicKey, amount);
            
            expect(tx).toBeInstanceOf(Transaction);
            expect(mockProgram.methods.deposit).toHaveBeenCalledWith(new BN(amount));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject zero and negative deposit amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          invalidAmountArbitrary,
          async (userPublicKey, amount) => {
            const mockProgram = createMockProgram();
            const mockConnection = createMockConnection();
            
            await expect(buildDepositTx(mockProgram, mockConnection, userPublicKey, amount))
              .rejects.toThrow(TransactionBuilderError);
            
            await expect(buildDepositTx(mockProgram, mockConnection, userPublicKey, amount))
              .rejects.toThrow(/Invalid deposit amount/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate amount before checking balance', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          invalidAmountArbitrary,
          async (userPublicKey, amount) => {
            const mockProgram = createMockProgram();
            const mockConnection = createMockConnection();
            
            try {
              await buildDepositTx(mockProgram, mockConnection, userPublicKey, amount);
              throw new Error('Should have thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(TransactionBuilderError);
              expect(tokenAccountModule.getTokenBalance).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide consistent validation across multiple calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          fc.integer({ min: -100, max: 1000000 }),
          async (userPublicKey, amount) => {
            const mockProgram1 = createMockProgram(500000000n, BigInt(Math.abs(amount)) * 2n);
            const mockProgram2 = createMockProgram(500000000n, BigInt(Math.abs(amount)) * 2n);
            const mockConnection1 = createMockConnection();
            const mockConnection2 = createMockConnection();
            
            const isValid = amount > 0;
            
            if (isValid) {
              await expect(buildDepositTx(mockProgram1, mockConnection1, userPublicKey, amount))
                .resolves.toBeInstanceOf(Transaction);
              await expect(buildDepositTx(mockProgram2, mockConnection2, userPublicKey, amount))
                .resolves.toBeInstanceOf(Transaction);
            } else {
              await expect(buildDepositTx(mockProgram1, mockConnection1, userPublicKey, amount))
                .rejects.toThrow(TransactionBuilderError);
              await expect(buildDepositTx(mockProgram2, mockConnection2, userPublicKey, amount))
                .rejects.toThrow(TransactionBuilderError);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 15: Deposit transaction instruction completeness
   * 
   * For any deposit transaction, the transaction should include an instruction 
   * to transfer USDC from the user's token account to the Vault Account.
   * 
   * **Validates: Requirements 5.3**
   */
  describe('Property 15: Deposit transaction instruction completeness', () => {
    it('should include all required accounts in deposit transaction', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validAmountArbitrary,
          async (userPublicKey, amount) => {
            const mockProgram = createMockProgram(500000000n, BigInt(amount) * 2n);
            const mockConnection = createMockConnection();
            
            await buildDepositTx(mockProgram, mockConnection, userPublicKey, amount);
            
            const methodsBuilder = (mockProgram.methods.deposit as jest.Mock).mock.results[0].value;
            expect(methodsBuilder.accounts).toHaveBeenCalledWith(
              expect.objectContaining({
                userPosition: expect.any(PublicKey),
                gameState: expect.any(PublicKey),
                vault: expect.any(PublicKey),
                userUsdc: expect.any(PublicKey),
                user: userPublicKey,
                tokenProgram: expect.any(PublicKey),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should derive all required PDAs for deposit', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validAmountArbitrary,
          async (userPublicKey, amount) => {
            const mockProgram = createMockProgram(500000000n, BigInt(amount) * 2n);
            const mockConnection = createMockConnection();
            
            await buildDepositTx(mockProgram, mockConnection, userPublicKey, amount);
            
            expect(pdaModule.getUserPositionPDA).toHaveBeenCalledWith(userPublicKey, mockProgram.programId);
            expect(pdaModule.getGameStatePDA).toHaveBeenCalledWith(mockProgram.programId);
            expect(pdaModule.getVaultPDA).toHaveBeenCalledWith(mockProgram.programId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should get user USDC token account address', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validAmountArbitrary,
          async (userPublicKey, amount) => {
            const mockProgram = createMockProgram(500000000n, BigInt(amount) * 2n);
            const mockConnection = createMockConnection();
            
            await buildDepositTx(mockProgram, mockConnection, userPublicKey, amount);
            
            expect(tokenAccountModule.getAssociatedTokenAddress).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should check user balance before building transaction', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validAmountArbitrary,
          async (userPublicKey, amount) => {
            const mockProgram = createMockProgram(500000000n, BigInt(amount) * 2n);
            const mockConnection = createMockConnection();
            
            await buildDepositTx(mockProgram, mockConnection, userPublicKey, amount);
            
            expect(tokenAccountModule.getTokenBalance).toHaveBeenCalledWith(
              mockConnection,
              expect.any(PublicKey)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call deposit method with correct amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validAmountArbitrary,
          async (userPublicKey, amount) => {
            const mockProgram = createMockProgram(500000000n, BigInt(amount) * 2n);
            const mockConnection = createMockConnection();
            
            await buildDepositTx(mockProgram, mockConnection, userPublicKey, amount);
            
            expect(mockProgram.methods.deposit).toHaveBeenCalledWith(new BN(amount));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 18: Withdrawal amount validation
   * 
   * For any withdrawal amount entered, the system should validate that the 
   * amount does not exceed the user's deposited_amount.
   * 
   * **Validates: Requirements 6.2**
   */
  describe('Property 18: Withdrawal amount validation', () => {
    it('should accept withdrawal amounts less than or equal to deposited amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          fc.bigInt({ min: 1n, max: 500000000n }),
          async (userPublicKey, amount) => {
            const depositedAmount = 500000000n;
            const mockProgram = createMockProgram(depositedAmount);
            const mockConnection = createMockConnection();
            
            const tx = await buildWithdrawTx(mockProgram, mockConnection, userPublicKey, Number(amount));
            
            expect(tx).toBeInstanceOf(Transaction);
            expect(mockProgram.methods.withdraw).toHaveBeenCalledWith(new BN(Number(amount)));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject withdrawal amounts exceeding deposited amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          fc.bigInt({ min: 500000001n, max: 1000000000n }),
          async (userPublicKey, amount) => {
            const depositedAmount = 500000000n;
            const mockProgram = createMockProgram(depositedAmount);
            const mockConnection = createMockConnection();
            
            await expect(buildWithdrawTx(mockProgram, mockConnection, userPublicKey, Number(amount)))
              .rejects.toThrow(TransactionBuilderError);
            
            await expect(buildWithdrawTx(mockProgram, mockConnection, userPublicKey, Number(amount)))
              .rejects.toThrow(/Withdrawal amount exceeds deposited amount/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject zero and negative withdrawal amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          invalidAmountArbitrary,
          async (userPublicKey, amount) => {
            const mockProgram = createMockProgram();
            const mockConnection = createMockConnection();
            
            await expect(buildWithdrawTx(mockProgram, mockConnection, userPublicKey, amount))
              .rejects.toThrow(TransactionBuilderError);
            
            await expect(buildWithdrawTx(mockProgram, mockConnection, userPublicKey, amount))
              .rejects.toThrow(/Invalid withdrawal amount/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should fetch user position before validating withdrawal amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validAmountArbitrary,
          async (userPublicKey, amount) => {
            const mockProgram = createMockProgram(BigInt(amount) * 2n);
            const mockConnection = createMockConnection();
            
            await buildWithdrawTx(mockProgram, mockConnection, userPublicKey, amount);
            
            expect(mockProgram.account.userPosition.fetch).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate amount is positive before fetching user position', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          invalidAmountArbitrary,
          async (userPublicKey, amount) => {
            const mockProgram = createMockProgram();
            const mockConnection = createMockConnection();
            
            try {
              await buildWithdrawTx(mockProgram, mockConnection, userPublicKey, amount);
              throw new Error('Should have thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(TransactionBuilderError);
              expect(mockProgram.account.userPosition.fetch).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 19: Withdrawal transaction instruction completeness
   * 
   * For any withdrawal transaction, the transaction should include an instruction 
   * to transfer USDC from the Vault Account to the user's token account.
   * 
   * **Validates: Requirements 6.3**
   */
  describe('Property 19: Withdrawal transaction instruction completeness', () => {
    it('should include all required accounts in withdrawal transaction', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          fc.bigInt({ min: 1n, max: 500000000n }),
          async (userPublicKey, amount) => {
            const mockProgram = createMockProgram(500000000n);
            const mockConnection = createMockConnection();
            
            await buildWithdrawTx(mockProgram, mockConnection, userPublicKey, Number(amount));
            
            const methodsBuilder = (mockProgram.methods.withdraw as jest.Mock).mock.results[0].value;
            expect(methodsBuilder.accounts).toHaveBeenCalledWith(
              expect.objectContaining({
                userPosition: expect.any(PublicKey),
                gameState: expect.any(PublicKey),
                vault: expect.any(PublicKey),
                userUsdc: expect.any(PublicKey),
                user: userPublicKey,
                tokenProgram: expect.any(PublicKey),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should derive all required PDAs for withdrawal', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          fc.bigInt({ min: 1n, max: 500000000n }),
          async (userPublicKey, amount) => {
            const mockProgram = createMockProgram(500000000n);
            const mockConnection = createMockConnection();
            
            await buildWithdrawTx(mockProgram, mockConnection, userPublicKey, Number(amount));
            
            expect(pdaModule.getUserPositionPDA).toHaveBeenCalledWith(userPublicKey, mockProgram.programId);
            expect(pdaModule.getGameStatePDA).toHaveBeenCalledWith(mockProgram.programId);
            expect(pdaModule.getVaultPDA).toHaveBeenCalledWith(mockProgram.programId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should get user USDC token account address', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          fc.bigInt({ min: 1n, max: 500000000n }),
          async (userPublicKey, amount) => {
            const mockProgram = createMockProgram(500000000n);
            const mockConnection = createMockConnection();
            
            await buildWithdrawTx(mockProgram, mockConnection, userPublicKey, Number(amount));
            
            expect(tokenAccountModule.getAssociatedTokenAddress).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call withdraw method with correct amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          fc.bigInt({ min: 1n, max: 500000000n }),
          async (userPublicKey, amount) => {
            const mockProgram = createMockProgram(500000000n);
            const mockConnection = createMockConnection();
            
            await buildWithdrawTx(mockProgram, mockConnection, userPublicKey, Number(amount));
            
            expect(mockProgram.methods.withdraw).toHaveBeenCalledWith(new BN(Number(amount)));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 24: Payout preference validation
   * 
   * For any payout preference selection, the system should validate that the 
   * preference type is one of: wallet, compound, or item.
   * 
   * **Validates: Requirements 8.1**
   */
  describe('Property 24: Payout preference validation', () => {
    it('should accept valid fallback actions (autoCompound and sendToWallet)', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validAutomationRuleArbitrary,
          validAutomationRuleArbitrary,
          validFallbackActionArbitrary,
          async (userPublicKey, slot1, slot2, fallback) => {
            const mockProgram = createMockProgram();
            
            const tx = await buildUpdateAutomationTx(mockProgram, userPublicKey, slot1, slot2, fallback);
            
            expect(tx).toBeInstanceOf(Transaction);
            expect(mockProgram.methods.updateAutomation).toHaveBeenCalledWith(slot1, slot2, fallback);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid fallback actions', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validAutomationRuleArbitrary,
          validAutomationRuleArbitrary,
          invalidFallbackActionArbitrary,
          async (userPublicKey, slot1, slot2, fallback) => {
            const mockProgram = createMockProgram();
            
            await expect(buildUpdateAutomationTx(mockProgram, userPublicKey, slot1, slot2, fallback))
              .rejects.toThrow(TransactionBuilderError);
            
            await expect(buildUpdateAutomationTx(mockProgram, userPublicKey, slot1, slot2, fallback))
              .rejects.toThrow(/Invalid fallback action/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate item IDs in automation rules', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          invalidItemIdArbitrary,
          validThresholdArbitrary,
          validAutomationRuleArbitrary,
          validFallbackActionArbitrary,
          async (userPublicKey, invalidItemId, threshold, validSlot, fallback) => {
            const mockProgram = createMockProgram();
            const invalidSlot: AutomationRule = { itemId: invalidItemId, threshold };
            
            await expect(buildUpdateAutomationTx(mockProgram, userPublicKey, invalidSlot, validSlot, fallback))
              .rejects.toThrow(TransactionBuilderError);
            
            await expect(buildUpdateAutomationTx(mockProgram, userPublicKey, invalidSlot, validSlot, fallback))
              .rejects.toThrow(/Invalid.*itemId/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate thresholds in automation rules', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validItemIdArbitrary,
          invalidThresholdArbitrary,
          validAutomationRuleArbitrary,
          validFallbackActionArbitrary,
          async (userPublicKey, itemId, invalidThreshold, validSlot, fallback) => {
            const mockProgram = createMockProgram();
            const invalidSlot: AutomationRule = { itemId, threshold: invalidThreshold };
            
            await expect(buildUpdateAutomationTx(mockProgram, userPublicKey, invalidSlot, validSlot, fallback))
              .rejects.toThrow(TransactionBuilderError);
            
            await expect(buildUpdateAutomationTx(mockProgram, userPublicKey, invalidSlot, validSlot, fallback))
              .rejects.toThrow(/Invalid.*threshold/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept all valid item IDs (0, 1, 2)', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validItemIdArbitrary,
          validItemIdArbitrary,
          validThresholdArbitrary,
          validThresholdArbitrary,
          validFallbackActionArbitrary,
          async (userPublicKey, itemId1, itemId2, threshold1, threshold2, fallback) => {
            const mockProgram = createMockProgram();
            const slot1: AutomationRule = { itemId: itemId1, threshold: threshold1 };
            const slot2: AutomationRule = { itemId: itemId2, threshold: threshold2 };
            
            const tx = await buildUpdateAutomationTx(mockProgram, userPublicKey, slot1, slot2, fallback);
            
            expect(tx).toBeInstanceOf(Transaction);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 26: Automation transaction completeness
   * 
   * For any automation update transaction, the transaction should include 
   * priority slots and fallback action parameters.
   * 
   * **Validates: Requirements 8.3**
   */
  describe('Property 26: Automation transaction completeness', () => {
    it('should include all automation parameters in transaction', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validAutomationRuleArbitrary,
          validAutomationRuleArbitrary,
          validFallbackActionArbitrary,
          async (userPublicKey, slot1, slot2, fallback) => {
            const mockProgram = createMockProgram();
            
            await buildUpdateAutomationTx(mockProgram, userPublicKey, slot1, slot2, fallback);
            
            expect(mockProgram.methods.updateAutomation).toHaveBeenCalledWith(slot1, slot2, fallback);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include required accounts in automation transaction', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validAutomationRuleArbitrary,
          validAutomationRuleArbitrary,
          validFallbackActionArbitrary,
          async (userPublicKey, slot1, slot2, fallback) => {
            const mockProgram = createMockProgram();
            
            await buildUpdateAutomationTx(mockProgram, userPublicKey, slot1, slot2, fallback);
            
            const methodsBuilder = (mockProgram.methods.updateAutomation as jest.Mock).mock.results[0].value;
            expect(methodsBuilder.accounts).toHaveBeenCalledWith(
              expect.objectContaining({
                userPosition: expect.any(PublicKey),
                user: userPublicKey,
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should derive user position PDA for automation update', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validAutomationRuleArbitrary,
          validAutomationRuleArbitrary,
          validFallbackActionArbitrary,
          async (userPublicKey, slot1, slot2, fallback) => {
            const mockProgram = createMockProgram();
            
            await buildUpdateAutomationTx(mockProgram, userPublicKey, slot1, slot2, fallback);
            
            expect(pdaModule.getUserPositionPDA).toHaveBeenCalledWith(userPublicKey, mockProgram.programId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all automation rule properties', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validAutomationRuleArbitrary,
          validAutomationRuleArbitrary,
          validFallbackActionArbitrary,
          async (userPublicKey, slot1, slot2, fallback) => {
            const mockProgram = createMockProgram();
            
            await buildUpdateAutomationTx(mockProgram, userPublicKey, slot1, slot2, fallback);
            
            const callArgs = (mockProgram.methods.updateAutomation as jest.Mock).mock.calls[0];
            expect(callArgs[0]).toEqual(slot1);
            expect(callArgs[1]).toEqual(slot2);
            expect(callArgs[2]).toEqual(fallback);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate both priority slots before building transaction', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validAutomationRuleArbitrary,
          invalidItemIdArbitrary,
          validThresholdArbitrary,
          validFallbackActionArbitrary,
          async (userPublicKey, validSlot, invalidItemId, threshold, fallback) => {
            const mockProgram = createMockProgram();
            const invalidSlot: AutomationRule = { itemId: invalidItemId, threshold };
            
            try {
              await buildUpdateAutomationTx(mockProgram, userPublicKey, validSlot, invalidSlot, fallback);
              throw new Error('Should have thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(TransactionBuilderError);
              expect(mockProgram.methods.updateAutomation).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return a valid Transaction object', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicKeyArbitrary,
          validAutomationRuleArbitrary,
          validAutomationRuleArbitrary,
          validFallbackActionArbitrary,
          async (userPublicKey, slot1, slot2, fallback) => {
            const mockProgram = createMockProgram();
            
            const tx = await buildUpdateAutomationTx(mockProgram, userPublicKey, slot1, slot2, fallback);
            
            expect(tx).toBeInstanceOf(Transaction);
            expect(tx).toHaveProperty('instructions');
            expect(tx).toHaveProperty('signatures');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

