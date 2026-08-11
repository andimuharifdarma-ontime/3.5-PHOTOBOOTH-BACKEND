export type KioskPreviewScreen =
  | "launcher"
  | "frame"
  | "payment"
  | "shoot"
  | "select"
  | "filter"
  | "print";

export type KioskScreenBgImage = {
  url: string | null;
  opacity: number;
};

export type KioskScreenBgImages = Partial<Record<KioskPreviewScreen, KioskScreenBgImage>>;

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

export type KioskStep =
  | "SETUP"
  | "WELCOME"
  | "SELECT_THEME"
  | "SELECT_FRAME"
  | "CAPTURE"
  | "SELECT_PHOTOS"
  | "FILTER"
  | "PRINT_QUANTITY"
  | "PAYMENT"
  | "REVIEW"
  | "DONE";

export function kioskStepToScreen(step: KioskStep): KioskPreviewScreen | null {
  switch (step) {
    case "WELCOME":
      return "launcher";
    case "SELECT_THEME":
    case "SELECT_FRAME":
      return "frame";
    case "CAPTURE":
      return "shoot";
    case "SELECT_PHOTOS":
      return "select";
    case "FILTER":
    case "PRINT_QUANTITY":
      return "filter";
    case "PAYMENT":
      return "payment";
    case "REVIEW":
    case "DONE":
      return "print";
    default:
      return null;
  }
}
