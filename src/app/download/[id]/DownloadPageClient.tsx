"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Home, ArrowLeft, CheckCircle2, Info, Sparkles, Eye, X, Clock } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { usePhotoStore } from '@/store/usePhotoStore';
import { applySlotTransformAndClip } from '@/lib/canvasUtils';
import { createGifEncoder, loadMobileMp4 } from '@/lib/lazy-media';
import {
  computeExpirationFromId,
  DEFAULT_PHOTO_RETENTION_DAYS,
  pollUntilReady,
  probeAssetReady,
} from '@/lib/download-polling';

const SUPABASE_CDN = 'https://sbfhpblrixwninecodko.supabase.co/storage/v1/object/public/photobooth-images/images';

const resolveFirstValidUrl = async (urls: string[]): Promise<string | null> => {
  for (const u of urls) {
    const ready = await probeAssetReady(u);
    if (ready) return u;
  }
  return null;
};

const isVideoContent = (url: string) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  // Jika ada marker .gif atau hash #gif, itu pasti image
  if (lowerUrl.includes('.gif') || lowerUrl.includes('#gif')) return false;
  // Jika ada marker video
  if (lowerUrl.includes('mp4') || lowerUrl.includes('webm') || lowerUrl.includes('video') || lowerUrl.includes('-bonus') || lowerUrl.includes('-live')) return true;
  // Jika blob tanpa marker gif, di aplikasi ini kemungkinan besar adalah video (Live Photo)
  return url.startsWith('blob:');
};

