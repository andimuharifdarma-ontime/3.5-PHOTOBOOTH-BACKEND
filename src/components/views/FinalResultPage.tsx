"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { addToOfflineQueue } from '@/services/offline-queue';
import { isElectron } from '@/lib/electron';
import { Download, Printer, QrCode, ArrowLeft, Home, X, Plus, Minus, CreditCard, Camera, Info } from 'lucide-react';
import { usePhotoStore } from '@/store/usePhotoStore';
import { getFrameLayoutConfig } from '@/lib/frameLayouts';
import type { FrameCategory } from '@/lib/frameLayouts';
import { applySlotTransformAndClip } from '@/lib/canvasUtils';
import type { PhotoData } from '@/store/usePhotoStore';
import FrameRenderer from '@/components/photobooth/frames/FrameRenderer';
import QRCodeGenerator from '@/components/photobooth/shared/QRCodeGenerator';
import { WavyBackground } from '@/components/ui/wavy-background';
import DbFramePreview from '@/components/photobooth/result/DbFramePreview';
// removed unused html2canvas



const FinalResultPage: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { photos, selectedFrame, clearPhotos, stopCamera, userName, resetAll, frameCategory, isHydrated, sessionId, systemSettings, settingsLoaded, printQuantity } = usePhotoStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showQR, setShowQR] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloadRemainingMs, setDownloadRemainingMs] = useState<number>(-1); // -1 = belum diinisialisasi
  const [timerStarted, setTimerStarted] = useState(false);
  const hasRedirected = useRef(false); // Mencegah multiple redirect
  const hasBackedUp = useRef(false); // Mencegah duplikasi backup
  const hasSavedOfflineSession = useRef(false); // Mencegah duplikasi history
  const [isBackingUp, setIsBackingUp] = useState(true); // Start as true, set false when backup completes
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [isPaymentEnabled, setIsPaymentEnabled] = useState<boolean>(true);
  const [printProgress, setPrintProgress] = useState(0);
  const [healedPhotos, setHealedPhotos] = useState<PhotoData[] | null>(null);

  // STABILIZE QR & DOWNLOAD ID:
  // Tunggu hingga hidrasi selesai agar sessionId dan userName stabil.
  // Kita baca langsung dari localeStorage jika tersedia untuk akurasi instan.
  const stableMediaId = useMemo(() => {
    if (!isHydrated) return null;

    // Ambil data langsung dari store atau localStorage sebagai fallback instan
    let activeSessionId = sessionId;
    let activeUserName = userName;

    if (typeof window !== 'undefined') {
      if (!activeSessionId) activeSessionId = localStorage.getItem('photobooth.sessionId') || '';
      if (!activeUserName) activeUserName = localStorage.getItem('photobooth.userName') || '';
    }

    if (!activeSessionId) return null;

    return activeUserName
      ? `cust-${activeUserName.replace(/[^a-zA-Z0-9]/g, '-')}-${activeSessionId}`
      : activeSessionId;
  }, [isHydrated, sessionId, userName]);

  // Printer Animation Logic
  useEffect(() => {
    let animationFrameId: number;
    let timeoutId: NodeJS.Timeout;

    // Easing function for smoother movement: easeOutQuad
    const easeOutQuad = (t: number) => t * (2 - t);

    const runAnimation = (duration: number) => {
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const rawProgress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutQuad(rawProgress) * 100;

        setPrintProgress(easedProgress);

        if (rawProgress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        }
      };

      animationFrameId = requestAnimationFrame(animate);
    };

    if (!isPaymentEnabled) {
      // Jika mode gratis, auto print setelah delay kecil
      timeoutId = setTimeout(() => runAnimation(4000), 800);
    } else {
      // Jika mode bayar
      if (paymentVerified) {
        // Jika sudah bayar, jalankan animasi (lebih lambat biar dramatis)
        runAnimation(5000);
      } else {
        // Jika belum bayar, reset ke 0 (hidden/inside printer)
        setPrintProgress(0);
      }
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isPaymentEnabled, paymentVerified]);

  // Database frame state
  const [dbFrame, setDbFrame] = useState<{
    id: string;
    name: string;
    imageUrl: string;
    previewUrl: string;
    outputWidth: number;
    outputHeight: number;
    slots: { x: number; y: number; width: number; height: number }[];
    maxSlots: number;
    framePosition: string;
    price: number;
  } | null>(null);



  // Live View / Mirror Camera Logic
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startLiveView = async () => {
      try {
        // Minta akses kamera dengan resolusi hemat resource (kecil saja cukup untuk preview)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 480 },
            facingMode: 'user',
            frameRate: { ideal: 30 }
          },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Live View: Camera access denied or not available", err);
      }
    };

    // Delay sedikit agar tidak berebut dengan resource utama saat transisi
    const timer = setTimeout(startLiveView, 1000);

    return () => {
      clearTimeout(timer);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Database frame state
  const [orderedPhotos, setOrderedPhotos] = useState<PhotoData[]>([]);

  // Read selected photo order from localStorage and reorder photos
  useEffect(() => {
    const maxS = dbFrame?.maxSlots || 4;
    try {
      const savedOrder = localStorage.getItem('photobooth.selectedPhotoOrder');
      if (savedOrder && photos.length >= maxS) {
        const orderIndices = JSON.parse(savedOrder) as number[];
        if (orderIndices.length === maxS) {
          const reordered = orderIndices.map(i => photos[i]).filter(Boolean);
          if (reordered.length === maxS) {
            setOrderedPhotos(reordered);
            // Clear the saved order after using it
            localStorage.removeItem('photobooth.selectedPhotoOrder');
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error reading photo order:', error);
    }
    // Fallback to original order
    setOrderedPhotos(photos.slice(0, maxS));
  }, [photos, dbFrame]);

  // Use orderedPhotos for rendering (with fallback to photos)
  // Photo healing: If blobs are dead (after redirect), try to fetch from server

  useEffect(() => {
    if (isHydrated && photos.length > 0) {
      const firstPhoto = photos[0];
      if (firstPhoto.dataUrl && firstPhoto.dataUrl.startsWith('blob:')) {
        const id = userName ? `cust-${userName.replace(/[^a-zA-Z0-9]/g, '-')}-${sessionId}` : sessionId;

        // Test if blobs are still valid
        const img = new Image();
        img.onload = () => { /* Blobs are still good */ };
        img.onerror = () => {
          // console.log('🩹 Healing dead blobs from server...');
          const healed = photos.map((p, i) => ({
            ...p,
            dataUrl: `/api/images/${id}-orig-${i}`,
            originalUrl: `/api/images/${id}-orig-${i}`,
            // livePhotoUrl is harder to heal but let's try assuming standard pattern
            livePhotoUrl: p.livePhotoUrl?.startsWith('blob:') ? undefined : p.livePhotoUrl
          }));
          setHealedPhotos(healed);
        };
        img.src = firstPhoto.dataUrl;
      }
    }
  }, [isHydrated, photos, sessionId, userName]);

  const sourcePhotos = healedPhotos || photos;
  const displayPhotos = orderedPhotos.length === (dbFrame?.maxSlots || 4)
    ? orderedPhotos
    : sourcePhotos.slice(0, (dbFrame?.maxSlots || 4));

  useEffect(() => {
    if (settingsLoaded) {
      const enabled = systemSettings.isPaymentEnabled !== false;
      // Sync payment enabled state
      setIsPaymentEnabled(enabled);
      if (!enabled) {
        setPaymentVerified(true);
        setPaymentStatus('success');

        // 🔥 Save to history for non-payment session
        if (!hasSavedOfflineSession.current && selectedFrame && userName && shareUrl) {
          hasSavedOfflineSession.current = true;

          fetch('/api/client/offline-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userName: userName || 'anonymous',
              frameId: selectedFrame,
              frameName: layoutConfig.name || 'Photo Print',
              quantity: printQuantity, // Set to the selected print quantity
              imageUrl: shareUrl
            })
          }).then(r => r.json())
            .then(data => {
              if (data.orderId) {
                // console.log('✅ Offline session tracked:', data.orderId);
                setCurrentOrderId(data.orderId);
              }
            })
            .catch(e => console.error('❌ Failed to save offline session', e));
        }
      }
    }
  }, [settingsLoaded, systemSettings.isPaymentEnabled, selectedFrame, userName, shareUrl, printQuantity]);

  // Fetch database frame if category is 'database'
  useEffect(() => {
    if (frameCategory === 'database' && selectedFrame) {
      fetch(`/api/frames/${selectedFrame}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            // Ensure imageUrl is absolute to avoid relative path 404 errors
            let imageUrl = data.imageUrl;
            if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
              imageUrl = `/${imageUrl}`;
            }

            setDbFrame({
              ...data,
              imageUrl,
              slots: Array.isArray(data.slots) ? data.slots : [],
              maxSlots: data.maxSlots || 4,
              price: data.theme?.price || data.price || 5000,
            });
          }
        })
        .catch(err => console.error('Failed to fetch db frame:', err));
    }
  }, [frameCategory, selectedFrame]);

  // Use database frame config or legacy config
  const layoutConfig = useMemo(() => {
    if (frameCategory === 'database' && dbFrame) {
      return {
        id: dbFrame.id,
        category: 'database' as const,
        name: dbFrame.name,
        previewUrl: dbFrame.previewUrl,
        backgroundUrl: dbFrame.framePosition === 'background' ? dbFrame.imageUrl : undefined,
        overlayUrl: dbFrame.framePosition === 'overlay' ? dbFrame.imageUrl : undefined,
        outputWidth: dbFrame.outputWidth,
        outputHeight: dbFrame.outputHeight,
        slots: dbFrame.slots,
      };
    }
    return getFrameLayoutConfig(selectedFrame, frameCategory);
  }, [selectedFrame, frameCategory, dbFrame]);

  const previewBaseWidth = frameCategory === 'frames2' ? 360 : (frameCategory === 'database' ? 360 : 400);
  const previewHeight = Math.round(previewBaseWidth * (layoutConfig.outputHeight / layoutConfig.outputWidth));

  // Timer untuk halaman hasil (berdasarkan settings)
  useEffect(() => {
    if (!settingsLoaded) return;

    if (systemSettings.isResultTimerEnabled === false) {
      setTimerStarted(false);
      setDownloadRemainingMs(-1);
      return;
    }

    const KEY = 'photobooth.downloadDeadlineMs';
    const SETTING_KEY = 'photobooth.downloadTimerSetting';
    const timerMinutes = systemSettings.resultTimer || 1;

    const now = Date.now();
    let deadline = 0;
    let savedSetting = 0;
    try {
      deadline = parseInt(localStorage.getItem(KEY) || '0', 10);
      savedSetting = parseInt(localStorage.getItem(SETTING_KEY) || '0', 10);
    } catch { }

    // If setting changed, reset deadline
    if (savedSetting !== timerMinutes) {
      deadline = 0;
      try { localStorage.setItem(SETTING_KEY, String(timerMinutes)); } catch { }
    }

    const timerMs = timerMinutes * 60 * 1000;

    if (!deadline || deadline <= now) {
      deadline = now + timerMs;
      try { localStorage.setItem(KEY, String(deadline)); } catch { }
    }
    const update = () => setDownloadRemainingMs(Math.max(0, deadline - Date.now()));
    update();
    setTimerStarted(true);
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [settingsLoaded, systemSettings]);

  // Redirect ke halaman awal ketika waktu habis (hanya setelah timer dimulai)
  useEffect(() => {
    if (timerStarted && downloadRemainingMs === 0 && !hasRedirected.current) {
      hasRedirected.current = true;

      // Hapus timer dari localStorage
      try {
        localStorage.removeItem('photobooth.downloadDeadlineMs');
        localStorage.removeItem('photobooth.sessionDeadlineMs');
      } catch { }

      // Reset semua data
      resetAll();

      // Redirect ke halaman pertama
      router.push('/');
    }
  }, [downloadRemainingMs, timerStarted, resetAll, router]);



  // Check for status from URL params (from payment redirect)

  // Check for payment status from URL params
  useEffect(() => {
    if (!isHydrated) return;

    const searchParams = new URLSearchParams(window.location.search);
    const orderId = searchParams.get('orderId');
    const urlQty = searchParams.get('qty');
    const status = searchParams.get('status');

    // Prioritize URL quantity, then store printQuantity
    const qty = urlQty ? parseInt(urlQty, 10) : (printQuantity || 1);


    // Always ensure local quantity state is synced
    if (qty) {
      setQuantity(qty);
    }

    // Handle immediate success from payment-success page redirect
    if (status === 'paid' && stableMediaId) {
      setPaymentVerified(true);
      setPaymentStatus('success');
      if (orderId) setCurrentOrderId(orderId);

      // PRE-INIT SHARE URL (Bypass synthesis loading) - Direct redirect from Doku
      const fullUrl = `${window.location.protocol}//${window.location.host}/download/${stableMediaId}`;
      setShareUrl(fullUrl);
      setIsGeneratingQR(false);
      setIsBackingUp(false);
    }

    // If we have an orderId, verify it against the server (Polling for background updates)
    // ONLY poll if status is NOT already 'paid' from URL to avoid spam and redundant requests
    if (orderId && status !== 'paid') {
      setCurrentOrderId(orderId);

      const checkStatus = async () => {
        try {
          // Silent fetch to avoid console clutter
          const res = await fetch(`/api/payment/status/${orderId}`);
          if (!res.ok) return false;

          const data = await res.json();

          if (data.status === 'paid' || data.status === 'printed') {
            setPaymentVerified(true);
            setPaymentStatus('success');
            return true; // Stop polling
          }
        } catch (err) {
          // Silently fail to avoid console spray
        }
        return false;
      };

      // Initial check and polling
      checkStatus().then(stop => {
        if (!stop) {
          const interval = setInterval(async () => {
            const shouldStop = await checkStatus();
            if (shouldStop) clearInterval(interval);
          }, 5000);

          // Stop polling after 3 minutes (180s)
          setTimeout(() => clearInterval(interval), 180000);

          return () => clearInterval(interval);
        }
      });
    }
  }, [printQuantity, isHydrated, stableMediaId]);

  // Redirect to session if photos are insufficient (but only after hydration is complete)
  useEffect(() => {
    const maxS = dbFrame?.maxSlots || 4;
    if (isHydrated && photos.length < maxS && !isResetting && !hasRedirected.current) {
      router.push('/session');
    }
  }, [photos.length, router, isResetting, isHydrated, dbFrame]);

  // When QR panel is opened, prepare a shareable image URL
  useEffect(() => {
    async function generate() {
      // OPTIMASI: Jika user kembali dari halaman Doku (payment return), lewati synthesis & upload.
      // Media sudah harus tertanam di server dari kunjungan pertama sebelum checkout.
      const searchParams = new URLSearchParams(window.location.search);
      const isPaymentReturn = searchParams.get('status') === 'paid' || searchParams.get('orderId');

      if (isPaymentReturn && stableMediaId) {
        const fullUrl = `${window.location.protocol}//${window.location.host}/download/${stableMediaId}`;

        // Langsung set URL dan hentikan loading
        setShareUrl(fullUrl);
        setIsGeneratingQR(false);
        setIsBackingUp(false);
        return;
      }

      setIsGeneratingQR(true);
      const id = stableMediaId!;
      try {
        // 1) Render hasil ke PNG (Borderless untuk hasil download/scan)
        const imgUrl = await generateDownloadImage({ isBorderless: true });
        if (!imgUrl) return;
        let blob = await fetch(imgUrl).then(r => r.blob());
        URL.revokeObjectURL(imgUrl);

        // Kompres adaptif: jaga ukuran < 4MB (Vercel limit 4.5MB), turunkan kualitas JPEG bertahap
        const MAX_BYTES = 4_000_000;
        if (blob.size > MAX_BYTES) {
          try {
            // Gunakan HTMLImage agar kompatibel Safari/iOS
            const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
              const url = URL.createObjectURL(blob);
              const im = new Image();
              im.onload = () => { URL.revokeObjectURL(url); resolve(im); };
              im.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
              im.src = url;
            });
            const canvas = document.createElement('canvas');
            canvas.width = imgEl.width;
            canvas.height = imgEl.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(imgEl, 0, 0);
              let quality = 0.9;
              for (let i = 0; i < 6; i++) {
                const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(b => resolve(b), 'image/jpeg', quality));
                if (!out) break;
                blob = out;
                if (blob.size <= MAX_BYTES || quality <= 0.6) break;
                quality -= 0.06;
              }
            }
          } catch { }
        }

        const fullUrl = `${window.location.protocol}//${window.location.host}/download/${stableMediaId}`;
        setShareUrl(fullUrl);
        setIsGeneratingQR(false);

        const postImage = fetch(`/api/images/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': blob.type || 'image/png' },
          body: blob
        }).catch(() => { });

        // 4) Paralel: generate BONUS MP4
        const generateMp4AndUpload = (async () => {
          try {
            const maxS = dbFrame?.maxSlots || 4;
            if (photos.length < maxS) return null;
            const W = dbFrame?.outputWidth || 800;
            const H = dbFrame?.outputHeight || 1200;

            const loadImage = (src: string) =>
              new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
              });

            const [backgroundFrame, overlayFrame, loadSlices] = await (async () => {
              let bg: HTMLImageElement | null = null;
              let ov: HTMLImageElement | null = null;
              if (frameCategory === 'database' && dbFrame?.imageUrl) {
                const img = await loadImage(dbFrame.imageUrl);
                if (dbFrame.framePosition === 'background') bg = img;
                else ov = img;
              } else if (frameCategory === 'frames2' && layoutConfig.backgroundUrl) bg = await loadImage(layoutConfig.backgroundUrl);
              else if (frameCategory === 'standard' && layoutConfig.overlayUrl) ov = await loadImage(layoutConfig.overlayUrl);
              const slices = await Promise.all(displayPhotos.slice(0, maxS).map(p => loadImage(p.dataUrl)));
              return [bg, ov, slices] as const;
            })();

            const slotBoxes = mapSlotsToPixels(W, H);
            const boxes = slotBoxes ?? await detectGreenBoxes(layoutConfig.detectionUrl ?? layoutConfig.overlayUrl ?? layoutConfig.backgroundUrl, W, H);

            // console.log('[MEDIA] 📹 Menyiapkan GIF/Bonus Synthesis...');
            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) return null;

            const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : (canvas as any).webkitCaptureStream?.(30);
            if (!stream) return null;

            let mimeType = 'video/mp4;codecs=h264';
            if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = 'video/mp4;codecs=avc1';
              if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/mp4';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                  mimeType = 'video/webm;codecs=vp8';
                  if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
                }
              }
            }

            // High quality bitrate: 3 Mbps (Sharp but < 3MB for 4s)
            const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3000000 });
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            const videoBlobPromise = new Promise<Blob>((resolve) => { recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType })); });

            recorder.start();
            const duration = 4000;
            const startTime = performance.now();
            await new Promise<void>((resolve) => {
              const renderLoop = () => {
                const elapsed = performance.now() - startTime;
                if (elapsed >= duration) { resolve(); return; }
                const photoIdx = Math.floor(elapsed / 500) % loadSlices.length;
                const currentImg = loadSlices[photoIdx];

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);

                if (backgroundFrame) ctx.drawImage(backgroundFrame, 0, 0, W, H);
                else drawFrameBackground(ctx, selectedFrame, W, H);

                if (boxes) {
                  boxes.forEach((box, index) => {
                    if (!currentImg || !box) return;
                    const useLegacy = frameCategory === 'standard' && !slotBoxes;
                    const exLR = useLegacy ? box.width * 0.15 : 0;
                    const exD = useLegacy ? box.height * 0.10 : 0;
                    const offY = useLegacy && index === 0 ? H * 0.40 : 0;

                    const bx = Math.max(0, box.x - exLR);
                    const by = box.y + offY;
                    const bw = box.width + exLR * 2;
                    const bh = box.height + exD;

                    ctx.save();
                    applySlotTransformAndClip(ctx, bx, by, bw, bh, (box as any).rotation, (box as any).borderRadius, slotBoxes ? 10 : 20);

                    // Mirror logic per user request
                    ctx.translate(bx + bw / 2, by + bh / 2);
                    ctx.scale(-1, 1);
                    ctx.translate(-(bx + bw / 2), -(by + bh / 2));

                    const imgAspect = currentImg.width / currentImg.height;
                    const targetAspect = bw / bh;
                    let dw, dh, ox, oy;
                    if (imgAspect > targetAspect) { dh = bh; dw = dh * imgAspect; ox = (bw - dw) / 2; oy = 0; }
                    else { dw = bw; dh = dw / imgAspect; ox = 0; oy = (bh - dh) / 2; }

                    ctx.drawImage(currentImg, bx + ox, by + oy, dw, dh);
                    ctx.restore();
                  });
                }
                if (overlayFrame) ctx.drawImage(overlayFrame, 0, 0, W, H);
                else if (frameCategory === 'standard') drawFrameDecorations(ctx, selectedFrame, W, H);
                requestAnimationFrame(renderLoop);
              };
              requestAnimationFrame(renderLoop);
            });

            recorder.stop();
            const videoBlob = await videoBlobPromise;
            const res = await fetch(`/api/images/${id}-bonus`, {
              method: 'POST',
              headers: { 'Content-Type': mimeType.includes('mp4') || mimeType.includes('h264') ? 'video/mp4' : 'video/webm' },
              body: videoBlob
            });
            const j = await res.json().catch(() => null);
            return j?.url as string | null;
          } catch (error) {
            console.error('[MEDIA] GIF Error:', error);
            return null;
          }
        })();

        // 5) Upload Live Photo
        const uploadLivePhoto = (async () => {
          try {
            const photosWithLivePhoto = displayPhotos.filter(p => !!p.livePhotoUrl);
            if (photosWithLivePhoto.length === 0) return null;
            const canvas = document.createElement('canvas');
            canvas.width = dbFrame?.outputWidth || 1080;
            canvas.height = dbFrame?.outputHeight || 1920;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) return null;

            // Kualitas rendering maksimal
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            const videoElements = await Promise.all(photosWithLivePhoto.map(photo => {
              return new Promise<HTMLVideoElement>((resolve, reject) => {
                const v = document.createElement('video');
                v.src = photo.livePhotoUrl!;
                v.muted = v.playsInline = true;
                v.crossOrigin = 'anonymous';
                v.onloadeddata = () => resolve(v);
                v.onerror = reject;
                v.load();
              });
            }));

            const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : (canvas as any).webkitCaptureStream?.(30);

            // Preferensi MP4 untuk download otomatis di semua device (iOS/Android)
            let mimeType = 'video/mp4;codecs=h264';
            if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = 'video/mp4';
              if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm;codecs=vp9';
                if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
              }
            }

            // Bitrate 2.5Mbps: Sangat tajam untuk 5 detik (~1.5MB), aman di bawah limit 3MB & Vercel
            const recorder = new MediaRecorder(stream, {
              mimeType,
              videoBitsPerSecond: 2500000
            });

            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            const recordPromise = new Promise<Blob>((resolve) => {
              recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
            });

            recorder.start();
            let frameImg: HTMLImageElement | null = null;
            if (dbFrame?.imageUrl) {
              frameImg = await new Promise(r => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => r(i); i.onerror = () => r(null); i.src = dbFrame.imageUrl; });
            }

            videoElements.forEach(v => { v.currentTime = 0; v.loop = true; v.play().catch(() => { }); });
            const startTime = performance.now();
            await new Promise<void>((resolve) => {
              const renderLoop = () => {
                const elapsed = performance.now() - startTime;
                if (elapsed >= 5000) { resolve(); return; }

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                if (frameImg && dbFrame?.framePosition === 'background') ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

                if (dbFrame?.slots) {
                  dbFrame.slots.forEach((slot, idx) => {
                    const video = videoElements[idx % videoElements.length];
                    if (video && video.readyState >= 2) {
                      const sx = slot.x * canvas.width, sy = slot.y * canvas.height, sw = slot.width * canvas.width, sh = slot.height * canvas.height;
                      ctx.save();
                      applySlotTransformAndClip(ctx, sx, sy, sw, sh, (slot as any).rotation, (slot as any).borderRadius, 0);

                      // Mirror logic
                      ctx.translate(sx + sw / 2, sy + sh / 2);
                      ctx.scale(-1, 1);
                      ctx.translate(-(sx + sw / 2), -(sy + sh / 2));

                      const vAspect = video.videoWidth / video.videoHeight;
                      const sAspect = sw / sh;
                      let dw, dh, ox, oy;
                      if (vAspect > sAspect) {
                        dh = sh; dw = sh * vAspect;
                        ox = (sw - dw) / 2; oy = 0;
                      } else {
                        dw = sw; dh = sw / vAspect;
                        ox = 0; oy = (sh - dh) / 2;
                      }

                      ctx.drawImage(video, sx + ox, sy + oy, dw, dh);
                      ctx.restore();
                    }
                  });
                }

                if (frameImg && dbFrame?.framePosition === 'overlay') ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
                requestAnimationFrame(renderLoop);
              };
              requestAnimationFrame(renderLoop);
            });

            videoElements.forEach(v => v.pause());
            recorder.stop();
            const blob = await recordPromise;
            const res = await fetch(`/api/images/${id}-live`, {
              method: 'POST',
              headers: { 'Content-Type': mimeType },
              body: blob
            });
            const data = await res.json().catch(() => ({}));
            return data.url;
          } catch (e) {
            console.error('❌ Live Photo synthesis error:', e);
            return null;
          }
        })();

        // 6) Original Photos
        const uploadOriginals = (async () => {
          try {
            await Promise.allSettled(photos.map(async (p, i) => {
              const b = await fetch(p.originalUrl || p.dataUrl).then(r => r.blob());
              await fetch(`/api/images/${id}-orig-${i}`, { method: 'POST', body: b });
            }));
            await fetch(`/api/images/${id}-meta`, { method: 'POST', body: JSON.stringify({ count: photos.length }) }).catch(() => { });
          } catch (e) { }
        })();

        const pMain = postImage, pBonus = generateMp4AndUpload, pLive = uploadLivePhoto, pOriginals = uploadOriginals;

        if (!hasBackedUp.current) {
          hasBackedUp.current = true;
          setIsBackingUp(true);
          (async () => {
            try {
              const [m, b, l, o] = await Promise.all([pMain.then(() => 1).catch(() => 0), pBonus.catch(() => null), pLive.catch(() => null), pOriginals.then(() => 1).catch(() => 0)]);
              if (systemSettings.isGoogleDriveBackupEnabled !== false) {
                await fetch('/api/backup-to-drive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageId: id, bonusId: `${id}-bonus`, liveId: `${id}-live`, userName: userName || 'anonymous' }) });
              }
            } catch (e) { } finally { setIsBackingUp(false); }
          })();
        }
      } finally {
        setIsGeneratingQR(false);
      }
    }

    if (showQR && !shareUrl && !isGeneratingQR && photos.length >= 4 && isHydrated && stableMediaId) {
      if (frameCategory === 'database' && !dbFrame) return;
      const timer = setTimeout(generate, 2000);
      return () => clearTimeout(timer);
    }
  }, [showQR, photos.length, shareUrl, isGeneratingQR, stableMediaId, isHydrated, dbFrame, frameCategory]);

  // Don't render if photos are insufficient
  if (photos.length < 4) {
    return null;
  }

  const formatTime = (ms: number) => {
    if (ms < 0) return '02:00'; // tampilkan 2 menit saat belum diinisialisasi
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Fungsi untuk mendeteksi kotak hijau dari frame overlay (sama seperti FrameRenderer)
  const detectGreenBoxes = async (sourcePath: string | undefined, canvasWidth: number, canvasHeight: number): Promise<Array<{ x: number, y: number, width: number, height: number }> | null> => {
    if (!sourcePath) return null;
    try {
      // Load frame overlay
      const overlay = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = sourcePath;
      });

      // Create temporary canvas untuk analisis
      const analysisCanvas = document.createElement('canvas');
      analysisCanvas.width = canvasWidth;
      analysisCanvas.height = canvasHeight;
      const analysisCtx = analysisCanvas.getContext('2d');
      if (!analysisCtx) return null;

      // Draw overlay ke canvas
      analysisCtx.drawImage(overlay, 0, 0, canvasWidth, canvasHeight);

      // Ambil image data
      const imageData = analysisCtx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imageData.data;

      // Deteksi semua kotak hijau
      const greenBoxes: Array<{ minX: number, minY: number, maxX: number, maxY: number }> = [];
      const visited = new Set<string>();

      // Threshold untuk mendeteksi hijau
      for (let y = 0; y < canvasHeight; y++) {
        for (let x = 0; x < canvasWidth; x++) {
          const idx = (y * canvasWidth + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          // Deteksi hijau
          const isGreen = a > 100 && g > 150 && g > r * 1.3 && g > b * 1.3;
          const isLightGreen = a > 100 && g > 120 && (g - r) > 50 && (g - b) > 50;

          if ((isGreen || isLightGreen) && !visited.has(`${x},${y}`)) {
            // Flood fill untuk menemukan seluruh kotak hijau
            const box = { minX: x, minY: y, maxX: x, maxY: y };
            const queue: Array<[number, number]> = [[x, y]];
            visited.add(`${x},${y}`);

            while (queue.length > 0) {
              const [cx, cy] = queue.shift()!;

              // Update bounds
              box.minX = Math.min(box.minX, cx);
              box.minY = Math.min(box.minY, cy);
              box.maxX = Math.max(box.maxX, cx);
              box.maxY = Math.max(box.maxY, cy);

              // Check neighbors
              const neighbors = [
                [cx - 1, cy], [cx + 1, cy],
                [cx, cy - 1], [cx, cy + 1]
              ];

              for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < canvasWidth && ny >= 0 && ny < canvasHeight) {
                  const key = `${nx},${ny}`;
                  if (!visited.has(key)) {
                    const nIdx = (ny * canvasWidth + nx) * 4;
                    const nr = data[nIdx];
                    const ng = data[nIdx + 1];
                    const nb = data[nIdx + 2];
                    const na = data[nIdx + 3];
                    const nIsGreen = na > 100 && ng > 150 && ng > nr * 1.3 && ng > nb * 1.3;
                    const nIsLightGreen = na > 100 && ng > 120 && (ng - nr) > 50 && (ng - nb) > 50;

                    if (nIsGreen || nIsLightGreen) {
                      visited.add(key);
                      queue.push([nx, ny]);
                    }
                  }
                }
              }
            }

            // Hanya tambahkan kotak yang cukup besar (untuk menghindari noise)
            const boxWidth = box.maxX - box.minX;
            const boxHeight = box.maxY - box.minY;
            if (boxWidth > 50 && boxHeight > 50) {
              greenBoxes.push(box);
            }
          }
        }
      }

      // Sort kotak berdasarkan posisi Y (dari atas ke bawah)
      greenBoxes.sort((a, b) => a.minY - b.minY);

      // Konversi ke format yang digunakan untuk rendering
      return greenBoxes.map(box => ({
        x: box.minX,
        y: box.minY,
        width: box.maxX - box.minX,
        height: box.maxY - box.minY
      }));
    } catch (error) {
      console.error('Error detecting green boxes:', error);
      return null;
    }
  };

  const mapSlotsToPixels = (canvasWidth: number, canvasHeight: number) => {
    // For database frames, use dbFrame slots directly
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
    if (!layoutConfig.slots || layoutConfig.slots.length === 0) return null;
    return layoutConfig.slots.map(slot => ({
      x: slot.x * canvasWidth,
      y: slot.y * canvasHeight,
      width: slot.width * canvasWidth,
      height: slot.height * canvasHeight,
      rotation: (slot as any).rotation || 0,
      borderRadius: (slot as any).borderRadius || 0,
    }));
  };

  const generateDownloadImage = async (options: { isBorderless?: boolean } = {}): Promise<string> => {
    const { isBorderless = false } = options;
    const canvas = document.createElement('canvas');
    canvas.width = layoutConfig.outputWidth;
    canvas.height = layoutConfig.outputHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    try {
      // Load and draw photos (use displayPhotos for correct slot order)
      const images = await Promise.all(
        displayPhotos.map((photo: PhotoData) => loadImage(photo.dataUrl))
      );

      // --- APPLY SAFE ZONE PROTECTION ---
      // Apply 3% margin to ensure critical elements match the editor's Safe Zone
      // HANYA jika bukan mode borderless
      const marginX = canvas.width * 0.03;
      const marginY = canvas.height * 0.03;
      const targetWidth = canvas.width - (marginX * 2);
      const targetHeight = canvas.height - (marginY * 2);

      if (!isBorderless) {
        ctx.save();
        ctx.translate(marginX, marginY);
        ctx.scale(targetWidth / canvas.width, targetHeight / canvas.height);
      }

      // Load frame image for database frames
      let dbFrameImage: HTMLImageElement | null = null;
      if (frameCategory === 'database' && dbFrame?.imageUrl) {
        try {
          dbFrameImage = await loadImage(dbFrame.imageUrl);
        } catch {
          dbFrameImage = null;
        }
      }

      // Draw background based on frame type and position
      if (frameCategory === 'database' && dbFrame?.framePosition === 'background' && dbFrameImage) {
        // Database frame as background
        ctx.drawImage(dbFrameImage, 0, 0, canvas.width, canvas.height);
      } else if (frameCategory === 'frames2' && layoutConfig.backgroundUrl) {
        try {
          const bg = await loadImage(layoutConfig.backgroundUrl);
          ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
        } catch {
          drawFrameBackground(ctx, selectedFrame, canvas.width, canvas.height);
        }
      } else {
        drawFrameBackground(ctx, selectedFrame, canvas.width, canvas.height);
      }

      // Draw overlay BEFORE photos for standard frames (legacy behavior)
      let overlay: HTMLImageElement | null = null;
      if (frameCategory === 'standard' && layoutConfig.overlayUrl) {
        try {
          overlay = await loadImage(layoutConfig.overlayUrl);
          ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
        } catch {
          overlay = null;
        }
      }

      const slotBoxes = mapSlotsToPixels(canvas.width, canvas.height);
      const detectionSource =
        layoutConfig.detectionUrl ?? layoutConfig.overlayUrl ?? layoutConfig.backgroundUrl;
      const greenBoxes = slotBoxes ? null : await detectGreenBoxes(detectionSource, canvas.width, canvas.height);
      const boxes = slotBoxes ?? greenBoxes;

      // Use slot boxes if available (either from database or detected)
      if (boxes && boxes.length > 0) {
        boxes.forEach((box, index) => {
          const img = images[index % images.length];
          if (!img || !box) return;

          const useLegacy = frameCategory === 'standard' && !slotBoxes;
          const expandLeftRight = useLegacy ? box.width * 0.15 : 0;
          const expandDown = useLegacy ? box.height * 0.10 : 0;
          const photoOffsetY = 0;

          const expanded = {
            x: Math.max(0, box.x - expandLeftRight),
            y: box.y + photoOffsetY,
            width: box.width + expandLeftRight * 2,
            height: box.height + expandDown,
          };

          if (expanded.x + expanded.width > canvas.width) {
            expanded.width = canvas.width - expanded.x;
          }
          if (expanded.y + expanded.height > canvas.height) {
            expanded.height = canvas.height - expanded.y;
          }

          ctx.save();
          applySlotTransformAndClip(ctx, expanded.x, expanded.y, expanded.width, expanded.height, (box as any).rotation, (box as any).borderRadius, slotBoxes ? 10 : 20);

          const imgAspect = img.width / img.height;
          const targetAspect = expanded.width / expanded.height;
          let drawWidth: number;
          let drawHeight: number;
          let offsetX: number;
          let offsetY: number;

          if (imgAspect > targetAspect) {
            drawHeight = expanded.height;
            drawWidth = expanded.height * imgAspect;
            offsetX = (expanded.width - drawWidth) / 2;
            offsetY = 0;
          } else {
            drawWidth = expanded.width;
            drawHeight = expanded.width / imgAspect;
            offsetX = 0;
            offsetY = (expanded.height - drawHeight) / 2;
          }

          // Mirror logic per user request
          ctx.translate(expanded.x + expanded.width / 2, expanded.y + expanded.height / 2);
          ctx.scale(-1, 1);
          ctx.translate(-(expanded.x + expanded.width / 2), -(expanded.y + expanded.height / 2));

          ctx.drawImage(img, expanded.x + offsetX, expanded.y + offsetY, drawWidth, drawHeight);
          ctx.restore();
        });
      } else {
        const photoWidth = canvas.width * 0.92;
        const photoHeight = canvas.height * 0.19;
        const horizontalMargin = (canvas.width - photoWidth) / 2;
        const verticalGap = canvas.height * 0.01;
        const totalPhotosHeight = (photoHeight * images.length) + (verticalGap * (images.length - 1));
        const topStart = (canvas.height - totalPhotosHeight) / 2;

        images.forEach((img: HTMLImageElement, index: number) => {
          const pos = {
            x: horizontalMargin,
            y: topStart + index * (photoHeight + verticalGap),
          };

          ctx.save();
          applySlotTransformAndClip(ctx, pos.x, pos.y, photoWidth, photoHeight, 0, 0, 20);

          const imgAspect = img.width / img.height;
          const targetAspect = photoWidth / photoHeight;
          let drawWidth: number;
          let drawHeight: number;
          let offsetX: number;
          let offsetY: number;

          if (imgAspect > targetAspect) {
            drawWidth = photoWidth;
            drawHeight = photoWidth / imgAspect;
            offsetX = 0;
            offsetY = (photoHeight - drawHeight) / 2;
          } else {
            drawHeight = photoHeight;
            drawWidth = photoHeight * imgAspect;
            offsetX = (photoWidth - drawWidth) / 2;
            offsetY = 0;
          }

          // Mirror logic per user request
          ctx.translate(pos.x + photoWidth / 2, pos.y + photoHeight / 2);
          ctx.scale(-1, 1);
          ctx.translate(-(pos.x + photoWidth / 2), -(pos.y + photoHeight / 2));

          ctx.drawImage(img, pos.x + offsetX, pos.y + offsetY, drawWidth, drawHeight);
          ctx.restore();
        });
      }

      // Draw database frame overlay AFTER photos (if position is 'overlay')
      if (frameCategory === 'database' && dbFrame?.framePosition === 'overlay' && dbFrameImage) {
        ctx.drawImage(dbFrameImage, 0, 0, canvas.width, canvas.height);
      }

      if (frameCategory === 'standard' && !overlay) {
        drawFrameDecorations(ctx, selectedFrame, canvas.width, canvas.height);
      }

      if (!isBorderless) {
        ctx.restore();
      }
    } catch (error) {
      console.error('Error generating image:', error);
      return '';
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          resolve(url);
        } else {
          resolve('');
        }
      }, 'image/png');
    });
  };

  const drawFrameBackground = (ctx: CanvasRenderingContext2D, frameType: string, width: number, height: number) => {
    // Same implementation as FrameRenderer
    switch (frameType) {
      case 'classic':
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#71604b';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, width - 10, height - 10);
        break;
      case 'vintage':
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#f5e8c6');
        gradient.addColorStop(1, '#e6d7b3');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        break;
      case 'modern':
        const modernGradient = ctx.createLinearGradient(0, 0, width, height);
        modernGradient.addColorStop(0, '#71604b');
        modernGradient.addColorStop(0.5, '#f5e8c6');
        modernGradient.addColorStop(1, '#71604b');
        ctx.fillStyle = modernGradient;
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

  const drawFrameDecorations = (ctx: CanvasRenderingContext2D, frameType: string, width: number, height: number) => {
    // Same implementation as FrameRenderer
    // const titleY = height * 0.65;
    // const titleHeight = height * 0.15;

    // ctx.fillStyle = 'rgba(113, 96, 75, 0.1)';
    // ctx.fillRect(width * 0.1, titleY, width * 0.8, titleHeight);

    // ctx.fillStyle = '#71604b';
    // ctx.font = `bold ${width * 0.04}px Arial, sans-serif`;
    // ctx.textAlign = 'center';
    // ctx.fillText('PHOTOBOOTH MEMORIES', width / 2, titleY + titleHeight / 2);

    // const currentDate = new Date().toLocaleDateString('id-ID', {
    //   year: 'numeric',
    //   month: 'long',
    //   day: 'numeric'
    // });

    // ctx.font = `${width * 0.02}px Arial, sans-serif`;
    // ctx.fillText(currentDate, width / 2, titleY + titleHeight * 0.8);
  };

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      // Mode borderless untuk download manual
      const imageUrl = await generateDownloadImage({ isBorderless: true });

      if (imageUrl) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `photobooth-${new Date().getTime()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(imageUrl);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Gagal mendownload foto. Silakan coba lagi.');
    }

    setIsDownloading(false);
  };

  const handlePrintClick = () => {
    if (paymentVerified) {
      handlePrint();
    } else {
      router.push('/checkout');
    }
  };

  async function handlePrint() {
    setIsPrinting(true);

    try {
      // Mode tetap dengan margin aman (3%) khusus untuk PRINTING
      const imageUrl = await generateDownloadImage({ isBorderless: false });

      if (imageUrl) {
        // Create hidden iframe to ensure reliable print
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) throw new Error('Tidak dapat membuka dokumen untuk print');

        // Exact 4R dimensions in millimeters as requested
        const paperWidthMm = 102;
        const paperHeightMm = 152;

        // Check if layout is a strip (standard 1:3 ratio)
        const isStrip = layoutConfig.outputHeight >= layoutConfig.outputWidth * 2.5;

        // Calculate how many sheets of paper we need
        // Base this on the selected quantity from URL or state
        const numSheets = quantity || 1;

        doc.open();
        doc.write(`
          <html>
            <head>
              <title>Print Photobooth</title>
              <style>
                * { box-sizing: border-box; }
                @page { size: ${paperWidthMm}mm ${paperHeightMm}mm; margin: 0; }
                html, body { 
                  width: ${paperWidthMm}mm; 
                  margin: 0; 
                  padding: 0; 
                  background: white;
                }
                .page {
                  width: ${paperWidthMm}mm;
                  height: ${paperHeightMm}mm;
                  display: flex;
                  flex-direction: row;
                  margin: 0;
                  padding: 0;
                  page-break-inside: avoid;
                  page-break-after: always;
                  overflow: hidden;
                  position: relative;
                }
                .strip-container {
                  width: ${isStrip ? '50%' : '100%'};
                  height: 100%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  overflow: hidden;
                }
                img { 
                  display: block;
                  width: 100.2%; /* Slight overshoot to ensure no white lines */
                  height: 100.2%;
                  object-fit: cover;
                }
              </style>
            </head>
            <body>
              ${Array.from({ length: numSheets }).map(() => `
                <div class="page">
                  <div class="strip-container">
                    <img src="${imageUrl}" />
                  </div>
                  ${isStrip ? `
                  <div class="strip-container">
                    <img src="${imageUrl}" />
                  </div>
                  ` : ''}
                </div>
              `).join('')}
              <script>
                window.onload = () => {
                  window.focus();
                  setTimeout(() => { window.print(); window.close(); }, 500);
                };
              <\/script>
            </body>
          </html>
        `);
        doc.close();

        // Optional: Mark as printed in DB
        if (currentOrderId) {
          fetch(`/api/admin/orders/${currentOrderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentStatus: 'printed', printedAt: new Date() })
          }).catch(console.error);
        }

        // If running in Electron (Desktop App), add to offline queue for background sync
        if (isElectron()) {
          try {
            addToOfflineQueue({
              userName: userName || 'Guest',
              frameId: selectedFrame || 'standard',
              frameName: dbFrame?.name || selectedFrame || 'Standard Frame',
              quantity: numSheets,
              pricePerFrame: dbFrame?.price || 0,
              totalPrice: (dbFrame?.price || 0) * numSheets,
              costPrice: 2500, // Standard cost
              imageUrl: stableMediaId || 'print-job',
              paymentStatus: 'paid',
              printedAt: new Date().toISOString(),
            });
          } catch (err) {
            console.error('Failed to queue order offline:', err);
          }
        }

        setTimeout(() => {
          try { document.body.removeChild(iframe); } catch { }
          URL.revokeObjectURL(imageUrl);
        }, 10000);
      }
    } catch (error) {
      // console.error('Print error:', error);
      // alert('Gagal mencetak foto. Silakan coba lagi.');
    }

    setIsPrinting(false);
  }

  const handleFinish = async () => {
    try {
      setIsResetting(true);

      // Bersihkan deadline timer agar sesi baru bersih
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('photobooth.sessionDeadlineMs');
          localStorage.removeItem('photobooth.downloadDeadlineMs');
        }
      } catch (e) {
        console.warn('Error clearing localStorage:', e);
      }

      // Reset state global
      try {
        resetAll();
      } catch (e) {
        console.warn('Error resetting state:', e);
      }

      // Reset flag backup dan state untuk sesi baru
      hasBackedUp.current = false;
      hasRedirected.current = false;
      setIsBackingUp(false); // Reset untuk sesi baru

      // Arahkan ke halaman video dengan cara yang lebih aman
      try {
        await router.push('/');
      } catch (e) {
        // Fallback jika router.push gagal
        console.warn('Router push failed, using window.location:', e);
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    } catch (e) {
      // console.error('Error in handleFinish:', e);
      // Fallback terakhir
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  const generateShareableLink = () => {
    // SSR Safe: Check if window is defined
    if (typeof window === 'undefined') return '';

    if (shareUrl) {
      let url = shareUrl;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.startsWith('/')) {
          url = `${window.location.protocol}//${window.location.host}${url}`;
        } else {
          url = `${window.location.protocol}//${window.location.host}/${url}`;
        }
      }
      return url;
    }

    // Use a fixed ID per session to avoid Date.now() mismatch if it were to run on server
    const id = userName ? `cust-${userName.replace(/[^a-zA-Z0-9]/g, '-')}-final` : `img-final`;
    return `${window.location.protocol}//${window.location.host}/download/${id}`;
  };

  return (
    <div className="min-h-screen w-full bg-[#FDFBF7] text-[#4A3F35] overflow-hidden flex flex-col relative">
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#A68B67_1px,transparent_1px)] [background-size:24px_24px]"></div>

      {/* Header */}
      <header className="relative z-20 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Placeholder for left align balance if needed */}
        </div>

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-serif italic text-[#4A3F35]">
            Hasil Final
          </h1>
          <p className="text-[9px] font-black text-[#8C7E6A] uppercase tracking-[0.4em] mt-1 opacity-80">
            Your Memories Captured
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Placeholder for right align */}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 min-h-0 overflow-hidden">
        <div className="w-full max-w-[95rem] mx-auto grid lg:grid-cols-5 gap-8 items-center h-full pt-4">

          {/* Column 1-2: Live Mirror (Photo Strip Style) */}
          <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-start pt-14 overflow-visible sticky top-10">
            <motion.div
              initial={{ opacity: 0, rotate: 0, x: -30 }}
              animate={{ opacity: 1, rotate: 0, x: 0 }}
              transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
              className="relative bg-white p-3 pb-16 shadow-[0_30px_70px_rgba(0,0,0,0.12)] w-full max-w-3xl transition-transform hover:scale-[1.005] duration-500 ease-out z-40"
            >
              {/* Mirror Unit Header (Matching Printer Style) */}
              <div className="absolute -top-14 left-0 w-full bg-gradient-to-b from-[#4A3F35] to-[#2D2824] rounded-t-xl px-4 py-3.5 flex items-center justify-between shadow-xl border-b-[4px] border-black/20">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-black/30 rounded-md border border-white/5">
                    <Camera className="w-4 h-4 text-[#FDFBF7]/80" />
                  </div>
                  <div>
                    <span className="block text-[#FDFBF7]/90 text-[10px] font-bold tracking-[0.2em] uppercase">Mirror Unit</span>
                    <span className="block text-[#A68B67] text-[8px] font-mono mt-0.5 tracking-wider uppercase">Live Feed Control</span>
                  </div>
                </div>
                <div className="bg-black/40 py-1.5 px-3 rounded border border-white/5 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <span className="text-[#A68B67] text-[9px] font-mono tracking-tighter uppercase">STABLE_FEED</span>
                </div>
              </div>
              {/* Photo Area Frame */}
              <div className="relative h-[55vh] bg-gray-50 overflow-hidden shadow-inner outline outline-1 outline-black/5 ring-4 ring-[#FDFBF7] group">
                <div className="absolute inset-0 pointer-events-none z-20 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/15 pointer-events-none z-10"></div>



                <div className="hidden">
                  <div className="flex justify-between items-start opacity-40">
                    <div className="flex flex-col gap-0.5">
                      <div className="text-[10px] font-mono text-white tracking-[0.2em] italic uppercase">Mirror_Live</div>
                      <div className="text-[8px] font-mono text-white/60 tracking-wider">REF_ID: DOVE_PRO</div>
                    </div>
                    <div className="text-[10px] font-mono text-white/50 tracking-tighter bg-white/5 px-2 py-0.5 rounded">24 FPS</div>
                  </div>

                  <div className="flex justify-between items-center opacity-30">
                    <div className="w-12 h-[1px] bg-white/20"></div>
                    <div className="text-[9px] font-mono text-white tracking-[0.5em] uppercase">Focusing</div>
                    <div className="w-12 h-[1px] bg-white/20"></div>
                  </div>
                </div>

                {/* The Mirror (Video Feed) */}
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1] z-0" />
                <div className="absolute top-4 right-4 px-2 py-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded text-[8px] font-mono text-white/50 z-20 uppercase tracking-tighter">FEED_STABLE</div>

                {/* Subtle Grain Texture for photo feel */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                {/* Inner Shadow inset */}
                <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.05)] pointer-events-none"></div>
              </div>

              {/* Minimalist Date/Label */}
              <div className="absolute bottom-5 left-0 w-full px-8 flex justify-between items-center opacity-40">
                <span className="text-[9px] font-mono text-[#4A3F35] tracking-widest uppercase">DVLS_LP_01</span>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-[1px] bg-[#4A3F35] mb-1"></div>
                  <span className="text-[10px] font-mono text-[#4A3F35] tracking-[0.4em] uppercase font-bold">Live Feed</span>
                </div>
                <span className="text-[9px] font-mono text-[#4A3F35] tracking-widest uppercase text-right">M_REF_2026</span>
              </div>

              {/* Tape Effect (Washi Tape Style) */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-28 h-6 z-50 pointer-events-none opacity-80">
                <div className="w-full h-full bg-[#EDE8D5]/60 backdrop-blur-[2px] border-l border-r border-[#4A3F35]/10 rotate-1 shadow-sm relative overflow-hidden">
                  {/* Tape Texture */}
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Column 3-4: Final Result Preview with Printer Effect */}
          <div className="lg:col-span-2 flex flex-col items-center justify-start h-full max-h-[85vh] sticky top-10">

            {/* Printer Header (Static Machine Head) */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="relative z-30 w-full max-w-[34rem] bg-gradient-to-b from-[#4A3F35] to-[#2D2824] rounded-t-xl px-6 py-4 flex items-center justify-between shadow-2xl border-b-[6px] border-black/25"
            >
              {/* Metallic Texture Overlay */}
              <div className="absolute inset-0 opacity-10 rounded-t-2xl pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

              <div className="relative z-10 flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-black/30 rounded-md border border-white/5">
                    <Printer className="w-5 h-5 text-[#FDFBF7]/80" />
                  </div>
                  <div>
                    <span className="block text-[#FDFBF7]/90 text-[11px] font-bold tracking-[0.25em] uppercase text-shadow-sm">Dovelens Pro</span>
                    <span className="block text-[#A68B67] text-[9px] font-mono mt-0.5 tracking-wider">
                      Thermal Photo Printer
                    </span>
                  </div>
                </div>
              </div>

              {/* LCD Status Screen */}
              <div className="relative z-10 flex items-center gap-4 bg-black/40 py-2 px-4 rounded-lg border border-white/5 shadow-inner min-w-[180px] justify-between">
                <span className="text-[#A68B67] text-[10px] font-mono animate-pulse">
                  {printProgress < 100 && printProgress > 0 ? `>>> PRINTING ${Math.round(printProgress)}%` : (printProgress === 100 ? '✓ PRINT COMPLETE' : 'WAITING PAYMENT...')}
                </span>
                <div className="flex gap-2">
                  <div className={`w-2 h-2 rounded-full ${printProgress < 100 && printProgress > 0 ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'bg-[#4A3F35]'}`} />
                  <div className={`w-2 h-2 rounded-full ${printProgress === 100 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-[#4A3F35]'}`} />
                </div>
              </div>
            </motion.div>

            {/* Printer Slot Shadow & Gap */}
            <div className="w-full h-5 flex justify-center z-20 -mt-1 relative">
              <div className="w-[94%] max-w-[32rem] h-full bg-[#151311] rounded-b-lg shadow-[inset_0_5px_10px_rgba(0,0,0,0.8)] relative overflow-hidden ring-1 ring-white/5">
                {/* The slit where paper comes out - width matched to paper */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[30rem] h-1.5 bg-black shadow-[0_2px_8px_rgba(0,0,0,1)] rounded-b-[2px]"></div>
              </div>
            </div>

            {/* Paper Container (Masked) - This is where the paper comes out */}
            <div className="relative z-10 w-full flex justify-center -mt-3 pb-20 overflow-hidden px-4">
              <motion.div
                // Animasi kertas keluar dari atas (y: -105%) ke posisi normal (y: 0%)
                style={{
                  y: `${(printProgress * 1.05) - 105}%`,
                  display: printProgress === 0 ? 'none' : 'flex',
                  boxShadow: `0 ${printProgress / 5}px ${printProgress / 2}px rgba(0,0,0,0.1)`
                }}
                ref={frameRef}
                className="relative bg-white p-0 rounded-[1px] flex items-center justify-center origin-top w-fit"
              >
                {/* Paper Texture Overlay (CSS-based to avoid CSP issues) */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                {/* Frame Container */}
                <div className="relative w-full">
                  {frameCategory === 'database' ? (
                    dbFrame ? (
                      <DbFramePreview
                        photos={displayPhotos}
                        dbFrame={dbFrame}
                        width={previewBaseWidth}
                      />
                    ) : (
                      <div className="flex items-center justify-center bg-[#F5F1EA] animate-pulse" style={{ aspectRatio: '2/3', width: previewBaseWidth }}>
                        <p className="text-[#8C7E6A] text-xs font-serif italic">Memuat frame...</p>
                      </div>
                    )
                  ) : (
                    <FrameRenderer
                      photos={displayPhotos}
                      frameType={selectedFrame}
                      width={previewBaseWidth}
                      height={previewHeight}
                      className="w-full h-auto object-contain"
                      rounded={false}
                      frameCategory={frameCategory}
                    />
                  )}
                </div>
              </motion.div>

              {/* Placeholder jika belum bayar (Empty State) */}
              {printProgress === 0 && (
                <div className="mt-8 text-center animate-pulse">
                  <div className="w-64 h-80 border-2 border-dashed border-[#A68B67]/30 rounded-lg flex flex-col items-center justify-center p-6 bg-[#F5F1EA]/50">
                    <CreditCard className="w-12 h-12 text-[#A68B67]/50 mb-3" />
                    <p className="text-[#4A3F35] font-bold text-sm">Menunggu Pembayaran</p>
                    <p className="text-[#8C7E6A] text-xs mt-1 text-center">Selesaikan pembayaran Anda untuk mencetak foto ini.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Column 5: Actions Panel */}
          <div className="space-y-6 w-full max-w-md mx-auto flex flex-col lg:sticky lg:top-8 self-start">

            {/* Download & Print Card */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-[#F5F1EA]/90 backdrop-blur-xl border border-[#EAE1D3] rounded-xl p-8 shadow-xl shadow-black/[0.03] relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#A68B67]/5 blur-[60px] -mr-16 -mt-16 rounded-full group-hover:bg-[#A68B67]/10 transition-colors"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#4A3F35] rounded-lg flex items-center justify-center shadow-lg">
                    <Printer className="w-5 h-5 text-[#FDFBF7]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif italic text-[#4A3F35]">Cetak Foto</h3>
                    <p className="text-[10px] text-[#A68B67] font-mono tracking-widest uppercase">Bayar & Cetak</p>
                  </div>
                </div>

                <div className="space-y-4">

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePrintClick}
                    disabled={isPrinting}
                    className={`w-full text-sm font-bold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3 uppercase tracking-widest shadow-md ${paymentVerified
                      ? 'bg-[#A68B67] text-white hover:bg-[#8C7E6A] shadow-[#A68B67]/20'
                      : 'bg-white border-2 border-[#4A3F35] text-[#4A3F35] hover:bg-[#4A3F35] hover:text-[#FDFBF7]'
                      } disabled:opacity-50`}
                  >
                    {isPrinting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>{paymentVerified ? 'PRINTING...' : 'INIT...'}</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4" />
                        <span>{paymentVerified ? 'Cetak Sekarang' : 'Bayar & Cetak'}</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* QR Code Card */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white/80 backdrop-blur-xl border border-[#EAE1D3] rounded-xl p-8 shadow-xl shadow-black/[0.02]"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-serif italic text-[#4A3F35]">
                    Scan & Download
                  </h3>
                  <p className="text-[10px] text-[#A68B67] font-mono tracking-widest uppercase">Mobile Copy</p>
                </div>
                <div className="w-10 h-10 bg-[#F5F1EA] rounded-full flex items-center justify-center border border-[#EAE1D3]">
                  <QrCode className="w-5 h-5 text-[#A68B67]" />
                </div>
              </div>

              {/* Status Indicators */}
              <div className="space-y-3 mb-6">
                {isBackingUp ? (
                  <div className="px-4 py-3 bg-[#F5F1EA] border border-[#EAE1D3] rounded-lg flex items-center gap-2 text-xs text-[#8C7E6A] shadow-inner">
                    <div className="w-3 h-3 border-2 border-[#A68B67] border-t-transparent rounded-full animate-spin" />
                    <span className="font-bold uppercase tracking-wider">Menyiapkan Halaman Download...</span>
                  </div>
                ) : shareUrl ? (
                  <div className="px-4 py-3 bg-[#FDFBF7] border border-[#EAE1D3] rounded-lg flex items-center gap-3 text-xs text-[#4A3F35] shadow-sm">
                    <div className="w-5 h-5 bg-[#A68B67] rounded-full flex items-center justify-center shadow-md">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="font-bold uppercase tracking-wider">Saved to Cloud</span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="bg-white p-2 rounded-sm border border-[#EAE1D3] shadow-sm relative min-h-[140px] flex items-center justify-center">
                  {/* QR Code Gating Overlay - Only show if payment enabled and NOT verified */}
                  {(isPaymentEnabled && !paymentVerified) && (
                    <div className="absolute inset-0 z-10 bg-[#FDFBF7]/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                      <CreditCard className="w-8 h-8 text-[#A68B67] mb-2" />
                      <p className="text-xs font-bold text-[#4A3F35] uppercase tracking-wider">Bayar untuk Buka</p>
                      <p className="text-[10px] text-[#8C7E6A] mt-1">Selesaikan pembayaran untuk akses download</p>
                    </div>
                  )}

                  {isHydrated ? (
                    <QRCodeGenerator
                      value={generateShareableLink()}
                      size={140}
                      className=""
                    />
                  ) : (
                    <div className="w-[140px] h-[140px] bg-gray-50 animate-pulse" />
                  )}
                </div>
                <p className="text-[10px] text-[#8C7E6A] uppercase tracking-widest text-center mt-1">
                  Scan untuk simpan ke HP
                </p>
              </div>
            </motion.div>

            {/* Timer Card */}
            {downloadRemainingMs !== -1 && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-[#4A3F35] to-[#2D2824] text-[#FDFBF7] rounded-xl p-8 shadow-2xl relative overflow-hidden group"
              >
                {/* Decorative light effect */}
                <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#A68B67]/10 rounded-full blur-[80px] group-hover:bg-[#A68B67]/20 transition-colors"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/20 rounded-full blur-2xl"></div>

                <div className="relative z-10 text-center">
                  <div className="inline-flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/5 mb-4">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                    <p className="text-[10px] font-bold text-[#A68B67] uppercase tracking-[0.2em]">Session ends in</p>
                  </div>

                  <div className="text-5xl font-serif italic mb-8 tracking-tight text-[#FDFBF7]">
                    {formatTime(downloadRemainingMs)}
                  </div>

                  <motion.button
                    whileHover={{ scale: isBackingUp || isResetting ? 1 : 1.02, backgroundColor: "#FDFBF7" }}
                    whileTap={{ scale: isBackingUp || isResetting ? 1 : 0.98 }}
                    onClick={handleFinish}
                    disabled={isResetting || isBackingUp}
                    className="w-full bg-[#EDE8D5] text-[#4A3F35] disabled:opacity-70 font-bold text-xs py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3 uppercase tracking-widest shadow-xl"
                  >
                    {isBackingUp ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#4A3F35]/30 border-t-[#4A3F35] rounded-full animate-spin" />
                        <span>MENYIAPKAN...</span>
                      </>
                    ) : isResetting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#4A3F35]/30 border-t-[#4A3F35] rounded-full animate-spin" />
                        <span>RESETTING...</span>
                      </>
                    ) : (
                      <>
                        <Home className="w-4 h-4" />
                        <span>Finish Session</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div> {/* End Column 5 */}
        </div> {/* End Grid */}
      </main>



      {/* Payment Status Notification */}
      {paymentStatus !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] px-8 py-4 rounded-sm shadow-2xl flex items-center gap-4 border ${paymentStatus === 'success'
            ? 'bg-green-600 border-green-500 text-white'
            : 'bg-red-600 border-red-500 text-white'
            }`}
        >
          {paymentStatus === 'success' ? (
            <>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-lg uppercase tracking-wider">
                  {!isPaymentEnabled ? 'Cetak Selesai!' : 'Pembayaran Berhasil!'}
                </p>
                <p className="text-xs opacity-90">
                  {!isPaymentEnabled ? 'Foto Anda siap untuk dipamerkan.' : 'Foto Anda sedang diproses untuk pencetakan.'}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <X className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-lg uppercase tracking-wider">Pembayaran Gagal</p>
                <p className="text-xs opacity-90">Silakan coba lagi atau pilih metode pembayaran lain.</p>
              </div>
            </>
          )}
          <button
            onClick={() => {
              setPaymentStatus('idle');
              // Remove params from URL without reload
              window.history.replaceState({}, '', window.location.pathname);
            }}
            className="ml-4 p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </div >
  );
};

export default FinalResultPage;