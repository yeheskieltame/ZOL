import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { ZolContract, AutomationRule, FallbackAction } from './idl/types';
import { getGameStatePDA, getUserPositionPDA, getVaultPDA } from './pda';
import { getAssociatedTokenAddress, getTokenBalance } from './token-account';
import { VALIDATION, SOLANA_CONFIG } from './config';

/**
 * Transaction Builder Utilities
 * 
 * This module provides functions for building transactions to interact with
 * the ZOL smart contract. Each builder validates inputs and constructs the
 * appropriate transaction with all required accounts and instructions.
 * 
 * Requirements: 4.1, 4.2, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 8.1, 8.2, 8.3, 8.5
 */

/**
 * Error thrown when transaction building fails
 */
export class TransactionBuilderError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'TransactionBuilderError';
  }
}

/**
 * Builds a transaction to register a user with a faction
 * 
 * This function creates a transaction that calls the register_user instruction
 * on the ZOL contract. It validates the faction ID and includes all required
 * accounts (user position PDA, game state PDA, user wallet, system program).
 * 
 * @param program - The Anchor program instance
 * @param userPublicKey - The user's wallet public key
 * @param factionId - The faction ID to join (0-2)
 * @returns Promise resolving to the built transaction
 * @throws {TransactionBuilderError} If validation fails or transaction building fails
 * 
 * **Validates: Requirements 4.1, 4.2**
 */
