"use client";

import React from "react";
import { Camera, RotateCcw } from "lucide-react";
import { useKioskPreviewTheme } from "../KioskPreviewThemeProvider";
import { KioskPreviewButton } from "../KioskPreviewButton";
import { getPreviewCardStyle, getPreviewCardContentColors } from "@/lib/kiosk-preview-theme";

interface CaptureScreenProps {
  maxCapturePhotos?: number;
}

export function CaptureScreen({ maxCapturePhotos = 4 }: CaptureScreenProps) {
  const theme = useKioskPreviewTheme();
  const panelStyle = getPreviewCardStyle(theme, true);
  const panelColors = getPreviewCardContentColors(theme, true);

  const shots = Array.from({ length: maxCapturePhotos });
  const currentShot = 0; // preview shows "waiting for first shot"

  const viewerBg = theme.isLight ? "rgba(0,0,0,0.88)" : "rgba(12,10,9,0.95)";
  const slotTrackBg = theme.isLight ? `${theme.textColorHex}14` : "rgba(255,255,255,0.08)";
  const secondaryBtnBg = theme.isLight ? `${theme.bgGradientStart}cc` : "rgba(255,255,255,0.08)";

  return (
    <div
      className="w-full h-full flex gap-3 p-3 relative z-10 min-h-0"
      style={{ color: theme.textColorHex, fontFamily: theme.fontFamily }}
    >
      {/* Left: Camera Viewfinder */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div
          className="relative w-full h-full max-h-full aspect-[4/3] rounded-2xl border overflow-hidden shadow-2xl flex flex-col items-center justify-center"
          style={{ borderColor: theme.surfaceBorder, backgroundColor: viewerBg }}
        >
          {/* Corner markers */}
          {["-top-0 -left-0 border-t-2 border-l-2 rounded-tl-2xl", "-top-0 -right-0 border-t-2 border-r-2 rounded-tr-2xl",
            "-bottom-0 -left-0 border-b-2 border-l-2 rounded-bl-2xl", "-bottom-0 -right-0 border-b-2 border-r-2 rounded-br-2xl"].map((cls, i) => (
            <div key={i} className={`absolute w-6 h-6 ${cls}`} style={{ borderColor: theme.accent }} />
          ))}

          {/* Camera Placeholder */}
          <Camera className="w-10 h-10 mb-2 opacity-30" style={{ color: theme.textColorHex }} />
          <span className="text-[8px] font-bold uppercase tracking-widest opacity-50" style={{ color: theme.textColorHex }}>
            Live Camera
          </span>

          {/* Shot counter badge */}
          <div className="absolute top-2 left-2 px-2 py-1 rounded-md text-[7px] font-black tracking-widest uppercase"
            style={{ backgroundColor: `${theme.accent}33`, color: theme.accent, border: `1px solid ${theme.accent}66` }}>
            Foto {currentShot + 1} / {maxCapturePhotos}
          </div>

          {/* Countdown ring (mock at 0) */}
          <div className="absolute bottom-3 flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full border-[3px] flex items-center justify-center font-black text-sm"
              style={{ borderColor: theme.accent, color: theme.textColorHex }}>
              3
            </div>
            <span className="text-[7px] uppercase tracking-widest opacity-60">Berpose!</span>
          </div>
        </div>
      </div>

      {/* Right: Slot Panel */}
      <div className={`w-24 flex flex-col shrink-0 ${panelStyle.className}`} style={panelStyle.style}>
        <div className={`px-2 pt-2.5 pb-2 text-center text-[7px] uppercase tracking-widest border-b ${panelStyle.fontClass}`}
          style={{ color: panelColors.heading, borderColor: `${panelColors.text}33` }}>
          Sesi Foto
        </div>

        {/* Shot slots */}
        <div className="flex-1 flex flex-col gap-2 p-2 overflow-y-auto">
          {shots.map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-lg flex items-center justify-center text-[8px] font-black uppercase"
              style={{
                backgroundColor: i < currentShot ? theme.accent + "33" : slotTrackBg,
                border: `1px solid ${i === currentShot ? theme.accent : "transparent"}`,
                color: i < currentShot ? theme.accent : theme.subtextColorHex,
              }}
            >
              {i < currentShot ? "✓" : i === currentShot ? <Camera className="w-3 h-3" /> : i + 1}
            </div>
          ))}
        </div>

        {/* Retake button */}
        <div className="p-2 shrink-0">
          <div className="py-1.5 rounded-xl flex items-center justify-center gap-1 text-[7px] font-black uppercase tracking-wider cursor-default"
            style={{ backgroundColor: secondaryBtnBg, color: panelColors.text, border: `1px solid ${theme.surfaceBorder}` }}>
            <RotateCcw className="w-2.5 h-2.5" />
            Ulang
          </div>
        </div>
      </div>
    </div>
  );
}
