"use client";

import { useKioskTheme } from "./KioskThemeProvider";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, RotateCcw, Check } from "lucide-react";
import { KioskThemeButton } from "./KioskThemeButton";
import { getPresetCardStyle, getPresetCardContentColors } from "@/lib/kiosk/theme";

interface CaptureStepProps {
  isCaptureStarted: boolean;
  currentShotIndex: number;
  countdown: number | null;
  statusMessage: string;
  capturedPhotos: any[];
  kioskSettings: any;
  handleRetakeAll: () => void;
  previewPhoto: any | null;
  startCaptureFlow: () => void;
  savePhoto: () => void;
  discardPhoto: () => void;
  setStep?: (step: any) => void;
  setActiveSlot?: (slot: number) => void;
  handleSelectThumbnail?: (index: number) => void;
}

export const CaptureStep: React.FC<CaptureStepProps> = ({
  isCaptureStarted,
  currentShotIndex,
  countdown,
  statusMessage,
  capturedPhotos,
  kioskSettings,
  handleRetakeAll,
  previewPhoto,
  startCaptureFlow,
  savePhoto,
  discardPhoto,
  setStep,
  setActiveSlot,
  handleSelectThumbnail,
}) => {
  const theme = useKioskTheme();
  const panelStyle = getPresetCardStyle(theme, true);
  const panelColors = getPresetCardContentColors(theme, true);
  const maxShots = kioskSettings?.maxCapturePhotos || 8;
  const completedShotsCount = capturedPhotos.filter(Boolean).length;

  const viewerBg = theme.isLight ? "rgba(0,0,0,0.88)" : "rgba(12,10,9,0.95)";
  const slotTrackBg = theme.isLight
    ? `${theme.textColorHex}14`
    : "rgba(255,255,255,0.08)";
  const secondaryBtnBg = theme.isLight
    ? `${theme.bgGradientStart}cc`
    : "rgba(255,255,255,0.08)";
  const secondaryBtnText = panelColors.text;

  return (
    <motion.div
      key="capture"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full min-h-0 flex flex-col lg:flex-row items-stretch lg:items-start gap-4 lg:gap-5 p-4 lg:p-5"
      style={{ color: theme.textColorHex }}
    >
      <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center">
        <div
          className="relative w-full h-full min-h-[52vh] lg:min-h-0 lg:h-[calc(100vh-2.5rem)] lg:w-auto lg:max-w-[calc((100vh-2.5rem)*4/3)] aspect-[4/3] rounded-3xl border overflow-hidden shadow-2xl flex items-center justify-center"
          style={{
            backgroundColor: viewerBg,
            borderColor: theme.surfaceBorder,
          }}
        >
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-0"
          style={{ color: theme.subtextColorHex }}
        >
          <Camera className="w-16 h-16 animate-pulse mb-2" style={{ color: theme.accent }} />
          <span className="text-xs">Menghubungkan DSLR...</span>
        </div>

        {previewPhoto ? (
          <img
            src={`http://localhost:8000/photos/${previewPhoto.filename}`}
            alt="Preview Captured"
            className="absolute inset-0 w-full h-full object-cover z-10 animate-fadeIn"
          />
        ) : (
          <img
            src="http://localhost:8000/live-view"
            alt="Live View Stream"
            className="absolute inset-0 w-full h-full object-cover z-10"
            style={{ transform: "scaleX(-1)" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}

        <div
          className="absolute inset-0 z-20 pointer-events-none border-[16px] rounded-3xl"
          style={{ borderColor: `${theme.accent}44` }}
        />

        <AnimatePresence>
          {countdown !== null && (
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute z-30 font-black text-9xl text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
            >
              {countdown}
            </motion.div>
          )}
        </AnimatePresence>

        {statusMessage && (
          <div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 px-6 py-3 font-bold text-sm rounded-full shadow-lg animate-bounce"
            style={{
              backgroundColor: theme.accent,
              color: theme.buttonTextColor,
            }}
          >
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex gap-4 w-full max-w-md px-4 justify-center">
          {previewPhoto ? (
            <>
              <button
                onClick={discardPhoto}
                className="flex-1 py-3.5 px-6 rounded-2xl border font-bold uppercase text-xs tracking-widest transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: secondaryBtnBg,
                  borderColor: theme.surfaceBorder,
                  color: secondaryBtnText,
                }}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Foto Ulang</span>
              </button>
              <KioskThemeButton
                onClick={savePhoto}
                isSmall
                icon={Check}
                text="Simpan Foto"
                className="flex-1"
              />
            </>
          ) : (
            countdown === null &&
            (currentShotIndex >= maxShots ? (
              <KioskThemeButton
                onClick={() => {
                  if (setActiveSlot) setActiveSlot(0);
                  if (setStep) setStep("SELECT_PHOTOS");
                }}
                icon={Check}
                text="Lanjut ke Pilih Foto"
              />
            ) : (
              <KioskThemeButton
                onClick={startCaptureFlow}
                icon={Camera}
                text={`Ambil Foto (${currentShotIndex + 1}/${maxShots})`}
              />
            ))
          )}
        </div>
        </div>
      </div>

      <div
        className={`flex flex-col w-full lg:w-[300px] xl:w-[340px] shrink-0 h-fit self-stretch lg:self-start !items-stretch !scale-100 !p-0 !gap-0 ${panelStyle.className}`}
        style={panelStyle.style}
      >
        <div
          className="flex items-center gap-3 px-6 pt-5 pb-4 border-b"
          style={{ borderColor: `${panelColors.text}33` }}
        >
          <div
            className="p-2 border"
            style={{
              backgroundColor: theme.bgGradientStart,
              borderColor: panelColors.text,
              color: panelColors.accent,
              borderRadius:
                theme.preset === "pixel" || theme.preset === "post_card" ? 0 : "0.75rem",
            }}
          >
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3
              className={`text-base leading-tight uppercase tracking-wide ${panelStyle.fontClass}`}
              style={{ color: panelColors.heading }}
            >
              Sesi Memotret
            </h3>
            <p
              className="text-xs uppercase tracking-wider"
              style={{ color: panelColors.muted }}
            >
              Total: {maxShots}x jepretan
            </p>
          </div>
        </div>

        <div className="px-6 py-5 border-b" style={{ borderColor: `${panelColors.text}33` }}>
          <div
            className={`flex justify-between text-xs mb-2 uppercase tracking-wider ${panelStyle.fontClass}`}
          >
            <span style={{ color: panelColors.text }}>Progres Foto</span>
            <span style={{ color: panelColors.accent }}>
              {completedShotsCount} / {maxShots} Selesai
            </span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: maxShots }).map((_, idx) => (
              <div
                key={idx}
                className={`h-2 flex-1 transition-all duration-300 ${
                  theme.preset === "pixel" || theme.preset === "post_card"
                    ? "rounded-none"
                    : "rounded-full"
                } ${
                  idx === currentShotIndex && !capturedPhotos[idx]
                    ? "animate-pulse"
                    : ""
                }`}
                style={
                  capturedPhotos[idx]
                    ? {
                        backgroundColor: theme.accent,
                        boxShadow:
                          theme.preset === "pop_art"
                            ? `2px 2px 0 0 ${theme.textColorHex}`
                            : undefined,
                      }
                    : idx === currentShotIndex
                      ? { backgroundColor: `${theme.accent}88` }
                      : {
                          backgroundColor: slotTrackBg,
                          border: `1px solid ${theme.textColorHex}22`,
                        }
                }
              />
            ))}
          </div>
        </div>

        <div
          className="mx-6 my-5 p-4 border flex flex-wrap justify-center gap-2 shrink-0 max-h-[40vh] overflow-y-auto"
          style={{
            backgroundColor: theme.isLight
              ? "rgba(255,255,255,0.45)"
              : "rgba(0,0,0,0.2)",
            borderColor: panelColors.text,
            borderRadius:
              theme.preset === "pixel" || theme.preset === "post_card"
                ? 0
                : theme.preset === "global"
                  ? "1.5rem"
                  : "0.75rem",
          }}
        >
          {Array.from({ length: maxShots }).map((_, pIdx) => {
            const photo = capturedPhotos[pIdx];
            const isSlotActive = photo
              ? currentShotIndex === pIdx && !!previewPhoto
              : currentShotIndex === pIdx;
            const slotStyle = getPresetCardStyle(theme, isSlotActive);
            const slotColors = getPresetCardContentColors(theme, isSlotActive);

            return photo ? (
              <motion.div
                key={pIdx}
                onClick={() => {
                  if (handleSelectThumbnail) handleSelectThumbnail(pIdx);
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`relative w-16 h-16 overflow-hidden cursor-pointer transition hover:scale-105 active:scale-95 !p-0 !gap-0 ${slotStyle.className}`}
                style={slotStyle.style}
              >
                <img
                  src={`http://localhost:8000/photos/${photo.filename}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  alt={`Shot ${pIdx + 1}`}
                />
                <div
                  className={`absolute bottom-0.5 right-0.5 px-1 text-[8px] z-20 ${slotStyle.fontClass}`}
                  style={{
                    backgroundColor: panelColors.text,
                    color: theme.buttonTextColor,
                  }}
                >
                  #{pIdx + 1}
                </div>
              </motion.div>
            ) : (
              <div
                key={pIdx}
                className={`w-16 h-16 flex items-center justify-center text-[10px] !p-0 !gap-0 ${slotStyle.className}`}
                style={slotStyle.style}
              >
                <span className={slotStyle.fontClass} style={{ color: slotColors.text }}>
                  #{pIdx + 1}
                </span>
              </div>
            );
          })}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={handleRetakeAll}
            className={`w-full py-3.5 text-xs transition flex items-center justify-center gap-2 border-[2px] uppercase tracking-widest ${panelStyle.fontClass}`}
            style={{
              backgroundColor: secondaryBtnBg,
              borderColor: panelColors.text,
              color: panelColors.text,
              borderRadius:
                theme.preset === "pixel" || theme.preset === "post_card"
                  ? 0
                  : theme.preset === "global"
                    ? "1.5rem"
                    : "0.75rem",
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Foto Ulang Dari Awal</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
