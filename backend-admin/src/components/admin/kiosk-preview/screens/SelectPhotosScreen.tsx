"use client";

import React from "react";
import { CheckCircle2, RotateCcw, Image as ImageIcon } from "lucide-react";
import { useKioskPreviewTheme } from "../KioskPreviewThemeProvider";
import { KioskPreviewButton } from "../KioskPreviewButton";

interface SelectPhotosScreenProps {
  maxCapturePhotos?: number;
  selectedFrame?: any;
}

export function SelectPhotosScreen({ maxCapturePhotos = 4, selectedFrame }: SelectPhotosScreenProps) {
  const theme = useKioskPreviewTheme();

  const panelBg = theme.isLight ? "rgba(255,255,255,0.9)" : "rgba(12,10,9,0.6)";
  const secondaryBtnBg = theme.isLight ? "rgba(74,63,53,0.08)" : "rgba(255,255,255,0.08)";
  const photoBg = theme.isLight ? "rgba(0,0,0,0.07)" : "rgba(0,0,0,0.4)";
  const slotBg = theme.isLight ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.06)";

  // Mocked 6 captured photo placeholders
  const mockPhotos = Array.from({ length: Math.min(maxCapturePhotos, 6) });
  // Mocked slots from frame (default 3)
  const slotCount = selectedFrame?.slots?.length ?? 3;

  return (
    <div
      className="w-full h-full flex gap-3 p-3 relative z-10 min-h-0"
      style={{ color: theme.textColorHex, fontFamily: theme.fontFamily }}
    >
      {/* Left: Photo Gallery */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: theme.headingColor }}>
              Pilih Foto
            </h2>
            <p className="text-[7px] font-bold uppercase tracking-widest mt-0.5" style={{ color: theme.subtextColorHex }}>
              Pilih {slotCount} foto untuk bingkai
            </p>
          </div>
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-wider cursor-default"
            style={{ backgroundColor: secondaryBtnBg, color: theme.subtextColorHex, border: `1px solid ${theme.surfaceBorder}` }}
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Ulang Semua
          </div>
        </div>

        {/* Photo Grid */}
        <div className="flex-1 min-h-0 grid grid-cols-4 gap-2 content-start overflow-y-auto">
          {mockPhotos.map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-xl flex items-center justify-center relative cursor-default border"
              style={{ backgroundColor: photoBg, borderColor: theme.surfaceBorder }}
            >
              <ImageIcon className="w-5 h-5 opacity-20" style={{ color: theme.textColorHex }} />
              <span className="absolute bottom-1 right-1 text-[6px] font-bold uppercase opacity-40">
                Foto {i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Frame Preview with slots */}
      <div
        className="w-32 flex flex-col shrink-0 rounded-2xl border overflow-hidden"
        style={{ backgroundColor: panelBg, borderColor: theme.surfaceBorder }}
      >
        <div className="px-2 pt-3 pb-2 text-center text-[7px] uppercase tracking-widest font-black border-b"
          style={{ color: theme.headingColor, borderColor: theme.surfaceBorder }}>
          Pratinjau Frame
        </div>

        <div className="flex-1 flex items-center justify-center p-3">
          {selectedFrame?.previewUrl || selectedFrame?.imageUrl ? (
            <div className="relative w-full">
              <img
                src={selectedFrame.previewUrl || selectedFrame.imageUrl}
                className="w-full object-contain"
                alt="Frame"
              />
              {/* Slot overlays */}
              {(selectedFrame?.slots ?? []).map((_: any, i: number) => (
                <div key={i} className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded border-2 border-dashed text-[7px] font-black flex items-center justify-center"
                    style={{ borderColor: theme.accent, color: theme.accent, width: "60%", height: "25%", top: `${20 + i * 27}%`, position: "absolute" }}>
                    FOTO {i + 1}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full aspect-[2/3] rounded-xl flex flex-col items-center justify-center gap-2"
              style={{ backgroundColor: slotBg, borderColor: theme.surfaceBorder, border: "1px dashed" }}>
              {Array.from({ length: slotCount }).map((_, i) => (
                <div key={i} className="w-[80%] py-2 rounded border-2 border-dashed flex items-center justify-center text-[7px] font-black uppercase"
                  style={{ borderColor: theme.accent, color: theme.accent }}>
                  Foto {i + 1}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slot progress */}
        <div className="px-2 pb-3 shrink-0 text-center">
          <span className="text-[7px] font-black uppercase tracking-wider" style={{ color: theme.subtextColorHex }}>
            0 / {slotCount} terpilih
          </span>
        </div>
      </div>

      {/* Bottom floating confirm */}
      <div className="absolute bottom-3 left-3 right-3">
        <KioskPreviewButton text="Konfirmasi Pilihan" icon={CheckCircle2} disabled={true} />
      </div>
    </div>
  );
}
