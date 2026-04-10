import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import { AppNav } from "@/app/_components/app-nav"
import { auth } from "@/lib/auth"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
})

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
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#efe4d7] text-[#2f241d]">
        <div className="flex min-h-full flex-col">
          {isAuthenticated && <AppNav />}
          <div className="flex-1 animate-page-enter">{children}</div>
        </div>
      </body>
    </html>
  )
}
