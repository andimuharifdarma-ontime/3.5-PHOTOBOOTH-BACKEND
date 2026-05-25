import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ==========================================
// Simple In-Memory Rate Limiter for Middleware
// (Separate from lib/rate-limiter which is for API route handlers)
// ==========================================
interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const middlewareRateStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
if (!cleanupTimer) {
    cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of middlewareRateStore.entries()) {
            if (now > entry.resetTime) {
                middlewareRateStore.delete(key);
            }
        }
    }, 5 * 60 * 1000);
    if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
        (cleanupTimer as NodeJS.Timeout).unref();
    }
}

function getClientIp(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
    return "unknown";
}

function checkMiddlewareRateLimit(
    ip: string,
    action: string,
    maxRequests: number,
    windowSeconds: number
): { allowed: boolean; retryAfter: number } {
    const key = `mw:${action}:${ip}`;
    const now = Date.now();

    let entry = middlewareRateStore.get(key);

    if (!entry || now > entry.resetTime) {
        entry = { count: 0, resetTime: now + windowSeconds * 1000 };
    }

    entry.count++;
    middlewareRateStore.set(key, entry);

    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

    return {
        allowed: entry.count <= maxRequests,
        retryAfter,
    };
}

// ==========================================
// CSP Nonce Generation
// ==========================================
function generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    // Convert to base64
    let binary = '';
    for (let i = 0; i < array.length; i++) {
        binary += String.fromCharCode(array[i]);
    }
    return btoa(binary);
}

function buildCspHeader(nonce: string): string {
    const isDev = process.env.NODE_ENV === 'development';
    const csp = [
        `default-src 'self'`,
        // Next.js requires 'unsafe-inline' for its hydration/inline scripts on Netlify.
        // In dev, also allow 'unsafe-eval' for React debugging tools.
        `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.google.com https://www.gstatic.com https://accounts.google.com`,
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
        `img-src 'self' blob: data: https://*.supabase.co https://*.vercel-storage.com https://*.googleusercontent.com https://*.doku.com https://*.google.com https://*.gstatic.com https://*.vercel.app`,
        `font-src 'self' https://fonts.gstatic.com`,
        `connect-src 'self' data: https://*.supabase.co https://*.vercel-storage.com https://*.googleapis.com https://*.doku.com https://*.google.com https://*.vercel.app blob:${isDev ? ' ws://localhost:* http://localhost:*' : ''}`,
        `frame-src 'self' https://*.doku.com https://accounts.google.com`,
        `media-src 'self' data: blob: https://*.supabase.co https://*.vercel-storage.com https://*.googleusercontent.com https://*.vercel.app`,
        `object-src 'none'`,
        `base-uri 'self'`,
        `form-action 'self'`,
        `frame-ancestors 'none'`,
        ...(isDev ? [] : [`upgrade-insecure-requests`]),
    ];
    return csp.join('; ');
}

// CORS preflight handler for API routes
// Supports requests from: web browser, Electron desktop app, and Vercel deployment
function getAllowedOrigin(req: NextRequest): string {
    const origin = req.headers.get('origin') || '';
    const allowedOrigins = [
        process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3003',
        // Electron app uses file:// protocol or custom scheme
        'app://.',
    ];

    // Allow any Vercel preview/production URL
    if (origin.endsWith('.vercel.app') || origin.endsWith('.vercel.sh')) {
        return origin;
    }

    // Allow configured origins
    if (allowedOrigins.includes(origin)) {
        return origin;
    }

    // Default fallback
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

function handleCorsPreFlight(req: NextRequest): NextResponse | null {
    if (req.method === "OPTIONS" && req.nextUrl.pathname.startsWith("/api/")) {
        const allowedOrigin = getAllowedOrigin(req);
        return new NextResponse(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": allowedOrigin,
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-API-Key",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "86400",
            },
        });
    }
    return null;
}

