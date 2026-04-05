"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { href: "/", label: "Today" },
  { href: "/sessions", label: "Archive" },
  { href: "/profile", label: "Profile" },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b border-[#dacbb7] bg-[rgba(245,237,226,0.92)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.34em] text-[#9e7f65]">Companion Journal</p>
          <p className="mt-1 text-sm text-[#6e5b4d]">Daily voice journal and second brain</p>
        </div>

        <nav className="flex items-center gap-2 rounded-full border border-[#dccdb8] bg-[#fff7ed] p-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  active ? "bg-[#9c6648] text-[#fff8ef]" : "text-[#6a5647] hover:bg-[#f5ece1] hover:text-[#2f241d]"
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
