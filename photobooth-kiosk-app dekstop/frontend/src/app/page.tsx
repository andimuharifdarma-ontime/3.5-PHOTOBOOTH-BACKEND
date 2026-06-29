"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";
import { Lock, Clock } from "lucide-react";
import { TimeoutModal } from "../components/kiosk/TimeoutModal";

// Impor Komponen Modular Baru
import { SetupStep } from "../components/kiosk/SetupStep";
import { WelcomeStep } from "../components/kiosk/WelcomeStep";
import { SelectThemeStep } from "../components/kiosk/SelectThemeStep";
import { SelectFrameStep } from "../components/kiosk/SelectFrameStep";
import { CaptureStep } from "../components/kiosk/CaptureStep";
import { SelectPhotosStep } from "../components/kiosk/SelectPhotosStep";
import { FilterStep } from "../components/kiosk/FilterStep";
import { PrintQuantityStep } from "../components/kiosk/PrintQuantityStep";
import { PaymentStep } from "../components/kiosk/PaymentStep";
import { ReviewStep } from "../components/kiosk/ReviewStep";
import { DoneStep } from "../components/kiosk/DoneStep";
import {
  type UploadItem,
  type UploadPhase,
  type PrintStatus,
} from "../lib/kiosk/upload";
import {
  drawImageWithArtisticFilter,
  getCssFilterFallback,
  normalizeEnabledFilters,
  prefetchFilteredImage,
} from "../lib/kiosk/filters";
import { applySlotTransformAndClip } from "../lib/kiosk/canvas-utils";
import { NESTJS_URL, CAMERA_URL, ADMIN_URL, CAMERA_API_SECRET } from "../lib/kiosk/config";
import { ensureMobileMp4ViaCamera } from "../lib/kiosk/mobileMp4";
import {
  computeBitrateForBudget,
  getVideoEncodeDimensions,
  VIDEO_BUDGET_MAX_BYTES,
} from "../lib/kiosk/videoBudget";
import {
  readCachedKioskSettings,
  readCachedKioskThemes,
  writeCachedKioskSettings,
  writeCachedKioskThemes,
} from "../lib/kiosk/config-cache";
import { KioskThemeProvider } from "../components/kiosk/KioskThemeProvider";
import {
  resolveKioskTheme,
  cardSurfaceStyle,
  primaryButtonStyle,
} from "../lib/kiosk/theme";
import {
  resolveStepAfterWelcome,
  resolveStepAfterFilter,
  type KioskStep,
} from "../hooks/useKioskStepFlow";
import {
  resolvePreferredPrinter,
  readSavedPrinterName,
  readSavedPrintMediaForFrame,
  writeSavedPrinterName,
  type KioskPrinter,
} from "../lib/kiosk/printer";
import { isA4FrameSize } from "../lib/kiosk/frameFormats";

// Tipe data dari Supabase
interface Frame {
  id: string;
  themeId: string;
  name: string;
  imageUrl: string;
  previewUrl: string;
  price: number;
  outputWidth: number;
  outputHeight: number;
  slots: any; // JSON
  framePosition: string;
  maxSlots: number;
  padding: number;
}

interface FrameTheme {
  id: string;
  name: string;
  previewUrl: string;
  description: string;
  tag: string;
  price: number;
  frames: Frame[];
}

