import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── Route Access Map ─────────────────────────────────────────────────────────
// Define which roles can access which route prefixes.
// Order matters: more specific paths should come first.
const ROLE_ROUTES: Record<string, string[]> = {
  CASHIER: ['/cashier/ordering'],
  STOCK_MANAGER: ['/inventory/monitoring'],
  CUSTOMER: ['/home'],
};

// Roles that are restricted to a single active session at a time
const SINGLE_SESSION_ROLES = new Set(['CUSTOMER', 'CASHIER', 'STOCK_MANAGER']);

// Routes anyone can visit without a token
const PUBLIC_ROUTES = ['/', '/login'];

// Where each role lands after login
const ROLE_HOME: Record<string, string> = {
  CASHIER: '/cashier',
  STOCK_MANAGER: '/inventory',
  CUSTOMER: '/shop',
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

function decodeUserId(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id ?? payload.sub ?? null;
  } catch {
    return null;
  }
}

function getAllowedPaths(role: string): string[] {
  return ROLE_ROUTES[role] ?? [];
}

function canAccess(pathname: string, role: string): boolean {
  return getAllowedPaths(role).some((prefix) => pathname.startsWith(prefix));
}

function redirectToLogin(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.delete('token');
  return response;
}

// ─── Middleware ───────────────────────────────────────────────────────────────
export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const role = token ? decodeRole(token) : null;
  const isLoggedIn = !!token && !!role;

  // ── Public routes ──────────────────────────────────────────────────────────
  if (PUBLIC_ROUTES.includes(pathname)) {
    if (isLoggedIn) {
      // Already authenticated → send to their home
      const home = ROLE_HOME[role!] ?? '/';
      return NextResponse.redirect(new URL(home, request.url));
    }
    return NextResponse.next();
  }

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return redirectToLogin(request);
  }

  // ── Wrong role for this route ──────────────────────────────────────────────
  if (!canAccess(pathname, role!)) {
    // Redirect to their own home instead of login (they ARE authenticated)
    const home = ROLE_HOME[role!] ?? '/';
    return NextResponse.redirect(new URL(home, request.url));
  }

  // ── Single-session enforcement ────────────────────────────────────────────
  // Applies to CUSTOMER, CASHIER, and STOCK_MANAGER.
  // The active session ID is stored in a cookie named `active_session`.
  // Your login API should set this cookie server-side alongside the JWT.
  // If the stored session ID doesn't match the one in the JWT, the user
  // is on a stale tab and gets kicked out.
  if (SINGLE_SESSION_ROLES.has(role!)) {
    const activeSession = request.cookies.get('active_session')?.value;
    const userId = token ? decodeUserId(token) : null;

    if (!activeSession || !userId || activeSession !== userId) {
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