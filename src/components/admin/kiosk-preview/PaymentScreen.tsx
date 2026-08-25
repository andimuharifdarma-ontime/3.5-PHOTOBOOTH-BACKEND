"use client";

import React from "react";
import { Banknote, CreditCard, QrCode } from "lucide-react";
import { useKioskPreviewTheme } from "../KioskPreviewThemeProvider";
import { KioskPreviewButton } from "../KioskPreviewButton";

export function PaymentScreen() {
  const theme = useKioskPreviewTheme();
  const panelBg = theme.isLight ? "rgba(255,255,255,0.9)" : "rgba(12,10,9,0.6)";

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-between py-6 px-4 relative z-10"
      style={{ color: theme.textColorHex, fontFamily: theme.fontFamily }}
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-base font-black uppercase tracking-widest" style={{ color: theme.headingColor }}>
          Pembayaran
        </h2>
        <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5" style={{ color: theme.subtextColorHex }}>
          Selesaikan pembayaran untuk mencetak foto
        </p>
      </div>

      {/* Payment Amount Card */}
      <div className="w-full max-w-sm rounded-2xl border p-6 text-center space-y-4"
        style={{ backgroundColor: panelBg, borderColor: theme.surfaceBorder }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: `${theme.accent}22`, border: `2px solid ${theme.accent}55` }}>
          <Banknote className="w-7 h-7" style={{ color: theme.accent }} />
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: theme.subtextColorHex }}>
            Total Pembayaran
          </p>
          <p className="text-3xl font-black mt-1" style={{ color: theme.accent }}>
            Rp 25.000
          </p>
        </div>

        {/* Payment methods */}
        <div className="flex gap-3 pt-2">
          <div className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border cursor-default"
            style={{ borderColor: theme.accent, backgroundColor: `${theme.accent}11` }}>
            <CreditCard className="w-4 h-4" style={{ color: theme.accent }} />
            <span className="text-[7px] font-black uppercase tracking-wider" style={{ color: theme.accent }}>QRIS</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border cursor-default"
            style={{ borderColor: theme.surfaceBorder, backgroundColor: theme.isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)" }}>
            <Banknote className="w-4 h-4" style={{ color: theme.subtextColorHex }} />
            <span className="text-[7px] font-black uppercase tracking-wider" style={{ color: theme.subtextColorHex }}>Tunai</span>
          </div>
        </div>

        {/* QR Placeholder */}
        <div className="w-full rounded-xl flex items-center justify-center py-4"
          style={{ backgroundColor: theme.isLight ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.3)" }}>
          <QrCode className="w-20 h-20" style={{ color: theme.textColorHex }} />
        </div>

        <p className="text-[7px] font-bold uppercase tracking-widest" style={{ color: theme.subtextColorHex }}>
          Arahkan kamera untuk membayar via QRIS
        </p>
      </div>

      {/* Cancel Button */}
      <div className="w-full max-w-sm">
        <div className="text-center py-2 rounded-full border text-[8px] font-black uppercase tracking-widest cursor-default"
          style={{ borderColor: theme.surfaceBorder, color: theme.subtextColorHex, backgroundColor: theme.isLight ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.08)" }}>
          Batalkan Sesi
        </div>
      </div>
    </div>
  );
}
