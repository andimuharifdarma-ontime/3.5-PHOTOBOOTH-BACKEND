"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Home, Printer } from "lucide-react";
import { useKioskTheme } from "./KioskThemeProvider";
import { cardSurfaceStyle } from "@/lib/kiosk/theme";
import { KioskThemeButton } from "./KioskThemeButton";
import { FilteredPhoto } from "./FilteredPhoto";
import { CAMERA_URL } from "@/lib/kiosk/config";
import {
  countUploadProgress,
  type PrintStatus,
  type UploadItem,
  type UploadPhase,
} from "@/lib/kiosk/upload";

interface DoneStepProps {
  uploadPhase: UploadPhase;
  uploadItems: UploadItem[];
  uploadError?: string;
  previewUrl: string | null;
  localVideoUrl: string | null;
  localLiveUrl: string | null;
  selectedFrame: any;
  selectedPhotos: Record<number, any>;
  selectedFilter: string;
  adminUrl: string;
  printStatus: PrintStatus;
  printQuantity: number;
  getShareUrl: () => string;
  handleGoHome: () => void;
  onRetryPrint?: () => void;
}

type PreviewMode = "photo" | "gif" | "live";

export const DoneStep: React.FC<DoneStepProps> = ({
  uploadPhase,
  uploadItems,
  uploadError,
  previewUrl,
  localVideoUrl,
  localLiveUrl,
  selectedFrame,
  selectedPhotos,
  selectedFilter,
  adminUrl,
  printStatus,
  printQuantity,
  getShareUrl,
  handleGoHome,
  onRetryPrint,
}) => {
  const theme = useKioskTheme();
  const [previewMode, setPreviewMode] = useState<PreviewMode>("photo");
  const livePreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (previewMode !== "live") return;
    const el = livePreviewRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => {});
  }, [previewMode, localLiveUrl]);
  const { total, completed } = countUploadProgress(uploadItems);
  const isComplete = uploadPhase === "complete";
  const isBusy = uploadPhase === "compiling" || uploadPhase === "uploading";

  const progressPct = isComplete
    ? 100
    : uploadPhase === "compiling"
      ? 12
      : total > 0
        ? Math.round((completed / total) * 100)
        : 5;

  const heading = isComplete
    ? "Foto Sedang Dicetak!"
    : uploadPhase === "compiling"
      ? "Menyiapkan Foto..."
      : uploadPhase === "error"
        ? "Upload Bermasalah"
        : "Mengupload ke Cloud...";

  const subtext = isComplete
    ? `Silakan ambil hasil cetakan kertas foto Anda di printer. Terima kasih telah menggunakan layanan ${theme.brandName}.`
    : uploadPhase === "compiling"
      ? "Mengompilasi hasil foto sebelum dikirim ke galeri cloud."
      : uploadPhase === "error"
        ? uploadError ||
          "Beberapa file gagal diupload. Tunggu sebentar atau selesaikan sesi jika QR sudah muncul."
        : "Mohon tunggu — file sedang diunggah ke cloud.";

  const getFullImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    const base = adminUrl.endsWith("/") ? adminUrl.slice(0, -1) : adminUrl;
    const path = url.startsWith("/") ? url : "/" + url;
    return `${base}${path}`;
  };

  const parseSlots = () => {
    if (!selectedFrame) return [];
    try {
      return typeof selectedFrame.slots === "string"
        ? JSON.parse(selectedFrame.slots)
        : selectedFrame.slots || [];
    } catch {
      return selectedFrame.slots || [];
    }
  };

  const renderFrameCollage = (mode: "photo" | "live") => {
    const slots = parseSlots();
    const maxSlots = selectedFrame?.maxSlots || 4;

    return (
      <>
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
                style={style}
                className="absolute border border-white/10 flex items-center justify-center overflow-hidden bg-black/40 z-10"
              >
                {assignedPhoto &&
                  (mode === "live" && assignedPhoto.live_photo ? (
                    <FilteredPhoto
                      src={`${CAMERA_URL}/photos/${assignedPhoto.live_photo}`}
                      filterId={selectedFilter}
                      isVideo
                      className="absolute inset-0 w-full h-full object-cover"
                      mirrored
                      videoProps={{
                        autoPlay: true,
                        loop: false,
                        muted: true,
                        playsInline: true,
                      }}
                    />
                  ) : (
                    <FilteredPhoto
                      src={`${CAMERA_URL}/photos/${assignedPhoto.filename}`}
                      filterId={selectedFilter}
                      className="absolute inset-0 w-full h-full object-cover"
                      mirrored
                      alt={`Slot ${mappedIdx + 1}`}
                    />
                  ))}
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
      </>
    );
  };

  const renderPreviewContent = () => {
    if (previewMode === "photo") {
      if (previewUrl) {
        return (
          <img
            src={previewUrl}
            alt="Hasil foto"
            className="absolute inset-0 w-full h-full object-contain bg-stone-950"
          />
        );
      }
      if (selectedFrame) {
        return (
          <div className="absolute inset-0">{renderFrameCollage("photo")}</div>
        );
      }
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-stone-500">
          <div
            className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: theme.accent, borderTopColor: "transparent" }}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Menyiapkan foto...
          </span>
        </div>
      );
    }

    if (previewMode === "gif") {
      if (localVideoUrl) {
        return (
          <video
            src={localVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        );
      }
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-stone-500">
          <div
            className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: theme.accent, borderTopColor: "transparent" }}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Membuat GIF...
          </span>
        </div>
      );
    }

    if (localLiveUrl) {
      return (
        <video
          ref={livePreviewRef}
          src={localLiveUrl}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-contain bg-stone-950"
        />
      );
    }
    if (selectedFrame) {
      return (
        <div className="absolute inset-0">{renderFrameCollage("live")}</div>
      );
    }
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-stone-500">
        <div
          className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: theme.accent, borderTopColor: "transparent" }}
        />
        <span className="text-[10px] font-bold uppercase tracking-widest">
          Membuat Live Photo...
        </span>
      </div>
    );
  };

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
      key="done"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-5xl px-4 sm:px-6 flex flex-col lg:flex-row gap-5 lg:gap-7 items-center justify-center"
      style={{ color: theme.textColorHex }}
    >
      {/* Kiri: Preview hasil */}
      <div className="flex-1 flex flex-col items-center w-full min-w-0 max-w-xl lg:max-w-none">
        <p
          className="text-[11px] font-black uppercase tracking-[0.3em] mb-3"
          style={{ color: theme.accent }}
        >
          Pratinjau Hasil
        </p>

        <div
          className="relative w-full flex items-center justify-center p-3 sm:p-4 rounded-2xl border shadow-lg"
          style={cardSurfaceStyle(theme)}
        >
          <div
            className="relative bg-stone-950 rounded-xl overflow-hidden border border-white/10 mx-auto"
            style={previewFrameStyle}
          >
            {renderPreviewContent()}
          </div>
        </div>

        <div
          className="flex gap-2 mt-3 p-1 rounded-xl border backdrop-blur-sm w-full max-w-sm justify-center"
          style={{
            borderColor: theme.surfaceBorder,
            backgroundColor: theme.isLight ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.25)",
          }}
        >
          {(["photo", "gif", "live"] as PreviewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPreviewMode(mode)}
              className={`flex-1 px-3 py-2 text-[11px] font-black uppercase tracking-wide rounded-lg transition ${
                previewMode === mode
                  ? "shadow-sm"
                  : "opacity-60 hover:opacity-100"
              }`}
              style={{
                backgroundColor: previewMode === mode ? theme.accent : "transparent",
                color: previewMode === mode ? (theme.isLight ? "#fff" : "#0c0a09") : theme.textColorHex,
              }}
            >
              {mode === "photo" ? "Foto" : mode === "gif" ? "GIF" : "Live Photo"}
            </button>
          ))}
        </div>
      </div>

      {/* Kanan: status, QR & selesai */}
      <div
        className="w-full lg:w-[320px] shrink-0 p-5 rounded-2xl border flex flex-col gap-4 text-center"
        style={cardSurfaceStyle(theme)}
      >
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-12 h-12 rounded-full border flex items-center justify-center"
            style={{
              backgroundColor: `${theme.accent}15`,
              borderColor: `${theme.accent}33`,
              color: theme.accent,
            }}
          >
            <Printer className={`w-5 h-5 ${isBusy ? "animate-pulse" : "animate-bounce"}`} />
          </div>
          <h2 className="text-xl font-black leading-tight">{heading}</h2>
          <p className="text-xs leading-relaxed" style={{ color: theme.subtextColorHex }}>
            {subtext}
          </p>
        </div>

        {isBusy && (
          <div className="w-full">
            <div
              className="h-1.5 rounded-full overflow-hidden mb-1.5"
              style={{ backgroundColor: theme.isLight ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.3)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: theme.accent }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(progressPct, 8)}%` }}
                transition={{ duration: 0.35 }}
              />
            </div>
            <p
              className="text-[9px] uppercase tracking-widest font-bold"
              style={{ color: theme.subtextColorHex }}
            >
              {progressPct}%
            </p>
          </div>
        )}

        {printQuantity > 0 && printStatus === "error" && onRetryPrint && (
          <button
            type="button"
            onClick={onRetryPrint}
            className="text-[11px] font-bold underline opacity-80 hover:opacity-100 -my-1"
            style={{ color: theme.accent }}
          >
            Cetak ulang
          </button>
        )}

        <div
          className="p-4 rounded-xl border flex flex-col items-center w-full"
          style={{
            borderColor: theme.surfaceBorder,
            backgroundColor: theme.isLight ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.2)",
          }}
        >
          <div className="bg-white p-1.5 rounded-lg border border-stone-200 mb-2 shadow-inner min-h-[120px] w-[120px] flex items-center justify-center">
            {isBusy ? (
              <div className="flex flex-col items-center gap-1.5 text-stone-600">
                <div
                  className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: theme.accent, borderTopColor: "transparent" }}
                />
                <span className="text-[8px] font-bold uppercase tracking-wide">
                  Uploading...
                </span>
              </div>
            ) : (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=${theme.accent.replace("#", "")}&data=${encodeURIComponent(getShareUrl())}`}
                className="w-24 h-24 object-contain"
                alt="Scan download QR Code"
              />
            )}
          </div>
          <p
            className="text-[8px] uppercase tracking-widest font-black"
            style={{ color: theme.subtextColorHex }}
          >
            Scan QR HP untuk Unduhan File
          </p>
        </div>

        <KioskThemeButton
          onClick={handleGoHome}
          isSmall
          icon={Home}
          text="Selesaikan Sesi"
          fullWidth
          disabled={uploadPhase === "compiling" || uploadPhase === "uploading"}
        />
      </div>
    </motion.div>
  );
};
