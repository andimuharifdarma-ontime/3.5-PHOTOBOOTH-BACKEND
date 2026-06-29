import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
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

function isStoredApiKeyHash(stored: string): boolean {
  return stored.startsWith(HASH_PREFIX);
}

function apiKeyHintFromRaw(rawKey: string): string {
  return rawKey.trim().slice(-8);
}

export async function resolveUserByApiKey(
  prisma: PrismaService,
  apiKey: string | null | undefined,
): Promise<AdminUser | null> {
  if (!apiKey?.trim()) return null;
  const trimmed = apiKey.trim();

  const legacy = await prisma.adminUser.findFirst({
    where: { apiKey: trimmed },
  });
  if (legacy) {
    await prisma.adminUser.update({
      where: { id: legacy.id },
      data: {
        apiKey: hashApiKey(trimmed),
        apiKeyHint: apiKeyHintFromRaw(trimmed),
      },
    });
    return legacy;
  }

  const hash = hashApiKey(trimmed);
  return prisma.adminUser.findFirst({
    where: { apiKey: hash },
  });
}
