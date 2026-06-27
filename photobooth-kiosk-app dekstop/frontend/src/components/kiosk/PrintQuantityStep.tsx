"use client";

import React from "react";
import { motion } from "framer-motion";
import { Minus, Plus, Printer } from "lucide-react";
import { useKioskTheme } from "./KioskThemeProvider";
import { KioskThemeButton } from "./KioskThemeButton";
import { FilteredPhoto } from "./FilteredPhoto";
import { cardSurfaceStyle } from "@/lib/kiosk/theme";
import { CAMERA_URL } from "@/lib/kiosk/config";

interface PrintQuantityStepProps {
  selectedFrame: any;
  selectedPhotos: Record<number, any>;
  selectedFilter: string;
  printQuantity: number;
  setPrintQuantity: (qty: number) => void;
  onConfirm: () => void;
  setStep: (step: any) => void;
  adminUrl: string;
  isLayoutMirrored: boolean;
  maxQuantity?: number;
}

export const PrintQuantityStep: React.FC<PrintQuantityStepProps> = ({
  selectedFrame,
  selectedPhotos,
  selectedFilter,
  printQuantity,
  setPrintQuantity,
  onConfirm,
  setStep,
  adminUrl,
  isLayoutMirrored,
  maxQuantity = 10,
}) => {
  const theme = useKioskTheme();
  const panelStyle = cardSurfaceStyle(theme);

  const getFullImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    const base = adminUrl.endsWith("/") ? adminUrl.slice(0, -1) : adminUrl;
    const path = url.startsWith("/") ? url : "/" + url;
    return `${base}${path}`;
  };

  const previewCanvasBg = theme.isLight
    ? "rgba(0,0,0,0.06)"
    : "rgba(0,0,0,0.45)";
  const slotBg = theme.isLight ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.4)";
  const backButtonBg = theme.isLight
    ? "rgba(74,63,53,0.08)"
    : "rgba(255,255,255,0.08)";

  let slots: any[] = [];
  try {
    slots =
      typeof selectedFrame?.slots === "string"
        ? JSON.parse(selectedFrame.slots)
        : selectedFrame?.slots || [];
  } catch {
    slots = selectedFrame?.slots || [];
  }

  const maxSlots = selectedFrame?.maxSlots || 4;

  const previewAspect = selectedFrame
    ? `${selectedFrame.outputWidth} / ${selectedFrame.outputHeight}`
    : "3 / 4";

  const previewFrameStyle = {
    aspectRatio: previewAspect,
    maxHeight: "min(58vh, 600px)",
    height: "min(58vh, 600px)",
    width: "auto" as const,
  };

  return (
    <motion.div
      key="print-quantity"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-5xl px-4 sm:px-6 flex flex-col md:flex-row gap-5 md:gap-7 items-center justify-center"
    >
      {/* Kiri: preview hasil photobooth */}
      <div className="flex-1 flex flex-col items-center min-w-0 w-full max-w-xl md:max-w-none">
        <div className="text-center mb-3">
          <h2
            className="text-lg sm:text-xl font-bold uppercase tracking-widest"
            style={{ color: theme.headingColor }}
          >
            Pratinjau Hasil
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: theme.subtextColorHex }}>
            Periksa foto sebelum mencetak
          </p>
        </div>

        <div
          className="relative p-3 sm:p-4 rounded-2xl shadow-lg border flex items-center justify-center w-full"
          style={panelStyle}
        >
          {selectedFrame ? (
            <div
              className="rounded-xl overflow-hidden border relative mx-auto"
              style={{
                ...previewFrameStyle,
                backgroundColor: previewCanvasBg,
                borderColor: theme.surfaceBorder,
              }}
            >
              {selectedFrame.framePosition === "background" && (
                <img
                  src={getFullImageUrl(selectedFrame.imageUrl)}
                  className="absolute inset-0 w-full h-full object-fill z-0"
                  alt="Frame BG"
                />
              )}

              <div className="absolute inset-0 z-10">
                {slots.map((slot: any, slotIdx: number) => {
                  const mappedIdx = slotIdx % maxSlots;
                  const assignedPhoto = selectedPhotos[mappedIdx];
                  const style = {
                    left: `${(slot.x || 0) * 100}%`,
                    top: `${(slot.y || 0) * 100}%`,
                    width: `${(slot.width || 0) * 100}%`,
                    height: `${(slot.height || 0) * 100}%`,
                    transform: `rotate(${slot.rotation || 0}deg)`,
                    borderRadius: `${(slot.borderRadius || 0) * 0.1}rem`,
                  };

                  return (
                    <div
                      key={slotIdx}
                      style={{
                        ...style,
                        backgroundColor: slotBg,
                        borderColor: theme.surfaceBorder,
                      }}
                      className="absolute border flex items-center justify-center overflow-hidden z-10"
                    >
                      {assignedPhoto && (
                        <FilteredPhoto
                          src={`${CAMERA_URL}/photos/${assignedPhoto.filename}`}
                          filterId={selectedFilter}
                          className="absolute inset-0 w-full h-full object-cover"
                          mirrored={isLayoutMirrored}
                          alt={`Slot ${mappedIdx + 1}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedFrame.framePosition !== "background" && (
                <img
                  src={getFullImageUrl(selectedFrame.imageUrl)}
                  className="absolute inset-0 w-full h-full object-fill z-20 pointer-events-none"
                  alt="Frame Overlay"
                />
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Kanan: jumlah cetak */}
      <div
        className={`w-full md:w-[320px] shrink-0 p-5 rounded-2xl border flex flex-col gap-4 ${theme.cardBgClass}`}
        style={panelStyle}
      >
        <div className="text-center space-y-2">
          <div
            className="w-11 h-11 rounded-xl border flex items-center justify-center mx-auto"
            style={{
              backgroundColor: `${theme.accent}1a`,
              borderColor: `${theme.accent}33`,
              color: theme.accent,
            }}
          >
            <Printer className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold tracking-tight">Jumlah Cetak</h3>
          <p className="text-[11px] leading-snug px-1" style={{ color: theme.subtextColorHex }}>
            Tentukan berapa lembar foto fisik yang ingin dicetak.
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 py-2">
          <button
            type="button"
            onClick={() => setPrintQuantity(Math.max(0, printQuantity - 1))}
            disabled={printQuantity <= 0}
            className="w-14 h-14 rounded-xl border flex items-center justify-center transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={panelStyle}
          >
            <Minus className="w-6 h-6" />
          </button>

          <div className="text-center min-w-[4rem]">
            <span className="text-4xl font-black tabular-nums leading-none">{printQuantity}</span>
            <p className="text-[9px] font-bold uppercase tracking-widest mt-1.5" style={{ color: theme.subtextColorHex }}>
              lembar
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPrintQuantity(Math.min(maxQuantity, printQuantity + 1))}
            disabled={printQuantity >= maxQuantity}
            className="w-14 h-14 rounded-xl border flex items-center justify-center transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={panelStyle}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {printQuantity === 0 && (
          <p className="text-center text-[10px] -mt-1" style={{ color: theme.subtextColorHex }}>
            Tanpa cetak fisik — foto digital tetap tersedia.
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setStep("FILTER")}
            className="flex-1 py-3.5 text-xs font-bold rounded-xl transition border"
            style={{
              backgroundColor: backButtonBg,
              borderColor: theme.surfaceBorder,
              color: theme.textColorHex,
            }}
          >
            Kembali
          </button>
          <KioskThemeButton
            onClick={onConfirm}
            isSmall
            icon={Printer}
            text={printQuantity > 0 ? "Lanjut Cetak" : "Lanjut Tanpa Cetak"}
            className="flex-1"
          />
        </div>
      </div>
    </motion.div>
  );
};
