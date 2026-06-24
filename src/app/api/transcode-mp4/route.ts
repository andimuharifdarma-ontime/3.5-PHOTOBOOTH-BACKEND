import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import ffmpegStatic from 'ffmpeg-static';

export const runtime = 'nodejs';
export const maxDuration = 60;

const execFileAsync = promisify(execFile);

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

  const ffmpegPath = ffmpegStatic;
  if (!ffmpegPath) {
    return NextResponse.json({ error: 'FFmpeg tidak tersedia di server' }, { status: 503 });
  }

  const workDir = await mkdtemp(join(tmpdir(), 'transcode-mp4-'));
  const inputPath = join(workDir, 'input.bin');
  const outputPath = join(workDir, 'output.mp4');

  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, inputBuffer);

    await execFileAsync(
      ffmpegPath,
      [
        '-y',
        '-i',
        inputPath,
        '-vf',
        "scale='min(1080,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
        '-c:v',
        'libx264',
        '-profile:v',
        'baseline',
        '-level',
        '3.1',
        '-pix_fmt',
        'yuv420p',
        '-b:v',
        '1500k',
        '-maxrate',
        '1800k',
        '-bufsize',
        '3600k',
        '-fs',
        String(2 * 1024 * 1024),
        '-movflags',
        '+faststart',
        '-an',
        outputPath,
      ],
      { timeout: 55_000 },
    );

    const outputBuffer = await readFile(outputPath);
    return new NextResponse(outputBuffer, {
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
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
