import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function runs BEFORE any page loads
export function middleware(request: NextRequest) {
  // 1. Look for the 'token' cookie we set during login
  const token = request.cookies.get('token')?.value;

  // 2. Check if the user is trying to access a protected route
  const isAccessingDashboard = request.nextUrl.pathname.startsWith('/dashboard');

  // 3. If they want the dashboard but have no token, kick them to login
  if (isAccessingDashboard && !token) {
    // We rewrite the URL to /login, maintaining the base domain
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // 4. If they have a token, or are on a public page, let them through
  return NextResponse.next();
}

// 5. IMPORTANT: Tell Next.js WHICH routes should trigger this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths starting with:
     * - dashboard (this protects /dashboard and /dashboard/employees, etc.)
     */
    '/dashboard/:path*',
  ],
};