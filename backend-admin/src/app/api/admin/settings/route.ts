import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getApiKeyFromRequest, resolveUserByApiKey } from '@/lib/api-auth';
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

function sanitizeSettingsResponse(setting: any, isPaymentEnabled: boolean) {
    if (!setting) return setting;
    const { adminUser, ...safeSetting } = setting;
    return { ...safeSetting, isPaymentEnabled };
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(request.url);
        let setting: any = null;

        // Kiosk access: X-API-Key header only (never query string)
        if (!session) {
            const adminUser = await resolveUserByApiKey(getApiKeyFromRequest(request));
            if (!adminUser) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            setting = await prisma.systemSetting.findUnique({
                where: { adminUserId: adminUser.id },
            });

            if (!setting) {
                return NextResponse.json({
                    isKioskLocked: false,
                    isPaymentEnabled: adminUser.isPaymentEnabled,
                    isFrameSelectionEnabled: true,
                    isPhotoSessionEnabled: true,
                    isPhotoSelectionEnabled: true,
                    isPhotoFilterEnabled: true,
                    isResultEnabled: true,
                });
            }

            return NextResponse.json(
                sanitizeSettingsResponse(setting, adminUser.isPaymentEnabled)
            );
        }

        // ADMIN DASHBOARD ACCESS (Authenticated)
        const userId = (session.user as any).id;
        const userRole = (session.user as any).role;
        const targetUserId = searchParams.get('userId');
        const targetUserName = searchParams.get('userName');

        let fetchUserId = userId;
        if (userRole === 'ADMIN' || userRole === 'KARYAWAN') {
            if (targetUserId) {
                fetchUserId = targetUserId;
            } else if (targetUserName) {
                const targetUser = await prisma.adminUser.findFirst({
                    where: { name: targetUserName }
                });
                if (targetUser) {
                    fetchUserId = targetUser.id;
                }
            }
        }

        // Fetch User and their personal payment settings in one query to reduce connection pool pressure
        let adminUser = await prisma.adminUser.findUnique({ where: { id: fetchUserId } });
        let isPaymentEnabledUserLevel = adminUser?.isPaymentEnabled ?? false;

        // Fetch settings specifically for the target user
        setting = await prisma.systemSetting.findUnique({
            where: { adminUserId: fetchUserId },
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
                    kioskLogoUrl: null,
                    kioskTextColor: null,
                    kioskButtonColor: null,
                    kioskButtonTextColor: null,
                    kioskBgImageUrl: null,
                    kioskBgImageOpacity: 1.0,
                    kioskShowBgDots: true,
                    kioskShowBrandName: true,
                    kioskShowBrandSubtitle: false,
                    kioskBrandSubtitle: null,
                    kioskShowLogo: true,
                    kioskShowWelcomeMessage: true,
                    kioskShowPaymentHint: true,
                } as any
            }) as any);
        }

        // Force user-level payment setting so the dashboard and photobooth read the correct access state
        return NextResponse.json(
            sanitizeSettingsResponse(setting, isPaymentEnabledUserLevel)
        );
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

        const payload: any = { ...parsed.data };
        if (userRole !== 'ADMIN') delete payload.isPaymentEnabled;

        const targetAdminUser = await prisma.adminUser.findUnique({
            where: { id: settingsAdminId },
            select: { id: true, isPaymentEnabled: true },
        });
        if (!targetAdminUser) {
            return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
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
            kioskLogoUrl,
            kioskTextColor,
            kioskButtonColor,
            kioskButtonTextColor,
            kioskBgImageUrl,
            kioskBgImageOpacity,
            kioskShowBgDots,
            kioskShowBrandName,
            kioskShowBrandSubtitle,
            kioskBrandSubtitle,
            kioskShowLogo,
            kioskShowWelcomeMessage,
            kioskShowPaymentHint,
        } = payload;

        // Validation for captureTimer (Min 5, Max 10)
        let validatedCaptureTimer = captureTimer ?? 5;
        if (validatedCaptureTimer < 5) validatedCaptureTimer = 5;
        if (validatedCaptureTimer > 10) validatedCaptureTimer = 10;

        // @ts-ignore
        const updatedSetting = await (prisma.systemSetting as any).upsert({
            where: { adminUserId: settingsAdminId },
            update: {
                // Only update fields that are explicitly provided in the payload
                ...(isPaymentEnabled !== undefined && { isPaymentEnabled: userRole === 'ADMIN' ? isPaymentEnabled : targetAdminUser.isPaymentEnabled }),
                ...(isFrameSelectionEnabled !== undefined && { isFrameSelectionEnabled }),
                ...(isPhotoSessionEnabled !== undefined && { isPhotoSessionEnabled }),
                ...(isPhotoSelectionEnabled !== undefined && { isPhotoSelectionEnabled }),
                ...(isPhotoFilterEnabled !== undefined && { isPhotoFilterEnabled }),
                ...(isPhotoFilterTimerEnabled !== undefined && { isPhotoFilterTimerEnabled }),
                ...(isResultEnabled !== undefined && { isResultEnabled }),
                ...(frameSelectionTimer !== undefined && { frameSelectionTimer }),
                ...(photoSessionTimer !== undefined && { photoSessionTimer }),
                ...(photoSelectionTimer !== undefined && { photoSelectionTimer }),
                ...(photoFilterTimer !== undefined && { photoFilterTimer }),
                ...(captureTimer !== undefined && { captureTimer: validatedCaptureTimer }),
                ...(maxCapturePhotos !== undefined && { maxCapturePhotos }),
                ...(resultTimer !== undefined && { resultTimer }),
                ...(isFrameSelectionTimerEnabled !== undefined && { isFrameSelectionTimerEnabled }),
                ...(isPhotoSessionTimerEnabled !== undefined && { isPhotoSessionTimerEnabled }),
                ...(isPhotoSelectionTimerEnabled !== undefined && { isPhotoSelectionTimerEnabled }),
                ...(isResultTimerEnabled !== undefined && { isResultTimerEnabled }),
                ...(enabledFilters !== undefined && { enabledFilters }),
                ...(isGoogleDriveBackupEnabled !== undefined && { isGoogleDriveBackupEnabled }),
                ...(photoRetentionDays !== undefined && { photoRetentionDays }),
                ...(isKioskLocked !== undefined && { isKioskLocked }),
                ...(kioskThemePreset !== undefined && { kioskThemePreset }),
                ...(kioskAccentColor !== undefined && { kioskAccentColor }),
                ...(kioskBgGradientStart !== undefined && { kioskBgGradientStart }),
                ...(kioskBgGradientEnd !== undefined && { kioskBgGradientEnd }),
                ...(kioskBrandName !== undefined && { kioskBrandName }),
                ...(kioskWelcomeMessage !== undefined && { kioskWelcomeMessage }),
                ...(kioskFontFamily !== undefined && { kioskFontFamily }),
                ...(kioskLogoUrl !== undefined && { kioskLogoUrl }),
                ...(kioskTextColor !== undefined && { kioskTextColor }),
                ...(kioskButtonColor !== undefined && { kioskButtonColor }),
                ...(kioskButtonTextColor !== undefined && { kioskButtonTextColor }),
                ...(kioskBgImageUrl !== undefined && { kioskBgImageUrl }),
                ...(kioskBgImageOpacity !== undefined && { kioskBgImageOpacity }),
                ...(kioskShowBgDots !== undefined && { kioskShowBgDots }),
                ...(kioskShowBrandName !== undefined && { kioskShowBrandName }),
                ...(kioskShowBrandSubtitle !== undefined && { kioskShowBrandSubtitle }),
                ...(kioskBrandSubtitle !== undefined && { kioskBrandSubtitle }),
                ...(kioskShowLogo !== undefined && { kioskShowLogo }),
                ...(kioskShowWelcomeMessage !== undefined && { kioskShowWelcomeMessage }),
                ...(kioskShowPaymentHint !== undefined && { kioskShowPaymentHint }),
            } as any,
            create: {
                // For creation, use defaults for missing fields
                adminUserId: settingsAdminId,
                isPaymentEnabled: userRole === 'ADMIN' ? (isPaymentEnabled ?? targetAdminUser.isPaymentEnabled) : targetAdminUser.isPaymentEnabled,
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
                kioskTextColor: kioskTextColor !== undefined ? kioskTextColor : null,
                kioskButtonColor: kioskButtonColor !== undefined ? kioskButtonColor : null,
                kioskButtonTextColor: kioskButtonTextColor !== undefined ? kioskButtonTextColor : null,
                kioskBgImageUrl: kioskBgImageUrl !== undefined ? kioskBgImageUrl : null,
                kioskBgImageOpacity: kioskBgImageOpacity !== undefined ? kioskBgImageOpacity : 1.0,
                kioskShowBgDots: kioskShowBgDots !== undefined ? kioskShowBgDots : true,
                kioskShowBrandName: kioskShowBrandName !== undefined ? kioskShowBrandName : true,
                kioskShowBrandSubtitle: kioskShowBrandSubtitle !== undefined ? kioskShowBrandSubtitle : false,
                kioskBrandSubtitle: kioskBrandSubtitle !== undefined ? kioskBrandSubtitle : null,
                kioskShowLogo: kioskShowLogo !== undefined ? kioskShowLogo : true,
                kioskShowWelcomeMessage: kioskShowWelcomeMessage !== undefined ? kioskShowWelcomeMessage : true,
                kioskShowPaymentHint: kioskShowPaymentHint !== undefined ? kioskShowPaymentHint : true,
            } as any
        }) as any;

        // Clean up old custom logo files in Supabase storage to save space
        if ((currentSetting as any)?.kioskLogoUrl && (currentSetting as any).kioskLogoUrl !== (updatedSetting as any).kioskLogoUrl) {
            await deleteSupabaseFile((currentSetting as any).kioskLogoUrl);
        }

        // Clean up old custom background files in Supabase storage to save space
        if ((currentSetting as any)?.kioskBgImageUrl && (currentSetting as any).kioskBgImageUrl !== (updatedSetting as any).kioskBgImageUrl) {
            await deleteSupabaseFile((currentSetting as any).kioskBgImageUrl);
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
