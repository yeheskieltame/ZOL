const { AnchorProvider, Program } = require('@coral-xyz/anchor');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const IDL = require('./lib/idl/zol_contract.json');

console.log('Testing IDL loading...');
console.log('IDL address:', IDL.address);
console.log('IDL address type:', typeof IDL.address);

// Create a mock wallet
const mockWallet = {
  publicKey: Keypair.generate().publicKey,
  signTransaction: async (tx) => tx,
  signAllTransactions: async (txs) => txs,
};

// Create connection
const connection = new Connection('https://api.devnet.solana.com');

// Create provider
const provider = new AnchorProvider(connection, mockWallet, {
  commitment: 'confirmed',
});

console.log('Provider created successfully');
console.log('Attempting to create Program...');

// Patch PublicKey constructor to see what's being passed
const OriginalPublicKey = PublicKey;
let callCount = 0;
global.PublicKey = function(...args) {
  callCount++;
  console.log(`PublicKey call #${callCount}:`, args[0], 'type:', typeof args[0]);
  if (typeof args[0] === 'object' && args[0] !== null) {
    console.log('  Object keys:', Object.keys(args[0]));
    console.log('  Object:', JSON.stringify(args[0]).substring(0, 200));
  }
  return new OriginalPublicKey(...args);
};

try {
  const program = new Program(IDL, provider);
  console.log('✓ Program created successfully!');
  console.log('Program ID:', program.programId.toBase58());
} catch (error) {
  console.error('✗ Failed to create Program:');
  console.error('Error:', error.message);
  console.error('Failed at PublicKey call #' + callCount);
}
