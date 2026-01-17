
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';

const protectedRoutes = ['/dashboard', '/establishment', '/map', '/producer-log', '/data-entry', '/engineer-log', '/collectors', '/packers', '/users', '/predictions'];
const publicRoutes = ['/'];

export async function middleware(request: NextRequest) {
  const session = await getIronSession(request.cookies, sessionOptions);
  const { user } = session;
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (!user && isProtectedRoute) {
    // Redirect to login page if not authenticated and trying to access a protected route
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  if (user && publicRoutes.includes(pathname)) {
    // Redirect to dashboard if authenticated and trying to access a public-only page like login
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo.png, manifest.json, etc. (public assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|manifest.json|icons/).*)',
  ],
};

    