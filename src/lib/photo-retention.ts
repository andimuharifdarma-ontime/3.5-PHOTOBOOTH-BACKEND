import prisma from '@/lib/prisma';

/** Default retention when no admin setting exists yet. */
export const DEFAULT_PHOTO_RETENTION_DAYS = 7;

/**
 * Global photo retention (days) — satu nilai untuk seluruh sistem.
 * Dibaca dari SystemSetting milik user role ADMIN.
 */
export async function getGlobalPhotoRetentionDays(): Promise<number> {
  const adminSetting = await prisma.systemSetting.findFirst({
    where: { adminUser: { role: 'ADMIN' } },
    select: { photoRetentionDays: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (adminSetting?.photoRetentionDays != null) {
    return adminSetting.photoRetentionDays;
  }

  const fallback = await prisma.systemSetting.findFirst({
    select: { photoRetentionDays: true },
    orderBy: { updatedAt: 'desc' },
  });

  return fallback?.photoRetentionDays ?? DEFAULT_PHOTO_RETENTION_DAYS;
}

/** Sinkronkan retention ke semua baris SystemSetting (hanya dipanggil saat ADMIN save). */
export async function setGlobalPhotoRetentionDays(days: number): Promise<number> {
  const clamped = Math.min(365, Math.max(1, Math.round(days)));
  await prisma.systemSetting.updateMany({
    data: { photoRetentionDays: clamped },
  });
  return clamped;
}
