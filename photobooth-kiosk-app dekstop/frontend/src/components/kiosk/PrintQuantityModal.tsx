"use client";

import React, { useState } from "react";
import { Minus, Plus, Printer, X } from "lucide-react";
import { motion } from "framer-motion";
import { useKioskTheme } from "./KioskThemeProvider";
import { cardSurfaceStyle } from "@/lib/kiosk/theme";
import { KioskThemeButton } from "./KioskThemeButton";

interface PrintQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

export const PrintQuantityModal: React.FC<PrintQuantityModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const theme = useKioskTheme();
  const [quantity, setQuantity] = useState(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md p-8 rounded-3xl border shadow-2xl relative"
        style={cardSurfaceStyle(theme)}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 transition"
          style={{ color: theme.subtextColorHex }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-3 mb-8">
          <div
            className="w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto"
            style={{
              backgroundColor: `${theme.accent}1a`,
              borderColor: `${theme.accent}33`,
              color: theme.accent,
            }}
          >
            <Printer className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold tracking-tight">Jumlah Salinan Cetak</h3>
          <p className="text-xs" style={{ color: theme.subtextColorHex }}>
            Tentukan berapa lembar foto fisik yang ingin Anda cetak sekarang.
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 mb-8">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-14 h-14 rounded-2xl border flex items-center justify-center transition active:scale-95 cursor-pointer"
            style={cardSurfaceStyle(theme)}
          >
            <Minus className="w-6 h-6" />
          </button>

          <span className="text-4xl font-black w-16 text-center select-none">{quantity}</span>

          <button
            onClick={() => setQuantity((q) => Math.min(5, q + 1))}
            className="w-14 h-14 rounded-2xl border flex items-center justify-center transition active:scale-95 cursor-pointer"
            style={cardSurfaceStyle(theme)}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 border text-xs font-bold rounded-xl transition cursor-pointer"
            style={cardSurfaceStyle(theme)}
          >
            Batal
          </button>
          <KioskThemeButton
            onClick={() => onConfirm(quantity)}
            isSmall
            text="Konfirmasi"
            className="flex-1"
          />
        </div>
      </motion.div>
    </div>
  );
};
