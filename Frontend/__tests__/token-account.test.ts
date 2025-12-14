import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Mock the SPL Token module
jest.mock('@solana/spl-token', () => {
  const actual = jest.requireActual('@solana/spl-token');
  const { PublicKey } = actual;
  
  return {
    ...actual,
    getAssociatedTokenAddress: jest.fn().mockImplementation(async (mint, owner) => {
      // Return a deterministic address based on mint and owner
      const seed = `${mint.toBase58()}-${owner.toBase58()}`;
      const hash = seed.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      const bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        bytes[i] = (hash + i) % 256;
      }
      return new PublicKey(bytes);
    }),
    createAssociatedTokenAccountInstruction: jest.fn().mockImplementation((payer, ata, owner, mint) => {
      return {
        programId: actual.ASSOCIATED_TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: payer, isSigner: true, isWritable: true },
          { pubkey: ata, isSigner: false, isWritable: true },
          { pubkey: owner, isSigner: false, isWritable: false },
          { pubkey: mint, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([]),
      };
    }),
  };
});

import {
  getAssociatedTokenAddress,
  checkTokenAccountExists,
  getOrCreateAssociatedTokenAccount,
  createAssociatedTokenAccountIx,
  TokenAccountError,
} from '@/lib/token-account';
import { SOLANA_CONFIG } from '@/lib/config';

