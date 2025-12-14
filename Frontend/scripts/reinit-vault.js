/**
 * Re-initialize Vault with New Mock USDC
 * 
 * This script initializes a new vault with the mock USDC token we created.
 * Run this after creating the mock USDC token.
 * 
 * Prerequisites:
 * - Mock USDC token created (run setup-mock-usdc.js first)
 * - Admin wallet with SOL for transaction fees
 * 
 * Usage:
 * ADMIN_KEYPAIR_PATH=~/.config/solana/id.json node scripts/reinit-vault.js
 */

const { 
  Connection, 
  Keypair, 
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} = require('@solana/web3.js');
const { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount
} = require('@solana/spl-token');
const { AnchorProvider, Program, BN } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv');

// Load IDL
const IDL = require('../lib/idl/zol_contract.json');

async function main() {
  console.log('🚀 Re-initializing Vault with Mock USDC\n');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Load admin keypair
  const adminKeypairPath = process.env.ADMIN_KEYPAIR_PATH || path.join(process.env.HOME, '.config/solana/id.json');
  
  if (!fs.existsSync(adminKeypairPath)) {
    console.error('❌ Admin keypair not found at:', adminKeypairPath);
    console.log('   Set ADMIN_KEYPAIR_PATH environment variable to your keypair file');
    process.exit(1);
  }
  
  const adminSecretKey = JSON.parse(fs.readFileSync(adminKeypairPath, 'utf-8'));
  const adminKeypair = Keypair.fromSecretKey(Uint8Array.from(adminSecretKey));
  console.log('👤 Admin:', adminKeypair.publicKey.toBase58());
  
  // Load mock USDC config
  const mockUsdcConfigPath = './mock-usdc-config.json';
  if (!fs.existsSync(mockUsdcConfigPath)) {
    console.error('❌ Mock USDC config not found. Run setup-mock-usdc.js first.');
    process.exit(1);
  }
  
  const mockUsdcConfig = JSON.parse(fs.readFileSync(mockUsdcConfigPath, 'utf-8'));
  const usdcMint = new PublicKey(mockUsdcConfig.usdcMint);
  console.log('🪙 Mock USDC Mint:', usdcMint.toBase58());
  
  // Check admin SOL balance
  const balance = await connection.getBalance(adminKeypair.publicKey);
  console.log('💰 Admin SOL Balance:', balance / 1e9, 'SOL\n');
  
  if (balance < 0.05 * 1e9) {
    console.log('⚠️  Low SOL balance. Requesting airdrop...');
    try {
      const sig = await connection.requestAirdrop(adminKeypair.publicKey, 1e9);
      await connection.confirmTransaction(sig);
      console.log('   ✅ Airdrop successful!\n');
    } catch (error) {
      console.log('   ❌ Airdrop failed. Please fund manually.\n');
    }
  }
  
  // Create provider and program
  const wallet = {
    publicKey: adminKeypair.publicKey,
    signTransaction: async (tx) => {
      tx.partialSign(adminKeypair);
      return tx;
    },
    signAllTransactions: async (txs) => {
      txs.forEach(tx => tx.partialSign(adminKeypair));
      return txs;
    },
  };
  
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(IDL, PROGRAM_ID, provider);
  
  // Derive PDAs
  const [gameStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('game_state')],
    PROGRAM_ID
  );
  
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    PROGRAM_ID
  );
  
  console.log('📍 Game State PDA:', gameStatePDA.toBase58());
  console.log('📍 Vault PDA:', vaultPDA.toBase58());
  
  // Check if game state exists
  try {
    const gameState = await program.account.gameState.fetch(gameStatePDA);
    console.log('\n✅ Game State exists');
    console.log('   Epoch:', gameState.epochNumber.toString());
    console.log('   Total TVL:', gameState.totalTvl.toString());
  } catch (error) {
    console.log('\n⚠️  Game State does not exist. Initializing...');
    
    try {
      const tx = await program.methods
        .initializeGame()
        .accounts({
          gameState: gameStatePDA,
          admin: adminKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([adminKeypair])
        .rpc();
      
      console.log('   ✅ Game initialized! Tx:', tx);
    } catch (initError) {
      console.error('   ❌ Failed to initialize game:', initError.message);
    }
  }
  
  // Check if vault exists with correct mint
  try {
    const vaultAccount = await getAccount(connection, vaultPDA);
    console.log('\n📦 Vault exists');
    console.log('   Current Mint:', vaultAccount.mint.toBase58());
    console.log('   Balance:', vaultAccount.amount.toString());
    
    if (vaultAccount.mint.toBase58() === usdcMint.toBase58()) {
      console.log('   ✅ Vault already using correct Mock USDC!');
    } else {
      console.log('   ⚠️  Vault using different mint!');
      console.log('   The vault was initialized with a different USDC mint.');
      console.log('   To use the new mock USDC, you need to:');
      console.log('   1. Close the existing vault (requires admin)');
      console.log('   2. Re-initialize with new mint');
      console.log('\n   OR update .env.local to use the existing vault mint:');
      console.log(`   NEXT_PUBLIC_USDC_MINT=${vaultAccount.mint.toBase58()}`);
    }
  } catch (error) {
    console.log('\n⚠️  Vault does not exist. Initializing...');
    
    try {
      const tx = await program.methods
        .initVault()
        .accounts({
          vault: vaultPDA,
          usdcMint: usdcMint,
          admin: adminKeypair.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([adminKeypair])
        .rpc();
      
      console.log('   ✅ Vault initialized! Tx:', tx);
      console.log('\n📝 Update .env.local with:');
      console.log(`   NEXT_PUBLIC_USDC_MINT=${usdcMint.toBase58()}`);
    } catch (initError) {
      console.error('   ❌ Failed to initialize vault:', initError.message);
      
      if (initError.message.includes('already in use')) {
        console.log('\n   The vault PDA is already initialized with a different mint.');
        console.log('   You need to use the existing mint or redeploy the program.');
      }
    }
  }
}

main().catch(console.error);
