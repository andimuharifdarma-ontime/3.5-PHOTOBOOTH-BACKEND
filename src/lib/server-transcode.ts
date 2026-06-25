import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import ffmpegStatic from 'ffmpeg-static';

const execFileAsync = promisify(execFile);

export const MOBILE_MP4_MAX_BYTES = 2 * 1024 * 1024;

function ffmpegPath(): string {
  const path = ffmpegStatic;
  if (!path) {
    throw new Error('FFmpeg is not available on this server');
  }
  return path;
}

export function isLikelyMp4Buffer(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  );
}

/** Skip re-encode when already a small H.264 MP4 container. */
export function isAlreadyMobileMp4(buffer: Buffer): boolean {
  if (!isLikelyMp4Buffer(buffer)) return false;
  return buffer.length <= MOBILE_MP4_MAX_BYTES;
}

function inputExtension(sourceExt: string, mime?: string): string {
  const ext = sourceExt.toLowerCase().replace(/^\./, '');
  if (['mp4', 'webm', 'gif', 'png', 'jpg', 'jpeg'].includes(ext)) return ext;
  if (mime?.includes('webm')) return 'webm';
  if (mime?.includes('gif')) return 'gif';
  if (mime?.includes('mp4')) return 'mp4';
  return 'bin';
}

export async function transcodeBufferToMobileMp4(
  inputBuffer: Buffer,
  sourceExt: string,
  mime?: string,
): Promise<Buffer> {
  if (isAlreadyMobileMp4(inputBuffer)) {
    return inputBuffer;
  }

  const workDir = await mkdtemp(join(tmpdir(), 'mobile-mp4-'));
  const ext = inputExtension(sourceExt, mime);
  const inputPath = join(workDir, `input.${ext}`);
  const outputPath = join(workDir, 'output.mp4');

  try {
    await writeFile(inputPath, inputBuffer);

    await execFileAsync(
      ffmpegPath(),
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
        String(MOBILE_MP4_MAX_BYTES),
        '-movflags',
        '+faststart',
        '-an',
        outputPath,
      ],
      { timeout: 55_000 },
    );

    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
