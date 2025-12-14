# USDC Faucet Setup Guide

## Overview

The ZOL Faucet allows users to claim mock USDC tokens for testing on Solana devnet. This document explains how the faucet works and how to set it up.

## How It Works

1. User connects their Solana wallet on the `/faucet` page
2. User selects an amount (1000, 5000, or 10000 USDC)
3. Frontend calls `/api/faucet` endpoint
4. Backend mints mock USDC tokens directly to user's wallet
5. User receives tokens and can use them in the ZOL Arena

## Current Configuration

- **Network**: Devnet
- **Mock USDC Mint**: `J4w89qqv1g2FKYME38EtQyHAqgpMB9NDzRZuoXpZosXC`
- **Faucet Authority**: `5DERJCtKzT1YiFa4gkj6n2x6HeoDjBybed2FXfRtaMUS`
- **Daily Limit**: 50,000 USDC per wallet

## Setup Instructions

### 1. Create Mock USDC Token (One-time setup)

If you need to create a new mock USDC token:

```bash
cd Frontend
node scripts/setup-mock-usdc.js
```

This will:
- Generate a new faucet authority keypair
- Request SOL airdrop for transaction fees
- Create a new SPL token with 6 decimals
- Output the configuration values

### 2. Configure Environment Variables

Add to `.env.local`:

```bash
# Mock USDC mint address
NEXT_PUBLIC_USDC_MINT=<your-mint-address>

# Faucet mint authority secret key (JSON array)
FAUCET_MINT_AUTHORITY_SECRET=[1,2,3,...,64]
```

### 3. Fund the Faucet Authority

The faucet authority wallet needs SOL for transaction fees:

1. Go to https://faucet.solana.com/
2. Enter the faucet authority address
3. Request airdrop

## API Endpoints

### POST /api/faucet

Request mock USDC airdrop.

**Request Body:**
```json
{
  "walletAddress": "user-wallet-address",
  "amount": "1000" // or "5000" or "10000"
}
```

**Response:**
```json
{
  "success": true,
  "signature": "transaction-signature",
  "amount": 1000,
  "recipient": "user-wallet-address"
}
```

### GET /api/faucet

Check faucet status.

**Response:**
```json
{
  "status": "operational",
  "usdcMint": "mint-address",
  "availableAmounts": [1000, 5000, 10000],
  "dailyLimit": 50000
}
```

### GET /api/token-balance

Check token balance for a wallet.

**Query Parameters:**
- `wallet`: Wallet address
- `mint`: Token mint address

**Response:**
```json
{
  "balance": 1000000000,
  "address": "associated-token-account"
}
```

## Rate Limiting

- Each wallet can claim up to 50,000 USDC per day
- Rate limit resets after 24 hours
- In production, use Redis or database for persistent rate limiting

## Troubleshooting

### "Faucet not configured"
- Check that `FAUCET_MINT_AUTHORITY_SECRET` is set in `.env.local`
- Ensure the secret key is a valid JSON array of 64 numbers

### "Mint authority mismatch"
- The configured keypair doesn't have mint authority for the token
- Run `setup-mock-usdc.js` to create a new token with correct authority

### "Insufficient SOL"
- The faucet authority wallet needs SOL for transaction fees
- Request airdrop from https://faucet.solana.com/

## Security Notes

- `FAUCET_MINT_AUTHORITY_SECRET` is server-side only (no `NEXT_PUBLIC_` prefix)
- Never expose the mint authority secret key to the client
- In production, consider using a more secure key management solution
