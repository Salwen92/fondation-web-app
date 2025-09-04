import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createApiLogger } from './lib/logger';
import { rateLimitMiddleware } from './lib/rate-limit';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const logger = createApiLogger(request as unknown as Request);

  // Apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const rateLimitResponse = await rateLimitMiddleware({
      windowMs: 60000, // 1 minute
      maxRequests: 30, // 30 requests per minute
    })(request as unknown as Request);

    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded', {
        url: request.nextUrl.pathname,
      });
      return rateLimitResponse;
    }
  }

  // Security headers
  const headers = new Headers(response.headers);

  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.convex.cloud https://vercel.live",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.convex.cloud https://api.github.com wss://*.convex.cloud",
    "frame-src 'self' https://vercel.live",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ];

  headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Custom security headers
  headers.set('X-DNS-Prefetch-Control', 'on');
  headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // Remove potentially sensitive headers
  headers.delete('X-Powered-By');

  // Apply the headers to the response
  Object.entries(Object.fromEntries(headers.entries())).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Log request for monitoring
  logger.info('Request processed', {
    url: request.nextUrl.pathname,
    method: request.method,
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
