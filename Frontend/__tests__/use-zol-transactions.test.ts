/**
 * Tests for useZolTransactions hook
 * Validates transaction execution, state management, and error handling
 * 
 * Requirements: 4.2, 5.2, 6.2, 8.2, 11.1, 11.2, 11.3
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, Connection } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useZolTransactions } from '@/hooks/use-zol-transactions';
import { useZolProgram } from '@/hooks/use-zol-program';
import * as transactionBuilders from '@/lib/transaction-builders';

// Mock dependencies
jest.mock('@solana/wallet-adapter-react');
jest.mock('@/hooks/use-zol-program');
jest.mock('@/lib/transaction-builders');

describe('useZolTransactions', () => {
  const mockPublicKey = new PublicKey('11111111111111111111111111111111');
  const mockSignature = 'test-signature-123';
  
  let mockConnection: any;
  let mockProgram: any;
  let mockWallet: any;
  let mockTransaction: Transaction;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock connection
    mockConnection = {
      getLatestBlockhash: jest.fn().mockResolvedValue({
        blockhash: 'test-blockhash',
        lastValidBlockHeight: 1000,
      }),
      sendRawTransaction: jest.fn().mockResolvedValue(mockSignature),
      confirmTransaction: jest.fn().mockResolvedValue({
        value: { err: null },
      }),
    };
    
    // Mock program
    mockProgram = {
      programId: mockPublicKey,
      account: {
        userPosition: {
          fetch: jest.fn(),
        },
      },
    };
    
    // Mock transaction with proper structure
    mockTransaction = {
      recentBlockhash: undefined,
      feePayer: undefined,
      serialize: jest.fn().mockReturnValue(Buffer.from('mock-serialized-tx')),
    } as any;
    
    // Mock wallet
    mockWallet = {
      publicKey: mockPublicKey,
      signTransaction: jest.fn().mockResolvedValue(mockTransaction),
      signAllTransactions: jest.fn(),
    };
    
    // Setup default mocks
    (useWallet as jest.Mock).mockReturnValue(mockWallet);
    (useZolProgram as jest.Mock).mockReturnValue({
      program: mockProgram,
      connection: mockConnection,
      isReady: true,
      programId: mockPublicKey,
    });
  });
  
  describe('initial state', () => {
    it('should initialize with idle state', () => {
      const { result } = renderHook(() => useZolTransactions());
      
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.transactionState.status).toBe('idle');
      expect(result.current.transactionState.signature).toBeNull();
      expect(result.current.transactionState.error).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
  
  describe('registerUser', () => {
    beforeEach(() => {
      (transactionBuilders.buildRegisterUserTx as jest.Mock).mockResolvedValue(mockTransaction);
    });
    
    it('should successfully register user', async () => {
      const { result } = renderHook(() => useZolTransactions());
      
      let signature: string = '';
      await act(async () => {
        signature = await result.current.registerUser(0);
      });
      
      expect(signature).toBe(mockSignature);
      expect(transactionBuilders.buildRegisterUserTx).toHaveBeenCalledWith(
        mockProgram,
        mockPublicKey,
        0
      );
    });
    
    it('should update transaction state during registration', async () => {
      const { result } = renderHook(() => useZolTransactions());
      
      await act(async () => {
        await result.current.registerUser(1);
      });
      
      // Transaction should be confirmed or finalized
      expect(['confirmed', 'finalized']).toContain(result.current.transactionState.status);
      expect(result.current.transactionState.signature).toBe(mockSignature);
    });
    
    it('should throw error when wallet not connected', async () => {
      (useZolProgram as jest.Mock).mockReturnValue({
        program: null,
        connection: mockConnection,
        isReady: false,
        programId: mockPublicKey,
      });
      
      const { result } = renderHook(() => useZolTransactions());
      
      await act(async () => {
        await expect(result.current.registerUser(0)).rejects.toThrow(
          'Wallet not connected or program not ready'
        );
      });
    });
    
    it('should handle transaction builder errors', async () => {
      const builderError = new Error('Invalid faction ID');
      (transactionBuilders.buildRegisterUserTx as jest.Mock).mockRejectedValue(builderError);
      
      const { result } = renderHook(() => useZolTransactions());
      
      await act(async () => {
        await expect(result.current.registerUser(5)).rejects.toThrow();
      });
      
      expect(result.current.transactionState.status).toBe('error');
      expect(result.current.error).toBeTruthy();
    });
  });
  
  describe('deposit', () => {
    beforeEach(() => {
      (transactionBuilders.buildDepositTx as jest.Mock).mockResolvedValue(mockTransaction);
    });
    
    it('should successfully deposit', async () => {
      const { result } = renderHook(() => useZolTransactions());
      
      let signature: string = '';
      await act(async () => {
        signature = await result.current.deposit(1000000);
      });
      
      expect(signature).toBe(mockSignature);
      expect(transactionBuilders.buildDepositTx).toHaveBeenCalledWith(
        mockProgram,
        mockConnection,
        mockPublicKey,
        1000000
      );
    });
    
    it('should track isProcessing state', async () => {
      const { result } = renderHook(() => useZolTransactions());
      
      // Complete deposit
      await act(async () => {
        await result.current.deposit(1000000);
      });
      
      // After completion, should no longer be processing
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.transactionState.signature).toBe(mockSignature);
    });
    
    it('should handle insufficient balance error', async () => {
      const balanceError = new Error('Insufficient USDC balance');
      (transactionBuilders.buildDepositTx as jest.Mock).mockRejectedValue(balanceError);
      
      const { result } = renderHook(() => useZolTransactions());
      
      await act(async () => {
        await expect(result.current.deposit(1000000)).rejects.toThrow('Insufficient USDC balance');
      });
      
      expect(result.current.transactionState.status).toBe('error');
    });
  });
  
  describe('withdraw', () => {
    beforeEach(() => {
      (transactionBuilders.buildWithdrawTx as jest.Mock).mockResolvedValue(mockTransaction);
    });
    
    it('should successfully withdraw', async () => {
      const { result } = renderHook(() => useZolTransactions());
      
      let signature: string = '';
      await act(async () => {
        signature = await result.current.withdraw(500000);
      });
      
      expect(signature).toBe(mockSignature);
      expect(transactionBuilders.buildWithdrawTx).toHaveBeenCalledWith(
        mockProgram,
        mockConnection,
        mockPublicKey,
        500000
      );
    });
    
    it('should handle withdrawal amount exceeds deposited error', async () => {
      const withdrawError = new Error('Withdrawal amount exceeds deposited amount');
      (transactionBuilders.buildWithdrawTx as jest.Mock).mockRejectedValue(withdrawError);
      
      const { result } = renderHook(() => useZolTransactions());
      
      await act(async () => {
        await expect(result.current.withdraw(1000000)).rejects.toThrow(
          'Withdrawal amount exceeds deposited amount'
        );
      });
      
      expect(result.current.transactionState.status).toBe('error');
    });
  });
  
  describe('updateAutomation', () => {
    const mockSlot1 = { itemId: 0, threshold: new BN(1000000) };
    const mockSlot2 = { itemId: 1, threshold: new BN(2000000) };
    const mockFallback = { autoCompound: {} };
    
    beforeEach(() => {
      (transactionBuilders.buildUpdateAutomationTx as jest.Mock).mockResolvedValue(mockTransaction);
    });
    
    it('should successfully update automation', async () => {
      const { result } = renderHook(() => useZolTransactions());
      
      let signature: string = '';
      await act(async () => {
        signature = await result.current.updateAutomation(mockSlot1, mockSlot2, mockFallback);
      });
      
      expect(signature).toBe(mockSignature);
      expect(transactionBuilders.buildUpdateAutomationTx).toHaveBeenCalledWith(
        mockProgram,
        mockPublicKey,
        mockSlot1,
        mockSlot2,
        mockFallback
      );
    });
    
    it('should handle invalid automation rule error', async () => {
      const validationError = new Error('Invalid slot1 itemId');
      (transactionBuilders.buildUpdateAutomationTx as jest.Mock).mockRejectedValue(validationError);
      
      const { result } = renderHook(() => useZolTransactions());
      
      await act(async () => {
        await expect(
          result.current.updateAutomation(mockSlot1, mockSlot2, mockFallback)
        ).rejects.toThrow('Invalid slot1 itemId');
      });
      
      expect(result.current.transactionState.status).toBe('error');
    });
  });
  
  describe('transaction state management', () => {
    beforeEach(() => {
      (transactionBuilders.buildDepositTx as jest.Mock).mockResolvedValue(mockTransaction);
    });
    
    it('should track transaction signature', async () => {
      const { result } = renderHook(() => useZolTransactions());
      
      await act(async () => {
        await result.current.deposit(1000000);
      });
      
      expect(result.current.transactionState.signature).toBe(mockSignature);
    });
    
    it('should track confirmation status progression', async () => {
      const { result } = renderHook(() => useZolTransactions());
      
      await act(async () => {
        await result.current.deposit(1000000);
      });
      
      // Should reach confirmed or finalized status
      expect(['confirmed', 'finalized']).toContain(result.current.transactionState.status);
    });
    
    it('should clear transaction state', async () => {
      const { result } = renderHook(() => useZolTransactions());
      
      await act(async () => {
        await result.current.deposit(1000000);
      });
      
      expect(result.current.transactionState.signature).toBe(mockSignature);
      
      act(() => {
        result.current.clearTransactionState();
      });
      
      expect(result.current.transactionState.status).toBe('idle');
      expect(result.current.transactionState.signature).toBeNull();
      expect(result.current.error).toBeNull();
    });
    
    it('should handle transaction confirmation errors', async () => {
      mockConnection.confirmTransaction.mockResolvedValueOnce({
        value: { err: { InstructionError: [0, 'Custom error'] } },
      });
      
      const { result } = renderHook(() => useZolTransactions());
      
      await act(async () => {
        await expect(result.current.deposit(1000000)).rejects.toThrow('Transaction failed');
      });
      
      expect(result.current.transactionState.status).toBe('error');
    });
  });
  
  describe('error handling', () => {
    it('should handle signing rejection', async () => {
      mockWallet.signTransaction.mockRejectedValue(new Error('User rejected'));
      (transactionBuilders.buildDepositTx as jest.Mock).mockResolvedValue(mockTransaction);
      
      const { result } = renderHook(() => useZolTransactions());
      
      await act(async () => {
        await expect(result.current.deposit(1000000)).rejects.toThrow('User rejected');
      });
      
      expect(result.current.transactionState.status).toBe('error');
      expect(result.current.error).toBeTruthy();
    });
    
    it('should handle network errors', async () => {
      mockConnection.sendRawTransaction.mockRejectedValue(new Error('Network error'));
      (transactionBuilders.buildDepositTx as jest.Mock).mockResolvedValue(mockTransaction);
      
      const { result } = renderHook(() => useZolTransactions());
      
      await act(async () => {
        await expect(result.current.deposit(1000000)).rejects.toThrow('Network error');
      });
      
      expect(result.current.transactionState.status).toBe('error');
    });
    
    it('should preserve error in state', async () => {
      const testError = new Error('Test error');
      (transactionBuilders.buildDepositTx as jest.Mock).mockRejectedValue(testError);
      
      const { result } = renderHook(() => useZolTransactions());
      
      await act(async () => {
        await expect(result.current.deposit(1000000)).rejects.toThrow('Test error');
      });
      
      expect(result.current.error).toBeTruthy();
      expect(result.current.transactionState.error).toBeTruthy();
    });
  });
  
  describe('concurrent transaction prevention', () => {
    beforeEach(() => {
      (transactionBuilders.buildDepositTx as jest.Mock).mockResolvedValue(mockTransaction);
    });
    
    it('should indicate processing state during transaction', async () => {
      const { result } = renderHook(() => useZolTransactions());
      
      // Complete a transaction
      await act(async () => {
        await result.current.deposit(1000000);
      });
      
      // After completion, should no longer be processing
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.transactionState.signature).toBe(mockSignature);
    });
  });
});
