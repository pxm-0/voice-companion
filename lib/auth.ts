import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { authConfig } from "./auth.config"

const { auth: nextAuth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
})

// Wrap auth() to return mock user in development
export const auth = async () => {
  // TEMP: Return mock user for local testing without OAuth credentials
  if (process.env.NODE_ENV === "development" && process.env.SKIP_AUTH_FOR_DEV === "true") {
    return {
      user: {
        id: "dev-user-001",
        email: "dev@localhost",
        name: "Dev User",
      },
    }
  }

  return await nextAuth()
}

export { handlers, signIn, signOut }
