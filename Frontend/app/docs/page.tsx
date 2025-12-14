import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Zap, Shield, TrendingUp, Target, Trophy, Coins } from "lucide-react"
import Image from "next/image"

export default function DocsPage() {
  return (
    <div className="min-h-screen pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <BookOpen className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ZOL Documentation
            </h1>
            <p className="text-xl text-muted-foreground">Everything you need to master the art of lossless battle</p>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="mechanics">Mechanics</TabsTrigger>
              <TabsTrigger value="tutorial">Tutorial</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card className="border-primary/20 bg-card/80 backdrop-blur p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  What is ZOL?
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    ZOL is a groundbreaking strategy game built on Solana that introduces the concept of "Lossless PvP".
                    Unlike traditional games where you risk your assets, ZOL lets you compete for yield while keeping
                    your principal 100% safe.
                  </p>
                  <p>
                    The game is powered by the x402 payment standard, which automates reward distribution and enables
                    instant, gas-free payouts. This creates a seamless gaming experience where winners receive their
                    rewards automatically without manual claiming.
                  </p>
                </div>
              </Card>

              <Card className="border-secondary/20 bg-card/80 backdrop-blur p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Zap className="h-6 w-6 text-secondary" />
                  Core Features
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    {
                      title: "100% Capital Protection",
                      description: "Your deposits are always safe. Only the yield is at stake.",
                      icon: Shield,
                    },
                    {
                      title: "Auto-Settlements",
                      description: "x402 handles payouts instantly. No manual claims needed.",
                      icon: Zap,
                    },
                    {
                      title: "Real Yield Economy",
                      description: "Rewards come from actual DeFi protocols, not token inflation.",
                      icon: TrendingUp,
                    },
                    {
                      title: "Strategic Gameplay",
                      description: "Outsmart the crowd. Predict faction movements to win.",
                      icon: Target,
                    },
                  ].map((feature) => {
                    const Icon = feature.icon
                    return (
                      <div key={feature.title} className="bg-muted/30 rounded-lg p-4">
                        <Icon className="h-5 w-5 text-primary mb-2" />
                        <h3 className="font-bold mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <Card className="border-accent/20 bg-card/80 backdrop-blur p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-accent" />
                  The Three Factions
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    {
                      name: "VANGUARD",
                      role: "The Defenders",
                      image: "/anime-knight-warrior-purple-armor.jpg",
                      strength: "Crushes Assassin with overwhelming defense",
                      weakness: "Falls to Mage through arcane power",
                      strategy: "Choose when many pick Assassin",
                      color: "purple",
                    },
                    {
                      name: "MAGE",
                      role: "The Sorcerers",
                      image: "/anime-mage-sorceress-cyan-theme.jpg",
                      strength: "Dominates Vanguard with magic",
                      weakness: "Vulnerable to Assassin's stealth",
                      strategy: "Choose when Vanguard TVL is high",
                      color: "cyan",
                    },
                    {
                      name: "ASSASSIN",
                      role: "The Shadows",
                      image: "/anime-assassin-ninja-yellow-theme.jpg",
                      strength: "Eliminates Mage with precision strikes",
                      weakness: "Blocked by Vanguard shields",
                      strategy: "Choose when Mage faction grows strong",
                      color: "yellow",
                    },
                  ].map((faction) => (
                    <div key={faction.name} className="border-2 border-border">
                      <div className="aspect-[3/4] relative overflow-hidden">
                        <Image
                          src={faction.image || "/placeholder.svg"}
                          alt={faction.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-bold mb-1">{faction.name}</h3>
                        <p className="text-xs text-muted-foreground mb-3">{faction.role}</p>
                        <div className="space-y-2 text-xs leading-relaxed">
                          <p className="text-accent">
                            <span className="font-bold">Strength:</span> {faction.strength}
                          </p>
                          <p className="text-destructive">
                            <span className="font-bold">Weakness:</span> {faction.weakness}
                          </p>
                          <p className="text-primary">
                            <span className="font-bold">Strategy:</span> {faction.strategy}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="mechanics" className="space-y-6">
              <Card className="border-primary/20 bg-card/80 backdrop-blur p-6">
                <h2 className="text-2xl font-bold mb-4">Game Mechanics</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold mb-2 text-primary">Epochs (Battle Rounds)</h3>
                    <p className="text-muted-foreground leading-relaxed mb-2">
                      Each game round lasts 3 days. During this time, players deposit funds into their chosen faction.
                      At the end of the epoch, the winning faction is determined and rewards are distributed
                      automatically.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold mb-2 text-secondary">Scoring Formula</h3>
                    <div className="bg-muted/30 rounded-lg p-4 mb-2">
                      <code className="text-sm">Score = (% TVL of Target) - (% TVL of Predator)</code>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      Your faction gains points by having high TVL against your target faction, but loses points if your
                      predator faction has high TVL. The faction with the highest score wins the epoch.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold mb-2 text-accent">Yield Distribution</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      The winning faction claims the yield generated by all factions during the epoch. This yield is
                      distributed proportionally to all players in the winning faction based on their deposit size. x402
                      handles this automatically—no claiming required.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold mb-2 text-primary">Capital Safety</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Your principal (the amount you deposit) is always 100% safe. It's held in secure DeFi protocols
                      and can be withdrawn at any time. Only the yield generated from these protocols is competed for in
                      the game.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="border-accent/20 bg-card/80 backdrop-blur p-6">
                <h2 className="text-2xl font-bold mb-4">Strategy Tips</h2>
                <ul className="space-y-3">
                  {[
                    "Watch TVL distribution: If one faction becomes too large, its counter-faction becomes more attractive",
                    "Think contrarian: The best returns often come from choosing the unpopular faction",
                    "Monitor APY estimates: Higher APY usually means your faction is well-positioned",
                    "Consider timing: Early deposits help shape the epoch dynamics in your favor",
                    "Diversify across epochs: Different strategies work better in different market conditions",
                  ].map((tip, i) => (
                    <li key={i} className="flex gap-3">
                      <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </TabsContent>

            <TabsContent value="tutorial" className="space-y-6">
              <Card className="border-primary/20 bg-card/80 backdrop-blur p-6">
                <h2 className="text-2xl font-bold mb-4">Quick Start Guide</h2>

                <div className="space-y-6">
                  {[
                    {
                      step: "1",
                      title: "Connect Your Wallet",
                      description:
                        'Click the "Connect Wallet" button in the top right. Make sure you have some USDC or SOL on Solana.',
                    },
                    {
                      step: "2",
                      title: "Analyze the Arena",
                      description:
                        "Go to the Arena page and study the current epoch. Check TVL distribution, player counts, and APY estimates for each faction.",
                    },
                    {
                      step: "3",
                      title: "Choose Your Faction",
                      description:
                        "Select the faction you think will win. Consider: Which faction has the best strategic position? What is the crowd doing?",
                    },
                    {
                      step: "4",
                      title: "Deploy Your Forces",
                      description:
                        "Enter your deposit amount (USDC). Start small if you're learning. Remember: your principal is always safe.",
                    },
                    {
                      step: "5",
                      title: "Wait for Epoch End",
                      description:
                        "The epoch lasts 3 days. You can deposit more or withdraw anytime, but staying in gives you a chance to win yield.",
                    },
                    {
                      step: "6",
                      title: "Receive Rewards",
                      description:
                        "If your faction wins, rewards appear in your wallet automatically via x402. No claiming needed!",
                    },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">{item.step}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border-secondary/20 bg-card/80 backdrop-blur p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Coins className="h-6 w-6 text-secondary" />
                  FAQs
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      q: "Can I lose my deposit?",
                      a: "No. Your principal is 100% safe and always withdrawable. Only the yield is competed for.",
                    },
                    {
                      q: "How are rewards paid out?",
                      a: "Automatically via x402. Winners receive their share of the yield pool directly to their wallet.",
                    },
                    {
                      q: "What if my faction loses?",
                      a: "You get your full deposit back, but you don't earn yield that epoch. Try again next round!",
                    },
                    {
                      q: "Can I change factions mid-epoch?",
                      a: "Yes! You can withdraw and re-deploy to a different faction anytime. Just be aware of the current epoch timing.",
                    },
                    {
                      q: "What generates the yield?",
                      a: "Your deposits are placed in established Solana DeFi protocols like Kamino or Marginfi, which generate real yield.",
                    },
                  ].map((faq, i) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-4">
                      <h3 className="font-bold mb-2">{faq.q}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
