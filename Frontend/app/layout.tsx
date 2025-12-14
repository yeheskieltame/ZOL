import type React from "react"
import type { Metadata } from "next"
import { Orbitron, Exo_2 } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import Navigation from "@/components/navigation"
import { WalletProvider } from "@/components/wallet-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-heading",
})

const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-body",
})

export const metadata: Metadata = {
  title: "ZOL - The Autonomous Strategy Game",
  description: "Lossless PvP battles on Solana. Choose your faction, battle for yield, dominate the arena.",
  generator: "v0.app",
  icons: {
    icon: "/zol-logo.png",
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${orbitron.variable} ${exo2.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <WalletProvider>
            <Navigation />
            {children}
            <Analytics />
            <Toaster />
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
