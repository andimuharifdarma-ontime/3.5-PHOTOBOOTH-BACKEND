import type { CSSProperties } from "react";

export interface KioskSettingsRaw {
  kioskThemePreset?: string | null;
  kioskAccentColor?: string | null;
  kioskBgGradientStart?: string | null;
  kioskBgGradientEnd?: string | null;
  kioskBrandName?: string | null;
  kioskWelcomeMessage?: string | null;
  kioskFontFamily?: string | null;
  kioskLogoUrl?: string | null;
  kioskTextColor?: string | null;
  kioskButtonColor?: string | null;
  kioskButtonTextColor?: string | null;
  kioskBgImageUrl?: string | null;
  kioskBgImageOpacity?: number | null;
  kioskScreenBgImages?: Record<string, { url: string | null; opacity: number }> | null;
  kioskShowBgDots?: boolean | null;
  kioskShowBrandName?: boolean | null;
  kioskShowBrandSubtitle?: boolean | null;
  kioskBrandSubtitle?: string | null;
  kioskShowLogo?: boolean | null;
  kioskShowWelcomeMessage?: boolean | null;
  kioskShowPaymentHint?: boolean | null;
  [key: string]: unknown;
}

export interface KioskTheme {
  preset: string;
  accent: string;
  bgStyle: string;
  bgGradientStart: string;
  bgGradientEnd: string;
  textColorHex: string;
  subtextColorHex: string;
  textColorClass: string;
  subtextColorClass: string;
  cardBgClass: string;
  buttonColor: string;
  buttonTextColor: string;
  fontFamily: string;
  brandName: string;
  welcomeMessage: string;
  logoUrl: string | null;
  bgImageUrl: string | null;
  bgImageOpacity: number;
  showBgDots: boolean;
  showBrandName: boolean;
  showBrandSubtitle: boolean;
  brandSubtitle: string;
  showLogo: boolean;
  showWelcomeMessage: boolean;
  showPaymentHint: boolean;
  isLight: boolean;
  dotColor: string;
  surfaceBg: string;
  surfaceBorder: string;
  mutedText: string;
  /** Page/section headings — white on dark backgrounds, accent on light. */
  headingColor: string;
}

const PRESET_FALLBACKS: Record<
  string,
  {
    accent: string;
    bgStart: string;
    bgEnd: string;
    textColor: string;
    buttonColor: string;
    buttonTextColor: string;
    font: string;
  }
> = {
  pop_art: {
    accent: "#E11D48",
    bgStart: "#FFF1F2",
    bgEnd: "#FECDD3",
    textColor: "#1C1917",
    buttonColor: "#DC2626",
    buttonTextColor: "#FFFFFF",
    font: "Inter",
  },
  post_card: {
    accent: "#8B5A2B",
    bgStart: "#F5F0E6",
    bgEnd: "#EBE3D5",
    textColor: "#8B5A2B",
    buttonColor: "#FDFBF7",
    buttonTextColor: "#8B5A2B",
    font: "Cormorant Garamond",
  },
  established: {
    accent: "#D4AF37",
    bgStart: "#EFEBE0",
    bgEnd: "#DCD5C6",
    textColor: "#3E2723",
    buttonColor: "#3E2723",
    buttonTextColor: "#D4AF37",
    font: "Playfair Display",
  },
  global: {
    accent: "#0052CC",
    bgStart: "#E8F0FE",
    bgEnd: "#D2E3FC",
    textColor: "#0052CC",
    buttonColor: "#0052CC",
    buttonTextColor: "#FFFFFF",
    font: "Outfit",
  },
  pixel: {
    accent: "#FF6B9D",
    bgStart: "#FFF0F5",
    bgEnd: "#FFE4EF",
    textColor: "#5C3D4F",
    buttonColor: "#FF85A8",
    buttonTextColor: "#FFFFFF",
    font: "Courier New, monospace",
  },
  wedding: {
    accent: "#C96F53",
    bgStart: "#FFF8F9",
    bgEnd: "#FADCE2",
    textColor: "#4A3F35",
    buttonColor: "#A68B67",
    buttonTextColor: "#FFFFFF",
    font: "Geist",
  },
  retro: {
    accent: "#A68B67",
    bgStart: "#FAF6ED",
    bgEnd: "#F3E8D0",
    textColor: "#4A3F35",
    buttonColor: "#A68B67",
    buttonTextColor: "#FFFFFF",
    font: "Geist",
  },
  minimalist: {
    accent: "#2C3A30",
    bgStart: "#F4F7F5",
    bgEnd: "#E3EAE6",
    textColor: "#2C3A30",
    buttonColor: "#2C3A30",
    buttonTextColor: "#FFFFFF",
    font: "Geist",
  },
  celebration: {
    accent: "#7C3AED",
    bgStart: "#1E1B4B",
    bgEnd: "#0F0E36",
    textColor: "#FFFFFF",
    buttonColor: "#7C3AED",
    buttonTextColor: "#FFFFFF",
    font: "Geist",
  },
  default: {
    accent: "#A68B67",
    bgStart: "#0C0A09",
    bgEnd: "#0C0A09",
    textColor: "#FFFFFF",
    buttonColor: "#A68B67",
    buttonTextColor: "#FFFFFF",
    font: "Geist",
  },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
}

