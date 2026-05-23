"use client";
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Camera, ArrowRight, ArrowLeft, CheckCircle, X, Clock, Play } from 'lucide-react';
import { usePhotoStore } from '@/store/usePhotoStore';
import CameraPreview from '@/components/photobooth/shared/CameraPreview';
import PhotoSlot from '@/components/photobooth/shared/PhotoSlot';
import SessionHeader from '@/components/photobooth/session/SessionHeader';
import SessionSidebar from '@/components/photobooth/session/SessionSidebar';

interface SystemSettings {
  isPhotoSelectionEnabled?: boolean;
  photoSessionTimer?: number;
  captureTimer?: number;
  maxCapturePhotos?: number;
  isPhotoSessionTimerEnabled?: boolean;
  enabledFilters?: string[];
}

const PhotoSessionPage: React.FC = () => {
  const router = useRouter();
  const {
    photos,
    canvasRef,
    videoRef, // Access videoRef
    capturePhoto,
    addPhoto,
    updatePhoto,
    setLivePhoto,
    removePhoto,
    reorderPhotos,
    resetAll,
    frameCategory,
    systemSettings,
    settingsLoaded,
  } = usePhotoStore();

  const [isCapturing, setIsCapturing] = useState(false);
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [pendingPhotoUrl, setPendingPhotoUrl] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number>(-1); // -1 = belum diinisialisasi
  const [timerStarted, setTimerStarted] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const hasRedirected = useRef(false); // Mencegah multiple redirect
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null); // Ref untuk skip countdown

  // Live Photo states
  const [liveRecorder, setLiveRecorder] = useState<MediaRecorder | null>(null);
  const liveChunksRef = useRef<Blob[]>([]);
  const currentPhotoIdRef = useRef<string | null>(null);

  const [maxPhotos, setMaxPhotos] = useState<number>(4); // Default 4
  const [frameMaxSlots, setFrameMaxSlots] = useState<number>(4); // Default 4 slots
  const { selectedFrame } = usePhotoStore();


  // Fetch frame to get maxSlots (only for database frames)
  useEffect(() => {
    // Case 1: Standard/Hardcoded frames (classic, frames2, etc)
    if (frameCategory !== 'database') {
      // Default photobooth strip usually has 4 slots
      setFrameMaxSlots(4);
      return;
    }

    // Case 2: Database-driven dynamic frames
    if (selectedFrame) {
      fetch(`/api/frames/${selectedFrame}`, { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.maxSlots) {
            setFrameMaxSlots(data.maxSlots);
          } else {
            setFrameMaxSlots(4);
          }
        })
        .catch(err => {
          console.warn('Failed to fetch frame maxSlots, using fallback 4:', err);
          setFrameMaxSlots(4);
        });
    }
  }, [selectedFrame, frameCategory]);

  // Sync maxPhotos based on priority: Admin Settings > Frame Slots > Default 4
  useEffect(() => {
    if (systemSettings.maxCapturePhotos) {
      setMaxPhotos(systemSettings.maxCapturePhotos);
      console.log('🎯 PhotoSessionPage: maxPhotos set from Admin Settings to', systemSettings.maxCapturePhotos);
    } else {
      setMaxPhotos(frameMaxSlots);
      console.log('🎯 PhotoSessionPage: maxPhotos set from Frame Slots to', frameMaxSlots);
    }
  }, [systemSettings.maxCapturePhotos, frameMaxSlots]);

  // Inisialisasi timer sesi HANYA jika timer diaktifkan di settings
  useEffect(() => {
    // Tunggu settings loaded dulu
    if (!settingsLoaded) return;

    // Jika timer non-aktif, tidak perlu setup timer
    if (systemSettings.isPhotoSessionTimerEnabled === false) {
      setTimerStarted(false);
      setRemainingMs(-1); // -1 berarti timer non-aktif
      return;
    }

    const KEY = 'photobooth.sessionDeadlineMs';
    const SETTING_KEY = 'photobooth.sessionTimerSetting';
    const timerMinutes = systemSettings.photoSessionTimer || 5;

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
    const update = () => setRemainingMs(Math.max(0, deadline - Date.now()));
    update();
    setTimerStarted(true);
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [settingsLoaded, systemSettings.isPhotoSessionTimerEnabled, systemSettings.photoSessionTimer]);

  // Show warning when 30 seconds remaining (hanya jika timer aktif)
  useEffect(() => {
    if (timerStarted && remainingMs > 0 && remainingMs <= 30000 && !showTimeoutWarning) {
      setShowTimeoutWarning(true);
    }
  }, [remainingMs, timerStarted, showTimeoutWarning]);

  // Redirect ke halaman awal ketika waktu habis (hanya jika timer aktif)
  useEffect(() => {
    // Jika timer non-aktif (remainingMs === -1), tidak perlu redirect
    if (remainingMs === -1) return;

    if (timerStarted && remainingMs === 0 && !hasRedirected.current) {
      hasRedirected.current = true; // Set flag untuk mencegah multiple calls

      // Hapus timer dari localStorage
      try {
        localStorage.removeItem('photobooth.sessionDeadlineMs');
      } catch { }

      // Reset semua data
      resetAll();

      // Redirect ke halaman pertama (VideoStartPage dengan input nama)
      router.push('/video');
    }
  }, [remainingMs, timerStarted, resetAll, router]);

  const formatTime = (ms: number) => {
    if (ms < 0) return '05:10'; // tampilkan 5 menit 10 detik saat belum diinisialisasi
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Camera is started by the `CameraPreview` component via its `autoStart` prop

  const handleCapture = async () => {
    if (isCapturing || countdown !== null) return;

    // Generate photo ID untuk live photo
    // Jika sedang retake, gunakan ID foto yang sudah ada agar sinkron
    let photoId = `photo-${Date.now()}`;
    if (retakeIndex !== null && photos[retakeIndex]) {
      photoId = photos[retakeIndex].id;
    }
    currentPhotoIdRef.current = photoId;
    console.log('🎬 Recording Live Photo for ID:', photoId, retakeIndex !== null ? '(Retake)' : '(New)');

    const timerDuration = systemSettings.captureTimer || 5;

    // BARU: Mulai rekam Live Photo saat countdown dimulai
    if (videoRef.current?.srcObject) {
      try {
        const stream = videoRef.current.srcObject as MediaStream;

        if (typeof MediaRecorder !== 'undefined') {
          // BUKAN PAKAI REF GLOBAL, TAPI LOCAL SCOPE
          const chunks: Blob[] = [];
          const types = [
            'video/mp4;codecs=h264',
            'video/mp4;codecs=avc1',
            'video/mp4',
            'video/webm;codecs=h264',
            'video/webm;codecs=vp8',
            'video/webm'
          ];
          const supportedType = types.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

          const recorder = new MediaRecorder(stream, {
            mimeType: supportedType,
            videoBitsPerSecond: 5000000
          });

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = async () => {
            try {
              const blob = new Blob(chunks, { type: supportedType });
              const videoUrl = URL.createObjectURL(blob);
              console.log(`✅ Live Photo READY for ${photoId}:`, videoUrl);
              (window as any).__pendingLivePhotoUrl = videoUrl;
              if (photoId) setLivePhoto(photoId, videoUrl);
            } catch (error) {
              console.error('❌ Live Photo processing error:', error);
            }
          };

          recorder.start();
          console.log(`📹 Recording STARTED for ${photoId}`);

          // Stop otomatis 2 detik SETELAH jepretan diambil (Timer + 2 detik)
          setTimeout(() => {
            if (recorder.state === 'recording') {
              recorder.stop();
              console.log(`⏹️ Recording STOPPED for ${photoId}`);
            }
          }, (timerDuration + 2) * 1000);
        }
      } catch (err) {
        console.error('❌ Failed to start Live Photo:', err);
      }
    }

    setCountdown(timerDuration);

    let current = timerDuration;
    countdownTimerRef.current = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdown(current);
      } else {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(null);

        setIsCapturing(true);

        // Add capture animation delay
        setTimeout(() => {
          handleCapturePhoto();
        }, 200);
      }
    }, 1000);
  };

  // Skip countdown and capture immediately
  const handleSkipCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
    setIsCapturing(true);

    setTimeout(() => {
      handleCapturePhoto();
    }, 200);
  };

  const handleCapturePhoto = () => {
    const rawDataUrl = capturePhoto();
    if (rawDataUrl) {
      setPendingPhotoUrl(rawDataUrl);
      setIsConfirmOpen(true);
      setIsCapturing(false);
    } else {
      setIsCapturing(false);
    }
  };

  // Apply filter to image
  const applyFilter = (imageUrl: string, filterType: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Apply filter based on type
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          switch (filterType) {
            case 'bw': // Black & White
              const gray = r * 0.299 + g * 0.587 + b * 0.114;
              data[i] = gray;
              data[i + 1] = gray;
              data[i + 2] = gray;
              break;

            case 'sepia': // Sepia/Vintage
              const tr = (r * 0.393) + (g * 0.769) + (b * 0.189);
              const tg = (r * 0.349) + (g * 0.686) + (b * 0.168);
              const tb = (r * 0.272) + (g * 0.534) + (b * 0.131);
              data[i] = Math.min(255, tr);
              data[i + 1] = Math.min(255, tg);
              data[i + 2] = Math.min(255, tb);
              break;

            case 'cool': // Cool tone (blue)
              data[i] = Math.min(255, r * 0.9);
              data[i + 1] = Math.min(255, g * 0.95);
              data[i + 2] = Math.min(255, b * 1.1);
              break;

            case 'warm': // Warm tone (orange/yellow)
              data[i] = Math.min(255, r * 1.1);
              data[i + 1] = Math.min(255, g * 1.05);
              data[i + 2] = Math.min(255, b * 0.9);
              break;

            case 'vivid': // High contrast/vivid
              const factor = 1.3;
              data[i] = Math.min(255, Math.max(0, (r - 128) * factor + 128));
              data[i + 1] = Math.min(255, Math.max(0, (g - 128) * factor + 128));
              data[i + 2] = Math.min(255, Math.max(0, (b - 128) * factor + 128));
              break;

            case 'vintage-warm': // Vintage Warm
              const trV = (r * 0.393) + (g * 0.769) + (b * 0.189);
              const tgV = (r * 0.349) + (g * 0.686) + (b * 0.168);
              const tbV = (r * 0.272) + (g * 0.534) + (b * 0.131);
              data[i] = Math.min(255, (r * 0.8) + (trV * 0.2) + 20);
              data[i + 1] = Math.min(255, (g * 0.8) + (tgV * 0.2) + 10);
              data[i + 2] = Math.min(255, (b * 0.8) + (tbV * 0.2));
              break;

            case 'cinematic': // Teal & Orange-ish
              // Simple approximation: push shadows to teal, highlights to orange
              data[i] = Math.min(255, r * 1.1); // strengthen red
              data[i + 1] = Math.min(255, g * 1.0);
              data[i + 2] = Math.min(255, b * 0.9 + 20); // add some blue to shadows (simplified)
              break;

            case 'pastel': // Bright & Low saturation
              data[i] = Math.min(255, r * 1.1 + 10);
              data[i + 1] = Math.min(255, g * 1.1 + 10);
              data[i + 2] = Math.min(255, b * 1.1 + 10);
              break;

            case 'dramatic': // High contrast & Darker
              const factorD = 1.2;
              data[i] = Math.min(255, Math.max(0, (r - 128) * factorD + 128 - 20));
              data[i + 1] = Math.min(255, Math.max(0, (g - 128) * factorD + 128 - 20));
              data[i + 2] = Math.min(255, Math.max(0, (b - 128) * factorD + 128 - 20));
              break;

            case 'noir-contrast': // High Contrast B&W
              const grayC = r * 0.299 + g * 0.587 + b * 0.114;
              const factorC = 1.4;
              const finalGray = Math.min(255, Math.max(0, (grayC - 128) * factorC + 128));
              data[i] = finalGray;
              data[i + 1] = finalGray;
              data[i + 2] = finalGray;
              break;

            case 'golden-hour': // Sunny/Golden
              data[i] = Math.min(255, r * 1.15); // more red
              data[i + 1] = Math.min(255, g * 1.1); // more green (yellow)
              data[i + 2] = Math.min(255, b * 0.9); // less blue
              break;

            case 'matte': // Low contrast, lifted blacks
              // Lift blacks: val = val * 0.9 + 25
              data[i] = Math.min(255, r * 0.9 + 25);
              data[i + 1] = Math.min(255, g * 0.9 + 25);
              data[i + 2] = Math.min(255, b * 0.9 + 25);
              break;

            case 'clean-pop': // Bright & Saturated
              const avgPop = (r + g + b) / 3;
              // increase saturation
              data[i] = Math.min(255, avgPop + (r - avgPop) * 1.2 + 10);
              data[i + 1] = Math.min(255, avgPop + (g - avgPop) * 1.2 + 10);
              data[i + 2] = Math.min(255, avgPop + (b - avgPop) * 1.2 + 10);
              break;

            case 'emerald': // Moody Green
              data[i] = Math.min(255, r * 0.9);
              data[i + 1] = Math.min(255, g * 1.1 + 10);
              data[i + 2] = Math.min(255, b * 0.9);
              break;

            case 'original':
            default:
              // No change
              break;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => resolve(imageUrl);
      img.src = imageUrl;
    });
  };

  // Apply filter state removed per new concept
  useEffect(() => {
    // We just keep the original photo for now
  }, [pendingPhotoUrl]);

  const handleAcceptPhoto = () => {
    const photoToUse = pendingPhotoUrl;
    if (!photoToUse) return;

    let photoId: string | undefined;

    // Ambil Live Photo URL yang mungkin sudah siap
    const pendingLiveUrl = (window as any).__pendingLivePhotoUrl || undefined;

    if (editingIndex !== null) {
      // Update existing photo (filter change)
      const existingPhoto = photos[editingIndex];
      if (existingPhoto) {
        // Keep originalUrl same, update dataUrl
        updatePhoto(existingPhoto.id, photoToUse, undefined, pendingLiveUrl);
        photoId = existingPhoto.id;
      }
      setEditingIndex(null);
    } else if (retakeIndex !== null) {
      const existingPhoto = photos[retakeIndex];
      if (existingPhoto) {
        // Retake: replace dataUrl AND originalUrl (since it's a new capture)
        updatePhoto(existingPhoto.id, photoToUse, pendingPhotoUrl || undefined, pendingLiveUrl);
        photoId = existingPhoto.id;
      }
      setRetakeIndex(null);
    } else {
      // Add new photo with originalUrl using the stable photoId from currentPhotoIdRef
      const stableId = currentPhotoIdRef.current || `photo-${Date.now()}`;

      addPhoto(photoToUse, pendingPhotoUrl || undefined, stableId, pendingLiveUrl);
      photoId = stableId;
    }

    // Bersihkan ref global setelah digunakan
    if (pendingLiveUrl) {
      (window as any).__pendingLivePhotoUrl = null;
    }


    setPendingPhotoUrl(null);
    setIsConfirmOpen(false);

    // Mulai otomatis countdown untuk foto berikutnya jika belum mencapai target DAN bukan sedang edit
    const nextCount = (retakeIndex === null && editingIndex === null) ? photos.length + 1 : photos.length;
    if (editingIndex === null && nextCount < maxPhotos && photos.length < maxPhotos) {
      setTimeout(() => {
        handleCapture();
      }, 300);
    }
  };

  const handleEditPhoto = (index: number) => {
    if (!photos[index]) return;
    setEditingIndex(index);
    // Use original if available, otherwise dataUrl (fallback)
    setPendingPhotoUrl(photos[index].originalUrl || photos[index].dataUrl);
    setRetakeIndex(null);
    setIsConfirmOpen(true);
  };

  const handleRetakeCapture = () => {
    // Tutup modal agar pengguna bisa mengambil ulang tanpa mereset sesi
    setPendingPhotoUrl(null);
    setIsConfirmOpen(false);

    // Langsung mulai countdown untuk ambil ulang
    setTimeout(() => {
      handleCapture();
    }, 200);
  };

  const handleRetake = (index: number) => {
    setRetakeIndex(index);
  };

  const handleNext = () => {
    if (photos.length >= maxPhotos) {
      // Jika jumlah foto yang diambil melebihi kapasitas frame, WAJIB ke seleksi foto
      const forceSelection = maxPhotos > frameMaxSlots;

      if (systemSettings.isPhotoSelectionEnabled || forceSelection) {
        router.push('/photo-selection');
      } else {
        router.push('/result');
      }
    }
  };

  const handleBack = () => {
    router.push('/theme');
  };

  const handlePreviewPhoto = (photoUrl: string) => {
    setPreviewPhoto(photoUrl);
  };

  const handleReturnToLivePreview = () => {
    setPreviewPhoto(null);
  };

  // Drag & Drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (index: number) => {
    setDragOverIndex(index);
  };

  const handleDrop = (toIndex: number) => {
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      reorderPhotos(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const isComplete = photos.length === maxPhotos;

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden">
      {/* Aesthetic Header */}
      <SessionHeader
        currentPhotos={photos.length}
        maxPhotos={maxPhotos}
        remainingMs={remainingMs}
      />

      <div className="flex-1 flex flex-col relative z-10 min-h-0 overflow-hidden">

        {/* Top Panel: Camera View */}
        <div className="flex-1 relative flex items-center justify-center p-0 min-h-0 bg-black">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full h-full overflow-hidden bg-black shadow-2xl border-b border-white/5"
          >
            {previewPhoto ? (
              <div className="relative w-full h-full group">
                <img
                  src={previewPhoto}
                  alt="Preview"
                  className="w-full h-full object-contain bg-black/90"
                />
                <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#A68B67] text-white text-xs font-bold rounded-sm uppercase tracking-wider">
                    Hasil Jepret
                  </div>
                </div>

                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleReturnToLivePreview}
                  className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            ) : (
              <CameraPreview
                className="w-full h-full"
                autoStart={true}
                showGuides={false}
                rounded={false}
              />
            )}

            {/* Camera Corners/Guides */}
            <div className="absolute top-8 left-8 w-12 h-12 border-t border-l border-white/20" />
            <div className="absolute top-8 right-8 w-12 h-12 border-t border-r border-white/20" />
            <div className="absolute bottom-8 left-8 w-12 h-12 border-b border-l border-white/20" />
            <div className="absolute bottom-8 right-8 w-12 h-12 border-b border-r border-white/20" />

            {/* Capture Flash Effect */}
            {isCapturing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-white z-50"
              />
            )}

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                <div className="flex flex-col items-center">
                  <motion.span
                    key={countdown}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 1 }}
                    className="text-[180px] font-serif italic text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.3)]"
                  >
                    {countdown}
                  </motion.span>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 px-8 py-3 bg-black/30 backdrop-blur-md rounded-full border border-white/10 text-white text-sm md:text-base font-medium tracking-wide"
                  >
                    Pose dengan gaya ngadep kamera yaa
                  </motion.p>
                </div>
              </div>
            )}

            {/* Retake Indicator Overlay */}
            {retakeIndex !== null && !previewPhoto && (
              <div className="absolute top-10 left-12 bg-[#A68B67] text-white px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl z-20 rounded-sm">
                Mode Foto Ulang #{retakeIndex + 1}
              </div>
            )}

            {!previewPhoto && (
              <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center z-20">
                <button
                  onClick={handleCapture}
                  disabled={isCapturing || countdown !== null || (photos.length >= maxPhotos && retakeIndex === null)}
                  className="group relative flex items-center justify-center w-24 h-24 rounded-full bg-transparent border-2 border-white/20 hover:border-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 rounded-full border border-white/5 scale-150 opacity-0 group-hover:scale-125 group-hover:opacity-100 transition-all duration-700" />
                  <div className="w-20 h-20 bg-white rounded-full group-hover:scale-90 transition-transform duration-500 shadow-2xl" />
                  {isCapturing && (
                    <div className="absolute inset-0 border-4 border-[#A68B67] rounded-full animate-ping" />
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Bottom Panel: Horizontal Gallery */}
        <SessionSidebar
          photos={photos}
          maxPhotos={maxPhotos}
          retakeIndex={retakeIndex}
          isComplete={isComplete}
          onRemove={removePhoto}
          onPreview={handleEditPhoto}
          onCancelRetake={() => setRetakeIndex(null)}
          onFinish={handleNext}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          draggedIndex={draggedIndex}
          dragOverIndex={dragOverIndex}
        />

      </div>

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirmOpen && pendingPhotoUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0a0a0a]/90"
              onClick={() => setIsConfirmOpen(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#1C1917] border border-white/10 p-6 md:p-10 w-full max-w-screen-2xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Preview and Confirm Display */}
              <div className="flex flex-col min-h-0">
                <div className="aspect-[4/3] bg-black rounded-sm overflow-hidden mb-6 border border-white/10 relative">
                  <img
                    src={pendingPhotoUrl}
                    alt="Preview"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                  <button
                    onClick={handleRetakeCapture}
                    className="py-4 border border-white/20 hover:bg-white/10 text-white text-xs uppercase tracking-widest"
                  >
                    Ambil Ulang
                  </button>
                  <button
                    onClick={handleAcceptPhoto}
                    className="py-4 bg-[#FDFBF7] text-[#1C1917] hover:bg-white text-xs uppercase tracking-widest font-bold"
                  >
                    Simpan Foto
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Timeout Warning */}
      <AnimatePresence>
        {showTimeoutWarning && remainingMs > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#B91C1C] text-white px-8 py-4 shadow-2xl flex items-center gap-4 z-50 rounded-sm"
          >
            <div className="animate-pulse">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest opacity-80">Waktu Hampir Habis!</p>
              <p className="text-sm font-serif italic">Sisa waktu {Math.ceil(remainingMs / 1000)} detik lagi</p>
            </div>
            <button
              onClick={() => setShowTimeoutWarning(false)}
              className="ml-4 opacity-50 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PhotoSessionPage;