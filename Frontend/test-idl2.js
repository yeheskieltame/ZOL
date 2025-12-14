const IDL = require('./lib/idl/zol_contract.json');

console.log('=== Analyzing IDL Structure ===');
console.log('IDL address:', IDL.address);
console.log('IDL metadata:', JSON.stringify(IDL.metadata, null, 2));

// Check if there are any undefined or null values that might cause issues
function checkForInvalidValues(obj, path = 'root') {
  for (const key in obj) {
    const value = obj[key];
    const currentPath = `${path}.${key}`;
    
    if (value === undefined) {
      console.log(`⚠️  UNDEFINED at ${currentPath}`);
    } else if (value === null) {
      console.log(`⚠️  NULL at ${currentPath}`);
    } else if (value === '') {
      console.log(`⚠️  EMPTY STRING at ${currentPath}`);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          checkForInvalidValues(item, `${currentPath}[${index}]`);
        }
      });
    } else if (typeof value === 'object') {
      checkForInvalidValues(value, currentPath);
    }
  }
}

checkForInvalidValues(IDL);

// Now try to manually call translateAddress with the IDL address
console.log('\n=== Testing PublicKey creation ===');
const { PublicKey } = require('@solana/web3.js');

try {
  const pk = new PublicKey(IDL.address);
  console.log('✓ IDL.address is valid:', pk.toBase58());
} catch (e) {
  console.log('✗ IDL.address is INVALID:', e.message);
}

// Check if metadata.address is different
if (IDL.metadata && IDL.metadata.address) {
  try {
    const pk = new PublicKey(IDL.metadata.address);
    console.log('✓ IDL.metadata.address is valid:', pk.toBase58());
  } catch (e) {
    console.log('✗ IDL.metadata.address is INVALID:', e.message);
  }
}
