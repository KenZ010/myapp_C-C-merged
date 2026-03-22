import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Public routes (login lives at '/' or '/login')
  const publicRoutes = ['/', '/login'];

  // Skip middleware for public routes
  if (publicRoutes.includes(pathname)) {
    // If already logged in and visiting login → redirect to dashboard
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes — no token → redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - /api routes (let API handle its own auth)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)',
  ],
};