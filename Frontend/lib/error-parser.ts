/**
 * Error parsing utilities for blockchain transactions
 * Handles parsing, mapping, and categorizing errors from Solana transactions
 */

export interface UserFriendlyError {
  title: string;
  message: string;
  details?: string;
  retryable: boolean;
  actionLabel?: string;
  category: 'wallet' | 'transaction' | 'network' | 'program' | 'account';
}

/**
 * Program error codes from the ZOL contract IDL
 */
export enum ProgramErrorCode {
  InvalidFaction = 6000,
  InsufficientFunds = 6001,
  EpochNotEnded = 6002,
}

/**
 * Maps program error codes to human-readable messages
 */
const PROGRAM_ERROR_MESSAGES: Record<number, { title: string; message: string }> = {
  [ProgramErrorCode.InvalidFaction]: {
    title: 'Invalid Faction',
    message: 'The selected faction ID is invalid. Please choose a valid faction (Vanguard, Mage, or Assassin).',
  },
  [ProgramErrorCode.InsufficientFunds]: {
    title: 'Insufficient Funds',
    message: 'You do not have enough funds in your account to complete this withdrawal.',
  },
  [ProgramErrorCode.EpochNotEnded]: {
    title: 'Epoch Not Ended',
    message: 'The current epoch has not ended yet. Please wait until the epoch ends to perform this action.',
  },
};

/**
 * Parses blockchain transaction errors into user-friendly format
 */
