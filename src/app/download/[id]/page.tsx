"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Home, ArrowLeft, CheckCircle2, Info, Sparkles, Eye, X, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
// @ts-ignore - gif.js tidak memiliki tipe bawaan yang lengkap
import GIF from 'gif.js';
import { usePhotoStore } from '@/store/usePhotoStore';
import { applySlotTransformAndClip } from '@/lib/canvasUtils';

interface DownloadPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ u?: string; ug?: string }>;
}

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

const DownloadPage: React.FC<DownloadPageProps> = ({ params, searchParams }) => {
  const router = useRouter();
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



  // Ambil foto langsung dari store agar kualitas tidak turun (fallback ke PNG jika reload)
  const { photos, resetAll, selectedFrame, frameCategory } = usePhotoStore();
  const [dbFrame, setDbFrame] = useState<any>(null);
  const [serverPhotos, setServerPhotos] = useState<{ dataUrl: string; originalUrl: string }[]>([]);
  const [cacheBuster] = useState(() => Date.now());
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
    const getParams = async () => {
      const resolvedParams = await params;
      const id = resolvedParams.id;
      let u: string | undefined;
      let ug: string | undefined;
      let ul: string | undefined;
      try {
        const sp = (await (searchParams as any)) || searchParams || {};
        u = sp?.u as string | undefined;
        ug = sp?.ug as string | undefined;
        ul = sp?.ul as string | undefined;
      } catch {
        // ignore
      }
      const cleanId = id?.replace(/\.+$/, '') || '';
      setImageId(cleanId);

      // 0) Client-side Expiration Check based on ID timestamp
      const parts = cleanId.split('-');
      const timestamp = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(timestamp) && timestamp > 1000000000000 && timestamp < 2500000000000) {
        try {
          const settingsRes = await fetch('/api/admin/settings', { cache: 'no-store' });
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            const retentionDays = settingsData.photoRetentionDays || 7;
            const elapsedHours = (Date.now() - timestamp) / (1000 * 60 * 60);
            const limitHours = retentionDays * 24;
            
            if (elapsedHours > limitHours) {
              setError('expired');
              setIsLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error('Failed to fetch settings for expiration check:', e);
        }
      }

      const url = u || `${window.location.origin}/api/images/${cleanId}?v=${cacheBuster}`;
      setImageUrl(url);

      // Jika URL video sudah diberikan via query, set langsung tanpa polling
      if (ug) {
        setGifUrl(ug);
      }
      if (ul) {
        setLivePhotoUrl(ul);
      }

      // Jika sudah diberikan URL publik blob, lewati polling dan tampilkan langsung
      if (u) {
        setIsLoading(false);
        return;
      }

      // Polling ringan agar gambar muncul segera setelah tersedia (untuk URL API)
      let attempts = 0;
      const maxAttempts = 40; // ~30 detik
      const intervalMs = 750;
      let cleared = false;

      const checkOnce = async () => {
        try {
          const res = await fetch(url, { method: 'GET', cache: 'no-store' });
          if (res.status === 410) {
            setError('expired');
            setIsLoading(false);
            return false;
          }
          if (res.ok) {
            if (!cleared) {
              setIsLoading(false);
            }
            return true;
          }
        } catch { }
        return false;
      };

      checkOnce().then((ok) => {
        if (ok) return;
        const idInt = setInterval(async () => {
          attempts++;
          const okNow = await checkOnce();
          if (okNow || attempts >= maxAttempts) {
            clearInterval(idInt);
            cleared = true;
            setIsLoading(false);
          }
        }, intervalMs);
      });
    };
    getParams();
  }, [params]);

  // Extract customer name from ID if it follows the pattern cust-[name]-[timestamp]
  const getCustomerName = (id: string): string => {
    const match = id.match(/^cust-(.+)-(\d+)$/);
    if (match) {
      return match[1].replace(/-/g, ' ');
    }
    return '';
  };

  // Fetch foto original dari server jika store kosong (HP scan QR)
  useEffect(() => {
    if (!imageId || photos.length > 0 || serverPhotos.length > 0) return;

    const fetchOriginals = async () => {
      try {
        // Cek metadata dulu untuk tahu jumlah foto
        let photoCount = 4; // default
        try {
          const metaRes = await fetch(`/api/images/${imageId}-meta`, { cache: 'no-store' });
          if (metaRes.ok) {
            const metaBlob = await metaRes.blob();
            const metaText = await metaBlob.text();
            const meta = JSON.parse(metaText);
            if (meta.count) photoCount = meta.count;
          }
        } catch { }

        // Fetch setiap foto original
        const fetched: { dataUrl: string; originalUrl: string }[] = [];
        for (let i = 0; i < photoCount; i++) {
          try {
            const url = `${window.location.origin}/api/images/${imageId}-orig-${i}`;
            const res = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
            if (res.ok) {
              fetched.push({ dataUrl: url, originalUrl: url });
            }
          } catch { }
        }

        if (fetched.length > 0) {
          console.log(`✅ Fetched ${fetched.length} original photos from server`);
          setServerPhotos(fetched);
        } else {
          console.log('⚠️ No original photos found on server');
        }
      } catch (err) {
        console.error('Error fetching original photos:', err);
      }
    };

    // Delay sedikit agar upload dari mesin punya waktu selesai
    const timer = setTimeout(fetchOriginals, 3000);

    // Retry setelah 10 detik jika pertama gagal
    const retryTimer = setTimeout(() => {
      if (serverPhotos.length === 0 && photos.length === 0) {
        fetchOriginals();
      }
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearTimeout(retryTimer);
    };
  }, [imageId, photos.length, serverPhotos.length]);

  // Setelah imageId tersedia, mulai polling video bonus lebih awal dan lebih cepat
  useEffect(() => {
    let intervalId: any;
    const run = async () => {
      // Jika URL GIF publik sudah diberikan via query, tidak perlu polling
      if (gifUrl) return;

      // PASTIKAN DATA SIAP: Tunggu dbFrame jika kategori adalah database
      if (frameCategory === 'database' && !dbFrame) {
        console.log('Waiting for dbFrame before checking bonus...');
        return;
      }

      if (imageId) {
        const endpoint = `${window.location.origin}/api/images/${imageId}-bonus`;

        // FUNGSI CEK SERVER
        const checkServer = async () => {
          try {
            const res = await fetch(`${endpoint}?v=${Date.now()}`, {
              method: 'GET',
              cache: 'no-store',
              redirect: 'follow',
              headers: {
                'Accept': 'video/mp4,video/webm,image/gif,video/*,*/*',
                'Cache-Control': 'no-cache'
              }
            });
            if (res.ok) {
              setGifUrl(res.url);
              return true;
            }
          } catch (err) { }
          return false;
        };

        // 1. Cek dulu apakah server sudah punya bonus (dikirim dari FinalResultPage)
        const exists = await checkServer();
        if (exists) {
          console.log('Bonus found on server, skipping local generation.');
          return;
        }

        // 2. Jika belum ada di server, selalu polling. Jangan generate lokal karena akan menghasilkan GIF >5MB
        // yang dapat memicu error 413 (Payload Too Large) dan memblokir UI.
        // Biarkan mesin (FinalResultPage) yang menangani MP4 kecil secara efisien.

        // 3. Jika tidak ada di server dan tidak ada foto lokal (dibuka lewat QR), lakukan polling
        console.log('Polling for bonus from server...');
        let tries = 0;
        const maxTries = 60; // 12 detik
        const interval = 200;

        intervalId = setInterval(async () => {
          tries++;
          const found = await checkServer();
          if (found || tries >= maxTries) {
            clearInterval(intervalId);
          }
        }, interval);
      }
    };
    run();
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [imageId, gifUrl, photos.length, dbFrame, selectedFrame, frameCategory]);
  // Depend on imageId instead of imageUrl untuk mulai lebih awal

  // Fetch Live Photo dari server
  useEffect(() => {
    if (!imageId || livePhotoUrl) return;

        const checkLivePhoto = async () => {
          try {
            const endpoint = `${window.location.origin}/api/images/${imageId}-live`;
            const res = await fetch(`${endpoint}?v=${Date.now()}`, {
              method: 'GET',
              cache: 'no-store',
              redirect: 'follow', // Follow redirect to get final Supabase/Blob URL
              headers: {
                'Accept': 'video/webm,video/mp4,video/*,*/*',
                'Cache-Control': 'no-cache'
              }
            });
            if (res.ok) {
              console.log('✅ Live Photo found on server');
              // Gunakan res.url jika itu adalah URL final (Supabase/Vercel Blob)
              // URL final biasanya lebih stabil untuk tag <video> daripada melalui API route
              setLivePhotoUrl(res.url);
              return true;
            }
          } catch (err) { }
          return false;
        };

    // Cek awal segera
    checkLivePhoto().then(found => {
      if (found) return;

      // Polling untuk Live Photo (60 detik agar sinkron dengan upload dari mesin photobooth)
      let tries = 0;
      const maxTries = 120; // 60 detik (120 * 500ms)
      const interval = 500;

      const intervalId = setInterval(async () => {
        tries++;
        const found = await checkLivePhoto();
        if (found || tries >= maxTries) {
          clearInterval(intervalId);
          if (!found && tries >= maxTries) {
            console.log('⚠️ Live Photo not found on server after 60s');
            // Jika di mesin photobooth (punya data foto), coba generate lokal
            if (photos.filter(p => !!p.livePhotoUrl).length > 0) {
              console.log('Generating Live Photo locally as fallback...');
              generateLivePhotoVideo();
            }
          }
        }
      }, interval);

      // Cleanup interval on unmount
      const cleanup = () => clearInterval(intervalId);
      (window as any).__livePhotoCleanup = cleanup;
    });

    return () => {
      if ((window as any).__livePhotoCleanup) {
        (window as any).__livePhotoCleanup();
        delete (window as any).__livePhotoCleanup;
      }
    };
  }, [imageId, livePhotoUrl]);


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

      const W = layoutConfig.outputWidth;
      const H = layoutConfig.outputHeight;
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
      const gif = new GIF({
        workers: 2,
        quality: 10,
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

        const stream = canvas.captureStream(30);
        const types = [
          'video/mp4;codecs=h264',
          'video/mp4;codecs=avc1',
          'video/mp4',
          'video/webm;codecs=h264',
          'video/webm;codecs=vp8',
          'video/webm'
        ];
        const selectedType = types.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
        let mimeType = selectedType;

        const targetBytes = 2_000_000;
        const bitrate = 3000000; // 3 Mbps for crisp output under limit
        const frameDelay = 800;
        const framesPerLoop = 4;
        const loopDuration = framesPerLoop * (frameDelay / 1000);
        const estimatedDuration = (targetBytes * 8) / bitrate;
        const initialLoops = Math.max(3, Math.ceil(estimatedDuration / loopDuration));

        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        const videoBlobPromise = new Promise<Blob>((resolve) => {
          recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/mp4' }));
        });

        recorder.start();
        for (let loop = 0; loop < initialLoops; loop++) {
          for (let i = 0; i < framesPerLoop; i++) {
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

            await new Promise(resolve => setTimeout(resolve, frameDelay));
          }
        }
        recorder.stop();
        return await videoBlobPromise;
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

      // Setup MediaRecorder with best available type
      const types = [
        'video/mp4;codecs=h264',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      const selectedType = types.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

      const stream = canvas.captureStream(30); // 30 FPS
      const recorder = new MediaRecorder(stream, {
        mimeType: selectedType,
        videoBitsPerSecond: 3000000 // 3 Mbps - Sharp quality but < 3MB for 7s output
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const videoPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: selectedType });
          resolve(blob);
        };
      });

      recorder.start();

      // Play all videos and record (max 7 seconds)
      await Promise.all(videoElements.map(v => v.play()));

      const duration = 7000; // 7 seconds
      const fps = 30;
      const frameDelay = 1000 / fps;
      const totalFrames = Math.floor(duration / frameDelay);

      for (let frame = 0; frame < totalFrames; frame++) {
        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw background if exists
        if (backgroundImg) {
          ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
        }

        // Draw videos in slots
        if (layoutConfig.slots.length >= photosWithLivePhoto.length) {
          // Use database slots
          for (let i = 0; i < photosWithLivePhoto.length; i++) {
            const slot = layoutConfig.slots[i];
            const video = videoElements[i];
            if (slot && video) {
              ctx.save();
              // Mirror logic per user request
              ctx.translate(slot.x + slot.width / 2, slot.y + slot.height / 2);
              ctx.scale(-1, 1);
              ctx.translate(-(slot.x + slot.width / 2), -(slot.y + slot.height / 2));
              ctx.drawImage(video, slot.x, slot.y, slot.width, slot.height);
              ctx.restore();
            }
          }
        } else {
          // Default 2x2 grid
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
            ctx.save();
            // Mirror logic per user request
            ctx.translate(x + w / 2, y + h / 2);
            ctx.scale(-1, 1);
            ctx.translate(-(x + w / 2), -(y + h / 2));
            ctx.drawImage(video, x, y, w, h);
            ctx.restore();
          }
        }

        // Draw overlay if exists
        if (overlayImg) {
          ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
        }

        await new Promise(resolve => setTimeout(resolve, frameDelay));
      }

      recorder.stop();
      const videoBlob = await videoPromise;

      // Create URL
      const url = URL.createObjectURL(videoBlob);
      setLivePhotoUrl(url);

      console.log('✅ Live Photo video generated:', videoBlob.size, 'bytes');
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

      // Konversi jika masih GIF
      if (contentType.includes('gif') || blob.type.includes('gif') || gifUrl.includes('.gif')) {
        try {
          videoBlob = await convertGifToMp4(blob);
        } catch {
          videoBlob = blob;
        }
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
      const actualExt = blob.type.includes('webm') ? 'webm' : 'mp4';
      const actualFileName = fileName.replace('.mp4', `.${actualExt}`);
      const blobUrl = URL.createObjectURL(blob);

      // Download menggunakan blob URL
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = actualFileName;
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

  if (error === 'expired') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-8 p-10 bg-white rounded-3xl border border-[#EAE1D3] shadow-xl">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-serif italic text-[#4A3F35]">Sesi Unduhan Kedaluwarsa</h2>
            <p className="text-[#8C7E6A] text-xs font-serif italic leading-relaxed">
              Mohon maaf, demi menjaga privasi dan keamanan data Anda, file foto ini telah dihapus dari sistem kami secara otomatis karena telah melewati batas waktu penyimpanan yang ditentukan.
            </p>
          </div>
          <div className="h-[1px] bg-[#EAE1D3]" />
          <p className="text-[10px] text-[#A68B67] font-black uppercase tracking-widest">
            dovelens.ft • moment archive
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-10">
          <div className="space-y-4">
            <h2 className="text-3xl font-serif italic text-[#4A3F35]">Menyiapkan Kenangan Anda</h2>
            <p className="text-[#8C7E6A] text-sm font-serif italic leading-relaxed">
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
            className="text-center mb-16 space-y-4"
          >
            <h2 className="text-[40px] font-serif italic text-[#4A3F35] leading-tight">
              Koleksi <span className="text-[#A68B67] not-italic font-black text-3xl uppercase tracking-[0.3em]">Digital</span>
            </h2>
            <p className="text-[#8C7E6A] text-xs font-serif italic tracking-widest uppercase opacity-70">
              "Archive your special moments"
            </p>
          </motion.div>

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
            <p className="text-[#8C7E6A] text-xs font-serif italic">
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
          {photos.length > 0 ? photos.map((p: any, i: number) => (
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
            <div className="col-span-2 py-20 text-center text-[#8C7E6A] font-serif italic uppercase tracking-widest text-[10px]">
              Original photos not found in current session
            </div>
          )}
        </div>
      ),
      onDownload: async () => {
        // Download all photos sequentially with slight delay to prevent browser block
        for (let i = 0; i < photos.length; i++) {
          const p = photos[i];
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
            <h3 className="text-xl font-serif italic text-[#4A3F35]">{content?.title}</h3>
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
          <p className="text-[10px] text-[#8C7E6A] font-serif italic text-center max-w-xs">
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
        <span className="text-[9px] font-serif italic text-[#8C7E6A] group-hover:text-[#D1C4B2] tracking-wider transition-colors">
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

export default DownloadPage;
