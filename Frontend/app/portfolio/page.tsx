"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Modal } from "@/components/modal"
import { TrendingUp, TrendingDown, Trophy, Settings, ArrowRightLeft } from "lucide-react"
import { useUserPosition } from "@/hooks/use-user-position"
import { useZolTransactions } from "@/hooks/use-zol-transactions"
import { useEpochNotifications } from "@/hooks/use-epoch-notifications"
import { transformUserPosition, getFactionName, lamportsToUsdc, usdcToLamports } from "@/lib/transformers"
import type { AutomationRule, FallbackAction } from "@/lib/idl/types"
import { EpochStatusBanner } from "@/components/epoch-status-banner"
import { PageErrorBoundary } from "@/components/page-error-boundary"

function PortfolioPageContent() {
  const { connected, publicKey } = useWallet()
  const { userPosition, isRegistered, loading: positionLoading, error: positionError, refetch } = useUserPosition()
  const { 
    withdraw, 
    updateAutomation, 
    isProcessing, 
    transactionState,
    clearTransactionState,
    error: transactionError 
  } = useZolTransactions()
  
  // Real-time epoch notifications
  const { currentEpoch, currentStatus } = useEpochNotifications()

  // Transform blockchain data to display format
  const portfolioData = userPosition 
    ? transformUserPosition(userPosition)
    : {
        totalDeposited: 0,
        totalYieldEarned: 0,
        activeBattles: 0,
        winRate: 0,
        currentFaction: 'None',
        automationPreference: 'wallet' as const,
        inventory: {
          swordCount: 0,
          shieldCount: 0,
          spyglassCount: 0,
        },
      }

  // Get payout preference from blockchain data
  const payoutPreference = portfolioData.automationPreference
  const [pendingPreference, setPendingPreference] = useState<"wallet" | "compound" | "item" | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showItemSelectionModal, setShowItemSelectionModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<number | null>(null)
  const [selectedItemThreshold, setSelectedItemThreshold] = useState<number>(10)

  const availableItems = [
    {
      id: 1, // Sword
      name: "Sword",
      description: "Increase your faction's attack power",
      price: "10 USDC",
      image: "⚔️"
    },
    {
      id: 2, // Shield
      name: "Shield",
      description: "Protect your faction from attacks",
      price: "2 USDC",
      image: "🛡️"
    },
    {
      id: 3, // Spyglass
      name: "Spyglass",
      description: "See enemy TVL distribution before lock",
      price: "5 USDC",
      image: "🔭"
    }
  ]
  
  // Build inventory from blockchain data
  const inventory = []
  if (portfolioData.inventory.swordCount > 0) {
    inventory.push({
      id: "sword",
      name: "Sword",
      count: portfolioData.inventory.swordCount,
      image: "⚔️"
    })
  }
  if (portfolioData.inventory.shieldCount > 0) {
    inventory.push({
      id: "shield",
      name: "Shield",
      count: portfolioData.inventory.shieldCount,
      image: "🛡️"
    })
  }
  if (portfolioData.inventory.spyglassCount > 0) {
    inventory.push({
      id: "spyglass",
      name: "Spyglass",
      count: portfolioData.inventory.spyglassCount,
      image: "🔭"
    })
  }

  // Build deposits array from user position
  const deposits = userPosition && userPosition.depositedAmount > 0n
    ? [{
        id: 1,
        faction: getFactionName(userPosition.factionId),
        amount: lamportsToUsdc(userPosition.depositedAmount),
        epoch: Number(userPosition.lastDepositEpoch),
        status: "active" as const,
        apy: 0, // TODO: Calculate from game state
      }]
    : []

  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [selectedDeposit, setSelectedDeposit] = useState<number | null>(null)
  
  // Recent auto-payouts data simulation (TODO: fetch from blockchain/indexer)
  const recentPayouts = [
    {
      id: "tx-1",
      epoch: 42,
      amount: 156.80,
      date: "Dec 6, 2025",
      status: "Auto-Paid",
      destination: publicKey ? `Wallet (...${publicKey.toString().slice(-4)})` : "Wallet"
    },
  ]

  // Battle history simulation (TODO: fetch from blockchain/indexer)
  const battleHistory = [
    {
      epoch: Number(userPosition?.lastDepositEpoch || 0),
      faction: userPosition ? getFactionName(userPosition.factionId) : "Unknown",
      amount: userPosition ? lamportsToUsdc(userPosition.depositedAmount) : 0,
      result: "active" as const,
      yield: 0,
      date: new Date().toLocaleDateString(),
    },
  ]

  const handleWithdraw = async () => {
    if (!selectedDeposit || !withdrawAmount) return

    try {
      const amount = Number.parseFloat(withdrawAmount)
      if (amount <= 0) {
        throw new Error('Amount must be greater than zero')
      }

      // Convert USDC to lamports
      const amountLamports = Number(usdcToLamports(amount))
      
      // Execute withdraw transaction
      const signature = await withdraw(amountLamports)
      
      // Refresh user position data
      await refetch()
      
      setShowWithdrawModal(false)
      setSuccessMessage(`Successfully withdrawn ${withdrawAmount} USDC`)
      setShowSuccessModal(true)
      setWithdrawAmount("")
      setSelectedDeposit(null)
    } catch (error: any) {
      console.error('Withdraw error:', error)
      setSuccessMessage(`Withdrawal failed: ${error.message}`)
      setShowSuccessModal(true)
    }
  }

  const initiatePreferenceChange = (type: "wallet" | "compound" | "item") => {
    if (type === payoutPreference) return
    
    if (type === "item") {
      setShowItemSelectionModal(true)
      return
    }

    setPendingPreference(type)
    setShowSettingsModal(true)
  }

  const confirmItemSelection = (itemId: number, threshold: number) => {
    setSelectedItem(itemId)
    setSelectedItemThreshold(threshold)
    setPendingPreference("item")
    setShowItemSelectionModal(false)
    setShowSettingsModal(true)
  }

  const handleConfirmPreferenceChange = async () => {
    if (!pendingPreference) return

    try {
      // Build automation rules based on preference
      let slot1: AutomationRule = { itemId: 0, threshold: 0n }
      let slot2: AutomationRule = { itemId: 0, threshold: 0n }
      let fallback: FallbackAction = { sendToWallet: {} }

      if (pendingPreference === "compound") {
        fallback = { autoCompound: {} }
      } else if (pendingPreference === "wallet") {
        fallback = { sendToWallet: {} }
      } else if (pendingPreference === "item" && selectedItem) {
        // Set item purchase in priority slot 1
        slot1 = { 
          itemId: selectedItem, 
          threshold: usdcToLamports(selectedItemThreshold) 
        }
        fallback = { sendToWallet: {} } // Fallback to wallet if threshold not met
      }

      // Execute update automation transaction
      await updateAutomation(slot1, slot2, fallback)
      
      // Refresh user position data
      await refetch()

      let message = ""
      if (pendingPreference === "wallet") message = "Send to Wallet"
      else if (pendingPreference === "compound") message = "Auto-Compound"
      else if (pendingPreference === "item") {
        const item = availableItems.find(i => i.id === selectedItem)
        message = `Auto-Buy ${item?.name}`
      }

      setSuccessMessage(`Payout preference updated to ${message}`)
      setShowSettingsModal(false)
      setShowSuccessModal(true)
      setPendingPreference(null)
    } catch (error: any) {
      console.error('Update automation error:', error)
      setSuccessMessage(`Update failed: ${error.message}`)
      setShowSuccessModal(true)
    }
  }

  // Show wallet connection prompt if not connected
  if (!connected) {
    return (
      <div className="min-h-screen pt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-5xl font-bold tracking-tighter mb-4">PORTFOLIO</h1>
            <p className="text-muted-foreground mb-8">
              Connect your wallet to view your portfolio
            </p>
            <div className="border-2 border-border p-12">
              <p className="text-lg mb-4">Please connect your Solana wallet to continue</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (positionLoading) {
    return (
      <div className="min-h-screen pt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-5xl font-bold tracking-tighter mb-4">PORTFOLIO</h1>
            <p className="text-muted-foreground mb-8">Loading your position...</p>
            <div className="border-2 border-border p-12">
              <div className="animate-pulse">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show unregistered state
  if (!isRegistered) {
    return (
      <div className="min-h-screen pt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-5xl font-bold tracking-tighter mb-4">PORTFOLIO</h1>
            <p className="text-muted-foreground mb-8">
              You haven't registered yet
            </p>
            <div className="border-2 border-border p-12">
              <p className="text-lg mb-4">Please register and join a faction to start playing</p>
              <Button onClick={() => window.location.href = '/arena'}>
                GO TO ARENA
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (positionError) {
    return (
      <div className="min-h-screen pt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-5xl font-bold tracking-tighter mb-4">PORTFOLIO</h1>
            <p className="text-muted-foreground mb-8">Error loading portfolio</p>
            <div className="border-2 border-destructive p-12">
              <p className="text-lg mb-4">{positionError.message}</p>
              <Button onClick={() => refetch()}>RETRY</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Epoch Status Banner */}
          <EpochStatusBanner 
            status={currentStatus} 
            epochNumber={currentEpoch} 
            className="mb-6"
          />

          {/* Header */}
          <div className="border-b-2 border-border pb-8 mb-12">
            <h1 className="text-5xl font-bold tracking-tighter mb-2">PORTFOLIO</h1>
            <p className="text-muted-foreground">Manage your deposits, rewards, and battle performance</p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="border-2 border-border p-6">
              <div className="text-xs font-bold tracking-widest text-muted-foreground mb-2">TOTAL DEPLOYED</div>
              <div className="text-3xl font-bold">${portfolioData.totalDeposited.toLocaleString()}</div>
            </div>

            <div className="border-2 border-secondary p-6">
              <div className="text-xs font-bold tracking-widest text-muted-foreground mb-2">YIELD EARNED</div>
              <div className="text-3xl font-bold text-secondary">
                ${portfolioData.totalYieldEarned.toLocaleString()}
              </div>
            </div>

            <div className="border-2 border-primary p-6">
              <div className="text-xs font-bold tracking-widest text-muted-foreground mb-2">ACTIVE BATTLES</div>
              <div className="text-3xl font-bold text-primary">{portfolioData.activeBattles}</div>
            </div>

            <div className="border-2 border-accent p-6">
              <div className="text-xs font-bold tracking-widest text-muted-foreground mb-2">FACTION</div>
              <div className="text-3xl font-bold text-accent">{portfolioData.currentFaction}</div>
            </div>
          </div>

          {/* x402 Settings & Auto-Payout History */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* x402 Preferences */}
            <div className="border-2 border-primary/50 p-6 bg-primary/5 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="font-bold tracking-tight">x402 PAYOUT SETTINGS</h3>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                Determine how your winnings are distributed automatically.
              </p>

              <div className="space-y-3">
                 <button 
                  onClick={() => initiatePreferenceChange("wallet")}
                  className={`w-full p-3 border-2 text-left transition-all flex items-center justify-between ${
                    payoutPreference === "wallet" 
                      ? "border-primary bg-background" 
                      : "border-transparent hover:bg-muted/50"
                  }`}
                 >
                   <span className="text-sm font-bold">SEND TO WALLET</span>
                   {payoutPreference === "wallet" && <div className="h-2 w-2 rounded-full bg-primary" />}
                 </button>

                 <button 
                  onClick={() => initiatePreferenceChange("compound")}
                  className={`w-full p-3 border-2 text-left transition-all flex items-center justify-between ${
                    payoutPreference === "compound" 
                      ? "border-primary bg-background" 
                      : "border-transparent hover:bg-muted/50"
                  }`}
                 >
                   <span className="text-sm font-bold">AUTO-COMPOUND</span>
                   {payoutPreference === "compound" && <div className="h-2 w-2 rounded-full bg-primary" />}
                 </button>

                 <button 
                  onClick={() => initiatePreferenceChange("item")}
                  className={`w-full p-3 border-2 text-left transition-all flex items-center justify-between ${
                    payoutPreference === "item" 
                      ? "border-primary bg-background" 
                      : "border-transparent hover:bg-muted/50"
                  }`}
                 >
                   <span className="text-sm font-bold">CONVERT TO ITEM (NFT)</span>
                   {payoutPreference === "item" && <div className="h-2 w-2 rounded-full bg-primary" />}
                 </button>
              </div>
            </div>

            {/* Recent Payouts Feed */}
            <div className="border-2 border-secondary/20 p-6 md:col-span-2">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5 text-secondary" />
                    <h3 className="font-bold tracking-tight">RECENT AUTO-PAYOUTS</h3>
                  </div>
                  <div className="text-xs font-bold text-secondary px-2 py-1 bg-secondary/10 rounded">
                    POWERED BY x402
                  </div>
               </div>

               <div className="space-y-3">
                  {recentPayouts.length > 0 ? recentPayouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                      <div className="flex flex-col">
                         <span className="font-bold text-sm">Epoch #{payout.epoch} Reward</span>
                         <span className="text-xs text-muted-foreground">{payout.date} • {payout.destination}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-secondary">+${payout.amount.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{payout.status}</div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No payouts yet. Win battles to earn rewards!
                    </div>
                  )}
               </div>
            </div>
          </div>

          <Tabs defaultValue="active" className="w-full">
            <TabsList className="border-b-2 border-border mb-8">
              <TabsTrigger value="active" className="data-[state=active]:border-b-2 data-[state=active]:border-primary">
                ACTIVE POSITIONS
              </TabsTrigger>
              <TabsTrigger
                 value="inventory"
                 className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                 INVENTORY
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                BATTLE HISTORY
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6">
              <div className="space-y-4">
                {deposits.length > 0 ? deposits.map((deposit) => (
                  <div key={deposit.id} className="border-2 border-border p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold tracking-tighter mb-1">{deposit.faction}</h3>
                        <p className="text-sm text-muted-foreground font-mono">EPOCH #{deposit.epoch}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">${deposit.amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">USDC</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => {
                          setSelectedDeposit(deposit.id)
                          setShowWithdrawModal(true)
                        }}
                        disabled={isProcessing}
                      >
                        WITHDRAW
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 border-2 border-dashed border-border">
                    <p className="text-muted-foreground">No active positions</p>
                    <p className="text-xs text-muted-foreground mt-1">Go to Arena to deposit funds</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-6">
               {inventory.length > 0 ? (
                 <div className="grid md:grid-cols-2 gap-4">
                    {inventory.map((item) => (
                      <div key={item.id} className="border-2 border-border p-4 flex items-center gap-4">
                         <div className="text-4xl bg-muted p-4 rounded-md">{item.image}</div>
                         <div>
                            <h3 className="font-bold text-lg">{item.name}</h3>
                            <p className="text-xs text-muted-foreground">Qty: {item.count} • Automatically purchased via x402</p>
                         </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="text-center py-12 border-2 border-dashed border-border">
                    <p className="text-muted-foreground">No items in inventory yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Set "Convert to Item" in x402 settings to auto-buy items with yield.</p>
                 </div>
               )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card className="border-primary/20 bg-card/80 backdrop-blur p-6">
                <h2 className="text-2xl font-bold mb-4">Battle History</h2>

                <div className="space-y-3">
                  {battleHistory.map((battle, idx) => (
                    <Card key={idx} className="border-border/50 bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {battle.faction === "Vanguard" ? "🛡️" : battle.faction === "Mage" ? "🔮" : "🗡️"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold">{battle.faction}</h3>
                              {battle.result === "active" && (
                                <span className="text-xs font-bold text-primary">Active</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Epoch #{battle.epoch} • {battle.date}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold">${battle.amount.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Deposited</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Withdraw Modal */}
      <Modal
        isOpen={showWithdrawModal}
        onClose={() => {
          setShowWithdrawModal(false)
          setSelectedDeposit(null)
          setWithdrawAmount("")
        }}
        title="WITHDRAW FUNDS"
      >
        <div className="space-y-6">
          {selectedDeposit && (
            <>
              <div className="border border-border p-4">
                <div className="text-xs font-bold tracking-widest text-muted-foreground mb-3">SELECTED POSITION</div>
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FACTION</span>
                    <span className="font-bold">{deposits.find((d) => d.id === selectedDeposit)?.faction}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AVAILABLE</span>
                    <span className="font-bold">
                      ${deposits.find((d) => d.id === selectedDeposit)?.amount.toLocaleString()} USDC
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-widest text-muted-foreground mb-3">
                  WITHDRAW AMOUNT (USDC)
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="h-14 text-xl font-bold border-2"
                  max={deposits.find((d) => d.id === selectedDeposit)?.amount}
                />
                <button
                  onClick={() => {
                    const deposit = deposits.find((d) => d.id === selectedDeposit)
                    if (deposit) setWithdrawAmount(deposit.amount.toString())
                  }}
                  className="text-xs text-primary hover:underline mt-2"
                >
                  MAX
                </button>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => {
                    setShowWithdrawModal(false)
                    setSelectedDeposit(null)
                    setWithdrawAmount("")
                  }}
                  disabled={isProcessing}
                >
                  CANCEL
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || Number.parseFloat(withdrawAmount) <= 0 || isProcessing}
                >
                  {isProcessing ? "PROCESSING..." : "CONFIRM WITHDRAW"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Item Selection Modal */}
      <Modal isOpen={showItemSelectionModal} onClose={() => setShowItemSelectionModal(false)} title="SELECT ITEM TO AUTO-BUY">
         <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
               Select which item x402 should automatically purchase with your yield when you win.
            </p>
            <div className="grid gap-3">
               {availableItems.map((item) => (
                 <button 
                   key={item.id}
                   onClick={() => confirmItemSelection(item.id, parseInt(item.price))}
                   className="flex items-start gap-4 p-4 border-2 border-border hover:border-primary text-left transition-all"
                 >
                    <div className="text-3xl">{item.image}</div>
                    <div>
                       <h4 className="font-bold">{item.name}</h4>
                       <p className="text-xs text-muted-foreground mb-1">{item.description}</p>
                       <span className="text-xs font-bold text-secondary">{item.price}</span>
                    </div>
                 </button>
               ))}
            </div>
            <Button variant="outline" className="w-full bg-transparent" onClick={() => setShowItemSelectionModal(false)}>
               CANCEL
            </Button>
         </div>
      </Modal>

      {/* Settings Confirmation Modal */}
      <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="UPDATE PAYOUT PREFERENCE">
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to change your x402 payout setting to <span className="font-bold text-foreground">
              {pendingPreference === "wallet" && "Send to Wallet"}
              {pendingPreference === "compound" && "Auto-Compound"}
              {pendingPreference === "item" && `Auto-Buy ${availableItems.find(i => i.id === selectedItem)?.name}`}
            </span>?
          </p>
          
          <div className="bg-muted/50 p-4 rounded-md text-xs text-muted-foreground">
            This change will apply to all future epoch rewards. Your principal remains unaffected.
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => setShowSettingsModal(false)}
              disabled={isProcessing}
            >
              CANCEL
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirmPreferenceChange}
              disabled={isProcessing}
            >
              {isProcessing ? "UPDATING..." : "CONFIRM CHANGE"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="SUCCESS">
        <div className="space-y-6 text-center">
          <div className="mx-auto w-20 h-20 border-2 border-secondary flex items-center justify-center">
            <div className="text-4xl">✓</div>
          </div>

          <p className="text-lg">{successMessage}</p>

          {transactionState.signature && (
            <div className="border border-border p-4 text-left font-mono text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction</span>
                <span className="text-xs">{transactionState.signature.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="text-secondary font-bold">{transactionState.status.toUpperCase()}</span>
              </div>
            </div>
          )}

          <Button className="w-full" onClick={() => {
            setShowSuccessModal(false)
            clearTransactionState()
          }}>
            CLOSE
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default function PortfolioPage() {
  return (
    <PageErrorBoundary pageName="Portfolio">
      <PortfolioPageContent />
    </PageErrorBoundary>
  )
}
