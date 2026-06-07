import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { AdminUser } from '@prisma/client';

export type AuthResult = {
  user: AdminUser;
  method: 'session' | 'apiKey';
};

/**
 * Read API key from headers only (never from query strings on mutating routes).
 */
export function getApiKeyFromRequest(req: Request): string | null {
  return req.headers.get('x-api-key') || req.headers.get('X-API-Key');
}

export async function resolveUserByApiKey(apiKey: string | null): Promise<AdminUser | null> {
  if (!apiKey?.trim()) return null;
  return prisma.adminUser.findFirst({
    where: { apiKey: apiKey.trim() } as any,
  });
}

/**
 * Authenticate kiosk/admin callers via NextAuth session or X-API-Key header.
 */
export async function authenticateRequest(req: Request): Promise<AuthResult | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    const user = await prisma.adminUser.findUnique({
      where: { email: session.user.email },
    });
    if (user) return { user, method: 'session' };
  }

  const apiKey = getApiKeyFromRequest(req);
  const user = await resolveUserByApiKey(apiKey);
  if (user) return { user, method: 'apiKey' };

  return null;
}

/**
 * Require authentication; throws Response on failure.
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const auth = await authenticateRequest(req);
  if (!auth) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return auth;
}

/**
 * Verify the caller may access a print order (owner or ADMIN).
 */
export async function canAccessOrder(
  auth: AuthResult,
  order: { adminUserId: string | null }
): Promise<boolean> {
  if (auth.user.role === 'ADMIN') return true;
  if (!order.adminUserId) return false;
  return order.adminUserId === auth.user.id;
}
