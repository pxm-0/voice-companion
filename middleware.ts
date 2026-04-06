import NextAuth from "next-auth"
import { authConfig } from "./lib/auth.config"

export const { auth: middleware } = NextAuth(authConfig)

export default middleware((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/login")

  if (isAuthPage) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/", req.nextUrl))
    }
    return null
  }

  // Protect all routes except api/auth endpoints and public assets
  if (!isLoggedIn && !req.nextUrl.pathname.startsWith("/api/auth")) {
    return Response.redirect(new URL("/login", req.nextUrl))
  }

  return null
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