export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const { r, g, b } = rgb;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function isLightColor(hex: string): boolean {
  return getLuminance(hex) > 0.55;
}

function withAlpha(hex: string, alphaHex: string): string {
  if (!hex.startsWith("#") || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

function getPresetFallback(preset?: string | null) {
  if (!preset) return PRESET_FALLBACKS.default;
  return PRESET_FALLBACKS[preset] ?? PRESET_FALLBACKS.default;
}

export function resolveKioskTheme(settings: KioskSettingsRaw | null | undefined): KioskTheme {
  const preset = settings?.kioskThemePreset || "default";
  const fallback = getPresetFallback(preset);

  const bgGradientStart =
    settings?.kioskBgGradientStart || fallback.bgStart;
  const bgGradientEnd =
    settings?.kioskBgGradientEnd || fallback.bgEnd;
  const accent = settings?.kioskAccentColor || fallback.accent;
  const buttonColor =
    settings?.kioskButtonColor ||
    settings?.kioskAccentColor ||
    fallback.buttonColor;
  const buttonTextColor =
    settings?.kioskButtonTextColor || fallback.buttonTextColor;
  const fontFamily = settings?.kioskFontFamily || fallback.font;

  const bgLumStart = getLuminance(bgGradientStart);
  const bgLumEnd = getLuminance(bgGradientEnd);
  const bgIsDark =
    Math.min(bgLumStart, bgLumEnd) < 0.45 ||
    (bgLumStart + bgLumEnd) / 2 < 0.45;

  const explicitText = settings?.kioskTextColor?.trim();
  const textColorHex =
    explicitText ||
    (bgIsDark ? "#FFFFFF" : fallback.textColor);

  const isLight = isLightColor(bgGradientStart) && !bgIsDark;

  const subtextColorHex = withAlpha(textColorHex, "b3");
  const dotColor = isLight ? "#4A3F35" : "#ffffff";
  const textIsLight = isLightColor(textColorHex);

  return {
    preset,
    accent,
    bgStyle: `linear-gradient(135deg, ${bgGradientStart}, ${bgGradientEnd})`,
    bgGradientStart,
    bgGradientEnd,
    textColorHex,
    subtextColorHex,
    textColorClass: textIsLight ? "text-stone-900" : "text-white",
    subtextColorClass: textIsLight ? "text-stone-600" : "text-stone-400",
    cardBgClass: isLight
      ? "bg-white/90 border-stone-200 shadow-md"
      : "bg-stone-950/60 border-stone-800",
    buttonColor,
    buttonTextColor,
    fontFamily,
    brandName: settings?.kioskBrandName || "DOVELENS PHOTOBOOTH",
    welcomeMessage:
      settings?.kioskWelcomeMessage || "Sentuh Layar untuk Mulai!",
    logoUrl: settings?.kioskLogoUrl || null,
    bgImageUrl: settings?.kioskBgImageUrl || null,
    bgImageOpacity: settings?.kioskBgImageOpacity ?? 1,
    showBgDots: settings?.kioskShowBgDots ?? true,
    showBrandName: settings?.kioskShowBrandName ?? true,
    showBrandSubtitle: settings?.kioskShowBrandSubtitle ?? false,
    brandSubtitle: settings?.kioskBrandSubtitle || "PART OF DOVELENS.FT",
    showLogo: settings?.kioskShowLogo ?? true,
    showWelcomeMessage: settings?.kioskShowWelcomeMessage ?? true,
    showPaymentHint: settings?.kioskShowPaymentHint ?? true,
    isLight,
    dotColor,
    surfaceBg: isLight ? "rgba(255,255,255,0.92)" : "rgba(12,10,9,0.88)",
    surfaceBorder: isLight ? "rgba(74,63,53,0.15)" : "rgba(255,255,255,0.1)",
    mutedText: subtextColorHex,
    headingColor: bgIsDark ? textColorHex : accent,
  };
}

export function primaryButtonStyle(theme: KioskTheme): CSSProperties {
  return {
    backgroundColor: theme.buttonColor,
    color: theme.buttonTextColor,
  };
}

export function accentButtonStyle(theme: KioskTheme): CSSProperties {
  return {
    backgroundColor: theme.accent,
    color: theme.buttonTextColor,
  };
}

export function surfaceStyle(theme: KioskTheme): CSSProperties {
  return {
    backgroundColor: theme.surfaceBg,
    borderColor: theme.surfaceBorder,
    color: theme.textColorHex,
  };
}

export function cardSurfaceStyle(theme: KioskTheme): CSSProperties {
  return {
    backgroundColor: theme.isLight
      ? "rgba(255,255,255,0.9)"
      : "rgba(12,10,9,0.6)",
    borderColor: theme.surfaceBorder,
    color: theme.textColorHex,
  };
}

export interface PresetCardStyle {
  className: string;
  fontClass: string;
  style: CSSProperties;
}

export interface PresetCardContentColors {
  text: string;
  muted: string;
  heading: string;
  accent: string;
}

export function getPresetCardContentColors(
  theme: KioskTheme,
  isActive: boolean,
): PresetCardContentColors {
  const card = getPresetCardStyle(theme, isActive);
  const cardText = (card.style.color as string) || theme.textColorHex;
  const filledPrimaryPresets = ["global", "established"];

  if (filledPrimaryPresets.includes(theme.preset)) {
    return {
      text: theme.buttonTextColor,
      muted: withAlpha(theme.buttonTextColor, "b3"),
      heading: theme.buttonTextColor,
      accent: theme.buttonTextColor,
    };
  }

  const cardBg = card.style.backgroundColor;
  const cardSurfaceLight =
    theme.isLight ||
    (typeof cardBg === "string" &&
      cardBg.startsWith("#") &&
      isLightColor(cardBg));

  // Pastel / light preset cards — keep body text dark (e.g. pop_art side panel).
  if (cardSurfaceLight) {
    return {
      text: theme.textColorHex,
      muted: theme.subtextColorHex,
      heading: theme.textColorHex,
      accent: theme.accent,
    };
  }

  if (!isLightColor(theme.buttonColor)) {
    return {
      text: isActive ? theme.buttonTextColor : cardText,
      muted: withAlpha(isActive ? theme.buttonTextColor : cardText, "b3"),
      heading: isActive ? theme.buttonTextColor : theme.accent,
      accent: isActive ? theme.buttonTextColor : theme.accent,
    };
  }

  return {
    text: cardText,
    muted: theme.subtextColorHex,
    heading: theme.accent,
    accent: theme.accent,
  };
}

function withAlphaHex(hex: string, alpha: number): string {
  if (!hex.startsWith("#") || hex.length !== 7) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

/** Card picker style per kioskThemePreset — selaras dengan admin getCardStyle(). */
export function getPresetCardStyle(
  theme: KioskTheme,
  isActive: boolean,
): PresetCardStyle {
  const base =
    "relative flex flex-col items-center gap-3 transition-all duration-300 p-4";
  const preset = theme.preset;
  const cardBg = theme.bgGradientStart;
  const inactiveBg = theme.isLight
    ? withAlphaHex(cardBg, 0.55)
    : `${cardBg}66`;

  switch (preset) {
    case "pop_art":
      return {
        className: `${base} border-[3px] rounded-xl ${
          isActive ? "scale-105 z-10" : "opacity-60 hover:opacity-100"
        }`,
        fontClass: "font-black uppercase tracking-wider",
        style: {
          backgroundColor: isActive ? cardBg : inactiveBg,
          borderColor: theme.textColorHex,
          color: isActive ? theme.accent : theme.textColorHex,
          boxShadow: isActive ? `4px 4px 0px 0px ${theme.accent}` : undefined,
        },
      };
    case "pixel":
      return {
        className: `${base} border-[2px] rounded-none ${
          isActive ? "scale-105 z-10" : "opacity-80 hover:opacity-100"
        }`,
        fontClass: "font-mono font-bold uppercase tracking-wider",
        style: {
          backgroundColor: isActive ? cardBg : inactiveBg,
          borderColor: theme.accent,
          color: theme.textColorHex,
          boxShadow: isActive ? `4px 4px 0px 0px ${theme.accent}` : undefined,
        },
      };
    case "post_card":
      return {
        className: `${base} border-[3px] rounded-none ${
          isActive ? "scale-105 z-10 shadow-lg" : "opacity-60 hover:opacity-100"
        }`,
        fontClass: "font-sans font-bold tracking-widest uppercase",
        style: {
          backgroundColor: isActive ? cardBg : inactiveBg,
          borderColor: theme.accent,
          borderStyle: isActive ? "solid" : "dashed",
          color: theme.accent,
        },
      };
    case "established":
      return {
        className: `${base} rounded-none border-2 ${
          isActive
            ? "scale-105 z-10 outline outline-1 outline-offset-2"
            : "opacity-60 hover:opacity-100"
        }`,
        fontClass: "font-sans font-bold tracking-widest uppercase",
        style: {
          backgroundColor: isActive ? theme.buttonColor : `${theme.buttonColor}66`,
          borderColor: theme.accent,
          color: theme.buttonTextColor,
          outlineColor: theme.buttonColor,
        },
      };
    case "global":
      return {
        className: `${base} border-[3px] rounded-[2rem] ${
          isActive ? "scale-105 z-10" : "opacity-60 hover:opacity-100"
        }`,
        fontClass: "font-black italic tracking-widest uppercase",
        style: {
          backgroundColor: isActive ? theme.buttonColor : `${theme.buttonColor}4d`,
          borderColor: "#ffffff",
          color: theme.buttonTextColor,
          boxShadow: isActive ? "4px 4px 0px 0px rgba(0,0,0,1)" : undefined,
        },
      };
    default:
      return {
        className: `${base} rounded-2xl border-2 ${
          isActive
            ? "scale-105 z-10 shadow-lg"
            : "border-dashed opacity-60 hover:opacity-100"
        }`,
        fontClass: "font-black tracking-wider uppercase",
        style: isActive
          ? {
              backgroundColor: theme.isLight
                ? "rgba(255,255,255,0.92)"
                : "rgba(255,255,255,0.12)",
              borderColor: theme.accent,
              color: theme.accent,
            }
          : {
              backgroundColor: theme.isLight
                ? "rgba(255,255,255,0.35)"
                : "rgba(255,255,255,0.06)",
              borderColor: theme.surfaceBorder,
              color: theme.subtextColorHex,
            },
      };
  }
}
