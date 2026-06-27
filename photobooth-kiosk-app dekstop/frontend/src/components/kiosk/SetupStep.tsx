"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Tv, Key, CheckCircle2, Camera, Printer } from "lucide-react";
import { useKioskTheme } from "./KioskThemeProvider";
import { cardSurfaceStyle } from "@/lib/kiosk/theme";
import { KioskThemeButton } from "./KioskThemeButton";
import type { KioskPrinter } from "@/lib/kiosk/printer";
import {
  readSavedPrintMedia4R,
  readSavedPrintMediaA4,
  resolvePreferredPrintMedia,
  writeSavedPrintMedia4R,
  writeSavedPrintMediaA4,
} from "@/lib/kiosk/printer";
import { CAMERA_URL, CAMERA_API_SECRET } from "@/lib/kiosk/config";

interface SetupStepProps {
  inputApiKey: string;
  setInputApiKey: (val: string) => void;
  statusMessage: string;
  kioskSettings: any;
  cameraStatus: any;
  cameraLiveUrl: string;
  testPhotoUrl: string | null;
  setTestPhotoUrl: (val: string | null) => void;
  loadKioskConfig: (key: string) => Promise<void>;
  setStep: (step: any) => void;
  triggerCapture: () => void;
  printers: KioskPrinter[];
  defaultPrinter: string;
  selectedPrinter: string;
  onSelectPrinter: (name: string) => void;
  triggerTestPrint: () => Promise<void>;
  printerLoading: boolean;
  isTestPrinting: boolean;
  printerMessage: string;
  printerServiceOk: boolean;
  onReconnectCamera?: () => void;
}

function resolvePrinterBadge(
  printerLoading: boolean,
  printerServiceOk: boolean,
  printers: KioskPrinter[],
  selectedEntry?: KioskPrinter,
) {
  if (!printerServiceOk && printers.length === 0) {
    return { label: "Connecting...", connected: false };
  }
  if (!printerServiceOk) {
    return { label: "No Connection", connected: false };
  }
  if (printers.length === 0) {
    return { label: "No Printer", connected: false };
  }

  const entry =
    selectedEntry ||
    printers.find((p) => p.is_online && p.status !== "disabled") ||
    printers[0];

  if (entry.is_online && entry.status !== "disabled") {
    return { label: "Connected", connected: true };
  }
  return { label: "No Connection", connected: false };
}

