import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';

const protectedRoutes = ['/admin', '/dashboard', '/attendance', '/establishment', '/map', '/producer-log', '/data-entry', '/engineer-log', '/collectors', '/packers', '/users', '/predictions', '/tasks', '/traceability', '/profile'];
const publicRoutes = ['/', '/login'];

export async function middleware(request: NextRequest) {
  const session = await getIronSession(request.cookies, sessionOptions);
  const { user } = session;
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (!user && isProtectedRoute) {
    // Redirect to login page if not authenticated and trying to access a protected route
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Restringir la ruta /admin exclusivamente a usuarios con rol SuperAdmin
  if (user && pathname.startsWith('/admin') && user.role !== 'SuperAdmin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (user && (pathname === '/' || pathname === '/login')) {
    // Redirect to dashboard or admin if authenticated and trying to access the landing page or login page
    const targetUrl = user.role === 'SuperAdmin' ? '/admin' : '/dashboard';
    const response = NextResponse.redirect(new URL(targetUrl, request.url));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
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
     * - Any file with an extension (e.g. .png, .jpg, .json)
     */
    '/((?!api|_next/static|_next/image|.*\\.[\\w]+$).*)',
  ],
};
