"use client";

import React from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useKioskTheme } from "./KioskThemeProvider";
import { KioskThemeButton } from "./KioskThemeButton";

interface WelcomeStepProps {
  handleStartSession: () => void;
  isPaymentEnabled?: boolean;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({
  handleStartSession,
  isPaymentEnabled = false,
}) => {
  const theme = useKioskTheme();
  const showPaymentHint = isPaymentEnabled && theme.showPaymentHint;

  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-10 flex flex-col h-screen w-screen overflow-hidden"
      style={{ color: theme.textColorHex, fontFamily: theme.fontFamily }}
    >
      {/* Brand Header — atas */}
      <div className="shrink-0 pt-16 md:pt-20 px-6 text-center space-y-2">
        {theme.showBrandName && (
          <h1
            className="text-2xl md:text-3xl tracking-widest font-black uppercase"
            style={{ color: theme.accent }}
          >
            {theme.brandName}
          </h1>
        )}
        {theme.showBrandSubtitle && (
          <p
            className="text-[10px] md:text-xs tracking-[0.4em] uppercase font-bold"
            style={{ color: theme.subtextColorHex }}
          >
            {theme.brandSubtitle}
          </p>
        )}
      </div>

      {/* Tengah — logo */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 min-h-0">
        {theme.showLogo &&
          (theme.logoUrl ? (
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center bg-white/5 border border-white/10 shadow-2xl relative shrink-0">
              <div
                className="absolute inset-2 rounded-full border border-dashed border-white/20 animate-spin"
                style={{ animationDuration: "16s" }}
              />
              <img
                src={theme.logoUrl}
                alt="Logo"
                className="w-14 h-14 md:w-16 md:h-16 object-contain rounded-full relative z-10"
              />
            </div>
          ) : (
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center bg-white/5 border border-white/10 shadow-2xl relative shrink-0">
              <div
                className="absolute inset-2 rounded-full border border-dashed border-white/20 animate-spin"
                style={{ animationDuration: "16s" }}
              />
              <Flame className="w-9 h-9 relative z-10" style={{ color: theme.accent }} />
            </div>
          ))}
      </div>

      {/* Bawah — pesan sambutan, info pembayaran, tombol */}
      <div className="shrink-0 w-full flex flex-col items-center px-6 pb-10 md:pb-14 space-y-5 md:space-y-6">
        <div className="w-full max-w-sm md:max-w-md space-y-3 text-center">
          {theme.showWelcomeMessage && (
            <p className="text-xs sm:text-sm font-black tracking-widest uppercase opacity-90 animate-pulse">
              {theme.welcomeMessage}
            </p>
          )}

          {showPaymentHint && (
            <p
              className="text-[10px] sm:text-xs tracking-wider uppercase"
              style={{ color: theme.subtextColorHex }}
            >
              Pembayaran dilakukan setelah memilih filter
            </p>
          )}
        </div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full max-w-sm md:max-w-md"
        >
          <KioskThemeButton onClick={handleStartSession} text="Mulai Sesi Memotret" />
        </motion.div>
      </div>
    </motion.div>
  );
};
