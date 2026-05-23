"use client";

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { usePhotoStore } from '@/store/usePhotoStore';
import { WavyBackground } from '@/components/ui/wavy-background';

// Components
import LoadingScreen from '@/components/ui/LoadingScreen';
import PhotoboothHeader from '@/components/photobooth/ui/PhotoboothHeader';
import ThemeCard from '@/components/photobooth/theme/ThemeCard';

interface DbTheme {
  id: string;
  name: string;
  previewUrl: string;
  price: number;
  description: string | null;
  tag: string | null;
  frames: {
    id: string;
    name: string;
    previewUrl: string;
  }[];
  _count: {
    frames: number;
  };
}

const FrameThemePage: React.FC = () => {
  const router = useRouter();
  const { setFrameCategory, setSelectedFrame, setSelectedDbTheme, systemSettings, settingsLoaded } = usePhotoStore();

  const [dbThemes, setDbThemes] = useState<DbTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();
  const [isPaymentEnabled, setIsPaymentEnabled] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Timer States
  const [remainingMs, setRemainingMs] = useState<number>(-1);
  const [timerStarted, setTimerStarted] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchThemes();
      fetchProfile();
    }
  }, [status, session]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/admin/profile');
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  useEffect(() => {
    if (settingsLoaded) {
      setIsPaymentEnabled(systemSettings.isPaymentEnabled !== false);
    }
  }, [settingsLoaded, systemSettings.isPaymentEnabled]);

  const fetchThemes = async () => {
    try {
      const res = await fetch('/api/themes');
      if (res.ok) {
        const data = await res.json();
        setDbThemes(data);
      }
    } catch (error) {
      console.error('Failed to fetch themes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Timer Effect
  useEffect(() => {
    if (!settingsLoaded || loading) return;

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
  }, [loading, settingsLoaded, systemSettings]);

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

  // Handle DB theme selection
  const handleDbThemeSelect = (theme: DbTheme) => {
    setFrameCategory('database');
    setSelectedDbTheme(theme.id);
    if (theme.frames.length > 0) {
      setSelectedFrame(theme.frames[0].id);
    }
    router.push(`/frames-db/${theme.id}`);
  };

  // Always show all themes belonging to the user, regardless of payment mode
  // The API already filters themes to only return the user's own themes

  const allThemes = dbThemes.map((theme, index) => ({
    type: 'database' as const,
    id: theme.id,
    name: theme.name,
    description: theme.description,
    tag: theme.tag,
    previewUrl: theme.previewUrl,
    theme,
    frameCount: theme._count.frames,
    index,
  }));

  if (loading || status === 'loading') {
    return <LoadingScreen message="Menyiapkan Galeri..." />;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] relative overflow-hidden flex flex-col items-center justify-center p-6 md:p-12">
      {/* Grain Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-50" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      {/* Soft Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#A68B67]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#4A3F35]/10 rounded-full blur-[120px]" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-10">
        <PhotoboothHeader
          onBack={() => router.push('/video')}
          backLabel="Batal & Kembali"
        />
        
        {/* Timer Pill */}
        {remainingMs !== -1 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#1C1917]/80 backdrop-blur-md border border-[#A68B67]/20 shadow-xl mt-8"
          >
            <span className="w-2 h-2 rounded-full bg-[#A68B67] animate-pulse" />
            <span className="text-[10px] uppercase font-black tracking-widest text-[#A68B67]">Time Remaining</span>
            <span className="text-xl font-serif italic text-[#FDFBF7] tabular-nums">
              {formatTime(remainingMs)}
            </span>
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <main className="w-full max-w-7xl relative z-10 flex flex-col items-center">

        {/* Section Title */}
        <div className="text-center mb-16 space-y-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-center gap-4 mb-2"
          >
            <div className="h-px w-12 bg-[#EAE1D3]" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#A68B67]">Gallery Collection</span>
            <div className="h-px w-12 bg-[#EAE1D3]" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-serif italic text-[#4A3F35] tracking-tight leading-none"
          >
            Signature <span className="text-[#A68B67]">Themes</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[11px] font-black text-[#8C7E6A] uppercase tracking-[0.4em] opacity-60"
          >
            Pilih Estetika Terbaik Untuk Moment Anda
          </motion.p>
        </div>

        {!session ? null : (
          <div className="w-full overflow-x-auto no-scrollbar py-20 px-4 md:px-10">
            {allThemes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex flex-col items-center justify-center py-10 opacity-70"
              >
                <div className="w-16 h-16 bg-[#EAE1D3]/50 rounded-full flex items-center justify-center mb-6 border border-[#A68B67]/20">
                  <span className="text-[#8C7E6A] font-serif italic text-2xl">?</span>
                </div>
                <span className="text-[12px] font-black uppercase tracking-[0.3em] text-[#4A3F35] mb-3">Belum Ada Tema</span>
                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-[#8C7E6A] text-center max-w-sm leading-relaxed">
                  Koleksi frame belum tersedia. Silakan hubungi admin untuk menambahkan tema ke akun Anda.
                </span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex gap-12 ${allThemes.length <= 3 ? 'md:justify-center' : ''} min-w-max pb-10`}
              >
                {allThemes.map((theme, idx) => (
                  <ThemeCard
                    key={`${theme.type}-${theme.id}`}
                    index={idx}
                    id={theme.id}
                    name={theme.name}
                    previewUrl={theme.previewUrl}
                    frameCount={theme.frameCount}
                    price={theme.theme?.price || 0}
                    isPaymentEnabled={isPaymentEnabled}
                    tag={theme.tag}
                    onClick={() => handleDbThemeSelect(theme.theme!)}
                  />
                ))}
              </motion.div>
            )}
          </div>
        )}
      </main>

      {/* Footer Instructions */}
      <footer className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="inline-flex items-center gap-4 px-8 py-3 bg-white/50 backdrop-blur-sm border border-[#EAE1D3] rounded-full shadow-sm">
            <ArrowRight className="w-4 h-4 text-[#A68B67] animate-bounce-x" />
            <span className="text-[10px] font-black text-[#4A3F35] uppercase tracking-[0.3em]">Geser untuk melihat koleksi lainnya</span>
          </div>
        </motion.div>
      </footer>

      {/* Decorative Labels */}
      <div className="hidden lg:block absolute left-8 top-1/2 -translate-y-1/2 -rotate-90">
        <span className="text-[9px] font-black uppercase tracking-[0.6em] text-[#A68B67] opacity-20 whitespace-nowrap">
          CURATED ART DIRECTION
        </span>
      </div>

      <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 rotate-90">
        <span className="text-[9px] font-black uppercase tracking-[0.6em] text-[#A68B67] opacity-20 whitespace-nowrap">
          THE DOVELENS EXPERIENCE
        </span>
      </div>
    </div>
  );
};

export default FrameThemePage;
