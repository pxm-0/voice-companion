import type { Metadata } from "next"
import { AppNav } from "@/app/_components/app-nav"
import "./globals.css"

export const metadata: Metadata = {
  title: "Eli",
  description: "Your daily voice companion.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#efe4d7] text-[#2f241d]">
        <div className="flex min-h-full flex-col">
          <AppNav />
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  )
}
