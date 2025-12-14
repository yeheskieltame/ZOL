import { NextRequest, NextResponse } from 'next/server';
import { 
  Connection, 
  Keypair, 
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
  createMintToInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';

// Faucet configuration
const FAUCET_AMOUNTS: Record<string, number> = {
  '1000': 1000_000_000,   // 1000 USDC (6 decimals)
  '5000': 5000_000_000,   // 5000 USDC
  '10000': 10000_000_000, // 10000 USDC
};

const MAX_AIRDROP_PER_DAY = 50000_000_000; // 50000 USDC per day per wallet

// Rate limiting storage (in production, use Redis or database)
const rateLimitMap = new Map<string, { amount: number; timestamp: number }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, amount } = body;

    // Validate wallet address
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(walletAddress);
    } catch {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Validate amount
    const amountLamports = FAUCET_AMOUNTS[amount];
    if (!amountLamports) {
      return NextResponse.json(
        { error: 'Invalid amount. Choose 1000, 5000, or 10000' },
        { status: 400 }
      );
    }

    // Check rate limit
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const userLimit = rateLimitMap.get(walletAddress);
    
    if (userLimit) {
      if (now - userLimit.timestamp < dayMs) {
        if (userLimit.amount + amountLamports > MAX_AIRDROP_PER_DAY) {
          return NextResponse.json(
            { error: 'Daily airdrop limit reached. Try again tomorrow.' },
            { status: 429 }
          );
        }
      } else {
        // Reset if more than a day has passed
        rateLimitMap.set(walletAddress, { amount: 0, timestamp: now });
      }
    }

    // Get mint authority keypair from environment
    const mintAuthoritySecret = process.env.FAUCET_MINT_AUTHORITY_SECRET;
    if (!mintAuthoritySecret) {
      console.error('FAUCET_MINT_AUTHORITY_SECRET not configured');
      return NextResponse.json(
        { error: 'Faucet not configured. Please contact admin.' },
        { status: 500 }
      );
    }

    let mintAuthority: Keypair;
    try {
      const secretArray = JSON.parse(mintAuthoritySecret);
      mintAuthority = Keypair.fromSecretKey(Uint8Array.from(secretArray));
    } catch {
      console.error('Invalid FAUCET_MINT_AUTHORITY_SECRET format');
      return NextResponse.json(
        { error: 'Faucet configuration error' },
        { status: 500 }
      );
    }

    // Get USDC mint address
    const usdcMintAddress = process.env.NEXT_PUBLIC_USDC_MINT;
    if (!usdcMintAddress) {
      return NextResponse.json(
        { error: 'USDC mint not configured' },
        { status: 500 }
      );
    }
    const usdcMint = new PublicKey(usdcMintAddress);

    // Connect to Solana
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Get or create associated token account for recipient
    const recipientAta = await getAssociatedTokenAddress(
      usdcMint,
      recipientPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const transaction = new Transaction();

    // Check if ATA exists, if not create it
    try {
      await getAccount(connection, recipientAta);
    } catch {
      // ATA doesn't exist, add instruction to create it
      transaction.add(
        createAssociatedTokenAccountInstruction(
          mintAuthority.publicKey, // payer
          recipientAta,            // ata
          recipientPubkey,         // owner
          usdcMint,                // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Add mint instruction
    transaction.add(
      createMintToInstruction(
        usdcMint,                  // mint
        recipientAta,              // destination
        mintAuthority.publicKey,   // authority
        BigInt(amountLamports),    // amount
        [],                        // multiSigners
        TOKEN_PROGRAM_ID
      )
    );

    // Send transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [mintAuthority],
      { commitment: 'confirmed' }
    );

    // Update rate limit
    const currentLimit = rateLimitMap.get(walletAddress) || { amount: 0, timestamp: now };
    rateLimitMap.set(walletAddress, {
      amount: currentLimit.amount + amountLamports,
      timestamp: currentLimit.timestamp || now,
    });

    return NextResponse.json({
      success: true,
      signature,
      amount: parseInt(amount),
      recipient: walletAddress,
    });

  } catch (error) {
    console.error('Faucet error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for common errors
    if (errorMessage.includes('insufficient funds')) {
      return NextResponse.json(
        { error: 'Faucet is out of SOL for transaction fees. Please try again later.' },
        { status: 503 }
      );
    }
    
    if (errorMessage.includes('0x1')) {
      return NextResponse.json(
        { error: 'Mint authority mismatch. Faucet not authorized for this token.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process airdrop. Please try again.' },
      { status: 500 }
    );
  }
}

// GET endpoint to check faucet status
export async function GET() {
  const usdcMint = process.env.NEXT_PUBLIC_USDC_MINT;
  const isConfigured = !!process.env.FAUCET_MINT_AUTHORITY_SECRET;
  
  return NextResponse.json({
    status: isConfigured ? 'operational' : 'not_configured',
    usdcMint,
    availableAmounts: Object.keys(FAUCET_AMOUNTS).map(Number),
    dailyLimit: MAX_AIRDROP_PER_DAY / 1_000_000, // In USDC
  });
}
