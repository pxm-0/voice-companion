"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

const NAV_ITEMS = [
  { href: "/", label: "Today" },
  { href: "/sessions", label: "Journal" },
  { href: "/profile", label: "Profile" },
]

export function AppNav() {
  const pathname = usePathname()
  const [sessionActive, setSessionActive] = useState(false)

  useEffect(() => {
    const onStart = () => setSessionActive(true)
    const onEnd = () => setSessionActive(false)
    window.addEventListener("session:start", onStart)
    window.addEventListener("session:end", onEnd)
    return () => {
      window.removeEventListener("session:start", onStart)
      window.removeEventListener("session:end", onEnd)
    }
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-[#dacbb7] bg-[rgba(245,237,226,0.92)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <span className="font-[family-name:Georgia,serif] text-2xl text-[#2f241d]">eli</span>

        {sessionActive ? (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("session:request-end"))}
            className="rounded-full border border-[#dccab4] bg-[#fff7ed] px-4 py-2 text-sm text-[#6a5647] transition-colors hover:bg-[#f5ece1]"
          >
            End session
          </button>
        ) : (
          <nav className="flex items-center gap-2 rounded-full border border-[#dccdb8] bg-[#fff7ed] p-1">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm transition-colors ${
                    active
                      ? "bg-[#9c6648] text-[#fff8ef]"
                      : "text-[#6a5647] hover:bg-[#f5ece1] hover:text-[#2f241d]"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        )}
      </div>
    </header>
  )
}
