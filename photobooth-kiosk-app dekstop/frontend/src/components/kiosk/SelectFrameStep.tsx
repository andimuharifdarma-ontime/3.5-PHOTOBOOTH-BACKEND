"use client";

import { useKioskTheme } from "./KioskThemeProvider";

import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { KioskThemeButton } from "./KioskThemeButton";
import { KioskPresetCard } from "./KioskPresetCard";
import { getPresetCardStyle, getPresetCardContentColors } from "@/lib/kiosk/theme";

interface SelectFrameStepProps {
  selectedTheme: any;
  selectedFrame: any;
  setSelectedFrame: (frame: any) => void;
  setStep: (step: any) => void;
  setIsCaptureStarted: (val: boolean) => void;
  adminUrl: string;
  isPaymentEnabled?: boolean;
}

export const SelectFrameStep: React.FC<SelectFrameStepProps> = ({
  selectedTheme,
  selectedFrame,
  setSelectedFrame,
  setStep,
  setIsCaptureStarted,
  adminUrl,
}) => {
  const kioskTheme = useKioskTheme();
  const previewPanelStyle = getPresetCardStyle(kioskTheme, true);
  const previewPanelColors = getPresetCardContentColors(kioskTheme, true);

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
      key="select_frame"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-6xl px-8 flex flex-col items-center"
      style={{ color: kioskTheme.textColorHex }}
    >
      <div className="text-center mb-10 relative">
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2 w-24 h-[2px] blur-[1px]"
          style={{
            backgroundImage: `linear-gradient(to right, transparent, ${kioskTheme.accent}, transparent)`,
          }}
        />
        <h2
          className="text-4xl font-black uppercase tracking-widest mb-2"
          style={{ color: kioskTheme.headingColor }}
        >
          Pilih Layout Bingkai
        </h2>
        <p className="text-xs font-bold uppercase tracking-widest">
          Tema Aktif:{" "}
          <span className="font-extrabold" style={{ color: kioskTheme.headingColor }}>
            {selectedTheme?.name}
          </span>
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 w-full mb-12 items-stretch">
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-6 overflow-y-auto max-h-[55vh] p-2 pr-4">
          {selectedTheme?.frames.map((frame: any) => {
            const isSelected = selectedFrame?.id === frame.id;
            return (
              <motion.div
                key={frame.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full"
              >
                <KioskPresetCard
                  theme={kioskTheme}
                  isActive={isSelected}
                  label={frame.name || "Layout"}
                  onClick={() => setSelectedFrame(frame)}
                  className="w-full min-h-[220px]"
                >
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: kioskTheme.accent }}
                    >
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </div>
                  )}
                  <div
                    className="w-full flex-1 flex items-center justify-center rounded-lg overflow-hidden min-h-[140px]"
                    style={{
                      backgroundColor: kioskTheme.isLight
                        ? "rgba(0,0,0,0.06)"
                        : "rgba(0,0,0,0.35)",
                    }}
                  >
                    <img
                      src={getFullImageUrl(frame.previewUrl || frame.imageUrl)}
                      className="max-h-[160px] w-full object-contain"
                      alt={frame.name}
                    />
                  </div>
                </KioskPresetCard>
              </motion.div>
            );
          })}
        </div>

        <div
          className={`w-full md:w-[420px] flex flex-col items-center text-center relative overflow-hidden !items-stretch !scale-100 ${previewPanelStyle.className}`}
          style={previewPanelStyle.style}
        >
          <h3
            className={`px-6 pt-5 pb-4 uppercase text-[9px] tracking-widest border-b ${previewPanelStyle.fontClass}`}
            style={{
              color: previewPanelColors.heading,
              borderColor: `${previewPanelColors.text}33`,
            }}
          >
            Pratinjau Layout
          </h3>

          <div className="flex-1 flex items-center justify-center p-6">
            <div
              className="w-full max-w-[288px] aspect-[2/3] relative flex items-center justify-center border p-3"
              style={{
                borderColor: previewPanelColors.text,
                backgroundColor: kioskTheme.isLight
                  ? "rgba(255,255,255,0.45)"
                  : "rgba(0,0,0,0.2)",
                borderRadius:
                  kioskTheme.preset === "pixel" || kioskTheme.preset === "post_card"
                    ? 0
                    : kioskTheme.preset === "global"
                      ? "1.5rem"
                      : "0.75rem",
              }}
            >
              {selectedFrame ? (
                <img
                  src={getFullImageUrl(
                    selectedFrame.previewUrl || selectedFrame.imageUrl,
                  )}
                  className="w-full h-full object-contain animate-fadeIn"
                  alt="Preview"
                />
              ) : (
                <div
                  className="flex flex-col items-center justify-center px-4"
                  style={{ color: previewPanelColors.muted }}
                >
                  <span
                    className={`text-[10px] uppercase tracking-widest ${previewPanelStyle.fontClass}`}
                  >
                    Silakan Pilih Layout
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setStep("SELECT_THEME")}
          className="px-10 py-4 rounded-full border text-xs font-black uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95"
          style={backButtonStyle}
        >
          Kembali
        </button>
        <KioskThemeButton
          disabled={!selectedFrame}
          onClick={() => {
            setStep("CAPTURE");
            setIsCaptureStarted(true);
          }}
          icon={Check}
          text="Mulai Sesi Foto"
          fullWidth={false}
          className="px-12 disabled:opacity-30"
        />
      </div>
    </motion.div>
  );
};
