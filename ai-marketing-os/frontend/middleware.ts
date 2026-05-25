import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"]
const API_PATHS = ["/api/", "/_next/", "/favicon.ico", "/images/", "/fonts/"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static assets and API routes
  if (API_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const accessToken = request.cookies.get("access_token")?.value
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isRootPath = pathname === "/"

  // Redirect unauthenticated users to login
  if (!accessToken && !isPublicPath) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (accessToken && (isPublicPath || isRootPath)) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