export function parseTransactionError(error: unknown): UserFriendlyError {
  // Handle null/undefined
  if (!error) {
    return {
      title: 'Unknown Error',
      message: 'An unknown error occurred. Please try again.',
      retryable: true,
      category: 'transaction',
    };
  }

  const errorObj = error as any;
  const errorMessage = errorObj?.message || String(error);

  // User rejected transaction
  if (
    errorMessage.includes('User rejected') ||
    errorMessage.includes('user rejected') ||
    errorMessage.includes('User cancelled') ||
    errorMessage.includes('user cancelled')
  ) {
    return {
      title: 'Transaction Cancelled',
      message: 'You cancelled the transaction. No changes were made.',
      retryable: false,
      category: 'wallet',
    };
  }

  // Wallet not connected
  if (
    errorMessage.includes('Wallet not connected') ||
    errorMessage.includes('wallet not connected') ||
    errorMessage.includes('No wallet') ||
    errorMessage.includes('wallet is null') ||
    errorMessage.includes('publicKey is null')
  ) {
    return createWalletNotConnectedError();
  }

  // Network timeout errors
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('Request timeout')
  ) {
    return createNetworkTimeoutError();
  }

  // Network/RPC errors
  if (
    errorMessage.includes('Network request failed') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('503') ||
    errorMessage.includes('502') ||
    errorMessage.includes('504') ||
    errorMessage.includes('Connection refused')
  ) {
    return {
      title: 'Network Error',
      message: 'Unable to connect to the Solana network. Please check your connection and try again.',
      details: 'This could be due to RPC endpoint issues or network connectivity problems.',
      retryable: true,
      actionLabel: 'Retry',
      category: 'network',
    };
  }

  // Rate limiting
  if (errorMessage.includes('429') || errorMessage.includes('Too many requests')) {
    return {
      title: 'Rate Limited',
      message: 'Too many requests. Please wait a moment and try again.',
      retryable: true,
      actionLabel: 'Retry',
      category: 'network',
    };
  }

  // Insufficient SOL for transaction fees
  if (
    errorMessage.includes('Attempt to debit an account but found no record of a prior credit') ||
    errorMessage.includes('insufficient funds') ||
    errorMessage.includes('insufficient lamports')
  ) {
    return {
      title: 'Insufficient SOL',
      message: 'You need SOL in your wallet to pay for transaction fees. Please add some SOL and try again.',
      details: 'Transaction fees on Solana are paid in SOL. You can get devnet SOL from a faucet.',
      retryable: false,
      category: 'wallet',
    };
  }

  // No USDC balance - user needs to get tokens from faucet
  if (
    errorMessage.includes('No USDC found') ||
    errorMessage.includes('NO_USDC_BALANCE')
  ) {
    return {
      title: 'No USDC in Wallet',
      message: 'You need USDC tokens to make a deposit. Visit the Faucet page to get free test USDC.',
      details: 'Click the button below to go to the faucet and claim your free USDC tokens.',
      retryable: false,
      actionLabel: 'Go to Faucet',
      category: 'wallet',
    };
  }

  // Insufficient balance (USDC or other tokens)
  if (
    errorMessage.includes('insufficient balance') ||
    errorMessage.includes('Insufficient balance') ||
    errorMessage.includes('Insufficient USDC') ||
    errorMessage.includes('balance too low')
  ) {
    return {
      title: 'Insufficient Balance',
      message: 'You do not have enough USDC to complete this deposit.',
      details: 'Please check your balance or visit the Faucet to get more test USDC.',
      retryable: false,
      actionLabel: 'Go to Faucet',
      category: 'wallet',
    };
  }

  // Account not found
  if (
    errorMessage.includes('Account does not exist') ||
    errorMessage.includes('AccountNotFound') ||
    errorMessage.includes('could not find account') ||
    errorMessage.includes('Invalid account data')
  ) {
    // Try to determine account type from error message
    let accountType = 'account';
    if (errorMessage.includes('user') || errorMessage.includes('User')) {
      accountType = 'user account';
    } else if (errorMessage.includes('token') || errorMessage.includes('Token')) {
      accountType = 'token account';
    } else if (errorMessage.includes('game') || errorMessage.includes('Game')) {
      accountType = 'game state account';
    }
    return createAccountNotFoundError(accountType);
  }

  // Transaction simulation failed
  if (errorMessage.includes('Transaction simulation failed')) {
    // Try to extract more details
    const customError = extractProgramError(errorMessage);
    if (customError) {
      return customError;
    }

    return {
      title: 'Transaction Failed',
      message: 'The transaction simulation failed. Please check your inputs and try again.',
      details: errorMessage,
      retryable: false,
      category: 'transaction',
    };
  }

  // Program errors (custom errors from smart contract)
  const programError = extractProgramError(errorMessage);
  if (programError) {
    return programError;
  }

  // Blockhash not found (transaction expired)
  if (errorMessage.includes('Blockhash not found') || errorMessage.includes('BlockhashNotFound')) {
    return {
      title: 'Transaction Expired',
      message: 'The transaction took too long and expired. Please try again.',
      retryable: true,
      actionLabel: 'Retry',
      category: 'transaction',
    };
  }

  // Generic fallback
  return {
    title: 'Transaction Error',
    message: 'An error occurred while processing your transaction. Please try again.',
    details: errorMessage,
    retryable: true,
    actionLabel: 'Retry',
    category: 'transaction',
  };
}

/**
 * Extracts and maps program error codes from error messages
 */
function extractProgramError(errorMessage: string): UserFriendlyError | null {
  // Try to extract custom program error code
  // Format: "custom program error: 0x1770" (6000 in hex)
  const customErrorMatch = errorMessage.match(/custom program error:\s*0x([0-9a-fA-F]+)/);
  if (customErrorMatch) {
    const errorCode = parseInt(customErrorMatch[1], 16);
    return mapProgramError(errorCode);
  }

  // Try to extract error code in decimal format
  const decimalErrorMatch = errorMessage.match(/Error Code:\s*(\d+)/i);
  if (decimalErrorMatch) {
    const errorCode = parseInt(decimalErrorMatch[1], 10);
    return mapProgramError(errorCode);
  }

  // Try to match error names directly
  if (errorMessage.includes('InvalidFaction') || errorMessage.includes('invalid faction')) {
    return mapProgramError(ProgramErrorCode.InvalidFaction);
  }
  if (errorMessage.includes('InsufficientFunds') || errorMessage.includes('insufficient funds')) {
    return mapProgramError(ProgramErrorCode.InsufficientFunds);
  }
  if (errorMessage.includes('EpochNotEnded') || errorMessage.includes('epoch not ended')) {
    return mapProgramError(ProgramErrorCode.EpochNotEnded);
  }

  return null;
}

