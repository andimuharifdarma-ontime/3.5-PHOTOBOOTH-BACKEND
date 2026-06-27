"use client";

import { useKioskTheme } from "./KioskThemeProvider";

import React from "react";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { getPresetCardStyle, getPresetCardContentColors } from "@/lib/kiosk/theme";

interface SelectThemeStepProps {
  themes: any[];
  setSelectedTheme: (theme: any) => void;
  setSelectedFrame: (frame: any) => void;
  setStep: (step: any) => void;
  adminUrl: string;
  isPaymentEnabled?: boolean;
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
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
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
              backgroundColor: kioskTheme.isLight
                ? "rgba(255,255,255,0.9)"
                : "rgba(12,10,9,0.6)",
              borderColor: kioskTheme.surfaceBorder,
              color: kioskTheme.subtextColorHex,
            }}
          >
            Belum ada Tema bingkai aktif di database.
          </div>
        ) : (
          themes.map((studioTheme) => {
            const isHovered = hoveredId === studioTheme.id;
            const cardPreset = getPresetCardStyle(kioskTheme, isHovered);
            const cardColors = getPresetCardContentColors(kioskTheme, isHovered);
            const previewUrl =
              studioTheme.previewUrl ||
              studioTheme.frames?.[0]?.previewUrl ||
              studioTheme.frames?.[0]?.imageUrl;

            return (
              <motion.div
                key={studioTheme.id}
                whileHover={{
                  y: -4,
                  transition: { duration: 0.3, ease: "easeOut" },
                }}
                whileTap={{ scale: 0.98 }}
                onMouseEnter={() => setHoveredId(studioTheme.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => {
                  setSelectedTheme(studioTheme);
                  if (studioTheme.frames && studioTheme.frames.length > 0) {
                    setSelectedFrame(studioTheme.frames[0]);
                  }
                  setStep("SELECT_FRAME");
                }}
                className={`group relative flex flex-col overflow-hidden cursor-pointer w-full !items-stretch !p-0 !gap-0 ${cardPreset.className}`}
                style={cardPreset.style}
              >
                <div
                  className="relative aspect-[16/11] w-full overflow-hidden flex items-center justify-center border-b p-3"
                  style={{
                    borderColor: cardColors.text,
                    backgroundColor: kioskTheme.isLight
                      ? "rgba(255,255,255,0.45)"
                      : "rgba(0,0,0,0.2)",
                  }}
                >
                  {previewUrl ? (
                    <img
                      src={getFullImageUrl(previewUrl)}
                      alt={studioTheme.name}
                      className="max-h-full max-w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div
                      className="flex flex-col items-center justify-center p-6 animate-pulse"
                      style={{ color: kioskTheme.accent }}
                    >
                      <Layers className="w-12 h-12 mb-3 stroke-[1.5]" />
                      <span
                        className={`text-[9px] uppercase tracking-wider ${cardPreset.fontClass}`}
                      >
                        No Preview Image
                      </span>
                    </div>
                  )}

                  <div
                    className={`absolute top-3 left-3 px-2.5 py-1 border font-bold uppercase text-[9px] tracking-widest ${cardPreset.fontClass}`}
                    style={{
                      backgroundColor: kioskTheme.bgGradientStart,
                      borderColor: cardColors.text,
                      color: cardColors.accent,
                    }}
                  >
                    {studioTheme.frames?.length || 0} Frames
                  </div>

                  {studioTheme.tag && (
                    <span
                      className={`absolute top-3 right-3 px-2.5 py-1 uppercase text-[9px] tracking-widest ${cardPreset.fontClass}`}
                      style={{
                        backgroundColor: kioskTheme.accent,
                        color: kioskTheme.buttonTextColor,
                      }}
                    >
                      {studioTheme.tag}
                    </span>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1 relative z-10 w-full">
                  <h3
                    className={`text-xl tracking-wide mb-2 transition-colors duration-300 ${cardPreset.fontClass}`}
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
                    className="mt-4 pt-3 border-t flex items-center justify-between"
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
                    <div
                      className={`flex items-center gap-1.5 text-xs uppercase tracking-widest ${cardPreset.fontClass}`}
                      style={{ color: cardColors.accent }}
                    >
                      <span>PILIH</span>
                      <motion.span
                        animate={{ x: [0, 4, 0] }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.2,
                          ease: "easeInOut",
                        }}
                      >
                        →
                      </motion.span>
                    </div>
                  </div>
                </div>
              </motion.div>
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
