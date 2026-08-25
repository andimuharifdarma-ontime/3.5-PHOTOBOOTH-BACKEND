"use client";

import React from "react";
import { QrCode, Printer } from "lucide-react";
import { useKioskPreviewTheme } from "../KioskPreviewThemeProvider";
import { KioskPreviewButton } from "../KioskPreviewButton";

interface DoneScreenProps {
  resultTimer?: number;
}

export function DoneScreen({ resultTimer = 60 }: DoneScreenProps) {
  const theme = useKioskPreviewTheme();
  const cardBg = theme.isLight ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.05)";

  return (
    <div
      className="h-full flex flex-col justify-between items-center text-center py-6 relative z-10"
      style={{ color: theme.textColorHex, fontFamily: theme.fontFamily }}
    >
      {/* Header */}
      <div>
        <h2 className="text-base font-black tracking-widest uppercase" style={{ color: theme.accent }}>
          Pemotretan Selesai!
        </h2>
        <p className="text-[8px] tracking-[0.2em] uppercase mt-0.5" style={{ color: theme.subtextColorHex }}>
          Silakan scan dan unduh foto Anda di bawah
        </p>
      </div>

      {/* QR Card */}
      <div className="flex items-center gap-6 p-5 rounded-2xl border max-w-sm my-auto shadow-xl"
        style={{ backgroundColor: cardBg, borderColor: theme.surfaceBorder }}>
        {/* Mock QR */}
        <div className="w-20 h-20 bg-white rounded-xl p-1.5 flex items-center justify-center shrink-0 shadow-lg">
          <QrCode className="w-full h-full text-black" />
        </div>
        <div className="text-left space-y-2">
          <h3 className="text-[9px] font-black uppercase tracking-wider" style={{ color: theme.headingColor }}>
            Scan Kode QR
          </h3>
          <p className="text-[7px] leading-relaxed font-bold uppercase" style={{ color: theme.subtextColorHex }}>
            Arahkan kamera smartphone Anda untuk mengunduh resolusi tinggi & video boomerang!
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 w-full max-w-xs">
        <KioskPreviewButton text="Cetak Foto Sekarang" icon={Printer} />
        <span className="text-[7px] font-bold uppercase tracking-widest block" style={{ color: theme.subtextColorHex }}>
          Kembali ke layar utama dalam {resultTimer} detik
        </span>
      </div>
    </div>
  );
}
