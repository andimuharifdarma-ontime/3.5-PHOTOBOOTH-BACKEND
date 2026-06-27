import * as crypto from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { validatePhotoId } from '@/lib/upload-validation';
import { resolveUserByApiKey as lookupUserByApiKey } from '@/lib/api-key';
import type { AdminUser } from '@prisma/client';

/** Max age for kiosk upload to a session photo ID (6 hours). */
const UPLOAD_SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000;

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
  return lookupUserByApiKey(apiKey);
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

export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function basePhotoId(id: string): string {
  return id.replace(/-(bonus|live)$/, '');
}

export function parsePhotoSessionTimestamp(id: string): number | null {
  const baseId = basePhotoId(id);
  const parts = baseId.split('-');
  const ts = parseInt(parts[parts.length - 1], 10);
  if (isNaN(ts) || ts <= 1_000_000_000_000 || ts >= 2_500_000_000_000) {
    return null;
  }
  return ts;
}

export function isActivePhotoSession(
  photoId: string,
  maxAgeMs = UPLOAD_SESSION_MAX_AGE_MS,
): boolean {
  const ts = parsePhotoSessionTimestamp(photoId);
  if (ts === null) return false;
  const age = Date.now() - ts;
  return age >= 0 && age <= maxAgeMs;
}

/**
 * Verify the caller may upload/overwrite assets for a photo session ID.
 */
export async function canUploadPhoto(auth: AuthResult, photoId: string): Promise<boolean> {
  const baseId = basePhotoId(photoId);

  if (!validatePhotoId(baseId)) return false;
  if (auth.user.role === 'ADMIN') return true;

  const ts = parsePhotoSessionTimestamp(baseId);
  if (ts === null || !isActivePhotoSession(baseId)) return false;

  const sessionLabel = baseId.slice(0, baseId.lastIndexOf('-'));
  const order = await prisma.printOrder.findFirst({
    where: {
      adminUserId: auth.user.id,
      OR: [
        { imageUrl: { contains: baseId } },
        {
          userName: { equals: sessionLabel, mode: 'insensitive' },
          createdAt: {
            gte: new Date(ts - 30 * 60 * 1000),
            lte: new Date(ts + 30 * 60 * 1000),
          },
        },
      ],
    },
  });

  return !!order;
}

/**
 * Require ADMIN role; throws Response on failure.
 */
export async function requireAdmin(req: Request): Promise<AuthResult> {
  const auth = await requireAuth(req);
  if (auth.user.role !== 'ADMIN') {
    throw new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return auth;
}
