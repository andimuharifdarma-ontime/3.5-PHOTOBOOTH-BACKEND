"use client";

import { useKioskTheme } from "./KioskThemeProvider";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Sparkles, Home, Printer } from "lucide-react";
import { KioskThemeButton } from "./KioskThemeButton";
import { PrintQuantityModal } from "./PrintQuantityModal";
import { FilteredPhoto } from "./FilteredPhoto";

interface ReviewStepProps {
  selectedFrame: any;
  selectedPhotos: Record<number, any>;
  selectedFilter: string;
  isUploadingCloud: boolean;
  isPrinting: boolean;
  statusMessage: string;
  getShareUrl: () => string;
  handleGoHome: () => void;
  handlePrint: (qty?: number) => Promise<void>;
  adminUrl: string;
  localVideoUrl: string | null;
  localLiveUrl: string | null;
  isPaymentEnabled?: boolean;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  selectedFrame,
  selectedPhotos,
  selectedFilter,
  isUploadingCloud,
  isPrinting,
  statusMessage,
  getShareUrl,
  handleGoHome,
  handlePrint,
  adminUrl,
  localVideoUrl,
  localLiveUrl,
  isPaymentEnabled = true,
}) => {
  const theme = useKioskTheme();
  const [previewMode, setPreviewMode] = useState<"photo" | "gif" | "live">("photo");
  const [showQuantityModal, setShowQuantityModal] = useState(false);

  const getFullImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    const base = adminUrl.endsWith("/") ? adminUrl.slice(0, -1) : adminUrl;
    const path = url.startsWith("/") ? url : "/" + url;
    return `${base}${path}`;
  };

  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className={`w-full max-w-4xl px-6 flex flex-col md:flex-row gap-8 items-center `}
    >
      {/* Kiri: Pratinjau hasil kolase PNG final */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sesi Foto Selesai</span>
          </span>
          <h2 className="text-2xl font-bold">Hasil Karya Foto Anda</h2>
          <p className={`text-xs `}>Foto siap dikirim ke mesin printer</p>
        </div>

        {/* Bingkai Final Grid */}
        <div className="relative p-6 bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl flex items-center justify-center h-[72vh] min-w-[300px]">
          {selectedFrame ? (
            <div 
              className="bg-stone-950 rounded-xl overflow-hidden border border-white/5 relative h-full w-auto"
              style={{
                aspectRatio: `${selectedFrame.outputWidth} / ${selectedFrame.outputHeight}`
              }}
            >
              {/* Mode Foto (Static Frame Collage) atau Mode Live Photo (Dynamic HTML5 Videos) */}
              {(previewMode === "photo" || previewMode === "live") && (
                <>
                  {/* Background frame */}
                  {selectedFrame.framePosition === "background" && (
                    <img
                      src={getFullImageUrl(selectedFrame.imageUrl)}
                      className="absolute inset-0 w-full h-full object-fill z-0"
                      alt="Frame BG"
                    />
                  )}

                  {/* Slots */}
                  <div className="absolute inset-0 z-10">
                    {(() => {
                      let slots = [];
                      try {
                        slots = typeof selectedFrame.slots === "string"
                          ? JSON.parse(selectedFrame.slots)
                          : selectedFrame.slots;
                      } catch {
                        slots = selectedFrame.slots || [];
                      }

                        const maxSlots = selectedFrame?.maxSlots || 4;

                        return slots.map((slot: any, slotIdx: number) => {
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
                              {assignedPhoto && (
                                previewMode === "live" && assignedPhoto.live_photo ? (
                                  <FilteredPhoto
                                    src={`http://localhost:8000/photos/${assignedPhoto.live_photo}`}
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
                                    src={`http://localhost:8000/photos/${assignedPhoto.filename}`}
                                    filterId={selectedFilter}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    mirrored
                                    alt={`Slot ${mappedIdx + 1}`}
                                  />
                                )
                              )}
                            </div>
                          );
                        });
                    })()}
                  </div>

                  {/* Overlay frame */}
                  {selectedFrame.framePosition !== "background" && (
                    <img
                      src={getFullImageUrl(selectedFrame.imageUrl)}
                      className="absolute inset-0 w-full h-full object-fill z-20 pointer-events-none"
                      alt="Frame Overlay"
                    />
                  )}
                </>
              )}

              {/* Mode GIF (Looping MP4 Video) */}
              {previewMode === "gif" && (
                <div className="absolute inset-0 z-10 bg-stone-950 flex items-center justify-center">
                  {localVideoUrl ? (
                    <video
                      src={localVideoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div 
                        className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" 
                        style={{ borderColor: theme.accent, borderTopColor: "transparent" }}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Membuat GIF...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Toggles Pilihan Preview di Bawah Hasil Frame */}
        <div className="flex gap-2 mt-5 p-1 bg-black/40 border border-white/10 rounded-2xl backdrop-blur z-30">
          <button
            onClick={() => setPreviewMode("photo")}
            className={`px-6 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition ${
              previewMode === "photo"
                ? "text-stone-950 shadow-md scale-102"
                : "text-stone-400 hover:text-white hover:bg-white/5"
            }`}
            style={{
              backgroundColor: previewMode === "photo" ? theme.accent : "transparent"
            }}
          >
            Foto
          </button>
          <button
            onClick={() => setPreviewMode("gif")}
            className={`px-6 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition ${
              previewMode === "gif"
                ? "text-stone-950 shadow-md scale-102"
                : "text-stone-400 hover:text-white hover:bg-white/5"
            }`}
            style={{
              backgroundColor: previewMode === "gif" ? theme.accent : "transparent"
            }}
          >
            GIF
          </button>
          <button
            onClick={() => setPreviewMode("live")}
            className={`px-6 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition ${
              previewMode === "live"
                ? "text-stone-950 shadow-md scale-102"
                : "text-stone-400 hover:text-white hover:bg-white/5"
            }`}
            style={{
              backgroundColor: previewMode === "live" ? theme.accent : "transparent"
            }}
          >
            Live Photo
          </button>
        </div>
      </div>

      {/* Kanan: Aksi Cetak & Scan QR Code */}
      <div className={`w-full md:w-[450px] p-8 rounded-3xl border flex flex-col gap-6 ${theme.cardBgClass}`}>
        {/* Scan QR Box */}
        <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col items-center text-center">
          <div className="flex items-center justify-between w-full mb-3 border-b border-stone-850 pb-2">
            <h4 className="font-bold text-xs uppercase tracking-wider" style={{ color: theme.accent }}>Scan & Download HP</h4>
            <Sparkles className="w-4 h-4 animate-pulse" style={{ color: theme.accent }} />
          </div>

          <div className="bg-white p-2 rounded-xl border border-stone-850 mb-3 shadow-inner relative min-h-[140px] w-[140px] flex items-center justify-center">
            {isUploadingCloud ? (
              <div className="flex flex-col items-center gap-2 text-stone-600">
                <div className="w-6 h-6 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] font-bold">Uploading Cloud...</span>
              </div>
            ) : (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=${theme.accent.replace('#', '')}&data=${encodeURIComponent(
                  getShareUrl()
                )}`}
                className="w-32 h-32 object-contain"
                alt="Scan download QR Code"
              />
            )}
          </div>
          <p className="text-[9px] text-stone-400 uppercase tracking-widest leading-relaxed">
            Scan QR untuk mengunduh Foto, MP4 Loop & Live Photo ke Galeri HP
          </p>
        </div>

        {/* Status & Printer Action */}
        <div className="space-y-4">
          {statusMessage && (
            <p className="text-xs font-bold text-center animate-pulse" style={{ color: theme.accent }}>{statusMessage}</p>
          )}

          <div className="flex gap-2">
            <button
              disabled={isPrinting || isUploadingCloud}
              onClick={handleGoHome}
              className="flex-1 py-4 bg-stone-800 hover:bg-stone-750 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Home className="w-4 h-4" />
              <span>Sesi Selesai</span>
            </button>
            <KioskThemeButton
              disabled={isPrinting || isUploadingCloud}
              onClick={() => {
                if (isPaymentEnabled === false) {
                  setShowQuantityModal(true);
                } else {
                  handlePrint();
                }
              }}
              isSmall
              icon={isPrinting ? undefined : Printer}
              className="flex-1"
            >
              {isPrinting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Mencetak...
                </span>
              ) : (
                "Cetak Foto"
              )}
            </KioskThemeButton>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showQuantityModal && (
          <PrintQuantityModal
            isOpen={showQuantityModal}
            onClose={() => setShowQuantityModal(false)}
            onConfirm={(qty) => {
              setShowQuantityModal(false);
              handlePrint(qty);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
