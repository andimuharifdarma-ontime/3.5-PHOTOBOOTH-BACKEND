"use client";

import React from "react";
import { Flame } from "lucide-react";
import { useKioskPreviewTheme } from "../KioskPreviewThemeProvider";
import { KioskPreviewButton } from "../KioskPreviewButton";

export function LauncherScreen({ isPaymentEnabled }: { isPaymentEnabled?: boolean }) {
  const theme = useKioskPreviewTheme();
  const showPaymentHint = isPaymentEnabled && theme.showPaymentHint;

  return (
    <div
      className="h-full flex flex-col justify-between items-center text-center py-10 relative z-10"
      style={{ color: theme.textColorHex, fontFamily: theme.fontFamily }}
    >
      {/* Status top-right */}
      <div className="absolute top-0 right-0 flex items-center gap-2 opacity-80">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[7px] font-bold tracking-widest uppercase">Kiosk Online</span>
      </div>

      {/* Brand Header */}
      <div className="space-y-1.5 mt-4">
        {theme.showBrandName && (
          <h1 className="text-xl tracking-widest font-black uppercase" style={{ color: theme.accent }}>
            {theme.brandName}
          </h1>
        )}
        {theme.showBrandSubtitle && (
          <p className="text-[8px] tracking-[0.4em] uppercase font-bold" style={{ color: theme.subtextColorHex }}>
            {theme.brandSubtitle}
          </p>
        )}
      </div>

      {/* Central Logo / Icon */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {theme.showLogo ? (
          <div className="w-24 h-24 rounded-full flex items-center justify-center relative"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="absolute inset-2 rounded-full border border-dashed animate-spin"
              style={{ borderColor: "rgba(255,255,255,0.2)", animationDuration: "16s" }} />
            {theme.logoUrl ? (
              <img src={theme.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-full relative z-10" />
            ) : (
              <Flame className="w-8 h-8 relative z-10" style={{ color: theme.accent }} />
            )}
          </div>
        ) : (
          <div className="w-24 h-24 flex items-center justify-center opacity-20">
            <Flame className="w-10 h-10" style={{ color: theme.accent }} />
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="w-full max-w-xs space-y-3">
        {theme.showWelcomeMessage && (
          <p className="text-[10px] font-black tracking-widest uppercase opacity-90 animate-pulse">
            {theme.welcomeMessage}
          </p>
        )}
        {showPaymentHint && (
          <p className="text-[8px] tracking-wider uppercase" style={{ color: theme.subtextColorHex }}>
            Pembayaran dilakukan setelah memilih filter
          </p>
        )}
        <KioskPreviewButton text="Mulai Sesi Memotret" />
      </div>
    </div>
  );
}
