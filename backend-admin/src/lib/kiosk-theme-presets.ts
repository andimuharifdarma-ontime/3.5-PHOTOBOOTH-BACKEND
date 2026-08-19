export const KIOSK_THEME_PRESETS = [
  {
    id: "pop_art",
    name: "Pop Art Rocket",
    category: "Fun & Bold",
    recommendation: "Festival & Pop-up",
    accent: "#E11D48",
    bgStart: "#FFF1F2",
    bgEnd: "#FECDD3",
    font: "Inter",
    textColor: "#1C1917",
    buttonColor: "#DC2626",
    buttonTextColor: "#FFFFFF"
  },
  {
    id: "post_card",
    name: "Vintage Postcard",
    category: "Classic",
    recommendation: "Wedding & Outdoor",
    accent: "#8B5A2B",
    bgStart: "#F5F0E6",
    bgEnd: "#EBE3D5",
    font: "Cormorant Garamond",
    textColor: "#8B5A2B",
    buttonColor: "#FDFBF7",
    buttonTextColor: "#8B5A2B"
  },
  {
    id: "established",
    name: "Classic 1890",
    category: "Elegant",
    recommendation: "Formal & Gala",
    accent: "#D4AF37",
    bgStart: "#EFEBE0",
    bgEnd: "#DCD5C6",
    font: "Playfair Display",
    textColor: "#3E2723",
    buttonColor: "#3E2723",
    buttonTextColor: "#D4AF37"
  },
  {
    id: "global",
    name: "Y2K Global",
    category: "Modern",
    recommendation: "Tech & Corporate",
    accent: "#0052CC",
    bgStart: "#E8F0FE",
    bgEnd: "#D2E3FC",
    font: "Outfit",
    textColor: "#0052CC",
    buttonColor: "#0052CC",
    buttonTextColor: "#FFFFFF"
  },
  {
    id: "pixel",
    name: "Retro Pixel",
    category: "Retro",
    recommendation: "Arcade & Fun",
    accent: "#FF6B9D",
    bgStart: "#FFF0F5",
    bgEnd: "#FFE4EF",
    font: "Courier New, monospace",
    textColor: "#5C3D4F",
    buttonColor: "#FF85A8",
    buttonTextColor: "#FFFFFF"
  }
];

export const KIOSK_FONT_OPTIONS = [
  { value: "Geist", label: "Geist (Original Modern Sans)" },
  { value: "Inter", label: "Inter (Clean Minimalist Sans)" },
  { value: "Outfit", label: "Outfit (Trendy Rounded Sans)" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans (Contemporary Sans)" },
  { value: "Playfair Display", label: "Playfair Display (Classic Serif)" },
  { value: "Cinzel", label: "Cinzel (Royal Luxury Serif)" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond (High-End Serif)" },
  { value: "Montserrat", label: "Montserrat (Geometric Display Sans)" },
  { value: "Syne", label: "Syne (Artistic Contemporary Sans)" },
  { value: "Pacifico", label: "Pacifico (Fun Retro Handwriting)" },
  { value: "Great Vibes", label: "Great Vibes (Wedding Calligraphy Script)" },
  { value: "Dancing Script", label: "Dancing Script (Playful Script)" },
  { value: "Bebas Neue", label: "Bebas Neue (Bold Punchy Retro)" },
  { value: "DM Serif Display", label: "DM Serif Display (Elegant Editorial Serif)" },
  { value: "Cinzel Decorative", label: "Cinzel Decorative (Decorated Royal Serif)" },
  { value: "Space Grotesk", label: "Space Grotesk (Modern Artistic Grotesk)" }
] as const;

export type KioskPreviewScreen = "launcher" | "frame" | "payment" | "shoot" | "select" | "filter" | "print";

export function getKioskPreviewScreens(isPaymentEnabled: boolean): KioskPreviewScreen[] {
  return isPaymentEnabled
    ? ["launcher", "frame", "shoot", "select", "filter", "payment", "print"]
    : ["launcher", "frame", "shoot", "select", "filter", "print"];
}
