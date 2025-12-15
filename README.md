# ZOL: The Autonomous Lossless Strategy Game
> **Double Track Submission: Best Consumer App on Solana | Best Use of x402 with Solana**

---

## Executive Summary
**ZOL** is a "Lossless" PvP Strategy Game built on Solana where players fight for Yield, not Principal.
By combining **DeFi Savings** (Consumer Utility) with **Autonomous Agents** (x402 Innovation), we have built a product that solves the three biggest problems in crypto gaming: Risk, Inflation, and Friction.

---

## 🏆 TRACK 1: Best Consumer App on Solana
**Why ZOL is a strong contender:** We take a complex financial action (Providing Liquidity) and wrap it in a seamless, addictive Consumer Game.

### 1. Clear Real-World Use Case (Gamified Savings)
Most consumer apps are either "Fun but Useless" (Memes) or "Useful but Boring" (DeFi Dashboards).
*   **The Problem**: "Saving money" is boring. Most normal users don't want to manage LP positions.
*   **The ZOL Solution**: We turn "Saving USDC" into a **Faction War.** Users aren't "Yield Farming"—they are "Deploying Troops." This simple UX shift opens DeFi to the massive casual gaming market. The Principal is 100% Guaranteed Safe, removing the fear barrier for new users.

### 2. "Sticky" User Experience
We designed ZOL to be part of a daily habit leveraging **Human Psychology**:
*   **Social Tribalism**: You aren't just an investor; you are a "Vanguard" or "Mage".
*   **Fear of Missing Out (FOMO)**: The "Predator Formula" forces you to check the app to see if your faction is being hunted.
*   **Mobile-Ready**: Simple "Deposit" and "Withdraw" buttons. No complex wallet management required after initial connection.

---

## 🏆 TRACK 2: Best Use of x402 with Solana
**Why ZOL is a strong contender**: We move beyond simple payments. We use x402 as an **Autonomous Economic Agent** that manages the entire backend state.

### 1. Automation of Complex Intents (The x402 Agent)
Standard dApps suffer from "Click Fatigue" (Claim -> Signs -> Swap -> Sign -> Buy -> Sign).
**Innovation**: ZOL uses `execute_settlement` to run an on-chain agent that manages your yield based on pre-programmed intents.

**The Protocol acts as your Agent:**
1.  **Win Condition Check**: The agent reads the game state to see if you won.
2.  **Asset Protection (Shield)**: If you lost, the agent automatically burns a Shield check from your inventory to trigger an insurance payout (flat 2.00 USDC), saving your yield streak.
3.  **Yield Boosting (Sword)**: If you won, the agent applies a Sword multiplier to boost yield by **20%**.
4.  **Auto-Shopping**: Based on your `AutomationSettings`, the agent will spend your yield to restock items automatically.
    *   *Example Intent*: "If I win > 10 USDC, buy me a Sword. Auto-compound the rest."
5.  **Auto-Compound**: Finally, any remaining yield is automatically redeposited into your principal.

### 2. The "Self-Driving" Economy
Without x402, ZOL would require users to manually claim rewards every 3 days. This friction kills retention.
With x402, ZOL becomes a **"Set and Forget"** protocol. A user can deposit once and let the x402 Agent play the game for them (via Auto-Compounding and Auto-Restocking) for years. This demonstrates the true power of x402: **Turning Active Tasks into Passive Flows.**

---

## ⚔️ Game Mechanics: The "Predator" Engine
How does the game actually work? It is a massive social experiment based on a **Negative Feedback Loop**.

### The Factions (Rock-Paper-Scissors)
Code Logic (`lib.rs`):
- **Vanguard (ID 0)**: Targets **Assassin** | Hunted by **Mage**
- **Mage (ID 1)**: Targets **Vanguard** | Hunted by **Assassin**
- **Assassin (ID 2)**: Targets **Mage** | Hunted by **Vanguard**

### The Formula
$$ \text{Faction Score} = (\% \text{TVL of Prey}) - (\% \text{TVL of Predator}) $$

**Code Implementation**:
```rust
// Vanguard Score
let score_0 = pct_assassin - pct_mage; 

// Mage Score
let score_1 = pct_vanguard - pct_assassin;

// Assassin Score
let score_2 = pct_mage - pct_vanguard;
```

*   **The Logic**: If the **Vanguard** tribe becomes too popular (Crowded Trade), they don't get stronger. Instead, they become a huge target for **Mages** (Predators).
*   **The Strategy**: This creates a dynamic equilibrium. Players must spy on the blockchain data to predict where the "Herd" is going, and position themselves to counter it.

---

## 🛠 Technical Architecture

### Smart Contract (Anchor)
The core logic resides in a single Solana program (`Hxmj...qBAv`).
*   **State Management**:
    *   `GameState`: Global singleton tracking Total TVL, Epoch timestamps, and Faction Scores.
    *   `UserPosition`: PDA seeded by `[b"user", user_key]` storing the player's Deposit, Faction ID, Inventory, and **Automation Rules**.
*   **Vault Architecture**: Standard SPL Token Vault holding the underlying asset (USDC).
*   **Safety**: Users can always withdraw their Principal. Only Yield is at risk in the game.

### x402 Automation Structure
The `AutomationSettings` struct allows for granular control over the on-chain agent:
```rust
pub struct AutomationSettings {
    pub priority_slot_1: AutomationRule, // Primary Intent (e.g., Buy Sword)
    pub priority_slot_2: AutomationRule, // Secondary Intent (e.g., Buy Shield)
    pub fallback_action: FallbackAction, // What to do with leftover yield (Compound vs Wallet)
}
```

### Key Instructions
1.  `initialize_game`: Sets up the global state/factions.
2.  `register_user`: Creates a User Position PDA.
3.  `deposit` / `withdraw`: Principal management.
4.  `update_automation`: User configures their x402 Agent.
5.  `resolve_epoch`: Admin/Crank closes the 3-day epoch and calculates scores.
6.  `execute_settlement`: **The Core**. Distributes yield, processes agent buffs, executes auto-buys, and compounds.
7.  `inject_yield`: (Demo) Simulates external yield generation.

---

### Links & Resources
*   **Video Demo**: [https://youtu.be/0ZjZyNCADeU](https://youtu.be/0ZjZyNCADeU)
*   **Live App**: [https://zol-game.vercel.app](https://zol-game.vercel.app)
*   **GitHub Repo**: [https://github.com/yeheskieltame/ZOL](https://github.com/yeheskieltame/ZOL)

*   **Solana Program**: [https://solscan.io/account/Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv?cluster=devnet](https://solscan.io/account/Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv?cluster=devnet)
*   **Pitch Deck**: [https://www.canva.com/design/DAG7kIT5Qnk/xBDC12bONPnZBQhYkZTUHw/edit?utm_content=DAG7kIT5Qnk&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton](https://www.canva.com/design/DAG7kIT5Qnk/xBDC12bONPnZBQhYkZTUHw/edit?utm_content=DAG7kIT5Qnk&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton)

---

## 👨‍💻 Developer
**Yeheskiel Yunus Tame**
*   **Role**: Solo Developer | Fullstack Developer
*   **Education**: Informatics Student at Duta Wacana Christian University (UKDW)
