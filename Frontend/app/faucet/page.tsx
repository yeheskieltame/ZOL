"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/modal"
import { Droplets, Coins, ArrowRight, CheckCircle2, Wallet, ExternalLink, AlertCircle, Loader2 } from "lucide-react"
import { WalletButton } from "@/components/wallet-button"
import { SOLANA_CONFIG } from "@/lib/config"

type FaucetStatus = 'idle' | 'loading' | 'success' | 'error';

interface FaucetResponse {
  success?: boolean;
  signature?: string;
  amount?: number;
  error?: string;
}

export default function FaucetPage() {
  const { publicKey, connected } = useWallet()
  const [amount, setAmount] = useState("1000")
  const [status, setStatus] = useState<FaucetStatus>('idle')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [txSignature, setTxSignature] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  // Fetch USDC balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance()
    } else {
      setUsdcBalance(null)
    }
  }, [connected, publicKey])

  const fetchBalance = async () => {
    if (!publicKey) return
    
    setIsLoadingBalance(true)
    try {
      const response = await fetch(`/api/token-balance?wallet=${publicKey.toBase58()}&mint=${SOLANA_CONFIG.usdcMint.toBase58()}`)
      if (response.ok) {
        const data = await response.json()
        setUsdcBalance(data.balance || 0)
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    } finally {
      setIsLoadingBalance(false)
    }
  }

  const handleAirdrop = async () => {
    if (!publicKey) return

    setStatus('loading')
    setErrorMessage("")

    try {
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          amount,
        }),
      })

      const data: FaucetResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request airdrop')
      }

      if (data.success && data.signature) {
        setTxSignature(data.signature)
        setStatus('success')
        setShowSuccessModal(true)
        // Refresh balance after successful airdrop
        setTimeout(fetchBalance, 2000)
      }
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to request airdrop')
    }
  }

  const getExplorerUrl = (signature: string) => {
    const cluster = SOLANA_CONFIG.cluster
    return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`
  }

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(balance / 1_000_000) // Convert from lamports to USDC
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-6">
              <Droplets className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-5xl font-bold tracking-tighter mb-4">USDC FAUCET</h1>
            <p className="text-muted-foreground text-lg">
              Get mock USDC to test your strategies in the ZOL Arena (Devnet Only).
            </p>
          </div>

          {/* Faucet Card */}
          <div className="border-2 border-border bg-card/50 backdrop-blur p-8 space-y-8">
            {/* Wallet Connection Section */}
            <div className="space-y-4">
              <label className="block text-xs font-bold tracking-widest text-muted-foreground">
                WALLET CONNECTION
              </label>
              
              {!connected ? (
                <div className="border-2 border-dashed border-border p-6 text-center space-y-4">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Connect your wallet to receive mock USDC
                  </p>
                  <WalletButton />
                </div>
              ) : (
                <div className="border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Connected Wallet</span>
                    <span className="font-mono text-sm">
                      {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">USDC Balance</span>
                    <span className="font-bold">
                      {isLoadingBalance ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : usdcBalance !== null ? (
                        `$${formatBalance(usdcBalance)}`
                      ) : (
                        '--'
                      )}
                    </span>
                  </div>
                  <div className="pt-2">
                    <WalletButton />
                  </div>
                </div>
              )}
            </div>

            {/* Amount Selection */}
            <div className="space-y-4">
              <label className="block text-xs font-bold tracking-widest text-muted-foreground">
                AMOUNT (MOCK USDC)
              </label>
              <div className="grid grid-cols-3 gap-4">
                {["1000", "5000", "10000"].map((val) => (
                  <button
                    key={val}
                    onClick={() => setAmount(val)}
                    disabled={!connected}
                    className={`relative border-2 px-4 py-4 font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                      amount === val 
                        ? "border-primary bg-primary text-primary-foreground scale-105 shadow-lg shadow-primary/25" 
                        : "border-border bg-card hover:border-primary/50 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    {amount === val && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                    <span className="text-lg">${val}</span>
                    <span className="text-[10px] font-normal opacity-80">USDC</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {status === 'error' && errorMessage && (
              <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Airdrop Failed</p>
                  <p className="text-sm text-muted-foreground">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Request Button */}
            <Button 
              size="lg" 
              className="w-full h-14 text-lg"
              disabled={!connected || status === 'loading'}
              onClick={handleAirdrop}
            >
              {status === 'loading' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  PROCESSING...
                </span>
              ) : !connected ? (
                <span className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  CONNECT WALLET FIRST
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  REQUEST AIRDROP <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>

            {/* Info Note */}
            <div className="bg-muted/50 p-4 rounded text-xs text-muted-foreground space-y-2">
              <p>⚠️ These tokens have no real value and are for testing purposes only.</p>
              <p>📍 Network: {SOLANA_CONFIG.cluster.toUpperCase()}</p>
              <p>🪙 USDC Mint: {SOLANA_CONFIG.usdcMint.toBase58().slice(0, 8)}...</p>
            </div>
          </div>

          {/* SOL Faucet Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Need SOL for transaction fees?
            </p>
            <a 
              href="https://faucet.solana.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              Get Devnet SOL <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal isOpen={showSuccessModal} onClose={() => {
        setShowSuccessModal(false)
        setStatus('idle')
      }} title="AIRDROP SUCCESSFUL">
        <div className="space-y-6 text-center">
          <div className="mx-auto w-20 h-20 border-2 border-primary flex items-center justify-center rounded-full">
            <Coins className="h-10 w-10 text-primary" />
          </div>

          <div>
            <h3 className="text-2xl font-bold mb-2">${amount} USDC Sent!</h3>
            <p className="text-muted-foreground">
              Your mock funds have been delivered. You are ready to deploy forces.
            </p>
          </div>

          <div className="border border-border p-4 text-left font-mono text-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Transaction</span>
              <a 
                href={getExplorerUrl(txSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {txSignature.slice(0, 8)}...{txSignature.slice(-8)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="text-primary font-bold">CONFIRMED</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network</span>
              <span>{SOLANA_CONFIG.cluster}</span>
            </div>
          </div>

          <Button className="w-full" onClick={() => {
            setShowSuccessModal(false)
            setStatus('idle')
          }}>
            CLOSE
          </Button>
        </div>
      </Modal>
    </div>
  )
}
