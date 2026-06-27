/**
 * Zod Validation Schemas (Zod v4)
 * 
 * Centralized input validation for all API routes.
 * Ensures data integrity and prevents injection attacks.
 */

import { z } from 'zod';

// ==========================
// User Management Schemas
// ==========================

export const createUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter').trim(),
  email: z.string().email('Format email tidak valid').max(255).trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(128, 'Password maksimal 128 karakter')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password harus mengandung huruf besar, huruf kecil, dan angka'
    ),
  role: z.enum(['ADMIN', 'KARYAWAN', 'CLIENT'], 'Role harus ADMIN, KARYAWAN, atau CLIENT'),
  canManageThemes: z.boolean().optional().default(false),
  canManageFilters: z.boolean().optional().default(false),
  isPaymentEnabled: z.boolean().optional().default(false),
  canInputCapital: z.boolean().optional().default(false),
  initialCapital: z.number().int().min(0).optional().default(0),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  email: z.string().email('Format email tidak valid').max(255).trim().toLowerCase().optional(),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(128, 'Password maksimal 128 karakter')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password harus mengandung huruf besar, huruf kecil, dan angka'
    )
    .optional()
    .or(z.literal('')), // Allow empty string for "no password change"
  role: z.enum(['ADMIN', 'KARYAWAN', 'CLIENT']).optional(),
  canManageThemes: z.boolean().optional(),
  canManageFilters: z.boolean().optional(),
  isPaymentEnabled: z.boolean().optional(),
  canInputCapital: z.boolean().optional(),
  initialCapital: z.number().int().min(0).optional(),
});

// ==========================
// Checkout / Payment Schemas
// ==========================

export const checkoutSchema = z.object({
  userName: z.string().min(1, 'Nama pengguna wajib diisi').max(100).trim(),
  frameId: z.string().min(1, 'Frame ID wajib diisi'),
  frameName: z.string().max(200).optional(),
  quantity: z.number().int().min(1, 'Minimal 1 foto').max(20, 'Maksimal 20 foto'),
  customerEmail: z.string().email('Format email tidak valid').max(255).trim(),
  customerPhone: z
    .string()
    .min(10, 'Nomor telepon minimal 10 digit')
    .max(20, 'Nomor telepon maksimal 20 digit')
    .regex(/^[0-9+\-\s()]+$/, 'Format nomor telepon tidak valid'),
});

// ==========================
// Settings Schema
// ==========================

export const settingsSchema = z.object({
  isPaymentEnabled: z.boolean().optional(),
  isFrameSelectionEnabled: z.boolean().optional(),
  isPhotoSessionEnabled: z.boolean().optional(),
  isPhotoSelectionEnabled: z.boolean().optional(),
  isPhotoFilterEnabled: z.boolean().optional(),
  isPhotoFilterTimerEnabled: z.boolean().optional(),
  isResultEnabled: z.boolean().optional(),
  frameSelectionTimer: z.number().int().min(1).max(120).optional(),
  photoSessionTimer: z.number().int().min(1).max(120).optional(),
  photoSelectionTimer: z.number().int().min(1).max(120).optional(),
  photoFilterTimer: z.number().int().min(1).max(120).optional(),
  captureTimer: z.number().int().min(5).max(10).optional(),
  maxCapturePhotos: z.number().int().min(1).max(20).optional(),
  resultTimer: z.number().int().min(1).max(120).optional(),
  isFrameSelectionTimerEnabled: z.boolean().optional(),
  isPhotoSessionTimerEnabled: z.boolean().optional(),
  isPhotoSelectionTimerEnabled: z.boolean().optional(),
  isResultTimerEnabled: z.boolean().optional(),
  enabledFilters: z.array(z.string()).optional(),
  isGoogleDriveBackupEnabled: z.boolean().optional(),
  photoRetentionDays: z.number().int().min(1).max(365).optional(),
  isKioskLocked: z.boolean().optional(),
  kioskThemePreset: z.string().optional(),
  kioskAccentColor: z.string().nullable().optional(),
  kioskBgGradientStart: z.string().nullable().optional(),
  kioskBgGradientEnd: z.string().nullable().optional(),
  kioskBrandName: z.string().nullable().optional(),
  kioskWelcomeMessage: z.string().nullable().optional(),
  kioskFontFamily: z.string().nullable().optional(),
  kioskLogoUrl: z.string().nullable().optional(),
  kioskTextColor: z.string().nullable().optional(),
  kioskButtonColor: z.string().nullable().optional(),
  kioskButtonTextColor: z.string().nullable().optional(),
  kioskBgImageUrl: z.string().nullable().optional(),
  kioskBgImageOpacity: z.number().min(0).max(1).nullable().optional(),
  kioskShowBgDots: z.boolean().optional(),
  kioskShowBrandName: z.boolean().optional(),
  kioskShowBrandSubtitle: z.boolean().optional(),
  kioskBrandSubtitle: z.string().nullable().optional(),
  kioskShowLogo: z.boolean().optional(),
  kioskShowWelcomeMessage: z.boolean().optional(),
  kioskShowPaymentHint: z.boolean().optional(),
});

// ==========================
// Offline Session Schema
// ==========================

export const offlineSessionSchema = z.object({
  userName: z.string().min(1).max(100).trim(),
  frameId: z.string().min(1).max(100),
  frameName: z.string().max(200).optional(),
  quantity: z.number().int().min(1).max(20).optional().default(1),
  imageUrl: z.string().max(500).optional().default(''),
});

/** Allowed payment statuses for bulk offline sync (no pending — prevents payment bypass). */
export const OFFLINE_SYNC_PAYMENT_STATUSES = ['paid', 'printed', 'free'] as const;

export const offlineSyncOrderSchema = z.object({
  localId: z.string().max(100).optional(),
  userName: z.string().min(1).max(100).trim(),
  frameId: z.string().min(1).max(100),
  frameName: z.string().min(1).max(200).trim(),
  quantity: z.number().int().min(1).max(20).optional().default(1),
  pricePerFrame: z.number().min(0).max(1_000_000).optional().default(0),
  totalPrice: z.number().min(0).max(10_000_000).optional().default(0),
  costPrice: z.number().min(0).max(1_000_000).optional().default(2500),
  imageUrl: z.string().max(500).optional().default(''),
  paymentStatus: z.enum(OFFLINE_SYNC_PAYMENT_STATUSES).optional().default('free'),
  printedAt: z.union([z.string(), z.number()]).optional(),
  createdAt: z.union([z.string(), z.number()]).optional(),
});

export const offlineSyncBatchSchema = z.object({
  orders: z.array(offlineSyncOrderSchema).min(1).max(50),
});

export const backupToDriveSchema = z.object({
  imageId: z.string().regex(/^[a-zA-Z0-9_-]{8,128}$/, 'Invalid image ID'),
  bonusId: z.string().regex(/^[a-zA-Z0-9_-]{8,128}$/, 'Invalid bonus ID').optional(),
  liveId: z.string().regex(/^[a-zA-Z0-9_-]{8,128}$/, 'Invalid live ID').optional(),
  userName: z.string().max(100).optional(),
});

// ==========================
// Live Photo Upload Schema
// ==========================

export const livePhotoUploadSchema = z.object({
  photoId: z.string().regex(/^[a-zA-Z0-9_-]{8,128}$/, 'Invalid photo ID format'),
});

// ==========================
// Helpers
// ==========================

/**
 * Formats Zod validation errors into a user-friendly string.
 */
export function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}
