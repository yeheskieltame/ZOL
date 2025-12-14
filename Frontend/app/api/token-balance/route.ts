import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const mintAddress = searchParams.get('mint');

    if (!walletAddress || !mintAddress) {
      return NextResponse.json(
        { error: 'wallet and mint parameters are required' },
        { status: 400 }
      );
    }

    let walletPubkey: PublicKey;
    let mintPubkey: PublicKey;

    try {
      walletPubkey = new PublicKey(walletAddress);
      mintPubkey = new PublicKey(mintAddress);
    } catch {
      return NextResponse.json(
        { error: 'Invalid wallet or mint address' },
        { status: 400 }
      );
    }

    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Get associated token account
    const ata = await getAssociatedTokenAddress(
      mintPubkey,
      walletPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    try {
      const account = await getAccount(connection, ata);
      return NextResponse.json({
        balance: Number(account.amount),
        address: ata.toBase58(),
      });
    } catch {
      // Account doesn't exist, balance is 0
      return NextResponse.json({
        balance: 0,
        address: ata.toBase58(),
      });
    }
  } catch (error) {
    console.error('Token balance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token balance' },
      { status: 500 }
    );
  }
}
