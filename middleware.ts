import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOST = process.env.CANONICAL_HOST || 'toc-dayplans.vercel.app';

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';

  // Force a single canonical host so users never land on an older preview deployment.
  // Only enforce on vercel.app hosts to avoid breaking localhost/custom domains.
  const isVercelHost = host.endsWith('.vercel.app');
  if (isVercelHost && host !== CANONICAL_HOST) {
    const url = req.nextUrl.clone();
    url.host = CANONICAL_HOST;
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  const res = NextResponse.next();

  // For public/share surfaces, disable edge/browser caching.
  // (Even if the DB is correct, cached HTML can look like "changes disappeared".)
  const path = req.nextUrl.pathname;
  if (path.startsWith('/p') || path.startsWith('/toc') || path.startsWith('/api/public/')) {
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    res.headers.set('Surrogate-Control', 'no-store');
  }

  return res;
}

export const config = {
  matcher: ['/:path*'],
};