export default withAuth(
    function middleware(req) {
        // Handle CORS preflight first
        const corsResponse = handleCorsPreFlight(req);
        if (corsResponse) return corsResponse;

        const pathname = req.nextUrl.pathname;

        // ==========================
        // PUBLIC KIOSK API BYPASS (GET only)
        // Allows the kiosk to fetch settings, profile, and themes unauthenticated.
        // ==========================
        const isPublicKioskApi = (
            pathname.includes("/api/admin/settings") || 
            pathname.includes("/api/admin/profile") || 
            pathname.includes("/api/themes")
        ) && req.method === "GET";

        if (isPublicKioskApi) {
            const allowedOrigin = getAllowedOrigin(req);
            const response = NextResponse.next();
            response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
            response.headers.set("Access-Control-Allow-Credentials", "true");
            return response;
        }

        const ip = getClientIp(req);

        // ==========================
        // Rate Limiting: Login Endpoint
        // 5 attempts per 60 seconds per IP
        // ==========================
        if (pathname === "/login" && req.method === "POST") {
            const rl = checkMiddlewareRateLimit(ip, "login", 5, 60);
            if (!rl.allowed) {
                return new NextResponse(
                    JSON.stringify({ error: "Terlalu banyak percobaan login. Coba lagi nanti." }),
                    {
                        status: 429,
                        headers: {
                            "Content-Type": "application/json",
                            "Retry-After": String(rl.retryAfter),
                        },
                    }
                );
            }
        }

        // ==========================
        // Rate Limiting: Auth API (NextAuth signIn)
        // 10 attempts per 60 seconds per IP
        // ==========================
        if (pathname.startsWith("/api/auth") && req.method === "POST") {
            const rl = checkMiddlewareRateLimit(ip, "auth-api", 10, 60);
            if (!rl.allowed) {
                return new NextResponse(
                    JSON.stringify({ error: "Too many authentication attempts. Try again later." }),
                    {
                        status: 429,
                        headers: {
                            "Content-Type": "application/json",
                            "Retry-After": String(rl.retryAfter),
                        },
                    }
                );
            }
        }

        // ==========================
        // Rate Limiting: Admin API routes
        // 100 requests per 60 seconds per IP
        // ==========================
        if (pathname.startsWith("/api/admin")) {
            const rl = checkMiddlewareRateLimit(ip, "admin-api", 100, 60);
            if (!rl.allowed) {
                return new NextResponse(
                    JSON.stringify({ error: "Rate limit exceeded. Please slow down." }),
                    {
                        status: 429,
                        headers: {
                            "Content-Type": "application/json",
                            "Retry-After": String(rl.retryAfter),
                        },
                    }
                );
            }
        }

        const token = req.nextauth.token;
        const isAuth = !!token;
        const isAuthPage = pathname.startsWith("/login");
        const isAdminPage = pathname.startsWith("/admin");
        const isAdminApi = pathname.startsWith("/api/admin");
        const isUserManagementPage = pathname.startsWith("/admin/users");

        if (isAuthPage) {
            if (isAuth) {
                return NextResponse.redirect(new URL("/admin", req.url));
            }
            // For login page, just pass through with CSP nonce
            const nonce = generateNonce();
            const requestHeaders = new Headers(req.headers);
            requestHeaders.set("x-nonce", nonce);

            const response = NextResponse.next({
                request: { headers: requestHeaders },
            });
            response.headers.set("Content-Security-Policy", buildCspHeader(nonce));
            return response;
        }

        // ==========================
        // Public API routes (no auth required)
        // /api/photo/* - QR scan photo viewer
        // /api/cron/* - Vercel cron jobs (protected by CRON_SECRET)
        // ==========================
        const isPublicApi = pathname.startsWith("/api/photo") || pathname.startsWith("/api/cron");

        // ==========================
        // Centralized Admin API Protection
        // All /api/admin/* routes require authentication
        // ==========================
        if (isAdminApi && !isPublicApi) {
            if (!isAuth) {
                const allowedOrigin = getAllowedOrigin(req);
                return new NextResponse(
                    JSON.stringify({ error: "Unauthorized" }),
                    {
                        status: 401,
                        headers: { 
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": allowedOrigin,
                            "Access-Control-Allow-Credentials": "true"
                        },
                    }
                );
            }
        }

        if (isAdminPage) {
            if (!isAuth) {
                let from = pathname;
                if (req.nextUrl.search) {
                    from += req.nextUrl.search;
                }
                return NextResponse.redirect(
                    new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
                );
            }

            // Role based protection for /admin/users
            if (isUserManagementPage && token.role !== "ADMIN") {
                return NextResponse.redirect(new URL("/admin", req.url));
            }
        }

        // ==========================
        // CSP Nonce: Generate and inject for all page requests
        // ==========================
        const nonce = generateNonce();
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set("x-nonce", nonce);

        const response = NextResponse.next({
            request: { headers: requestHeaders },
        });

        // Add CORS headers for API routes
        if (pathname.startsWith("/api/")) {
            const allowedOrigin = getAllowedOrigin(req);
            response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
            response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-API-Key");
            response.headers.set("Access-Control-Allow-Credentials", "true");
        }

        response.headers.set("Content-Security-Policy", buildCspHeader(nonce));

        return response;
    },
    {
        callbacks: {
            async authorized() {
                // Return true so middleware function above always runs
                return true;
            },
        },
    }
);

export const config = {
    matcher: ["/admin/:path*", "/login", "/api/:path*", "/photo/:path*", "/((?!_next/static|_next/image|favicon.ico|logo/).*)"],
};
