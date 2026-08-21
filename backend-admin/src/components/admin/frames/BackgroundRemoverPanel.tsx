'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Eraser, Eye, Loader2, Pipette, RotateCcw, Sparkles } from 'lucide-react';
import {
  canvasToBlob,
  hexToRgb,
  loadImage,
  removeBackgroundByColor,
  rgbToHex,
  type RgbColor,
} from '@/lib/chromaKey';

export type BackgroundRemoverPanelHandle = {
  applyPendingChanges: () => Promise<boolean>;
  hasPendingPreview: () => boolean;
};

interface BackgroundRemoverPanelProps {
  frameId: string;
  sourceImageUrl: string;
  originalImageUrl: string | null;
  initialChromaKeyColor?: string | null;
  initialChromaKeyTolerance?: number | null;
  eyedropperActive: boolean;
  onEyedropperActiveChange: (active: boolean) => void;
  pickedColor: RgbColor | null;
  onPickedColorConsumed: () => void;
  onPreviewUrlChange: (url: string | null) => void;
  onFrameImageUpdated: (params: {
    imageUrl: string;
    originalImageUrl: string;
    chromaKeyColor: string;
    chromaKeyTolerance: number;
  }) => void;
}

const PREVIEW_DEBOUNCE_MS = 180;
const SETTINGS_SAVE_DEBOUNCE_MS = 600;

async function parseSafeJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || `HTTP ${res.status} ${res.statusText}` };
  }
}

async function uploadFrameImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await parseSafeJson(res);
  if (!res.ok) throw new Error(data.error || `Upload gagal (${res.status})`);
  return data.url;
}

