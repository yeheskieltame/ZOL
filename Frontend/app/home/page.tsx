"use client"

import Link from "next/link"
import Image from "next/image"
import { PageErrorBoundary } from "@/components/page-error-boundary"

function HomePageContent() {
  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section - Magazine Style */}
      <section className="container mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 slide-in">
            <div className="space-y-4">
              <div className="inline-block border-2 border-primary px-4 py-2">
                <span className="text-xs font-bold tracking-widest text-primary">POWERED BY x402 • SOLANA</span>
              </div>

              <h1 className="text-7xl lg:text-8xl font-bold leading-none tracking-tighter">
                BATTLE
                <br />
                <span className="text-primary">FOR YIELD</span>
                <br />
                NOT CAPITAL
              </h1>
            </div>

            <p className="text-xl text-muted-foreground leading-relaxed max-w-md">
              The first lossless PvP strategy game on Solana. Choose your faction, deploy forces, battle for yield—while
              your principal stays 100% safe.
            </p>

            <div className="flex gap-4 pt-4">
              <Link href="/arena">
                <button className="bg-primary px-8 py-4 text-base font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
                  ENTER ARENA
                </button>
              </Link>
              <Link href="/docs">
                <button className="border-2 border-foreground px-8 py-4 text-base font-bold text-foreground hover:bg-foreground hover:text-background transition-colors">
                  HOW IT WORKS
                </button>
              </Link>
            </div>
          </div>

          <div className="relative h-[600px] slide-in">
            <Image src="/anime-warrior-character-with-futuristic-armor-cybe.jpg" alt="ZOL Hero Character" fill className="object-contain" priority />
          </div>
        </div>
      </section>

      {/* Features - Split Layout */}
      <section className="border-t-2 border-border">
        <div className="container mx-auto px-6 py-24">
          <div className="grid md:grid-cols-3 gap-px bg-border">
            <div className="bg-background p-12 space-y-4">
              <div className="text-6xl font-bold text-primary">100%</div>
              <h3 className="text-xl font-bold tracking-tight">CAPITAL SAFE</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your deposits are always protected. Only compete for the yield, never risk your principal.
              </p>
            </div>

            <div className="bg-background p-12 space-y-4">
              <div className="text-6xl font-bold text-secondary">x402</div>
              <h3 className="text-xl font-bold tracking-tight">INSTANT SETTLEMENTS</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Automates payouts. No manual claims, no gas waste—rewards hit your wallet instantly.
              </p>
            </div>

            <div className="bg-background p-12 space-y-4">
              <div className="text-6xl font-bold text-accent">REAL</div>
              <h3 className="text-xl font-bold tracking-tight">YIELD ECONOMY</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Rewards come from actual DeFi yield, not token inflation. Sustainable, long-term gameplay.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Factions - Editorial Grid */}
      <section className="bg-muted py-24">
        <div className="container mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-6xl font-bold tracking-tighter mb-4">CHOOSE YOUR FACTION</h2>
            <p className="text-xl text-muted-foreground">Three forces in eternal conflict. Which side will you join?</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Vanguard */}
            <div className="group relative bg-background border-2 border-primary hover:border-primary/50 transition-all overflow-hidden">
              <div className="aspect-[3/4] relative">
                <Image
                  src="/anime-knight-warrior-with-heavy-armor-and-shield-p.jpg"
                  alt="Vanguard Faction"
                  fill
                  className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
              </div>
              <div className="p-8 space-y-4">
                <h3 className="text-4xl font-bold tracking-tighter">VANGUARD</h3>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">STRENGTH</span>
                    <span className="text-secondary">CRUSHES ASSASSIN</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">WEAKNESS</span>
                    <span className="text-destructive">FALLS TO MAGE</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  The shields of the realm. Impenetrable defense meets overwhelming force.
                </p>
              </div>
            </div>

            {/* Mage */}
            <div className="group relative bg-background border-2 border-secondary hover:border-secondary/50 transition-all overflow-hidden">
              <div className="aspect-[3/4] relative">
                <Image
                  src="/anime-mage-sorceress-with-mystical-powers-cyan-the.jpg"
                  alt="Mage Faction"
                  fill
                  className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-secondary/20 mix-blend-multiply" />
              </div>
              <div className="p-8 space-y-4">
                <h3 className="text-4xl font-bold tracking-tighter">MAGE</h3>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">STRENGTH</span>
                    <span className="text-secondary">DOMINATES VANGUARD</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">WEAKNESS</span>
                    <span className="text-destructive">VULNERABLE TO ASSASSIN</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Masters of arcane power. Bend reality to your will.</p>
              </div>
            </div>

            {/* Assassin */}
            <div className="group relative bg-background border-2 border-accent hover:border-accent/50 transition-all overflow-hidden">
              <div className="aspect-[3/4] relative">
                <Image
                  src="/anime-assassin-ninja-with-dual-blades-yellow-theme.jpg"
                  alt="Assassin Faction"
                  fill
                  className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-accent/20 mix-blend-multiply" />
              </div>
              <div className="p-8 space-y-4">
                <h3 className="text-4xl font-bold tracking-tighter">ASSASSIN</h3>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">STRENGTH</span>
                    <span className="text-secondary">ELIMINATES MAGE</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">WEAKNESS</span>
                    <span className="text-destructive">BLOCKED BY VANGUARD</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Silent death from shadows. Strike fast, strike hard.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Bold Statement */}
      <section className="border-t-2 border-border">
        <div className="container mx-auto px-6 py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-7xl lg:text-8xl font-bold tracking-tighter leading-none">
              READY TO
              <br />
              <span className="text-primary">BATTLE?</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Deploy your forces, outsmart the crowd, and claim the yield. Your adventure begins now.
            </p>
            <Link href="/arena">
              <button className="bg-primary px-12 py-5 text-lg font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
                START PLAYING NOW
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function HomePage() {
  return (
    <PageErrorBoundary pageName="Home">
      <HomePageContent />
    </PageErrorBoundary>
  )
}