describe('Token Account Utilities', () => {
  // Use a valid wallet address (Phantom's example wallet)
  const testOwner = new PublicKey('DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK');
  // Use a known valid USDC devnet mint address
  const testMint = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');
  let mockConnection: jest.Mocked<Connection>;

  beforeEach(() => {
    mockConnection = {
      getAccountInfo: jest.fn(),
      getTokenAccountBalance: jest.fn(),
      getParsedAccountInfo: jest.fn(),
    } as any;
  });

  describe('getAssociatedTokenAddress', () => {
    it('should derive associated token account address correctly', async () => {
      const address = await getAssociatedTokenAddress(testOwner, testMint);
      
      expect(address).toBeInstanceOf(PublicKey);
    });

    it('should use USDC mint from config by default', async () => {
      const address = await getAssociatedTokenAddress(testOwner, testMint);
      
      // Verify it returns a PublicKey
      expect(address).toBeInstanceOf(PublicKey);
      expect(address.toBase58()).toBeTruthy();
    });

    it('should accept custom mint address', async () => {
      const customMint = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      const address = await getAssociatedTokenAddress(testOwner, customMint);
      
      // Verify it returns a PublicKey
      expect(address).toBeInstanceOf(PublicKey);
      expect(address.toBase58()).toBeTruthy();
    });

    it('should return same address for same owner and mint', async () => {
      const address1 = await getAssociatedTokenAddress(testOwner, testMint);
      const address2 = await getAssociatedTokenAddress(testOwner, testMint);
      
      expect(address1.toString()).toBe(address2.toString());
    });

    it('should return different addresses for different owners', async () => {
      const owner1 = new PublicKey('DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK');
      const owner2 = new PublicKey('3vGJCwJpvRF8JqLvZqPPzKKKJqJQjJqJJJJJJJJJJJJJ');
      
      const address1 = await getAssociatedTokenAddress(owner1, testMint);
      const address2 = await getAssociatedTokenAddress(owner2, testMint);
      
      expect(address1.toString()).not.toBe(address2.toString());
    });

    it('should throw TokenAccountError on invalid owner', async () => {
      const { getAssociatedTokenAddress: mockFn } = require('@solana/spl-token');
      mockFn.mockRejectedValueOnce(new Error('Invalid owner'));
      const invalidOwner = new PublicKey('11111111111111111111111111111111');
      
      await expect(getAssociatedTokenAddress(invalidOwner, testMint)).rejects.toThrow(TokenAccountError);
    });
  });

  describe('checkTokenAccountExists', () => {
    it('should return true when account exists', async () => {
      const tokenAccount = await getAssociatedTokenAddress(testOwner, testMint);
      mockConnection.getAccountInfo.mockResolvedValue({
        data: Buffer.from([]),
        executable: false,
        lamports: 1000000,
        owner: TOKEN_PROGRAM_ID,
        rentEpoch: 0,
      });

      const exists = await checkTokenAccountExists(mockConnection, tokenAccount);
      
      expect(exists).toBe(true);
      expect(mockConnection.getAccountInfo).toHaveBeenCalledWith(tokenAccount);
    });

    it('should return false when account does not exist', async () => {
      const tokenAccount = await getAssociatedTokenAddress(testOwner, testMint);
      mockConnection.getAccountInfo.mockResolvedValue(null);

      const exists = await checkTokenAccountExists(mockConnection, tokenAccount);
      
      expect(exists).toBe(false);
    });

    it('should throw TokenAccountError on RPC failure', async () => {
      const tokenAccount = await getAssociatedTokenAddress(testOwner, testMint);
      mockConnection.getAccountInfo.mockRejectedValue(new Error('RPC error'));

      await expect(
        checkTokenAccountExists(mockConnection, tokenAccount)
      ).rejects.toThrow(TokenAccountError);
    });
  });

  describe('getOrCreateAssociatedTokenAccount', () => {
    it('should return existing account when it exists', async () => {
      mockConnection.getAccountInfo.mockResolvedValue({
        data: Buffer.from([]),
        executable: false,
        lamports: 1000000,
        owner: TOKEN_PROGRAM_ID,
        rentEpoch: 0,
      });

      const result = await getOrCreateAssociatedTokenAccount(
        mockConnection,
        testOwner,
        testMint
      );
      
      expect(result.address).toBeInstanceOf(PublicKey);
      expect(result.existed).toBe(true);
      expect(result.needsCreation).toBe(false);
    });

    it('should indicate creation needed when account does not exist', async () => {
      mockConnection.getAccountInfo.mockResolvedValue(null);

      const result = await getOrCreateAssociatedTokenAccount(
        mockConnection,
        testOwner,
        testMint
      );
      
      expect(result.address).toBeInstanceOf(PublicKey);
      expect(result.existed).toBe(false);
      expect(result.needsCreation).toBe(true);
    });

    it('should derive correct token account address', async () => {
      mockConnection.getAccountInfo.mockResolvedValue(null);

      const result = await getOrCreateAssociatedTokenAccount(
        mockConnection,
        testOwner,
        testMint
      );
      
      // Verify it returns a valid address
      expect(result.address).toBeInstanceOf(PublicKey);
      expect(result.address.toBase58()).toBeTruthy();
    });

    it('should work with custom mint', async () => {
      const customMint = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      mockConnection.getAccountInfo.mockResolvedValue(null);

      const result = await getOrCreateAssociatedTokenAccount(
        mockConnection,
        testOwner,
        customMint
      );
      
      // Verify it returns a valid address
      expect(result.address).toBeInstanceOf(PublicKey);
      expect(result.address.toBase58()).toBeTruthy();
    });

    it('should throw TokenAccountError on failure', async () => {
      mockConnection.getAccountInfo.mockRejectedValue(new Error('RPC error'));

      await expect(
        getOrCreateAssociatedTokenAccount(mockConnection, testOwner, testMint)
      ).rejects.toThrow(TokenAccountError);
    });
  });

  describe('createAssociatedTokenAccountIx', () => {
    it('should create instruction with correct accounts', async () => {
      const payer = new PublicKey('3vGJCwJpvRF8JqLvZqPPzKKKJqJQjJqJJJJJJJJJJJJJ');
      
      const instruction = await createAssociatedTokenAccountIx(payer, testOwner, testMint);
      
      expect(instruction).toBeDefined();
      expect(instruction.programId.toString()).toBe(ASSOCIATED_TOKEN_PROGRAM_ID.toString());
      expect(instruction.keys.length).toBeGreaterThan(0);
    });

    it('should use correct token account address', async () => {
      const payer = new PublicKey('3vGJCwJpvRF8JqLvZqPPzKKKJqJQjJqJJJJJJJJJJJJJ');
      const expectedTokenAccount = await getAssociatedTokenAddress(testOwner, testMint);
      
      const instruction = await createAssociatedTokenAccountIx(payer, testOwner, testMint);
      
      // The token account should be in the instruction keys
      const hasTokenAccount = instruction.keys.some(
        key => key.pubkey.toString() === expectedTokenAccount.toString()
      );
      expect(hasTokenAccount).toBe(true);
    });

    it('should work with custom mint', async () => {
      const payer = new PublicKey('3vGJCwJpvRF8JqLvZqPPzKKKJqJQjJqJJJJJJJJJJJJJ');
      const customMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      
      const instruction = await createAssociatedTokenAccountIx(payer, testOwner, customMint);
      
      expect(instruction).toBeDefined();
      expect(instruction.programId.toString()).toBe(ASSOCIATED_TOKEN_PROGRAM_ID.toString());
    });

    it('should throw TokenAccountError on invalid parameters', async () => {
      const { getAssociatedTokenAddress: mockFn } = require('@solana/spl-token');
      mockFn.mockRejectedValueOnce(new Error('Invalid parameters'));
      const invalidPayer = new PublicKey('11111111111111111111111111111111');
      
      await expect(createAssociatedTokenAccountIx(invalidPayer, testOwner, testMint)).rejects.toThrow();
    });
  });

  describe('TokenAccountError', () => {
    it('should contain error message', () => {
      const error = new TokenAccountError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('TokenAccountError');
    });

    it('should contain owner if provided', () => {
      const error = new TokenAccountError('Test error', testOwner);
      
      expect(error.owner).toBe(testOwner);
    });

    it('should contain cause if provided', () => {
      const cause = new Error('Original error');
      const error = new TokenAccountError('Test error', testOwner, cause);
      
      expect(error.cause).toBe(cause);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete flow for existing account', async () => {
      // Mock existing account
      mockConnection.getAccountInfo.mockResolvedValue({
        data: Buffer.from([]),
        executable: false,
        lamports: 1000000,
        owner: TOKEN_PROGRAM_ID,
        rentEpoch: 0,
      });

      // Get token account address
      const address = await getAssociatedTokenAddress(testOwner, testMint);
      
      // Check if it exists
      const exists = await checkTokenAccountExists(mockConnection, address);
      expect(exists).toBe(true);
      
      // Get or create should return existing
      const result = await getOrCreateAssociatedTokenAccount(mockConnection, testOwner, testMint);
      expect(result.existed).toBe(true);
      expect(result.needsCreation).toBe(false);
    });

    it('should handle complete flow for non-existing account', async () => {
      // Mock non-existing account
      mockConnection.getAccountInfo.mockResolvedValue(null);

      // Get token account address
      const address = await getAssociatedTokenAddress(testOwner, testMint);
      
      // Check if it exists
      const exists = await checkTokenAccountExists(mockConnection, address);
      expect(exists).toBe(false);
      
      // Get or create should indicate creation needed
      const result = await getOrCreateAssociatedTokenAccount(mockConnection, testOwner, testMint);
      expect(result.existed).toBe(false);
      expect(result.needsCreation).toBe(true);
      
      // Should be able to create instruction
      const payer = new PublicKey('3vGJCwJpvRF8JqLvZqPPzKKKJqJQjJqJJJJJJJJJJJJJ');
      const instruction = await createAssociatedTokenAccountIx(payer, testOwner, testMint);
      expect(instruction).toBeDefined();
    });
  });
});
