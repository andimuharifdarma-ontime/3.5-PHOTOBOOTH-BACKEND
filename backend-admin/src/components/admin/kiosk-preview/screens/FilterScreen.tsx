"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { useKioskPreviewTheme } from "../KioskPreviewThemeProvider";
import { KioskPreviewButton } from "../KioskPreviewButton";

// Mirror of FILTER_NAMES from kiosk filters.ts
const FILTER_NAMES: Record<string, string> = {
  original: "Original",
  bw_classic: "B&W Classic",
  warm_sunset: "Warm Sunset",
  cool_morning: "Cool Morning",
  vintage_fade: "Vintage Fade",
  dramatic_contrast: "Dramatic",
  soft_pink: "Soft Pink",
  golden_hour: "Golden Hour",
  matte_film: "Matte Film",
  emerald_dream: "Emerald Dream",
  purple_haze: "Purple Haze",
  neon_lights: "Neon Lights",
};

interface FilterScreenProps {
  enabledFilters?: string[];
}

export function FilterScreen({ enabledFilters }: FilterScreenProps) {
  const theme = useKioskPreviewTheme();
  const [selectedFilter, setSelectedFilter] = useState("original");

  const visibleFilters = enabledFilters?.filter((f) => FILTER_NAMES[f]) ?? Object.keys(FILTER_NAMES);
  const panelBg = theme.isLight ? "rgba(255,255,255,0.9)" : "rgba(12,10,9,0.6)";
  const filterItemIdleBg = theme.isLight ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.25)";
  const filterItemActiveBg = theme.isLight ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.12)";
  const previewCanvasBg = theme.isLight ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.45)";

  return (
    <div
      className="w-full h-full flex gap-3 p-3 relative z-10 min-h-0"
      style={{ color: theme.textColorHex, fontFamily: theme.fontFamily }}
    >
      {/* Left: Filter List */}
      <div
        className="w-28 shrink-0 rounded-2xl border flex flex-col overflow-hidden"
        style={{ backgroundColor: panelBg, borderColor: theme.surfaceBorder }}
      >
        <div className="px-2 pt-3 pb-2 text-center text-[7px] uppercase tracking-widest font-black border-b"
          style={{ color: theme.headingColor, borderColor: theme.surfaceBorder }}>
          Filter
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
          {visibleFilters.slice(0, 10).map((filterId) => {
            const isActive = selectedFilter === filterId;
            return (
              <button
                key={filterId}
                onClick={() => setSelectedFilter(filterId)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all"
                style={{
                  backgroundColor: isActive ? filterItemActiveBg : filterItemIdleBg,
                  borderColor: isActive ? theme.accent : "transparent",
                  color: isActive ? theme.accent : theme.subtextColorHex,
                }}
              >
                {isActive && <Check className="w-2.5 h-2.5 shrink-0" />}
                <span className={`text-[7px] font-black uppercase tracking-wider truncate ${!isActive ? "ml-3.5" : ""}`}>
                  {FILTER_NAMES[filterId] ?? filterId}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Preview + Action */}
      <div className="flex-1 flex flex-col min-h-0 gap-2">
        {/* Title */}
        <div className="shrink-0">
          <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: theme.headingColor }}>
            Pilih Filter
          </h2>
          <p className="text-[7px] font-bold uppercase tracking-widest mt-0.5" style={{ color: theme.subtextColorHex }}>
            Filter aktif:{" "}
            <span className="font-extrabold" style={{ color: theme.accent }}>
              {FILTER_NAMES[selectedFilter] ?? selectedFilter}
            </span>
          </p>
        </div>

        {/* Preview Canvas */}
        <div className="flex-1 min-h-0 rounded-2xl border flex flex-col overflow-hidden"
          style={{ backgroundColor: previewCanvasBg, borderColor: theme.surfaceBorder }}>
          {/* Simulated photo grid with filter overlay */}
          <div className="flex-1 flex items-center justify-center relative">
            <div className="grid grid-cols-2 gap-2 p-4 w-full max-w-xs">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-lg flex items-center justify-center relative overflow-hidden"
                  style={{ backgroundColor: "rgba(128,128,128,0.25)" }}>
                  {/* Mock filter tint */}
                  <div className="absolute inset-0 rounded-lg opacity-40 mix-blend-multiply"
                    style={{ backgroundColor: selectedFilter === "original" ? "transparent" : theme.accent }} />
                  <span className="text-[7px] opacity-30 font-bold relative z-10" style={{ color: theme.textColorHex }}>
                    Foto {i + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* Filter name badge */}
            <div className="absolute top-2 right-2 px-2 py-1 rounded-md text-[7px] font-black uppercase tracking-widest"
              style={{ backgroundColor: `${theme.accent}33`, color: theme.accent, border: `1px solid ${theme.accent}66` }}>
              {FILTER_NAMES[selectedFilter] ?? selectedFilter}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 shrink-0">
          <div className="flex-1 py-1.5 rounded-full border text-[6px] font-black uppercase tracking-widest cursor-default text-center"
            style={{ borderColor: theme.surfaceBorder, color: theme.subtextColorHex, backgroundColor: theme.isLight ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.08)" }}>
            Kembali
          </div>
          <div className="flex-1">
            <KioskPreviewButton text="Lanjut ke Hasil" icon={Check} />
          </div>
        </div>
      </div>
    </div>
  );
}
