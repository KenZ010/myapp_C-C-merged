import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── Route Access Map ─────────────────────────────────────────────────────────
const ROLE_ROUTES: Record<string, string[]> = {
  CASHIER:       ['/cashier'],
  STOCK_MANAGER: ['/inventory'],
  CUSTOMER:      ['/home', '/shop', '/orders', '/profile'],
};

// Roles restricted to a single active session at a time
const SINGLE_SESSION_ROLES = new Set(['CUSTOMER', 'CASHIER', 'STOCK_MANAGER']);

// Routes anyone can visit without a token
const PUBLIC_ROUTES = ['/', '/login'];

// Where each role lands after login
const ROLE_HOME: Record<string, string> = {
  CASHIER:       '/cashier/ordering',
  STOCK_MANAGER: '/inventory/monitoring',
  CUSTOMER:      '/home',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function decodeRole(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

function canAccess(pathname: string, role: string): boolean {
  return (ROLE_ROUTES[role] ?? []).some((prefix) => pathname.startsWith(prefix));
}

function redirectToLogin(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.delete('token');
  response.cookies.delete('active_token');
  return response;
}

// ─── Middleware ───────────────────────────────────────────────────────────────
export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // ── Logout ───────────────────────────────────────────────────────────────
  if (pathname === '/logout') {
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('token');
    response.cookies.delete('active_token');
    return response;
  }

  const role = token ? decodeRole(token) : null;
  const isLoggedIn = !!token && !!role;

  // ── Public routes ────────────────────────────────────────────────────────
  if (PUBLIC_ROUTES.includes(pathname)) {
    if (isLoggedIn) {
      const home = ROLE_HOME[role!] ?? '/';
      return NextResponse.redirect(new URL(home, request.url));
    }
    return NextResponse.next();
  }

  // ── Not authenticated ─────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return redirectToLogin(request);
  }

  // ── Wrong role for this route ─────────────────────────────────────────────
  if (!canAccess(pathname, role!)) {
    const home = ROLE_HOME[role!] ?? '/';
    return NextResponse.redirect(new URL(home, request.url));
  }

  // ── Single-session enforcement ────────────────────────────────────────────
  // active_token is set on login equal to the JWT.
  // When the same user logs in from another tab, active_token gets overwritten,
  // making this tab's token stale — kicking it back to login on next navigation.
  if (SINGLE_SESSION_ROLES.has(role!)) {
    const activeToken = request.cookies.get('active_token')?.value;
    if (activeToken && activeToken !== token) {
      return redirectToLogin(request);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)',
  ],
};