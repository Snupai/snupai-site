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

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isAllowedReferer(req: NextRequest): boolean {
  const referer = req.headers.get('referer') ?? '';
  // Allow localhost and your deployed domain (edit as needed)
  return (
    referer.startsWith('http://localhost') ||
    referer.startsWith('https://localhost') ||
    referer.startsWith('https://snupai.me')
  );
}

export async function POST(req: NextRequest) {
  // Referrer restriction
  if (!isAllowedReferer(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden: Invalid referer' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // Rate limiting
  const ip = getClientIp(req);
  const now = Date.now();
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
  try {
    const { prompt, maxTokens = 32 } = (await req.json()) as { prompt: string; maxTokens?: number };
    const result = await generateText({
      model: google('gemini-2.0-flash-lite-preview-02-05'),
      prompt,
      maxTokens,
      temperature: 0.7,
    });
    return new Response(JSON.stringify({ text: result.text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'AI error', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
