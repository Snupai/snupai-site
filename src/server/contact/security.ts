import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { CONTACT_RENDER_MAX_AGE_MS, CONTACT_RENDER_MIN_MS, type ContactFormPayload } from "~/lib/contact-form";
import { env } from "~/env";
import { isContactIpBanned } from "~/server/contact/store";
import { redis } from "~/server/redis";
import type {
  ContactAttemptMetadata,
  ContactSubmissionReason,
  ContactSubmissionRecord,
  ContactSubmissionStatus,
} from "~/server/contact/types";

const TEN_MINUTES_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function createRateLimitKey(ip: string, windowMs: number) {
  return `contact:rate:${ip}:${windowMs}`;
}

function getCountryFromRequest(request: NextRequest) {
  return request.headers.get("x-vercel-ip-country")
    ?? request.headers.get("cf-ipcountry")
    ?? request.headers.get("x-country");
}

export function getClientIp(request: NextRequest) {
  const forwardedChain = [
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-vercel-forwarded-for"),
    request.headers.get("cf-connecting-ip"),
  ];

  for (const value of forwardedChain) {
    if (!value) {
      continue;
    }

    const [candidate] = value.split(",").map((part) => part.trim()).filter(Boolean);
    if (candidate) {
      return candidate;
    }
  }

  return "unknown";
}

export function getContactAttemptMetadata(request: NextRequest): ContactAttemptMetadata {
  return {
    ip: getClientIp(request),
    country: getCountryFromRequest(request),
    userAgent: request.headers.get("user-agent"),
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    createdAt: new Date().toISOString(),
  };
}

function signRenderedAt(renderedAt: number) {
  return createHmac("sha256", env.CONTACT_FORM_SECRET)
    .update(String(renderedAt))
    .digest("hex");
}

export function createContactFormToken(renderedAt: number) {
  return `${renderedAt}.${signRenderedAt(renderedAt)}`;
}

export function isValidContactFormToken(formToken: string, renderedAt: number) {
  const [tokenTimestamp, signature] = formToken.split(".");
  if (tokenTimestamp !== String(renderedAt) || !signature) {
    return false;
  }

  const expectedSignature = signRenderedAt(renderedAt);
  if (expectedSignature.length !== signature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

async function checkRateLimitWindow(ip: string, now: number, windowMs: number, maxRequests: number) {
  const key = createRateLimitKey(ip, windowMs);
  const minimumScore = now - windowMs;

  await redis.zremrangebyscore(key, 0, minimumScore);

  const currentCount = await redis.zcard(key);
  if (currentCount >= maxRequests) {
    const earliestEntries = await redis.zrange<{ score: number; member: string }[]>(key, 0, 0, {
      withScores: true,
    });
    const earliestScore = earliestEntries[0]?.score ?? now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((earliestScore + windowMs - now) / 1000)),
    };
  }

  await redis.zadd(key, { score: now, member: `${now}-${randomUUID()}` });
  await redis.expire(key, Math.ceil(windowMs / 1000));

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

export async function enforceContactRateLimit(ip: string, now: number) {
  const shortWindow = await checkRateLimitWindow(ip, now, TEN_MINUTES_MS, 2);
  if (!shortWindow.allowed) {
    return {
      allowed: false,
      reasons: ["rate_limited_10m"] as ContactSubmissionReason[],
      retryAfterSeconds: shortWindow.retryAfterSeconds,
    };
  }

  const longWindow = await checkRateLimitWindow(ip, now, DAY_MS, 5);
  if (!longWindow.allowed) {
    return {
      allowed: false,
      reasons: ["rate_limited_24h"] as ContactSubmissionReason[],
      retryAfterSeconds: longWindow.retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    reasons: [] as ContactSubmissionReason[],
    retryAfterSeconds: 0,
  };
}

export async function classifyContactAttempt(
  payload: ContactFormPayload,
  metadata: ContactAttemptMetadata,
) {
  const reasons: ContactSubmissionReason[] = [];
  const now = Date.now();

  if (await isContactIpBanned(metadata.ip)) {
    reasons.push("ip_banned");
    return {
      status: "blocked" as ContactSubmissionStatus,
      reasons,
      retryAfterSeconds: 0,
    };
  }

  const rateLimit = await enforceContactRateLimit(metadata.ip, now);
  if (!rateLimit.allowed) {
    return {
      status: "blocked" as ContactSubmissionStatus,
      reasons: rateLimit.reasons,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    };
  }

  if (!isValidContactFormToken(payload.formToken, payload.renderedAt)) {
    reasons.push("form_token_invalid");
    return {
      status: "blocked" as ContactSubmissionStatus,
      reasons,
      retryAfterSeconds: 0,
    };
  }

  const ageMs = now - payload.renderedAt;
  if (ageMs > CONTACT_RENDER_MAX_AGE_MS) {
    reasons.push("form_token_expired");
    return {
      status: "blocked" as ContactSubmissionStatus,
      reasons,
      retryAfterSeconds: 0,
    };
  }

  if (payload.website.trim().length > 0) {
    reasons.push("honeypot_filled");
  }

  if (ageMs < CONTACT_RENDER_MIN_MS) {
    reasons.push("submitted_too_fast");
  }

  return {
    status: reasons.length > 0 ? ("suppressed" as ContactSubmissionStatus) : ("accepted" as ContactSubmissionStatus),
    reasons,
    retryAfterSeconds: 0,
  };
}

export function buildContactSubmissionRecord(
  payload: ContactFormPayload,
  metadata: ContactAttemptMetadata,
  status: ContactSubmissionStatus,
  reasons: ContactSubmissionReason[],
): ContactSubmissionRecord {
  return {
    id: randomUUID(),
    createdAt: metadata.createdAt,
    status,
    reasons,
    name: payload.name,
    email: payload.email,
    message: payload.message,
    ip: metadata.ip,
    country: metadata.country,
    userAgent: metadata.userAgent,
    origin: metadata.origin,
    referer: metadata.referer,
    delivery: "not_sent",
    reviewed: false,
  };
}
