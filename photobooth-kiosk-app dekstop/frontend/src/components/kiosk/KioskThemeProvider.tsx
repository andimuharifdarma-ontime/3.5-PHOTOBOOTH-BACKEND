"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  resolveKioskTheme,
  type KioskSettingsRaw,
  type KioskTheme,
} from "@/lib/kiosk/theme";

const KioskThemeContext = createContext<KioskTheme | null>(null);

interface KioskThemeProviderProps {
  settings: KioskSettingsRaw | null | undefined;
  children: ReactNode;
}

export function KioskThemeProvider({
  settings,
  children,
}: KioskThemeProviderProps) {
  const theme = useMemo(() => resolveKioskTheme(settings), [settings]);

  useEffect(() => {
    if (theme.brandName) {
      document.title = theme.brandName;
    }
  }, [theme.brandName]);

  const cssVars = useMemo(
    () =>
      ({
        "--kiosk-accent": theme.accent,
        "--kiosk-button": theme.buttonColor,
        "--kiosk-button-text": theme.buttonTextColor,
        "--kiosk-text": theme.textColorHex,
        "--kiosk-subtext": theme.subtextColorHex,
        "--kiosk-bg": theme.bgStyle,
        "--kiosk-font": theme.fontFamily,
        "--kiosk-surface": theme.surfaceBg,
        "--kiosk-surface-border": theme.surfaceBorder,
      }) as React.CSSProperties,
    [theme]
  );

  return (
    <KioskThemeContext.Provider value={theme}>
      {theme.fontFamily && (
        <link
          href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.fontFamily)}:wght@400;700;900&display=swap`}
          rel="stylesheet"
        />
      )}
      <div className="kiosk-theme-root contents" style={cssVars}>
        {children}
      </div>
    </KioskThemeContext.Provider>
  );
}

export function useKioskTheme(): KioskTheme {
  const theme = useContext(KioskThemeContext);
  if (!theme) {
    return resolveKioskTheme(null);
  }
  return theme;
}
