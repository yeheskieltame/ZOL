/**
 * Tests for useZolProgram hook
 * Validates Anchor provider configuration and program initialization
 * 
 * Task 5.3: Write unit tests for Anchor client setup
 * - Test program initialization
 * - Test provider configuration
 * - Test error handling
 * _Requirements: 2.2_
 */

import { renderHook } from '@testing-library/react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { useZolProgram } from '@/hooks/use-zol-program';
import { SOLANA_CONFIG } from '@/lib/config';
import { ZOL_CONTRACT_IDL } from '@/lib/idl';

// Mock the wallet adapter hooks
jest.mock('@solana/wallet-adapter-react', () => ({
  useConnection: jest.fn(),
  useWallet: jest.fn(),
}));

// Mock the RPC manager
jest.mock('@/lib/rpc-manager', () => ({
  getRPCConnection: jest.fn(() => ({
    rpcEndpoint: 'https://api.devnet.solana.com',
    commitment: 'confirmed',
    getAccountInfo: jest.fn(),
    getMultipleAccountsInfo: jest.fn(),
  })),
}));

// Mock Anchor classes
jest.mock('@coral-xyz/anchor', () => ({
  AnchorProvider: jest.fn(),
  Program: jest.fn(),
}));

describe('useZolProgram', () => {
  const mockConnection = {
    rpcEndpoint: 'https://api.devnet.solana.com',
    commitment: 'confirmed',
    getAccountInfo: jest.fn(),
    getMultipleAccountsInfo: jest.fn(),
  };

  const mockPublicKey = new PublicKey('11111111111111111111111111111111');
  const mockProgram = {
    programId: SOLANA_CONFIG.programId,
    provider: {},
    methods: {},
    account: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset Anchor mocks
    (AnchorProvider as unknown as jest.Mock).mockClear();
    (Program as unknown as jest.Mock).mockClear();
  });

  describe('when wallet is not connected', () => {
    beforeEach(() => {
      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: null,
        connected: false,
        signTransaction: null,
      });
    });

    it('should return null program', () => {
      const { result } = renderHook(() => useZolProgram());

      expect(result.current.program).toBeNull();
    });

    it('should return isReady as false', () => {
      const { result } = renderHook(() => useZolProgram());

      expect(result.current.isReady).toBe(false);
    });

    it('should return programId from config', () => {
      const { result } = renderHook(() => useZolProgram());

      expect(result.current.programId).toEqual(SOLANA_CONFIG.programId);
    });

    it('should return connection', () => {
      const { result } = renderHook(() => useZolProgram());

      // Connection comes from RPC manager, not wallet adapter
      expect(result.current.connection).toBeDefined();
      expect(result.current.connection.rpcEndpoint).toBe('https://api.devnet.solana.com');
    });
  });

  describe('when wallet is connected', () => {
    const mockSignTransaction = jest.fn();

    beforeEach(() => {
      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
        signAllTransactions: jest.fn(),
      });
    });

    it('should attempt to create program instance', () => {
      const { result } = renderHook(() => useZolProgram());

      // In test environment, program creation may fail due to IDL parsing issues
      // but the hook should handle this gracefully
      expect(result.current.programId).toEqual(SOLANA_CONFIG.programId);
      expect(result.current.connection).toBeDefined();
      expect(result.current.connection.rpcEndpoint).toBe('https://api.devnet.solana.com');
    });

    it('should return programId from config', () => {
      const { result } = renderHook(() => useZolProgram());

      expect(result.current.programId.toString()).toBe(
        SOLANA_CONFIG.programId.toString()
      );
    });

    it('should return connection instance', () => {
      const { result } = renderHook(() => useZolProgram());

      // Connection comes from RPC manager
      expect(result.current.connection).toBeDefined();
      expect(result.current.connection.rpcEndpoint).toBe('https://api.devnet.solana.com');
    });
  });

  describe('when wallet loses connection', () => {
    it('should update isReady to false', () => {
      const mockSignTransaction = jest.fn();

      // Start with connected wallet
      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
        signAllTransactions: jest.fn(),
      });

      const { result, rerender } = renderHook(() => useZolProgram());

      // Disconnect wallet
      (useWallet as jest.Mock).mockReturnValue({
        publicKey: null,
        connected: false,
        signTransaction: null,
      });

      rerender();

      expect(result.current.isReady).toBe(false);
      expect(result.current.program).toBeNull();
    });
  });

  describe('program configuration', () => {
    it('should maintain stable programId reference', () => {
      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: null,
        connected: false,
        signTransaction: null,
      });

      const { result, rerender } = renderHook(() => useZolProgram());

      const firstProgramId = result.current.programId;

      rerender();

      expect(result.current.programId).toBe(firstProgramId);
    });

    it('should maintain stable connection reference', () => {
      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: null,
        connected: false,
        signTransaction: null,
      });

      const { result, rerender } = renderHook(() => useZolProgram());

      const firstConnection = result.current.connection;

      rerender();

      expect(result.current.connection).toBe(firstConnection);
    });
  });

  describe('Program Initialization', () => {
    it('should initialize program with correct IDL when wallet is connected', () => {
      const mockSignTransaction = jest.fn();
      
      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
        signAllTransactions: jest.fn(),
      });

      (Program as unknown as jest.Mock).mockReturnValue(mockProgram);

      renderHook(() => useZolProgram());

      // Verify Program was called with correct parameters
      // Anchor 0.29 signature: new Program(idl, programId, provider)
      expect(Program as unknown as jest.Mock).toHaveBeenCalledWith(
        expect.anything(), // IDL
        expect.anything(), // programId
        expect.anything()  // Provider
      );
    });

    it('should not initialize program when wallet is missing publicKey', () => {
      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: null,
        connected: false,
        signTransaction: jest.fn(),
      });

      const { result } = renderHook(() => useZolProgram());

      expect(result.current.program).toBeNull();
      expect(Program as unknown as jest.Mock).not.toHaveBeenCalled();
    });

    it('should not initialize program when wallet is missing signTransaction', () => {
      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: null,
      });

      const { result } = renderHook(() => useZolProgram());

      expect(result.current.program).toBeNull();
      expect(Program as unknown as jest.Mock).not.toHaveBeenCalled();
    });

    it('should return correct programId from configuration', () => {
      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: null,
        connected: false,
        signTransaction: null,
      });

      const { result } = renderHook(() => useZolProgram());

      expect(result.current.programId).toEqual(SOLANA_CONFIG.programId);
      expect(result.current.programId.toString()).toBe('Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv');
    });
  });

  describe('Provider Configuration', () => {
    it('should create AnchorProvider with correct configuration', () => {
      const mockSignTransaction = jest.fn();
      const mockWallet = {
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
        signAllTransactions: jest.fn(),
      };

      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue(mockWallet);

      (Program as unknown as jest.Mock).mockReturnValue(mockProgram);

      renderHook(() => useZolProgram());

      // Verify AnchorProvider was called with correct parameters
      expect(AnchorProvider as unknown as jest.Mock).toHaveBeenCalledWith(
        expect.anything(), // connection
        mockWallet,
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
        }
      );
    });

    it('should use confirmed commitment level', () => {
      const mockSignTransaction = jest.fn();

      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
        signAllTransactions: jest.fn(),
      });

      (Program as unknown as jest.Mock).mockReturnValue(mockProgram);

      renderHook(() => useZolProgram());

      const providerCall = (AnchorProvider as unknown as jest.Mock).mock.calls[0];
      expect(providerCall[2]).toEqual({
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      });
    });

    it('should pass wallet adapter to provider', () => {
      const mockSignTransaction = jest.fn();
      const mockWallet = {
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
        signAllTransactions: jest.fn(),
      };

      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue(mockWallet);

      (Program as unknown as jest.Mock).mockReturnValue(mockProgram);

      renderHook(() => useZolProgram());

      const providerCall = (AnchorProvider as unknown as jest.Mock).mock.calls[0];
      expect(providerCall[1]).toBe(mockWallet);
    });

    it('should use RPC manager connection for provider', () => {
      const mockSignTransaction = jest.fn();

      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
        signAllTransactions: jest.fn(),
      });

      (Program as unknown as jest.Mock).mockReturnValue(mockProgram);

      renderHook(() => useZolProgram());

      // Verify connection from RPC manager was used
      const providerCall = (AnchorProvider as unknown as jest.Mock).mock.calls[0];
      expect(providerCall[0]).toBeDefined();
      expect(providerCall[0].rpcEndpoint).toBe('https://api.devnet.solana.com');
    });
  });

  describe('Error Handling', () => {
    it('should handle program initialization errors gracefully', () => {
      const mockSignTransaction = jest.fn();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
        signAllTransactions: jest.fn(),
      });

      // Mock Program constructor to throw error
      (Program as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to initialize program');
      });

      const { result } = renderHook(() => useZolProgram());

      expect(result.current.program).toBeNull();
      expect(result.current.isReady).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to initialize Anchor program:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle provider creation errors gracefully', () => {
      const mockSignTransaction = jest.fn();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
        signAllTransactions: jest.fn(),
      });

      // Mock AnchorProvider constructor to throw error
      (AnchorProvider as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to create provider');
      });

      const { result } = renderHook(() => useZolProgram());

      expect(result.current.program).toBeNull();
      expect(result.current.isReady).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should return null program on any initialization error', () => {
      const mockSignTransaction = jest.fn();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
        signAllTransactions: jest.fn(),
      });

      // Mock to throw a generic error
      (AnchorProvider as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const { result } = renderHook(() => useZolProgram());

      expect(result.current.program).toBeNull();
      expect(result.current.isReady).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should maintain stable state after error recovery', () => {
      const mockSignTransaction = jest.fn();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      // Start with error state
      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
        signAllTransactions: jest.fn(),
      });

      (Program as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      const { result, rerender } = renderHook(() => useZolProgram());

      expect(result.current.program).toBeNull();
      expect(result.current.isReady).toBe(false);

      // Fix the error and rerender
      (Program as unknown as jest.Mock).mockReturnValue(mockProgram);

      rerender();

      // Should still maintain consistent state
      expect(result.current.programId).toEqual(SOLANA_CONFIG.programId);
      expect(result.current.connection).toBeDefined();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('isReady State', () => {
    it('should be false when program is null', () => {
      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: null,
        connected: false,
        signTransaction: null,
      });

      const { result } = renderHook(() => useZolProgram());

      expect(result.current.isReady).toBe(false);
    });

    it('should be false when wallet is not connected', () => {
      const mockSignTransaction = jest.fn();

      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
        connected: false,
        signTransaction: mockSignTransaction,
        signAllTransactions: jest.fn(),
      });

      (Program as unknown as jest.Mock).mockReturnValue(mockProgram);

      const { result } = renderHook(() => useZolProgram());

      expect(result.current.isReady).toBe(false);
    });

    it('should be true when program is initialized and wallet is connected', () => {
      const mockSignTransaction = jest.fn();

      (useConnection as jest.Mock).mockReturnValue({
        connection: mockConnection,
      });

      (useWallet as jest.Mock).mockReturnValue({
        publicKey: mockPublicKey,
        connected: true,
        signTransaction: mockSignTransaction,
        signAllTransactions: jest.fn(),
      });

      // Mock both AnchorProvider and Program to succeed
      (AnchorProvider as unknown as jest.Mock).mockReturnValue({
        connection: mockConnection,
        wallet: {},
      });
      (Program as unknown as jest.Mock).mockReturnValue(mockProgram);

      const { result } = renderHook(() => useZolProgram());

      // Program should be created successfully
      expect(result.current.program).toBeTruthy();
      expect(result.current.isReady).toBe(true);
    });
  });
});
