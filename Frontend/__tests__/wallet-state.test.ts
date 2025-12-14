import { renderHook, act, waitFor } from '@testing-library/react';
import { formatWalletError, useWalletState } from '@/hooks/use-wallet-state';
import { WalletError } from '@solana/wallet-adapter-base';
import { useWallet } from '@solana/wallet-adapter-react';
import * as fc from 'fast-check';

// Mock dependencies
jest.mock('@solana/wallet-adapter-react');
jest.mock('@/lib/logger');
jest.mock('@/lib/error-tracker');

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

describe('Wallet State Management', () => {
  describe('formatWalletError', () => {
    it('should return empty string for null error', () => {
      expect(formatWalletError(null)).toBe('');
    });

    it('should format user rejection errors', () => {
      const error = new Error('User rejected the request');
      expect(formatWalletError(error)).toBe('Connection request was rejected');
    });

    it('should format wallet not found errors', () => {
      const error = new Error('Wallet not found');
      expect(formatWalletError(error)).toBe('Wallet not found. Please install a Solana wallet.');
    });

    it('should format wallet not installed errors', () => {
      const error = new Error('Wallet not installed');
      expect(formatWalletError(error)).toBe('Wallet not found. Please install a Solana wallet.');
    });

    it('should format network errors', () => {
      const networkError = new Error('network timeout');
      expect(formatWalletError(networkError)).toBe('Network error. Please check your connection and try again.');
    });

    it('should format timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      expect(formatWalletError(timeoutError)).toBe('Network error. Please check your connection and try again.');
    });

    it('should return error message for generic errors', () => {
      const error = new Error('Something went wrong');
      expect(formatWalletError(error)).toBe('Something went wrong');
    });

    it('should handle WalletError with nested error', () => {
      const walletError = {
        name: 'WalletError',
        message: 'Wallet error occurred',
        error: new Error('Connection failed'),
      } as WalletError;
      
      expect(formatWalletError(walletError)).toBe('Connection failed');
    });

    it('should return unknown error message for errors without message', () => {
      const error = {} as Error;
      expect(formatWalletError(error)).toBe('An unknown error occurred');
    });
  });

  describe('Property-Based Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    /**
     * Feature: solana-integration, Property 2: Wallet connection failure triggers error handling
     * 
     * For any wallet connection failure, the system should display an error message 
     * and provide a retry mechanism.
     * 
     * Validates: Requirements 1.4
     */
    describe('Property 2: Wallet connection failure triggers error handling', () => {
      it('should set error state for any connection failure', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), // Generate non-empty error messages
            async (errorMessage) => {
              // Setup: Mock wallet that will fail to connect
              const mockConnect = jest.fn().mockRejectedValue(new Error(errorMessage));
              mockUseWallet.mockReturnValue({
                connected: false,
                connecting: false,
                disconnecting: false,
                publicKey: null,
                connect: mockConnect,
                disconnect: jest.fn(),
                wallet: null,
                wallets: [],
                select: jest.fn(),
                signTransaction: jest.fn(),
                signAllTransactions: jest.fn(),
                signMessage: jest.fn(),
              } as any);

              // Render hook
              const { result } = renderHook(() => useWalletState());

              // Act: Attempt to connect wallet (should fail)
              let caughtError: Error | null = null;
              await act(async () => {
                try {
                  await result.current.connectWallet();
                } catch (error) {
                  // Expected to throw - error is set before throw
                  caughtError = error as Error;
                }
              });

              // Assert: Error should have been thrown and state should be set
              expect(caughtError).not.toBeNull();
              expect(caughtError?.message).toBe(errorMessage);
              
              // State should be updated after act completes
              expect(result.current.hasError).toBe(true);
              expect(result.current.error).not.toBeNull();
              expect(result.current.error?.message).toBe(errorMessage);
            }
          ),
          { numRuns: 100 } // Run 100 iterations as specified in design doc
        );
      });

      it('should provide retry mechanism by allowing clearError', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            async (errorMessage) => {
              // Setup: Mock wallet that fails
              const mockConnect = jest.fn().mockRejectedValue(new Error(errorMessage));
              mockUseWallet.mockReturnValue({
                connected: false,
                connecting: false,
                disconnecting: false,
                publicKey: null,
                connect: mockConnect,
                disconnect: jest.fn(),
                wallet: null,
                wallets: [],
                select: jest.fn(),
                signTransaction: jest.fn(),
                signAllTransactions: jest.fn(),
                signMessage: jest.fn(),
              } as any);

              const { result } = renderHook(() => useWalletState());

              // Act: Fail connection
              await act(async () => {
                try {
                  await result.current.connectWallet();
                } catch (error) {
                  // Expected
                }
              });

              // Verify error is set
              expect(result.current.hasError).toBe(true);

              // Act: Clear error (retry mechanism)
              await act(async () => {
                result.current.clearError();
              });

              // Assert: Error should be cleared, allowing retry
              expect(result.current.hasError).toBe(false);
              expect(result.current.error).toBeNull();
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    /**
     * Feature: solana-integration, Property 3: Wallet disconnection clears state
     * 
     * For any wallet disconnection action, all wallet-related state should be cleared 
     * and the UI should return to the disconnected view.
     * 
     * Validates: Requirements 1.5
     */
    describe('Property 3: Wallet disconnection clears state', () => {
      it('should clear all wallet state on disconnection', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 32, maxLength: 44 }), // Generate random wallet addresses
            async (walletAddress) => {
              // Setup: Mock connected wallet
              const mockPublicKey = {
                toBase58: () => walletAddress,
                toBuffer: () => Buffer.from(walletAddress),
                toString: () => walletAddress,
              };

              // Start with connected state
              mockUseWallet.mockReturnValue({
                connected: true,
                connecting: false,
                disconnecting: false,
                publicKey: mockPublicKey as any,
                connect: jest.fn(),
                disconnect: jest.fn().mockResolvedValue(undefined),
                wallet: null,
                wallets: [],
                select: jest.fn(),
                signTransaction: jest.fn(),
                signAllTransactions: jest.fn(),
                signMessage: jest.fn(),
              } as any);

              const { result, rerender } = renderHook(() => useWalletState());

              // Verify initial connected state
              expect(result.current.connected).toBe(true);
              expect(result.current.address).toBe(walletAddress);

              // Act: Disconnect wallet
              await act(async () => {
                await result.current.disconnectWallet();
              });

              // Simulate wallet adapter state change to disconnected
              mockUseWallet.mockReturnValue({
                connected: false,
                connecting: false,
                disconnecting: false,
                publicKey: null,
                connect: jest.fn(),
                disconnect: jest.fn(),
                wallet: null,
                wallets: [],
                select: jest.fn(),
                signTransaction: jest.fn(),
                signAllTransactions: jest.fn(),
                signMessage: jest.fn(),
              } as any);

              // Trigger re-render to apply state change
              rerender();

              // Assert: All wallet state should be cleared
              expect(result.current.connected).toBe(false);
              expect(result.current.address).toBeNull();
              expect(result.current.error).toBeNull();
              expect(result.current.hasError).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should clear error state on disconnection even if error was present', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.tuple(
              fc.string({ minLength: 32, maxLength: 44 }), // wallet address
              fc.string({ minLength: 1 }).filter(s => s.trim().length > 0) // error message
            ),
            async ([walletAddress, errorMessage]) => {
              // Setup: Mock connected wallet with an error
              const mockPublicKey = {
                toBase58: () => walletAddress,
                toBuffer: () => Buffer.from(walletAddress),
                toString: () => walletAddress,
              };

              mockUseWallet.mockReturnValue({
                connected: true,
                connecting: false,
                disconnecting: false,
                publicKey: mockPublicKey as any,
                connect: jest.fn(),
                disconnect: jest.fn().mockResolvedValue(undefined),
                wallet: null,
                wallets: [],
                select: jest.fn(),
                signTransaction: jest.fn(),
                signAllTransactions: jest.fn(),
                signMessage: jest.fn(),
              } as any);

              const { result, rerender } = renderHook(() => useWalletState());

              // Simulate an error occurring while connected
              const mockConnect = jest.fn().mockRejectedValue(new Error(errorMessage));
              mockUseWallet.mockReturnValue({
                connected: true,
                connecting: false,
                disconnecting: false,
                publicKey: mockPublicKey as any,
                connect: mockConnect,
                disconnect: jest.fn().mockResolvedValue(undefined),
                wallet: null,
                wallets: [],
                select: jest.fn(),
                signTransaction: jest.fn(),
                signAllTransactions: jest.fn(),
                signMessage: jest.fn(),
              } as any);

              rerender();

              // Try to connect (will fail and set error)
              await act(async () => {
                try {
                  await result.current.connectWallet();
                } catch (error) {
                  // Expected
                }
              });

              // Verify error is present
              expect(result.current.hasError).toBe(true);

              // Act: Disconnect wallet
              mockUseWallet.mockReturnValue({
                connected: false,
                connecting: false,
                disconnecting: false,
                publicKey: null,
                connect: jest.fn(),
                disconnect: jest.fn(),
                wallet: null,
                wallets: [],
                select: jest.fn(),
                signTransaction: jest.fn(),
                signAllTransactions: jest.fn(),
                signMessage: jest.fn(),
              } as any);

              rerender();

              // Assert: Error should be cleared on disconnection
              expect(result.current.connected).toBe(false);
              expect(result.current.error).toBeNull();
              expect(result.current.hasError).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
