import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ZolContract } from "../target/types/zol_contract";
// Import IDL directly
import idl from "../target/idl/zol_contract.json";
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount,
  mintTo, 
  getAccount, 
  TOKEN_PROGRAM_ID 
} from "@solana/spl-token";
import { assert } from "chai";

describe("ZOL Game & x402 Engine Tests", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Manual Program Loading to bypass workspace issues
  const programId = new anchor.web3.PublicKey("Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv");
  const program = new anchor.Program(idl as any, programId, provider) as Program<ZolContract>;
  
  // Test State Variables
  let gameStatePda: anchor.web3.PublicKey;
  let vaultPda: anchor.web3.PublicKey;
  let shopTreasury: anchor.web3.Keypair;
  let usdcMint: anchor.web3.PublicKey;
  
  // Players
  const admin = provider.wallet;
  const player1 = anchor.web3.Keypair.generate(); // Vanguard
  const player2 = anchor.web3.Keypair.generate(); // Mage
  const player3 = anchor.web3.Keypair.generate(); // Assassin (Target for Vanguard)

  // PDAs
  let player1Pda: anchor.web3.PublicKey;
  let player2Pda: anchor.web3.PublicKey;
  let player3Pda: anchor.web3.PublicKey;
  
  // Token Accounts
  let player1Usdc: anchor.web3.PublicKey;
  let player2Usdc: anchor.web3.PublicKey;
  let player3Usdc: anchor.web3.PublicKey;
  let vaultUsdc: anchor.web3.PublicKey;
  let shopTreasuryUsdc: anchor.web3.PublicKey;

  const INITIAL_DEPOSIT = new anchor.BN(100_000_000); // 100 USDC
  const MINT_AMOUNT = new anchor.BN(1_000_000_000); // 1000 USDC

  before(async () => {
    // 1. Find PDAs
    [gameStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("game_state")],
      program.programId
    );
    [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );
    
    [player1Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), player1.publicKey.toBuffer()],
      program.programId
    );
    [player2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), player2.publicKey.toBuffer()],
      program.programId
    );
    [player3Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), player3.publicKey.toBuffer()],
      program.programId
    );

    // 2. Setup Mock USDC
    // Note: In a real local test, we need to fund the payer first
    shopTreasury = anchor.web3.Keypair.generate();
    
    // Fund players with SOL (Reduced to 0.1 SOL to avoid rate limits)
    try {
      // Use provider wallet to fund players instead of airdrop if airdrop fails
      const transferSol = async (to: anchor.web3.PublicKey, amount: number) => {
          const tx = new anchor.web3.Transaction().add(
              anchor.web3.SystemProgram.transfer({
                  fromPubkey: provider.wallet.publicKey,
                  toPubkey: to,
                  lamports: amount,
              })
          );
          await provider.sendAndConfirm(tx);
      };

      // Transfer 0.1 SOL to each player from the rich provider wallet
      await transferSol(player1.publicKey, 0.1 * anchor.web3.LAMPORTS_PER_SOL);
      await transferSol(player2.publicKey, 0.1 * anchor.web3.LAMPORTS_PER_SOL);
      await transferSol(player3.publicKey, 0.1 * anchor.web3.LAMPORTS_PER_SOL);
      
      const p1Bal = await provider.connection.getBalance(player1.publicKey);
      console.log(`Funded players via wallet transfer. P1 Balance: ${p1Bal}`);
    } catch (e) {
      console.log("Funding failed:", e);
    }
    
    // Create Mint
    usdcMint = await createMint(
      provider.connection,
      (admin as any).payer,
      admin.publicKey,
      null,
      6
    );

    // Create Token Accounts (Using ATAs for simplicity and correctness with PDAs)
    // AllowOwnerOffCurve = true for Vault PDA
    player1Usdc = (await getOrCreateAssociatedTokenAccount(provider.connection, (admin as any).payer, usdcMint, player1.publicKey)).address;
    player2Usdc = (await getOrCreateAssociatedTokenAccount(provider.connection, (admin as any).payer, usdcMint, player2.publicKey)).address;
    player3Usdc = (await getOrCreateAssociatedTokenAccount(provider.connection, (admin as any).payer, usdcMint, player3.publicKey)).address;
    
    // Vault needs allowOwnerOffCurve = true
    vaultUsdc = (await getOrCreateAssociatedTokenAccount(provider.connection, (admin as any).payer, usdcMint, vaultPda, true)).address;
    
    shopTreasuryUsdc = (await getOrCreateAssociatedTokenAccount(provider.connection, (admin as any).payer, usdcMint, shopTreasury.publicKey)).address;

    // Mint to players
    await mintTo(provider.connection, (admin as any).payer, usdcMint, player1Usdc, admin.publicKey, BigInt(MINT_AMOUNT.toString()));
    await mintTo(provider.connection, (admin as any).payer, usdcMint, player2Usdc, admin.publicKey, BigInt(MINT_AMOUNT.toString()));
    await mintTo(provider.connection, (admin as any).payer, usdcMint, player3Usdc, admin.publicKey, BigInt(MINT_AMOUNT.toString()));
  });

  it("Initializes the Game", async () => {
    await program.methods
      .initializeGame()
      .accounts({
        gameState: gameStatePda,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const state = await program.account.gameState.fetch(gameStatePda);
    assert.equal(state.epochNumber.toNumber(), 1);
    assert.equal(state.status.active !== undefined, true);
  });

  it("Initializes the Vault", async () => {
    await program.methods
      .initVault()
      .accounts({
        vault: vaultPda,
        usdcMint: usdcMint,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  });

  it("Registers Users into Factions", async () => {
    // Player 1 -> Vanguard (0)
    await program.methods.registerUser(0).accounts({
      userPosition: player1Pda,
      gameState: gameStatePda,
      user: player1.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([player1]).rpc();

    // Player 2 -> Mage (1)
    await program.methods.registerUser(1).accounts({
      userPosition: player2Pda,
      gameState: gameStatePda,
      user: player2.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([player2]).rpc();

    // Player 3 -> Assassin (2)
    await program.methods.registerUser(2).accounts({
      userPosition: player3Pda,
      gameState: gameStatePda,
      user: player3.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([player3]).rpc();

    const p1State = await program.account.userPosition.fetch(player1Pda);
    assert.equal(p1State.factionId, 0);
  });

  it("Deposits Funds", async () => {
    // Player 1 Deposits
    await program.methods.deposit(INITIAL_DEPOSIT).accounts({
      userPosition: player1Pda,
      gameState: gameStatePda,
      vault: vaultUsdc,
      userUsdc: player1Usdc,
      user: player1.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).signers([player1]).rpc();

    // Player 2 Deposits
    await program.methods.deposit(INITIAL_DEPOSIT).accounts({
      userPosition: player2Pda,
      gameState: gameStatePda,
      vault: vaultUsdc,
      userUsdc: player2Usdc,
      user: player2.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).signers([player2]).rpc();

    // Player 3 Deposits
    await program.methods.deposit(INITIAL_DEPOSIT).accounts({
      userPosition: player3Pda,
      gameState: gameStatePda,
      vault: vaultUsdc,
      userUsdc: player3Usdc,
      user: player3.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).signers([player3]).rpc();

    const vaultBalance = await getAccount(provider.connection, vaultUsdc);
    assert.equal(vaultBalance.amount.toString(), INITIAL_DEPOSIT.mul(new anchor.BN(3)).toString());
  });

  it("Sets up x402 Automation (Player 1: Buy Sword if Win)", async () => {
    // Strategy: Priority 1 = Buy Sword (Item 1) if Yield > 10 USDC.
    // Fallback: AutoCompound.
    
    const ruleSword = {
      itemId: 1, // Sword
      threshold: new anchor.BN(10_000_000) // 10 USDC
    };
    
    const ruleEmpty = { itemId: 0, threshold: new anchor.BN(0) };

    await program.methods.updateAutomation(
      ruleSword, 
      ruleEmpty,
      { autoCompound: {} } // Fallback
    ).accounts({
      userPosition: player1Pda,
      user: player1.publicKey
    }).signers([player1]).rpc();

    const p1State = await program.account.userPosition.fetch(player1Pda);
    assert.equal(p1State.automationSettings.prioritySlot1.itemId, 1);
  });

  it("Resolves Epoch (Vanguard Wins)", async () => {
    // Scenario:
    // Vanguard (P1) vs Assassin (P3) [Target] - Mage (P2) [Predator]
    // All TVL equal (33% each).
    // Score V = %Target(33%) - %Predator(33%) = 0.
    // Wait, if everyone deposits equal, score is 0. No one wins.
    
    // Let's skew the TVL to make Vanguard Win.
    // Vanguard wants Assassin (Target) to be BIG, and Mage (Predator) to be SMALL.
    // Let's have Player 3 (Assassin) deposit MORE.
    
    const extraDeposit = new anchor.BN(200_000_000); // +200 USDC
    await program.methods.deposit(extraDeposit).accounts({
      userPosition: player3Pda,
      gameState: gameStatePda,
      vault: vaultUsdc,
      userUsdc: player3Usdc,
      user: player3.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).signers([player3]).rpc();

    // Now:
    // P1 (Vanguard): 100
    // P2 (Mage): 100
    // P3 (Assassin): 300
    // Total: 500
    
    // V Score = (300/500) - (100/500) = 0.6 - 0.2 = 0.4 (Positive!) -> WIN
    // A Score = (100/500) - (100/500) = 0.2 - 0.2 = 0.0 (Draw)
    // M Score = (100/500) - (300/500) = 0.2 - 0.6 = -0.4 (Lose)

    await program.methods.resolveEpoch().accounts({
      gameState: gameStatePda,
      admin: admin.publicKey
    }).rpc();

    const state = await program.account.gameState.fetch(gameStatePda);
    // Check Vanguard Score > 0
    const vScore = state.factions[0].score.toNumber();
    assert.isAbove(vScore, 0, "Vanguard should have positive score");
  });

  it("Injects Mock Yield", async () => {
    const yieldAmount = new anchor.BN(50_000_000); // 50 USDC Yield
    
    // Admin injects yield to vault (simulating DeFi protocol return)
    // Need to mint to admin first or use payer
    const adminUsdc = (await getOrCreateAssociatedTokenAccount(provider.connection, (admin as any).payer, usdcMint, admin.publicKey)).address;
    await mintTo(provider.connection, (admin as any).payer, usdcMint, adminUsdc, admin.publicKey, BigInt(yieldAmount.toString()));

    await program.methods.injectYield(yieldAmount).accounts({
      vault: vaultUsdc,
      providerUsdc: adminUsdc,
      provider: admin.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID
    }).rpc();
  });

  it("Executes x402 Settlement (Player 1 Buys Sword)", async () => {
    // Player 1 Won. They have 100 deposited.
    // Let's say their share of yield is 20 USDC.
    const userYield = new anchor.BN(20_000_000); 

    // Check inventory before
    let p1 = await program.account.userPosition.fetch(player1Pda);
    assert.equal(p1.inventory.swordCount.toNumber(), 0);

    await program.methods.executeSettlement(userYield).accounts({
      userPosition: player1Pda,
      gameState: gameStatePda,
      vault: vaultUsdc,
      userUsdc: player1Usdc,
      shopTreasury: shopTreasuryUsdc,
      tokenProgram: TOKEN_PROGRAM_ID
    }).rpc();

    // Check inventory after
    p1 = await program.account.userPosition.fetch(player1Pda);
    
    // Should have bought 1 Sword (Cost 10 USDC)
    // Yield (20) >= Threshold (10). Price (10).
    // Remaining (10) -> AutoCompound.
    assert.equal(p1.inventory.swordCount.toNumber(), 1, "Should have bought 1 sword");
    
    // Deposit should increase by remaining 10 USDC
    // Initial: 100_000_000. + 10_000_000 = 110_000_000
    assert.equal(p1.depositedAmount.toString(), "110000000", "Deposit should include remaining yield");
    
    // Shop should have received 10 USDC
    const shopBal = await getAccount(provider.connection, shopTreasuryUsdc);
    assert.equal(shopBal.amount.toString(), "10000000");
  });

  it("Starts New Epoch", async () => {
    await program.methods.startNewEpoch().accounts({
      gameState: gameStatePda,
      admin: admin.publicKey
    }).rpc();

    const state = await program.account.gameState.fetch(gameStatePda);
    assert.equal(state.epochNumber.toNumber(), 2);
    assert.equal(state.factions[0].score.toNumber(), 0, "Scores should reset");
  });
  
  it("Demonstrates Sword Boost in Next Settlement", async () => {
    // Simulating next win for Player 1
    // They now have a Sword.
    // Yield = 20 USDC.
    // Boost logic: +20% = 24 USDC.
    
    // Need to set faction score > 0 manually or play again.
    // For test speed, we can't manipulate score without playing, but we tested calculation above.
    // We can verify the "Multiplier Sword" logic in executeSettlement if we simulate another win.
    
    // Let's assume P1 is still in winning faction (state reset, so need to resolve again if we wanted 'real' flow)
    // But we can just call execute_settlement again? 
    // NO, execute_settlement checks `game_state.factions[id].score`.
    // We just reset scores to 0. So P1 will lose/draw now.
    
    // Force win state again hackily by resolving?
    // The TVL is still skewed! (Sticky TVL).
    // P1: 110 (Compounded)
    // P2: 100
    // P3: 300
    // Total: 510
    
    // V Score = (300/510) - (100/510) = Positive.
    
    await program.methods.resolveEpoch().accounts({
        gameState: gameStatePda,
        admin: admin.publicKey
    }).rpc();
    
    const userYield = new anchor.BN(20_000_000);
    
    // Check deposit before (110)
    
    await program.methods.executeSettlement(userYield).accounts({
      userPosition: player1Pda,
      gameState: gameStatePda,
      vault: vaultUsdc,
      userUsdc: player1Usdc,
      shopTreasury: shopTreasuryUsdc,
      tokenProgram: TOKEN_PROGRAM_ID
    }).rpc();
    
    const p1 = await program.account.userPosition.fetch(player1Pda);
    // Sword Logic: Yield 20 -> Boosted to 24.
    // Automation: > 10? Buy another sword.
    // Cost 10. Remaining 14.
    // Compounded: 110 + 14 = 124.
    
    assert.equal(p1.inventory.swordCount.toNumber(), 2, "Should have bought 2nd sword");
    assert.equal(p1.depositedAmount.toString(), "124000000", "Should include boosted yield");
  });
});
