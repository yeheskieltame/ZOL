import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
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

describe('Transaction Builders', () => {
  let mockProgram: jest.Mocked<Program<ZolContract>>;
  let mockConnection: jest.Mocked<Connection>;
  let userPublicKey: PublicKey;
  let mockPDA: PublicKey;
  let mockGameStatePDA: PublicKey;
  let mockVaultPDA: PublicKey;
  let mockUserUsdcAccount: PublicKey;

  beforeEach(() => {
    // Create test public keys
    userPublicKey = Keypair.generate().publicKey;
    mockPDA = Keypair.generate().publicKey;
    mockGameStatePDA = Keypair.generate().publicKey;
    mockVaultPDA = Keypair.generate().publicKey;
    mockUserUsdcAccount = Keypair.generate().publicKey;

    // Mock PDA functions
    (pdaModule.getUserPositionPDA as jest.Mock).mockReturnValue([mockPDA, 255]);
    (pdaModule.getGameStatePDA as jest.Mock).mockReturnValue([mockGameStatePDA, 254]);
    (pdaModule.getVaultPDA as jest.Mock).mockReturnValue([mockVaultPDA, 253]);

    // Mock token account functions
    (tokenAccountModule.getAssociatedTokenAddress as jest.Mock).mockResolvedValue(mockUserUsdcAccount);
    (tokenAccountModule.getTokenBalance as jest.Mock).mockResolvedValue(BigInt(1000000000)); // 1000 USDC

    // Mock connection
    mockConnection = {
      getAccountInfo: jest.fn(),
      getTokenAccountBalance: jest.fn(),
    } as any;

    // Mock program
    const mockTransaction = new Transaction();
    const mockMethodsBuilder = {
      accounts: jest.fn().mockReturnThis(),
      transaction: jest.fn().mockResolvedValue(mockTransaction),
    };

    mockProgram = {
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
            owner: userPublicKey,
            factionId: 0,
            depositedAmount: BigInt(500000000), // 500 USDC
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildRegisterUserTx', () => {
    it('should build a valid register user transaction for faction 0', async () => {
      const tx = await buildRegisterUserTx(mockProgram, userPublicKey, 0);

      expect(tx).toBeInstanceOf(Transaction);
      expect(mockProgram.methods.registerUser).toHaveBeenCalledWith(0);
      expect(pdaModule.getUserPositionPDA).toHaveBeenCalledWith(userPublicKey, mockProgram.programId);
      expect(pdaModule.getGameStatePDA).toHaveBeenCalledWith(mockProgram.programId);
    });

    it('should build a valid register user transaction for faction 1', async () => {
      const tx = await buildRegisterUserTx(mockProgram, userPublicKey, 1);

      expect(tx).toBeInstanceOf(Transaction);
      expect(mockProgram.methods.registerUser).toHaveBeenCalledWith(1);
    });

    it('should build a valid register user transaction for faction 2', async () => {
      const tx = await buildRegisterUserTx(mockProgram, userPublicKey, 2);

      expect(tx).toBeInstanceOf(Transaction);
      expect(mockProgram.methods.registerUser).toHaveBeenCalledWith(2);
    });

    it('should throw error for invalid faction ID -1', async () => {
      await expect(buildRegisterUserTx(mockProgram, userPublicKey, -1))
        .rejects.toThrow(TransactionBuilderError);
      
      await expect(buildRegisterUserTx(mockProgram, userPublicKey, -1))
        .rejects.toThrow('Invalid faction ID: -1');
    });

    it('should throw error for invalid faction ID 3', async () => {
      await expect(buildRegisterUserTx(mockProgram, userPublicKey, 3))
        .rejects.toThrow(TransactionBuilderError);
      
      await expect(buildRegisterUserTx(mockProgram, userPublicKey, 3))
        .rejects.toThrow('Invalid faction ID: 3');
    });

    it('should throw error for invalid faction ID 100', async () => {
      await expect(buildRegisterUserTx(mockProgram, userPublicKey, 100))
        .rejects.toThrow(TransactionBuilderError);
    });

    it('should include correct accounts in transaction', async () => {
      await buildRegisterUserTx(mockProgram, userPublicKey, 1);

      const methodsBuilder = (mockProgram.methods.registerUser as jest.Mock).mock.results[0].value;
      expect(methodsBuilder.accounts).toHaveBeenCalledWith(
        expect.objectContaining({
          userPosition: mockPDA,
          gameState: mockGameStatePDA,
          user: userPublicKey,
        })
      );
    });
  });

  describe('buildDepositTx', () => {
    it('should build a valid deposit transaction', async () => {
      const amount = 100000000; // 100 USDC
      const tx = await buildDepositTx(mockProgram, mockConnection, userPublicKey, amount);

      expect(tx).toBeInstanceOf(Transaction);
      expect(mockProgram.methods.deposit).toHaveBeenCalledWith(new BN(amount));
      expect(tokenAccountModule.getAssociatedTokenAddress).toHaveBeenCalled();
      expect(tokenAccountModule.getTokenBalance).toHaveBeenCalledWith(mockConnection, mockUserUsdcAccount);
    });

    it('should throw error for zero deposit amount', async () => {
      await expect(buildDepositTx(mockProgram, mockConnection, userPublicKey, 0))
        .rejects.toThrow(TransactionBuilderError);
      
      await expect(buildDepositTx(mockProgram, mockConnection, userPublicKey, 0))
        .rejects.toThrow('Invalid deposit amount');
    });

    it('should throw error for negative deposit amount', async () => {
      await expect(buildDepositTx(mockProgram, mockConnection, userPublicKey, -100))
        .rejects.toThrow(TransactionBuilderError);
    });

    it('should throw error for insufficient balance', async () => {
      (tokenAccountModule.getTokenBalance as jest.Mock).mockResolvedValue(BigInt(50000000)); // 50 USDC
      
      await expect(buildDepositTx(mockProgram, mockConnection, userPublicKey, 100000000))
        .rejects.toThrow(TransactionBuilderError);
      
      await expect(buildDepositTx(mockProgram, mockConnection, userPublicKey, 100000000))
        .rejects.toThrow('Insufficient USDC balance');
    });

    it('should include correct accounts in transaction', async () => {
      const amount = 100000000;
      await buildDepositTx(mockProgram, mockConnection, userPublicKey, amount);

      const methodsBuilder = (mockProgram.methods.deposit as jest.Mock).mock.results[0].value;
      expect(methodsBuilder.accounts).toHaveBeenCalledWith(
        expect.objectContaining({
          userPosition: mockPDA,
          gameState: mockGameStatePDA,
          vault: mockVaultPDA,
          userUsdc: mockUserUsdcAccount,
          user: userPublicKey,
        })
      );
    });

    it('should succeed when balance exactly equals deposit amount', async () => {
      const amount = 1000000000; // Exactly the mocked balance
      const tx = await buildDepositTx(mockProgram, mockConnection, userPublicKey, amount);

      expect(tx).toBeInstanceOf(Transaction);
    });
  });

  describe('buildWithdrawTx', () => {
    it('should build a valid withdraw transaction', async () => {
      const amount = 100000000; // 100 USDC
      const tx = await buildWithdrawTx(mockProgram, mockConnection, userPublicKey, amount);

      expect(tx).toBeInstanceOf(Transaction);
      expect(mockProgram.methods.withdraw).toHaveBeenCalledWith(new BN(amount));
      expect(mockProgram.account.userPosition.fetch).toHaveBeenCalledWith(mockPDA);
    });

    it('should throw error for zero withdrawal amount', async () => {
      await expect(buildWithdrawTx(mockProgram, mockConnection, userPublicKey, 0))
        .rejects.toThrow(TransactionBuilderError);
      
      await expect(buildWithdrawTx(mockProgram, mockConnection, userPublicKey, 0))
        .rejects.toThrow('Invalid withdrawal amount');
    });

    it('should throw error for negative withdrawal amount', async () => {
      await expect(buildWithdrawTx(mockProgram, mockConnection, userPublicKey, -100))
        .rejects.toThrow(TransactionBuilderError);
    });

    it('should throw error when withdrawal exceeds deposited amount', async () => {
      const amount = 600000000; // More than the mocked 500 USDC deposited
      
      await expect(buildWithdrawTx(mockProgram, mockConnection, userPublicKey, amount))
        .rejects.toThrow(TransactionBuilderError);
      
      await expect(buildWithdrawTx(mockProgram, mockConnection, userPublicKey, amount))
        .rejects.toThrow('Withdrawal amount exceeds deposited amount');
    });

    it('should throw error when user position not found', async () => {
      (mockProgram.account.userPosition.fetch as jest.Mock).mockRejectedValue(
        new Error('Account not found')
      );
      
      await expect(buildWithdrawTx(mockProgram, mockConnection, userPublicKey, 100000000))
        .rejects.toThrow(TransactionBuilderError);
      
      await expect(buildWithdrawTx(mockProgram, mockConnection, userPublicKey, 100000000))
        .rejects.toThrow('User position not found');
    });

    it('should include correct accounts in transaction', async () => {
      const amount = 100000000;
      await buildWithdrawTx(mockProgram, mockConnection, userPublicKey, amount);

      const methodsBuilder = (mockProgram.methods.withdraw as jest.Mock).mock.results[0].value;
      expect(methodsBuilder.accounts).toHaveBeenCalledWith(
        expect.objectContaining({
          userPosition: mockPDA,
          gameState: mockGameStatePDA,
          vault: mockVaultPDA,
          userUsdc: mockUserUsdcAccount,
          user: userPublicKey,
        })
      );
    });

    it('should succeed when withdrawal equals deposited amount', async () => {
      const amount = 500000000; // Exactly the mocked deposited amount
      const tx = await buildWithdrawTx(mockProgram, mockConnection, userPublicKey, amount);

      expect(tx).toBeInstanceOf(Transaction);
    });
  });

  describe('buildUpdateAutomationTx', () => {
    const validSlot1: AutomationRule = { itemId: 0, threshold: BigInt(10000000) };
    const validSlot2: AutomationRule = { itemId: 1, threshold: BigInt(5000000) };
    const validFallback: FallbackAction = { autoCompound: {} };

    it('should build a valid update automation transaction', async () => {
      const tx = await buildUpdateAutomationTx(
        mockProgram,
        userPublicKey,
        validSlot1,
        validSlot2,
        validFallback
      );

      expect(tx).toBeInstanceOf(Transaction);
      expect(mockProgram.methods.updateAutomation).toHaveBeenCalledWith(
        validSlot1,
        validSlot2,
        validFallback
      );
    });

    it('should accept sendToWallet fallback action', async () => {
      const fallback: FallbackAction = { sendToWallet: {} };
      const tx = await buildUpdateAutomationTx(
        mockProgram,
        userPublicKey,
        validSlot1,
        validSlot2,
        fallback
      );

      expect(tx).toBeInstanceOf(Transaction);
    });

    it('should throw error for invalid slot1 itemId', async () => {
      const invalidSlot: AutomationRule = { itemId: 3, threshold: BigInt(10000000) };
      
      await expect(buildUpdateAutomationTx(
        mockProgram,
        userPublicKey,
        invalidSlot,
        validSlot2,
        validFallback
      )).rejects.toThrow(TransactionBuilderError);
      
      await expect(buildUpdateAutomationTx(
        mockProgram,
        userPublicKey,
        invalidSlot,
        validSlot2,
        validFallback
      )).rejects.toThrow('Invalid slot1 itemId');
    });

    it('should throw error for negative slot1 itemId', async () => {
      const invalidSlot: AutomationRule = { itemId: -1, threshold: BigInt(10000000) };
      
      await expect(buildUpdateAutomationTx(
        mockProgram,
        userPublicKey,
        invalidSlot,
        validSlot2,
        validFallback
      )).rejects.toThrow(TransactionBuilderError);
    });

    it('should throw error for invalid slot2 itemId', async () => {
      const invalidSlot: AutomationRule = { itemId: 5, threshold: BigInt(10000000) };
      
      await expect(buildUpdateAutomationTx(
        mockProgram,
        userPublicKey,
        validSlot1,
        invalidSlot,
        validFallback
      )).rejects.toThrow(TransactionBuilderError);
      
      await expect(buildUpdateAutomationTx(
        mockProgram,
        userPublicKey,
        validSlot1,
        invalidSlot,
        validFallback
      )).rejects.toThrow('Invalid slot2 itemId');
    });

    it('should throw error for zero threshold in slot1', async () => {
      const invalidSlot: AutomationRule = { itemId: 0, threshold: BigInt(0) };
      
      await expect(buildUpdateAutomationTx(
        mockProgram,
        userPublicKey,
        invalidSlot,
        validSlot2,
        validFallback
      )).rejects.toThrow(TransactionBuilderError);
      
      await expect(buildUpdateAutomationTx(
        mockProgram,
        userPublicKey,
        invalidSlot,
        validSlot2,
        validFallback
      )).rejects.toThrow('Invalid slot1 threshold');
    });

    it('should throw error for negative threshold in slot2', async () => {
      const invalidSlot: AutomationRule = { itemId: 1, threshold: BigInt(-100) };
      
      await expect(buildUpdateAutomationTx(
        mockProgram,
        userPublicKey,
        validSlot1,
        invalidSlot,
        validFallback
      )).rejects.toThrow(TransactionBuilderError);
    });

    it('should throw error for invalid fallback action', async () => {
      const invalidFallback = { invalidAction: {} } as any;
      
      await expect(buildUpdateAutomationTx(
        mockProgram,
        userPublicKey,
        validSlot1,
        validSlot2,
        invalidFallback
      )).rejects.toThrow(TransactionBuilderError);
      
      await expect(buildUpdateAutomationTx(
        mockProgram,
        userPublicKey,
        validSlot1,
        validSlot2,
        invalidFallback
      )).rejects.toThrow('Invalid fallback action');
    });

    it('should include correct accounts in transaction', async () => {
      await buildUpdateAutomationTx(
        mockProgram,
        userPublicKey,
        validSlot1,
        validSlot2,
        validFallback
      );

      const methodsBuilder = (mockProgram.methods.updateAutomation as jest.Mock).mock.results[0].value;
      expect(methodsBuilder.accounts).toHaveBeenCalledWith(
        expect.objectContaining({
          userPosition: mockPDA,
          user: userPublicKey,
        })
      );
    });

    it('should accept all valid item IDs (0, 1, 2)', async () => {
      const slot0: AutomationRule = { itemId: 0, threshold: BigInt(10000000) };
      const slot1: AutomationRule = { itemId: 1, threshold: BigInt(10000000) };
      const slot2: AutomationRule = { itemId: 2, threshold: BigInt(10000000) };

      await expect(buildUpdateAutomationTx(mockProgram, userPublicKey, slot0, slot1, validFallback))
        .resolves.toBeInstanceOf(Transaction);
      
      await expect(buildUpdateAutomationTx(mockProgram, userPublicKey, slot1, slot2, validFallback))
        .resolves.toBeInstanceOf(Transaction);
      
      await expect(buildUpdateAutomationTx(mockProgram, userPublicKey, slot2, slot0, validFallback))
        .resolves.toBeInstanceOf(Transaction);
    });
  });
});
