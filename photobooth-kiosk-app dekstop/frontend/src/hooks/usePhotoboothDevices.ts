import { useState, useEffect, useRef, type RefObject } from "react";
import { io, type Socket } from "socket.io-client";
import { NESTJS_URL, CAMERA_URL, CAMERA_API_SECRET } from "@/lib/kiosk/config";
import {
  resolvePreferredPrinter,
  readSavedPrinterName,
  writeSavedPrinterName,
  type KioskPrinter,
} from "@/lib/kiosk/printer";
import { type KioskStep } from "@/hooks/useKioskStepFlow";

export type CaptureSocketHandlers = {
  setStatusMessage: (message: string) => void;
  setTestPhotoUrl: (url: string | null) => void;
  setPreviewPhoto: (photo: any | null) => void;
  setCapturedPhotos: React.Dispatch<React.SetStateAction<any[]>>;
  setCountdown: (value: number | null) => void;
  setIsCaptureStarted: (value: boolean) => void;
  setHasError: (value: boolean) => void;
  getStep: () => KioskStep;
  setIsCapturing: (value: boolean) => void;
};

type UsePhotoboothDevicesParams = {
  step: KioskStep;
  apiKey: string;
  captureSocketHandlersRef: RefObject<CaptureSocketHandlers | null>;
  fetchCameraStatusRef: RefObject<(() => void | Promise<void>) | null>;
};

export function usePhotoboothDevices({
  step,
  apiKey,
  captureSocketHandlersRef,
  fetchCameraStatusRef,
}: UsePhotoboothDevicesParams) {
  const [cameraStatus, setCameraStatus] = useState<any>(null);
  const [printers, setPrinters] = useState<KioskPrinter[]>([]);
  const [defaultPrinter, setDefaultPrinter] = useState("");
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [printerLoading, setPrinterLoading] = useState(false);
  const [printerMessage, setPrinterMessage] = useState("");
  const [isTestPrinting, setIsTestPrinting] = useState(false);
  const [printerServiceOk, setPrinterServiceOk] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const isCapturingRef = useRef(false);
  const cameraReconnectAttemptRef = useRef(0);
  const [liveViewKey, setLiveViewKey] = useState(0);
  const prevCameraServiceOkRef = useRef<boolean | null>(null);

  const fetchCameraStatus = async (options?: { silent?: boolean; forceReconnect?: boolean }) => {
    try {
      const res = await fetch(`${CAMERA_URL}/status`, { cache: "no-store" });
      if (res.ok) {
        let data = await res.json();

        const shouldReconnect =
          options?.forceReconnect ||
          ((data.gphoto2_available || data.digicamcontrol) &&
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

  const fetchCameraStatusLocalRef = useRef(fetchCameraStatus);
  const fetchPrintersRef = useRef(fetchPrinters);
  fetchPrintersRef.current = fetchPrinters;
  fetchCameraStatusLocalRef.current = fetchCameraStatus;
  fetchCameraStatusRef.current = fetchCameraStatus;

  useEffect(() => {
    setSelectedPrinter(readSavedPrinterName());
  }, []);

  useEffect(() => {
    if (step !== "SETUP") return;

    let cancelled = false;

    const refreshDevices = async () => {
      if (cancelled) return;
      await Promise.all([
        fetchCameraStatusLocalRef.current({ silent: true }),
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
      const handlers = captureSocketHandlersRef.current;
      if (!handlers) return;

      if (payload.status === "capturing") {
        handlers.setStatusMessage("Mengambil gambar dari DSLR...");
      } else if (payload.status === "success") {
        handlers.setStatusMessage("");
        handlers.setIsCapturing(false);

        const currentStep = handlers.getStep();
        if (currentStep === "SETUP") {
          handlers.setTestPhotoUrl(`${CAMERA_URL}/photos/${payload.data?.filename}`);
        } else if (currentStep === "CAPTURE") {
          handlers.setPreviewPhoto(payload.data);
        } else {
          handlers.setCapturedPhotos((prev) => {
            if (prev.length > 0 && prev[prev.length - 1]?.filename === payload.data?.filename) {
              return prev;
            }
            return [...prev, payload.data];
          });
        }
      } else if (payload.status === "error") {
        const errMsg = payload.message || "";
        if (
          errMsg.toLowerCase().includes("500") ||
          errMsg.toLowerCase().includes("fail") ||
          errMsg.toLowerCase().includes("busy") ||
          errMsg.toLowerCase().includes("focus")
        ) {
          handlers.setStatusMessage(
            "Gagal menjepret: Kamera tidak mendapatkan fokus! Silakan pastikan objek terlihat jelas atau atur lensa ke Manual Focus (MF).",
          );
        } else {
          handlers.setStatusMessage(`Error Kamera: ${errMsg}`);
        }
        handlers.setCountdown(null);
        handlers.setIsCaptureStarted(false);
        handlers.setIsCapturing(false);
        handlers.setHasError(true);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [step, apiKey, captureSocketHandlersRef]);

  return {
    cameraStatus,
    liveViewKey,
    printers,
    defaultPrinter,
    selectedPrinter,
    printerLoading,
    printerMessage,
    isTestPrinting,
    printerServiceOk,
    socketRef,
    isCapturingRef,
    fetchCameraStatus,
    handleSelectPrinter,
    triggerTestPrint,
  };
}
