import { PublicKey } from '@solana/web3.js';
import { SOLANA_CONFIG, PDA_SEEDS } from './config';

/**
 * PDA Derivation Utilities
 * 
 * This module provides helper functions for deriving Program Derived Addresses (PDAs)
 * used by the ZOL smart contract. PDAs are deterministic addresses derived from seeds
 * and the program ID.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

/**
 * Error thrown when PDA derivation fails
 */
export class PDADerivationError extends Error {
  constructor(
    message: string,
    public readonly seed: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'PDADerivationError';
  }
}

/**
 * Derives the Game State PDA
 * 
 * The Game State Account stores global game state including epoch information,
 * faction data, and total TVL.
 * 
 * @param programId - The ZOL program ID (optional, defaults to config)
 * @returns A tuple of [PublicKey, bump seed]
 * @throws {PDADerivationError} If derivation fails
 * 
 * **Validates: Requirements 12.1, 12.4, 12.5**
 */
export function getGameStatePDA(
  programId: PublicKey = SOLANA_CONFIG.programId
): [PublicKey, number] {
  try {
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from(PDA_SEEDS.GAME_STATE)],
      programId
    );
    
    return [pda, bump];
  } catch (error) {
    throw new PDADerivationError(
      `Failed to derive Game State PDA with seed "${PDA_SEEDS.GAME_STATE}"`,
      PDA_SEEDS.GAME_STATE,
      error
    );
  }
}

/**
 * Derives the User Position PDA for a given user
 * 
 * The User Position Account stores individual user data including deposits,
 * faction membership, inventory, and automation settings.
 * 
 * @param userPublicKey - The user's wallet public key
 * @param programId - The ZOL program ID (optional, defaults to config)
 * @returns A tuple of [PublicKey, bump seed]
 * @throws {PDADerivationError} If derivation fails
 * 
 * **Validates: Requirements 12.2, 12.4, 12.5**
 */
export function getUserPositionPDA(
  userPublicKey: PublicKey,
  programId: PublicKey = SOLANA_CONFIG.programId
): [PublicKey, number] {
  try {
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from(PDA_SEEDS.USER), userPublicKey.toBuffer()],
      programId
    );
    
    return [pda, bump];
  } catch (error) {
    throw new PDADerivationError(
      `Failed to derive User Position PDA with seed "${PDA_SEEDS.USER}" for user ${userPublicKey.toBase58()}`,
      PDA_SEEDS.USER,
      error
    );
  }
}

/**
 * Derives the Vault PDA
 * 
 * The Vault Account is a token account that holds all deposited USDC from users.
 * 
 * @param programId - The ZOL program ID (optional, defaults to config)
 * @returns A tuple of [PublicKey, bump seed]
 * @throws {PDADerivationError} If derivation fails
 * 
 * **Validates: Requirements 12.3, 12.4, 12.5**
 */
export function getVaultPDA(
  programId: PublicKey = SOLANA_CONFIG.programId
): [PublicKey, number] {
  try {
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from(PDA_SEEDS.VAULT)],
      programId
    );
    
    return [pda, bump];
  } catch (error) {
    throw new PDADerivationError(
      `Failed to derive Vault PDA with seed "${PDA_SEEDS.VAULT}"`,
      PDA_SEEDS.VAULT,
      error
    );
  }
}

/**
 * Validates that a derived PDA matches expected criteria
 * 
 * @param pda - The derived PDA to validate
 * @param bump - The bump seed
 * @returns true if valid
 * @throws {Error} If validation fails
 */
export function validatePDA(pda: PublicKey, bump: number): boolean {
  if (!pda || !(pda instanceof PublicKey)) {
    throw new Error('Invalid PDA: must be a PublicKey instance');
  }
  
  if (typeof bump !== 'number' || bump < 0 || bump > 255) {
    throw new Error(`Invalid bump seed: must be a number between 0 and 255, got ${bump}`);
  }
  
  return true;
}
