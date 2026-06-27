import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
    checkMiddlewareRateLimit,
    RATE_LIMIT_MW_LOGIN,
    RATE_LIMIT_MW_AUTH,
    RATE_LIMIT_MW_ADMIN,
} from "@/lib/rate-limiter";
import { getAllowedOrigin } from "@/lib/cors";

function getClientIp(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
    return "unknown";
}

function generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
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
    async function middleware(req) {
        const corsResponse = handleCorsPreFlight(req);
        if (corsResponse) return corsResponse;

        const pathname = req.nextUrl.pathname;

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

        if (pathname === "/login" && req.method === "POST") {
            const rl = await checkMiddlewareRateLimit(ip, "login", RATE_LIMIT_MW_LOGIN);
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

        if (pathname.startsWith("/api/auth") && req.method === "POST") {
            const rl = await checkMiddlewareRateLimit(ip, "auth-api", RATE_LIMIT_MW_AUTH);
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

        if (pathname.startsWith("/api/admin")) {
            const rl = await checkMiddlewareRateLimit(ip, "admin-api", RATE_LIMIT_MW_ADMIN);
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
            const nonce = generateNonce();
            const requestHeaders = new Headers(req.headers);
            requestHeaders.set("x-nonce", nonce);

            const response = NextResponse.next({
                request: { headers: requestHeaders },
            });
            response.headers.set("Content-Security-Policy", buildCspHeader(nonce));
            return response;
        }

        const isPublicApi = pathname.startsWith("/api/photo") || pathname.startsWith("/api/cron");

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

            if (isUserManagementPage && token.role !== "ADMIN") {
                return NextResponse.redirect(new URL("/admin", req.url));
            }
        }

        const nonce = generateNonce();
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set("x-nonce", nonce);

        const response = NextResponse.next({
            request: { headers: requestHeaders },
        });

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
                return true;
            },
        },
    }
);

export const config = {
    matcher: ["/admin/:path*", "/login", "/api/:path*", "/photo/:path*", "/download/:path*"],
};
