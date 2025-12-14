# Solana Integration Setup

This document describes the setup and configuration for the ZOL Solana smart contract integration.

## Dependencies Installed

### Solana & Anchor Dependencies
- `@solana/web3.js` - Core Solana JavaScript SDK
- `@solana/wallet-adapter-react` - React hooks for wallet integration
- `@solana/wallet-adapter-react-ui` - Pre-built UI components for wallet connection
- `@solana/wallet-adapter-wallets` - Support for multiple wallet types (Phantom, Solflare, etc.)
- `@coral-xyz/anchor` - Anchor framework for type-safe smart contract interactions
- `@solana/spl-token` - SPL Token program utilities for USDC handling

### Testing Dependencies
- `jest` - Testing framework
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Custom Jest matchers for DOM
- `@testing-library/user-event` - User interaction simulation
- `fast-check` - Property-based testing library
- `jest-environment-jsdom` - DOM environment for Jest

## Configuration Files

### Environment Variables (`.env.local`)
Contains configuration for:
- Solana cluster (devnet/mainnet-beta)
- RPC endpoint URLs
- ZOL program ID
- USDC mint address
- Fallback RPC endpoints

**Note:** Copy `.env.example` to `.env.local` and update values as needed.

### Configuration Module (`lib/config.ts`)
Centralized configuration module that exports:
- `SOLANA_CONFIG` - Blockchain connection settings
- `GAME_CONSTANTS` - Game-specific constants (factions, prices, intervals)
- `PDA_SEEDS` - Program Derived Address seeds
- `TRANSACTION_CONFIG` - Transaction confirmation settings
- `VALIDATION` - Helper functions for input validation

### TypeScript Configuration (`tsconfig.json`)
Updated with:
- Target ES2020 for better BigInt support
- Jest and testing library types
- Proper module resolution for Solana packages

### Jest Configuration (`jest.config.js`)
Configured for:
- Next.js integration
- JSdom test environment
- Module path mapping
- Coverage collection
- Transform ignore patterns for Solana packages

### Type Definitions (`types/solana.d.ts`)
Custom TypeScript definitions for:
- Wallet adapter interfaces
- Smart contract data structures
- Transaction result types
- Error types

## Usage

### Running Tests
```bash
# Run tests in watch mode
pnpm test

# Run tests once (CI mode)
pnpm test:ci

# Run tests with coverage
pnpm test:coverage
```

### Accessing Configuration
```typescript
import { SOLANA_CONFIG, GAME_CONSTANTS } from '@/lib/config';

// Use program ID
const programId = SOLANA_CONFIG.programId;

// Validate faction ID
const isValid = GAME_CONSTANTS.isValidFactionId(0); // true
```

## Next Steps

1. Generate and integrate IDL from smart contract (Task 2)
2. Implement wallet integration (Task 3)
3. Create PDA derivation utilities (Task 4)
4. Set up Anchor client (Task 5)

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SOLANA_CLUSTER` | Solana cluster to connect to | `devnet` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Primary RPC endpoint | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_ZOL_PROGRAM_ID` | ZOL smart contract program ID | `Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv` |
| `NEXT_PUBLIC_USDC_MINT` | USDC token mint address | `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` |
| `NEXT_PUBLIC_SOLANA_RPC_FALLBACK_1` | First fallback RPC endpoint | Optional |
| `NEXT_PUBLIC_SOLANA_RPC_FALLBACK_2` | Second fallback RPC endpoint | Optional |

## Troubleshooting

### Peer Dependency Warnings
Some wallet adapters may show peer dependency warnings with React 19. These are generally safe to ignore as the packages are compatible.

### Build Script Warnings
PNPM may show warnings about ignored build scripts. Run `pnpm approve-builds` if you need to enable specific build scripts.

### Module Resolution Issues
If you encounter module resolution issues with Solana packages, ensure:
1. `skipLibCheck: true` is set in `tsconfig.json`
2. Transform ignore patterns are configured in `jest.config.js`
3. Node modules are properly installed with `pnpm install`
