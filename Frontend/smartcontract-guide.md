# ZOL x402 Smart Contract Development Guide

This guide outlines the architecture, data structures, and logic required to build the Solana Smart Contracts (Programs) for ZOL. It aligns with the frontend prototype and the `blueprint.md`, with a specific focus on the **x402 Settlement Protocol** and **Yield-to-Asset Economy**.

## 1. Architecture Overview

 The system consists of three interacting Anchor programs (or modules):

1.  **`zol_vault` (The Bank):** Handles USDC deposits, withdrawals, and integration with external Yield Sources (e.g., Kamino/Marginfi).
2.  **`zol_game` (The Arena):** Manages Epochs, Factions (Vanguard/Mage/Assassin), Scoring Logic, and Global State.
3.  **`x402_engine` (The Automation):** Handles user preferences, settlement logic, and the atomic "Split & Swap" mechanism for items.

---

## 2. Core Data Structures (State)

### A. Global Game State (`GameState`)
Tracks the current epoch and total value locked.

```rust
pub struct GameState {
    pub epoch_number: u64,
    pub epoch_start_ts: i64,
    pub epoch_end_ts: i64,
    pub total_tvl: u64,
    pub factions: [FactionState; 3], // 0: Vanguard, 1: Mage, 2: Assassin
    pub status: GameStatus, // Active, Settlement, Paused
}

pub struct FactionState {
    pub id: u8, 
    pub tvl: u64,
    pub player_count: u32,
    pub score: i64, // Calculated at epoch end
}
```

### B. User Account (`UserPosition`)
Stores individual player data and **x402 Preferences**.

```rust
pub struct UserPosition {
    pub owner: Pubkey,
    pub faction_id: u8,
    pub deposited_amount: u64,
    pub last_deposit_epoch: u64,
    
    // x402 Configuration
    pub payout_preference: PayoutPreference, 
    pub target_item_id: Option<u8>, // If preference is 'BuyItem', which item?
    
    // Inventory (On-Chain tracking for game logic)
    pub inventory: UserInventory, 
}

// The core enum for x402 logic
pub enum PayoutPreference {
    SendToWallet,
    AutoCompound,
    BuyItem, // The "Yield-to-Asset" trigger
}
```

---

## 3. The x402 Settlement Engine (Program C)

This is the most critical component. It executes the "Autonomous Inventory Manager" logic.

### Logic Flow: `execute_settlement`
This instruction is called by a permissionless "Crank" or the protocol bot at the end of an Epoch.

**Inputs:** 
- `user_position_account`
- `yield_source_account` (Where the yield sits)
- `shop_treasury_account` (To receive USDC for items)

**Pseudo-Code Logic:**

```rust
fn execute_settlement(ctx: Context<Settlement>, user: &mut UserPosition) -> Result<()> {
    // 1. Calculate Yield
    let user_share = calculate_user_yield(user.deposited_amount, winning_faction_total_yield);
    
    if user_share == 0 {
        return Ok(()); // Nothing to settle
    }

    // 2. Apply "Multiplier Sword" Buff if active
    let final_yield = if user.inventory.has_active_sword {
        user_share * 1.2 // 20% boost
    } else {
        user_share
    };

    // 3. x402 Decision Matrix (The "If-This-Then-That")
    match user.payout_preference {
        
        PayoutPreference::SendToWallet => {
            transfer_usdc(from: yield_vault, to: user.wallet, amount: final_yield)?;
        },

        PayoutPreference::AutoCompound => {
            // Re-deposit into the principal pool
            user.deposited_amount += final_yield;
            msg!("Auto-Compounded {} USDC", final_yield);
        },

        PayoutPreference::BuyItem => {
            // YIELD-TO-ASSET CONVERSION LOGIC
            let item_id = user.target_item_id.unwrap();
            let item_price = get_item_price(item_id); // e.g., 5 USDC

            if final_yield >= item_price {
                // A. Split: Calculate remainder
                let remainder = final_yield - item_price;

                // B. Swap: Pay for Item
                transfer_usdc(from: yield_vault, to: shop_treasury, amount: item_price)?;
                
                // C. Mint/Assign Item (Atomic)
                // Use Compressed NFT (cNFT) minting for low cost
                mint_game_item_cnft(to: user.wallet, item_id: item_id)?;
                user.inventory.add_item(item_id); // Update on-chain state for game logic
                
                // D. Settle Remainder
                // Default remainder behavior: Send to Wallet (or Compound based on secondary setting)
                transfer_usdc(from: yield_vault, to: user.wallet, amount: remainder)?;
                
                msg!("x402 Executed: Bought Item #{} using Yield", item_id);
            } else {
                // Fallback: Not enough yield to buy item
                // Default to Auto-Compound to save gas/effort
                user.deposited_amount += final_yield;
                msg!("Insufficient yield for item. Fallback: Auto-Compound");
            }
        }
    }
    
    Ok(())
}
```

