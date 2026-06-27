"use client";

import { useKioskTheme } from "./KioskThemeProvider";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { KioskThemeButton } from "./KioskThemeButton";
import { FilteredPhoto } from "./FilteredPhoto";
import {
  ALL_FILTER_IDS,
  FILTER_NAMES,
  normalizeEnabledFilters,
  prefetchFiltersForImage,
} from "@/lib/kiosk/filters";
import { cardSurfaceStyle } from "@/lib/kiosk/theme";

interface FilterStepProps {
  selectedFrame: any;
  selectedPhotos: Record<number, any>;
  selectedFilter: string;
  setSelectedFilter: (filter: string) => void;
  handleProceedToPayment: () => void;
  setStep: (step: any) => void;
  adminUrl: string;
  isLayoutMirrored: boolean;
  enabledFilters?: string[];
}

export const FilterStep: React.FC<FilterStepProps> = ({
  selectedFrame,
  selectedPhotos,
  selectedFilter,
  setSelectedFilter,
  handleProceedToPayment,
  setStep,
  adminUrl,
  isLayoutMirrored,
  enabledFilters: enabledFiltersProp,
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

  const enabledFilters = normalizeEnabledFilters(enabledFiltersProp);
  const visibleFilterKeys = ALL_FILTER_IDS.filter((key) =>
    enabledFilters.includes(key),
  );

  useEffect(() => {
    if (!visibleFilterKeys.includes(selectedFilter)) {
      setSelectedFilter(visibleFilterKeys[0] ?? "original");
    }
  }, [visibleFilterKeys, selectedFilter, setSelectedFilter]);

  const previewPhotoSrc = selectedPhotos[0]
    ? `http://localhost:8000/photos/${selectedPhotos[0].filename}`
    : "";

  useEffect(() => {
    if (!previewPhotoSrc || visibleFilterKeys.length === 0) return;
    void prefetchFiltersForImage(previewPhotoSrc, visibleFilterKeys);
  }, [previewPhotoSrc, visibleFilterKeys]);

  const previewCanvasBg = theme.isLight
    ? "rgba(0,0,0,0.06)"
    : "rgba(0,0,0,0.45)";
  const slotBg = theme.isLight ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.4)";
  const filterItemIdleBg = theme.isLight
    ? "rgba(0,0,0,0.04)"
    : "rgba(0,0,0,0.25)";
  const filterItemSelectedBg = theme.isLight
    ? "rgba(255,255,255,0.85)"
    : "rgba(255,255,255,0.1)";
  const thumbBg = theme.isLight ? "rgba(0,0,0,0.08)" : "rgba(12,10,9,0.9)";
  const backButtonBg = theme.isLight
    ? "rgba(74,63,53,0.08)"
    : "rgba(255,255,255,0.08)";

  return (
    <motion.div
      key="filter"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-6xl px-6 flex flex-col md:flex-row gap-8 items-center"
    >
      {/* Kiri: Kolase final dengan filter aktif */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-6">
          <h2
            className="text-2xl font-bold uppercase tracking-widest"
            style={{ color: theme.headingColor }}
          >
            Pilih Filter Artistik
          </h2>
          <p className="text-xs mt-1" style={{ color: theme.subtextColorHex }}>
            Percantik hasil cetak photobooth Anda
          </p>
        </div>

        {/* Bingkai dengan Live Filter */}
        <div
          className="relative p-6 rounded-3xl shadow-2xl border flex items-center justify-center h-[72vh] min-w-[300px]"
          style={panelStyle}
        >
          {selectedFrame ? (
            <div
              className="rounded-xl overflow-hidden border relative h-full"
              style={{
                aspectRatio: `${selectedFrame.outputWidth} / ${selectedFrame.outputHeight}`,
                backgroundColor: previewCanvasBg,
                borderColor: theme.surfaceBorder,
              }}
            >
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
                        style={{
                          ...style,
                          backgroundColor: slotBg,
                          borderColor: theme.surfaceBorder,
                        }}
                        className="absolute border flex items-center justify-center overflow-hidden z-10"
                      >
                        {assignedPhoto && (
                          <FilteredPhoto
                            src={`http://localhost:8000/photos/${assignedPhoto.filename}`}
                            filterId={selectedFilter}
                            className="absolute inset-0 w-full h-full object-cover"
                            mirrored={isLayoutMirrored}
                            alt={`Slot ${mappedIdx + 1}`}
                          />
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
            </div>
          ) : null}
        </div>
      </div>

      {/* Kanan: Opsi Pilihan Filter */}
      <div
        className={`w-full md:w-[450px] p-6 rounded-3xl border flex flex-col justify-between max-h-[80vh] ${theme.cardBgClass}`}
        style={panelStyle}
      >
        <div>
          <h3
            className="font-bold text-sm mb-4 uppercase tracking-wider text-center border-b pb-3"
            style={{ borderColor: theme.surfaceBorder, color: theme.accent }}
          >
            Pilihan Warna Filter
          </h3>
          {/* Grid filter */}
          <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[45vh] p-1">
            {visibleFilterKeys.map((filterKey) => {
              const isSelected = selectedFilter === filterKey;
              return (
                <div
                  key={filterKey}
                  onClick={() => setSelectedFilter(filterKey)}
                  className="p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5"
                  style={{
                    backgroundColor: isSelected ? filterItemSelectedBg : filterItemIdleBg,
                    borderColor: isSelected ? theme.accent : theme.surfaceBorder,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg overflow-hidden border relative"
                    style={{
                      backgroundColor: thumbBg,
                      borderColor: theme.surfaceBorder,
                    }}
                  >
                    {previewPhotoSrc && (
                      <FilteredPhoto
                        src={previewPhotoSrc}
                        filterId={filterKey}
                        className="w-full h-full object-cover"
                        mirrored={isLayoutMirrored}
                        alt="Filter preview"
                      />
                    )}
                  </div>
                  <span
                    className="text-[9px] font-bold tracking-tight truncate max-w-full block"
                    style={{ color: theme.textColorHex }}
                  >
                    {FILTER_NAMES[filterKey] ?? filterKey}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aksi footer */}
        <div className="mt-8 flex gap-2">
          <button
            onClick={() => setStep("SELECT_PHOTOS")}
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
            onClick={handleProceedToPayment}
            isSmall
            icon={Check}
            text="Selesai & Lanjut"
            className="flex-1"
          />
        </div>
      </div>
    </motion.div>
  );
};
