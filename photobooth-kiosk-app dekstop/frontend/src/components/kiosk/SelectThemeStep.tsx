"use client";

import { useKioskTheme } from "./KioskThemeProvider";

import React from "react";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import {
  cardSurfaceStyle,
  getPresetCardContentColors,
  getPresetCardStyle,
} from "@/lib/kiosk/theme";

interface SelectThemeStepProps {
  themes: any[];
  setSelectedTheme: (theme: any) => void;
  setSelectedFrame: (frame: any) => void;
  setStep: (step: any) => void;
  adminUrl: string;
  isPaymentEnabled?: boolean;
}

/** Preset shell tanpa scale/hover — untuk grid kartu tema portrait. */
function themeCardShellClass(className: string) {
  return className
    .replace(/\s*scale-105\s*/g, " ")
    .replace(/\s*z-10\s*/g, " ")
    .replace(/\s*hover:\S+/g, "")
    .trim();
}

export const SelectThemeStep: React.FC<SelectThemeStepProps> = ({
  themes,
  setSelectedTheme,
  setSelectedFrame,
  setStep,
  adminUrl,
  isPaymentEnabled = true,
}) => {
  const kioskTheme = useKioskTheme();
  const panelStyle = cardSurfaceStyle(kioskTheme);
  const cardColors = getPresetCardContentColors(kioskTheme, true);
  const cardPreset = getPresetCardStyle(kioskTheme, true);
  const cardShellClass = themeCardShellClass(cardPreset.className);

  const getFullImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    const base = adminUrl.endsWith("/") ? adminUrl.slice(0, -1) : adminUrl;
    const path = url.startsWith("/") ? url : "/" + url;
    return `${base}${path}`;
  };

  const backButtonStyle = {
    backgroundColor: kioskTheme.isLight
      ? "rgba(255,255,255,0.92)"
      : "rgba(255,255,255,0.08)",
    borderColor: kioskTheme.surfaceBorder,
    color: kioskTheme.textColorHex,
  };

  return (
    <motion.div
      key="select_theme"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-5xl px-8 flex flex-col items-center"
      style={{ color: kioskTheme.textColorHex }}
    >
      <div className="text-center mb-12 relative">
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2 w-24 h-[2px] blur-[1px]"
          style={{
            backgroundImage: `linear-gradient(to right, transparent, ${kioskTheme.accent}, transparent)`,
          }}
        />
        <h2
          className="text-4xl font-black uppercase tracking-widest mb-3"
          style={{ color: kioskTheme.headingColor }}
        >
          Pilih Tema Studio
        </h2>
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: kioskTheme.subtextColorHex }}
        >
          Kurasi suasana unik untuk setiap momen berharga Anda
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-14">
        {themes.length === 0 ? (
          <div
            className="col-span-3 text-center py-16 border border-dashed rounded-3xl font-bold"
            style={{
              ...panelStyle,
              color: kioskTheme.subtextColorHex,
            }}
          >
            Belum ada Tema bingkai aktif di database.
          </div>
        ) : (
          themes.map((studioTheme) => {
            const previewUrl =
              studioTheme.previewUrl ||
              studioTheme.frames?.[0]?.previewUrl ||
              studioTheme.frames?.[0]?.imageUrl;

            return (
              <div
                key={studioTheme.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedTheme(studioTheme);
                  if (studioTheme.frames && studioTheme.frames.length > 0) {
                    setSelectedFrame(studioTheme.frames[0]);
                  }
                  setStep("SELECT_FRAME");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedTheme(studioTheme);
                    if (studioTheme.frames?.length > 0) {
                      setSelectedFrame(studioTheme.frames[0]);
                    }
                    setStep("SELECT_FRAME");
                  }
                }}
                className={`relative flex flex-col overflow-hidden cursor-pointer w-full !items-stretch !p-0 !gap-0 ${cardShellClass}`}
                style={cardPreset.style}
              >
                {/* Atas — preview besar (bentuk gambar 2) */}
                <div
                  className="relative aspect-[4/5] w-full overflow-hidden flex items-center justify-center border-b"
                  style={{
                    borderColor: `${cardColors.text}33`,
                    backgroundColor: kioskTheme.isLight
                      ? "rgba(255,255,255,0.35)"
                      : "rgba(0,0,0,0.2)",
                  }}
                >
                  {previewUrl ? (
                    <img
                      src={getFullImageUrl(previewUrl)}
                      alt={studioTheme.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex flex-col items-center justify-center p-6"
                      style={{ color: cardColors.accent }}
                    >
                      <Layers className="w-12 h-12 mb-3 stroke-[1.5]" />
                      <span
                        className={`text-[9px] uppercase tracking-wider ${cardPreset.fontClass}`}
                      >
                        No Preview Image
                      </span>
                    </div>
                  )}

                  {studioTheme.tag ? (
                    <span
                      className={`absolute top-4 right-4 px-3 py-1 font-black uppercase text-[9px] tracking-widest rounded-full shadow ${cardPreset.fontClass}`}
                      style={{
                        backgroundColor: kioskTheme.accent,
                        color: kioskTheme.buttonTextColor,
                      }}
                    >
                      {studioTheme.tag}
                    </span>
                  ) : null}
                </div>

                {/* Bawah — judul, deskripsi, aksi (bentuk gambar 2 + warna preset gambar 1) */}
                <div className="p-6 flex flex-col flex-1 relative z-10 w-full">
                  <h3
                    className={`text-xl tracking-wide mb-2 ${cardPreset.fontClass}`}
                    style={{ color: cardColors.heading }}
                  >
                    {studioTheme.name}
                  </h3>
                  <p
                    className="text-xs leading-relaxed font-medium flex-1"
                    style={{ color: cardColors.muted }}
                  >
                    {studioTheme.description ||
                      "Rasakan pengalaman foto premium dengan tema kolase khusus kami."}
                  </p>

                  <div
                    className="mt-5 pt-4 border-t flex items-center justify-between"
                    style={{ borderColor: `${cardColors.text}33` }}
                  >
                    <span
                      className={`text-sm tracking-wide ${cardPreset.fontClass}`}
                      style={{ color: cardColors.accent }}
                    >
                      {isPaymentEnabled
                        ? `Rp ${(studioTheme.price ?? 5000).toLocaleString("id-ID")}`
                        : "Gratis"}
                    </span>
                    <span
                      className={`flex items-center gap-1.5 text-xs uppercase tracking-widest ${cardPreset.fontClass}`}
                      style={{ color: cardColors.accent }}
                    >
                      PILIH →
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={() => setStep("WELCOME")}
        className="px-10 py-4 rounded-full border text-xs font-black uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95"
        style={backButtonStyle}
      >
        Kembali
      </button>
    </motion.div>
  );
};
