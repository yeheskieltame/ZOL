import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress as getAssociatedTokenAddressAsync,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { SOLANA_CONFIG, GAME_CONSTANTS } from './config';
import { withCache, CacheKeys, invalidateCache } from './cache';
import { executeRPCWithFallback } from './rpc-manager';

/**
 * Token Account Utilities
 * 
 * This module provides helper functions for managing USDC token accounts,
 * including checking for existence and creating associated token accounts.
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

/**
 * Error thrown when token account operations fail
 */
export class TokenAccountError extends Error {
  constructor(
    message: string,
    public readonly owner?: PublicKey,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'TokenAccountError';
  }
}

/**
 * Result of checking/creating a token account
 */
export interface TokenAccountResult {
  /** The token account address */
  address: PublicKey;
  /** Whether the account already existed */
  existed: boolean;
  /** Whether a creation instruction was added to the transaction */
  needsCreation: boolean;
}

/**
 * Derives the associated token account address for a user's USDC account
 * 
 * Associated token accounts are deterministically derived from the owner's
 * public key and the token mint address.
 * 
 * @param owner - The wallet public key that owns the token account
 * @param mint - The USDC mint address (optional, defaults to config)
 * @returns Promise resolving to the associated token account address
 * @throws {TokenAccountError} If derivation fails
 * 
 * **Validates: Requirements 13.3**
 */
export async function getAssociatedTokenAddress(
  owner: PublicKey,
  mint: PublicKey = SOLANA_CONFIG.usdcMint
): Promise<PublicKey> {
  try {
    return await getAssociatedTokenAddressAsync(
      mint,
      owner,
      true, // allowOwnerOffCurve - allow any owner address
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
  } catch (error) {
    throw new TokenAccountError(
      `Failed to derive associated token account address for owner ${owner.toBase58()}`,
      owner,
      error
    );
  }
}

/**
 * Checks if a token account exists on-chain with caching
 * 
 * @param connection - Solana RPC connection
 * @param tokenAccount - The token account address to check
 * @param owner - The owner public key (for cache key)
 * @param mint - The mint public key (for cache key)
 * @returns true if the account exists, false otherwise
 * @throws {TokenAccountError} If the check fails
 * 
 * **Validates: Requirements 13.1**
 */
export async function checkTokenAccountExists(
  connection: Connection,
  tokenAccount: PublicKey,
  owner?: PublicKey,
  mint?: PublicKey
): Promise<boolean> {
  try {
    // Use cache if owner and mint are provided (30s TTL)
    if (owner && mint) {
      const result = await withCache(
        CacheKeys.tokenAccount(owner.toBase58(), mint.toBase58()),
        async () => {
          const accountInfo = await executeRPCWithFallback((conn) =>
            conn.getAccountInfo(tokenAccount)
          );
          return accountInfo !== null;
        },
        {
          ttl: GAME_CONSTANTS.CACHE_TTL.TOKEN_ACCOUNTS,
          staleWhileRevalidate: true,
        }
      );
      return result.data;
    }

    // No caching if owner/mint not provided, but use RPC fallback
    const accountInfo = await executeRPCWithFallback((conn) =>
      conn.getAccountInfo(tokenAccount)
    );
    return accountInfo !== null;
  } catch (error) {
    throw new TokenAccountError(
      `Failed to check if token account ${tokenAccount.toBase58()} exists`,
      undefined,
      error
    );
  }
}

/**
 * Gets or creates an associated token account for USDC with caching
 * 
 * This function checks if the user has a USDC associated token account.
 * If the account doesn't exist, it returns information needed to create it.
 * 
 * @param connection - Solana RPC connection
 * @param owner - The wallet public key that will own the token account
 * @param mint - The USDC mint address (optional, defaults to config)
 * @returns TokenAccountResult with account address and creation status
 * @throws {TokenAccountError} If the operation fails
 * 
 * **Validates: Requirements 13.1, 13.2, 13.3, 13.5**
 */
export async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey = SOLANA_CONFIG.usdcMint
): Promise<TokenAccountResult> {
  try {
    // Derive the associated token account address
    const tokenAccount = await getAssociatedTokenAddress(owner, mint);
    
    // Check if the account already exists (with caching)
    const exists = await checkTokenAccountExists(connection, tokenAccount, owner, mint);
    
    if (exists) {
      // Account exists, skip creation
      return {
        address: tokenAccount,
        existed: true,
        needsCreation: false,
      };
    }
    
    // Account doesn't exist, needs creation
    return {
      address: tokenAccount,
      existed: false,
      needsCreation: true,
    };
  } catch (error) {
    if (error instanceof TokenAccountError) {
      throw error;
    }
    throw new TokenAccountError(
      `Failed to get or create associated token account for owner ${owner.toBase58()}`,
      owner,
      error
    );
  }
}

