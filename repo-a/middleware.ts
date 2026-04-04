import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const publicRoutes = ['/', '/login'];

  // Decode role from token if it exists
  let role: string | null = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      role = payload.role;
    } catch {
      // Malformed token — treat as unauthenticated
      role = null;
    }
  }

  // If on a public route
  if (publicRoutes.includes(pathname)) {
    // Already logged in as ADMIN → go to dashboard
    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Non-admin token or no token → stay on login
    return NextResponse.next();
  }

  // Protected routes below this point
  if (!token || role !== 'ADMIN') {
    // Clear the cookie so they can't reuse a non-admin token
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)',
  ],
};