# ZOL - User Guide

Welcome to ZOL, a blockchain-based yield battle game on Solana! This guide will help you get started with connecting your wallet, joining a faction, and managing your deposits.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Connecting Your Wallet](#connecting-your-wallet)
3. [Registering and Choosing a Faction](#registering-and-choosing-a-faction)
4. [Making a Deposit](#making-a-deposit)
5. [Viewing Your Portfolio](#viewing-your-portfolio)
6. [Withdrawing Funds](#withdrawing-funds)
7. [Setting Up Automation](#setting-up-automation)
8. [Understanding Epochs](#understanding-epochs)
9. [FAQ](#faq)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### What You'll Need

1. **A Solana Wallet**
   - We recommend [Phantom](https://phantom.app/) or [Solflare](https://solflare.com/)
   - Install the browser extension for your preferred wallet

2. **SOL for Transaction Fees**
   - You'll need a small amount of SOL (usually < 0.01 SOL per transaction)
   - Get devnet SOL from the [Solana Faucet](https://faucet.solana.com/)

3. **USDC (Optional)**
   - To participate in battles, you'll need USDC
   - For devnet testing, you can use test USDC

### First Time Setup

1. Visit the ZOL application at [your-app-url]
2. Install a Solana wallet extension if you haven't already
3. Create or import a wallet in your wallet extension
4. Get some devnet SOL from the faucet (for testing)

---

## Connecting Your Wallet

### Step-by-Step Instructions

1. **Click the "Connect Wallet" button** in the top right corner of the application

2. **Select your wallet** from the list of available options:
   - Phantom
   - Solflare
   - Other supported wallets

3. **Approve the connection** in your wallet extension
   - Your wallet will ask for permission to connect
   - Click "Approve" or "Connect"

4. **Verify connection**
   - Once connected, you'll see your wallet address displayed
   - Your SOL balance will also be shown

### What Happens When You Connect?

- The application can now read your public wallet address
- You can view your on-chain data (positions, balances)
- You can sign transactions to interact with the game
- **Note:** The application NEVER has access to your private keys

### Disconnecting Your Wallet

To disconnect your wallet:

1. Click on your wallet address in the top right
2. Select "Disconnect"
3. Your wallet will be disconnected and all local data cleared

---

## Registering and Choosing a Faction

### Understanding Factions

ZOL has three factions competing for yield:

1. **Vanguard** (Purple)
   - Heavy armor and defensive capabilities
   - Focuses on protection and stability

2. **Mage** (Cyan)
   - Mystical powers and strategic abilities
   - Focuses on magical attacks

3. **Assassin** (Yellow)
   - Speed and precision strikes
   - Focuses on quick, decisive actions

**Important:** Once you choose a faction, you cannot change it for the current epoch!

### How to Register

1. **Navigate to the Arena page**
   - Click "Arena" in the navigation menu

2. **Review faction statistics**
   - Check each faction's Total Value Locked (TVL)
   - Review player counts and current scores
   - Consider which faction you want to support

3. **Select your faction**
   - Click on the faction card you want to join
   - A confirmation dialog will appear

4. **Confirm your choice**
   - Review your selection
   - Click "Confirm Registration"

5. **Sign the transaction**
   - Your wallet will prompt you to sign
   - Review the transaction details
   - Click "Approve" in your wallet

6. **Wait for confirmation**
   - The transaction will be processed on the blockchain
   - You'll see a success message when complete
   - This usually takes 5-30 seconds

### After Registration

- You're now a member of your chosen faction!
- You can proceed to make deposits
- Your faction choice is locked for this epoch

---

## Making a Deposit

### Before You Deposit

**Check your USDC balance:**
- Ensure you have USDC in your wallet
- The application will show your available balance

**Understand the commitment:**
- Deposits are locked until you choose to withdraw
- Your deposit contributes to your faction's TVL
- Higher TVL increases your faction's chances of winning

### Deposit Steps

1. **Navigate to the Arena page**
   - Make sure you're registered (see previous section)

2. **Enter deposit amount**
   - Type the amount of USDC you want to deposit
   - The minimum deposit is typically 0.01 USDC
   - Check that you have sufficient balance

3. **Review the transaction**
   - Verify the deposit amount
   - Check the current gas fees
   - Ensure you have enough SOL for fees

4. **Click "Deposit"**
   - The application will prepare the transaction

5. **Approve in your wallet**
   - Your wallet will show the transaction details
   - Review carefully:
     - Amount being transferred
     - Destination address (the vault)
     - Transaction fee
   - Click "Approve"

6. **Wait for confirmation**
   - The transaction will be submitted to Solana
   - You'll see a loading indicator
   - Confirmation usually takes 5-30 seconds

7. **Success!**
   - You'll see a success message with your transaction signature
   - Your deposit is now active
   - Your faction's TVL will increase

### What Happens to Your Deposit?

- Your USDC is transferred to the game's vault
- Your deposit is recorded in your user position
- Your faction's total TVL increases
- You're now participating in the current epoch's battle
- You'll earn yield based on your faction's performance

### Token Account Creation

**First-time depositors:**
- If you don't have a USDC token account, one will be created automatically
- This is a one-time setup
- There's a small fee (usually ~0.002 SOL) for account creation
- Future deposits won't require this step

---

## Viewing Your Portfolio

### Accessing Your Portfolio

1. **Click "Portfolio" in the navigation menu**
2. Your portfolio page will load with your current position

### What You'll See

**Overview Section:**
- **Total Deposited:** Your total USDC deposited across all epochs
- **Current Faction:** The faction you're currently supporting
- **Deposited Amount:** Your active deposit in the current epoch
- **Inventory:** Items you've acquired (swords, shields, spyglasses)

**Automation Settings:**
- Your current x402 payout preferences
- Priority slots for automatic item purchases
- Fallback action (compound or send to wallet)

**Battle History:**
- Past epochs you've participated in
- Your earnings from previous battles
- Win/loss record

### Understanding Your Stats

- **Total Deposited:** Cumulative amount you've deposited
- **Yield Earned:** Total yield you've earned from winning battles
- **Active Battles:** Number of epochs you're currently participating in
- **Win Rate:** Percentage of battles your faction has won

---

## Withdrawing Funds

### When Can You Withdraw?

- You can withdraw your principal at any time
- Withdrawals don't affect your faction choice
- You can withdraw partial amounts or your full deposit

### Withdrawal Steps

1. **Navigate to your Portfolio page**

2. **Click "Withdraw"**
   - You'll see your current deposited amount

3. **Enter withdrawal amount**
   - Type the amount you want to withdraw
   - Must be less than or equal to your deposited amount
   - The application will validate your input

4. **Review the transaction**
   - Verify the withdrawal amount
   - Check that you have SOL for transaction fees

5. **Click "Confirm Withdrawal"**

6. **Approve in your wallet**
   - Your wallet will show the transaction
   - Review the details carefully
   - Click "Approve"

7. **Wait for confirmation**
   - The transaction will be processed
   - Usually takes 5-30 seconds

8. **Success!**
   - Your USDC will be returned to your wallet
   - Your deposited amount will decrease
   - Your faction's TVL will decrease

### Important Notes

- **Partial withdrawals:** You can withdraw part of your deposit and keep the rest active
- **Full withdrawals:** Withdrawing everything removes you from the current epoch
- **Timing:** Withdrawals are processed immediately
- **Fees:** Only standard Solana transaction fees apply (very small)

---

## Setting Up Automation

### What is x402 Automation?

The x402 system automatically manages your yield payouts. Instead of manually claiming and deciding what to do with your earnings, you can set up rules to:
- Automatically compound your yield back into your position
- Purchase items to boost your faction
- Send yield directly to your wallet

### Automation Options

**1. Auto-Compound**
- Automatically reinvest your yield
- Increases your position size over time
- Maximizes long-term growth

**2. Send to Wallet**
- Automatically transfer yield to your wallet
- Gives you immediate access to earnings
- Good for regular income

**3. Item Purchase**
- Automatically buy items when you have enough yield
- Items boost your faction's performance
- Strategic advantage in battles

### Setting Up Automation

1. **Go to your Portfolio page**

2. **Find the "Automation Settings" section**

3. **Choose your priority slots:**
   - **Priority Slot 1:** First action to take with yield
   - **Priority Slot 2:** Second action if first isn't applicable

4. **For item purchases, specify:**
   - **Item Type:** Sword, Shield, or Spyglass
   - **Threshold:** Minimum yield amount before purchase

5. **Set your fallback action:**
   - What to do if neither priority slot applies
   - Options: Auto-compound or Send to wallet

6. **Click "Update Automation"**

7. **Sign the transaction in your wallet**

8. **Confirmation**
   - Your settings are saved on-chain
   - They'll apply to future yield distributions

### Example Automation Setup

**Aggressive Growth Strategy:**
- Priority 1: Buy Sword when yield ≥ 10 USDC
- Priority 2: Buy Shield when yield ≥ 2 USDC
- Fallback: Auto-compound

**Income Strategy:**
- Priority 1: Send to wallet
- Priority 2: N/A
- Fallback: Send to wallet

**Balanced Strategy:**
- Priority 1: Buy Spyglass when yield ≥ 5 USDC
- Priority 2: Auto-compound
- Fallback: Auto-compound

### Items and Their Effects

**Sword (10 USDC)**
- Increases your faction's attack power
- Boosts score in battles
- Offensive advantage

**Shield (2 USDC)**
- Increases your faction's defense
- Protects against attacks
- Defensive advantage

**Spyglass (5 USDC)**
- Provides strategic information
- Reveals opponent strategies
- Intelligence advantage

---

## Understanding Epochs

### What is an Epoch?

An epoch is a battle period in ZOL, typically lasting 3 days. During each epoch:
- Factions compete for yield
- TVL determines faction strength
- At the end, yield is distributed to the winning faction

### Epoch Lifecycle

**1. Active Phase**
- Users can register and deposit
- Factions accumulate TVL
- Battle is ongoing
- Lasts for most of the epoch duration

**2. Settlement Phase**
- Epoch has ended
- System calculates winners
- Yield is distributed
- Automation rules are executed
- Brief period before next epoch

**3. New Epoch**
- Fresh start for all factions
- Previous scores reset
- New battle begins
- Users can change factions (if they want)

### Epoch Information

On the Arena page, you'll see:
- **Current Epoch Number:** Which battle you're in
- **Time Remaining:** Countdown to epoch end
- **Status:** Active, Settlement, or Paused
- **Total TVL:** Combined deposits across all factions

### Notifications

You'll receive notifications when:
- An epoch is about to end (24 hours warning)
- An epoch enters settlement phase
- A new epoch begins
- Your faction wins or loses

### Strategy Tips

- **Early deposits:** Get in early to maximize your time in the battle
- **Monitor TVL:** Watch faction TVL to see who's leading
- **Epoch timing:** Consider depositing at the start of an epoch
- **Automation:** Set up automation before epoch ends

---

## FAQ

### General Questions

**Q: Is ZOL available on mainnet?**
A: Currently, ZOL is deployed on Solana devnet for testing. Mainnet launch will be announced.

**Q: What are the fees?**
A: Only standard Solana transaction fees apply (typically < 0.001 SOL per transaction). There are no additional platform fees.

**Q: Can I change my faction?**
A: Not during an active epoch. You can choose a different faction when registering for a new epoch.

**Q: Is my deposit safe?**
A: Your funds are held in a program-controlled vault on Solana. You can withdraw your principal at any time.

### Wallet Questions

**Q: Which wallets are supported?**
A: Phantom, Solflare, and other Solana wallet adapter compatible wallets.

**Q: Can I use multiple wallets?**
A: Yes, but each wallet has its own separate position. You can't combine positions across wallets.

**Q: What if I lose access to my wallet?**
A: Your position is tied to your wallet's private key. If you lose your wallet, you lose access to your position. Always backup your seed phrase!

### Deposit & Withdrawal Questions

**Q: What's the minimum deposit?**
A: Typically 0.01 USDC, but check the UI for current minimums.

**Q: How long does a deposit take?**
A: Usually 5-30 seconds for blockchain confirmation.

**Q: Can I withdraw during settlement?**
A: Yes, you can withdraw your principal at any time, even during settlement.

**Q: Do I lose my yield if I withdraw?**
A: No, any earned yield is yours. Withdrawing only affects your principal deposit.

### Battle & Yield Questions

**Q: How is the winner determined?**
A: The faction with the highest score at epoch end wins. Score is influenced by TVL and items.

**Q: How is yield distributed?**
A: Yield is distributed proportionally to winners based on their deposit size.

**Q: What if my faction loses?**
A: You keep your principal deposit. You can withdraw or continue to the next epoch.

**Q: Can I participate in multiple factions?**
A: Not with the same wallet. Each wallet can only support one faction per epoch.

### Technical Questions

**Q: What blockchain is this on?**
A: Solana blockchain (currently devnet).

**Q: What's the program ID?**
A: `Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv`

**Q: Can I view my transactions on-chain?**
A: Yes! Use [Solana Explorer](https://explorer.solana.com/) and search for your transaction signature.

**Q: Is the smart contract audited?**
A: Check the project documentation for audit information.

---

## Troubleshooting

### Connection Issues

**Problem: "Wallet not connecting"**

Solutions:
1. Refresh the page
2. Make sure your wallet extension is unlocked
3. Try disconnecting and reconnecting
4. Clear browser cache
5. Try a different browser

**Problem: "Wrong network"**

Solutions:
1. Open your wallet settings
2. Switch to Solana Devnet
3. Refresh the application

### Transaction Issues

**Problem: "Transaction failed"**

Common causes:
1. **Insufficient SOL:** Get more SOL for transaction fees
2. **Insufficient USDC:** Check your USDC balance
3. **Network congestion:** Wait a moment and try again
4. **Slippage:** The blockchain state changed, try again

**Problem: "Transaction taking too long"**

Solutions:
1. Wait up to 60 seconds for confirmation
2. Check Solana network status
3. If it fails, the transaction will be rejected (no funds lost)
4. Try again with a fresh transaction

**Problem: "Simulation failed"**

This means the transaction would fail if submitted. Common causes:
1. Insufficient balance
2. Invalid amount (too high or too low)
3. Account doesn't exist (need to register first)
4. Epoch has ended

### Account Issues

**Problem: "Account not found"**

Solutions:
1. Make sure you've registered first
2. Check that you're connected with the correct wallet
3. Refresh the page to reload data

**Problem: "Can't see my deposit"**

Solutions:
1. Wait a moment for blockchain confirmation
2. Click the refresh button
3. Check the transaction on Solana Explorer
4. Make sure you're viewing the correct wallet

### Balance Issues

**Problem: "Balance not updating"**

Solutions:
1. Click the refresh button
2. Wait for the next automatic update (every 10 seconds)
3. Disconnect and reconnect your wallet
4. Clear cache and reload

**Problem: "USDC balance shows zero"**

Solutions:
1. Make sure you have USDC in your wallet
2. Check that you're on the correct network (devnet)
3. You may need to add the USDC token to your wallet

### Error Messages

**"InvalidFaction"**
- You selected an invalid faction ID
- Choose Vanguard (0), Mage (1), or Assassin (2)

**"InsufficientFunds"**
- You don't have enough USDC for this operation
- Check your balance and try a smaller amount

**"EpochNotEnded"**
- Trying to perform an action that requires the epoch to end
- Wait for the current epoch to complete

**"User rejected transaction"**
- You declined the transaction in your wallet
- This is normal if you changed your mind
- Try again when ready

### Getting Help

If you're still experiencing issues:

1. **Check the browser console** for error messages (F12 → Console)
2. **Take a screenshot** of any error messages
3. **Note your transaction signature** if available
4. **Contact support** with:
   - Your wallet address (public key)
   - Transaction signature
   - Description of the issue
   - Screenshots

### Useful Links

- [Solana Status](https://status.solana.com/) - Check network health
- [Solana Explorer](https://explorer.solana.com/) - View transactions
- [Solana Faucet](https://faucet.solana.com/) - Get devnet SOL
- [Phantom Support](https://help.phantom.app/) - Wallet help
- [Solflare Support](https://solflare.com/support) - Wallet help

---

## Safety Tips

### Protect Your Wallet

1. **Never share your seed phrase** with anyone
2. **Verify transaction details** before signing
3. **Use a hardware wallet** for large amounts
4. **Keep your wallet software updated**
5. **Be cautious of phishing** - always check the URL

### Smart Practices

1. **Start small** - Test with small amounts first
2. **Understand the risks** - Blockchain transactions are irreversible
3. **Keep SOL for fees** - Always maintain a small SOL balance
4. **Monitor your positions** - Check your portfolio regularly
5. **Read transaction details** - Know what you're signing

### Red Flags

Watch out for:
- Requests for your private key or seed phrase
- Unexpected transaction requests
- Suspicious URLs or fake websites
- Promises of guaranteed returns
- Pressure to act quickly

---

## Welcome to ZOL!

You're now ready to start your journey in ZOL. Choose your faction wisely, manage your deposits strategically, and may your faction emerge victorious!

Remember:
- Start with small amounts to learn the system
- Monitor epoch timing for optimal deposits
- Set up automation to maximize your yields
- Join the community to discuss strategies

Good luck in the battles ahead! 🎮⚔️
