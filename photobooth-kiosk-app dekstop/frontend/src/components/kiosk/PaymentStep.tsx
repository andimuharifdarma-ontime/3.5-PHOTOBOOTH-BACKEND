"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CreditCard, Loader2, XCircle } from "lucide-react";
import { useKioskTheme } from "./KioskThemeProvider";
import { cardSurfaceStyle } from "@/lib/kiosk/theme";
import { NESTJS_URL } from "@/lib/kiosk/config";

interface PaymentStepProps {
  selectedFrame: any;
  selectedTheme?: any;
  isProcessingPayment: boolean;
  checkoutData: any;
  paymentError?: string;
  onRetryPayment?: () => void;
  setPaymentVerified: (val: boolean) => void;
  handleProceedToReview: () => void;
  printQuantity?: number;
  apiKey?: string;
}

export const PaymentStep: React.FC<PaymentStepProps> = ({
  selectedFrame,
  selectedTheme,
  isProcessingPayment,
  checkoutData,
  paymentError = "",
  onRetryPayment,
  setPaymentVerified,
  handleProceedToReview,
  printQuantity = 1,
  apiKey = "",
}) => {
  const theme = useKioskTheme();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!checkoutData?.orderId || checkoutData?.isFree) return;

    const orderId = checkoutData.orderId;

    const pollStatus = async () => {
      try {
        const res = await fetch(
          `${NESTJS_URL}/kiosk/payment/status/${orderId}?apiKey=${encodeURIComponent(apiKey)}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data.paymentStatus === "paid") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setPaymentVerified(true);
            handleProceedToReview();
          }
        }
      } catch {
        // keep polling
      }
    };

    pollingRef.current = setInterval(pollStatus, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [checkoutData?.orderId, apiKey, handleProceedToReview, setPaymentVerified]);

  const totalPrice =
    checkoutData?.totalPrice ||
    (selectedTheme?.price ?? selectedFrame?.price ?? 5000) * printQuantity;

  const paymentUrl = checkoutData?.paymentUrl;

  return (
    <motion.div
      key="payment"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col items-center justify-center"
      style={{ color: theme.textColorHex }}
    >
      <div
        className="w-full flex items-center justify-between px-6 py-4 border-b backdrop-blur"
        style={cardSurfaceStyle(theme)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center border"
            style={{
              backgroundColor: `${theme.accent}1a`,
              borderColor: `${theme.accent}33`,
              color: theme.accent,
            }}
          >
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight">Pembayaran QRIS via DOKU</h2>
            <p className="text-xs" style={{ color: theme.subtextColorHex }}>
              Total:{" "}
              <span className="font-bold" style={{ color: theme.accent }}>
                Rp {totalPrice.toLocaleString("id-ID")}
              </span>{" "}
              · {printQuantity} cetak
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isProcessingPayment && paymentUrl && (
            <div
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border rounded-full px-3 py-1"
              style={{
                backgroundColor: `${theme.accent}1a`,
                borderColor: `${theme.accent}33`,
                color: theme.accent,
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: theme.accent }}
              />
              Menunggu Pembayaran
            </div>
          )}

          <button
            onClick={() => {
              if (pollingRef.current) clearInterval(pollingRef.current);
              setPaymentVerified(true);
              handleProceedToReview();
            }}
            className="text-[10px] font-bold uppercase tracking-wider transition underline px-2"
            style={{ color: theme.subtextColorHex }}
          >
            Bypass
          </button>
        </div>
      </div>

      <div
        className="flex-1 w-full relative"
        style={{
          backgroundColor: theme.isLight ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.55)",
        }}
      >
        {isProcessingPayment && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <Loader2 className="w-12 h-12 animate-spin" style={{ color: theme.accent }} />
            <p className="text-sm font-semibold">Menghubungkan ke Gateway DOKU...</p>
            <p className="text-xs" style={{ color: theme.subtextColorHex }}>
              Harap tunggu sebentar
            </p>
          </div>
        )}

        {!isProcessingPayment && !paymentUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 px-6">
            <XCircle className="w-12 h-12 text-red-400" />
            <p className="text-sm font-semibold">Gagal Menghubungi Gateway</p>
            <p className="text-xs max-w-sm text-center" style={{ color: theme.subtextColorHex }}>
              {paymentError ||
                "Periksa koneksi internet dan pastikan kredensial DOKU sudah diset di backend/.env, lalu coba lagi."}
            </p>
            {onRetryPayment ? (
              <button
                type="button"
                onClick={onRetryPayment}
                className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border-2"
                style={{
                  backgroundColor: theme.accent,
                  borderColor: theme.textColorHex,
                  color: theme.buttonTextColor,
                }}
              >
                Coba Lagi
              </button>
            ) : null}
          </div>
        )}

        {!isProcessingPayment && paymentUrl && (
          <iframe
            src={paymentUrl}
            className="w-full h-full border-0"
            title="DOKU Payment Gateway"
            allow="payment"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
          />
        )}
      </div>
    </motion.div>
  );
};
