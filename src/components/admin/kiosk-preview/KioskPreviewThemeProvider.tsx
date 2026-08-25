"use client";

import React, { createContext, useContext, useMemo, type ReactNode } from "react";
import { resolveKioskPreviewTheme, type KioskSettingsRaw, type KioskPreviewTheme } from "@/lib/kiosk-preview-theme";

const KioskPreviewThemeContext = createContext<KioskPreviewTheme | null>(null);

interface KioskPreviewThemeProviderProps {
  settings: KioskSettingsRaw | null | undefined;
  children: ReactNode;
}

export function KioskPreviewThemeProvider({ settings, children }: KioskPreviewThemeProviderProps) {
  const theme = useMemo(() => resolveKioskPreviewTheme(settings), [settings]);

  return (
    <KioskPreviewThemeContext.Provider value={theme}>
      {theme.fontFamily && (
        <link
          href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.fontFamily)}:wght@400;700;900&display=swap`}
          rel="stylesheet"
        />
      )}
      {children}
    </KioskPreviewThemeContext.Provider>
  );
}

export function useKioskPreviewTheme(): KioskPreviewTheme {
  const theme = useContext(KioskPreviewThemeContext);
  if (!theme) return resolveKioskPreviewTheme(null);
  return theme;
}
