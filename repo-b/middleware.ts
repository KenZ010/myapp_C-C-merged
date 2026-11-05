import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── Route Access Map ─────────────────────────────────────────────────────────
// Admin pages must live under /admin so they don't clash with customer routes
// such as /products and /orders.
const ROLE_ROUTES: Record<string, string[]> = {
  ADMIN:         ['/admin'],
  CASHIER:       ['/cashier'],
  STOCK_MANAGER: ['/inventory'],
  CUSTOMER: [
    '/home',
    '/products',
    '/orders',
    '/faqs',
    '/about',
    '/contact',
    '/transactions',
    '/return-order',
    '/settings',
    '/cart',
    '/checkout',
    '/order-placed',
  ],
};

// Roles restricted to a single active session at a time (ADMIN was not restricted before)
const SINGLE_SESSION_ROLES = new Set(['CUSTOMER', 'CASHIER', 'STOCK_MANAGER']);

// Routes anyone can visit without a token. Logged-in users are sent to their home.
const LOGIN_ROUTES = ['/', '/login'];

// Routes anyone can visit, logged in or not (no redirect)
const OPEN_ROUTES = ['/install', '/offline'];

// Where each role lands after login
const ROLE_HOME: Record<string, string> = {
  ADMIN:         '/admin/dashboard',
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
  return (ROLE_ROUTES[role] ?? []).some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

function clearAndRedirectToLogin(request: NextRequest): NextResponse {
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
    return clearAndRedirectToLogin(request);
  }

  // ── Open routes (install page, offline page) ─────────────────────────────
  if (OPEN_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  const role = token ? decodeRole(token) : null;
  const isLoggedIn = !!token && !!role;

  // ── Login routes ─────────────────────────────────────────────────────────
  if (LOGIN_ROUTES.includes(pathname)) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(ROLE_HOME[role!] ?? '/', request.url));
    }
    return NextResponse.next();
  }

  // ── Not authenticated ────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return clearAndRedirectToLogin(request);
  }

  // ── Wrong role for this route ────────────────────────────────────────────
  if (!canAccess(pathname, role!)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role!] ?? '/', request.url));
  }

  // ── Single-session enforcement ───────────────────────────────────────────
  if (SINGLE_SESSION_ROLES.has(role!)) {
    const activeToken = request.cookies.get('active_token')?.value;
    if (activeToken && activeToken !== token) {
      return clearAndRedirectToLogin(request);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)',
  ],
};