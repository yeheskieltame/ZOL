import type { Idl } from '@coral-xyz/anchor';
import type { ZolContract } from './types';
import IDL_JSON from './zol_contract.json';

// Export the program ID
export const ZOL_PROGRAM_ID = "Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv";

// Export the IDL as Anchor's Idl type
// Keep the IDL as-is from the JSON file - it already has the correct address
export const ZOL_CONTRACT_IDL = IDL_JSON as Idl;

// Export all types
export * from './types';