async function persistChromaSettings(
  frameId: string,
  chromaKeyColor: string,
  chromaKeyTolerance: number,
): Promise<void> {
  const res = await fetch(`/api/admin/frames/${frameId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chromaKeyColor, chromaKeyTolerance }),
  });

  const data = await parseSafeJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'Gagal menyimpan pengaturan chroma key');
  }
}

const BackgroundRemoverPanel = forwardRef<
  BackgroundRemoverPanelHandle,
  BackgroundRemoverPanelProps
>(function BackgroundRemoverPanel(
  {
    frameId,
    sourceImageUrl,
    originalImageUrl,
    initialChromaKeyColor,
    initialChromaKeyTolerance,
    eyedropperActive,
    onEyedropperActiveChange,
    pickedColor,
    onPickedColorConsumed,
    onPreviewUrlChange,
    onFrameImageUpdated,
  },
  ref,
) {
  const [colorHex, setColorHex] = useState(initialChromaKeyColor || '#ffffff');
  const [tolerance, setTolerance] = useState(initialChromaKeyTolerance ?? 35);
  const [debouncedTolerance, setDebouncedTolerance] = useState(initialChromaKeyTolerance ?? 35);
  const [debouncedColorHex, setDebouncedColorHex] = useState(initialChromaKeyColor || '#ffffff');
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [loadingImage, setLoadingImage] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const previewJobRef = useRef(0);
  const hasLivePreviewRef = useRef(false);
  const skipSettingsPersistRef = useRef(true);

  const processingSourceUrl = originalImageUrl || sourceImageUrl;
  const canReset = Boolean(originalImageUrl && originalImageUrl !== sourceImageUrl);

  const revokePreviewUrl = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (initialChromaKeyColor) {
      setColorHex(initialChromaKeyColor);
      setDebouncedColorHex(initialChromaKeyColor);
    }
    if (initialChromaKeyTolerance != null) {
      setTolerance(initialChromaKeyTolerance);
      setDebouncedTolerance(initialChromaKeyTolerance);
    }
  }, [initialChromaKeyColor, initialChromaKeyTolerance]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedTolerance(tolerance);
    }, PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [tolerance]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedColorHex(colorHex);
    }, PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [colorHex]);

  useEffect(() => {
    if (skipSettingsPersistRef.current) {
      skipSettingsPersistRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      const rgb = hexToRgb(colorHex);
      if (!rgb) return;

      void persistChromaSettings(frameId, colorHex, tolerance).catch(() => {
        // Non-blocking: warna tetap dipakai untuk preview meski DB belum migrate
      });
    }, SETTINGS_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [colorHex, tolerance, frameId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingImage(true);
      setError(null);
      try {
        const image = await loadImage(processingSourceUrl);
        if (!cancelled) setLoadedImage(image);
      } catch (err) {
        if (!cancelled) {
          setLoadedImage(null);
          setError((err as Error).message || 'Gagal memuat gambar');
        }
      } finally {
        if (!cancelled) setLoadingImage(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [processingSourceUrl]);

  useEffect(() => {
    if (!previewEnabled || !loadedImage) {
      revokePreviewUrl();
      onPreviewUrlChange(null);
      hasLivePreviewRef.current = false;
      setPreviewBusy(false);
      return;
    }

    const rgb = hexToRgb(debouncedColorHex);
    if (!rgb) return;

    const jobId = previewJobRef.current + 1;
    previewJobRef.current = jobId;
    setPreviewBusy(true);

    const timer = window.setTimeout(() => {
      try {
        const canvas = removeBackgroundByColor(loadedImage, rgb, debouncedTolerance, {
          quality: 'preview',
          maxPreviewDimension: 720,
        });

        canvas.toBlob((blob) => {
          if (!blob || previewJobRef.current !== jobId) return;
          revokePreviewUrl();
          const objectUrl = URL.createObjectURL(blob);
          previewObjectUrlRef.current = objectUrl;
          hasLivePreviewRef.current = true;
          onPreviewUrlChange(objectUrl);
          setPreviewBusy(false);
        }, 'image/png');
      } catch (err) {
        if (previewJobRef.current !== jobId) return;
        setError((err as Error).message || 'Gagal membuat preview');
        setPreviewBusy(false);
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    debouncedColorHex,
    debouncedTolerance,
    previewEnabled,
    loadedImage,
    onPreviewUrlChange,
    revokePreviewUrl,
  ]);

  useEffect(() => {
    return () => revokePreviewUrl();
  }, [revokePreviewUrl]);

  const applyChromaKey = useCallback(async (): Promise<boolean> => {
    if (!loadedImage) return false;

    const rgb = hexToRgb(colorHex);
    if (!rgb) {
      setError('Warna tidak valid');
      return false;
    }

    setProcessing(true);
    setError(null);

    try {
      const canvas = removeBackgroundByColor(loadedImage, rgb, tolerance, {
        quality: 'final',
      });
      const blob = await canvasToBlob(canvas);
      const file = new File([blob], `frame-${frameId}-nobg.png`, { type: 'image/png' });
      const uploadedUrl = await uploadFrameImage(file);
      const nextOriginal = originalImageUrl || sourceImageUrl;

      const res = await fetch(`/api/admin/frames/${frameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadedUrl,
          originalImageUrl: nextOriginal,
          chromaKeyColor: colorHex,
          chromaKeyTolerance: tolerance,
        }),
      });

      const data = await parseSafeJson(res);
      if (!res.ok) {
        const detail = data.details ? `\n${data.details}` : '';
        throw new Error((data.error || 'Gagal menyimpan frame') + detail);
      }

      const saved = data;

      revokePreviewUrl();
      hasLivePreviewRef.current = false;
      onPreviewUrlChange(null);

      onFrameImageUpdated({
        imageUrl: uploadedUrl,
        originalImageUrl: nextOriginal,
        chromaKeyColor: colorHex,
        chromaKeyTolerance: tolerance,
      });

      if (saved.warning) {
        setError(saved.warning);
      }

      return true;
    } catch (err) {
      setError((err as Error).message || 'Gagal menerapkan hapus background');
      return false;
    } finally {
      setProcessing(false);
    }
  }, [
    loadedImage,
    colorHex,
    tolerance,
    frameId,
    originalImageUrl,
    sourceImageUrl,
    onFrameImageUpdated,
    onPreviewUrlChange,
    revokePreviewUrl,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      applyPendingChanges: applyChromaKey,
      hasPendingPreview: () => {
        const colorChanged = colorHex.toLowerCase() !== (initialChromaKeyColor || '#ffffff').toLowerCase();
        const toleranceChanged = tolerance !== (initialChromaKeyTolerance ?? 35);
        return previewEnabled && hasLivePreviewRef.current && (colorChanged || toleranceChanged);
      },
    }),
    [applyChromaKey, previewEnabled, colorHex, tolerance, initialChromaKeyColor, initialChromaKeyTolerance],
  );

  const handleReset = async () => {
    if (!originalImageUrl) return;

    setResetting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/frames/${frameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: originalImageUrl,
          chromaKeyColor: null,
          chromaKeyTolerance: null,
        }),
      });

      const data = await parseSafeJson(res);
      if (!res.ok) {
        throw new Error(data.error || 'Gagal reset frame');
      }

      onFrameImageUpdated({
        imageUrl: originalImageUrl,
        originalImageUrl,
        chromaKeyColor: '#ffffff',
        chromaKeyTolerance: 35,
      });
      setColorHex('#ffffff');
      setDebouncedColorHex('#ffffff');
      setTolerance(35);
      setDebouncedTolerance(35);
      setPreviewEnabled(true);
    } catch (err) {
      setError((err as Error).message || 'Gagal reset ke gambar asli');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    if (!pickedColor) return;
    const hex = rgbToHex(pickedColor.r, pickedColor.g, pickedColor.b);
    setColorHex(hex);
    setDebouncedColorHex(hex);
    onEyedropperActiveChange(false);
    setPreviewEnabled(true);
    onPickedColorConsumed();
  }, [pickedColor, onEyedropperActiveChange, onPickedColorConsumed]);

  return (
    <div className="bg-white p-8 rounded-3xl border border-[#EAE1D3] shadow-md space-y-6">
      <div className="flex items-center gap-3 text-[#A68B67]">
        <Eraser className="w-4 h-4" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Hapus Background</span>
      </div>

      <p className="text-[11px] text-[#8C7E6A] leading-relaxed">
        Pick warna background dari canvas — semua warna didukung (hijau, putih, biru, dll). Yang dihapus hanya pixel yang mirip warna pick, bukan deteksi hijau otomatis.
      </p>

      <div className="space-y-4">
        <button
          type="button"
          onClick={() => onEyedropperActiveChange(!eyedropperActive)}
          disabled={loadingImage || !loadedImage}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
            eyedropperActive
              ? 'bg-[#A68B67] border-[#A68B67] text-white shadow-lg'
              : 'bg-[#FDFBF7] border-[#EAE1D3] text-[#4A3F35] hover:border-[#A68B67]'
          } disabled:opacity-40`}
        >
          <Pipette className="w-4 h-4" />
          {eyedropperActive ? 'Klik Area BG di Canvas' : 'Pick Warna dari Canvas'}
        </button>

        <div className="flex items-center gap-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A3F35] shrink-0">
            Warna BG
          </label>
          <div className="relative w-12 h-10 rounded-lg border border-[#EAE1D3] overflow-hidden shrink-0">
            <div aria-hidden className="transparency-checker absolute inset-0" />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ backgroundColor: colorHex }}
            />
            <input
              type="color"
              value={colorHex}
              onChange={(e) => {
                setColorHex(e.target.value);
                setPreviewEnabled(true);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <input
            type="text"
            value={colorHex}
            onChange={(e) => {
              setColorHex(e.target.value);
              setPreviewEnabled(true);
            }}
            className="flex-1 px-3 py-2 rounded-xl border border-[#EAE1D3] text-xs font-mono uppercase focus:outline-none focus:border-[#A68B67]"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#4A3F35]">
              Toleransi
            </label>
            <span className="text-xs font-bold text-[#A68B67] bg-[#F5F1EA] px-2 py-0.5 rounded-md">
              {tolerance}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={tolerance}
            onChange={(e) => {
              setTolerance(parseInt(e.target.value, 10));
              setPreviewEnabled(true);
            }}
            className="w-full accent-[#A68B67]"
          />
          {previewBusy && (
            <p className="text-[9px] text-[#A68B67] font-bold uppercase tracking-widest">
              Memperbarui preview...
            </p>
          )}
          <p className="text-[9px] text-[#8C7E6A] leading-relaxed">
            Klik area background di canvas untuk pick warna. Naikkan toleransi jika masih ada noda. Mulai dari 30–50, maks 100.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPreviewEnabled((prev) => !prev)}
          disabled={!loadedImage}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
            previewEnabled
              ? 'bg-[#F5F1EA] border-[#A68B67] text-[#4A3F35]'
              : 'bg-[#FDFBF7] border-[#EAE1D3] text-[#8C7E6A]'
          } disabled:opacity-40`}
        >
          <Eye className="w-4 h-4" />
          {previewEnabled ? 'Preview Aktif' : 'Preview Mati'}
        </button>

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => void applyChromaKey()}
            disabled={processing || loadingImage || !loadedImage}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#4A3F35] hover:bg-[#2D2824] text-white text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-40"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {processing ? 'Menyimpan...' : 'Terapkan & Simpan Frame'}
          </button>

          {canReset && (
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#EAE1D3] bg-[#FDFBF7] hover:bg-[#F5F1EA] text-[#4A3F35] text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-40"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Reset ke Gambar Asli
            </button>
          )}
        </div>

        {loadingImage && (
          <p className="text-[9px] text-[#A68B67] font-bold uppercase tracking-widest text-center animate-pulse">
            Memuat gambar frame...
          </p>
        )}

        {error && (
          <p className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </div>
  );
});

export default BackgroundRemoverPanel;
