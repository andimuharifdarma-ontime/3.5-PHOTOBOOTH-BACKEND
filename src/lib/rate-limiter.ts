/**
 * Rate Limiter with Redis (Upstash) + In-Memory Fallback
 * 
 * Uses Upstash Redis for distributed rate limiting when configured.
 * Falls back to in-memory rate limiting if Redis credentials are not set.
 * 
 * SETUP:
 * 1. Create a free Redis database at https://upstash.com
 * 2. Add these to your .env.local:
 *    UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
 *    UPSTASH_REDIS_REST_TOKEN="AXxxxxxxxxxxxx"
 */

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// ==========================================
// Redis-based Rate Limiter (if configured)
// ==========================================

let redis: Redis | null = null;

function getRedis(): Redis | null {
    if (redis) return redis;
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
        redis = new Redis({ url, token });
        return redis;
    }
    return null;
}

// Pre-configured Upstash rate limiters (lazy-initialized)
let redisLimiters: Map<string, Ratelimit> | null = null;

function getRedisLimiter(action: string, maxRequests: number, windowSeconds: number): Ratelimit | null {
    const r = getRedis();
    if (!r) return null;

    if (!redisLimiters) {
        redisLimiters = new Map();
    }

    const key = `${action}:${maxRequests}:${windowSeconds}`;
    if (!redisLimiters.has(key)) {
        redisLimiters.set(key, new Ratelimit({
            redis: r,
            limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
            prefix: `rl:${action}`,
        }));
    }
    return redisLimiters.get(key)!;
}

// ==========================================
// In-Memory Fallback Rate Limiter
// ==========================================

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

interface RateLimiterConfig {
    /** Maximum requests allowed within the window */
    maxRequests: number;
    /** Time window in seconds */
    windowSeconds: number;
}

// In-memory store (per-process, resets on restart)
const ipStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup() {
    if (cleanupInterval) return;
    cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of ipStore.entries()) {
            if (now > entry.resetTime) {
                ipStore.delete(key);
            }
        }
    }, 5 * 60 * 1000);

    // Don't block Node.js from exiting
    if (cleanupInterval.unref) {
        cleanupInterval.unref();
    }
}

startCleanup();

/**
 * Extract client IP from request headers (works behind proxies/Netlify/Vercel).
 */
function getClientIp(request: Request): string {
    const headers = new Headers(request.headers);

    // Try common proxy headers
    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIp = headers.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }

    return 'unknown';
}

/**
 * Check rate limit for a specific action + IP combination.
 * Attempts Redis first, falls back to in-memory.
 */
export async function checkRateLimitAsync(
    request: Request,
    action: string,
    config: RateLimiterConfig
): Promise<{ allowed: boolean; headers: Record<string, string>; remaining: number }> {
    const ip = getClientIp(request);

    // Try Redis-based rate limiter first
    const redisLimiter = getRedisLimiter(action, config.maxRequests, config.windowSeconds);
    if (redisLimiter) {
        try {
            const result = await redisLimiter.limit(ip);
            const headers: Record<string, string> = {
                'X-RateLimit-Limit': String(result.limit),
                'X-RateLimit-Remaining': String(result.remaining),
                'X-RateLimit-Reset': String(Math.ceil((result.reset - Date.now()) / 1000)),
            };
            if (!result.success) {
                headers['Retry-After'] = String(Math.ceil((result.reset - Date.now()) / 1000));
            }
            return {
                allowed: result.success,
                headers,
                remaining: result.remaining,
            };
        } catch (error) {
            // Redis failed, fall back to in-memory
            console.warn('[RateLimiter] Redis failed, falling back to in-memory:', error);
        }
    }

    // In-memory fallback
    return Promise.resolve(checkRateLimit(request, action, config));
}

/**
 * Synchronous in-memory rate limiter (for backward compatibility).
 */
export function checkRateLimit(
    request: Request,
    action: string,
    config: RateLimiterConfig
): { allowed: boolean; headers: Record<string, string>; remaining: number } {
    const ip = getClientIp(request);
    const key = `${action}:${ip}`;
    const now = Date.now();

    let entry = ipStore.get(key);

    // Reset if window has expired
    if (!entry || now > entry.resetTime) {
        entry = {
            count: 0,
            resetTime: now + config.windowSeconds * 1000,
        };
    }

    entry.count++;
    ipStore.set(key, entry);

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    const headers: Record<string, string> = {
        'X-RateLimit-Limit': String(config.maxRequests),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(resetSeconds),
    };

    if (entry.count > config.maxRequests) {
        headers['Retry-After'] = String(resetSeconds);
    }

    return {
        allowed: entry.count <= config.maxRequests,
        headers,
        remaining,
    };
}

// ==========================================
// Pre-configured rate limits for common routes
// ==========================================

/** Checkout: 10 requests per minute per IP */
export const RATE_LIMIT_CHECKOUT: RateLimiterConfig = {
    maxRequests: 10,
    windowSeconds: 60,
};

/** Auth/Login: 5 attempts per minute per IP */
export const RATE_LIMIT_AUTH: RateLimiterConfig = {
    maxRequests: 5,
    windowSeconds: 60,
};

/** Admin API: 30 requests per minute per IP */
export const RATE_LIMIT_ADMIN: RateLimiterConfig = {
    maxRequests: 30,
    windowSeconds: 60,
};

/** General API: 60 requests per minute per IP */
export const RATE_LIMIT_GENERAL: RateLimiterConfig = {
    maxRequests: 60,
    windowSeconds: 60,
};