function StatusBadge({
  label,
  connected,
  accent,
  warn = false,
}: {
  label: string;
  connected: boolean;
  accent: string;
  warn?: boolean;
}) {
  const warnStyle = {
    backgroundColor: "rgba(245,158,11,0.14)",
    color: "#b45309",
    border: "1px solid rgba(245,158,11,0.35)",
  };
  const okStyle = {
    backgroundColor: `${accent}22`,
    color: accent,
    border: `1px solid ${accent}44`,
  };
  const badStyle = {
    backgroundColor: "rgba(239,68,68,0.12)",
    color: "#dc2626",
    border: "1px solid rgba(239,68,68,0.25)",
  };
  const style = warn ? warnStyle : connected ? okStyle : badStyle;
  const dotColor = warn ? "#d97706" : connected ? accent : "#dc2626";

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide whitespace-nowrap"
      style={style}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      {label}
    </span>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  accent,
  borderColor,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  subtitle?: string;
  badge: React.ReactNode;
  accent: string;
  borderColor: string;
}) {
  return (
    <div className="pb-4 border-b space-y-3" style={{ borderColor }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${accent}18`, color: accent }}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase tracking-wider leading-snug">{title}</h2>
            {subtitle && (
              <p className="text-[10px] mt-1 leading-relaxed opacity-70">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="shrink-0 pt-0.5">{badge}</div>
      </div>
    </div>
  );
}

type ExposureField = {
  value: string | null;
  choices: string[];
};

type CameraExposureSettings = {
  shoot_mode: string;
  shoot_mode_label: string;
  shoot_mode_raw?: string | null;
  is_manual: boolean;
  editable: boolean;
  simulated?: boolean;
  iso: ExposureField;
  aperture: ExposureField;
  shutter: ExposureField;
  message?: string | null;
};

function SettingSelect({
  label,
  fieldKey,
  data,
  disabled,
  saving,
  onChange,
  borderColor,
  subtextColor,
  textColor,
  isLight,
}: {
  label: string;
  fieldKey: string;
  data: ExposureField;
  disabled: boolean;
  saving: boolean;
  onChange: (value: string) => void;
  borderColor: string;
  subtextColor: string;
  textColor: string;
  isLight: boolean;
}) {
  const choices =
    data.choices.length > 0
      ? data.choices
      : data.value
        ? [data.value]
        : [];

  return (
    <div>
      <label
        className="text-[9px] font-black uppercase tracking-wider block mb-1.5"
        style={{ color: subtextColor }}
      >
        {label}
      </label>
      <select
        value={data.value ?? ""}
        disabled={disabled || saving || choices.length === 0}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-xs font-bold focus:outline-none border appearance-none cursor-pointer disabled:opacity-50"
        style={{
          backgroundColor: isLight ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.35)",
          borderColor,
          color: textColor,
        }}
      >
        {choices.length === 0 ? (
          <option value="">—</option>
        ) : (
          choices.map((choice) => (
            <option key={`${fieldKey}-${choice}`} value={choice}>
              {choice}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

function CameraExposurePanel({
  cameraServiceOk,
  accent,
  borderColor,
  subtextColor,
  textColor,
  isLight,
}: {
  cameraServiceOk: boolean;
  accent: string;
  borderColor: string;
  subtextColor: string;
  textColor: string;
  isLight: boolean;
}) {
  const [settings, setSettings] = useState<CameraExposureSettings | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!cameraServiceOk) return;
    try {
      const res = await fetch(`${CAMERA_URL}/camera/settings`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as CameraExposureSettings;
        setSettings(data);
      }
    } catch {
      /* ignore polling errors */
    }
  }, [cameraServiceOk]);

  useEffect(() => {
    void fetchSettings();
    if (!cameraServiceOk) return;
    const interval = setInterval(() => void fetchSettings(), 3000);
    return () => clearInterval(interval);
  }, [cameraServiceOk, fetchSettings]);

  const applySetting = async (
    field: "iso" | "aperture" | "shutter",
    value: string,
  ) => {
    setSavingField(field);
    setError(null);
    try {
      const res = await fetch(`${CAMERA_URL}/camera/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": CAMERA_API_SECRET,
        },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Gagal menyimpan pengaturan kamera",
        );
      }
      setSettings(data as CameraExposureSettings);
    } catch (err) {
      setError((err as Error).message);
      void fetchSettings();
    } finally {
      setSavingField(null);
    }
  };

  if (!cameraServiceOk) return null;

  const panelBg = isLight ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.22)";
  const mode = settings?.shoot_mode ?? "—";
  const modeLabel = settings?.shoot_mode_label ?? "Memuat...";
  const showManualControls = settings?.is_manual === true && settings?.editable === true;

  return (
    <div
      className="rounded-2xl border p-3 sm:p-4 space-y-2.5"
      style={{ backgroundColor: panelBg, borderColor }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: textColor }}>
          Mode Kamera
        </p>
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border"
          style={{
            backgroundColor: `${accent}18`,
            borderColor: `${accent}44`,
            color: accent,
          }}
        >
          {mode}
        </span>
      </div>
      <p className="text-[10px] leading-relaxed" style={{ color: subtextColor }}>
        {modeLabel}
        {settings?.shoot_mode_raw && settings.shoot_mode_raw !== modeLabel
          ? ` · ${settings.shoot_mode_raw}`
          : ""}
      </p>

      {showManualControls ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <SettingSelect
            label="ISO"
            fieldKey="iso"
            data={settings!.iso}
            disabled={false}
            saving={savingField === "iso"}
            onChange={(value) => void applySetting("iso", value)}
            borderColor={borderColor}
            subtextColor={subtextColor}
            textColor={textColor}
            isLight={isLight}
          />
          <SettingSelect
            label="F (Aperture)"
            fieldKey="aperture"
            data={settings!.aperture}
            disabled={false}
            saving={savingField === "aperture"}
            onChange={(value) => void applySetting("aperture", value)}
            borderColor={borderColor}
            subtextColor={subtextColor}
            textColor={textColor}
            isLight={isLight}
          />
          <SettingSelect
            label="Shutter"
            fieldKey="shutter"
            data={settings!.shutter}
            disabled={false}
            saving={savingField === "shutter"}
            onChange={(value) => void applySetting("shutter", value)}
            borderColor={borderColor}
            subtextColor={subtextColor}
            textColor={textColor}
            isLight={isLight}
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          {[
            { label: "ISO", value: settings?.iso.value },
            { label: "F", value: settings?.aperture.value },
            { label: "Shutter", value: settings?.shutter.value },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border px-2 py-2 text-center"
              style={{ borderColor, color: subtextColor }}
            >
              <p className="text-[8px] font-black uppercase tracking-wide opacity-70">{item.label}</p>
              <p className="font-bold mt-0.5 truncate" style={{ color: textColor }}>
                {item.value ?? "—"}
              </p>
            </div>
          ))}
        </div>
      )}

      {settings?.message && (
        <p className="text-[9px] leading-relaxed" style={{ color: subtextColor }}>
          {settings.message}
        </p>
      )}
      {error && (
        <p className="text-[9px] font-bold leading-relaxed" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
      {savingField && (
        <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: accent }}>
          Menyimpan {savingField}...
        </p>
      )}
    </div>
  );
}

