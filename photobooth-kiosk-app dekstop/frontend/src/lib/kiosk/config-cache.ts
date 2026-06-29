const SETTINGS_PREFIX = "kiosk_settings_v1_";
const THEMES_PREFIX = "kiosk_themes_v1_";

type CacheEnvelope<T> = { data: T; at: number };

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: CacheEnvelope<T> = { data, at: Date.now() };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // ignore quota errors
  }
}

export function readCachedKioskSettings(apiKey: string) {
  return readCache<Record<string, unknown>>(`${SETTINGS_PREFIX}${apiKey}`);
}

export function writeCachedKioskSettings(
  apiKey: string,
  settings: Record<string, unknown>,
) {
  writeCache(`${SETTINGS_PREFIX}${apiKey}`, settings);
}

export function readCachedKioskThemes(apiKey: string) {
  return readCache<unknown[]>(`${THEMES_PREFIX}${apiKey}`);
}

export function writeCachedKioskThemes(apiKey: string, themes: unknown[]) {
  writeCache(`${THEMES_PREFIX}${apiKey}`, themes);
}
