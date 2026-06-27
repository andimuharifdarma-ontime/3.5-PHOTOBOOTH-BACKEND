export const KIOSK_PRINTER_STORAGE_KEY = "kiosk_printer_name";
/** @deprecated Legacy single media key — migrated to 4R/A4 split keys. */
export const KIOSK_PRINT_MEDIA_STORAGE_KEY = "kiosk_print_media";
export const KIOSK_PRINT_MEDIA_4R_KEY = "kiosk_print_media_4r";
export const KIOSK_PRINT_MEDIA_A4_KEY = "kiosk_print_media_a4";

export interface KioskPrinter {
  name: string;
  status: string;
  hardware_status?: string;
  device_uri?: string;
  is_default: boolean;
  is_online: boolean;
  details?: string;
}

export interface KioskPrintersResponse {
  status: string;
  default_printer: string;
  printers: KioskPrinter[];
}

export interface KioskPrintMediaResponse {
  status: string;
  media_sizes: string[];
  photo_media: string[];
  a4_media?: string[];
  recommended_4r?: string | null;
  recommended_a4?: string | null;
}

export function isA4PrintMedia(media: string): boolean {
  const lower = media.toLowerCase();
  return lower.includes("a4") || lower.includes("210x297") || lower.includes("iso_a4");
}

export function is4RPrintMedia(media: string): boolean {
  if (isA4PrintMedia(media)) return false;
  const lower = media.toLowerCase();
  return ["epkg", "4x6", "10x15", "photo", "postcard", "2l", "roll"].some((key) =>
    lower.includes(key),
  );
}

export function filterPrintMediaFor4R(options: string[]): string[] {
  const matches = options.filter(is4RPrintMedia);
  return matches.length ? matches : options.filter((media) => !isA4PrintMedia(media));
}

export function filterPrintMediaForA4(options: string[]): string[] {
  const matches = options.filter(isA4PrintMedia);
  return matches.length ? matches : options;
}

export function readSavedPrinterName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KIOSK_PRINTER_STORAGE_KEY) || "";
}

export function writeSavedPrinterName(name: string) {
  if (typeof window === "undefined") return;
  if (name) {
    localStorage.setItem(KIOSK_PRINTER_STORAGE_KEY, name);
  } else {
    localStorage.removeItem(KIOSK_PRINTER_STORAGE_KEY);
  }
}

function readLegacyPrintMedia(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KIOSK_PRINT_MEDIA_STORAGE_KEY) || "";
}

export function readSavedPrintMedia4R(): string {
  if (typeof window === "undefined") return "";
  const saved = localStorage.getItem(KIOSK_PRINT_MEDIA_4R_KEY);
  if (saved) return saved;
  const legacy = readLegacyPrintMedia();
  if (legacy && is4RPrintMedia(legacy)) return legacy;
  return "";
}

export function readSavedPrintMediaA4(): string {
  if (typeof window === "undefined") return "";
  const saved = localStorage.getItem(KIOSK_PRINT_MEDIA_A4_KEY);
  if (saved) return saved;
  const legacy = readLegacyPrintMedia();
  if (legacy && isA4PrintMedia(legacy)) return legacy;
  return "";
}

export function writeSavedPrintMedia4R(media: string) {
  if (typeof window === "undefined") return;
  if (media) {
    localStorage.setItem(KIOSK_PRINT_MEDIA_4R_KEY, media);
  } else {
    localStorage.removeItem(KIOSK_PRINT_MEDIA_4R_KEY);
  }
}

export function writeSavedPrintMediaA4(media: string) {
  if (typeof window === "undefined") return;
  if (media) {
    localStorage.setItem(KIOSK_PRINT_MEDIA_A4_KEY, media);
  } else {
    localStorage.removeItem(KIOSK_PRINT_MEDIA_A4_KEY);
  }
}

/** Pick saved media for the active frame format (A4 vs strip/4R). */
export function readSavedPrintMediaForFrame(outputWidth?: number, outputHeight?: number): string {
  if (!outputWidth || !outputHeight) return readSavedPrintMedia4R();
  const aspect = outputWidth / outputHeight;
  const isA4 =
    outputWidth >= 2400 &&
    outputHeight >= 3400 &&
    Math.abs(aspect - 210 / 297) < 0.04;
  return isA4 ? readSavedPrintMediaA4() : readSavedPrintMedia4R();
}

export function resolvePreferredPrinter(
  printers: KioskPrinter[],
  defaultPrinter: string,
  savedName?: string,
): string {
  const saved = savedName ?? readSavedPrinterName();
  if (saved && printers.some((p) => p.name === saved)) {
    return saved;
  }

  const defaultEntry = printers.find((p) => p.name === defaultPrinter);
  if (defaultEntry?.is_online) {
    return defaultEntry.name;
  }

  const online = printers.find((p) => p.is_online);
  if (online) return online.name;

  return printers[0]?.name || "";
}

export function resolvePreferredPrintMedia(
  options: string[],
  recommended?: string | null,
  savedMedia?: string,
): string {
  if (savedMedia && options.includes(savedMedia)) {
    return savedMedia;
  }
  if (recommended && options.includes(recommended)) {
    return recommended;
  }
  return options[0] || "";
}
