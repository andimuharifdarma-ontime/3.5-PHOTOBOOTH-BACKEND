"use client";
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, ChevronUp, ChevronDown } from 'lucide-react';
import { usePhotoStore } from '@/store/usePhotoStore';
import FrameRenderer from '@/components/photobooth/frames/FrameRenderer';
import { WavyBackground } from '@/components/ui/wavy-background';

// Components
import PhotoboothHeader from '@/components/photobooth/ui/PhotoboothHeader';
import FrameVariantCard from '@/components/photobooth/frames/FrameVariantCard';
import ActionPanel from '@/components/photobooth/ui/ActionPanel';

interface FrameItem {
  id: string;
  name: string;
  url: string;
}

const FrameSelectionPage: React.FC = () => {
  const router = useRouter();
  const { selectedFrame, setSelectedFrame, frameCategory, setFrameCategory, systemSettings, settingsLoaded } = usePhotoStore();
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [loadingFrames, setLoadingFrames] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Timer States
  const [remainingMs, setRemainingMs] = useState<number>(-1);
  const [timerStarted, setTimerStarted] = useState(false);
  const hasRedirected = useRef(false);


  useEffect(() => {
    setFrameCategory('standard');
  }, [setFrameCategory]);

  useEffect(() => {
    if (frameCategory === 'frames2') {
      router.replace('/frames-two');
    }
  }, [frameCategory, router]);

  // Fetch frames
  useEffect(() => {
    let alive = true;
    const fetchFrames = async () => {
      try {
        const res = await fetch('/api/frames', { cache: 'no-store' });
        const data = await res.json();
        if (!alive) return;
        const apiFrames: FrameItem[] = Array.isArray(data.frames) ? data.frames : [];
        setFrames(apiFrames);
        if (apiFrames.length > 0 && !apiFrames.find(f => f.id === selectedFrame)) {
          setSelectedFrame(apiFrames[0].id);
        }
      } catch (e) {
        const fallback: FrameItem[] = [
          { id: 'classic', name: 'Classic', url: '/frames/classic.png' },
          { id: 'elegant', name: 'Elegant', url: '/frames/elegant.png' },
          { id: 'modern', name: 'Modern', url: '/frames/modern.png' },
          { id: 'vintage', name: 'Vintage', url: '/frames/vintage.png' },
        ];
        if (alive) setFrames(fallback);
      } finally {
        if (alive) setLoadingFrames(false);
      }
    };
    fetchFrames();
    return () => { alive = false; };
  }, [selectedFrame, setSelectedFrame]);

  // Timer Effect
  useEffect(() => {
    if (!settingsLoaded || loadingFrames) return;

    if (systemSettings.isFrameSelectionTimerEnabled === false) {
      setTimerStarted(false);
      setRemainingMs(-1);
      return;
    }

    const KEY = 'photobooth.frameSelectionDeadlineMs';
    const SETTING_KEY = 'photobooth.frameSelectionTimerSetting';
    const timerMinutes = systemSettings.frameSelectionTimer || 5;

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
  }, [loadingFrames, settingsLoaded, systemSettings]);

  // Redirect if timer ends
  useEffect(() => {
    if (remainingMs === 0 && !hasRedirected.current && timerStarted) {
      hasRedirected.current = true;
      try {
        localStorage.removeItem('photobooth.frameSelectionDeadlineMs');
      } catch { }
      router.push('/video');
    }
  }, [remainingMs, timerStarted, router]);

  const formatTime = (ms: number) => {
    if (ms < 0) return '00:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const checkScrollability = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setCanScrollUp(scrollTop > 0);
    setCanScrollDown(scrollTop < scrollHeight - clientHeight - 10);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkScrollability();
    }, 100);

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      return () => {
        clearTimeout(timer);
        container.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [frames.length]);

  const scrollUp = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: -200, behavior: 'smooth' });
    }
  };

  const scrollDown = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: 200, behavior: 'smooth' });
    }
  };

  const handleStartSession = () => {
    router.push('/session');
  };

  return (
    <WavyBackground
      colors={[
        "rgba(113, 96, 75, 0.8)",
        "rgba(181, 136, 99, 0.8)",
        "rgba(217, 181, 136, 0.8)",
        "rgba(140, 108, 95, 0.8)",
        "rgba(159, 109, 81, 0.8)",
      ]}
      backgroundFill="rgb(44, 24, 16)"
      blur={15}
      speed="slow"
      waveOpacity={0.5}
      waveWidth={60}
      containerClassName="min-h-screen"
      className="w-full"
    >
      <style dangerouslySetInnerHTML={{__html: `
          .custom-scrollbar::-webkit-scrollbar {
              width: 50px !important;
              display: block !important;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(255, 255, 255, 0.1) !important; 
              border-radius: 50px !important;
              margin-block: 10px !important;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.8) !important; 
              border-radius: 50px !important;
              border: 8px solid transparent !important;
              background-clip: padding-box !important;
              min-height: 100px !important;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 1) !important; 
          }
          .custom-scrollbar {
              scrollbar-width: auto !important;
              scrollbar-color: rgba(255, 255, 255, 0.8) transparent !important;
          }
      `}} />
      <div className="relative z-10 min-h-screen flex flex-col w-full touch-pan-y">
        <div className="flex items-center justify-between px-10">
          <PhotoboothHeader
            onBack={() => router.push('/theme')}
            backLabel="Pilih Tema Lain"
            title="Pilih Frame"
            transparent
          />
          
          {remainingMs !== -1 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 flex items-center gap-3 shadow-xl mt-6 mr-6"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] uppercase font-black tracking-widest text-white/80">Timer</span>
              <span className="text-xl font-serif italic text-white tabular-nums">
                {formatTime(remainingMs)}
              </span>
            </motion.div>
          )}
        </div>

        <main className="flex-1 flex flex-col px-4 md:px-6 pb-32">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 max-w-7xl mx-auto w-full min-h-0">
            {/* Left Panel - Frame Variants List (Scrollable) */}
            <div className="flex flex-col min-h-0">
              <h2 className="text-xl font-semibold text-white mb-4">Pilih Variant</h2>
              <div className="relative flex-1 min-h-0">
                {/* Scroll Buttons - Fixed Position */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
                  <motion.button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      scrollUp();
                    }}
                    disabled={!canScrollUp}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2.5 rounded-lg bg-white/90 hover:bg-white text-primary-900 shadow-xl border-2 border-white transition-all ${canScrollUp
                      ? 'opacity-100 cursor-pointer hover:shadow-2xl'
                      : 'opacity-30 cursor-not-allowed'
                      }`}
                  >
                    <ChevronUp size={20} className="text-primary-900" />
                  </motion.button>
                  <motion.button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      scrollDown();
                    }}
                    disabled={!canScrollDown}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2.5 rounded-lg bg-white/90 hover:bg-white text-primary-900 shadow-xl border-2 border-white transition-all ${canScrollDown
                      ? 'opacity-100 cursor-pointer hover:shadow-2xl'
                      : 'opacity-30 cursor-not-allowed'
                      }`}
                  >
                    <ChevronDown size={20} className="text-primary-900" />
                  </motion.button>
                </div>

                {/* Scrollable Content - Limited to show 4 items (2 rows) */}
                <div
                  ref={scrollContainerRef}
                  className="overflow-y-auto custom-scrollbar scroll-smooth rounded-2xl p-3 ml-12 pr-12"
                  style={{
                    maxHeight: 'calc(100vh - 400px)',
                    minHeight: '750px',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    {loadingFrames ? (
                      <div className="col-span-2 text-center text-white py-8">Loading frames...</div>
                    ) : (
                      frames.map((frame, idx) => (
                        <FrameVariantCard
                          key={frame.id}
                          id={frame.id}
                          name={frame.name}
                          url={frame.url}
                          isActive={selectedFrame === frame.id}
                          onClick={() => setSelectedFrame(frame.id)}
                          index={idx}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Frame Preview */}
            <div className="flex flex-col min-h-0">
              <div className="flex-1 flex items-center justify-center rounded-3xl p-6 min-h-0">
                {(() => {
                  const selectedFrameData = frames.find(f => f.id === selectedFrame) || frames[0];
                  if (!selectedFrameData) return null;

                  return (
                    <motion.div
                      key={selectedFrameData.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 100 }}
                      className="w-full max-w-xs md:max-w-sm mx-auto"
                    >
                      <div className="relative rounded-3xl overflow-hidden border-4 border-white/30 bg-white shadow-2xl">
                        <div className="aspect-[9/16] w-full relative">
                          <img
                            src={selectedFrameData.url}
                            alt={selectedFrameData.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </div>
            </div>
          </div>
        </main>

        <ActionPanel
          step="Step 02"
          title="Mulai sesi foto dengan frame terpilih"
          description="Hasil akhir otomatis mengikuti frame yang dipilih."
          buttonLabel="Mulai Sesi Foto"
          buttonIcon={Camera}
          onButtonClick={handleStartSession}
        />
      </div>
    </WavyBackground>
  );
};

export default FrameSelectionPage;