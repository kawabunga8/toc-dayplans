import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Ensure /p always reflects the latest published snapshot by disabling edge/browser caching.
export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  // Vercel/edge + browser: do not store
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  // Some CDNs honor this for edge caching
  res.headers.set('Surrogate-Control', 'no-store');
  return res;
}

export const config = {
  matcher: ['/p/:path*'],
};
