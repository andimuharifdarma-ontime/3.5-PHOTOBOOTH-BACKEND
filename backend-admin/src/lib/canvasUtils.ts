export const DEFAULT_PHOTO_RETENTION_DAYS = 7;

export function computeExpirationFromId(id: string, retentionDays: number = DEFAULT_PHOTO_RETENTION_DAYS): Date {
  const timestamp = parseInt(id.split('-')[0], 10);
  const date = new Date(timestamp);
  date.setDate(date.getDate() + retentionDays);
  return date;
}

export async function pollUntilReady(
  checkFn: () => Promise<boolean>,
  interval: number = 1000,
  maxAttempts: number = 30
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await checkFn();
    if (result) return true;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return false;
}

export async function probeAssetReady(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export function applySlotTransformAndClip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  borderRadius?: number
) {
  ctx.save();
  if (borderRadius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, borderRadius);
    ctx.clip();
  }
}