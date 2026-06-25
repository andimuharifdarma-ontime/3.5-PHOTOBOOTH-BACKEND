import { NextRequest, NextResponse } from 'next/server';
import { transcodeBufferToMobileMp4 } from '@/lib/server-transcode';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_INPUT_BYTES = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: 'File tidak valid' }, { status: 400 });
  }

  if (file.size > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: 'File melebihi 50MB' }, { status: 400 });
  }

  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type || 'video/webm';
    const ext = mime.includes('gif') ? 'gif' : mime.includes('mp4') ? 'mp4' : 'webm';
    const outputBuffer = await transcodeBufferToMobileMp4(inputBuffer, ext, mime);

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="mobile.mp4"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('transcode-mp4 failed:', error);
    return NextResponse.json({ error: 'Gagal transcode video' }, { status: 500 });
  }
}
