import { NextRequest, NextResponse } from 'next/server';
import { uploadToGoogleDrive, createDailyFolder } from '@/lib/googleDrive';
import { uploadToGoogleDriveOAuth, createDailyFolderOAuth } from '@/lib/googleDriveOAuth';
import { authenticateRequest, canUploadPhoto } from '@/lib/api-auth';
import { backupToDriveSchema, formatZodErrors } from '@/lib/validations/schemas';

function resolveInternalApiBaseUrl(): string {
  const configured =
    process.env.INTERNAL_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    'http://localhost:3000';
  return configured.replace(/\/+$/, '');
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = backupToDriveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: formatZodErrors(parsed.error) },
        { status: 400 },
      );
    }

    const { imageId, bonusId, liveId, userName } = parsed.data;

    if (!(await canUploadPhoto(auth, imageId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (bonusId && !(await canUploadPhoto(auth, bonusId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (liveId && !(await canUploadPhoto(auth, liveId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('[backup-to-drive] Request for imageId:', imageId);

    // Check auth method: OAuth (preferred) or Service Account (fallback)
    const useOAuth = !!process.env.GOOGLE_REFRESH_TOKEN;
    const useServiceAccount = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);

    if (!useOAuth && !useServiceAccount) {
      console.warn('⚠️ Google Drive credentials not configured');
      console.warn('   - OAuth (GOOGLE_REFRESH_TOKEN):', useOAuth ? 'SET' : 'MISSING');
      console.warn('   - Service Account:', useServiceAccount ? 'SET' : 'MISSING');
      console.warn('   💡 Setup OAuth: http://localhost:3000/admin/oauth-setup');
      return NextResponse.json(
        {
          success: false,
          error: 'Google Drive not configured',
          message: 'Backup skipped - credentials missing. Visit /admin/oauth-setup to setup.'
        },
        { status: 200 } // Return 200 agar tidak error di client
      );
    }

    console.log('[backup-to-drive] Auth method:', useOAuth ? 'OAuth' : 'Service Account');

    // Buat folder untuk hari ini
    let dailyFolderId: string;
    try {
      console.log('📁 Creating daily folder...');
      dailyFolderId = useOAuth
        ? await createDailyFolderOAuth()
        : await createDailyFolder();
      console.log('✅ Daily folder created/found:', dailyFolderId);
    } catch (folderError) {
      console.error('❌ Error creating daily folder:', folderError);
      console.error('   Error details:', {
        name: folderError instanceof Error ? folderError.name : 'Unknown',
        message: folderError instanceof Error ? folderError.message : String(folderError),
        stack: folderError instanceof Error ? folderError.stack : 'No stack trace',
      });
      return NextResponse.json({
        success: false,
        error: 'Failed to create daily folder',
        details: folderError instanceof Error ? folderError.message : String(folderError),
      }, { status: 500 });
    }

    // Helper untuk fetch dengan retry (max 3 kali)
    async function fetchWithRetry(url: string, retries = 3, delayMs = 1500) {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch(url);
          if (res.ok) return res;
          if (res.status === 404 && i < retries - 1) {
             console.log(`⏳ Retry fetch ${url} - attempt ${i + 2}`);
             await new Promise(r => setTimeout(r, delayMs));
             continue;
          }
          return res;
        } catch (e) {
          if (i === retries - 1) throw e;
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
      return null;
    }

    const internalBaseUrl = resolveInternalApiBaseUrl();
    const results = [];

    // 1. Backup file utama (foto dengan frame)
    console.log('📤 Backing up main image:', imageId);
    try {
      const imageResponse = await fetchWithRetry(
        `${internalBaseUrl}/api/images/${imageId}`
      );

      if (imageResponse && imageResponse.ok) {
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const fileName = `${userName || 'user'}_${imageId}_main.png`;

        // Use OAuth or Service Account based on what's configured
        const uploadResult = useOAuth
          ? await uploadToGoogleDriveOAuth(imageBuffer, fileName, 'image/png', dailyFolderId)
          : await uploadToGoogleDrive(imageBuffer, fileName, 'image/png', dailyFolderId);

        results.push({ type: 'main', ...uploadResult });
        if (uploadResult.success) {
          console.log('✅ Main image backup: SUCCESS -', uploadResult.fileName);
        } else {
          const errorDetails = (uploadResult as any).details || '';
          console.error('❌ Main image backup: FAILED -', uploadResult.error, errorDetails);
        }
      } else {
        console.warn('⚠️ Main image not found after retries:', imageResponse?.status);
        results.push({
          type: 'main',
          success: false,
          error: `Image not found (${imageResponse?.status || 'network error'})`
        });
      }
    } catch (error) {
      console.error('❌ Error backing up main image:', error);
      results.push({
        type: 'main',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // 2. Backup bonus video (jika ada)
    if (bonusId) {
      console.log('📤 Backing up bonus video:', bonusId);
      try {
        const bonusResponse = await fetchWithRetry(
          `${internalBaseUrl}/api/images/${bonusId}`
        );

        if (bonusResponse && bonusResponse.ok) {
          const bonusBuffer = Buffer.from(await bonusResponse.arrayBuffer());
          const fileName = `${userName || 'user'}_${bonusId}.mp4`;

          const uploadResult = useOAuth
            ? await uploadToGoogleDriveOAuth(bonusBuffer, fileName, 'video/mp4', dailyFolderId)
            : await uploadToGoogleDrive(bonusBuffer, fileName, 'video/mp4', dailyFolderId);

          results.push({ type: 'bonus', ...uploadResult });
          if (uploadResult.success) {
            console.log('✅ Bonus video backup: SUCCESS -', uploadResult.fileName);
          } else {
            console.error('❌ Bonus video backup: FAILED -', uploadResult.error);
          }
        } else {
          console.warn('⚠️ Bonus video not found after retries:', bonusResponse?.status);
        }
      } catch (error) {
        console.error('❌ Error backing up bonus video:', error);
      }
    }

    // 3. Backup live photo video (jika ada)
    if (liveId) {
      console.log('[backup-to-drive] Backing up live photo:', liveId);
      try {
        const liveResponse = await fetchWithRetry(
          `${internalBaseUrl}/api/images/${liveId}`
        );

        if (liveResponse && liveResponse.ok) {
          const liveBuffer = Buffer.from(await liveResponse.arrayBuffer());
          const fileName = `${userName || 'user'}_${liveId}.mp4`;

          const uploadResult = useOAuth
            ? await uploadToGoogleDriveOAuth(liveBuffer, fileName, 'video/mp4', dailyFolderId)
            : await uploadToGoogleDrive(liveBuffer, fileName, 'video/mp4', dailyFolderId);

          results.push({ type: 'live', ...uploadResult });
          if (uploadResult.success) {
            console.log('✅ Live photo backup: SUCCESS -', uploadResult.fileName);
          } else {
            console.error('❌ Live photo backup: FAILED -', uploadResult.error);
          }
        } else {
          console.warn('⚠️ Live photo not found after retries:', liveResponse?.status);
        }
      } catch (error) {
        console.error('❌ Error backing up live photo:', error);
      }
    }

    // Hitung berapa file yang berhasil di-backup
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    // Log detailed results
    console.log('📊 Backup summary:', {
      success: successCount,
      total: totalCount,
      results: results.map(r => ({
        type: r.type,
        success: r.success,
        error: r.error || 'none',
      })),
    });

    return NextResponse.json({
      success: successCount > 0,
      message: `Backup completed: ${successCount}/${totalCount} files uploaded`,
      results,
      dailyFolderId,
      details: results.map(r => ({
        type: r.type,
        success: r.success,
        error: r.error || null,
        fileName: r.fileName || null,
      })),
    });
  } catch (error) {
    console.error('❌ Backup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Backup failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