export default function PhotoboothPage() {
  const [step, setStep] = useState<KioskStep>("SETUP");
  
  // Konfigurasi API & Client
  const [inputApiKey, setInputApiKey] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [kioskSettings, setKioskSettings] = useState<any>(null);
  const [themes, setThemes] = useState<FrameTheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<FrameTheme | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  
  // State Sesi Kamera & Capture
  const [cameraStatus, setCameraStatus] = useState<any>(null);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<any[]>([]);
  const [isCaptureStarted, setIsCaptureStarted] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const [testPhotoUrl, setTestPhotoUrl] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<any | null>(null);

  // State Printer (driver terinstall di OS)
  const [printers, setPrinters] = useState<KioskPrinter[]>([]);
  const [defaultPrinter, setDefaultPrinter] = useState("");
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [printerLoading, setPrinterLoading] = useState(false);
  const [printerMessage, setPrinterMessage] = useState("");
  const [isTestPrinting, setIsTestPrinting] = useState(false);
  const [printerServiceOk, setPrinterServiceOk] = useState(false);

  // State Layout & Filter Sesi
  const [selectedPhotos, setSelectedPhotos] = useState<Record<number, any>>({}); // Menampung foto terpilih untuk tiap index slot
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<string>("original");
  const [isLayoutMirrored, setIsLayoutMirrored] = useState(true);

  // State Pembayaran & Order
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [paymentError, setPaymentError] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [sessionName, setSessionName] = useState("");

  // State Keamanan Pengaturan
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isPassFocused, setIsPassFocused] = useState(false);
  const [hasContinuedSession, setHasContinuedSession] = useState(false);

  // State Input Form Pelanggan
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [printQuantity, setPrintQuantity] = useState(1);
  const [showPrePaymentForm, setShowPrePaymentForm] = useState(false);
  const [activeInputField, setActiveInputField] = useState<"name" | "email" | "phone" | null>(null);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [formValidationError, setFormValidationError] = useState("");

  // Cloud Sync & QR Code
  const [sessionId, setSessionId] = useState("");
  const [isUploadingCloud, setIsUploadingCloud] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("compiling");
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [printStatus, setPrintStatus] = useState<PrintStatus>("idle");
  const [cloudMainUrl, setCloudMainUrl] = useState("");
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [localLiveUrl, setLocalLiveUrl] = useState<string | null>(null);
  const printBlobRef = useRef<Blob | null>(null);

  // State Timers & Toleransi Sesi Kiosk
  const [stepTimer, setStepTimer] = useState<number | null>(null);
  const [showToleranceModal, setShowToleranceModal] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [toleranceTimer, setToleranceTimer] = useState<number>(90);

  // Socket & Refs
  const socketRef = useRef<Socket | null>(null);
  const isCapturingRef = useRef(false);
  const lastDurationsRef = useRef<Record<string, number | null>>({});

  const adminUrl = ADMIN_URL;
  const theme = useMemo(() => resolveKioskTheme(kioskSettings), [kioskSettings]);

  // Load API Key + cache lokal agar tema/settings langsung tampil
  useEffect(() => {
    const savedKey = localStorage.getItem("kiosk_api_key");
    if (!savedKey) return;

    setApiKey(savedKey);
    setInputApiKey(savedKey);

    const cachedSettings = readCachedKioskSettings(savedKey);
    const cachedThemes = readCachedKioskThemes(savedKey);
    if (cachedSettings) {
      setKioskSettings({
        ...cachedSettings,
        enabledFilters: normalizeEnabledFilters(cachedSettings.enabledFilters),
      });
      setStep("WELCOME");
    }
    if (cachedThemes?.length) {
      setThemes(cachedThemes as FrameTheme[]);
    }

    loadKioskConfig(savedKey, { silent: !!cachedSettings });
    setSelectedPrinter(readSavedPrinterName());
  }, []);

  // Pemuatan data konfigurasi & tema
  const loadKioskConfig = async (
    key: string,
    options?: { silent?: boolean },
  ) => {
    try {
      if (!options?.silent) {
        setStatusMessage("Memverifikasi API Key...");
      }

      const [settingsRes, themesRes] = await Promise.all([
        fetch(`${NESTJS_URL}/kiosk/settings?apiKey=${key}`, { cache: "no-store" }),
        fetch(`${NESTJS_URL}/kiosk/themes?apiKey=${key}`, { cache: "no-store" }),
      ]);

      if (!settingsRes.ok) throw new Error("Gagal verifikasi API Key");
      const settingsData = await settingsRes.json();
      const normalizedSettings = {
        ...settingsData,
        enabledFilters: normalizeEnabledFilters(settingsData?.enabledFilters),
      };
      setKioskSettings(normalizedSettings);
      writeCachedKioskSettings(key, normalizedSettings);

      if (themesRes.ok) {
        const themesData = await themesRes.json();
        setThemes(themesData);
        writeCachedKioskThemes(key, themesData);
      }

      localStorage.setItem("kiosk_api_key", key);
      setApiKey(key);
      setStep("WELCOME");
      setStatusMessage("");
      setHasError(false);

      fetchCameraStatus();
    } catch (err: any) {
      console.error(err);
      if (!options?.silent) {
        setStatusMessage("API Key tidak valid atau Server Admin tidak terjangkau.");
        setHasError(true);
      }
    }
  };

  const cameraReconnectAttemptRef = useRef(0);
  const [liveViewKey, setLiveViewKey] = useState(0);
  const prevCameraServiceOkRef = useRef<boolean | null>(null);

  // Cek Status Kamera DSLR
  const fetchCameraStatus = async (options?: { silent?: boolean; forceReconnect?: boolean }) => {
    try {
      const res = await fetch(`${CAMERA_URL}/status`, { cache: "no-store" });
      if (res.ok) {
        let data = await res.json();

        const shouldReconnect =
          options?.forceReconnect ||
          (data.gphoto2_available &&
            !data.camera_connected &&
            cameraReconnectAttemptRef.current % 4 === 0);

        if (shouldReconnect && data.gphoto2_available && !data.camera_connected) {
          try {
            const reconnectRes = await fetch(`${CAMERA_URL}/camera/reconnect`, {
              method: "POST",
              cache: "no-store",
            });
            if (reconnectRes.ok) {
              data = await reconnectRes.json();
              if (data.camera_connected) {
                setLiveViewKey((prev) => prev + 1);
              }
            }
          } catch {
            /* reconnect optional */
          }
        }

        cameraReconnectAttemptRef.current += 1;
        setCameraStatus({ ...data, service_ok: true });
      } else {
        setCameraStatus({
          camera_connected: false,
          gphoto2_available: false,
          service_ok: false,
        });
      }
    } catch {
      setCameraStatus({
        camera_connected: false,
        gphoto2_available: false,
        service_ok: false,
      });
    }
  };

  const fetchPrinters = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setPrinterLoading(true);
    try {
      const res = await fetch(`${CAMERA_URL}/printers`, { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal mengambil daftar printer");
      const data = await res.json();
      const list: KioskPrinter[] = data.printers || [];
      setPrinters(list);
      setDefaultPrinter(data.default_printer || "");
      setPrinterServiceOk(true);

      setSelectedPrinter((prev) => {
        const preferred = resolvePreferredPrinter(
          list,
          data.default_printer || "",
          prev || readSavedPrinterName(),
        );
        if (preferred) writeSavedPrinterName(preferred);
        return preferred;
      });

      const preferred = resolvePreferredPrinter(
        list,
        data.default_printer || "",
        readSavedPrinterName(),
      );
      const preferredEntry = list.find((p) => p.name === preferred);
      const connectionLabel =
        preferredEntry?.is_online && preferredEntry.status !== "disabled"
          ? "Connected"
          : preferredEntry
            ? "No Connection"
            : "Siap";

      setPrinterMessage(
        list.length
          ? `${list.length} printer terdeteksi · ${connectionLabel}`
          : "Tidak ada printer terinstall di laptop",
      );
    } catch (err) {
      console.error(err);
      setPrinterServiceOk(false);
      if (!options?.silent) {
        setPrinters([]);
      }
      setPrinterMessage(
        options?.silent
          ? "Menghubungkan ke layanan printer..."
          : "Gagal terhubung ke layanan printer. Pastikan camera service berjalan.",
      );
    } finally {
      if (!options?.silent) setPrinterLoading(false);
    }
  };

  const fetchCameraStatusRef = useRef(fetchCameraStatus);
  const fetchPrintersRef = useRef(fetchPrinters);
  fetchCameraStatusRef.current = fetchCameraStatus;
  fetchPrintersRef.current = fetchPrinters;

  useEffect(() => {
    if (step !== "SETUP") return;

    let cancelled = false;

    const refreshDevices = async () => {
      if (cancelled) return;
      await Promise.all([
        fetchCameraStatusRef.current({ silent: true }),
        fetchPrintersRef.current({ silent: true }),
      ]);
    };

    void refreshDevices();
    const interval = setInterval(() => void refreshDevices(), 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step]);

  useEffect(() => {
    const isOk = cameraStatus?.service_ok === true;
    if (isOk && prevCameraServiceOkRef.current !== true) {
      setLiveViewKey((prev) => prev + 1);
    }
    prevCameraServiceOkRef.current = isOk;
  }, [cameraStatus?.service_ok]);

  const handleSelectPrinter = (name: string) => {
    setSelectedPrinter(name);
    writeSavedPrinterName(name);
    const entry = printers.find((p) => p.name === name);
    setPrinterMessage(
      entry
        ? `Printer "${name}" dipilih · ${
            entry.is_online && entry.status !== "disabled" ? "Connected" : "No Connection"
          }`
        : `Printer "${name}" dipilih.`,
    );
  };

  const triggerTestPrint = async () => {
    if (!selectedPrinter) {
      setPrinterMessage("Pilih printer terlebih dahulu.");
      return;
    }

    setIsTestPrinting(true);
    setPrinterMessage(`Mengirim halaman uji ke "${selectedPrinter}"...`);
    try {
      const url = `${CAMERA_URL}/print-test?printer_name=${encodeURIComponent(selectedPrinter)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "X-API-Key": CAMERA_API_SECRET },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Gagal test cetak");
      setPrinterMessage(data.message || `Test cetak terkirim ke "${selectedPrinter}".`);
    } catch (err: any) {
      setPrinterMessage(err.message || "Gagal test cetak");
    } finally {
      setIsTestPrinting(false);
    }
  };

  // Hubungkan Socket.io
  useEffect(() => {
    const socket = io(NESTJS_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      auth: { apiKey: apiKey || undefined },
    });

    socket.on("connect", () => {
      console.log("Terhubung ke NestJS Gateway");
    });

    socket.on("capture_status", (payload: any) => {
      if (payload.status === "capturing") {
        setStatusMessage("Mengambil gambar dari DSLR...");
      } else if (payload.status === "success") {
        setStatusMessage("");
        isCapturingRef.current = false;
        
        if (step === "SETUP") {
          setTestPhotoUrl(`${CAMERA_URL}/photos/${payload.data?.filename}`);
        } else if (step === "CAPTURE") {
          setPreviewPhoto(payload.data);
        } else {
          setCapturedPhotos((prev) => {
            if (prev.length > 0 && prev[prev.length - 1]?.filename === payload.data?.filename) {
              return prev;
            }
            return [...prev, payload.data];
          });
        }
      } else if (payload.status === "error") {
        const errMsg = payload.message || "";
        if (errMsg.toLowerCase().includes("500") || errMsg.toLowerCase().includes("fail") || errMsg.toLowerCase().includes("busy") || errMsg.toLowerCase().includes("focus")) {
          setStatusMessage("Gagal menjepret: Kamera tidak mendapatkan fokus! Silakan pastikan objek terlihat jelas atau atur lensa ke Manual Focus (MF).");
        } else {
          setStatusMessage(`Error Kamera: ${errMsg}`);
        }
        setCountdown(null);
        setIsCaptureStarted(false);
        isCapturingRef.current = false;
        setHasError(true);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [step, apiKey]);

  // 1. Inisialisasi Timer saat pindah step atau kioskSettings diubah
  useEffect(() => {
    // Reset status toleransi & expired modal saat berganti step
    if (showToleranceModal || showExpiredModal) {
      // Jangan reset jika sedang dalam modal toleransi/expired
    } else {
      setShowToleranceModal(false);
      setShowExpiredModal(false);
      setToleranceTimer(90);
    }

    if (!kioskSettings) {
      setStepTimer(null);
      return;
    }

    // Tentukan waktu berdasarkan step saat ini
    let seconds: number | null = null;

    if (step === "SELECT_THEME" || step === "SELECT_FRAME") {
      if (kioskSettings.isFrameSelectionTimerEnabled) {
        seconds = (kioskSettings.frameSelectionTimer || 5) * 60;
      }
    } else if (step === "CAPTURE") {
      if (kioskSettings.isPhotoSessionTimerEnabled) {
        seconds = (kioskSettings.photoSessionTimer || 3) * 60;
      }
    } else if (step === "SELECT_PHOTOS") {
      if (kioskSettings.isPhotoSelectionTimerEnabled) {
        seconds = (kioskSettings.photoSelectionTimer || 3) * 60;
      }
    } else if (step === "FILTER" || step === "PRINT_QUANTITY") {
      if (kioskSettings.isPhotoFilterTimerEnabled) {
        seconds = (kioskSettings.photoFilterTimer || 3) * 60;
      }
    } else if (step === "DONE") {
      if (kioskSettings.isResultTimerEnabled && uploadPhase === "complete") {
        seconds = (kioskSettings.resultTimer || 60) * 60;
      }
    } else if (step === "REVIEW") {
      if (kioskSettings.isResultTimerEnabled && !isUploadingCloud) {
        seconds = (kioskSettings.resultTimer || 60) * 60;
      }
    }

    const prevSettingValue = lastDurationsRef.current[step];
    // Hanya update stepTimer jika nilainya saat ini null, ATAU jika durasi di setingan admin diubah secara real-time
    if (seconds !== prevSettingValue || stepTimer === null) {
      setStepTimer(seconds);
      lastDurationsRef.current[step] = seconds;
    }
  }, [step, kioskSettings, isUploadingCloud, uploadPhase]);

  // 2. Loop Interval Timer per Detik
  useEffect(() => {
    if (step === "WELCOME" || stepTimer === null || showToleranceModal || showExpiredModal) return;

    const interval = setInterval(() => {
      setStepTimer((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          setShowExpiredModal(true);
          setTimeout(() => {
            handleGoHome();
            setShowExpiredModal(false);
          }, 5000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, stepTimer, showToleranceModal, showExpiredModal]);

  // 3. Loop Interval Timer Toleransi (90 Detik)
  useEffect(() => {
    if (!showToleranceModal || showExpiredModal) return;

    const interval = setInterval(() => {
      setToleranceTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowToleranceModal(false);
          setShowExpiredModal(true);
          
          // Alihkan ke welcome screen setelah 5 detik
          setTimeout(() => {
            handleGoHome();
            setShowExpiredModal(false);
          }, 5000);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showToleranceModal, showExpiredModal]);

  // 4. Sinkronisasi background — settings tiap 20s, tema tiap 60s (cache lokal sudah instant)
  useEffect(() => {
    if (!apiKey) return;

    let themesTick = 0;
    const interval = setInterval(() => {
      fetch(`${NESTJS_URL}/kiosk/settings?apiKey=${apiKey}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            const normalized = {
              ...data,
              enabledFilters: normalizeEnabledFilters(data.enabledFilters),
            };
            setKioskSettings(normalized);
            writeCachedKioskSettings(apiKey, normalized);
          }
        })
        .catch((err) => console.warn("Background settings sync error:", err));

      themesTick += 1;
      if (themesTick % 3 === 0) {
        fetch(`${NESTJS_URL}/kiosk/themes?apiKey=${apiKey}`, { cache: "no-store" })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) {
              setThemes(data);
              writeCachedKioskThemes(apiKey, data);
            }
          })
          .catch((err) => console.warn("Background themes sync error:", err));
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [apiKey]);

  useEffect(() => {
    const enabled = normalizeEnabledFilters(kioskSettings?.enabledFilters);
    if (enabled.length && !enabled.includes(selectedFilter)) {
      setSelectedFilter(enabled[0] ?? "original");
    }
  }, [kioskSettings?.enabledFilters, selectedFilter]);

  // 5. Remote Lock Effect: Reset timer dan kembalikan ke WELCOME jika ter-kunci
  useEffect(() => {
    if (kioskSettings?.isKioskLocked) {
      setStepTimer(null);
      setShowToleranceModal(false);
      setShowExpiredModal(false);
      handleGoHome();
    }
  }, [kioskSettings?.isKioskLocked]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Alur Hitung Mundur Pemotretan Manual
  const startCaptureFlow = () => {
    if (countdown !== null || previewPhoto !== null) return;
    setCountdown(kioskSettings?.captureTimer || 5);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      triggerCapture();
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-populate slots when entering SELECT_PHOTOS step
  useEffect(() => {
    if (step === "SELECT_PHOTOS" && selectedFrame) {
      let slots = [];
      try {
        slots = typeof selectedFrame.slots === "string" 
          ? JSON.parse(selectedFrame.slots) 
          : selectedFrame.slots;
      } catch {
        slots = selectedFrame.slots || [];
      }
      const numSlots = selectedFrame.maxSlots || slots?.length || 4;

      setSelectedPhotos((prev) => {
        const next = { ...prev };
        const validPhotos = capturedPhotos.filter(Boolean);
        let photoIndex = 0;

        for (let i = 0; i < numSlots; i++) {
          if (!next[i]) {
            // Find the next available captured photo that isn't already assigned to another slot
            while (
              photoIndex < validPhotos.length &&
              Object.values(next).some((p: any) => p.filename === validPhotos[photoIndex].filename)
            ) {
              photoIndex++;
            }
            if (photoIndex < validPhotos.length) {
              next[i] = validPhotos[photoIndex];
              photoIndex++;
            }
          }
        }
        return next;
      });
    }
  }, [step, selectedFrame, capturedPhotos]);

  // Trigger jepretan kamera
  const triggerCapture = () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    setHasError(false);
    setStatusMessage("Jepret!");

    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 400);

    if (socketRef.current) {
      const duration = kioskSettings?.captureTimer || 5;
      socketRef.current.emit("trigger_capture", { duration });
    } else {
      setTimeout(() => {
        if (step === "SETUP") {
          setTestPhotoUrl("dummy_url");
        } else if (step === "CAPTURE") {
          setPreviewPhoto({ filename: `sim_shot_${Date.now()}.jpg`, local_path: "dummy" });
        } else {
          setCapturedPhotos((prev) => [
            ...prev,
            { filename: `sim_shot_${Date.now()}.jpg`, local_path: "dummy" }
          ]);
        }
        isCapturingRef.current = false;
        setStatusMessage("");
      }, 1500);
    }
  };

  // Memulai Sesi Baru
  const handleStartSession = () => {
    if (themes.length === 0) {
      setStatusMessage("Memuat data tema dari database...");
      loadKioskConfig(apiKey);
    }
    setSessionName(`Dove-${Date.now().toString().slice(-6)}`);
    setCapturedPhotos([]);
    setSelectedPhotos({});
    setCurrentShotIndex(0);
    setPreviewPhoto(null);
    setCountdown(null);
    setPaymentVerified(false);
    setSelectedFilter("original");
    setIsCaptureStarted(false);
    setHasContinuedSession(false);
    setStep(resolveStepAfterWelcome(kioskSettings));
  };

  const handleVerifyPassword = async () => {
    if (!inputPassword) return;
    setIsVerifyingPassword(true);
    setPasswordError("");
    try {
      const res = await fetch(`${NESTJS_URL}/kiosk/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, password: inputPassword }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isValid) {
          setShowPasswordModal(false);
          setStep("SETUP");
        } else {
          setPasswordError("Password yang Anda masukkan salah.");
        }
      } else {
        setPasswordError("Gagal terhubung ke server verifikasi.");
      }
    } catch (err) {
      setPasswordError("Terjadi kesalahan koneksi server.");
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleVirtualKeyPress = (char: string) => {
    if (!activeInputField) return;
    if (activeInputField === "name") {
      setCustomerName((prev) => prev + char);
    } else if (activeInputField === "email") {
      setCustomerEmail((prev) => prev + char);
    } else if (activeInputField === "phone") {
      if (/^[0-9]$/.test(char)) {
        setCustomerPhone((prev) => prev + char);
      }
    }
  };

  const handleVirtualBackspace = () => {
    if (!activeInputField) return;
    if (activeInputField === "name") {
      setCustomerName((prev) => prev.slice(0, -1));
    } else if (activeInputField === "email") {
      setCustomerEmail((prev) => prev.slice(0, -1));
    } else if (activeInputField === "phone") {
      setCustomerPhone((prev) => prev.slice(0, -1));
    }
  };

  const handleVirtualClear = () => {
    if (!activeInputField) return;
    if (activeInputField === "name") {
      setCustomerName("");
    } else if (activeInputField === "email") {
      setCustomerEmail("");
    } else if (activeInputField === "phone") {
      setCustomerPhone("");
    }
  };

  const handleConfirmPrePaymentForm = () => {
    if (!customerName.trim()) {
      setFormValidationError("Nama Lengkap wajib diisi!");
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes("@") || !customerEmail.includes(".")) {
      setFormValidationError("Email tidak valid!");
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 10) {
      setFormValidationError("No HP tidak valid (minimal 10 digit)!");
      return;
    }

    setFormValidationError("");
    setShowPrePaymentForm(false);
    setStep(resolveStepAfterFilter(kioskSettings));
    if (kioskSettings?.isPaymentEnabled) {
      generateCheckout();
    }
  };

  const renderKeyboard = () => {
    const keyBaseStyle = {
      backgroundColor: theme.textColorHex,
      color: theme.buttonTextColor,
      borderColor: `${theme.textColorHex}66`,
    };
    const keySpecialStyle = {
      backgroundColor: theme.accent,
      color: theme.buttonTextColor,
      borderColor: theme.textColorHex,
    };
    const keyMutedStyle = {
      backgroundColor: theme.isLight ? `${theme.textColorHex}dd` : theme.buttonColor,
      color: theme.buttonTextColor,
      borderColor: theme.textColorHex,
    };

    if (activeInputField === "phone") {
      const numKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Hapus Semua", "0", "Hapus"];
      return (
        <div className="grid grid-cols-3 gap-2 w-full max-w-sm mx-auto">
          {numKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key === "Hapus") handleVirtualBackspace();
                else if (key === "Hapus Semua") handleVirtualClear();
                else handleVirtualKeyPress(key);
              }}
              className="h-14 font-bold border-2 active:scale-95 transition rounded-xl text-lg flex items-center justify-center cursor-pointer shadow-sm"
              style={key === "Hapus" || key === "Hapus Semua" ? keySpecialStyle : keyBaseStyle}
            >
              {key}
            </button>
          ))}
        </div>
      );
    }

    const qwertyRows = isShiftActive
      ? [
          ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
          ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
          ["A", "S", "D", "F", "G", "H", "J", "K", "L", "@"],
          ["SHIFT", "Z", "X", "C", "V", "B", "N", "M", ".", "BACKSPACE"],
          ["CLEAR", "SPACE", "_", "-"]
        ]
      : [
          ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
          ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
          ["a", "s", "d", "f", "g", "h", "j", "k", "l", "@"],
          ["SHIFT", "z", "x", "c", "v", "b", "n", "m", ".", "BACKSPACE"],
          ["CLEAR", "SPACE", "_", "-"]
        ];

    return (
      <div className="flex flex-col gap-2 w-full max-w-2xl mx-auto">
        {qwertyRows.map((row, rIdx) => (
          <div key={rIdx} className="flex gap-1.5 justify-center">
            {row.map((key) => {
              let widthClass = "flex-1";
              let keyStyle = keyBaseStyle;
              if (key === "SPACE") {
                widthClass = "w-44 flex-grow-0";
                keyStyle = keyMutedStyle;
              } else if (key === "SHIFT") {
                widthClass = "px-4 flex-grow-0";
                keyStyle = isShiftActive ? keySpecialStyle : keyMutedStyle;
              } else if (key === "BACKSPACE" || key === "CLEAR") {
                widthClass = "px-4 flex-grow-0";
                keyStyle = keySpecialStyle;
              }

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === "BACKSPACE") handleVirtualBackspace();
                    else if (key === "CLEAR") handleVirtualClear();
                    else if (key === "SHIFT") setIsShiftActive(!isShiftActive);
                    else if (key === "SPACE") handleVirtualKeyPress(" ");
                    else {
                      handleVirtualKeyPress(key);
                      if (isShiftActive) setIsShiftActive(false);
                    }
                  }}
                  className={`h-12 ${widthClass} font-semibold border-2 active:scale-95 transition rounded-lg text-sm flex items-center justify-center cursor-pointer shadow-sm`}
                  style={keyStyle}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const savePhoto = () => {
    if (!previewPhoto) return;
    
    setCapturedPhotos((prev) => {
      const nextPhotos = [...prev];
      nextPhotos[currentShotIndex] = previewPhoto;
      return nextPhotos;
    });
    setPreviewPhoto(null);
    
    setTimeout(() => {
      setCapturedPhotos((latestPhotos) => {
        const maxShots = kioskSettings?.maxCapturePhotos || 8;
        let nextIdx = -1;
        for (let i = 0; i < maxShots; i++) {
          if (!latestPhotos[i]) {
            nextIdx = i;
            break;
          }
        }
        if (nextIdx === -1) {
          setCurrentShotIndex(maxShots);
        } else {
          setCurrentShotIndex(nextIdx);
        }
        return latestPhotos;
      });
    }, 0);
  };

  const discardPhoto = () => {
    setCapturedPhotos((prev) => {
      const nextPhotos = [...prev];
      nextPhotos[currentShotIndex] = null;
      return nextPhotos;
    });
    setPreviewPhoto(null);
  };

  const handleSelectThumbnail = (index: number) => {
    if (countdown !== null) return;
    const photo = capturedPhotos[index];
    if (photo) {
      setCurrentShotIndex(index);
      setPreviewPhoto(photo);
    }
  };

  // Assign photo ke slot layout
  const handleAssignPhotoToSlot = (photo: any) => {
    if (!selectedFrame) return;
    setSelectedPhotos((prev) => ({
      ...prev,
      [activeSlot]: photo
    }));
    
    const nextSlot = activeSlot + 1;
    if (nextSlot < selectedFrame.maxSlots) {
      setActiveSlot(nextSlot);
    }
  };

  // Ulangi pengambilan foto (Retake session)
  const handleRetakeAll = () => {
    if (localVideoUrl) {
      URL.revokeObjectURL(localVideoUrl);
      setLocalVideoUrl(null);
    }
    if (localLiveUrl) {
      URL.revokeObjectURL(localLiveUrl);
      setLocalLiveUrl(null);
    }
    setCapturedPhotos([]);
    setSelectedPhotos({});
    setCurrentShotIndex(0);
    setPreviewPhoto(null);
    setIsCaptureStarted(false);
    setStep("CAPTURE");
  };

  // Menggabungkan Canvas secara Asinkron
  const shouldPrintBorderless = (frame: Frame | null) => {
    if (!frame?.outputWidth || !frame?.outputHeight) return false;
    return isA4FrameSize(frame.outputWidth, frame.outputHeight);
  };

  const drawCanvas = (isBorderless = false): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!selectedFrame) return resolve(null);

      const canvas = document.createElement("canvas");
      const W = selectedFrame.outputWidth || 1080;
      const H = selectedFrame.outputHeight || 1920;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);

      if (!isBorderless) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);
      }

      const frameImg = new Image();
      frameImg.crossOrigin = "anonymous";
      frameImg.src = selectedFrame.imageUrl;

      frameImg.onload = async () => {
        if (selectedFrame.framePosition === "background") {
          ctx.drawImage(frameImg, 0, 0, W, H);
        }

        let slots = [];
        try {
          slots = typeof selectedFrame.slots === "string" 
            ? JSON.parse(selectedFrame.slots) 
            : selectedFrame.slots;
        } catch {
          slots = selectedFrame.slots || [];
        }
        for (let i = 0; i < slots.length; i++) {
          const photoData = selectedPhotos[i % selectedFrame.maxSlots];
          const slot = slots[i];
          if (!photoData || !slot) continue;

          const photoImg = new Image();
          photoImg.crossOrigin = "anonymous";
          photoImg.src = `${CAMERA_URL}/photos/${photoData.filename}`;

          await new Promise<void>((rResolve) => {
            photoImg.onload = () => {
              const sx = slot.x * W;
              const sy = slot.y * H;
              const sw = slot.width * W;
              const sh = slot.height * H;
              const r = slot.borderRadius || 0;
              const rot = slot.rotation || 0;

              ctx.save();
              applySlotTransformAndClip(ctx, sx, sy, sw, sh, rot, r, isBorderless ? 0 : 2);

              if (isLayoutMirrored) {
                ctx.translate(sx + sw / 2, sy + sh / 2);
                ctx.scale(-1, 1);
                ctx.translate(-(sx + sw / 2), -(sy + sh / 2));
              }

              const imgAspect = photoImg.width / photoImg.height;
              const targetAspect = sw / sh;
              let dw = sw, dh = sh, ox = 0, oy = 0;

              if (imgAspect > targetAspect) {
                dw = sh * imgAspect;
                ox = (sw - dw) / 2;
              } else {
                dh = sw / imgAspect;
                oy = (sh - dh) / 2;
              }

              drawImageWithArtisticFilter(
                ctx,
                photoImg,
                sx + ox,
                sy + oy,
                dw,
                dh,
                selectedFilter,
              );
              ctx.restore();
              rResolve();
            };
            photoImg.onerror = () => rResolve();
          });
        }

        if (selectedFrame.framePosition !== "background") {
          ctx.drawImage(frameImg, 0, 0, W, H);
        }

        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/png");
      };

      frameImg.onerror = () => resolve(null);
    });
  };

  // Sintesis Video Loop MP4 (Looping GIF 4 detik)
  const generateLoopMp4 = async (slices: HTMLImageElement[], dbFrame: any): Promise<Blob | null> => {
    return new Promise(async (resolve) => {
      try {
        const srcW = dbFrame.outputWidth || 1080;
        const srcH = dbFrame.outputHeight || 1920;
        const { width: W, height: H } = getVideoEncodeDimensions(srcW, srcH);
        const loopDurationSec = 4;
        const bitrate = computeBitrateForBudget(VIDEO_BUDGET_MAX_BYTES, loopDurationSec);
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return resolve(null);

        const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : (canvas as any).webkitCaptureStream?.(30);
        if (!stream) return resolve(null);

        let mimeType = 'video/mp4;codecs=h264';
        if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4;codecs=avc1';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/mp4';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = 'video/webm';
            }
          }
        }

        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        
        const videoPromise = new Promise<Blob>((res) => {
          recorder.onstop = () => res(new Blob(chunks, { type: mimeType }));
        });

        const frameImg = new Image();
        frameImg.crossOrigin = "anonymous";
        frameImg.src = dbFrame.imageUrl;

        frameImg.onload = async () => {
          let slots = [];
          try {
            slots = typeof dbFrame.slots === "string" ? JSON.parse(dbFrame.slots) : dbFrame.slots;
          } catch {
            slots = dbFrame.slots || [];
          }

          const filteredSlices = await Promise.all(
            slices.map((img) => prefetchFilteredImage(img, selectedFilter)),
          );

          recorder.start();
          const duration = 4000;
          const startTime = performance.now();

          await new Promise<void>((rResolve) => {
            const render = () => {
              const elapsed = performance.now() - startTime;
              if (elapsed >= duration) {
                rResolve();
                return;
              }

              const indexOffset = Math.floor(elapsed / 500);

              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, W, H);

              if (dbFrame.framePosition === "background") {
                ctx.drawImage(frameImg, 0, 0, W, H);
              }
              for (let i = 0; i < slots.length; i++) {
                const photoImg = filteredSlices[((i % dbFrame.maxSlots) + indexOffset) % filteredSlices.length];
                const slot = slots[i];
                if (!photoImg || !slot) continue;

                const sx = slot.x * W;
                const sy = slot.y * H;
                const sw = slot.width * W;
                const sh = slot.height * H;
                const r = slot.borderRadius || 0;
                const rot = slot.rotation || 0;

                ctx.save();
                applySlotTransformAndClip(ctx, sx, sy, sw, sh, rot, r, 2);

                if (isLayoutMirrored) {
                  ctx.translate(sx + sw / 2, sy + sh / 2);
                  ctx.scale(-1, 1);
                  ctx.translate(-(sx + sw / 2), -(sy + sh / 2));
                }

                const imgAspect = photoImg.width / photoImg.height;
                const targetAspect = sw / sh;
                let dw = sw, dh = sh, ox = 0, oy = 0;

                if (imgAspect > targetAspect) {
                  dw = sh * imgAspect;
                  ox = (sw - dw) / 2;
                } else {
                  dh = sw / imgAspect;
                  oy = (sh - dh) / 2;
                }

                ctx.drawImage(photoImg, sx + ox, sy + oy, dw, dh);
                ctx.restore();
              }

              if (dbFrame.framePosition !== "background") {
                ctx.drawImage(frameImg, 0, 0, W, H);
              }

              requestAnimationFrame(render);
            };
            requestAnimationFrame(render);
          });

          recorder.stop();
          const videoBlob = await videoPromise;
          resolve(videoBlob);
        };

        frameImg.onerror = () => resolve(null);
      } catch (err) {
        console.error(err);
        resolve(null);
      }
    });
  };

  // Sintesis Video Live Photo MP4 (Setiap slot berisi video Live Photo)
  const generateLiveMp4 = async (liveImages: (HTMLImageElement | HTMLVideoElement)[], dbFrame: any): Promise<Blob | null> => {
    return new Promise(async (resolve) => {
      try {
        const srcW = dbFrame.outputWidth || 1080;
        const srcH = dbFrame.outputHeight || 1920;
        const { width: W, height: H } = getVideoEncodeDimensions(srcW, srcH);
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return resolve(null);

        const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : (canvas as any).webkitCaptureStream?.(30);
        if (!stream) return resolve(null);

        let mimeType = 'video/mp4;codecs=h264';
        if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4;codecs=avc1';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/mp4';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = 'video/webm';
            }
          }
        }

        const estimatedLiveSec = Math.min(8, (kioskSettings?.captureTimer || 5) + 0.5);
        const bitrate = computeBitrateForBudget(VIDEO_BUDGET_MAX_BYTES, estimatedLiveSec);

        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        
        const videoPromise = new Promise<Blob>((res) => {
          recorder.onstop = () => res(new Blob(chunks, { type: mimeType }));
        });

        const frameImg = new Image();
        frameImg.crossOrigin = "anonymous";
        frameImg.src = dbFrame.imageUrl;

        frameImg.onload = async () => {
          let slots = [];
          try {
            slots = typeof dbFrame.slots === "string" ? JSON.parse(dbFrame.slots) : dbFrame.slots;
          } catch {
            slots = dbFrame.slots || [];
          }

          const videoEls = liveImages.filter(
            (el): el is HTMLVideoElement => el instanceof HTMLVideoElement,
          );
          videoEls.forEach((v) => {
            v.loop = false;
            v.currentTime = 0;
          });

          const videoDurations = videoEls
            .map((v) => v.duration)
            .filter((d) => Number.isFinite(d) && d > 0);
          const motionMs =
            videoDurations.length > 0
              ? Math.max(...videoDurations) * 1000
              : (kioskSettings?.captureTimer || 5) * 1000;
          const holdMs = 500;
          const totalMs = Math.min(motionMs + holdMs, 8000);

          await Promise.all(
            videoEls.map((v) => v.play().catch(() => undefined)),
          );

          recorder.start();
          const startTime = performance.now();

          await new Promise<void>((rResolve) => {
            const render = () => {
              const elapsed = performance.now() - startTime;
              if (elapsed >= totalMs) {
                rResolve();
                return;
              }

              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, W, H);

              if (dbFrame.framePosition === "background") {
                ctx.drawImage(frameImg, 0, 0, W, H);
              }

              for (let i = 0; i < slots.length; i++) {
                const photoImg = liveImages[i % dbFrame.maxSlots];
                const slot = slots[i];
                if (!photoImg || !slot) continue;

                const sx = slot.x * W;
                const sy = slot.y * H;
                const sw = slot.width * W;
                const sh = slot.height * H;
                const r = slot.borderRadius || 0;
                const rot = slot.rotation || 0;

                ctx.save();
                applySlotTransformAndClip(ctx, sx, sy, sw, sh, rot, r, 2);
                ctx.filter = getCssFilterFallback(selectedFilter);

                if (isLayoutMirrored) {
                  ctx.translate(sx + sw / 2, sy + sh / 2);
                  ctx.scale(-1, 1);
                  ctx.translate(-(sx + sw / 2), -(sy + sh / 2));
                }

                const imgWidth = (photoImg as HTMLVideoElement).videoWidth || photoImg.width || 640;
                const imgHeight = (photoImg as HTMLVideoElement).videoHeight || photoImg.height || 480;
                const imgAspect = imgWidth / imgHeight;
                const targetAspect = sw / sh;
                let dw = sw, dh = sh, ox = 0, oy = 0;

                if (imgAspect > targetAspect) {
                  dw = sh * imgAspect;
                  ox = (sw - dw) / 2;
                } else {
                  dh = sw / imgAspect;
                  oy = (sh - dh) / 2;
                }

                ctx.drawImage(photoImg, sx + ox, sy + oy, dw, dh);
                ctx.restore();
              }

              if (dbFrame.framePosition !== "background") {
                ctx.drawImage(frameImg, 0, 0, W, H);
              }

              requestAnimationFrame(render);
            };
            requestAnimationFrame(render);
          });

          recorder.stop();
          const videoBlob = await videoPromise;

          // Clean up video elements to prevent resource/CPU leaks
          liveImages.forEach((el) => {
            if (el instanceof HTMLVideoElement) {
              try {
                el.pause();
                el.src = "";
                el.load();
              } catch (e) {
                console.warn("Error cleaning up video element", e);
              }
            }
          });

          resolve(videoBlob);
        };

        frameImg.onerror = () => resolve(null);
      } catch (err) {
        console.error(err);
        resolve(null);
      }
    });
  };

  // Navigasi ke Sesi Pembayaran / Review
  const handleProceedToPayment = async () => {
    if (!selectedFrame) return;

    if (kioskSettings?.isPaymentEnabled) {
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setPrintQuantity(1);
      setFormValidationError("");
      setActiveInputField("name");
      setShowPrePaymentForm(true);
    } else {
      setPrintQuantity(1);
      setStep(resolveStepAfterFilter(kioskSettings));
    }
  };

  // Buat QRIS Pembayaran Doku
  const generateCheckout = async () => {
    setIsProcessingPayment(true);
    setPaymentError("");
    setCheckoutData(null);
    setStatusMessage("Menghubungi gateway pembayaran DOKU...");

    try {
      const res = await fetch(`${NESTJS_URL}/kiosk/payment/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          userName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          frameId: selectedFrame?.id,
          frameName: selectedFrame?.name,
          quantity: printQuantity,
        }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        setCheckoutData({
          paymentUrl: data.url,
          orderId: data.orderId,
          isFree: data.isFree || false,
          totalPrice:
            data.totalPrice ||
            (selectedTheme?.price ?? selectedFrame?.price ?? 5000) * printQuantity,
        });
        setIsProcessingPayment(false);
        setStatusMessage("Silakan scan QRIS di bawah untuk membayar");

        if (data.isFree) {
          setPaymentVerified(true);
          handleProceedToReview();
        }
      } else {
        console.error("Doku checkout error:", data);
        const message = Array.isArray(data?.message)
          ? data.message.join(", ")
          : typeof data?.message === "string"
            ? data.message
            : data?.error || "Gagal membuat sesi pembayaran DOKU.";
        throw new Error(message);
      }
    } catch (err) {
      console.error("generateCheckout exception:", err);
      setIsProcessingPayment(false);
      const message = (err as Error).message || "Gagal terhubung ke gateway pembayaran";
      setPaymentError(message);
      setStatusMessage(`Gagal terhubung ke gateway pembayaran: ${message}`);
    }
  };

  const uploadKioskAsset = async (
    assetId: string,
    blob: Blob,
    filename: string,
  ) => {
    const formData = new FormData();
    formData.append("file", blob, filename);
    const res = await fetch(
      `${NESTJS_URL}/kiosk/upload-final?apiKey=${encodeURIComponent(apiKey)}&id=${assetId}`,
      { method: "POST", body: formData },
    );
    if (!res.ok) {
      throw new Error(`Upload gagal: ${filename}`);
    }
    return res.json();
  };

  const patchUploadItem = (id: string, status: UploadItem["status"]) => {
    setUploadItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  };

  const resolvePrinterForPrint = async (): Promise<string | null> => {
    const saved = readSavedPrinterName();
    if (saved) return saved;

    try {
      const res = await fetch(`${CAMERA_URL}/printers`);
      if (!res.ok) return null;
      const data = await res.json();
      return (
        resolvePreferredPrinter(data.printers || [], data.default_printer || "") ||
        null
      );
    } catch {
      return null;
    }
  };

  const sendInstantPrint = async (blob: Blob, qty: number) => {
    if (qty < 1) {
      setPrintStatus("idle");
      return;
    }

    setPrintStatus("printing");
    try {
      const printer = await resolvePrinterForPrint();
      const formData = new FormData();
      formData.append("file", blob, "print.png");

      let url = `${CAMERA_URL}/print-upload?quantity=${qty}`;
      if (printer) {
        url += `&printer_name=${encodeURIComponent(printer)}`;
      }
      const savedMedia = readSavedPrintMediaForFrame(
        selectedFrame?.outputWidth,
        selectedFrame?.outputHeight,
      );
      if (savedMedia) {
        url += `&media=${encodeURIComponent(savedMedia)}`;
      }
      if (selectedFrame?.outputWidth && selectedFrame?.outputHeight) {
        url += `&output_width=${selectedFrame.outputWidth}&output_height=${selectedFrame.outputHeight}`;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "X-API-Key": CAMERA_API_SECRET },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Gagal mengirim perintah cetak");
      }

      setPrintStatus("sent");
    } catch (err) {
      console.error("Instant print error:", err);
      setPrintStatus("error");
    }
  };

  const runTrackedUpload = async (
    item: UploadItem,
    task: () => Promise<void>,
  ) => {
    patchUploadItem(item.id, "uploading");
    try {
      await task();
      patchUploadItem(item.id, "done");
    } catch (err) {
      console.error(`Upload error (${item.id}):`, err);
      patchUploadItem(item.id, "error");
      throw err;
    }
  };

  const handleProceedToReview = async () => {
    if (!selectedFrame) return;

    setStep("DONE");
    setUploadPhase("compiling");
    setUploadItems([]);
    setUploadError("");
    setIsUploadingCloud(true);
    setPrintStatus(printQuantity > 0 ? "printing" : "idle");
    setStatusMessage("");

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    const id = `${sessionName}-${Date.now()}`;
    setSessionId(id);
    const photoKeys = Object.keys(selectedPhotos);
    const frame = selectedFrame;

    const loadImage = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    const loadVideo = (src: string): Promise<HTMLVideoElement> =>
      new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.src = src;
        video.crossOrigin = "anonymous";
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.onloadeddata = () => {
          video
            .play()
            .then(() => resolve(video))
            .catch(() => resolve(video));
        };
        video.onerror = (err) => reject(err);
      });

    const loadLiveVideo = (src: string): Promise<HTMLVideoElement> =>
      new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.src = src;
        video.crossOrigin = "anonymous";
        video.loop = false;
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        video.onloadedmetadata = () => resolve(video);
        video.onerror = (err) => reject(err);
      });

    try {
      const [pngBlob, printBlob] = await Promise.all([
        drawCanvas(true),
        drawCanvas(shouldPrintBorderless(frame)),
      ]);

      printBlobRef.current = printBlob;

      if (pngBlob) {
        setPreviewUrl(URL.createObjectURL(pngBlob));
      }

      const photoElements = await Promise.all(
        Object.values(selectedPhotos).map((photo) =>
          loadImage(`${CAMERA_URL}/photos/${photo.filename}`),
        ),
      );

      let mp4Blob = await generateLoopMp4(photoElements, frame);
      if (mp4Blob) {
        try {
          mp4Blob = await ensureMobileMp4ViaCamera(mp4Blob, CAMERA_URL, CAMERA_API_SECRET);
        } catch (err) {
          console.warn("Bonus MP4 transcode skipped:", err);
        }
        setLocalVideoUrl(URL.createObjectURL(mp4Blob));
      }

      const livePhotoElements = await Promise.all(
        Array.from({ length: frame.maxSlots }).map(async (_, idx) => {
          const photo = selectedPhotos[idx];
          if (photo?.live_photo) {
            try {
              return await loadLiveVideo(`${CAMERA_URL}/photos/${photo.live_photo}`);
            } catch {
              /* fallback below */
            }
          }
          if (photo?.filename) {
            try {
              return await loadImage(`${CAMERA_URL}/photos/${photo.filename}`);
            } catch {
              /* fallback below */
            }
          }
          return loadImage(
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          );
        }),
      );

      let liveMp4Blob = await generateLiveMp4(livePhotoElements, frame);
      if (liveMp4Blob) {
        try {
          liveMp4Blob = await ensureMobileMp4ViaCamera(liveMp4Blob, CAMERA_URL, CAMERA_API_SECRET);
        } catch (err) {
          console.warn("Live photo MP4 transcode skipped:", err);
        }
        setLocalLiveUrl(URL.createObjectURL(liveMp4Blob));
      }

      const plannedItems: UploadItem[] = [
        { id: "main", label: "Foto hasil (PNG)", status: "pending" },
        { id: "meta", label: "Metadata sesi", status: "pending" },
        ...photoKeys.map((key) => ({
          id: `orig-${key}`,
          label: `Foto asli slot ${parseInt(key, 10) + 1}`,
          status: "pending" as const,
        })),
        { id: "loop", label: "GIF / Video loop", status: "pending" },
        { id: "live", label: "Live Photo (MP4)", status: "pending" },
      ];

      setUploadItems(plannedItems);
      setUploadPhase("uploading");

      if (printBlob) {
        void sendInstantPrint(printBlob, printQuantity);
      } else {
        setPrintStatus("error");
      }

      const uploadJobs = plannedItems.map((item) => {
        if (item.id === "main") {
          return runTrackedUpload(item, async () => {
            if (!pngBlob) throw new Error("PNG utama kosong");
            const result = await uploadKioskAsset(id, pngBlob, "final.png");
            if (result?.url) setCloudMainUrl(result.url);
          });
        }

        if (item.id === "meta") {
          return runTrackedUpload(item, async () => {
            await uploadKioskAsset(
              `${id}-meta`,
              new Blob([JSON.stringify({ count: photoKeys.length })], {
                type: "application/json",
              }),
              "meta.json",
            );
          });
        }

        if (item.id.startsWith("orig-")) {
          const key = item.id.replace("orig-", "");
          const idx = parseInt(key, 10);
          return runTrackedUpload(item, async () => {
            const photo = selectedPhotos[idx];
            if (!photo?.filename) return;
            const photoRes = await fetch(`${CAMERA_URL}/photos/${photo.filename}`);
            if (!photoRes.ok) throw new Error("Foto asli tidak ditemukan");
            const photoBlob = await photoRes.blob();
            await uploadKioskAsset(`${id}-orig-${idx}`, photoBlob, `orig-${idx}.png`);
          });
        }

        if (item.id === "loop") {
          return runTrackedUpload(item, async () => {
            if (!mp4Blob) throw new Error("Video loop belum siap");
            await uploadKioskAsset(`${id}-bonus`, mp4Blob, "bonus.mp4");
          });
        }

        if (item.id === "live") {
          return runTrackedUpload(item, async () => {
            if (!liveMp4Blob) throw new Error("Live photo belum siap");
            await uploadKioskAsset(`${id}-live`, liveMp4Blob, "live.mp4");
          });
        }

        return Promise.resolve();
      });

      void (async () => {
        const price = selectedTheme?.price ?? frame?.price ?? 5000;
        try {
          await fetch(`${NESTJS_URL}/kiosk/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              apiKey,
              userName: customerName || sessionName,
              customerEmail: customerEmail || null,
              customerPhone: customerPhone || null,
              frameId: frame?.id,
              frameName: frame?.name,
              quantity: printQuantity,
              pricePerFrame: price,
              totalPrice: price * printQuantity,
              imageUrl: `${adminUrl}/download/${id}`,
              paymentStatus: "paid",
            }),
          });
        } catch (err) {
          console.warn("Order log failed:", err);
        }
      })();

      const results = await Promise.allSettled(uploadJobs);
      const mainFailed = results.some(
        (result, index) =>
          plannedItems[index]?.id === "main" && result.status === "rejected",
      );

      if (mainFailed) {
        setUploadPhase("error");
        setUploadError("Foto utama gagal diupload. Periksa koneksi internet dan coba sesi baru.");
      } else {
        setUploadPhase("complete");
      }

      setIsUploadingCloud(false);
    } catch (err) {
      console.error("Finalize session error:", err);
      setUploadPhase("error");
      setUploadError(
        (err as Error).message || "Gagal menyiapkan atau mengupload file sesi.",
      );
      setIsUploadingCloud(false);
      setPrintStatus((prev) => (prev === "printing" ? "error" : prev));
    }
  };

  const handlePrint = async (qty?: number) => {
    const activeQty = qty !== undefined ? qty : printQuantity;
    if (qty !== undefined) {
      setPrintQuantity(qty);
    }

    let blob = printBlobRef.current;
    if (!blob) {
      try {
        blob = await drawCanvas(shouldPrintBorderless(selectedFrame));
        printBlobRef.current = blob;
      } catch (err) {
        console.error("Gagal merender canvas cetak:", err);
      }
    }

    if (!blob) {
      alert("Gagal merender canvas cetak.");
      return;
    }

    await sendInstantPrint(blob, activeQty);
  };

  // Dapatkan link download QR Code untuk HP pelanggan
  const getShareUrl = () => {
    return `${adminUrl}/download/${sessionId}`;
  };

  return (
    <KioskThemeProvider settings={kioskSettings}>
    <main 
      className={`relative w-full min-h-screen transition-all duration-500 ${
        step === "WELCOME"
          ? "h-screen overflow-hidden"
          : step === "SETUP"
            ? "min-h-screen h-screen overflow-y-auto flex flex-col items-stretch px-3 sm:px-4 py-4 sm:py-6"
            : step === "CAPTURE"
              ? "h-screen overflow-hidden flex flex-col"
              : step === "DONE"
                ? "h-screen overflow-hidden flex items-center justify-center px-2 sm:px-4"
              : "h-screen overflow-hidden flex items-center justify-center"
      }`}
      style={{ 
        background: theme.bgStyle,
        fontFamily: theme.fontFamily,
        color: theme.textColorHex,
      }}
    >
      {step === "WELCOME" && theme.bgImageUrl && (
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-500 z-0"
          style={{
            backgroundImage: `url(${theme.bgImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: theme.bgImageOpacity,
          }}
        />
      )}

      {theme.showBgDots && (
        <div 
          className="absolute inset-0 opacity-[0.08] pointer-events-none [background-size:24px_24px] z-0" 
          style={{ 
            backgroundImage: `radial-gradient(${theme.dotColor} 1.5px, transparent 1.5px)` 
          }} 
        />
      )}

      {/* Efek Flash Jepret Layar */}
      <AnimatePresence>
        {isFlashActive && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Header Status Bar Kiosk — hanya di halaman welcome */}
      {step === "WELCOME" && (
        <div
          className="absolute top-6 left-6 z-40 flex items-center gap-3 px-4 py-2 rounded-2xl border backdrop-blur text-xs"
          style={cardSurfaceStyle(theme)}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.accent }} />
          <span>Kiosk Client: {theme.brandName}</span>
        </div>
      )}

      {/* Timer Pill at top center */}
      {stepTimer !== null && stepTimer > 0 && step !== "SETUP" && step !== "WELCOME" && (
        <div 
          className={`absolute top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-5 py-2.5 rounded-full border backdrop-blur text-xs font-bold transition shadow-lg ${
            stepTimer < 30 
              ? "bg-red-950/80 border-red-500/40 text-red-200 animate-pulse animate-duration-500" 
              : ""
          }`}
          style={stepTimer < 30 ? undefined : cardSurfaceStyle(theme)}
        >
          <Clock 
            className={`w-3.5 h-3.5 ${stepTimer < 30 ? "text-red-400 animate-spin" : ""}`} 
            style={stepTimer < 30 ? { animationDuration: '3s' } : { color: theme.accent }} 
          />
          <span>Sisa Waktu: {formatTime(stepTimer)}</span>
        </div>
      )}

      {/* Tombol setup — hanya di halaman welcome */}
      {step === "WELCOME" && (
        <button 
          onClick={() => {
            if (apiKey) {
              setShowPasswordModal(true);
              setInputPassword("");
              setPasswordError("");
            } else {
              setStep("SETUP");
            }
          }}
          className="absolute top-6 right-6 z-40 p-2 rounded-xl transition border"
          style={{ color: theme.subtextColorHex, borderColor: theme.surfaceBorder }}
          title="Setup Koneksi"
        >
          <Lock className="w-4 h-4" />
        </button>
      )}

      <AnimatePresence mode="wait">
        {step === "SETUP" && (
          <div className="relative z-10 w-full flex justify-center items-start py-2 sm:py-4">
            <SetupStep
            inputApiKey={inputApiKey}
            setInputApiKey={setInputApiKey}
            statusMessage={statusMessage}
            kioskSettings={kioskSettings}
            cameraStatus={cameraStatus}
            cameraLiveUrl={`${CAMERA_URL}/live-view?k=${liveViewKey}`}
            onReconnectCamera={() => void fetchCameraStatus({ silent: true, forceReconnect: true })}
            testPhotoUrl={testPhotoUrl}
            setTestPhotoUrl={setTestPhotoUrl}
            loadKioskConfig={loadKioskConfig}
            setStep={setStep}
            triggerCapture={triggerCapture}
            printers={printers}
            defaultPrinter={defaultPrinter}
            selectedPrinter={selectedPrinter}
            onSelectPrinter={handleSelectPrinter}
            triggerTestPrint={triggerTestPrint}
            printerLoading={printerLoading}
            isTestPrinting={isTestPrinting}
            printerMessage={printerMessage}
            printerServiceOk={printerServiceOk}
          />
          </div>
        )}

        {step === "WELCOME" && (
          <WelcomeStep
            handleStartSession={handleStartSession}
            isPaymentEnabled={kioskSettings?.isPaymentEnabled === true}
          />
        )}

        {step === "SELECT_THEME" && (
          <SelectThemeStep
            themes={themes}
            setSelectedTheme={setSelectedTheme}
            setSelectedFrame={setSelectedFrame}
            setStep={setStep}
            adminUrl={adminUrl}
            isPaymentEnabled={kioskSettings?.isPaymentEnabled === true}
          />
        )}

        {step === "SELECT_FRAME" && (
          <SelectFrameStep
            selectedTheme={selectedTheme}
            selectedFrame={selectedFrame}
            setSelectedFrame={setSelectedFrame}
            setStep={setStep}
            setIsCaptureStarted={setIsCaptureStarted}
            adminUrl={adminUrl}
            isPaymentEnabled={kioskSettings?.isPaymentEnabled !== false}
          />
        )}

        {step === "CAPTURE" && (
          <div className="relative z-10 w-full h-full min-h-0 flex flex-col">
          <CaptureStep
            isCaptureStarted={isCaptureStarted}
            currentShotIndex={currentShotIndex}
            countdown={countdown}
            statusMessage={statusMessage}
            capturedPhotos={capturedPhotos}
            kioskSettings={kioskSettings}
            handleRetakeAll={handleRetakeAll}
            previewPhoto={previewPhoto}
            startCaptureFlow={startCaptureFlow}
            savePhoto={savePhoto}
            discardPhoto={discardPhoto}
            setStep={setStep}
            setActiveSlot={setActiveSlot}
            handleSelectThumbnail={handleSelectThumbnail}
          />
          </div>
        )}

        {step === "SELECT_PHOTOS" && (
          <SelectPhotosStep
            selectedFrame={selectedFrame}
            selectedPhotos={selectedPhotos}
            activeSlot={activeSlot}
            setActiveSlot={setActiveSlot}
            capturedPhotos={capturedPhotos}
            handleAssignPhotoToSlot={handleAssignPhotoToSlot}
            handleRetakeAll={handleRetakeAll}
            setStep={setStep}
            adminUrl={adminUrl}
            isLayoutMirrored={isLayoutMirrored}
            setIsLayoutMirrored={setIsLayoutMirrored}
            setSelectedPhotos={setSelectedPhotos}
          />
        )}

        {step === "FILTER" && (
          <FilterStep
            selectedFrame={selectedFrame}
            selectedPhotos={selectedPhotos}
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
            handleProceedToPayment={handleProceedToPayment}
            setStep={setStep}
            adminUrl={adminUrl}
            isLayoutMirrored={isLayoutMirrored}
            enabledFilters={kioskSettings?.enabledFilters}
          />
        )}

        {step === "PRINT_QUANTITY" && (
          <PrintQuantityStep
            selectedFrame={selectedFrame}
            selectedPhotos={selectedPhotos}
            selectedFilter={selectedFilter}
            printQuantity={printQuantity}
            setPrintQuantity={setPrintQuantity}
            onConfirm={handleProceedToReview}
            setStep={setStep}
            adminUrl={adminUrl}
            isLayoutMirrored={isLayoutMirrored}
          />
        )}

        {step === "PAYMENT" && (
          <div className="absolute inset-0 z-20 flex flex-col">
            <PaymentStep
              selectedFrame={selectedFrame}
              selectedTheme={selectedTheme}
              isProcessingPayment={isProcessingPayment}
              checkoutData={checkoutData}
              paymentError={paymentError}
              onRetryPayment={generateCheckout}
              setPaymentVerified={setPaymentVerified}
              handleProceedToReview={handleProceedToReview}
              printQuantity={printQuantity}
              apiKey={apiKey}
            />
          </div>
        )}

        {step === "REVIEW" && (
          <ReviewStep
            selectedFrame={selectedFrame}
            selectedPhotos={selectedPhotos}
            selectedFilter={selectedFilter}
            isUploadingCloud={isUploadingCloud}
            isPrinting={isPrinting}
            statusMessage={statusMessage}
            getShareUrl={getShareUrl}
            handleGoHome={handleGoHome}
            handlePrint={handlePrint}
            adminUrl={adminUrl}
            localVideoUrl={localVideoUrl}
            localLiveUrl={localLiveUrl}
            isPaymentEnabled={kioskSettings?.isPaymentEnabled !== false}
          />
        )}

        {step === "DONE" && (
          <DoneStep
            uploadPhase={uploadPhase}
            uploadItems={uploadItems}
            uploadError={uploadError}
            previewUrl={previewUrl}
            localVideoUrl={localVideoUrl}
            localLiveUrl={localLiveUrl}
            selectedFrame={selectedFrame}
            selectedPhotos={selectedPhotos}
            selectedFilter={selectedFilter}
            adminUrl={adminUrl}
            printStatus={printStatus}
            printQuantity={printQuantity}
            getShareUrl={getShareUrl}
            handleGoHome={handleGoHome}
            onRetryPrint={() => void handlePrint()}
          />
        )}
      </AnimatePresence>

      {/* Modal Input Form Pelanggan & Keyboard Virtual */}
      <AnimatePresence>
        {showPrePaymentForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6"
          >
            <motion.div
              initial={{ scale: 0.98, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 20 }}
              className="rounded-3xl p-6 md:p-8 max-w-5xl w-full shadow-2xl flex flex-col md:flex-row gap-6 md:gap-8 items-stretch border"
              style={cardSurfaceStyle(theme)}
            >
              {/* Sisi Kiri: Form Input & Jumlah Print */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">Informasi Cetak & Kontak</h3>
                  <p className="text-xs mb-6" style={{ color: theme.subtextColorHex }}>
                    Isi detail data Anda di bawah ini untuk menerima tautan galeri digital dan memproses cetak.
                  </p>

                  <div className="space-y-4">
                    {/* Input Nama */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.subtextColorHex }}>
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        placeholder="Sentuh untuk menulis Nama Anda"
                        value={customerName}
                        onFocus={() => {
                          setActiveInputField("name");
                          setFormValidationError("");
                        }}
                        readOnly
                        className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition cursor-pointer"
                        style={{
                          backgroundColor: theme.isLight ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.4)",
                          color: theme.textColorHex,
                          borderColor: activeInputField === "name" ? theme.accent : theme.surfaceBorder,
                          boxShadow: activeInputField === "name" ? `0 0 0 1px ${theme.accent}33` : undefined,
                        }}
                      />
                    </div>

                    {/* Input Email */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.subtextColorHex }}>
                        Alamat Email
                      </label>
                      <input
                        type="email"
                        placeholder="Sentuh untuk menulis Email Anda"
                        value={customerEmail}
                        onFocus={() => {
                          setActiveInputField("email");
                          setFormValidationError("");
                        }}
                        readOnly
                        className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition cursor-pointer"
                        style={{
                          backgroundColor: theme.isLight ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.4)",
                          color: theme.textColorHex,
                          borderColor: activeInputField === "email" ? theme.accent : theme.surfaceBorder,
                          boxShadow: activeInputField === "email" ? `0 0 0 1px ${theme.accent}33` : undefined,
                        }}
                      />
                    </div>

                    {/* Input No HP */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.subtextColorHex }}>
                        No HP (WhatsApp/Aktif)
                      </label>
                      <input
                        type="text"
                        placeholder="Sentuh untuk menulis No HP"
                        value={customerPhone}
                        onFocus={() => {
                          setActiveInputField("phone");
                          setFormValidationError("");
                        }}
                        readOnly
                        className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition cursor-pointer"
                        style={{
                          backgroundColor: theme.isLight ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.4)",
                          color: theme.textColorHex,
                          borderColor: activeInputField === "phone" ? theme.accent : theme.surfaceBorder,
                          boxShadow: activeInputField === "phone" ? `0 0 0 1px ${theme.accent}33` : undefined,
                        }}
                      />
                    </div>

                    {/* Jumlah Print Counter */}
                    <div className="space-y-1.5 pt-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider block text-center" style={{ color: theme.subtextColorHex }}>
                        Jumlah Salinan Cetak (Prints)
                      </label>
                      <div className="flex items-center justify-center gap-4">
                        <button
                          type="button"
                          onClick={() => setPrintQuantity((prev) => Math.max(1, prev - 1))}
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg border active:scale-95 transition cursor-pointer"
                          style={{ borderColor: theme.surfaceBorder, color: theme.textColorHex, backgroundColor: theme.surfaceBg }}
                        >
                          -
                        </button>
                        <span className="text-xl font-black w-8 text-center">{printQuantity}</span>
                        <button
                          type="button"
                          onClick={() => setPrintQuantity((prev) => Math.min(10, prev + 1))}
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg border active:scale-95 transition cursor-pointer"
                          style={{ borderColor: theme.surfaceBorder, color: theme.textColorHex, backgroundColor: theme.surfaceBg }}
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[10px] text-center" style={{ color: theme.subtextColorHex }}>
                        Total Biaya: Rp {((selectedTheme?.price ?? selectedFrame?.price ?? 5000) * printQuantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  {formValidationError && (
                    <p className="text-[10px] font-semibold text-red-500 text-center">
                      {formValidationError}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPrePaymentForm(false)}
                      className="flex-1 py-3.5 text-xs font-bold rounded-xl transition cursor-pointer border"
                      style={{ borderColor: theme.surfaceBorder, color: theme.subtextColorHex, backgroundColor: theme.surfaceBg }}
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleConfirmPrePaymentForm}
                      className="flex-1 py-3.5 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      style={primaryButtonStyle(theme)}
                    >
                      Lanjut ke Pembayaran
                    </button>
                  </div>
                </div>
              </div>

              {/* Sisi Kanan: Virtual Keyboard */}
              <div
                className="w-full md:w-[480px] rounded-2xl p-4 flex flex-col justify-center items-center border"
                style={cardSurfaceStyle(theme)}
              >
                <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: theme.subtextColorHex }}>
                  Papan Ketik Virtual (Touchscreen)
                </div>
                {activeInputField ? (
                  renderKeyboard()
                ) : (
                  <div className="text-xs text-center py-12 px-6" style={{ color: theme.subtextColorHex }}>
                    Pilih salah satu input di sebelah kiri untuk menulis menggunakan keyboard virtual
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Verifikasi Password Admin */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center border"
              style={cardSurfaceStyle(theme)}
            >
              <div 
                className="w-12 h-12 rounded-2xl border flex items-center justify-center mb-4"
                style={{ backgroundColor: `${theme.accent}1a`, borderColor: `${theme.accent}40`, color: theme.accent }}
              >
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold mb-2">Akses Terkunci</h3>
              <p className="text-xs mb-6" style={{ color: theme.subtextColorHex }}>
                Masukkan password akun admin untuk masuk ke halaman pengaturan koneksi.
              </p>

              <input
                type="password"
                placeholder="Masukkan password admin"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerifyPassword();
                }}
                onFocus={() => setIsPassFocused(true)}
                onBlur={() => setIsPassFocused(false)}
                className="w-full border rounded-xl px-4 py-3 text-center text-sm focus:outline-none transition mb-3"
                style={{
                  backgroundColor: theme.isLight ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.4)",
                  color: theme.textColorHex,
                  borderColor: isPassFocused ? theme.accent : theme.surfaceBorder,
                }}
                autoFocus
              />

              {passwordError && (
                <p className="text-[10px] font-semibold text-red-500 mb-4">
                  {passwordError}
                </p>
              )}

              <div className="flex gap-2 w-full mt-2">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  disabled={isVerifyingPassword}
                  className="flex-1 py-3 text-xs font-bold rounded-xl transition cursor-pointer border"
                  style={{ borderColor: theme.surfaceBorder, color: theme.subtextColorHex, backgroundColor: theme.surfaceBg }}
                >
                  Batal
                </button>
                <button
                  onClick={handleVerifyPassword}
                  disabled={isVerifyingPassword || !inputPassword}
                  className="flex-1 py-3 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  style={primaryButtonStyle(theme)}
                >
                  {isVerifyingPassword ? (
                    <span className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Verifikasi</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Timeout & Eksit Sesi Kiosk */}
      <TimeoutModal
        showTolerance={showToleranceModal}
        showExpired={showExpiredModal}
        toleranceTime={toleranceTimer}
        onContinue={() => {
          // Lanjut sesi: berikan waktu tambahan 1 menit 30 detik (90 detik)
          setStepTimer(90);
          setHasContinuedSession(true);
          setShowToleranceModal(false);
        }}
        onReturn={() => {
          // Kembali: arahkan kembali ke Welcome page dan reset seluruh data
          handleGoHome();
          setShowToleranceModal(false);
        }}
      />

      {/* Remote Lock Overlay Screen */}
      <AnimatePresence>
        {kioskSettings?.isKioskLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none"
            style={{ background: theme.bgStyle, color: theme.textColorHex }}
          >
            {/* Ambient Background Glows */}
            <div 
              className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ backgroundColor: theme.accent }}
            />
            <div 
              className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
              style={{ backgroundColor: theme.accent }}
            />

            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
              className="relative max-w-xl w-full p-10 rounded-[36px] border backdrop-blur-2xl shadow-2xl flex flex-col items-center gap-6"
              style={cardSurfaceStyle(theme)}
            >
              {/* Logo / Brand Header */}
              {theme.logoUrl ? (
                <div className="w-24 h-24 flex items-center justify-center mb-2">
                  <img src={theme.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ) : null}

              {/* Pulsing Lock Icon */}
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="w-20 h-20 rounded-3xl border flex items-center justify-center shadow-lg"
                style={{ 
                  backgroundColor: `${theme.accent}1a`, 
                  borderColor: `${theme.accent}33`, 
                  color: theme.accent,
                  boxShadow: `0 10px 30px ${theme.accent}1a`
                }}
              >
                <Lock className="w-10 h-10" />
              </motion.div>

              <h2 className="text-3xl font-black uppercase tracking-widest mt-2">
                Mesin Kiosk Terkunci
              </h2>
              
              <div className="w-16 h-[2px] rounded-full" style={{ backgroundColor: theme.accent }} />

              <p className="text-sm leading-relaxed max-w-md font-medium" style={{ color: theme.subtextColorHex }}>
                Mohon maaf atas ketidaknyamanannya. Saat ini unit photobooth sedang dalam perawatan berkala atau dinonaktifkan sementara oleh admin.
              </p>

              <p className="text-xs uppercase tracking-widest font-black animate-pulse mt-4" style={{ color: theme.subtextColorHex }}>
                {theme.brandName} · Silakan Hubungi Petugas
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
    </KioskThemeProvider>
  );

  function handleGoHome() {
    if (localVideoUrl) {
      URL.revokeObjectURL(localVideoUrl);
      setLocalVideoUrl(null);
    }
    if (localLiveUrl) {
      URL.revokeObjectURL(localLiveUrl);
      setLocalLiveUrl(null);
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    printBlobRef.current = null;
    setUploadPhase("compiling");
    setUploadItems([]);
    setUploadError("");
    setPrintStatus("idle");
    setIsUploadingCloud(false);
    setCloudMainUrl("");
    setSelectedFrame(null);
    setSelectedTheme(null);
    setCapturedPhotos([]);
    setSelectedPhotos({});
    setCurrentShotIndex(0);
    setPreviewPhoto(null);
    setHasContinuedSession(false);
    setStepTimer(null);
    setShowExpiredModal(false);
    setShowToleranceModal(false);
    setStep("WELCOME");
  }
}