const DownloadPageClient = () => {
  const router = useRouter();
  const routeParams = useParams();
  const urlSearchParams = useSearchParams();
  const routeId = routeParams.id as string;
  const queryU = urlSearchParams.get('u') ?? undefined;
  const queryUg = urlSearchParams.get('ug') ?? undefined;
  const queryUl = urlSearchParams.get('ul') ?? undefined;
  const [imageId, setImageId] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingGif, setIsDownloadingGif] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isDownloadingLivePhoto, setIsDownloadingLivePhoto] = useState(false);

  // State untuk frame bonus (GIF 1080x1920)
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [gifUrl, setGifUrl] = useState<string>('');
  const [gifError, setGifError] = useState<string>('');
  const bonusCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasAutoDownloaded = useRef(false);

  // State untuk Live Photo (Video dengan frame)
  const [isGeneratingLivePhoto, setIsGeneratingLivePhoto] = useState(false);
  const [livePhotoUrl, setLivePhotoUrl] = useState<string>('');
  const [livePhotoError, setLivePhotoError] = useState<string>('');
  const livePhotoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<string | null>(null);

  // State untuk countdown timer
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null); // dalam detik
  const [expiresAt, setExpiresAt] = useState<number | null>(null); // timestamp ms
  const [isExpiredRealtime, setIsExpiredRealtime] = useState(false);


  // Ambil foto langsung dari store agar kualitas tidak turun (fallback ke PNG jika reload)
  const { photos, resetAll, selectedFrame, frameCategory } = usePhotoStore();
  const [dbFrame, setDbFrame] = useState<any>(null);
  const [serverPhotos, setServerPhotos] = useState<{ dataUrl: string; originalUrl: string }[]>([]);
  // Gabungan: pakai store jika ada, fallback ke server
  const availablePhotos = photos.length > 0 ? photos : serverPhotos;

  // Fetch database frame if category is 'database'
  useEffect(() => {
    if (frameCategory === 'database' && selectedFrame) {
      fetch(`/api/frames/${selectedFrame}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setDbFrame({
              ...data,
              slots: Array.isArray(data.slots) ? data.slots : [],
            });
          }
        })
        .catch(err => console.error('Failed to fetch db frame:', err));
    }
  }, [frameCategory, selectedFrame]);

  // Layout configuration for consistent rendering
  const layoutConfig = useMemo(() => ({
    outputWidth: dbFrame?.outputWidth || dbFrame?.width || 1080,
    outputHeight: dbFrame?.outputHeight || dbFrame?.height || 1920,
    slots: dbFrame?.slots || [],
    backgroundUrl: dbFrame?.framePosition === 'background' ? dbFrame.imageUrl : null,
    overlayUrl: dbFrame?.framePosition === 'overlay' ? dbFrame.imageUrl : null,
    detectionUrl: dbFrame?.imageUrl,
  }), [dbFrame]);

  const drawFrameBackground = (ctx: CanvasRenderingContext2D, frameType: string, width: number, height: number) => {
    switch (frameType) {
      case 'classic':
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#71604b';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, width - 10, height - 10);
        break;
      case 'vintage':
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#f5e8c6');
        grad.addColorStop(1, '#e6d7b3');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        break;
      case 'elegant':
        ctx.fillStyle = '#2c1810';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#71604b';
        ctx.lineWidth = 15;
        ctx.strokeRect(20, 20, width - 40, height - 40);
        break;
      default:
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    }
  };

  const mapSlotsToPixels = (canvasWidth: number, canvasHeight: number) => {
    if (frameCategory === 'database' && dbFrame?.slots && dbFrame.slots.length > 0) {
      return dbFrame.slots.map((slot: any) => ({
        x: slot.x * canvasWidth,
        y: slot.y * canvasHeight,
        width: slot.width * canvasWidth,
        height: slot.height * canvasHeight,
        rotation: slot.rotation || 0,
        borderRadius: slot.borderRadius || 0,
      }));
    }
    return null;
  };

  const detectGreenBoxes = async (imageSrc: string, canvasWidth: number, canvasHeight: number) => {
    if (!imageSrc) return null;
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageSrc;
      });

      const offCanvas = document.createElement('canvas');
      offCanvas.width = canvasWidth;
      offCanvas.height = canvasHeight;
      const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
      if (!offCtx) return null;

      offCtx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      const imageData = offCtx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imageData.data;
      const visited = new Uint8Array(canvasWidth * canvasHeight);
      const boxes: any[] = [];

      for (let y = 0; y < canvasHeight; y += 4) {
        for (let x = 0; x < canvasWidth; x += 4) {
          const idx = y * canvasWidth + x;
          const r = data[idx * 4], g = data[idx * 4 + 1], b = data[idx * 4 + 2];

          if (g > 150 && r < 100 && b < 100 && !visited[idx]) {
            let minX = x, maxX = x, minY = y, maxY = y;
            const stack = [[x, y]];
            visited[idx] = 1;

            while (stack.length > 0) {
              const [currX, currY] = stack.pop()!;
              minX = Math.min(minX, currX); maxX = Math.max(maxX, currX);
              minY = Math.min(minY, currY); maxY = Math.max(maxY, currY);

              const neighbors = [[currX + 8, currY], [currX - 8, currY], [currX, currY + 8], [currX, currY - 8]];
              for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < canvasWidth && ny >= 0 && ny < canvasHeight) {
                  const nidx = ny * canvasWidth + nx;
                  if (!visited[nidx]) {
                    const nr = data[nidx * 4], ng = data[nidx * 4 + 1], nb = data[nidx * 4 + 2];
                    if (ng > 150 && nr < 100 && nb < 100) {
                      visited[nidx] = 1;
                      stack.push([nx, ny]);
                    }
                  }
                }
              }
            }
            if ((maxX - minX) > 50 && (maxY - minY) > 50) {
              boxes.push({ x: minX, y: minY, width: maxX - minX, height: maxY - minY });
            }
          }
        }
      }
      return boxes;
    } catch (error) {
      console.error('Error detecting green boxes:', error);
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const getParams = async () => {
      const u = queryU;
      const ug = queryUg;
      const ul = queryUl;
      const cleanId = routeId?.replace(/\.+$/, '') || '';
      setImageId(cleanId);

      const expiration = computeExpirationFromId(cleanId, DEFAULT_PHOTO_RETENTION_DAYS);
      if (expiration) {
        if (expiration.remainingSec <= 0) {
          setError('expired');
          setIsLoading(false);
          return;
        }
        setExpiresAt(expiration.expiresAt);
        setTimeRemaining(expiration.remainingSec);
      }

      void fetch('/api/public/photo-retention', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((settingsData) => {
          if (cancelled || !settingsData?.photoRetentionDays || !cleanId) return;
          const refined = computeExpirationFromId(cleanId, settingsData.photoRetentionDays);
          if (!refined) return;
          if (refined.remainingSec <= 0) {
            setError('expired');
            setIsLoading(false);
            return;
          }
          setExpiresAt(refined.expiresAt);
          setTimeRemaining(refined.remainingSec);
        })
        .catch(() => {});

      const primaryUrl = u || `${SUPABASE_CDN}/${cleanId}.png`;
      setImageUrl(primaryUrl);

      if (ug) setGifUrl(ug);
      if (ul) setLivePhotoUrl(ul);

      if (u) {
        setIsLoading(false);
        return;
      }

      const ready = await pollUntilReady(
        async () => {
          if (cancelled) return true;
          const found = await resolveFirstValidUrl([
            `${SUPABASE_CDN}/${cleanId}.png`,
            `${SUPABASE_CDN}/${cleanId}.jpg`,
            `${window.location.origin}/api/images/${cleanId}`,
          ]);
          if (found) {
            setImageUrl(found);
            return true;
          }
          return false;
        },
        { maxAttempts: 25, initialDelayMs: 400, maxDelayMs: 2000 },
      );

      if (!cancelled) setIsLoading(false);
      if (!ready && !cancelled) {
        console.log('Main image not ready after polling window');
      }
    };

    void getParams();
    return () => {
      cancelled = true;
    };
  }, [routeId, queryU, queryUg, queryUl]);

  // Countdown timer interval: hitung mundur per detik
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.floor((expiresAt - Date.now()) / 1000);
      if (remaining <= 0) {
        setTimeRemaining(0);
        setIsExpiredRealtime(true);
        clearInterval(interval);
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Format detik → { days, hours, mins, secs }
  const formatCountdown = (totalSeconds: number) => {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return { days, hours, mins, secs };
  };

  // Extract customer name from ID if it follows the pattern cust-[name]-[timestamp]
  const getCustomerName = (id: string): string => {
    const match = id.match(/^cust-(.+)-(\d+)$/);
    if (match) {
      return match[1].replace(/-/g, ' ');
    }
    return '';
  };

  // Fetch foto original dari server jika store kosong (HP scan QR) — paralel
  useEffect(() => {
    if (!imageId || photos.length > 0 || serverPhotos.length > 0) return;

    let cancelled = false;

    const fetchOriginals = async () => {
      try {
        let photoCount = 4;
        try {
          const metaRes = await fetch(`${SUPABASE_CDN}/${imageId}-meta.json`, { cache: 'no-store' });
          if (metaRes.ok) {
            const meta = await metaRes.json();
            if (meta.count) photoCount = meta.count;
          }
        } catch { }

        const origin = window.location.origin;
        const results = await Promise.all(
          Array.from({ length: photoCount }, async (_, i) => {
            const found = await resolveFirstValidUrl([
              `${SUPABASE_CDN}/${imageId}-orig-${i}.jpg`,
              `${SUPABASE_CDN}/${imageId}-orig-${i}.png`,
              `${origin}/api/images/${imageId}-orig-${i}`,
            ]);
            return found ? { dataUrl: found, originalUrl: found } : null;
          }),
        );

        if (cancelled) return;

        const fetched = results.filter((item): item is { dataUrl: string; originalUrl: string } => item != null);
        if (fetched.length > 0) {
          console.log(`✅ Fetched ${fetched.length} original photos from server`);
          setServerPhotos(fetched);
        }
      } catch (err) {
        console.error('Error fetching original photos:', err);
      }
    };

    const timer = window.setTimeout(fetchOriginals, 1000);
    const retryTimer = window.setTimeout(() => {
      if (!cancelled) void fetchOriginals();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
    };
  }, [imageId, photos.length, serverPhotos.length]);

  // Poll bonus GIF/MP4 dan live photo secara paralel dengan backoff
  useEffect(() => {
    if (!imageId) return;

    let cancelled = false;
    const origin = window.location.origin;

    const pollBonus = async () => {
      if (queryUg) return;
      if (frameCategory === 'database' && !dbFrame) return;

      await pollUntilReady(
        async () => {
          if (cancelled || queryUg) return true;
          const found = await resolveFirstValidUrl([
            `${SUPABASE_CDN}/${imageId}-bonus.mp4`,
            `${SUPABASE_CDN}/${imageId}-bonus.webm`,
            `${SUPABASE_CDN}/${imageId}-bonus.gif`,
            `${origin}/api/images/${imageId}-bonus`,
          ]);
          if (found) {
            setGifUrl(found);
            return true;
          }
          return false;
        },
        { maxAttempts: 24, initialDelayMs: 400, maxDelayMs: 2000 },
      );
    };

    const pollLive = async () => {
      if (queryUl) return;

      const found = await pollUntilReady(
        async () => {
          if (cancelled || queryUl) return true;
          const foundUrl = await resolveFirstValidUrl([
            `${SUPABASE_CDN}/${imageId}-live.mp4`,
            `${SUPABASE_CDN}/${imageId}-live.webm`,
            `${origin}/api/images/${imageId}-live`,
          ]);
          if (foundUrl) {
            setLivePhotoUrl(foundUrl);
            return true;
          }
          return false;
        },
        { maxAttempts: 48, initialDelayMs: 400, maxDelayMs: 2000 },
      );

      if (!found && !cancelled && photos.filter((p) => !!p.livePhotoUrl).length > 0) {
        console.log('Generating Live Photo locally as fallback...');
        void generateLivePhotoVideo();
      }
    };

    void Promise.all([pollBonus(), pollLive()]);

    return () => {
      cancelled = true;
    };
  }, [imageId, queryUg, queryUl, dbFrame, frameCategory, photos]);


  const handleDownload = async () => {
    if (!imageUrl) return;

    const customerName = getCustomerName(imageId);
    const fileName = customerName ? `photobooth-${customerName}.png` : `photobooth-${imageId}.png`;

    setIsDownloading(true);
    try {
      // Selalu fetch sebagai blob agar tidak membuka tab baru (Direct Save)
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Gagal memuat gambar');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      // Jangan pakai target="_blank" agar langsung tersimpan
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Jeda sedikit sebelum revoke agar download tuntas di mobile
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Download error:', error);
      setError('Gagal mendownload foto. Silakan coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGoHome = () => {
    // Reset semua data untuk user baru
    resetAll();
    // Redirect ke halaman utama untuk memulai sesi baru
    router.push('/');
  };

  // Util: draw image cover ke rect target (crop center)
  const drawImageCover = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const imgAspect = img.width / img.height;
    const targetAspect = w / h;
    let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;
    if (imgAspect > targetAspect) {
      drawHeight = h;
      drawWidth = h * imgAspect;
      offsetX = (w - drawWidth) / 2;
      offsetY = 0;
    } else {
      drawWidth = w;
      drawHeight = w / imgAspect;
      offsetX = 0;
      offsetY = (h - drawHeight) / 2;
    }
    ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
  };

  // Generate GIF 1080x1920: kotak hijau (single) + kotak merah (anim 4 foto)
  const generateBonusGif = async () => {
    try {
      setIsGeneratingGif(true);
      setGifError('');
      setGifUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return '';
      });

      if (photos.length < 4) {
        setGifError('Foto hasil capture tidak ditemukan.');
        return;
      }

      const loadImage = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });

      if (photos.length < 4) {
        console.log('Not enough photos to generate bonus');
        return;
      }

      const slices: HTMLImageElement[] = await Promise.all(
        photos.slice(0, 4).map(p => loadImage(p.dataUrl))
      );

      // Pastikan dbFrame sudah ada jika kategori database
      if (frameCategory === 'database' && !dbFrame) {
        throw new Error('Data frame belum siap');
      }

      const fullW = layoutConfig.outputWidth;
      const fullH = layoutConfig.outputHeight;
      const { getVideoEncodeDimensions } = await loadMobileMp4();
      const { width: W, height: H } = getVideoEncodeDimensions(fullW, fullH, 720);
      const canvas = bonusCanvasRef.current || document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context tidak tersedia');

      // Load frame assets
      let backgroundFrame: HTMLImageElement | null = null;
      let overlayFrame: HTMLImageElement | null = null;

      if (frameCategory === 'database' && dbFrame?.imageUrl) {
        const img = await loadImage(dbFrame.imageUrl);
        if (dbFrame.framePosition === 'background') backgroundFrame = img;
        else overlayFrame = img;
      } else if (frameCategory === 'standard' && (selectedFrame === 'classic' || selectedFrame === 'elegant' || selectedFrame === 'vintage')) {
        // Use helper or background color
      }

      // Detect slots
      const slotBoxes = mapSlotsToPixels(W, H);
      const detectionSource = layoutConfig.detectionUrl || (frameCategory === 'database' ? dbFrame?.imageUrl : null);
      const greenBoxes = slotBoxes ? null : await detectGreenBoxes(detectionSource, W, H);
      const boxes = slotBoxes ?? greenBoxes;

      const workerUrl = `${window.location.origin}/api/gif-worker`;
      const gif = await createGifEncoder({
        workers: 2,
        quality: 18,
        width: W,
        height: H,
        workerScript: workerUrl
      });

      for (let i = 0; i < 4; i++) {
        // Clear and render base
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        if (backgroundFrame) {
          ctx.drawImage(backgroundFrame, 0, 0, W, H);
        } else {
          drawFrameBackground(ctx, selectedFrame, W, H);
        }

        if (boxes && boxes.length > 0) {
          boxes.forEach((box: any, index: number) => {
            const img = slices[i % slices.length];
            if (!img || !box) return;

            ctx.save();
            applySlotTransformAndClip(ctx, box.x, box.y, box.width, box.height, (box as any).rotation, (box as any).borderRadius, slotBoxes ? 10 : 20);

            // Mirror logic per user request
            ctx.translate(box.x + box.width / 2, box.y + box.height / 2);
            ctx.scale(-1, 1);
            ctx.translate(-(box.x + box.width / 2), -(box.y + box.height / 2));

            const imgAspect = img.width / img.height;
            const targetAspect = box.width / box.height;
            let dw, dh, ox, oy;
            if (imgAspect > targetAspect) {
              dh = box.height; dw = box.height * imgAspect;
              ox = (box.width - dw) / 2; oy = 0;
            } else {
              dw = box.width; dh = box.width / imgAspect;
              ox = 0; oy = (box.height - dh) / 2;
            }
            ctx.drawImage(img, box.x + ox, box.y + oy, dw, dh);
            ctx.restore();
          });
        }

        if (overlayFrame) {
          ctx.drawImage(overlayFrame, 0, 0, W, H);
        }

        gif.addFrame(ctx, { copy: true, delay: 800 });
      }

      const blob: Blob = await new Promise((resolve) => {
        gif.on('finished', (b: Blob) => resolve(b));
        gif.render();
      });

      try {
        const idForGif = `${imageId}-bonus`;
        const res = await fetch(`/api/images/${idForGif}`, {
          method: 'POST',
          headers: { 'Content-Type': 'image/gif' },
          body: blob
        });
        const json = await res.json().catch(() => null);
        if (json?.url) {
          console.log('✅ Bonus GIF uploaded:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
          setGifUrl(json.url);
          const u = new URL(window.location.href);
          u.searchParams.set('ug', json.url);
          window.history.replaceState({}, '', u.toString());
        } else {
          console.error('❌ Bonus GIF upload response error:', res.status);
          const localUrl = URL.createObjectURL(blob) + "#gif";
          setGifUrl(localUrl);
        }
      } catch (err) {
        console.error('❌ Bonus GIF upload catch error:', err);
        const localUrl = URL.createObjectURL(blob) + "#gif";
        setGifUrl(localUrl);
      }
    } catch (e: any) {
      console.error(e);
      setGifError(e?.message || 'Gagal membuat GIF');
    } finally {
      setIsGeneratingGif(false);
    }
  };

  // Fungsi untuk mengkonversi GIF ke MP4 dengan menggunakan canvas yang sudah ada
  // Jika foto masih ada di store, generate MP4 langsung dari foto (lebih baik)
  // Jika tidak, konversi GIF yang sudah ada
  const convertGifToMp4 = async (gifBlob: Blob): Promise<Blob> => {
    const {
      encodeCanvasToMobileMp4,
      ensureMobileMp4,
      VIDEO_BUDGET_MAX_BYTES,
    } = await loadMobileMp4();

    if (photos.length >= 4) {
      try {
        const W = layoutConfig.outputWidth;
        const H = layoutConfig.outputHeight;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context tidak tersedia');

        const loadImage = (src: string) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });

        let backgroundFrame: HTMLImageElement | null = null;
        let overlayFrame: HTMLImageElement | null = null;

        if (frameCategory === 'database' && dbFrame?.imageUrl) {
          const img = await loadImage(dbFrame.imageUrl);
          if (dbFrame.framePosition === 'background') backgroundFrame = img;
          else overlayFrame = img;
        }

        const slices: HTMLImageElement[] = await Promise.all(
          photos.slice(0, 4).map(p => loadImage(p.dataUrl))
        );

        const slotBoxes = mapSlotsToPixels(W, H);
        const detectionSource = layoutConfig.detectionUrl || (frameCategory === 'database' ? dbFrame?.imageUrl : null);
        const greenBoxes = slotBoxes ? null : await detectGreenBoxes(detectionSource, W, H);
        const boxes = slotBoxes ?? greenBoxes;

        const frameDelay = 800;
        const framesPerLoop = 4;
        const loopDuration = framesPerLoop * (frameDelay / 1000);
        const fps = 24;
        const maxDurationSec = 10;
        const totalFrames = Math.min(
          Math.max(3, Math.ceil(maxDurationSec / loopDuration)) * framesPerLoop,
          Math.ceil(maxDurationSec * fps),
        );

        return encodeCanvasToMobileMp4({
          width: W,
          height: H,
          fps,
          totalFrames,
          maxBytes: VIDEO_BUDGET_MAX_BYTES,
          renderFrame: async (ctx, frameIndex) => {
            const i = frameIndex % framesPerLoop;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, W, H);

            if (backgroundFrame) ctx.drawImage(backgroundFrame, 0, 0, W, H);
            else drawFrameBackground(ctx, selectedFrame, W, H);

            if (boxes && boxes.length > 0) {
              boxes.forEach((box: any) => {
                const img = slices[i % slices.length];
                ctx.save();
                applySlotTransformAndClip(ctx, box.x, box.y, box.width, box.height, (box as any).rotation, (box as any).borderRadius, slotBoxes ? 10 : 20);

                const imgAspect = img.width / img.height;
                const targetAspect = box.width / box.height;
                let dw, dh, ox, oy;
                if (imgAspect > targetAspect) {
                  dh = box.height; dw = box.height * imgAspect; ox = (box.width - dw) / 2; oy = 0;
                } else {
                  dw = box.width; dh = box.width / imgAspect; ox = 0; oy = (box.height - dh) / 2;
                }
                ctx.drawImage(img, box.x + ox, box.y + oy, dw, dh);
                ctx.restore();
              });
            }

            if (overlayFrame) ctx.drawImage(overlayFrame, 0, 0, W, H);
          },
        }).then((blob) => ensureMobileMp4(blob, 'frame-bonus.webm', undefined, imageId || routeId));
      } catch (error) {
        console.error('MP4 generation failed:', error);
      }
    }
    return new Blob([], { type: 'video/mp4' });
  };

  // Generate Live Photo Video dengan frame (compressed max 2MB)
  const generateLivePhotoVideo = async () => {
    if (photos.length < 4) {
      setLivePhotoError('Minimal 4 foto diperlukan');
      return;
    }

    // Filter photos yang punya Live Photo
    const photosWithLivePhoto = photos.filter(p => p.livePhotoUrl);
    if (photosWithLivePhoto.length === 0) {
      setLivePhotoError('Tidak ada Live Photo tersedia');
      return;
    }

    setIsGeneratingLivePhoto(true);
    setLivePhotoError('');

    try {
      const { encodeCanvasToMobileMp4, ensureMobileMp4, VIDEO_BUDGET_MAX_BYTES } = await loadMobileMp4();

      const canvas = livePhotoCanvasRef.current;
      if (!canvas) throw new Error('Canvas not found');

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not found');

      // Set canvas size
      canvas.width = layoutConfig.outputWidth;
      canvas.height = layoutConfig.outputHeight;

      // Load all videos
      const videoElements = await Promise.all(
        photosWithLivePhoto.map(photo => {
          return new Promise<HTMLVideoElement>((resolve, reject) => {
            const video = document.createElement('video');
            video.crossOrigin = "anonymous";
            video.src = photo.livePhotoUrl!;
            video.muted = true;
            video.playsInline = true;
            video.onloadeddata = () => resolve(video);
            video.onerror = reject;
            video.load();
          });
        })
      );

      // Load frame images if exists
      let backgroundImg: HTMLImageElement | null = null;
      let overlayImg: HTMLImageElement | null = null;

      if (layoutConfig.backgroundUrl) {
        backgroundImg = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = layoutConfig.backgroundUrl!;
        });
      }

      if (layoutConfig.overlayUrl) {
        overlayImg = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = layoutConfig.overlayUrl!;
        });
      }

      await Promise.all(videoElements.map((v) => v.play().catch(() => undefined)));

      const durationMs = 7000;
      const fps = 24;
      const totalFrames = Math.floor((durationMs / 1000) * fps);

      const drawLiveFrame = (drawCtx: CanvasRenderingContext2D) => {
        drawCtx.fillStyle = '#ffffff';
        drawCtx.fillRect(0, 0, canvas.width, canvas.height);

        if (backgroundImg) {
          drawCtx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
        }

        if (layoutConfig.slots.length >= photosWithLivePhoto.length) {
          for (let i = 0; i < photosWithLivePhoto.length; i++) {
            const slot = layoutConfig.slots[i];
            const video = videoElements[i];
            if (slot && video) {
              drawCtx.save();
              drawCtx.translate(slot.x + slot.width / 2, slot.y + slot.height / 2);
              drawCtx.scale(-1, 1);
              drawCtx.translate(-(slot.x + slot.width / 2), -(slot.y + slot.height / 2));
              drawCtx.drawImage(video, slot.x, slot.y, slot.width, slot.height);
              drawCtx.restore();
            }
          }
        } else {
          const gridSize = 2;
          const cellWidth = canvas.width / gridSize;
          const cellHeight = canvas.height / gridSize;
          const padding = 20;

          for (let i = 0; i < Math.min(photosWithLivePhoto.length, 4); i++) {
            const video = videoElements[i];
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            const x = col * cellWidth + padding;
            const y = row * cellHeight + padding;
            const w = cellWidth - padding * 2;
            const h = cellHeight - padding * 2;
            drawCtx.save();
            drawCtx.translate(x + w / 2, y + h / 2);
            drawCtx.scale(-1, 1);
            drawCtx.translate(-(x + w / 2), -(y + h / 2));
            drawCtx.drawImage(video, x, y, w, h);
            drawCtx.restore();
          }
        }

        if (overlayImg) {
          drawCtx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
        }
      };

      const videoBlob = await encodeCanvasToMobileMp4({
        width: canvas.width,
        height: canvas.height,
        fps,
        totalFrames,
        maxBytes: VIDEO_BUDGET_MAX_BYTES,
        renderFrame: async (drawCtx, frameIndex, timeSec) => {
          for (const video of videoElements) {
            const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : durationMs / 1000;
            video.currentTime = Math.min(timeSec, duration - 0.001);
          }
          drawLiveFrame(drawCtx);
          await new Promise((resolve) => requestAnimationFrame(resolve));
        },
      });

      const mobileBlob = await ensureMobileMp4(videoBlob, 'live-photo.webm', undefined, imageId || routeId);
      const url = URL.createObjectURL(mobileBlob);
      setLivePhotoUrl(url);

      console.log('✅ Live Photo video generated:', mobileBlob.size, 'bytes');
    } catch (error) {
      console.error('❌ Live Photo generation failed:', error);
      setLivePhotoError(error instanceof Error ? error.message : 'Failed to generate Live Photo');
    } finally {
      setIsGeneratingLivePhoto(false);
    }
  };
  const handleDownloadGif = async () => {
    if (!gifUrl) return;
    const customerName = getCustomerName(imageId);

    // Selalu download sebagai MP4
    const fileName = customerName ? `frame-bonus-${customerName}.mp4` : `frame-bonus-${imageId}.mp4`;

    setIsDownloadingGif(true);
    try {
      const { ensureMobileMp4, isMobileCompatibleMp4 } = await loadMobileMp4();

      // Selalu fetch sebagai blob agar tidak membuka tab baru (Direct Save)
      const urlWithCacheBuster = gifUrl.includes('?')
        ? `${gifUrl}&v=${Date.now()}`
        : `${gifUrl}?v=${Date.now()}`;

      const response = await fetch(urlWithCacheBuster, {
        method: 'GET',
        headers: {
          'Accept': 'video/mp4,video/webm,image/gif,video/*,*/*',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });

      if (!response.ok) throw new Error('Gagal fetch file');

      const contentType = response.headers.get('content-type') || '';
      const blob = await response.blob();
      let videoBlob = blob;

      const alreadyMobileMp4 =
        contentType.includes('mp4') ||
        blob.type.includes('mp4') ||
        (await isMobileCompatibleMp4(blob));

      if (alreadyMobileMp4) {
        videoBlob = new Blob([await blob.arrayBuffer()], { type: 'video/mp4' });
      } else if (contentType.includes('gif') || blob.type.includes('gif') || gifUrl.includes('.gif')) {
        videoBlob = await convertGifToMp4(blob);
        videoBlob = await ensureMobileMp4(videoBlob, 'frame-bonus.webm', undefined, imageId || routeId);
        videoBlob = new Blob([await videoBlob.arrayBuffer()], { type: 'video/mp4' });
      } else {
        videoBlob = await ensureMobileMp4(videoBlob, 'frame-bonus.webm', undefined, imageId || routeId);
        videoBlob = new Blob([await videoBlob.arrayBuffer()], { type: 'video/mp4' });
      }

      const url = URL.createObjectURL(videoBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      // Jangan pakai target="_blank" agar langsung tersimpan
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Error downloading bonus frame:', err);
      window.location.href = gifUrl; // Fallback redirect jika fetch gagal
    } finally {
      setIsDownloadingGif(false);
    }
    return;
  };

  const handleDownloadLivePhoto = async () => {
    if (!livePhotoUrl) return;
    const customerName = getCustomerName(imageId);
    const fileName = customerName
      ? `${customerName}_live-photo.mp4`
      : `photobooth_live-photo_${imageId}.mp4`;

    setIsDownloadingLivePhoto(true);
    try {
      const response = await fetch(livePhotoUrl);
      if (!response.ok) throw new Error('Failed to fetch video');

      const blob = await response.blob();
      const fromServer = !livePhotoUrl.startsWith('blob:');
      let videoBlob: Blob;

      if (fromServer) {
        videoBlob = new Blob([await blob.arrayBuffer()], { type: 'video/mp4' });
      } else {
        const { ensureMobileMp4 } = await loadMobileMp4();
        videoBlob = await ensureMobileMp4(blob, 'live-photo.webm', undefined, imageId || routeId);
        videoBlob = new Blob([await videoBlob.arrayBuffer()], { type: 'video/mp4' });
      }

      const blobUrl = URL.createObjectURL(videoBlob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      // Jangan pakai target="_blank"
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup blob URL setelah download
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('Download failed:', error);
      window.location.href = livePhotoUrl; // Fallback direct
    } finally {
      setIsDownloadingLivePhoto(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-12 h-[1px] bg-[#D1C4B2]/30 relative overflow-hidden mx-auto">
            <motion.div
              initial={{ left: '-100%' }}
              animate={{ left: '100%' }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute top-0 w-1/2 h-full bg-[#A68B67]"
            />
          </div>
          <span className="text-[#A68B67] text-[10px] font-black tracking-[0.5em] uppercase block">Menyiapkan Mahakarya</span>
        </div>
      </div>
    );
  }

  if (error === 'expired' || isExpiredRealtime) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-center">
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-[#F5F1EA] blur-[120px] rounded-full opacity-60" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-[#EAE1D3] blur-[150px] rounded-full opacity-40" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 max-w-md w-full space-y-8 p-10 bg-white/80 backdrop-blur-xl rounded-3xl border border-[#EAE1D3] shadow-2xl"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#F5E6D3] to-[#EAD5BB] flex items-center justify-center shadow-inner"
          >
            <CheckCircle2 className="w-10 h-10 text-[#A68B67]" />
          </motion.div>

          {/* Branding */}
          <div className="space-y-1">
            <p className="text-[10px] font-black tracking-[0.6em] text-[#A68B67] uppercase">Dovelens.ft</p>
            <div className="h-[1px] w-12 bg-[#EAE1D3] mx-auto" />
          </div>

          {/* Pesan utama */}
          <div className="space-y-4">
            <h2 className="text-2xl font-sans italic text-[#4A3F35] leading-snug">
              Terima kasih sudah mendownload
              <span className="block text-[#A68B67] not-italic font-black text-sm tracking-widest uppercase mt-1">Soft File-nya</span>
            </h2>
            <p className="text-[#8C7E6A] text-sm font-sans italic leading-relaxed">
              Halaman ini tidak bisa diakses lagi. Semoga foto kenangan Anda selalu menjadi momen berharga.
            </p>
          </div>

          <div className="h-[1px] bg-[#EAE1D3]" />

          <p className="text-[10px] text-[#C4B09A] font-black uppercase tracking-widest">
            dovelens.ft • moment archive
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-10">
          <div className="space-y-4">
            <h2 className="text-3xl font-sans italic text-[#4A3F35]">Menyiapkan Kenangan Anda</h2>
            <p className="text-[#8C7E6A] text-sm font-sans italic leading-relaxed">
              Beberapa file sedang diproses untuk kualitas terbaik. Silakan muat ulang halaman ini dalam beberapa saat jika konten belum muncul sepenuhnya.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: '#4A3F35', color: '#FDFBF7' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
            className="px-10 py-3 border border-[#4A3F35] text-[#4A3F35] text-[10px] font-black uppercase tracking-[0.4em] transition-all"
          >
            MUAT ULANG HALAMAN
          </motion.button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#4A3F35] selection:bg-[#EAE1D3] overflow-x-hidden">
      <AnimatePresence>
        {showPreviewModal && (
          <PreviewModal
            type={showPreviewModal}
            imageUrl={imageUrl}
            gifUrl={gifUrl}
            livePhotoUrl={livePhotoUrl}
            photos={availablePhotos}
            onClose={() => setShowPreviewModal(null)}
            onDownload={handleDownload}
            onDownloadGif={handleDownloadGif}
            onDownloadLivePhoto={handleDownloadLivePhoto}
          />
        )}
      </AnimatePresence>

      {/* Dynamic Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-[#F5F1EA] blur-[120px] rounded-full opacity-60 animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-[#EAE1D3] blur-[150px] rounded-full opacity-40" />
        <div className="absolute top-[30%] left-[20%] w-[40%] h-[40%] bg-[#A68B67]/5 blur-[100px] rounded-full" />
      </div>

      {/* Boutique Header */}
      <header className="fixed top-0 z-50 w-full bg-[#FDFBF7]/60 backdrop-blur-xl border-b border-[#EAE1D3]/50">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-black tracking-[0.8em] text-[#4A3F35] uppercase leading-none mb-1">Dovelens.ft</span>
            <div className="h-[2px] w-12 bg-[#A68B67]/30" />
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-32 pb-20 px-6">
        {/* Main Content Area */}
        <div className="w-full max-w-lg relative">

          {/* Top Branding from Image Reference */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 space-y-4"
          >
            <h2 className="text-[40px] font-sans italic text-[#4A3F35] leading-tight">
              Koleksi <span className="text-[#A68B67] not-italic font-black text-3xl uppercase tracking-[0.3em]">Digital</span>
            </h2>
            <p className="text-[#8C7E6A] text-xs font-sans italic tracking-widest uppercase opacity-70">
              "Archive your special moments"
            </p>
          </motion.div>

          {/* === COUNTDOWN TIMER BANNER === */}
          {timeRemaining !== null && timeRemaining > 0 && (() => {
            const { days, hours, mins, secs } = formatCountdown(timeRemaining);
            const isUrgent = timeRemaining < 86400; // kurang dari 1 hari
            const isCritical = timeRemaining < 3600; // kurang dari 1 jam
            return (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className={`relative mb-10 rounded-2xl overflow-hidden border ${
                  isCritical
                    ? 'border-red-300 bg-gradient-to-br from-red-50 to-orange-50'
                    : isUrgent
                    ? 'border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50'
                    : 'border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50'
                } shadow-md`}
              >
                {/* Animated background glow */}
                <motion.div
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className={`absolute inset-0 ${
                    isCritical ? 'bg-red-100/40' : isUrgent ? 'bg-orange-100/40' : 'bg-amber-100/30'
                  }`}
                />

                <div className="relative z-10 px-5 py-5 text-center space-y-3">
                  {/* Warning label */}
                  <div className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className={`text-lg ${isCritical ? 'text-red-500' : isUrgent ? 'text-orange-500' : 'text-amber-500'}`}
                    >
                      ⚡
                    </motion.span>
                    <p className={`text-xs font-black uppercase tracking-[0.3em] ${
                      isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-amber-700'
                    }`}>
                      Download segera sebelum fotonya terhapus
                    </p>
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                      className={`text-lg ${isCritical ? 'text-red-500' : isUrgent ? 'text-orange-500' : 'text-amber-500'}`}
                    >
                      ⚡
                    </motion.span>
                  </div>

                  {/* Countdown digits */}
                  <div className="flex items-center justify-center gap-2">
                    {days > 0 && (
                      <>
                        <div className="flex flex-col items-center">
                          <span className={`text-3xl font-black tabular-nums ${
                            isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-amber-800'
                          }`}>
                            {String(days).padStart(2, '0')}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#A68B67] mt-0.5">Hari</span>
                        </div>
                        <span className={`text-2xl font-black mb-4 ${
                          isCritical ? 'text-red-400' : 'text-amber-400'
                        }`}>:</span>
                      </>
                    )}
                    <div className="flex flex-col items-center">
                      <span className={`text-3xl font-black tabular-nums ${
                        isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-amber-800'
                      }`}>
                        {String(hours).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#A68B67] mt-0.5">Jam</span>
                    </div>
                    <span className={`text-2xl font-black mb-4 ${
                      isCritical ? 'text-red-400' : 'text-amber-400'
                    }`}>:</span>
                    <div className="flex flex-col items-center">
                      <span className={`text-3xl font-black tabular-nums ${
                        isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-amber-800'
                      }`}>
                        {String(mins).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#A68B67] mt-0.5">Menit</span>
                    </div>
                    <span className={`text-2xl font-black mb-4 ${
                      isCritical ? 'text-red-400' : 'text-amber-400'
                    }`}>:</span>
                    <div className="flex flex-col items-center">
                      <motion.span
                        key={secs}
                        initial={{ opacity: 0.5, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`text-3xl font-black tabular-nums ${
                          isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-amber-800'
                        }`}
                      >
                        {String(secs).padStart(2, '0')}
                      </motion.span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#A68B67] mt-0.5">Detik</span>
                    </div>
                  </div>

                  {/* Subtext */}
                  <p className={`text-[10px] font-sans italic ${
                    isCritical ? 'text-red-500' : isUrgent ? 'text-orange-500' : 'text-amber-600'
                  }`}>
                    {isCritical
                      ? '⚠️ Foto akan segera terhapus! Segera download sekarang'
                      : isUrgent
                      ? 'Kurang dari 24 jam tersisa — jangan sampai terlambat'
                      : 'Foto disimpan sementara, download sebelum waktu habis'
                    }
                  </p>
                </div>
              </motion.div>
            );
          })()}

          {/* Decorative Stickers (FAT KAT Images) with Floating Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: -15 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="absolute -left-12 sm:-left-20 top-[15%] w-24 h-24 sm:w-32 sm:h-32 pointer-events-none z-20"
          >
            <motion.img
              animate={{
                y: [0, -15, 0],
                rotate: [-15, -10, -15]
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              src="/FAT KAT/1.png"
              alt="sticker-1"
              className="w-full h-full object-contain drop-shadow-xl"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0, rotate: 20 }}
            animate={{ opacity: 1, scale: 1, rotate: 10 }}
            transition={{ delay: 0.7, type: 'spring' }}
            className="absolute -right-12 sm:-right-24 top-[65%] w-24 h-24 sm:w-32 sm:h-32 pointer-events-none z-20"
          >
            <motion.img
              animate={{
                y: [0, 15, 0],
                rotate: [10, 18, 10]
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              src="/FAT KAT/2.png"
              alt="sticker-2"
              className="w-full h-full object-contain drop-shadow-xl"
            />
          </motion.div>

          {/* Pill Buttons Container (Centered like the image) */}
          <div className="flex flex-col gap-6 w-full px-4 relative z-10">

            {/* 1. Pictures (Merged Photo) */}
            <DownloadPill
              label="Pictures"
              sub="Merged Strip / Frame"
              icon={<Eye className="w-5 h-5" />}
              isLoading={isDownloading}
              onClick={() => setShowPreviewModal('pictures')}
              delay={0.1}
            />

            {/* 2. Original Photos (Individual) */}
            <DownloadPill
              label="Original"
              sub="Individual High-Res Shots"
              icon={<Eye className="w-5 h-5" />}
              onClick={() => setShowPreviewModal('original')}
              delay={0.2}
            />

            {/* 3. GIF (Bonus Motion) */}
            <DownloadPill
              label="GIF"
              sub="Looping Animated Experience"
              icon={<Eye className="w-5 h-5" />}
              isLoading={isDownloadingGif}
              disabled={!gifUrl && !isGeneratingGif}
              onClick={() => setShowPreviewModal('gif')}
              delay={0.3}
            />

            {/* 4. VISLIVE VIDEO (Live Photo) */}
            <DownloadPill
              label="LIVE PHOTO"
              sub="Memories in Motion"
              icon={<Eye className="w-5 h-5" />}
              isLoading={isDownloadingLivePhoto || isGeneratingLivePhoto}
              disabled={!livePhotoUrl && !isGeneratingLivePhoto}
              onClick={() => setShowPreviewModal('vislive')}
              delay={0.4}
            />
          </div>

          {/* Preview Section - Minimalist */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-20 flex justify-center gap-6"
          >
            <div className="group relative w-24 h-32 bg-white p-1 shadow-md rotate-[-3deg] hover:rotate-0 transition-transform cursor-pointer overflow-hidden" onClick={() => setShowPreviewModal('pictures')}>
              <img src={imageUrl} className="w-full h-full object-cover rounded-sm" onError={(e) => {
                // Fallback jika merger belum selesai, pakai foto pertama
                if (availablePhotos[0]) (e.target as HTMLImageElement).src = availablePhotos[0].dataUrl;
              }} />
            </div>
            {gifUrl && (
              <div className="group relative w-24 h-32 bg-white p-1 shadow-md rotate-[3deg] hover:rotate-0 transition-transform cursor-pointer" onClick={() => setShowPreviewModal('gif')}>
                {isVideoContent(gifUrl) ? (
                  <video src={gifUrl} autoPlay loop muted playsInline crossOrigin="anonymous" className="w-full h-full object-cover" />
                ) : (
                  <img src={gifUrl} className="w-full h-full object-cover" />
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Footer Info */}
        <section className="mt-32 w-full max-w-4xl border-t border-[#EAE1D3] pt-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <span className="text-[10px] font-black tracking-[0.5em] text-[#A68B67] uppercase">Archive metadata</span>
            <p className="text-[#8C7E6A] text-xs font-sans italic">
              Terima kasih telah berkunjung. Simpan momen berhargamu
            </p>
            <div className="flex items-center justify-center mt-8 opacity-40 text-[9px] font-black uppercase tracking-widest">
              <span>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

// Stable Preview Modal Component
const PreviewModal = ({ type, imageUrl, gifUrl, livePhotoUrl, photos, onClose, onDownload, onDownloadGif, onDownloadLivePhoto }: any) => {
  const downloadDirect = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Gagal memuat gambar');
      const blob = await response.blob();
      const localUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = localUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(localUrl), 1000);
    } catch (error) {
      console.error('Download error, falling back to window.open:', error);
      window.open(url, '_blank');
    }
  };

  const contentMap: Record<string, { title: string; render: React.ReactNode; onDownload: () => void | Promise<void> }> = {
    pictures: {
      title: 'Merged Pictures',
      render: <img src={imageUrl} className="w-full max-h-[60vh] object-contain shadow-2xl" />,
      onDownload: onDownload
    },
    original: {
      title: 'Original Shots',
      render: (
        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-2">
          {photos && photos.length > 0 ? photos.map((p: any, i: number) => (
            <div key={i} className="relative group">
              <img src={p.originalUrl || p.dataUrl} className="w-full aspect-[3/4] object-cover rounded-lg shadow-md" />
              <button
                onClick={() => downloadDirect(p.originalUrl || p.dataUrl, `photo-${i + 1}.png`)}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg"
              >
                <Download className="text-white w-6 h-6" />
              </button>
            </div>
          )) : (
            <div className="col-span-2 py-20 text-center text-[#8C7E6A] font-sans italic uppercase tracking-widest text-[10px]">
              Original photos not found in current session
            </div>
          )}
        </div>
      ),
      onDownload: async () => {
        // Download all photos sequentially with slight delay to prevent browser block
        const photoList = photos || [];
        for (let i = 0; i < photoList.length; i++) {
          const p = photoList[i];
          await downloadDirect(p.originalUrl || p.dataUrl, `photo-${i + 1}.png`);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    },
    gif: {
      title: 'Motion GIF',
      render: (
        <div className="w-full aspect-[3/4.5] bg-black flex items-center justify-center overflow-hidden shadow-2xl rounded-xl">
          {isVideoContent(gifUrl) ? (
            <video
              src={gifUrl}
              autoPlay
              loop
              muted
              playsInline
              crossOrigin="anonymous"
              className="w-full h-full object-contain"
              style={{ backgroundColor: 'black' }}
            />
          ) : (
            <img src={gifUrl} className="w-full h-full object-contain" />
          )}
        </div>
      ),
      onDownload: onDownloadGif
    },
    vislive: {
      title: 'LIVE PHOTO',
      render: (
        <div className="w-full aspect-[3/4.5] bg-black flex items-center justify-center overflow-hidden shadow-2xl rounded-xl">
          <video
            src={livePhotoUrl}
            autoPlay
            loop
            muted
            playsInline
            crossOrigin="anonymous"
            className="w-full h-full object-contain"
            style={{ backgroundColor: 'black' }}
          />
        </div>
      ),
      onDownload: onDownloadLivePhoto
    }
  };

  const content = contentMap[type];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#4A3F35]/40 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-[#FDFBF7] w-full max-w-lg rounded-3xl overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.2)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#EAE1D3] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-[0.3em] text-[#A68B67] uppercase">Preview</span>
            <h3 className="text-xl font-sans italic text-[#4A3F35]">{content?.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#F5F1EA] flex items-center justify-center hover:bg-[#EAE1D3] transition-colors"
          >
            <X className="w-5 h-5 text-[#4A3F35]" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          {content?.render}
        </div>

        <div className="p-8 bg-[#F5F1EA]/50 flex flex-col items-center gap-4">
          <p className="text-[10px] text-[#8C7E6A] font-sans italic text-center max-w-xs">
            "Karya ini siap untuk diabadikan di perangkat Anda."
          </p>
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: '#4A3F35' }}
            whileTap={{ scale: 0.95 }}
            onClick={content?.onDownload}
            className="w-full flex items-center justify-center gap-3 bg-[#A68B67] text-white py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#A68B67]/20"
          >
            <Download className="w-4 h-4" />
            Simpan ke Galeri
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Helper Component for Pill Button
const DownloadPill = ({ label, sub, icon, onClick, isLoading, disabled, delay }: any) => {
  return (
    <motion.button
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02, x: 10 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        group relative flex items-center justify-between w-full px-10 py-5 rounded-[50px]
        bg-white/40 backdrop-blur-md border border-white/60 shadow-[0_10px_30px_rgba(74,63,53,0.04)]
        hover:bg-[#4A3F35] hover:border-[#4A3F35] transition-all duration-500
        disabled:opacity-30 disabled:pointer-events-none
      `}
    >
      <div className="flex flex-col items-start text-left">
        <span className="text-xl font-black tracking-widest uppercase text-[#4A3F35] group-hover:text-white transition-colors">
          {label}
        </span>
        <span className="text-[9px] font-sans italic text-[#8C7E6A] group-hover:text-[#D1C4B2] tracking-wider transition-colors">
          {sub}
        </span>
      </div>

      <div className="w-12 h-12 rounded-full bg-[#FDFBF7] flex items-center justify-center text-[#4A3F35] group-hover:bg-[#A68B67] group-hover:text-white transition-all shadow-inner">
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-[#4A3F35] border-t-transparent rounded-full animate-spin group-hover:border-white" />
        ) : icon}
      </div>

      {/* Glossy Overlay */}
      <div className="absolute inset-0 rounded-[50px] bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
    </motion.button>
  );
};

export default DownloadPageClient;
