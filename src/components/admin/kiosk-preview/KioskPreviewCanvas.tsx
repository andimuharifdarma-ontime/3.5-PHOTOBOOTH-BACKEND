"use client";

import React from "react";
import { KioskPreviewThemeProvider } from "./KioskPreviewThemeProvider";
import { LauncherScreen } from "./screens/LauncherScreen";
import { SelectFrameScreen } from "./screens/SelectFrameScreen";
import { CaptureScreen } from "./screens/CaptureScreen";
import { SelectPhotosScreen } from "./screens/SelectPhotosScreen";
import { FilterScreen } from "./screens/FilterScreen";
import { PaymentScreen } from "./screens/PaymentScreen";
import { DoneScreen } from "./screens/DoneScreen";
import type { KioskSettingsRaw } from "@/lib/kiosk-preview-theme";
import { resolveKioskPreviewTheme } from "@/lib/kiosk-preview-theme";

export type KioskPreviewScreen = "launcher" | "frame" | "shoot" | "select" | "filter" | "payment" | "print";

interface KioskPreviewCanvasProps {
  settings: KioskSettingsRaw & {
    isPaymentEnabled?: boolean;
    maxCapturePhotos?: number;
    resultTimer?: number;
    enabledFilters?: string[];
  };
  previewScreen: KioskPreviewScreen;
  themeDetails?: { name: string; frames: any[] } | null;
  currentScreenBg?: { url: string | null; opacity?: number };
}

export function KioskPreviewCanvas({
  settings,
  previewScreen,
  themeDetails,
  currentScreenBg,
}: KioskPreviewCanvasProps) {
  const theme = resolveKioskPreviewTheme(settings);

  return (
    <KioskPreviewThemeProvider settings={settings}>
      {/* Kiosk Screen Inner */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col select-none transition-all duration-300 z-10"
        style={{
          background: theme.bgStyle,
          fontFamily: theme.fontFamily,
          color: theme.textColorHex,
        }}
      >
        {/* Custom Screen Background Image */}
        {currentScreenBg?.url && (
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-500 z-0"
            style={{
              backgroundImage: `url(${currentScreenBg.url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: currentScreenBg.opacity ?? 1.0,
            }}
          />
        )}

        {/* Dot Pattern */}
        {(settings.kioskShowBgDots ?? true) && (
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none [background-size:24px_24px] z-0"
            style={{
              backgroundImage: `radial-gradient(${theme.dotColor} 1.5px, transparent 1.5px)`,
            }}
          />
        )}

        {/* Page label overlay */}
        <div className="absolute top-2 left-3 flex gap-2 z-30 opacity-60 hover:opacity-90 transition-opacity pointer-events-none">
          <span className="text-[6px] font-black uppercase tracking-widest bg-black/40 backdrop-blur-md text-white py-0.5 px-2 rounded-md border border-white/10">
            {previewScreen.toUpperCase()}
          </span>
        </div>

        {/* Screen Content */}
        <div className="relative flex-1 min-h-0 z-10">
          {previewScreen === "launcher" && (
            <LauncherScreen isPaymentEnabled={settings.isPaymentEnabled} />
          )}
          {previewScreen === "frame" && (
            <SelectFrameScreen themeDetails={themeDetails} />
          )}
          {previewScreen === "shoot" && (
            <CaptureScreen maxCapturePhotos={settings.maxCapturePhotos ?? 4} />
          )}
          {previewScreen === "select" && (
            <SelectPhotosScreen
              maxCapturePhotos={settings.maxCapturePhotos ?? 4}
              selectedFrame={themeDetails?.frames?.[0]}
            />
          )}
          {previewScreen === "filter" && (
            <FilterScreen enabledFilters={settings.enabledFilters} />
          )}
          {previewScreen === "payment" && settings.isPaymentEnabled && (
            <PaymentScreen />
          )}
          {previewScreen === "print" && (
            <DoneScreen resultTimer={settings.resultTimer ?? 60} />
          )}
        </div>
      </div>
    </KioskPreviewThemeProvider>
  );
}
