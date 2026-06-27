/** Target max size for bonus / live photo MP4 (Supabase budget). */
export const VIDEO_BUDGET_MAX_BYTES = 2 * 1024 * 1024;

/** Video encode resolution cap; PNG final keeps full frame size. */
export const VIDEO_ENCODE_MAX_LONG_EDGE = 1080;

function evenDimension(value: number): number {
  const n = Math.max(2, Math.round(value));
  return n % 2 === 0 ? n : n - 1;
}

export function getVideoEncodeDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxLongEdge = VIDEO_ENCODE_MAX_LONG_EDGE,
): { width: number; height: number; scale: number } {
  const longEdge = Math.max(sourceWidth, sourceHeight);
  if (longEdge <= maxLongEdge) {
    return {
      width: evenDimension(sourceWidth),
      height: evenDimension(sourceHeight),
      scale: 1,
    };
  }
  const scale = maxLongEdge / longEdge;
  return {
    width: evenDimension(sourceWidth * scale),
    height: evenDimension(sourceHeight * scale),
    scale,
  };
}

export function computeBitrateForBudget(
  targetBytes: number,
  durationSec: number,
  minBitrate = 350_000,
  maxBitrate = 2_200_000,
): number {
  const raw = Math.floor((targetBytes * 8 * 0.88) / Math.max(durationSec, 0.5));
  return Math.min(maxBitrate, Math.max(minBitrate, raw));
}

export async function isLikelyMp4Container(blob: Blob): Promise<boolean> {
  if (blob.size < 12) return false;
  const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  return (
    head[4] === 0x66 &&
    head[5] === 0x74 &&
    head[6] === 0x79 &&
    head[7] === 0x70
  );
}

export async function isMobileCompatibleMp4(blob: Blob): Promise<boolean> {
  const mime = blob.type.toLowerCase();
  if (mime.includes('webm')) return false;
  if (!mime.includes('mp4') && !(await isLikelyMp4Container(blob))) return false;
  return isLikelyMp4Container(blob);
}

export async function ensureMobileMp4ViaCamera(
  blob: Blob,
  cameraUrl: string,
  apiKey: string,
  maxBytes = VIDEO_BUDGET_MAX_BYTES,
): Promise<Blob> {
  if (await isMobileCompatibleMp4(blob) && blob.size <= maxBytes) {
    return new Blob([await blob.arrayBuffer()], { type: 'video/mp4' });
  }

  const formData = new FormData();
  const inputName = blob.type.includes('gif') ? 'input.gif' : 'input.webm';
  formData.append('file', blob, inputName);

  const response = await fetch(`${cameraUrl}/transcode-mp4`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Transcode MP4 gagal di camera service');
  }

  const mp4Blob = await response.blob();
  return new Blob([await mp4Blob.arrayBuffer()], { type: 'video/mp4' });
}