/**
 * Maps program error codes to user-friendly error objects
 */
export function mapProgramError(errorCode: number): UserFriendlyError {
  const errorInfo = PROGRAM_ERROR_MESSAGES[errorCode];

  if (errorInfo) {
    return {
      title: errorInfo.title,
      message: errorInfo.message,
      details: `Error code: ${errorCode}`,
      retryable: false,
      category: 'program',
    };
  }

  // Unknown program error
  return {
    title: 'Program Error',
    message: 'The smart contract returned an error. Please check your inputs and try again.',
    details: `Error code: ${errorCode}`,
    retryable: false,
    category: 'program',
  };
}

/**
 * Determines if an error is retryable based on its characteristics
 */
export function isRetryableError(error: unknown): boolean {
  const parsedError = parseTransactionError(error);
  return parsedError.retryable;
}

/**
 * Creates a specific error for insufficient balance
 */
export function createInsufficientBalanceError(tokenName: string = 'USDC'): UserFriendlyError {
  return {
    title: 'Insufficient Balance',
    message: `You do not have enough ${tokenName} to complete this transaction. Please check your balance and try again.`,
    details: `Required token: ${tokenName}`,
    retryable: false,
    category: 'wallet',
  };
}

/**
 * Creates a specific error for wallet not connected
 */
export function createWalletNotConnectedError(): UserFriendlyError {
  return {
    title: 'Wallet Not Connected',
    message: 'Please connect your Solana wallet to continue. Click the "Connect Wallet" button in the top right.',
    retryable: false,
    category: 'wallet',
  };
}

/**
 * Creates a specific error for network timeout
 */
export function createNetworkTimeoutError(): UserFriendlyError {
  return {
    title: 'Network Timeout',
    message: 'The request took too long to complete. This might be due to network congestion or RPC issues.',
    details: 'Please try again in a moment. If the problem persists, the network may be experiencing high load.',
    retryable: true,
    actionLabel: 'Retry',
    category: 'network',
  };
}

/**
 * Creates a specific error for account not found
 */
export function createAccountNotFoundError(accountType: string = 'account'): UserFriendlyError {
  return {
    title: 'Account Not Found',
    message: `The required ${accountType} was not found on the blockchain. You may need to register or initialize your account first.`,
    details: `Missing ${accountType}`,
    retryable: false,
    category: 'account',
  };
}

/**
 * Extracts transaction signature from error if available
 */
export function extractTransactionSignature(error: unknown): string | null {
  if (!error) return null;

  const errorObj = error as any;
  const errorMessage = errorObj?.message || String(error);

  // Try to extract signature from error message
  const signatureMatch = errorMessage.match(/signature[:\s]+([1-9A-HJ-NP-Za-km-z]{87,88})/i);
  if (signatureMatch) {
    return signatureMatch[1];
  }

  // Check if signature is in error object
  if (errorObj.signature && typeof errorObj.signature === 'string') {
    return errorObj.signature;
  }

  return null;
}

/**
 * Formats error details for debugging
 */
export function formatErrorDetails(error: unknown): string {
  if (!error) return 'No error details available';

  const errorObj = error as any;

  const details: string[] = [];

  if (errorObj.message) {
    details.push(`Message: ${errorObj.message}`);
  }

  if (errorObj.code) {
    details.push(`Code: ${errorObj.code}`);
  }

  if (errorObj.name) {
    details.push(`Name: ${errorObj.name}`);
  }

  const signature = extractTransactionSignature(error);
  if (signature) {
    details.push(`Signature: ${signature}`);
  }

  if (errorObj.logs && Array.isArray(errorObj.logs)) {
    details.push(`Logs: ${errorObj.logs.join('\n')}`);
  }

  return details.length > 0 ? details.join('\n') : String(error);
}
