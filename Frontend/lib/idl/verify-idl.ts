/**
 * Verification script to ensure all required program instructions are present in the IDL
 * This validates Requirements 2.3
 */

import { ZOL_CONTRACT_IDL } from './index';

// Required instructions as per the smart contract
const REQUIRED_INSTRUCTIONS = [
  'initializeGame',
  'initVault',
  'registerUser',
  'deposit',
  'withdraw',
  'updateAutomation',
  'resolveEpoch',
  'executeSettlement',
  'startNewEpoch',
  'injectYield'
] as const;

// Required accounts
const REQUIRED_ACCOUNTS = [
  'GameState',
  'UserPosition'
] as const;

// Required types
const REQUIRED_TYPES = [
  'FactionState',
  'AutomationSettings',
  'AutomationRule',
  'UserInventory',
  'GameStatus',
  'FallbackAction'
] as const;

export function verifyIDL(): { success: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verify instructions
  const instructionNames = ZOL_CONTRACT_IDL.instructions.map((i: any) => i.name);
  
  for (const requiredInstruction of REQUIRED_INSTRUCTIONS) {
    if (!instructionNames.includes(requiredInstruction)) {
      errors.push(`Missing required instruction: ${requiredInstruction}`);
    }
  }

  // Verify accounts
  const accountNames = ZOL_CONTRACT_IDL.accounts.map((a: any) => 
    // Convert from snake_case to PascalCase for comparison
    a.name.split('_').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('')
  );

  for (const requiredAccount of REQUIRED_ACCOUNTS) {
    if (!accountNames.includes(requiredAccount)) {
      errors.push(`Missing required account: ${requiredAccount}`);
    }
  }

  // Verify types
  const typeNames = ZOL_CONTRACT_IDL.types.map((t: any) => 
    // Convert from snake_case to PascalCase for comparison
    t.name.split('_').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('')
  );

  for (const requiredType of REQUIRED_TYPES) {
    if (!typeNames.includes(requiredType)) {
      errors.push(`Missing required type: ${requiredType}`);
    }
  }

  // Verify program ID matches
  const expectedProgramId = "Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv";
  if (ZOL_CONTRACT_IDL.address !== expectedProgramId) {
    errors.push(`Program ID mismatch. Expected: ${expectedProgramId}, Got: ${ZOL_CONTRACT_IDL.address}`);
  }

  return {
    success: errors.length === 0,
    errors
  };
}

// Run verification if this file is executed directly
if (require.main === module) {
  const result = verifyIDL();
  
  if (result.success) {
    console.log('✅ IDL verification passed! All required instructions, accounts, and types are present.');
    console.log(`\nFound ${ZOL_CONTRACT_IDL.instructions.length} instructions:`);
    ZOL_CONTRACT_IDL.instructions.forEach((i: any) => {
      console.log(`  - ${i.name}`);
    });
    process.exit(0);
  } else {
    console.error('❌ IDL verification failed!');
    result.errors.forEach(error => {
      console.error(`  - ${error}`);
    });
    process.exit(1);
  }
}
