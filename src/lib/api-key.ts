import * as crypto from 'crypto';
import prisma from '@/lib/prisma';
import type { AdminUser } from '@prisma/client';

const HASH_PREFIX = 'dk.v1.';

function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function pepper(): string {
  return (
    process.env.API_KEY_PEPPER?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ''
  );
}

export function hashApiKey(rawKey: string): string {
  const normalized = rawKey.trim();
  const digest = crypto
    .createHmac('sha256', pepper())
    .update(normalized)
    .digest('hex');
  return `${HASH_PREFIX}${digest}`;
}

export function isStoredApiKeyHash(stored: string): boolean {
  return stored.startsWith(HASH_PREFIX);
}

export function apiKeyHintFromRaw(rawKey: string): string {
  return rawKey.trim().slice(-8);
}

export function maskApiKeyHint(hint: string | null | undefined): string | null {
  if (!hint) return null;
  return `dovelens_••••••••${hint}`;
}

export function verifyStoredApiKey(
  stored: string | null | undefined,
  presented: string,
): boolean {
  if (!stored || !presented?.trim()) return false;
  const trimmed = presented.trim();
  if (isStoredApiKeyHash(stored)) {
    return timingSafeEqualString(stored, hashApiKey(trimmed));
  }
  return timingSafeEqualString(stored, trimmed);
}

/** Resolve tenant by kiosk API key (supports legacy plaintext + hashed storage). */
export async function resolveUserByApiKey(
  apiKey: string | null | undefined,
): Promise<AdminUser | null> {
  if (!apiKey?.trim()) return null;
  const trimmed = apiKey.trim();

  const legacy = await prisma.adminUser.findFirst({
    where: { apiKey: trimmed } as any,
  });
  if (legacy) {
    const hint = apiKeyHintFromRaw(trimmed);
    await prisma.adminUser.update({
      where: { id: legacy.id },
      data: {
        apiKey: hashApiKey(trimmed),
        apiKeyHint: hint,
      } as any,
    });
    return legacy;
  }

  const hash = hashApiKey(trimmed);
  return prisma.adminUser.findFirst({
    where: { apiKey: hash } as any,
  });
}

export function generateRawApiKey(): string {
  return `dovelens_${crypto.randomBytes(24).toString('hex')}`;
}
