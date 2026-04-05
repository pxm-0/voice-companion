import type { Metadata } from "next"
import { AppNav } from "@/app/_components/app-nav"
import "./globals.css"

export const metadata: Metadata = {
  title: "Companion Journal",
  description: "Voice journal prototype with saved sessions and light memory.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#05070b] text-[#F4F7FB]">
        <div className="flex min-h-full flex-col">
          <AppNav />
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  )
}
