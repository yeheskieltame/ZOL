"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { WalletButton } from "@/components/wallet-button"

export default function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: "/home", label: "HOME" },
    { href: "/arena", label: "ARENA" },
    { href: "/portfolio", label: "PORTFOLIO" },
    { href: "/faucet", label: "FAUCET" },
    { href: "/docs", label: "DOCS" },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
      <div className="container mx-auto px-6">
        <div className="flex h-20 items-center justify-between">
          <Link
            href="/home"
            className="hover:opacity-80 transition-opacity"
          >
            <Image 
              src="/zol-logo.png" 
              alt="ZOL Logo" 
              width={120} 
              height={120} 
              className="h-30 w-auto object-contain"
              priority
            />
          </Link>

          <div className="flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-bold tracking-wider transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}

            <div className="ml-6">
              <WalletButton />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
