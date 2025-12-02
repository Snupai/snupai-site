import type { NextRequest } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Simple in-memory rate limiter (per IP)
const rateLimitWindowMs = 60 * 1000; // 1 minute
const rateLimitMax = 10;
const ipHits: Record<string, { count: number; last: number }> = {};

// Simple in-memory cache for per-name daily roast results
type CachedRoast = { detail: string; expiresAt: number };
const roastCache: Record<string, CachedRoast> = {};

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isAllowedReferer(req: NextRequest): boolean {
  const referer = req.headers.get('referer') ?? '';
  return (
    referer.startsWith('http://localhost') ||
    referer.startsWith('https://localhost') ||
    referer.startsWith('https://snupai.me')
  );
}

function buildCacheHeaders(ttlSeconds: number): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': `public, s-maxage=${ttlSeconds}, max-age=${Math.min(60, ttlSeconds)}, stale-while-revalidate=604800`,
  };
}

export async function GET(req: NextRequest) {
  if (!isAllowedReferer(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden: Invalid referer' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const name = (searchParams.get('name') ?? '').trim();
    if (!name) {
      return new Response(JSON.stringify({ error: 'Missing name parameter' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const key = name.toLowerCase();
    const now = Date.now();
    const cached = roastCache[key];
    if (cached && cached.expiresAt > now) {
      // Serve from cache without counting toward rate limit
      return new Response(JSON.stringify({ roast: cached.detail }), { status: 200, headers: buildCacheHeaders(60 * 60 * 24) });
    }

    // Rate limiting (skip or relax for localhost)
    const referer = req.headers.get('referer') ?? '';
    const isLocal = referer.startsWith('http://localhost') || referer.startsWith('https://localhost');
    const ip = getClientIp(req);
    if (!isLocal) {
      if (!ipHits[ip] || now - ipHits[ip].last > rateLimitWindowMs) {
        ipHits[ip] = { count: 1, last: now };
      } else {
        ipHits[ip].count++;
        ipHits[ip].last = now;
      }
      if (ipHits[ip].count > rateLimitMax) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const prompt = `Write ONE playful, short roast for the project "${name}" (max 16 words). Keep it light-hearted, no offensive content.`;
    const result = await generateText({ model: google('gemini-2.0-flash-lite-preview-02-05'), prompt, maxTokens: 40, temperature: 0.8 });
    const text = result.text?.trim() || 'It roasts itself.';
    roastCache[key] = { detail: text, expiresAt: now + 24 * 60 * 60 * 1000 };
    return new Response(JSON.stringify({ roast: text }), { status: 200, headers: buildCacheHeaders(60 * 60 * 24) });
  } catch (err) {
    // Log error details for debugging, but do not expose them to the client
    console.error('AI error:', err);
    return new Response(
      JSON.stringify({ error: 'AI error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


