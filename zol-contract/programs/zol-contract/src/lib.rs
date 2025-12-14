use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv");

#[program]
pub mod zol_contract {
    use super::*;

    pub fn initialize_game(ctx: Context<InitializeGame>) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;
        game_state.epoch_number = 1;
        game_state.epoch_start_ts = Clock::get()?.unix_timestamp;
        game_state.epoch_end_ts = game_state.epoch_start_ts + 259200; // 3 days in seconds
        game_state.total_tvl = 0;
        game_state.status = GameStatus::Active;
        game_state.admin = *ctx.accounts.admin.key;
        
        // Initialize Factions
        game_state.factions = [
            FactionState { id: 0, name: "Vanguard".to_string(), tvl: 0, score: 0 },
            FactionState { id: 1, name: "Mage".to_string(), tvl: 0, score: 0 },
            FactionState { id: 2, name: "Assassin".to_string(), tvl: 0, score: 0 },
        ];

        msg!("ZOL Game Initialized. Epoch 1 Started.");
        Ok(())
    }

    pub fn init_vault(_ctx: Context<InitVault>) -> Result<()> {
        msg!("Vault Initialized");
        Ok(())
    }

    pub fn register_user(ctx: Context<RegisterUser>, faction_id: u8) -> Result<()> {
        require!(faction_id < 3, ZolError::InvalidFaction);
        
        let user_position = &mut ctx.accounts.user_position;
        user_position.owner = *ctx.accounts.user.key;
        user_position.faction_id = faction_id;
        user_position.deposited_amount = 0;
        user_position.last_deposit_epoch = ctx.accounts.game_state.epoch_number;
        
        // Default Automation: Compound everything (safest default)
        user_position.automation_settings = AutomationSettings {
            priority_slot_1: AutomationRule::default(),
            priority_slot_2: AutomationRule::default(),
            fallback_action: FallbackAction::AutoCompound,
        };

        user_position.inventory = UserInventory::default();
        
        msg!("User Registered in Faction {}", faction_id);
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let user_position = &mut ctx.accounts.user_position;
        let game_state = &mut ctx.accounts.game_state;

        // Transfer USDC from User to Vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_usdc.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Update State
        user_position.deposited_amount = user_position.deposited_amount.checked_add(amount).unwrap();
        user_position.last_deposit_epoch = game_state.epoch_number;
        
        game_state.total_tvl = game_state.total_tvl.checked_add(amount).unwrap();
        game_state.factions[user_position.faction_id as usize].tvl = 
            game_state.factions[user_position.faction_id as usize].tvl.checked_add(amount).unwrap();

        msg!("Deposited {} USDC to Faction {}", amount, user_position.faction_id);
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let user_position = &mut ctx.accounts.user_position;
        let game_state = &mut ctx.accounts.game_state;

        require!(user_position.deposited_amount >= amount, ZolError::InsufficientFunds);

        // Transfer USDC from Vault to User
        let bump = ctx.bumps.vault;
        let seeds = &[b"vault".as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user_usdc.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(), 
            cpi_accounts, 
            signer_seeds
        );
        token::transfer(cpi_ctx, amount)?;

        // Update State
        user_position.deposited_amount = user_position.deposited_amount.checked_sub(amount).unwrap();
        
        game_state.total_tvl = game_state.total_tvl.checked_sub(amount).unwrap();
        game_state.factions[user_position.faction_id as usize].tvl = 
            game_state.factions[user_position.faction_id as usize].tvl.checked_sub(amount).unwrap();

        msg!("Withdrew {} USDC", amount);
        Ok(())
    }

    pub fn update_automation(
        ctx: Context<UpdateAutomation>, 
        slot_1: AutomationRule,
        slot_2: AutomationRule,
        fallback: FallbackAction
    ) -> Result<()> {
        let user_position = &mut ctx.accounts.user_position;
        user_position.automation_settings.priority_slot_1 = slot_1;
        user_position.automation_settings.priority_slot_2 = slot_2;
        user_position.automation_settings.fallback_action = fallback;
        
        msg!("x402 Automation Rules Updated");
        Ok(())
    }

    // Call this at the end of an epoch to calculate scores
    pub fn resolve_epoch(ctx: Context<ResolveEpoch>) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;
        let _current_ts = Clock::get()?.unix_timestamp;

        // In production, check if epoch_end_ts has passed. 
        // For testing, we allow admin to force close.
        // require!(_current_ts >= game_state.epoch_end_ts, ZolError::EpochNotEnded);

        game_state.status = GameStatus::Settlement;

        // Logic: Score = (% TVL Target) - (% TVL Predator)
        // Factions: 0 (Vanguard) -> targets 2 (Assassin)
        //           2 (Assassin) -> targets 1 (Mage)
        //           1 (Mage)     -> targets 0 (Vanguard)
        
        let total_tvl = game_state.total_tvl as f64;
        if total_tvl == 0.0 {
            msg!("No TVL, skipping scoring.");
            return Ok(());
        }

        let tvl_0 = game_state.factions[0].tvl as f64;
        let tvl_1 = game_state.factions[1].tvl as f64;
        let tvl_2 = game_state.factions[2].tvl as f64;

        let pct_0 = tvl_0 / total_tvl;
        let pct_1 = tvl_1 / total_tvl;
        let pct_2 = tvl_2 / total_tvl;

        // Vanguard (0) vs Assassin (2) [Target] - Mage (1) [Predator]
        let score_0 = pct_2 - pct_1;
        
        // Mage (1) vs Vanguard (0) [Target] - Assassin (2) [Predator]
        let score_1 = pct_0 - pct_2;

        // Assassin (2) vs Mage (1) [Target] - Vanguard (0) [Predator]
        let score_2 = pct_1 - pct_0;

        // Store scores (scaled by 10000 to keep precision in i64)
        game_state.factions[0].score = (score_0 * 10000.0) as i64;
        game_state.factions[1].score = (score_1 * 10000.0) as i64;
        game_state.factions[2].score = (score_2 * 10000.0) as i64;

        msg!("Epoch Resolved. Scores: V:{}, M:{}, A:{}", 
            game_state.factions[0].score, 
            game_state.factions[1].score, 
            game_state.factions[2].score
        );
        
        Ok(())
    }

    // The x402 Engine Core
    pub fn execute_settlement(ctx: Context<ExecuteSettlement>, yield_amount: u64) -> Result<()> {
        let user_position = &mut ctx.accounts.user_position;
        let game_state = &mut ctx.accounts.game_state;
        
        let faction_score = game_state.factions[user_position.faction_id as usize].score;
        let mut final_yield = yield_amount;

        // --- Logic A: The Buffs (Active before settlement) ---
        
        if faction_score <= 0 {
            msg!("User faction lost.");
            
            // Check Shield (Insurance)
            if user_position.inventory.shield_count > 0 {
                msg!("x402: Shield Activated! Burning 1 shield to protect assets.");
                user_position.inventory.shield_count = user_position.inventory.shield_count.checked_sub(1).unwrap();
                
                // Logic: Payout "Consolation Yield" from Treasury? 
                // Or just avoid penalties? 
                // For this implementation, we simulate a small insurance payout coming from the Vault (funded by item sales).
                // Let's say insurance pays flat 2 USDC (2_000_000 units) to cover gas/pain.
                final_yield = 2_000_000; 
            } else {
                 return Ok(()); // Total loss, no yield.
            }
        } else {
            // Winning Scenario
            // Check Sword (Multiplier)
            if user_position.inventory.sword_count > 0 {
                // Boost 20%
                let bonus = final_yield / 5;
                final_yield = final_yield.checked_add(bonus).unwrap();
                msg!("x402: Multiplier Sword Applied! +20% Yield Boost.");
            }
        }

        if final_yield == 0 {
            return Ok(());
        }

        // --- Logic B: x402 Split & Swap Engine ---
        // We process Priority Slots. 
        // Logic: Try Slot 1 -> If remaining yield exists -> Try Slot 2 -> Remainder to Fallback.

        let mut remaining_yield = final_yield;
        
        // Define Item Prices (In real app, fetch from oracle or state)
        // 1=Sword (10 USDC), 2=Shield (2 USDC), 3=Spyglass (5 USDC)
        let get_item_price = |id: u8| -> u64 {
            match id {
                1 => 10_000_000, // Sword
                2 => 2_000_000,  // Shield
                3 => 5_000_000,  // Spyglass
                _ => 0,
            }
        };

        let bump = ctx.bumps.vault;
        let seeds = &[b"vault".as_ref(), &[bump]];
        let signer_seeds = &[&seeds[..]];

        // Helper to buy item
        let process_rule = |rule: AutomationRule, budget: &mut u64, inventory: &mut UserInventory| -> Result<bool> {
            if rule.item_id == 0 { return Ok(false); } // No rule
            
            // Check Threshold
            if *budget < rule.threshold { return Ok(false); } // Not enough yield to trigger intent

            let price = get_item_price(rule.item_id);
            if price == 0 || *budget < price { return Ok(false); } // Cannot afford

            // Buy Execution
            *budget = budget.checked_sub(price).unwrap();
            
            // Update Inventory (Mint logic simulation)
            match rule.item_id {
                1 => inventory.sword_count = inventory.sword_count.checked_add(1).unwrap(),
                2 => inventory.shield_count = inventory.shield_count.checked_add(1).unwrap(),
                3 => inventory.spyglass_count = inventory.spyglass_count.checked_add(1).unwrap(),
                _ => {},
            }

            // Transfer Cost to Shop Treasury
            let cpi_accounts = Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.shop_treasury.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(), 
                cpi_accounts, 
                signer_seeds
            );
            token::transfer(cpi_ctx, price)?;

            msg!("x402: Automated Buy - Item #{}", rule.item_id);
            Ok(true)
        };

        // Extract settings to avoid double borrow
        let slot_1 = user_position.automation_settings.priority_slot_1;
        let slot_2 = user_position.automation_settings.priority_slot_2;
        let fallback = user_position.automation_settings.fallback_action;

        // Execution Step 1: Priority Slot 1
        let _ = process_rule(slot_1, &mut remaining_yield, &mut user_position.inventory)?;

        // Execution Step 2: Priority Slot 2
        let _ = process_rule(slot_2, &mut remaining_yield, &mut user_position.inventory)?;


        // --- Logic C: Fallback Settlement ---
        
        if remaining_yield > 0 {
            match fallback {
                FallbackAction::SendToWallet => {
                     let cpi_accounts = Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to: ctx.accounts.user_usdc.to_account_info(),
                        authority: ctx.accounts.vault.to_account_info(),
                    };
                    let cpi_ctx = CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(), 
                        cpi_accounts, 
                        signer_seeds
                    );
                    token::transfer(cpi_ctx, remaining_yield)?;
                    msg!("x402: Sent remaining {} USDC to Wallet", remaining_yield);
                },
                FallbackAction::AutoCompound => {
                     user_position.deposited_amount = user_position.deposited_amount.checked_add(remaining_yield).unwrap();
                     game_state.total_tvl = game_state.total_tvl.checked_add(remaining_yield).unwrap();
                     game_state.factions[user_position.faction_id as usize].tvl = 
                        game_state.factions[user_position.faction_id as usize].tvl.checked_add(remaining_yield).unwrap();
                     msg!("x402: Auto-Compounded {} USDC", remaining_yield);
                }
            }
        }

        Ok(())
    }

    pub fn start_new_epoch(ctx: Context<StartNewEpoch>) -> Result<()> {
        let game_state = &mut ctx.accounts.game_state;
        
        // Reset scores for new epoch
        game_state.epoch_number += 1;
        game_state.epoch_start_ts = Clock::get()?.unix_timestamp;
        game_state.epoch_end_ts = game_state.epoch_start_ts + 259200;
        game_state.status = GameStatus::Active;
        
        // Reset faction scores? 
        // TVL remains (it's sticky), but scores reset.
        game_state.factions[0].score = 0;
        game_state.factions[1].score = 0;
        game_state.factions[2].score = 0;

        msg!("New Epoch {} Started!", game_state.epoch_number);
        Ok(())
    }

    // --- Dev/Mock Tools ---

    // Simulates the Vault earning interest from an external protocol.
    // The Admin (or a Faucet) injects "free" USDC into the vault.
    pub fn inject_yield(ctx: Context<InjectYield>, amount: u64) -> Result<()> {
        // Transfer USDC from Admin/Caller to Vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.provider_usdc.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.provider.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Note: We do NOT update total_tvl or user deposits.
        // This "extra" balance in the vault represents the Yield waiting to be distributed.
        
        msg!("Simulated Yield Injection: +{} USDC", amount);
        Ok(())
    }
}

