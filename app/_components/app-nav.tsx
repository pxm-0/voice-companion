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
    <header className="sticky top-0 z-30 border-b border-[#e5d9ca] bg-[rgba(250,247,243,0.93)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <span className="font-[family-name:Georgia,serif] text-xl tracking-tight text-[#2f241d]">
          eli
        </span>

        {sessionActive ? (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("session:request-end"))}
            className="text-sm text-[#7d6959] underline decoration-[#c49070] underline-offset-[5px] transition-colors hover:text-[#2f241d]"
          >
            End session
          </button>
        ) : (
          <nav aria-label="Main navigation" className="flex items-center gap-7">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm transition-colors ${
                    active
                      ? "font-medium text-[#2f241d]"
                      : "text-[#7d6959] hover:text-[#2f241d]"
                  }`}
                  aria-current={active ? "page" : undefined}
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
