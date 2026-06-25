const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type PollOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
};

/** Poll until `check` returns true or attempts exhausted. Uses exponential backoff between tries. */
export async function pollUntilReady(
  check: () => Promise<boolean>,
  options: PollOptions = {},
): Promise<boolean> {
  const maxAttempts = options.maxAttempts ?? 30;
  let delay = options.initialDelayMs ?? 500;
  const maxDelay = options.maxDelayMs ?? 3000;
  const factor = options.backoffFactor ?? 1.4;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (await check()) return true;
    if (attempt < maxAttempts - 1) {
      await sleep(delay);
      delay = Math.min(maxDelay, Math.round(delay * factor));
    }
  }

  return false;
}

export async function headAssetReady(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      redirect: 'follow',
      headers: { Accept: '*/*' },
    });
    if (res.status === 410) return null;
    if (res.ok) return res.url || url;
  } catch {
    // fall through
  }
  return null;
}

/** Fallback when HEAD is blocked; uses lightweight GET without reading body when possible. */
export async function probeAssetReady(url: string): Promise<string | null> {
  const headResult = await headAssetReady(url);
  if (headResult) return headResult;

  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
      headers: { Accept: '*/*' },
    });
    if (res.status === 410) return null;
    if (res.ok) return res.url || url;
  } catch {
    // fall through
  }
  return null;
}

export const DEFAULT_PHOTO_RETENTION_DAYS = 7;

export function computeExpirationFromId(
  id: string,
  retentionDays = DEFAULT_PHOTO_RETENTION_DAYS,
): { expiresAt: number; remainingSec: number } | null {
  const parts = id.split('-');
  const timestamp = parseInt(parts[parts.length - 1], 10);
  if (isNaN(timestamp) || timestamp <= 1000000000000 || timestamp >= 2500000000000) {
    return null;
  }

  const limitMs = retentionDays * 24 * 60 * 60 * 1000;
  const expiresAt = timestamp + limitMs;
  const remainingSec = Math.floor((expiresAt - Date.now()) / 1000);

  return { expiresAt, remainingSec };
}
