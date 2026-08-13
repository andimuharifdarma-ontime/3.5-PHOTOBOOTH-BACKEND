"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, CreditCard, Loader2, XCircle } from "lucide-react";
import { useKioskTheme } from "./KioskThemeProvider";
import { cardSurfaceStyle } from "@/lib/kiosk/theme";
import { NESTJS_URL } from "@/lib/kiosk/config";
import {
  isKioskPaymentMessage,
  KIOSK_PAYMENT_SUCCESS_EVENT,
} from "@/lib/kiosk/payment-events";

interface PaymentStepProps {
  selectedFrame: any;
  selectedTheme?: any;
  isProcessingPayment: boolean;
  checkoutData: any;
  paymentError?: string;
  onRetryPayment?: () => void;
  setPaymentVerified: (val: boolean) => void;
  onPaymentComplete: () => void;
  printQuantity?: number;
  apiKey?: string;
}

const POLL_INTERVAL_MS = 2000;
const DOKU_SUCCESS_HOLD_MS = 5000;
const CALLBACK_HOLD_MS = 2000;
const LEAVE_OVERLAY_MS = 800;

export const PaymentStep: React.FC<PaymentStepProps> = ({
  selectedFrame,
  selectedTheme,
  isProcessingPayment,
  checkoutData,
  paymentError = "",
  onRetryPayment,
  setPaymentVerified,
  onPaymentComplete,
  printQuantity = 1,
  apiKey = "",
}) => {
  const theme = useKioskTheme();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const paymentCompleteRef = useRef(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveAtRef = useRef<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onPaymentCompleteRef = useRef(onPaymentComplete);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  onPaymentCompleteRef.current = onPaymentComplete;

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const scheduleLeave = useCallback((holdMs: number) => {
    const target = Date.now() + holdMs;
    if (leaveAtRef.current != null && leaveAtRef.current <= target) return;

    leaveAtRef.current = target;
    setPaymentVerified(true);
    stopPolling();

    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = window.setTimeout(() => {
      if (paymentCompleteRef.current) return;
      paymentCompleteRef.current = true;
      setShowSuccessOverlay(true);
      overlayTimerRef.current = window.setTimeout(() => {
        onPaymentCompleteRef.current();
      }, LEAVE_OVERLAY_MS);
    }, holdMs);
  }, [setPaymentVerified]);

  useEffect(() => {
    if (!checkoutData?.orderId || checkoutData?.isFree) return;

    paymentCompleteRef.current = false;
    leaveAtRef.current = null;
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    setShowSuccessOverlay(false);
    pollCountRef.current = 0;
    const orderId = checkoutData.orderId;

    const pollStatus = async () => {
      pollCountRef.current += 1;
      const syncDoku = pollCountRef.current === 1 || pollCountRef.current % 3 === 0;

      try {
        const res = await fetch(
          `${NESTJS_URL}/kiosk/payment/status/${orderId}?apiKey=${encodeURIComponent(apiKey)}&syncDoku=${syncDoku ? "1" : "0"}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data.paymentStatus === "paid") {
            scheduleLeave(DOKU_SUCCESS_HOLD_MS);
          }
        }
      } catch {
        // keep polling
      }
    };

    void pollStatus();
    pollingRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);

    return () => {
      stopPolling();
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, [checkoutData?.orderId, checkoutData?.isFree, apiKey, scheduleLeave]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isKioskPaymentMessage(event.data)) return;
      if (event.data.type !== KIOSK_PAYMENT_SUCCESS_EVENT) return;

      const orderId = checkoutData?.orderId;
      if (orderId && event.data.orderId && event.data.orderId !== orderId) return;

      scheduleLeave(CALLBACK_HOLD_MS);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [checkoutData?.orderId, scheduleLeave]);

  const handleIframeLoad = () => {
    try {
      const href = iframeRef.current?.contentWindow?.location.href;
      if (href?.includes("/payment-success")) {
        scheduleLeave(CALLBACK_HOLD_MS);
      }
    } catch {
      // cross-origin while on DOKU domain
    }
  };

  const totalPrice =
    checkoutData?.totalPrice ||
    (selectedTheme?.price ?? selectedFrame?.price ?? 5000) * printQuantity;

  const paymentUrl = checkoutData?.paymentUrl;
  const showIframe = !isProcessingPayment && !!paymentUrl && !showSuccessOverlay;

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
          {showIframe && (
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

          {process.env.NODE_ENV === "development" && (
            <button
              type="button"
              onClick={() => scheduleLeave(0)}
              className="text-[10px] font-bold uppercase tracking-wider transition underline px-2"
              style={{ color: theme.subtextColorHex }}
            >
              Bypass
            </button>
          )}
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
            <p className="text-sm font-semibold">Menyiapkan halaman QRIS DOKU...</p>
            <p className="text-xs" style={{ color: theme.subtextColorHex }}>
              Sesi pembayaran sedang dibuat
            </p>
          </div>
        )}

        {!isProcessingPayment && !paymentUrl && !showSuccessOverlay && (
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

        {showIframe && (
          <iframe
            ref={iframeRef}
            src={paymentUrl}
            className="w-full h-full border-0"
            title="DOKU Payment Gateway"
            allow="payment"
            onLoad={handleIframeLoad}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
          />
        )}

        {showSuccessOverlay && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-stone-950/90 backdrop-blur-sm">
            <CheckCircle2 className="w-14 h-14 text-emerald-400" />
            <p className="text-base font-bold text-white">Pembayaran Berhasil</p>
            <p className="text-xs text-stone-400">Melanjutkan sesi foto...</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