/**
 * Creates an instruction to create an associated token account
 * 
 * This instruction should be added to a transaction before any token transfer
 * instructions if the token account doesn't exist.
 * 
 * @param payer - The account that will pay for the account creation
 * @param owner - The wallet that will own the token account
 * @param mint - The USDC mint address (optional, defaults to config)
 * @returns The create account instruction
 * @throws {TokenAccountError} If instruction creation fails
 * 
 * **Validates: Requirements 13.4**
 */
export async function createAssociatedTokenAccountIx(
  payer: PublicKey,
  owner: PublicKey,
  mint: PublicKey = SOLANA_CONFIG.usdcMint
): Promise<ReturnType<typeof createAssociatedTokenAccountInstruction>> {
  try {
    const tokenAccount = await getAssociatedTokenAddress(owner, mint);
    
    return createAssociatedTokenAccountInstruction(
      payer,
      tokenAccount,
      owner,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
  } catch (error) {
    throw new TokenAccountError(
      `Failed to create associated token account instruction for owner ${owner.toBase58()}`,
      owner,
      error
    );
  }
}

/**
 * Prepares a transaction with token account creation if needed
 * 
 * This is a convenience function that checks if a token account exists
 * and adds the creation instruction to the transaction if needed.
 * 
 * @param connection - Solana RPC connection
 * @param transaction - The transaction to add the instruction to
 * @param payer - The account that will pay for the account creation
 * @param owner - The wallet that will own the token account
 * @param mint - The USDC mint address (optional, defaults to config)
 * @returns TokenAccountResult with account info and whether instruction was added
 * @throws {TokenAccountError} If the operation fails
 * 
 * **Validates: Requirements 13.2, 13.4, 13.5**
 */
export async function ensureTokenAccount(
  connection: Connection,
  transaction: Transaction,
  payer: PublicKey,
  owner: PublicKey,
  mint: PublicKey = SOLANA_CONFIG.usdcMint
): Promise<TokenAccountResult> {
  const result = await getOrCreateAssociatedTokenAccount(connection, owner, mint);
  
  if (result.needsCreation) {
    // Add the creation instruction to the transaction
    const createIx = await createAssociatedTokenAccountIx(payer, owner, mint);
    transaction.add(createIx);
  }
  
  return result;
}

/**
 * Gets the USDC balance of a token account with caching
 * 
 * @param connection - Solana RPC connection
 * @param tokenAccount - The token account address
 * @returns The balance in lamports (6 decimals for USDC), or 0 if account doesn't exist
 * @throws {TokenAccountError} If fetching balance fails for reasons other than account not existing
 */
export async function getTokenBalance(
  connection: Connection,
  tokenAccount: PublicKey
): Promise<bigint> {
  try {
    // Cache token balance with shorter TTL (5s) since it changes frequently
    const result = await withCache(
      CacheKeys.tokenBalance(tokenAccount.toBase58()),
      async () => {
        try {
          const balance = await executeRPCWithFallback((conn) =>
            conn.getTokenAccountBalance(tokenAccount)
          );
          return BigInt(balance.value.amount);
        } catch (error) {
          // Check if error is because account doesn't exist
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('could not find account') || 
              errorMessage.includes('Invalid param') ||
              errorMessage.includes('AccountNotFound')) {
            // Account doesn't exist, return 0 balance
            return 0n;
          }
          throw error;
        }
      },
      {
        ttl: GAME_CONSTANTS.CACHE_TTL.USER_POSITION, // 5s TTL
        staleWhileRevalidate: true,
      }
    );
    return result.data;
  } catch (error) {
    // Also check at outer level for account not found errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('could not find account') || 
        errorMessage.includes('Invalid param') ||
        errorMessage.includes('AccountNotFound')) {
      return 0n;
    }
    throw new TokenAccountError(
      `Failed to get token balance for account ${tokenAccount.toBase58()}`,
      undefined,
      error
    );
  }
}

/**
 * Validates that a token account is owned by the expected owner
 * 
 * @param connection - Solana RPC connection
 * @param tokenAccount - The token account address
 * @param expectedOwner - The expected owner public key
 * @returns true if the owner matches
 * @throws {TokenAccountError} If validation fails
 */
export async function validateTokenAccountOwner(
  connection: Connection,
  tokenAccount: PublicKey,
  expectedOwner: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await executeRPCWithFallback((conn) =>
      conn.getParsedAccountInfo(tokenAccount)
    );
    
    if (!accountInfo.value) {
      throw new TokenAccountError(
        `Token account ${tokenAccount.toBase58()} does not exist`,
        expectedOwner
      );
    }
    
    const data = accountInfo.value.data;
    if (typeof data === 'object' && 'parsed' in data) {
      const owner = new PublicKey(data.parsed.info.owner);
      return owner.equals(expectedOwner);
    }
    
    throw new TokenAccountError(
      `Unable to parse token account data for ${tokenAccount.toBase58()}`,
      expectedOwner
    );
  } catch (error) {
    if (error instanceof TokenAccountError) {
      throw error;
    }
    throw new TokenAccountError(
      `Failed to validate token account owner for ${tokenAccount.toBase58()}`,
      expectedOwner,
      error
    );
  }
}
