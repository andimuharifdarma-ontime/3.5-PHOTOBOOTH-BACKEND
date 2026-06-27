"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Clock, RotateCcw, Play } from "lucide-react";
import { useKioskTheme } from "./KioskThemeProvider";
import { cardSurfaceStyle } from "@/lib/kiosk/theme";
import { KioskThemeButton } from "./KioskThemeButton";

interface TimeoutModalProps {
  showTolerance: boolean;
  showExpired: boolean;
  toleranceTime: number;
  onContinue: () => void;
  onReturn: () => void;
}

export const TimeoutModal: React.FC<TimeoutModalProps> = ({
  showTolerance,
  showExpired,
  toleranceTime,
  onContinue,
  onReturn,
}) => {
  const theme = useKioskTheme();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <AnimatePresence>
      {showTolerance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md p-8 rounded-3xl border shadow-2xl relative text-center"
            style={cardSurfaceStyle(theme)}
          >
            <div
              className="w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-6 animate-pulse"
              style={{
                backgroundColor: `${theme.accent}1a`,
                borderColor: `${theme.accent}33`,
                color: theme.accent,
              }}
            >
              <Clock className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold tracking-tight mb-2">Apakah Anda masih lanjut?</h3>
            <p className="text-xs mb-6" style={{ color: theme.subtextColorHex }}>
              Waktu batas halaman Anda telah habis. Sesi akan otomatis berakhir jika tidak ada
              konfirmasi.
            </p>

            <div
              className="border rounded-2xl p-4 mb-8"
              style={{
                backgroundColor: theme.isLight ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.35)",
                borderColor: theme.surfaceBorder,
              }}
            >
              <span className="text-3xl font-black font-mono tracking-wider" style={{ color: theme.accent }}>
                {formatTime(toleranceTime)}
              </span>
              <p className="text-[10px] mt-1 uppercase font-bold tracking-widest" style={{ color: theme.subtextColorHex }}>
                Waktu Toleransi Konfirmasi
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onReturn}
                className="flex-1 py-4 border text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                style={cardSurfaceStyle(theme)}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Mulai Awal</span>
              </button>
              <KioskThemeButton
                onClick={onContinue}
                isSmall
                icon={Play}
                text="Lanjut Sesi"
                className="flex-1"
              />
            </div>
          </motion.div>
        </div>
      )}

      {showExpired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md p-10 rounded-3xl border border-red-500/20 shadow-2xl text-center"
            style={cardSurfaceStyle(theme)}
          >
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-black tracking-tight mb-3 text-red-500">Waktu Anda Habis</h3>
            <p className="text-sm leading-relaxed" style={{ color: theme.subtextColorHex }}>
              Mohon berikan kesempatan ke pelanggan lain. Terima kasih atas kunjungan Anda!
            </p>

            <div className="w-12 h-1 border-t-2 border-dashed mx-auto my-6" style={{ borderColor: theme.surfaceBorder }} />
            <p className="text-[10px] uppercase tracking-widest animate-pulse" style={{ color: theme.subtextColorHex }}>
              Mengarahkan kembali ke layar utama...
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
