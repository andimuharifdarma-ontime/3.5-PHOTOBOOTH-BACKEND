"use client";

import { useKioskTheme } from "./KioskThemeProvider";

import React, { useState } from "react";
import { RotateCcw, Check, X } from "lucide-react";
import { KioskThemeButton } from "./KioskThemeButton";
import { KioskPresetCard } from "./KioskPresetCard";
import { cardSurfaceStyle } from "@/lib/kiosk/theme";
import { CheckCircle2 } from "lucide-react";

// Tipe data & props interface
interface SelectPhotosStepProps {
  selectedFrame: any;
  selectedPhotos: Record<number, any>;
  activeSlot: number;
  setActiveSlot: (slot: number) => void;
  capturedPhotos: any[];
  handleAssignPhotoToSlot: (photo: any) => void;
  handleRetakeAll: () => void;
  setStep: (step: any) => void;
  adminUrl: string;
  isLayoutMirrored: boolean;
  setIsLayoutMirrored: (mirrored: boolean) => void;
  setSelectedPhotos: React.Dispatch<React.SetStateAction<Record<number, any>>>;
}

export const SelectPhotosStep: React.FC<SelectPhotosStepProps> = ({
  selectedFrame,
  selectedPhotos,
  activeSlot,
  setActiveSlot,
  capturedPhotos,
  handleAssignPhotoToSlot,
  handleRetakeAll,
  setStep,
  adminUrl,
  isLayoutMirrored,
  setIsLayoutMirrored,
  setSelectedPhotos,
}) => {
  const theme = useKioskTheme();
  const panelStyle = cardSurfaceStyle(theme);
  const secondaryBtnBg = theme.isLight
    ? "rgba(74,63,53,0.08)"
    : "rgba(255,255,255,0.08)";
  const getFullImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    const base = adminUrl.endsWith("/") ? adminUrl.slice(0, -1) : adminUrl;
    const path = url.startsWith("/") ? url : "/" + url;
    return `${base}${path}`;
  };

  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, photo: any, source: 'gallery' | 'slot', sourceSlotIdx?: number) => {
    e.dataTransfer.setData("photo", JSON.stringify(photo));
    e.dataTransfer.setData("source", source);
    if (sourceSlotIdx !== undefined) {
      e.dataTransfer.setData("sourceSlotIdx", sourceSlotIdx.toString());
    }
  };

  const handleDropOnSlot = (e: React.DragEvent, targetSlotIdx: number) => {
    e.preventDefault();
    try {
      const photoStr = e.dataTransfer.getData("photo");
      const source = e.dataTransfer.getData("source");
      if (!photoStr) return;
      const photo = JSON.parse(photoStr);

      if (source === "gallery") {
        setSelectedPhotos((prev) => ({
          ...prev,
          [targetSlotIdx]: photo
        }));
      } else if (source === "slot") {
        const sourceSlotIdxStr = e.dataTransfer.getData("sourceSlotIdx");
        if (sourceSlotIdxStr !== null) {
          const sourceSlotIdx = parseInt(sourceSlotIdxStr, 10);
          if (sourceSlotIdx === targetSlotIdx) return;

          setSelectedPhotos((prev) => {
            const next = { ...prev };
            const temp = next[targetSlotIdx];
            if (next[sourceSlotIdx] !== undefined) {
              next[targetSlotIdx] = next[sourceSlotIdx];
            } else {
              delete next[targetSlotIdx];
            }
            if (temp !== undefined) {
              next[sourceSlotIdx] = temp;
            } else {
              delete next[sourceSlotIdx];
            }
            return next;
          });
        }
      }
    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  return (
    <div
      className={`w-full max-w-6xl px-6 flex flex-col md:flex-row gap-8 items-center `}
    >
      {/* Kiri: Kolase berbingkai interaktif */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-6">
          <h2
            className="text-2xl font-bold uppercase tracking-widest"
            style={{ color: theme.headingColor }}
          >
            Pilih Foto Terbaik Anda
          </h2>
          <p className="text-xs" style={{ color: theme.subtextColorHex }}>
            Klik slot bingkai, lalu pilih foto jepretan di panel kanan
          </p>
        </div>

        {/* Bingkai Mockup dengan Slot Klik */}
        <div className="relative p-6 bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl flex items-center justify-center h-[72vh] min-w-[300px]">
          {selectedFrame ? (
            <div 
              className="bg-stone-950 rounded-xl overflow-hidden border border-white/5 relative h-full"
              style={{
                aspectRatio: `${selectedFrame.outputWidth} / ${selectedFrame.outputHeight}`
              }}
            >
              {/* Image that drives the container width & height */}
              <img
                src={getFullImageUrl(selectedFrame.imageUrl)}
                className="w-full h-full object-fill z-0"
                alt="Frame Layout"
              />

              {/* Slots Overlay */}
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
                    const isActive = (activeSlot % maxSlots) === mappedIdx;
                    const isDragOver = dragOverSlot === mappedIdx;
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
                        onClick={() => setActiveSlot(mappedIdx)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverSlot(mappedIdx);
                        }}
                        onDragLeave={() => setDragOverSlot(null)}
                        onDrop={(e) => {
                          handleDropOnSlot(e, mappedIdx);
                          setDragOverSlot(null);
                        }}
                        draggable={!!assignedPhoto}
                        onDragStart={(e) => {
                          if (assignedPhoto) {
                            handleDragStart(e, assignedPhoto, "slot", mappedIdx);
                          }
                        }}
                        style={isActive ? { ...style, borderColor: theme.accent, backgroundColor: `${theme.accent}1a` } : style}
                        className={`absolute border-2 flex items-center justify-center overflow-hidden cursor-pointer transition ${
                          isDragOver
                            ? "border-green-500 bg-green-500/20 scale-105 z-40 shadow-2xl"
                            : isActive
                            ? "shadow-lg scale-102 z-30"
                            : assignedPhoto
                            ? "border-white/20 bg-stone-900 z-10"
                            : "border-stone-800 border-dashed bg-black/40 z-10"
                        }`}
                      >
                        {assignedPhoto ? (
                          <>
                            <img
                              src={`http://localhost:8000/photos/${assignedPhoto.filename}`}
                              className={`absolute inset-0 w-full h-full object-cover ${isLayoutMirrored ? "scale-x-[-1]" : ""}`}
                              alt={`Slot ${mappedIdx + 1}`}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPhotos((prev) => {
                                  const next = { ...prev };
                                  delete next[mappedIdx];
                                  return next;
                                });
                                setActiveSlot(mappedIdx);
                              }}
                              className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 z-30 transition flex items-center justify-center border border-white/20 shadow-md hover:scale-110 active:scale-90"
                              title="Batal pilih foto"
                            >
                              <X className="w-2 h-2 stroke-[3]" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-stone-500">Foto {mappedIdx + 1}</span>
                        )}
                        <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-bold text-white z-20">
                          #{mappedIdx + 1}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Overlay frame (only if overlay, to overlay on top of photos) */}
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

      {/* Kanan: Galeri Seluruh Tangkapan Foto */}
      <div
        className={`w-full md:w-[450px] p-6 rounded-3xl border flex flex-col justify-between max-h-[80vh] ${theme.cardBgClass}`}
        style={panelStyle}
      >
        <div>
          <h3
            className="font-bold text-sm mb-4 uppercase tracking-wider text-center border-b pb-3"
            style={{ borderColor: theme.surfaceBorder, color: theme.headingColor }}
          >
            Pilih Foto Untuk Slot #{(activeSlot % (selectedFrame?.maxSlots || 4)) + 1}
          </h3>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setIsLayoutMirrored(true)}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition cursor-pointer border ${
                isLayoutMirrored ? "shadow-lg" : "opacity-80 hover:opacity-100"
              }`}
              style={isLayoutMirrored ? { 
                backgroundColor: theme.buttonColor, 
                color: theme.buttonTextColor,
                borderColor: theme.surfaceBorder,
              } : {
                backgroundColor: theme.isLight ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.35)",
                color: theme.subtextColorHex,
                borderColor: theme.surfaceBorder,
              }}
            >
              Foto Mirror
            </button>
            <button
              onClick={() => setIsLayoutMirrored(false)}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition cursor-pointer border ${
                !isLayoutMirrored ? "shadow-lg" : "opacity-80 hover:opacity-100"
              }`}
              style={!isLayoutMirrored ? { 
                backgroundColor: theme.buttonColor, 
                color: theme.buttonTextColor,
                borderColor: theme.surfaceBorder,
              } : {
                backgroundColor: theme.isLight ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.35)",
                color: theme.subtextColorHex,
                borderColor: theme.surfaceBorder,
              }}
            >
              Foto Normal (Tidak Mirror)
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[40vh] p-1">
            {capturedPhotos.filter(Boolean).map((photo, index) => {
              const isAlreadyAssigned = Object.values(selectedPhotos).some(
                (p) => p.filename === photo.filename,
              );
              return (
                <KioskPresetCard
                  key={index}
                  theme={theme}
                  isActive={isAlreadyAssigned}
                  label={`TAKE #${index + 1}`}
                  className="!p-3 min-h-[120px]"
                  draggable={!isAlreadyAssigned}
                  onDragStart={(e) => handleDragStart(e, photo, "gallery")}
                  onClick={() => {
                    if (isAlreadyAssigned) {
                      const entry = Object.entries(selectedPhotos).find(
                        ([_, p]) => p.filename === photo.filename,
                      );
                      if (entry) {
                        const slotIdx = parseInt(entry[0], 10);
                        setSelectedPhotos((prev) => {
                          const next = { ...prev };
                          delete next[slotIdx];
                          return next;
                        });
                        setActiveSlot(slotIdx);
                      }
                    } else {
                      handleAssignPhotoToSlot(photo);
                    }
                  }}
                >
                  {isAlreadyAssigned && (
                    <CheckCircle2
                      className="absolute -top-2 -right-2 w-5 h-5 z-20 bg-white rounded-full"
                      style={{ color: theme.accent }}
                    />
                  )}
                  <div className="w-full aspect-[3/4] rounded-sm overflow-hidden relative flex items-center justify-center">
                    <img
                      src={`http://localhost:8000/photos/${photo.filename}`}
                      className="absolute inset-0 w-full h-full object-cover"
                      alt={`Shot ${index + 1}`}
                    />
                    {isAlreadyAssigned && (
                      <div className="absolute inset-0 bg-black/45 z-10" />
                    )}
                  </div>
                </KioskPresetCard>
              );
            })}
          </div>
        </div>

        {/* Aksi footer */}
        <div className="mt-8 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handleRetakeAll}
              className="flex-1 py-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 border"
              style={{
                backgroundColor: secondaryBtnBg,
                borderColor: theme.surfaceBorder,
                color: theme.textColorHex,
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ulang Foto</span>
            </button>
            <KioskThemeButton
              disabled={Object.keys(selectedPhotos).length < (selectedFrame?.maxSlots || 4)}
              onClick={() => setStep("FILTER")}
              isSmall
              icon={Check}
              text="Lanjut ke Filter"
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