---

## 4. Item Mechanics & Implementation

Items should be implemented as **Compressed NFTs (cNFTs)** on Solana (using Bubblegum program) to ensure the minting cost is negligible (~0.000005 SOL) compared to the item price.

### A. The "Spyglass" (Intel)
*   **Contract Logic:**
    *   The `get_faction_tvl` instruction usually returns "Blind Data" (obfuscated) during the last 24 hours of an epoch.
    *   **Logic:** If `user.inventory.has_spyglass == true`, the instruction returns the *real* TVL data.
    *   *Frontend:* Check inventory -> Call special RPC endpoint/instruction -> Show distribution graph.

### B. The "Yield Shield" (Insurance)
*   **Contract Logic:**
    *   Stored in `user.inventory`.
    *   Triggered when `user.faction != winning_faction`.
    *   Usually, losers get 0 yield.
    *   **Logic:** `if user.has_shield && user.is_loser { payout(insurance_pool, user, protected_amount) }`.
    *   *Note:* Requires an "Insurance Pool" funded by item sales.

### C. The "Multiplier Sword" (Leverage)
*   **Contract Logic:**
    *   A simple multiplier applied during the `calculate_user_yield` step in settlement.

---

## 5. Frontend Integration Guide (Frontend <-> Blockchain)

### Mock Token Setup for Development (Devnet/Testnet)

Since ZOL operates on a "Lossless" model using USDC, developers need a way to test without real funds.

**Step 1: Create Mock USDC Token**
Use the Solana CLI to create a standard SPL Token to represent Mock USDC.

```bash
# 1. Create Token
spl-token create-token
# Output: Address <MOCK_USDC_MINT_ADDRESS>

# 2. Create Account to hold tokens (Treasury/Faucet)
spl-token create-account <MOCK_USDC_MINT_ADDRESS>

# 3. Mint Supply to Faucet Treasury
spl-token mint <MOCK_USDC_MINT_ADDRESS> 1000000000
```

**Step 2: Configure Faucet Logic (Frontend/Backend)**
The Faucet page (`app/faucet/page.tsx`) should interact with a backend service or a permissioned payer wallet that holds the Mock USDC Authority/Supply.

*   **Frontend Action:** User requests 1000 USDC.
*   **Transaction:** Transfer 1000 Mock USDC from Faucet Treasury -> User Wallet.
*   **Env Variable:** Update `.env.local` with `NEXT_PUBLIC_MOCK_USDC_MINT=<MOCK_USDC_MINT_ADDRESS>`.

---

### Required SDK / Hooks
1.  **`useWallet()`**: Solana Wallet Adapter.
2.  **`useProgram()`**: To interact with the Anchor IDL.

### Key Integration Points in `page.tsx`

#### 1. Portfolio Page - Load User Data
Replace static `portfolioData` with a `fetchAccount` call:
```typescript
// Fetch UserPosition Account
const userAccount = await program.account.userPosition.fetch(wallet.publicKey);

// Map to UI
setPayoutPreference(userAccount.payoutPreference); // Enum mapping
setInventory(userAccount.inventory);
```

#### 2. Portfolio Page - Update Preference (The x402 Modal)
When user clicks "Confirm Change" in the settings modal:
```typescript
await program.methods
  .updatePayoutPreference(
    { buyItem: { itemId: "shield-potion" } } // Enum argument
  )
  .accounts({
    userPosition: userPda,
    signer: wallet.publicKey,
  })
  .rpc();
```

#### 3. Arena Page - Deployment
When user clicks "Deploy Forces":
```typescript
await program.methods
  .deposit(new BN(amount))
  .accounts({
    userPosition: userPda,
    vault: vaultPda,
    userUsdc: userTokenAccount,
    // ... context
  })
  .rpc();
```

---

## 6. Summary of Work for Backend Dev

1.  **Initialize Anchor Project:** Create the 3 programs.
2.  **Define IDL:** Create the `UserPosition` struct with the `PayoutPreference` enum immediately.
3.  **Implement Vault:** Basic deposit/withdraw of SPL Token (USDC).
4.  **Implement Game Loop:** Epoch timing and Faction scoring.
5.  **Implement x402 Engine:**
    *   Create a "Shop" treasury PDA.
    *   Write the `execute_settlement` logic with the "Split & Swap" calculation.
    *   Integrate Metaplex Bubblegum for cNFT minting (Item delivery).

This architecture ensures the **"Autonomous"** promise of ZOL is met technically, not just conceptually.
