import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { AppNav } from "@/app/_components/app-nav"
import { auth } from "@/lib/auth"
import "./globals.css"

export const metadata: Metadata = {
  title: "Eli",
  description: "Your daily voice companion.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  const isAuthenticated = !!session?.user?.id

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#efe4d7] text-[#2f241d]">
        <div className="flex min-h-full flex-col">
          {isAuthenticated && <AppNav />}
          <div className="flex-1">{children}</div>
        </div>
        <Analytics />
      </body>
    </html>
  )
}