// --- Data Structures ---

#[account]
pub struct GameState {
    pub admin: Pubkey,
    pub epoch_number: u64,
    pub epoch_start_ts: i64,
    pub epoch_end_ts: i64,
    pub total_tvl: u64,
    pub factions: [FactionState; 3], 
    pub status: GameStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct FactionState {
    pub id: u8,
    pub name: String, 
    pub tvl: u64,
    pub score: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum GameStatus {
    Active,
    Settlement,
    Paused,
}

#[account]
pub struct UserPosition {
    pub owner: Pubkey,
    pub faction_id: u8,
    pub deposited_amount: u64,
    pub last_deposit_epoch: u64,
    
    // New Advanced x402 Config
    pub automation_settings: AutomationSettings,
    
    // Updated Inventory (Counters instead of bool)
    pub inventory: UserInventory,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct AutomationSettings {
    pub priority_slot_1: AutomationRule,
    pub priority_slot_2: AutomationRule,
    pub fallback_action: FallbackAction,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct AutomationRule {
    pub item_id: u8, // 0=None, 1=Sword, 2=Shield, 3=Spyglass
    pub threshold: u64, // Trigger buy if yield >= this amount
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum FallbackAction {
    #[default]
    AutoCompound,
    SendToWallet,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct UserInventory {
    pub sword_count: u64,    // Yield Multiplier
    pub shield_count: u64,   // Insurance
    pub spyglass_count: u64, // Info Reveal
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PayoutPreference {
    SendToWallet,
    AutoCompound,
    BuyItem,
}

// --- Contexts ---

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(
        init, 
        payer = admin, 
        space = 8 + 32 + 8 + 8 + 8 + 8 + (4 + 50 + 8 + 8)*3 + 1 + 100, // Approx space calculation
        seeds = [b"game_state"],
        bump
    )]
    pub game_state: Account<'info, GameState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitVault<'info> {
    #[account(
        init,
        payer = admin,
        seeds = [b"vault"],
        bump,
        token::mint = usdc_mint,
        token::authority = vault,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(
        init, 
        payer = user, 
        space = 8 + 32 + 1 + 8 + 8 + (1+8+1+8+1) + (8*3) + 50, // Updated space for new structs
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,
    #[account(mut)]
    pub game_state: Account<'info, GameState>, // Read-only unless we update player count (omitted for brevity)
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"user", user.key().as_ref()], bump)]
    pub user_position: Account<'info, UserPosition>,
    
    #[account(mut, seeds = [b"game_state"], bump)]
    pub game_state: Account<'info, GameState>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, seeds = [b"user", user.key().as_ref()], bump)]
    pub user_position: Account<'info, UserPosition>,
    
    #[account(mut, seeds = [b"game_state"], bump)]
    pub game_state: Account<'info, GameState>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdatePreference<'info> {
    #[account(mut, seeds = [b"user", user.key().as_ref()], bump)]
    pub user_position: Account<'info, UserPosition>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateAutomation<'info> {
    #[account(mut, seeds = [b"user", user.key().as_ref()], bump)]
    pub user_position: Account<'info, UserPosition>,
    pub user: Signer<'info>,
}


#[derive(Accounts)]
pub struct ResolveEpoch<'info> {
    #[account(mut, seeds = [b"game_state"], bump)]
    pub game_state: Account<'info, GameState>,
    #[account(address = game_state.admin)]
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteSettlement<'info> {
    #[account(mut, seeds = [b"user", user_position.owner.as_ref()], bump)]
    pub user_position: Account<'info, UserPosition>,
    
    #[account(mut, seeds = [b"game_state"], bump)]
    pub game_state: Account<'info, GameState>,

    #[account(mut, seeds = [b"vault"], bump)]
    pub vault: Account<'info, TokenAccount>,

    // Only needed if preference is SendToWallet
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,
    
    // Only needed if preference is BuyItem
    #[account(mut)]
    pub shop_treasury: Account<'info, TokenAccount>,

    // Can be called by a bot/crank
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct StartNewEpoch<'info> {
    #[account(mut, seeds = [b"game_state"], bump)]
    pub game_state: Account<'info, GameState>,
    #[account(address = game_state.admin)]
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct InjectYield<'info> {
    #[account(mut, seeds = [b"vault"], bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub provider_usdc: Account<'info, TokenAccount>,
    #[account(mut)]
    pub provider: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum ZolError {
    #[msg("Invalid faction ID (must be 0-2)")]
    InvalidFaction,
    #[msg("Insufficient funds for withdrawal")]
    InsufficientFunds,
    #[msg("Epoch has not ended yet")]
    EpochNotEnded,
}
