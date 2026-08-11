import type { KioskPreviewScreen } from "@/lib/kiosk-theme-presets";

export type KioskScreenBgImage = {
  url: string | null;
  opacity: number;
};

export type KioskScreenBgImages = Partial<Record<KioskPreviewScreen, KioskScreenBgImage>>;

export const KIOSK_SCREEN_BG_LABELS: Record<KioskPreviewScreen, string> = {
  launcher: "Launcher",
  frame: "Bingkai",
  shoot: "Kamera",
  select: "Pilih Foto",
  filter: "Filter",
  payment: "Pembayaran",
  print: "Scan & Cetak",
};

export function normalizeKioskScreenBgImages(
  raw: unknown,
  legacyUrl?: string | null,
  legacyOpacity?: number | null,
): KioskScreenBgImages {
  const result: KioskScreenBgImages = {};

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      if (!value || typeof value !== "object") continue;
      const entry = value as { url?: unknown; opacity?: unknown };
      result[key as KioskPreviewScreen] = {
        url: typeof entry.url === "string" ? entry.url : null,
        opacity: typeof entry.opacity === "number" ? entry.opacity : 1,
      };
    }
  }

  if (!result.launcher?.url && legacyUrl) {
    result.launcher = {
      url: legacyUrl,
      opacity: legacyOpacity ?? 1,
    };
  }

  return result;
}

export function getScreenBg(
  images: KioskScreenBgImages | null | undefined,
  screen: KioskPreviewScreen,
  legacyUrl?: string | null,
  legacyOpacity?: number | null,
): KioskScreenBgImage {
  const normalized = normalizeKioskScreenBgImages(images, legacyUrl, legacyOpacity);
  return normalized[screen] ?? { url: null, opacity: 1 };
}

export function setScreenBg(
  images: KioskScreenBgImages,
  screen: KioskPreviewScreen,
  update: Partial<KioskScreenBgImage>,
): KioskScreenBgImages {
  const current = images[screen] ?? { url: null, opacity: 1 };
  return {
    ...images,
    [screen]: { ...current, ...update },
  };
}

export function collectBgImageUrls(
  images: KioskScreenBgImages | null | undefined,
  legacyUrl?: string | null,
): string[] {
  const urls = new Set<string>();
  if (legacyUrl) urls.add(legacyUrl);
  if (images) {
    for (const cfg of Object.values(images)) {
      if (cfg?.url) urls.add(cfg.url);
    }
  }
  return [...urls];
}
