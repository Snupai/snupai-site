import { type NextRequest, NextResponse } from 'next/server';

// Rate limit configuration
const RATE_LIMIT = {
  MAX_REQUESTS: 3,
  WINDOW_MS: 60 * 60 * 1000, // 1 hour in milliseconds
};

// In-memory store for rate limiting
const rateLimit = new Map<string, number[]>();

// Cleanup old entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of rateLimit.entries()) {
      const validTimestamps = timestamps.filter(time => now - time < RATE_LIMIT.WINDOW_MS);
      if (validTimestamps.length === 0) {
        rateLimit.delete(ip);
      } else {
        rateLimit.set(ip, validTimestamps);
      }
    }
  }, 60 * 1000);
}

export async function middleware(request: NextRequest) {
  // Only apply to contact form submissions
  if (request.nextUrl.pathname === '/api/contact' && request.method === 'POST') {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0] ?? realIp ?? 'unknown';
    const now = Date.now();

    // Get and clean existing timestamps
    const timestamps = rateLimit.get(ip) ?? [];
    const validTimestamps = timestamps.filter(time => now - time < RATE_LIMIT.WINDOW_MS);

    if (validTimestamps.length >= RATE_LIMIT.MAX_REQUESTS) {
      validTimestamps.sort((a, b) => a - b);
      const oldestTimestamp = validTimestamps[0] ?? now;
      const resetTime = oldestTimestamp + RATE_LIMIT.WINDOW_MS;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(retryAfter / 60) // Convert to minutes for client
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(RATE_LIMIT.MAX_REQUESTS),
            'X-RateLimit-Remaining': String(Math.max(0, RATE_LIMIT.MAX_REQUESTS - validTimestamps.length)),
            'X-RateLimit-Reset': String(resetTime)
          }
        }
      );
    }

    // Add new timestamp
    validTimestamps.push(now);
    rateLimit.set(ip, validTimestamps);

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/contact'
}; 