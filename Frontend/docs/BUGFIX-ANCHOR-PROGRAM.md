# Bug Fix: Anchor Program Initialization Error

## Issue
The application was failing to initialize the Anchor program with the error:
```
Failed to initialize Anchor program: Error: Assertion failed
at assert (bn.js:6:21)
at BN._initArray (bn.js:145:5)
at BN.init [as _init] (bn.js:86:19)
at new BN (bn.js:39:12)
at new PublicKey (publickey.ts:69:20)
at translateAddress (common.ts:58:51)
at new Program (index.ts:273:17)
```

## Root Cause
The Anchor `Program` constructor was failing to parse the IDL because the IDL was being typed with a custom TypeScript type (`ZolContract`) instead of Anchor's built-in `Idl` type. This type mismatch caused Anchor's internal address parsing to fail when trying to create PublicKey instances from the IDL data.

## Solution
Modified `Frontend/lib/idl/index.ts` to use Anchor's `Idl` type for the IDL export:

```typescript
import type { Idl } from '@coral-xyz/anchor';
import type { ZolContract } from './types';
import IDL_JSON from './zol_contract.json';

// Export the program ID
export const ZOL_PROGRAM_ID = "Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv";

// Export the IDL as Anchor's Idl type
// Cast to Idl first to ensure compatibility with Anchor's Program constructor
export const ZOL_CONTRACT_IDL = IDL_JSON as Idl;
```

This ensures that:
1. The IDL is typed correctly for Anchor's Program constructor
2. Anchor can properly parse all address fields in the IDL
3. The Program instance is created successfully without type mismatches

## Files Modified
- `Frontend/lib/idl/index.ts` - Changed IDL export to use Anchor's `Idl` type
- `Frontend/hooks/use-zol-program.ts` - Uses the corrected IDL export

## Testing
After this fix:
- The Anchor program should initialize successfully
- Wallet connection should work properly
- All hooks that depend on `useZolProgram` should function correctly
- No more "Assertion failed" errors in the console

## Related
- Program ID: `Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv`
- Environment: Devnet
- Anchor version: ^0.29.0

## Technical Details
The issue was caused by a type incompatibility between our custom `ZolContract` type and Anchor's expected `Idl` type. When the Program constructor tried to parse addresses from the IDL, it encountered unexpected type structures that caused the PublicKey constructor to fail with an "Assertion failed" error in the underlying bn.js library.
