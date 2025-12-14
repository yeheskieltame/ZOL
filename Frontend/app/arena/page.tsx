"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Modal } from "@/components/modal"
import { useRouter } from "next/navigation"
import { Shield, Telescope } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useGameState } from "@/hooks/use-game-state"
import { useUserPosition } from "@/hooks/use-user-position"
import { useZolTransactions } from "@/hooks/use-zol-transactions"
import { useEpochNotifications } from "@/hooks/use-epoch-notifications"
import { transformGameState, transformFactionState } from "@/lib/transformers"
import { ErrorModal } from "@/components/error-modal"
import { parseTransactionError } from "@/lib/error-parser"
import { EpochCountdown } from "@/components/epoch-countdown"
import { EpochStatusBanner } from "@/components/epoch-status-banner"
import { PageErrorBoundary } from "@/components/page-error-boundary"
import { logger } from "@/lib/logger"

function ArenaPageContent() {
  const router = useRouter()
  const { publicKey } = useWallet()
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState("")
  const [showDeployModal, setShowDeployModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null)
  const [errorState, setErrorState] = useState<{ show: boolean; error: any }>({ show: false, error: null })
  
  // Log page view
  useEffect(() => {
    logger.pageView('arena');
  }, []);
  
  // Fetch real blockchain data
  const { gameState, loading: gameStateLoading, error: gameStateError, refetch: refetchGameState } = useGameState()
  const { userPosition, isRegistered, refetch: refetchUserPosition } = useUserPosition()
  const { registerUser, deposit, isProcessing } = useZolTransactions()
  
  // Real-time epoch notifications and countdown
  const { currentEpoch: notificationEpoch, currentStatus } = useEpochNotifications()
  
  // Faction ID to name mapping
  const factionIdToName = ['vanguard', 'mage', 'assassin'];
  
  // Auto-select user's faction if already registered
  useEffect(() => {
    if (isRegistered && userPosition && !selectedFaction) {
      const userFactionName = factionIdToName[userPosition.factionId];
      if (userFactionName) {
        setSelectedFaction(userFactionName);
      }
    }
  }, [isRegistered, userPosition, selectedFaction, factionIdToName]);
  
  // Mock Active Buffs from Inventory (x402 Yield-to-Asset)
  // TODO: Replace with real inventory data from userPosition
  const activeBuffs = useMemo(() => {
    if (!userPosition) return []
    
    return [
      {
        id: "spy-glass",
        name: "Spy Glass",
        description: "Revealing true TVL distribution",
        icon: Telescope,
        active: userPosition.inventory.spyglassCount > 0n
      },
      {
        id: "shield-potion",
        name: "Shield Potion",
        description: "Yield protection active",
        icon: Shield,
        active: userPosition.inventory.shieldCount > 0n
      }
    ]
  }, [userPosition])
  
  // Video Intro State
  const [showVideo, setShowVideo] = useState(true)
  const [isFading, setIsFading] = useState(false)

  const handleVideoEnd = () => {
    setIsFading(true)
    setTimeout(() => {
      setShowVideo(false)
    }, 1000)
  }

  // Transform blockchain data to display format
  const factions = useMemo(() => {
    if (!gameState) {
      // Return empty array while loading
      return []
    }
    
    // Calculate estimated APY based on faction TVL (mock calculation)
    // TODO: Replace with real APY calculation from yield distribution
    const calculateApy = (factionTvl: bigint, totalTvl: bigint): number => {
      if (totalTvl === 0n) return 0
      const percentage = Number(factionTvl) / Number(totalTvl)
      // Inverse relationship: lower TVL = higher APY
      return Math.max(5, Math.min(20, 15 - (percentage * 10)))
    }
    
    // Estimate player count based on TVL (mock calculation)
    // TODO: Replace with real player count from indexer
    const estimatePlayers = (factionTvl: bigint): number => {
      // Assume average deposit of 1000 USDC
      return Math.floor(Number(factionTvl) / 1_000_000_000)
    }
    
    return gameState.factions.map(faction => {
      const apy = calculateApy(faction.tvl, gameState.totalTvl)
      const players = estimatePlayers(faction.tvl)
      return transformFactionState(faction, gameState.totalTvl, players, apy)
    })
  }, [gameState])

  const totalTVL = useMemo(() => {
    if (!gameState) return 0
    return factions.reduce((acc, f) => acc + f.tvl, 0)
  }, [gameState, factions])
  
  const currentEpoch = useMemo(() => {
    if (!gameState) {
      return {
        number: 0,
        timeRemaining: "Loading...",
        endDate: "Loading...",
      }
    }
    
    const epochDisplay = transformGameState(gameState)
    return {
      number: epochDisplay.number,
      timeRemaining: epochDisplay.timeRemaining,
      endDate: epochDisplay.endDate,
    }
  }, [gameState])

  /**
   * Handle faction selection and check registration status
   * If user is registered, they can only select their own faction
   */
  const handleFactionSelect = (factionId: string) => {
    logger.userAction('faction_selected', { factionId });
    
    // If user is already registered, they can only interact with their own faction
    if (isRegistered && userPosition) {
      const userFactionName = factionIdToName[userPosition.factionId];
      if (factionId !== userFactionName) {
        // Show error - user cannot switch factions
        setErrorState({
          show: true,
          error: {
            title: 'Faction Locked',
            message: `You are already registered with the ${factions.find(f => f.id === userFactionName)?.name || 'Unknown'} faction. You cannot switch factions.`,
            retryable: false
          }
        });
        return;
      }
    }
    
    setSelectedFaction(factionId);
  }

  /**
   * Handle registration for new users
   */
  const handleRegistration = async () => {
    if (!selectedFaction || !publicKey) {
      return
    }

    try {
      logger.userAction('register_user_initiated', { faction: selectedFaction });
      
      // Get faction ID from selected faction
      const factionIndex = factions.findIndex(f => f.id === selectedFaction)
      if (factionIndex === -1) {
        throw new Error('Invalid faction selected')
      }

      // Call registerUser transaction
      const signature = await registerUser(factionIndex)
      setTransactionSignature(signature)
      
      logger.userAction('register_user_success', { faction: selectedFaction, signature });
      
      // Close registration modal
      setShowRegistrationModal(false)
      
      // Refresh user position data
      await refetchUserPosition()
      await refetchGameState()
      
      // Show success message
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Registration failed:', error)
      const parsedError = parseTransactionError(error as Error)
      setErrorState({ show: true, error: parsedError })
    }
  }

  /**
   * Handle deposit transaction
   */
  const handleDeposit = async () => {
    if (!depositAmount || !publicKey) {
      return
    }

    try {
      logger.userAction('deposit_initiated', { amount: depositAmount });
      
      // Validate deposit amount
      const amount = Number.parseFloat(depositAmount)
      if (amount <= 0) {
        throw new Error('Deposit amount must be greater than zero')
      }

      // Convert USDC to lamports (6 decimals)
      const lamports = Math.floor(amount * 1_000_000)

      // Call deposit transaction
      const signature = await deposit(lamports)
      setTransactionSignature(signature)
      
      logger.userAction('deposit_success', { amount: depositAmount, signature });
      
      // Close deposit modal
      setShowDeployModal(false)
      
      // Refresh data
      await refetchUserPosition()
      await refetchGameState()
      
      // Show success message
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Deposit failed:', error)
      const parsedError = parseTransactionError(error as Error)
      setErrorState({ show: true, error: parsedError })
      setShowDeployModal(false)
    }
  }

  /**
   * Handle deployment button click
   * Check if user needs to register first
   */
  const handleDeployClick = () => {
    if (!publicKey) {
      setErrorState({ 
        show: true, 
        error: { 
          title: 'Wallet Not Connected',
          message: 'Please connect your wallet to continue',
          retryable: false
        }
      })
      return
    }

    if (!isRegistered) {
      // User needs to register first
      setShowRegistrationModal(true)
    } else {
      // User is registered, proceed to deposit
      setShowDeployModal(true)
    }
  }

  const handleSuccessClose = () => {
    setShowSuccessModal(false)
    setDepositAmount("")
    setTransactionSignature(null)
    router.push("/portfolio")
  }

  // Handle loading state
  if (gameStateLoading) {
    return (
      <div className="min-h-screen pt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="text-4xl font-bold tracking-tighter animate-pulse">
                LOADING BATTLE DATA...
              </div>
              <p className="text-muted-foreground">Fetching epoch and faction information from blockchain</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Handle error state
  if (gameStateError || !gameState) {
    return (
      <div className="min-h-screen pt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-4xl font-bold tracking-tighter text-destructive">
                CONNECTION ERROR
              </div>
              <p className="text-muted-foreground">
                {gameStateError?.message || "Unable to fetch game state from blockchain"}
              </p>
              <Button onClick={() => window.location.reload()}>
                RETRY CONNECTION
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {showVideo && (
        <div className={`fixed inset-0 z-50 bg-black transition-opacity duration-1000 ${isFading ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          <video
            autoPlay
            muted={false}
            playsInline
            className="w-full h-full object-cover"
            onEnded={handleVideoEnd}
          >
            <source src="/Video_Pertarungan_Cyberpunk_Tiga_Karakter.mp4" type="video/mp4" />
          </video>
          <button 
            onClick={handleVideoEnd}
            className="absolute bottom-8 right-8 text-white/50 hover:text-white text-sm font-mono uppercase tracking-widest border border-white/20 px-4 py-2 rounded hover:bg-white/10 transition-all"
          >
            Skip Intro
          </button>
        </div>
      )}

      <div className={`pt-20 transition-opacity duration-1000 ${showVideo ? "opacity-0" : "opacity-100"}`}>
      <div className="container mx-auto px-6 py-12">
        {/* Epoch Status Banner */}
        <EpochStatusBanner 
          status={currentStatus} 
          epochNumber={notificationEpoch} 
          className="mb-6"
        />

        {/* Epoch Header */}
        <div className="border-2 border-border p-8 mb-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="text-xs font-bold tracking-widest text-muted-foreground mb-2">CURRENT BATTLE</div>
              <h1 className="text-5xl font-bold tracking-tighter">EPOCH #{currentEpoch.number}</h1>
              <p className="text-muted-foreground mt-2">Ends: {currentEpoch.endDate}</p>
            </div>
            <div className="flex gap-12">
              <div>
                <div className="text-xs font-bold tracking-widest text-muted-foreground mb-1">TIME REMAINING</div>
                {gameState && (
                  <EpochCountdown 
                    epochEndTs={gameState.epochEndTs} 
                    className="text-3xl font-bold text-primary"
                    showIcon={false}
                  />
                )}
              </div>
              <div>
                <div className="text-xs font-bold tracking-widest text-muted-foreground mb-1">TOTAL TVL</div>
                <div className="text-3xl font-bold text-secondary">${(totalTVL / 1000000).toFixed(2)}M</div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Buffs Indicator */}
        {activeBuffs.some(b => b.active) && (
          <div className="flex gap-4 mb-8">
            {activeBuffs.filter(b => b.active).map(buff => (
              <div key={buff.id} className="flex items-center gap-2 bg-secondary/10 border border-secondary/20 px-4 py-2 rounded-full text-secondary animate-pulse">
                <buff.icon className="w-4 h-4" />
                <span className="text-xs font-bold tracking-wider uppercase">{buff.name} ACTIVE</span>
              </div>
            ))}
          </div>
        )}

        {/* Faction Selection Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          {factions.map((faction) => {
            const tvlPercentage = (faction.tvl / totalTVL) * 100
            const isSelected = selectedFaction === faction.id
            const isUserFaction = isRegistered && userPosition && factionIdToName[userPosition.factionId] === faction.id
            const isDisabled = !!(isRegistered && userPosition && factionIdToName[userPosition.factionId] !== faction.id)

            return (
              <button
                key={faction.id}
                onClick={() => handleFactionSelect(faction.id)}
                disabled={isDisabled}
                className={`text-left border-2 transition-all relative ${
                  isSelected
                    ? `border-${faction.color} bg-${faction.color}/5`
                    : isDisabled
                    ? "border-border opacity-50 cursor-not-allowed"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                {isUserFaction && (
                  <div className="absolute top-4 right-4 z-10 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold tracking-wider">
                    YOUR FACTION
                  </div>
                )}
                <div className="aspect-3/4 relative overflow-hidden">
                  <Image
                    src={faction.image || "/placeholder.svg"}
                    alt={faction.name}
                    fill
                    className={`object-cover ${isSelected ? "" : "grayscale"} transition-all duration-300`}
                  />
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold tracking-tighter">{faction.name}</h3>
                    {isSelected && <div className="w-3 h-3 bg-primary pulse-border" />}
                  </div>

                  <div className="space-y-3 text-sm font-mono">
                    <div>
                      <div className="flex justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">TVL DOMINANCE</span>
                          {activeBuffs.find(b => b.id === "spy-glass" && b.active) && (
                            <Telescope className="w-3 h-3 text-secondary" />
                          )}
                        </div>
                        <span className="font-bold">{tvlPercentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={tvlPercentage} className="h-1" />
                    </div>

                    <div className="flex justify-between border-t border-border pt-3">
                      <span className="text-muted-foreground">PLAYERS</span>
                      <span className="font-bold">{faction.players.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">EST. APY</span>
                      <span className={`font-bold text-${faction.color}`}>{faction.apy}%</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Deposit Section */}
        <div className="border-2 border-border p-12">
          {selectedFaction ? (
            <div className="max-w-2xl mx-auto space-y-8">
              <div>
                <h2 className="text-4xl font-bold tracking-tighter mb-2">
                  DEPLOY TO {factions.find((f) => f.id === selectedFaction)?.name}
                </h2>
                <p className="text-muted-foreground">Enter your deposit amount to join the battle</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold tracking-widest text-muted-foreground mb-3">
                    DEPOSIT AMOUNT (USDC)
                  </label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="h-16 text-2xl font-bold border-2"
                  />
                  <div className="flex gap-2 mt-3">
                    {[100, 500, 1000, 5000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setDepositAmount(amount.toString())}
                        className="border border-border px-4 py-2 text-xs font-bold hover:bg-muted transition-colors"
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-muted p-6 space-y-3 text-sm font-mono">
                  {isRegistered && userPosition && (
                    <div className="flex justify-between border-b border-border pb-3 mb-3">
                      <span className="text-muted-foreground">CURRENT POSITION</span>
                      <span className="font-bold text-secondary">
                        ${(Number(userPosition.depositedAmount) / 1_000_000).toFixed(2)} USDC
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRegistered ? 'ADDITIONAL DEPOSIT' : 'YOUR DEPOSIT'}</span>
                    <span className="font-bold">${depositAmount || "0.00"} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PROTECTION</span>
                    <span className="font-bold text-secondary">100% SAFE</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">YIELD TARGET</span>
                    <span className="font-bold text-primary">
                      {factions.find((f) => f.id === selectedFaction)?.apy}% APY
                    </span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full h-14 text-base font-bold border-2 border-foreground"
                  disabled={!depositAmount || Number.parseFloat(depositAmount) <= 0 || isProcessing}
                  onClick={handleDeployClick}
                >
                  {isProcessing ? 'PROCESSING...' : isRegistered ? 'DEPLOY FORCES & BATTLE' : 'REGISTER & DEPLOY'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By deploying, your yield will compete in this epoch. Principal is always 100% safe and withdrawable.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <h3 className="text-3xl font-bold tracking-tighter mb-4">SELECT A FACTION ABOVE</h3>
              <p className="text-muted-foreground">Choose your side to begin deployment</p>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showDeployModal} onClose={() => setShowDeployModal(false)} title="CONFIRM DEPLOYMENT">
        <div className="space-y-6">
          <div className="border border-border p-4">
            <div className="text-xs font-bold tracking-widest text-muted-foreground mb-3">DEPLOYMENT SUMMARY</div>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">FACTION</span>
                <span className="font-bold">{factions.find((f) => f.id === selectedFaction)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AMOUNT</span>
                <span className="font-bold">${depositAmount} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">EST. APY</span>
                <span className="font-bold text-primary">{factions.find((f) => f.id === selectedFaction)?.apy}%</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <span className="text-muted-foreground">PROTECTION</span>
                <span className="font-bold text-secondary">100% SAFE</span>
              </div>
            </div>
          </div>

          <div className="bg-muted p-4 text-xs leading-relaxed">
            Your funds will be deployed to the {factions.find((f) => f.id === selectedFaction)?.name} faction for Epoch
            #{currentEpoch.number}. Your principal remains 100% safe and withdrawable at any time.
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => setShowDeployModal(false)}
              disabled={isProcessing}
            >
              CANCEL
            </Button>
            <Button className="flex-1" onClick={handleDeposit} disabled={isProcessing}>
              {isProcessing ? "DEPLOYING..." : "CONFIRM & DEPLOY"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showRegistrationModal} onClose={() => setShowRegistrationModal(false)} title="REGISTER FOR BATTLE">
        <div className="space-y-6">
          <div className="border border-border p-4">
            <div className="text-xs font-bold tracking-widest text-muted-foreground mb-3">REGISTRATION DETAILS</div>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">FACTION</span>
                <span className="font-bold">{factions.find((f) => f.id === selectedFaction)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">DEPOSIT</span>
                <span className="font-bold">${depositAmount} USDC</span>
              </div>
            </div>
          </div>

          <div className="bg-muted p-4 text-xs leading-relaxed">
            You are registering for the first time. This will create your player account and assign you to the{" "}
            {factions.find((f) => f.id === selectedFaction)?.name} faction. After registration, your deposit will be processed.
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => setShowRegistrationModal(false)}
              disabled={isProcessing}
            >
              CANCEL
            </Button>
            <Button className="flex-1" onClick={handleRegistration} disabled={isProcessing}>
              {isProcessing ? "REGISTERING..." : "CONFIRM REGISTRATION"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showSuccessModal} onClose={handleSuccessClose} title={isRegistered && !transactionSignature ? "DEPLOYMENT SUCCESSFUL" : "REGISTRATION SUCCESSFUL"}>
        <div className="space-y-6 text-center">
          <div className="mx-auto w-20 h-20 border-2 border-primary flex items-center justify-center">
            <div className="text-4xl">✓</div>
          </div>

          <div>
            <h3 className="text-2xl font-bold mb-2">
              {transactionSignature && !isRegistered ? 'Registration Complete!' : 'Forces Deployed!'}
            </h3>
            <p className="text-muted-foreground">
              {transactionSignature && !isRegistered 
                ? `You have been registered to ${factions.find((f) => f.id === selectedFaction)?.name} faction`
                : `Your ${depositAmount} USDC has been successfully deployed to ${factions.find((f) => f.id === selectedFaction)?.name} faction`
              }
            </p>
          </div>

          {transactionSignature && (
            <div className="border border-border p-4 text-left font-mono text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction</span>
                <span className="text-xs break-all">{transactionSignature.substring(0, 8)}...{transactionSignature.substring(transactionSignature.length - 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="text-primary font-bold">CONFIRMED</span>
              </div>
            </div>
          )}

          <Button className="w-full" onClick={handleSuccessClose}>
            VIEW PORTFOLIO
          </Button>
        </div>
      </Modal>

      <ErrorModal
        isOpen={errorState.show}
        error={errorState.error}
        onClose={() => setErrorState({ show: false, error: null })}
        onRetry={() => {
          setErrorState({ show: false, error: null })
          if (!isRegistered) {
            handleRegistration()
          } else {
            handleDeposit()
          }
        }}
      />
      </div>
    </div>
  )
}

export default function ArenaPage() {
  return (
    <PageErrorBoundary pageName="Arena">
      <ArenaPageContent />
    </PageErrorBoundary>
  )
}