export const SetupStep: React.FC<SetupStepProps> = ({
  inputApiKey,
  setInputApiKey,
  statusMessage,
  kioskSettings,
  cameraStatus,
  cameraLiveUrl,
  testPhotoUrl,
  setTestPhotoUrl,
  loadKioskConfig,
  setStep,
  triggerCapture,
  printers,
  defaultPrinter,
  selectedPrinter,
  onSelectPrinter,
  triggerTestPrint,
  printerLoading,
  isTestPrinting,
  printerMessage,
  printerServiceOk,
  onReconnectCamera,
}) => {
  const theme = useKioskTheme();
  const panelStyle = cardSurfaceStyle(theme);
  const panelClass =
    "rounded-[28px] border backdrop-blur-md shadow-[0_20px_60px_-24px_rgba(74,63,53,0.25)]";

  const selectedEntry = printers.find((p) => p.name === selectedPrinter);
  const printerBadge = resolvePrinterBadge(
    printerLoading,
    printerServiceOk,
    printers,
    selectedEntry,
  );
  const [printMedia4ROptions, setPrintMedia4ROptions] = useState<string[]>([]);
  const [printMediaA4Options, setPrintMediaA4Options] = useState<string[]>([]);
  const [selectedPrintMedia4R, setSelectedPrintMedia4R] = useState(() => readSavedPrintMedia4R());
  const [selectedPrintMediaA4, setSelectedPrintMediaA4] = useState(() => readSavedPrintMediaA4());
  const [printMediaLoading, setPrintMediaLoading] = useState(false);

  useEffect(() => {
    if (!selectedPrinter || !printerServiceOk) {
      setPrintMedia4ROptions([]);
      setPrintMediaA4Options([]);
      return;
    }

    let cancelled = false;
    setPrintMediaLoading(true);

    const loadMedia = async () => {
      try {
        const res = await fetch(
          `${CAMERA_URL}/print-media?printer_name=${encodeURIComponent(selectedPrinter)}`,
          {
            headers: { "X-API-Key": CAMERA_API_SECRET },
            cache: "no-store",
          },
        );
        if (!res.ok) throw new Error("Gagal memuat media printer");
        const data = await res.json();
        if (cancelled) return;

        const options4R: string[] = data.photo_media || [];
        const optionsA4: string[] = data.a4_media || [];
        setPrintMedia4ROptions(options4R);
        setPrintMediaA4Options(optionsA4);

        const preferred4R = resolvePreferredPrintMedia(
          options4R,
          data.recommended_4r,
          readSavedPrintMedia4R(),
        );
        const preferredA4 = resolvePreferredPrintMedia(
          optionsA4,
          data.recommended_a4,
          readSavedPrintMediaA4(),
        );
        setSelectedPrintMedia4R(preferred4R);
        setSelectedPrintMediaA4(preferredA4);
        if (preferred4R) writeSavedPrintMedia4R(preferred4R);
        if (preferredA4) writeSavedPrintMediaA4(preferredA4);
      } catch {
        if (!cancelled) {
          setPrintMedia4ROptions([]);
          setPrintMediaA4Options([]);
        }
      } finally {
        if (!cancelled) setPrintMediaLoading(false);
      }
    };

    void loadMedia();
    return () => {
      cancelled = true;
    };
  }, [selectedPrinter, printerServiceOk]);

  const handleSelectPrintMedia4R = (media: string) => {
    setSelectedPrintMedia4R(media);
    writeSavedPrintMedia4R(media);
  };

  const handleSelectPrintMediaA4 = (media: string) => {
    setSelectedPrintMediaA4(media);
    writeSavedPrintMediaA4(media);
  };

  const cameraServiceOk = cameraStatus?.service_ok === true;
  const cameraConnected = !!cameraStatus?.camera_connected;
  const cameraModel = cameraStatus?.camera_model as string | undefined;
  const cameraConnectionError = cameraStatus?.connection_error as string | undefined;
  const cameraBadge = !cameraStatus
    ? { label: "Connecting...", connected: false, warn: false }
    : !cameraServiceOk
      ? { label: "Service Off", connected: false, warn: false }
      : cameraConnected
        ? {
            label: cameraModel ? cameraModel.replace("Canon ", "") : "Connected",
            connected: true,
            warn: false,
          }
        : {
            label: "No Camera",
            connected: false,
            warn: true,
          };

  return (
    <motion.div
      key="setup"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-[min(1120px,100%)] mx-auto px-4 sm:px-6 pb-6 space-y-4 sm:space-y-5"
      style={{ color: theme.textColorHex, fontFamily: theme.fontFamily }}
    >
      {/* Page intro */}
      <div className="text-center sm:text-left px-1">
        <p
          className="text-[10px] font-black uppercase tracking-[0.35em] mb-1"
          style={{ color: theme.accent }}
        >
          Kiosk Configuration
        </p>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wide">
          Setup & Uji Perangkat
        </h1>
        <p className="text-xs mt-1.5 max-w-xl" style={{ color: theme.subtextColorHex }}>
          Hubungkan akun admin, lalu pastikan kamera dan printer siap sebelum memulai sesi.
        </p>
      </div>

      {/* ── Panel 1: Koneksi Admin ── */}
      <section className={`${panelClass} p-6 sm:p-8`} style={panelStyle}>
        <PanelHeader
          icon={Tv}
          title={`${theme.brandName} Setup`}
          subtitle="Hubungkan kiosk ke akun dashboard admin"
          badge={
            kioskSettings ? (
              <StatusBadge label="Verified" connected accent={theme.accent} />
            ) : (
              <StatusBadge label="Pending" connected={false} accent={theme.accent} />
            )
          }
          accent={theme.accent}
          borderColor={theme.surfaceBorder}
        />

        <div className="mt-6 space-y-4">
          <div>
            <label
              className="text-[10px] font-black uppercase tracking-wider block mb-2"
              style={{ color: theme.subtextColorHex }}
            >
              Kunci Akses API Client
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Key
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: theme.subtextColorHex }}
                />
                <input
                  type="password"
                  value={inputApiKey}
                  onChange={(e) => setInputApiKey(e.target.value)}
                  placeholder="Masukkan API Key Client..."
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm font-bold focus:outline-none border transition-colors"
                  style={{
                    backgroundColor: theme.isLight ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.35)",
                    borderColor: theme.surfaceBorder,
                    color: theme.textColorHex,
                  }}
                />
              </div>
              <KioskThemeButton
                onClick={() => loadKioskConfig(inputApiKey)}
                isSmall
                text="Verifikasi"
                fullWidth={false}
                className="sm:min-w-[140px] px-6"
              />
            </div>
          </div>

          {statusMessage && (
            <p className="text-xs font-bold px-1" style={{ color: theme.accent }}>
              {statusMessage}
            </p>
          )}

          {kioskSettings && (
            <div
              className="p-4 rounded-2xl flex items-center gap-3 border"
              style={{
                backgroundColor: `${theme.accent}12`,
                borderColor: `${theme.accent}30`,
              }}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: theme.accent }} />
              <div>
                <p className="text-xs font-black uppercase" style={{ color: theme.accent }}>
                  Terhubung dengan Sukses
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: theme.subtextColorHex }}>
                  Brand: {theme.brandName}
                </p>
              </div>
            </div>
          )}

          <div className="pt-2">
            <KioskThemeButton
              disabled={!kioskSettings}
              onClick={() => setStep("WELCOME")}
              text="Mulai Kiosk App"
              className="disabled:opacity-35"
            />
          </div>
        </div>
      </section>

      {/* ── Panel 2 & 3: Hardware diagnostics ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 items-stretch">
        {/* Kamera */}
        <section
          className={`${panelClass} p-4 sm:p-5 flex flex-col min-h-0 h-full`}
          style={panelStyle}
        >
          <PanelHeader
            icon={Camera}
            title="Tes Kamera"
            subtitle="Live view & jepret uji"
            badge={
              <StatusBadge
                label={cameraBadge.label}
                connected={cameraBadge.connected}
                warn={cameraBadge.warn}
                accent={theme.accent}
              />
            }
            accent={theme.accent}
            borderColor={theme.surfaceBorder}
          />

          <div
            className="relative mt-4 rounded-2xl border overflow-hidden w-full aspect-[4/3] max-h-[min(52vw,240px)] sm:max-h-[260px] lg:max-h-[220px] xl:max-h-[240px] shrink-0"
            style={{
              backgroundColor: theme.isLight ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.45)",
              borderColor: theme.surfaceBorder,
              color: theme.subtextColorHex,
            }}
          >
            {cameraServiceOk ? (
              <img
                src={cameraLiveUrl}
                alt="Camera Live View"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            ) : (
              <div className="text-center px-4">
                <Camera className="w-9 h-9 mx-auto opacity-25 mb-2 animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-wide leading-relaxed">
                  Menghubungkan layanan kamera...
                </p>
                <p className="text-[9px] mt-1 opacity-70">Status diperbarui otomatis</p>
              </div>
            )}
            {!cameraConnected && cameraServiceOk && (
              <div
                className="absolute top-3 left-3 right-3 flex flex-col gap-2 z-10 pointer-events-none"
              >
                <div
                  className="self-start px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wide border backdrop-blur-sm"
                  style={{
                    backgroundColor: "rgba(245,158,11,0.18)",
                    borderColor: "rgba(245,158,11,0.35)",
                    color: "#b45309",
                  }}
                >
                  Live view simulasi
                </div>
              </div>
            )}
            {testPhotoUrl && (
              <div className="absolute inset-0 bg-black/92 p-3 flex flex-col z-20">
                <div className="flex-1 rounded-xl overflow-hidden border border-white/10 bg-black">
                  <img src={testPhotoUrl} className="w-full h-full object-contain" alt="Test jepret" />
                </div>
                <button
                  onClick={() => setTestPhotoUrl(null)}
                  className="mt-2 py-2 text-[10px] rounded-lg font-bold"
                  style={cardSurfaceStyle(theme)}
                >
                  Tutup Pratinjau
                </button>
              </div>
            )}
          </div>

          <div
            className="mt-4 pt-4 border-t space-y-3 flex-1 flex flex-col min-h-0"
            style={{ borderColor: theme.surfaceBorder }}
          >
            {!cameraConnected && cameraServiceOk && (
              <div
                className="rounded-xl border px-3 py-2.5 space-y-2"
                style={{
                  backgroundColor: "rgba(245,158,11,0.08)",
                  borderColor: "rgba(245,158,11,0.28)",
                }}
              >
                <p className="text-[10px] font-bold leading-relaxed" style={{ color: "#b45309" }}>
                  Kamera DSLR belum terhubung ke layanan. Live view & jepret masih simulasi.
                </p>
                {cameraConnectionError && (
                  <p className="text-[9px] leading-relaxed opacity-80" style={{ color: "#92400e" }}>
                    {cameraConnectionError}
                  </p>
                )}
                {onReconnectCamera && (
                  <button
                    type="button"
                    onClick={onReconnectCamera}
                    className="w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-wide border"
                    style={{
                      backgroundColor: theme.isLight ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.25)",
                      borderColor: "rgba(245,158,11,0.35)",
                      color: "#b45309",
                    }}
                  >
                    Hubungkan Ulang Kamera
                  </button>
                )}
              </div>
            )}

            <KioskThemeButton
              onClick={triggerCapture}
              isSmall
              icon={Camera}
              text="Test Jepret"
              className="w-full"
            />

            <CameraExposurePanel
              cameraServiceOk={cameraServiceOk}
              accent={theme.accent}
              borderColor={theme.surfaceBorder}
              subtextColor={theme.subtextColorHex}
              textColor={theme.textColorHex}
              isLight={theme.isLight}
            />

            <p className="text-[9px] text-center opacity-60 uppercase tracking-widest font-bold">
              Status diperbarui otomatis
            </p>
          </div>
        </section>

        {/* Printer */}
        <section
          className={`${panelClass} p-4 sm:p-5 flex flex-col min-h-0 h-full`}
          style={panelStyle}
        >
          <PanelHeader
            icon={Printer}
            title="Tes Printer"
            subtitle="Driver terinstall di laptop"
            badge={
              <StatusBadge
                label={printerBadge.label}
                connected={printerBadge.connected}
                accent={theme.accent}
              />
            }
            accent={theme.accent}
            borderColor={theme.surfaceBorder}
          />

          <div className="mt-4 space-y-3 flex-1 flex flex-col min-h-0">
            <div>
              <label
                className="text-[10px] font-black uppercase tracking-wider block mb-2"
                style={{ color: theme.subtextColorHex }}
              >
                Pilih Printer
              </label>
              <select
                value={selectedPrinter}
                onChange={(e) => onSelectPrinter(e.target.value)}
                disabled={printerLoading || printers.length === 0}
                className="w-full px-3.5 py-3 rounded-xl text-xs font-bold focus:outline-none border appearance-none cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: theme.isLight ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.35)",
                  borderColor: theme.surfaceBorder,
                  color: theme.textColorHex,
                }}
              >
                {printers.length === 0 ? (
                  <option value="">Tidak ada printer terdeteksi</option>
                ) : (
                  printers.map((printer) => (
                    <option key={printer.name} value={printer.name}>
                      {printer.name}
                      {printer.is_default ? " (Default)" : ""}
                      {!printer.is_online ? " — No Connection" : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label
                className="text-[10px] font-black uppercase tracking-wider block mb-2"
                style={{ color: theme.subtextColorHex }}
              >
                Media Kertas Strip / 4R
              </label>
              <select
                value={selectedPrintMedia4R}
                onChange={(e) => handleSelectPrintMedia4R(e.target.value)}
                disabled={
                  printerLoading ||
                  printMediaLoading ||
                  !selectedPrinter ||
                  printMedia4ROptions.length === 0
                }
                className="w-full px-3.5 py-3 rounded-xl text-xs font-bold focus:outline-none border appearance-none cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: theme.isLight ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.35)",
                  borderColor: theme.surfaceBorder,
                  color: theme.textColorHex,
                }}
              >
                {printMediaLoading ? (
                  <option value="">Memuat media...</option>
                ) : printMedia4ROptions.length === 0 ? (
                  <option value="">Media 4R otomatis (driver)</option>
                ) : (
                  printMedia4ROptions.map((media) => (
                    <option key={media} value={media}>
                      {media}
                    </option>
                  ))
                )}
              </select>
              <p className="text-[9px] mt-1.5 leading-relaxed" style={{ color: theme.subtextColorHex }}>
                Untuk frame photobooth strip (mis. EPKG.NMgn). Tidak dipakai saat cetak A4.
              </p>
            </div>

            <div>
              <label
                className="text-[10px] font-black uppercase tracking-wider block mb-2"
                style={{ color: theme.subtextColorHex }}
              >
                Media Kertas A4
              </label>
              <select
                value={selectedPrintMediaA4}
                onChange={(e) => handleSelectPrintMediaA4(e.target.value)}
                disabled={
                  printerLoading ||
                  printMediaLoading ||
                  !selectedPrinter ||
                  printMediaA4Options.length === 0
                }
                className="w-full px-3.5 py-3 rounded-xl text-xs font-bold focus:outline-none border appearance-none cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: theme.isLight ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.35)",
                  borderColor: theme.surfaceBorder,
                  color: theme.textColorHex,
                }}
              >
                {printMediaLoading ? (
                  <option value="">Memuat media...</option>
                ) : printMediaA4Options.length === 0 ? (
                  <option value="">Media A4 otomatis (driver)</option>
                ) : (
                  printMediaA4Options.map((media) => (
                    <option key={media} value={media}>
                      {media}
                    </option>
                  ))
                )}
              </select>
              <p className="text-[9px] mt-1.5 leading-relaxed" style={{ color: theme.subtextColorHex }}>
                Untuk frame ukuran A4 saja (mis. A4.Borderless). Terpisah dari media strip 4R.
              </p>
            </div>

            {selectedEntry ? (
              <div
                className="rounded-2xl border p-4 space-y-2.5 text-[10px]"
                style={{
                  backgroundColor: theme.isLight ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.22)",
                  borderColor: theme.surfaceBorder,
                  color: theme.subtextColorHex,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black uppercase tracking-wide" style={{ color: theme.textColorHex }}>
                    Koneksi
                  </span>
                  <StatusBadge
                    label={printerBadge.connected ? "Connected" : "No Connection"}
                    connected={printerBadge.connected}
                    accent={theme.accent}
                  />
                </div>
                <div className="h-px" style={{ backgroundColor: theme.surfaceBorder }} />
                <p>
                  <span className="font-black uppercase" style={{ color: theme.textColorHex }}>
                    Perangkat:{" "}
                  </span>
                  {selectedEntry.hardware_status || (printerBadge.connected ? "online" : "offline")}
                </p>
                <p>
                  <span className="font-black uppercase" style={{ color: theme.textColorHex }}>
                    Antrian CUPS:{" "}
                  </span>
                  {selectedEntry.status}
                  {selectedEntry.is_default || selectedEntry.name === defaultPrinter
                    ? " · Default OS"
                    : ""}
                </p>
                {selectedEntry.details && (
                  <p className="leading-relaxed opacity-75 line-clamp-3">{selectedEntry.details}</p>
                )}
              </div>
            ) : (
              <div
                className="rounded-2xl border p-4 flex-1 flex items-center justify-center text-center text-[10px]"
                style={{
                  borderColor: theme.surfaceBorder,
                  color: theme.subtextColorHex,
                  backgroundColor: theme.isLight ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.15)",
                }}
              >
                {printerServiceOk
                  ? "Belum ada printer terdeteksi di sistem."
                  : "Menghubungkan ke layanan printer..."}
              </div>
            )}

            {printerMessage && (
              <p className="text-[10px] font-bold px-0.5" style={{ color: theme.accent }}>
                {printerMessage}
              </p>
            )}
          </div>

          <div
            className="mt-4 pt-4 border-t shrink-0"
            style={{ borderColor: theme.surfaceBorder }}
          >
            <KioskThemeButton
              onClick={triggerTestPrint}
              isSmall
              icon={Printer}
              text={isTestPrinting ? "Mencetak..." : "Test Cetak"}
              disabled={!selectedPrinter || isTestPrinting || !printerBadge.connected}
              className="w-full disabled:opacity-40"
            />
            <p className="text-[9px] text-center mt-3 opacity-60 uppercase tracking-widest font-bold">
              Status diperbarui otomatis
            </p>
          </div>
        </section>
      </div>
    </motion.div>
  );
};