export async function buildRegisterUserTx(
  program: Program<ZolContract>,
  userPublicKey: PublicKey,
  factionId: number
): Promise<Transaction> {
  try {
    // Validate faction ID is between 0 and 2
    if (!VALIDATION.isValidFactionId(factionId)) {
      throw new TransactionBuilderError(
        `Invalid faction ID: ${factionId}. Must be between 0 and 2.`,
        'INVALID_FACTION_ID'
      );
    }
    
    // Derive PDAs
    const [userPositionPDA] = getUserPositionPDA(userPublicKey, program.programId);
    const [gameStatePDA] = getGameStatePDA(program.programId);
    
    // Build the transaction using Anchor's methods builder
    const tx = await program.methods
      .registerUser(factionId)
      .accounts({
        userPosition: userPositionPDA,
        gameState: gameStatePDA,
        user: userPublicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
    
    return tx;
  } catch (error) {
    if (error instanceof TransactionBuilderError) {
      throw error;
    }
    throw new TransactionBuilderError(
      `Failed to build register user transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'BUILD_FAILED',
      error
    );
  }
}

/**
 * Builds a transaction to deposit USDC into the user's faction
 * 
 * This function creates a transaction that calls the deposit instruction.
 * It validates the deposit amount, checks the user's USDC balance, and includes
 * all required accounts (user position, game state, vault, user USDC account,
 * user wallet, token program).
 * 
 * @param program - The Anchor program instance
 * @param connection - Solana RPC connection
 * @param userPublicKey - The user's wallet public key
 * @param amount - The amount to deposit in USDC lamports (6 decimals)
 * @returns Promise resolving to the built transaction
 * @throws {TransactionBuilderError} If validation fails or transaction building fails
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */
export async function buildDepositTx(
  program: Program<ZolContract>,
  connection: Connection,
  userPublicKey: PublicKey,
  amount: number
): Promise<Transaction> {
  try {
    // Validate deposit amount is greater than zero
    if (!VALIDATION.isValidAmount(amount)) {
      throw new TransactionBuilderError(
        `Invalid deposit amount: ${amount}. Must be greater than zero.`,
        'INVALID_AMOUNT'
      );
    }
    
    // Get user's USDC token account
    const userUsdcAccount = await getAssociatedTokenAddress(
      userPublicKey,
      SOLANA_CONFIG.usdcMint
    );
    
    // Check user balance before building transaction
    const balance = await getTokenBalance(connection, userUsdcAccount);
    const amountBN = BigInt(amount);
    
    if (balance === 0n) {
      throw new TransactionBuilderError(
        `No USDC found in your wallet. Please get some USDC from the faucet first.`,
        'NO_USDC_BALANCE'
      );
    }
    
    if (balance < amountBN) {
      const balanceUsdc = Number(balance) / 1_000_000;
      const requiredUsdc = amount / 1_000_000;
      throw new TransactionBuilderError(
        `Insufficient USDC balance. Required: ${requiredUsdc.toFixed(2)} USDC, Available: ${balanceUsdc.toFixed(2)} USDC`,
        'INSUFFICIENT_BALANCE'
      );
    }
    
    // Derive PDAs
    const [userPositionPDA] = getUserPositionPDA(userPublicKey, program.programId);
    const [gameStatePDA] = getGameStatePDA(program.programId);
    const [vaultPDA] = getVaultPDA(program.programId);
    
    // Build the transaction using Anchor's methods builder
    const tx = await program.methods
      .deposit(new BN(amount))
      .accounts({
        userPosition: userPositionPDA,
        gameState: gameStatePDA,
        vault: vaultPDA,
        userUsdc: userUsdcAccount,
        user: userPublicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();
    
    return tx;
  } catch (error) {
    if (error instanceof TransactionBuilderError) {
      throw error;
    }
    throw new TransactionBuilderError(
      `Failed to build deposit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'BUILD_FAILED',
      error
    );
  }
}

/**
 * Builds a transaction to withdraw USDC from the user's position
 * 
 * This function creates a transaction that calls the withdraw instruction.
 * It validates the withdrawal amount doesn't exceed the deposited amount by
 * fetching the current user position data. Includes all required accounts
 * (user position, game state, vault, user USDC account, user wallet, token program).
 * 
 * @param program - The Anchor program instance
 * @param connection - Solana RPC connection
 * @param userPublicKey - The user's wallet public key
 * @param amount - The amount to withdraw in USDC lamports (6 decimals)
 * @returns Promise resolving to the built transaction
 * @throws {TransactionBuilderError} If validation fails or transaction building fails
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */
export async function buildWithdrawTx(
  program: Program<ZolContract>,
  connection: Connection,
  userPublicKey: PublicKey,
  amount: number
): Promise<Transaction> {
  try {
    // Validate withdrawal amount is greater than zero
    if (!VALIDATION.isValidAmount(amount)) {
      throw new TransactionBuilderError(
        `Invalid withdrawal amount: ${amount}. Must be greater than zero.`,
        'INVALID_AMOUNT'
      );
    }
    
    // Derive user position PDA
    const [userPositionPDA] = getUserPositionPDA(userPublicKey, program.programId);
    
    // Fetch current deposited amount before validation
    let depositedAmount: bigint;
    try {
      const userPosition = await program.account.userPosition.fetch(userPositionPDA);
      depositedAmount = userPosition.depositedAmount;
    } catch (error) {
      throw new TransactionBuilderError(
        'User position not found. Please register first.',
        'USER_NOT_REGISTERED',
        error
      );
    }
    
    // Validate withdrawal amount doesn't exceed deposited amount
    const amountBN = BigInt(amount);
    if (amountBN > depositedAmount) {
      throw new TransactionBuilderError(
        `Withdrawal amount exceeds deposited amount. Requested: ${amount}, Available: ${depositedAmount}`,
        'INSUFFICIENT_DEPOSITED_AMOUNT'
      );
    }
    
    // Get user's USDC token account
    const userUsdcAccount = await getAssociatedTokenAddress(
      userPublicKey,
      SOLANA_CONFIG.usdcMint
    );
    
    // Derive PDAs
    const [gameStatePDA] = getGameStatePDA(program.programId);
    const [vaultPDA] = getVaultPDA(program.programId);
    
    // Build the transaction using Anchor's methods builder
    const tx = await program.methods
      .withdraw(new BN(amount))
      .accounts({
        userPosition: userPositionPDA,
        gameState: gameStatePDA,
        vault: vaultPDA,
        userUsdc: userUsdcAccount,
        user: userPublicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();
    
    return tx;
  } catch (error) {
    if (error instanceof TransactionBuilderError) {
      throw error;
    }
    throw new TransactionBuilderError(
      `Failed to build withdraw transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'BUILD_FAILED',
      error
    );
  }
}

/**
 * Builds a transaction to update user automation settings
 * 
 * This function creates a transaction that calls the update_automation instruction.
 * It validates the preference type and item parameters, then includes all required
 * accounts (user position, user wallet).
 * 
 * @param program - The Anchor program instance
 * @param userPublicKey - The user's wallet public key
 * @param slot1 - First priority automation rule
 * @param slot2 - Second priority automation rule
 * @param fallback - Fallback action when rules don't apply
 * @returns Promise resolving to the built transaction
 * @throws {TransactionBuilderError} If validation fails or transaction building fails
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.5**
 */
export async function buildUpdateAutomationTx(
  program: Program<ZolContract>,
  userPublicKey: PublicKey,
  slot1: AutomationRule,
  slot2: AutomationRule,
  fallback: FallbackAction
): Promise<Transaction> {
  try {
    // Validate automation rules
    validateAutomationRule(slot1, 'slot1');
    validateAutomationRule(slot2, 'slot2');
    
    // Validate fallback action
    if (!isFallbackAction(fallback)) {
      throw new TransactionBuilderError(
        `Invalid fallback action. Must be { autoCompound: {} } or { sendToWallet: {} }`,
        'INVALID_FALLBACK_ACTION'
      );
    }
    
    // Derive user position PDA
    const [userPositionPDA] = getUserPositionPDA(userPublicKey, program.programId);
    
    // Build the transaction using Anchor's methods builder
    const tx = await program.methods
      .updateAutomation(slot1, slot2, fallback)
      .accounts({
        userPosition: userPositionPDA,
        user: userPublicKey,
      })
      .transaction();
    
    return tx;
  } catch (error) {
    if (error instanceof TransactionBuilderError) {
      throw error;
    }
    throw new TransactionBuilderError(
      `Failed to build update automation transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'BUILD_FAILED',
      error
    );
  }
}

/**
 * Validates an automation rule
 * 
 * @param rule - The automation rule to validate
 * @param slotName - The name of the slot (for error messages)
 * @throws {TransactionBuilderError} If validation fails
 */
function validateAutomationRule(rule: AutomationRule, slotName: string): void {
  if (!rule || typeof rule !== 'object') {
    throw new TransactionBuilderError(
      `Invalid ${slotName}: must be an object with itemId and threshold`,
      'INVALID_AUTOMATION_RULE'
    );
  }
  
  // Validate item ID (0-2 for sword, shield, spyglass)
  if (typeof rule.itemId !== 'number' || rule.itemId < 0 || rule.itemId > 2) {
    throw new TransactionBuilderError(
      `Invalid ${slotName} itemId: ${rule.itemId}. Must be between 0 and 2.`,
      'INVALID_ITEM_ID'
    );
  }
  
  // Validate threshold is a positive number
  const threshold = typeof rule.threshold === 'bigint' ? rule.threshold : BigInt(rule.threshold);
  if (threshold <= 0n) {
    throw new TransactionBuilderError(
      `Invalid ${slotName} threshold: ${rule.threshold}. Must be greater than zero.`,
      'INVALID_THRESHOLD'
    );
  }
}

/**
 * Type guard to check if a value is a valid FallbackAction
 * 
 * @param value - The value to check
 * @returns true if the value is a valid FallbackAction
 */
function isFallbackAction(value: any): value is FallbackAction {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  // Check if it has exactly one of the expected properties
  const hasAutoCompound = 'autoCompound' in value;
  const hasSendToWallet = 'sendToWallet' in value;
  
  return (hasAutoCompound && !hasSendToWallet) || (!hasAutoCompound && hasSendToWallet);
}
