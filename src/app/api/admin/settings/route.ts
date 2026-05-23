import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ALL_ARTISTIC_FILTERS } from '@/lib/filters';
import { logAuditEvent } from '@/lib/audit-logger';
import { settingsSchema, formatZodErrors } from '@/lib/validations/schemas';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const BUCKET_NAME = 'photobooth-uploads';

async function deleteSupabaseFile(url: string | null) {
    if (!url) return;
    try {
        const bucketPathMarker = `${BUCKET_NAME}/`;
        if (url.includes(bucketPathMarker)) {
            const relativePath = url.split(bucketPathMarker)[1];
            if (relativePath) {
                const decodedPath = decodeURIComponent(relativePath);
                const { error } = await supabase.storage
                    .from(BUCKET_NAME)
                    .remove([decodedPath]);
                if (error) {
                    console.error('Failed to delete old logo from Supabase storage:', error);
                } else {
                    console.log('Successfully deleted old logo from Supabase storage:', decodedPath);
                }
            }
        }
    } catch (e) {
        console.error('Error in deleteSupabaseFile:', e);
    }
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(request.url);
        const apiKey = searchParams.get('apiKey');
        let setting: any = null;

        // KIOSK ACCESS (Unauthenticated)
        if (!session) {
            if (apiKey) {
                const adminUser = await prisma.adminUser.findFirst({
                    where: { apiKey } as any
                });
                if (adminUser) {
                    setting = await prisma.systemSetting.findUnique({
                        where: { adminUserId: adminUser.id },
                        include: { adminUser: true }
                    });
                }
            }

            if (!setting) {
                // Universal Settings: Get the first available settings record
                setting = await prisma.systemSetting.findFirst({
                    include: { adminUser: true }
                });
            }

            if (!setting) {
                // Fallback default
                return NextResponse.json({
                    isKioskLocked: false,
                    isPaymentEnabled: true,
                    isFrameSelectionEnabled: true,
                    isPhotoSessionEnabled: true,
                    isPhotoSelectionEnabled: true,
                    isPhotoFilterEnabled: true,
                    isResultEnabled: true
                });
            }

            // SYNC: Ensure Kiosk respects the owner's personal payment preference
            if (setting.adminUser) {
                setting.isPaymentEnabled = setting.adminUser.isPaymentEnabled;
            }

            return NextResponse.json(setting);
        }

        // ADMIN DASHBOARD ACCESS (Authenticated)
        const userId = (session.user as any).id;
        const userRole = (session.user as any).role;
        const targetUserId = searchParams.get('userId');
        const fetchUserId = (userRole === 'ADMIN' && targetUserId) ? targetUserId : userId;

        // Fetch User and their personal payment settings in one query to reduce connection pool pressure
        let adminUser = await prisma.adminUser.findUnique({ where: { id: fetchUserId } });
        let isPaymentEnabledUserLevel = adminUser?.isPaymentEnabled ?? false;

        // Fetch settings specifically for the target user
        setting = await prisma.systemSetting.findUnique({
            where: { adminUserId: fetchUserId },
            include: { adminUser: true }
        });

        if (!setting) {
            // If no settings exist yet, create a specific one tied to the target user
            setting = await (prisma.systemSetting.create({
                data: {
                    adminUserId: fetchUserId,
                    isPaymentEnabled: isPaymentEnabledUserLevel,
                    isFrameSelectionEnabled: true,
                    isPhotoSessionEnabled: true,
                    isPhotoSelectionEnabled: true,
                    isPhotoFilterEnabled: true,
                    isPhotoFilterTimerEnabled: true,
                    isResultEnabled: true,
                    frameSelectionTimer: 5,
                    photoSessionTimer: 3,
                    photoSelectionTimer: 3,
                    photoFilterTimer: 3,
                    captureTimer: 5,
                    maxCapturePhotos: 8,
                    resultTimer: 60,
                    isFrameSelectionTimerEnabled: true,
                    isPhotoSessionTimerEnabled: true,
                    isPhotoSelectionTimerEnabled: true,
                    isResultTimerEnabled: true,
                    enabledFilters: ALL_ARTISTIC_FILTERS.map((f) => f.id),
                    isGoogleDriveBackupEnabled: true,
                    photoRetentionDays: 7,
                    isKioskLocked: false,
                    kioskThemePreset: 'default',
                    kioskAccentColor: null,
                    kioskBgGradientStart: null,
                    kioskBgGradientEnd: null,
                    kioskBrandName: null,
                    kioskWelcomeMessage: null,
                    kioskFontFamily: null,
                    kioskLogoUrl: null
                } as any
            }) as any);
        }

        // Force user-level payment setting for non-admins so the photobooth reads the correct access state
        if (setting && userRole !== 'ADMIN') {
            setting.isPaymentEnabled = isPaymentEnabledUserLevel;
        }

        return NextResponse.json(setting);
    } catch (error: any) {
        console.error('Failed to fetch user settings error:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const userRole = (session.user as any)?.role || 'KARYAWAN';
        
        const { searchParams } = new URL(request.url);
        const targetUserId = searchParams.get('userId');
        const settingsAdminId = (userRole === 'ADMIN' && targetUserId) ? targetUserId : userId;
        
        const body = await request.json();

        // Validate input with Zod
        const parsed = settingsSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation error', details: formatZodErrors(parsed.error) },
                { status: 400 }
            );
        }

        // Fetch settings specifically for the target user
        const currentSetting = await prisma.systemSetting.findUnique({
            where: { adminUserId: settingsAdminId }
        });

        // Non-ADMIN users cannot change isPaymentEnabled at all.
        // Strip it from the parsed data so it never triggers a change.
        if (userRole !== 'ADMIN') {
            delete (parsed.data as any).isPaymentEnabled;
        }

        const {
            isPaymentEnabled,
            isFrameSelectionEnabled,
            isPhotoSessionEnabled,
            isPhotoSelectionEnabled,
            isPhotoFilterEnabled,
            isPhotoFilterTimerEnabled,
            isResultEnabled,
            frameSelectionTimer,
            photoSessionTimer,
            photoSelectionTimer,
            photoFilterTimer,
            captureTimer,
            maxCapturePhotos,
            resultTimer,
            isFrameSelectionTimerEnabled,
            isPhotoSessionTimerEnabled,
            isPhotoSelectionTimerEnabled,
            isResultTimerEnabled,
            enabledFilters,
            isGoogleDriveBackupEnabled,
            photoRetentionDays,
            isKioskLocked,
            kioskThemePreset,
            kioskAccentColor,
            kioskBgGradientStart,
            kioskBgGradientEnd,
            kioskBrandName,
            kioskWelcomeMessage,
            kioskFontFamily,
            kioskLogoUrl
        } = body;

        // Validation for captureTimer (Min 5, Max 10)
        let validatedCaptureTimer = captureTimer ?? 5;
        if (validatedCaptureTimer < 5) validatedCaptureTimer = 5;
        if (validatedCaptureTimer > 10) validatedCaptureTimer = 10;

        // @ts-ignore
        const updatedSetting = await (prisma.systemSetting as any).upsert({
            where: { adminUserId: settingsAdminId },
            update: {
                isPaymentEnabled: userRole === 'ADMIN' ? (isPaymentEnabled ?? true) : (currentSetting?.isPaymentEnabled ?? true),
                isFrameSelectionEnabled: isFrameSelectionEnabled ?? true,
                isPhotoSessionEnabled: isPhotoSessionEnabled ?? true,
                isPhotoSelectionEnabled: isPhotoSelectionEnabled ?? true,
                isPhotoFilterEnabled: isPhotoFilterEnabled ?? true,
                isPhotoFilterTimerEnabled: isPhotoFilterTimerEnabled ?? true,
                isResultEnabled: isResultEnabled ?? true,
                frameSelectionTimer: frameSelectionTimer ?? 5,
                photoSessionTimer: photoSessionTimer ?? 3,
                photoSelectionTimer: photoSelectionTimer ?? 3,
                photoFilterTimer: photoFilterTimer ?? 3,
                captureTimer: validatedCaptureTimer,
                maxCapturePhotos: maxCapturePhotos ?? 8,
                resultTimer: resultTimer ?? 60,
                isFrameSelectionTimerEnabled: isFrameSelectionTimerEnabled ?? true,
                isPhotoSessionTimerEnabled: isPhotoSessionTimerEnabled ?? true,
                isPhotoSelectionTimerEnabled: isPhotoSelectionTimerEnabled ?? true,
                isResultTimerEnabled: isResultTimerEnabled ?? true,
                enabledFilters: enabledFilters ?? ALL_ARTISTIC_FILTERS.map((f) => f.id),
                isGoogleDriveBackupEnabled: isGoogleDriveBackupEnabled ?? true,
                photoRetentionDays: photoRetentionDays ?? 7,
                isKioskLocked: isKioskLocked ?? false,
                kioskThemePreset: kioskThemePreset ?? 'default',
                kioskAccentColor: kioskAccentColor !== undefined ? kioskAccentColor : null,
                kioskBgGradientStart: kioskBgGradientStart !== undefined ? kioskBgGradientStart : null,
                kioskBgGradientEnd: kioskBgGradientEnd !== undefined ? kioskBgGradientEnd : null,
                kioskBrandName: kioskBrandName !== undefined ? kioskBrandName : null,
                kioskWelcomeMessage: kioskWelcomeMessage !== undefined ? kioskWelcomeMessage : null,
                kioskFontFamily: kioskFontFamily !== undefined ? kioskFontFamily : null,
                kioskLogoUrl: kioskLogoUrl !== undefined ? kioskLogoUrl : null,
            } as any,
            create: {
                adminUserId: settingsAdminId,
                isPaymentEnabled: isPaymentEnabled ?? true,
                isFrameSelectionEnabled: isFrameSelectionEnabled ?? true,
                isPhotoSessionEnabled: isPhotoSessionEnabled ?? true,
                isPhotoSelectionEnabled: isPhotoSelectionEnabled ?? true,
                isPhotoFilterEnabled: isPhotoFilterEnabled ?? true,
                isPhotoFilterTimerEnabled: isPhotoFilterTimerEnabled ?? true,
                isResultEnabled: isResultEnabled ?? true,
                frameSelectionTimer: frameSelectionTimer ?? 5,
                photoSessionTimer: photoSessionTimer ?? 3,
                photoSelectionTimer: photoSelectionTimer ?? 3,
                photoFilterTimer: photoFilterTimer ?? 3,
                captureTimer: validatedCaptureTimer,
                maxCapturePhotos: maxCapturePhotos ?? 8,
                resultTimer: resultTimer ?? 60,
                isFrameSelectionTimerEnabled: isFrameSelectionTimerEnabled ?? true,
                isPhotoSessionTimerEnabled: isPhotoSessionTimerEnabled ?? true,
                isPhotoSelectionTimerEnabled: isPhotoSelectionTimerEnabled ?? true,
                isResultTimerEnabled: isResultTimerEnabled ?? true,
                enabledFilters: enabledFilters ?? ALL_ARTISTIC_FILTERS.map((f) => f.id),
                isGoogleDriveBackupEnabled: isGoogleDriveBackupEnabled ?? true,
                photoRetentionDays: photoRetentionDays ?? 7,
                isKioskLocked: isKioskLocked ?? false,
                kioskThemePreset: kioskThemePreset ?? 'default',
                kioskAccentColor: kioskAccentColor !== undefined ? kioskAccentColor : null,
                kioskBgGradientStart: kioskBgGradientStart !== undefined ? kioskBgGradientStart : null,
                kioskBgGradientEnd: kioskBgGradientEnd !== undefined ? kioskBgGradientEnd : null,
                kioskBrandName: kioskBrandName !== undefined ? kioskBrandName : null,
                kioskWelcomeMessage: kioskWelcomeMessage !== undefined ? kioskWelcomeMessage : null,
                kioskFontFamily: kioskFontFamily !== undefined ? kioskFontFamily : null,
                kioskLogoUrl: kioskLogoUrl !== undefined ? kioskLogoUrl : null,
            } as any
        }) as any;

        // Clean up old custom logo files in Supabase storage to save space
        if ((currentSetting as any)?.kioskLogoUrl && (currentSetting as any).kioskLogoUrl !== (updatedSetting as any).kioskLogoUrl) {
            await deleteSupabaseFile((currentSetting as any).kioskLogoUrl);
        }

        // Audit log
        await logAuditEvent({
            userId: userId,
            userEmail: (session.user as any).email || 'unknown',
            action: 'SETTINGS_CHANGE',
            resource: 'settings',
            resourceId: updatedSetting.id,
            details: `Updated settings for user ${settingsAdminId}`,
        }, request);

        return NextResponse.json(updatedSetting);
    } catch (error: any) {
        console.error('Failed to update user settings error:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
