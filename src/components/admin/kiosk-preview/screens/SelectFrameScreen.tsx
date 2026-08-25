"use client";

import React, { useState } from "react";
import { Check, LayoutGrid } from "lucide-react";
import { useKioskPreviewTheme } from "../KioskPreviewThemeProvider";
import { KioskPreviewButton } from "../KioskPreviewButton";
import { getPreviewCardStyle, getPreviewCardContentColors } from "@/lib/kiosk-preview-theme";

interface SelectFrameScreenProps {
  themeDetails?: { name: string; frames: any[] } | null;
}

export function SelectFrameScreen({ themeDetails }: SelectFrameScreenProps) {
  const theme = useKioskPreviewTheme();
  const [activeFrame, setActiveFrame] = useState<any>(themeDetails?.frames?.[0] ?? null);

  const panelStyle = getPreviewCardStyle(theme, true);
  const panelColors = getPreviewCardContentColors(theme, true);

  const frames = themeDetails?.frames ?? [];

  return (
    <div
      className="w-full h-full flex flex-col relative z-10 p-4"
      style={{ color: theme.textColorHex, fontFamily: theme.fontFamily }}
    >
      {/* Title */}
      <div className="text-center mb-4 shrink-0 relative">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-px blur-[1px]"
          style={{ backgroundImage: `linear-gradient(to right, transparent, ${theme.accent}, transparent)` }} />
        <h2 className="text-base font-black uppercase tracking-widest" style={{ color: theme.headingColor }}>
          Pilih Layout Bingkai
        </h2>
        <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5" style={{ color: theme.subtextColorHex }}>
          Tema Aktif:{" "}
          <span className="font-extrabold" style={{ color: theme.headingColor }}>
            {themeDetails?.name ?? "—"}
          </span>
        </p>
      </div>

      {/* Body */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Frame Grid */}
        <div className="flex-1 grid grid-cols-3 gap-2 overflow-y-auto content-start">
          {frames.length > 0 ? (
            frames.map((frame: any) => {
              const isSelected = activeFrame?.id === frame.id;
              return (
                <button
                  key={frame.id}
                  onClick={() => setActiveFrame(frame)}
                  className={`relative flex flex-col items-center gap-1 rounded-xl border p-2 transition-all ${isSelected ? "ring-2" : "opacity-60 hover:opacity-90"}`}
                  style={{
                    borderColor: isSelected ? theme.accent : theme.surfaceBorder,
                    backgroundColor: isSelected ? (theme.isLight ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.08)") : (theme.isLight ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.04)"),
                    ringColor: theme.accent,
                  } as React.CSSProperties}
                >
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: theme.accent }}>
                      <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                    </div>
                  )}
                  <div className="w-full aspect-[2/3] rounded overflow-hidden flex items-center justify-center"
                    style={{ backgroundColor: theme.isLight ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.35)" }}>
                    {frame.previewUrl || frame.imageUrl ? (
                      <img src={frame.previewUrl || frame.imageUrl} className="max-h-full w-full object-contain" alt={frame.name} />
                    ) : (
                      <LayoutGrid className="w-4 h-4 opacity-30" style={{ color: theme.textColorHex }} />
                    )}
                  </div>
                  <span className="text-[7px] font-bold uppercase tracking-wider truncate w-full text-center" style={{ color: theme.subtextColorHex }}>
                    {frame.name || "Layout"}
                  </span>
                </button>
              );
            })
          ) : (
            // Placeholder grid when no frames available
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1 rounded-xl border p-2 opacity-30"
                style={{ borderColor: theme.surfaceBorder, borderStyle: "dashed" }}>
                <div className="w-full aspect-[2/3] rounded flex items-center justify-center"
                  style={{ backgroundColor: "rgba(128,128,128,0.15)" }}>
                  <LayoutGrid className="w-4 h-4" style={{ color: theme.subtextColorHex }} />
                </div>
                <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: theme.subtextColorHex }}>
                  Layout {i + 1}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Right Preview Panel */}
        <div className={`w-28 flex flex-col shrink-0 overflow-hidden ${panelStyle.className}`} style={panelStyle.style}>
          <h3 className={`px-2 pt-3 pb-2 text-center text-[7px] uppercase tracking-widest border-b ${panelStyle.fontClass}`}
            style={{ color: panelColors.heading, borderColor: `${panelColors.text}33` }}>
            Pratinjau
          </h3>
          <div className="flex-1 flex items-center justify-center p-2">
            {activeFrame ? (
              <img
                src={activeFrame.previewUrl || activeFrame.imageUrl}
                className="max-h-full w-full object-contain"
                alt="Preview"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center px-2" style={{ color: panelColors.muted }}>
                <span className={`text-[7px] uppercase tracking-widest ${panelStyle.fontClass}`}>Pilih Layout</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="flex gap-2 mt-3 shrink-0">
        <div className="px-4 py-2 rounded-full border text-[8px] font-black uppercase tracking-widest cursor-default"
          style={{ borderColor: theme.surfaceBorder, color: theme.subtextColorHex, backgroundColor: theme.isLight ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.08)" }}>
          Kembali
        </div>
        <div className="flex-1">
          <KioskPreviewButton text="Mulai Sesi Foto" icon={Check} disabled={!activeFrame} />
        </div>
      </div>
    </div>
  );
}
