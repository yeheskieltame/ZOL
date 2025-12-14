/**
 * Setup Mock USDC Token for Devnet Testing
 * 
 * This script creates a new SPL token to use as mock USDC for the faucet.
 * Run this once to set up the token, then update .env.local with the new addresses.
 * 
 * Prerequisites:
 * - Solana CLI installed
 * - A funded devnet wallet (get SOL from https://faucet.solana.com/)
 * 
 * Usage:
 * 1. Set FAUCET_KEYPAIR_PATH environment variable to your keypair file path
 *    OR the script will generate a new keypair
 * 2. Run: node scripts/setup-mock-usdc.js
 * 3. Copy the output values to .env.local
 */

const { 
  Connection, 
  Keypair, 
  LAMPORTS_PER_SOL,
  PublicKey 
} = require('@solana/web3.js');
const { 
  createMint, 
  getMint,
  TOKEN_PROGRAM_ID 
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'https://api.devnet.solana.com';
const USDC_DECIMALS = 6;

async function main() {
  console.log('🚀 Setting up Mock USDC Token for Devnet\n');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Load or create faucet keypair
  let faucetKeypair;
  const keypairPath = process.env.FAUCET_KEYPAIR_PATH || './faucet-authority.json';
  
  if (fs.existsSync(keypairPath)) {
    console.log(`📁 Loading existing keypair from ${keypairPath}`);
    const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    faucetKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } else {
    console.log('🔑 Generating new faucet authority keypair...');
    faucetKeypair = Keypair.generate();
    fs.writeFileSync(keypairPath, JSON.stringify(Array.from(faucetKeypair.secretKey)));
    console.log(`   Saved to ${keypairPath}`);
  }
  
  console.log(`   Faucet Authority: ${faucetKeypair.publicKey.toBase58()}\n`);
  
  // Check SOL balance
  const balance = await connection.getBalance(faucetKeypair.publicKey);
  console.log(`💰 SOL Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log('\n⚠️  Insufficient SOL balance!');
    console.log('   Please fund this wallet with devnet SOL:');
    console.log(`   1. Go to https://faucet.solana.com/`);
    console.log(`   2. Enter address: ${faucetKeypair.publicKey.toBase58()}`);
    console.log('   3. Request airdrop');
    console.log('   4. Run this script again\n');
    
    // Try to airdrop
    console.log('   Attempting automatic airdrop...');
    try {
      const sig = await connection.requestAirdrop(faucetKeypair.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig);
      console.log('   ✅ Airdrop successful!\n');
    } catch (error) {
      console.log('   ❌ Airdrop failed (rate limited). Please use the faucet website.\n');
      process.exit(1);
    }
  }
  
  // Create the mock USDC token
  console.log('\n🪙 Creating Mock USDC Token...');
  
  try {
    const mint = await createMint(
      connection,
      faucetKeypair,           // payer
      faucetKeypair.publicKey, // mint authority
      null,                    // freeze authority (none)
      USDC_DECIMALS,           // decimals
      undefined,               // keypair (auto-generate)
      undefined,               // confirm options
      TOKEN_PROGRAM_ID
    );
    
    console.log(`   ✅ Mock USDC Mint: ${mint.toBase58()}\n`);
    
    // Verify the mint
    const mintInfo = await getMint(connection, mint);
    console.log('📋 Token Info:');
    console.log(`   Decimals: ${mintInfo.decimals}`);
    console.log(`   Mint Authority: ${mintInfo.mintAuthority?.toBase58()}`);
    console.log(`   Supply: ${mintInfo.supply.toString()}`);
    
    // Output configuration
    console.log('\n' + '='.repeat(60));
    console.log('📝 Add these to your .env.local file:');
    console.log('='.repeat(60));
    console.log(`\nNEXT_PUBLIC_USDC_MINT=${mint.toBase58()}`);
    console.log(`FAUCET_MINT_AUTHORITY_SECRET=${JSON.stringify(Array.from(faucetKeypair.secretKey))}`);
    console.log('\n' + '='.repeat(60));
    
    // Save config to file for easy copy
    const configOutput = {
      usdcMint: mint.toBase58(),
      faucetAuthority: faucetKeypair.publicKey.toBase58(),
      faucetSecretKey: Array.from(faucetKeypair.secretKey),
      network: 'devnet',
      createdAt: new Date().toISOString(),
    };
    
    fs.writeFileSync('./mock-usdc-config.json', JSON.stringify(configOutput, null, 2));
    console.log('\n💾 Configuration saved to mock-usdc-config.json');
    
  } catch (error) {
    console.error('❌ Failed to create token:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
