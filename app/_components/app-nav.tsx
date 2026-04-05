"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { href: "/", label: "Live" },
  { href: "/sessions", label: "History" },
  { href: "/profile", label: "Profile" },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[rgba(5,7,11,0.78)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.34em] text-[#7D93AE]">Companion Journal</p>
          <p className="mt-1 text-sm text-[#D4DFED]">Phase 2 prototype</p>
        </div>

        <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  active ? "bg-[#7DA8FF] text-[#08111F]" : "text-[#B7C5D8] hover:bg-white/8 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
