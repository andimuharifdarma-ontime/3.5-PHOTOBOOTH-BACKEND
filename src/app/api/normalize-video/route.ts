import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, canUploadPhoto } from '@/lib/api-auth';
import { validatePhotoId } from '@/lib/upload-validation';
import {
  isSessionVideoAssetId,
  normalizeSessionVideoAsset,
} from '@/lib/session-video-storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(req);
  } catch (response) {
    if (response instanceof Response) return response;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = String(body?.id ?? '').replace(/\.+$/, '');

    if (!validatePhotoId(id) || !isSessionVideoAssetId(id)) {
      return NextResponse.json(
        { error: 'Invalid video asset id (must end with -bonus or -live)' },
        { status: 400 },
      );
    }

    if (!(await canUploadPhoto(auth, id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await normalizeSessionVideoAsset(id);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason ?? 'normalize_failed' },
        { status: result.reason === 'not_found' ? 404 : 400 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('normalize-video failed:', error);
    return NextResponse.json({ error: 'Failed to normalize video' }, { status: 500 });
  }
}
