"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Camera, ArrowRight, Shield, X, Loader2, Monitor, AlertTriangle } from 'lucide-react';
// Components
import CameraPreview from '@/components/photobooth/shared/CameraPreview';
import CameraPermissionButton from '@/components/photobooth/shared/CameraPermissionButton';
import DeviceWarning from '@/components/photobooth/ui/DeviceWarning';

import { useSession } from 'next-auth/react';

const VideoStartPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const ua = navigator.userAgent;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isSmallScreen = window.innerWidth < 1024;

      if (isMobileUA || isSmallScreen) {
        setIsMobile(true);
      } else {
        setIsMobile(false);
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const handleStartSession = () => {
    router.push('/tutorial');
  };


  return (
    <div className="min-h-screen flex flex-col">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover -z-10"
      >
        <source src="/bacround-video/final.mp4" type="video/mp4" />
        Browser Anda tidak mendukung tag video.
      </video>
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-6 text-center"
      >
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">
          Self Photobooth
        </h1>
        <p className="text-lg text-white">
          Ambil 4 foto terbaik Anda dengan mudah
        </p>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full flex items-center justify-center">

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <CameraPermissionButton
              label="Mulai Sesi Fotobooth"
              onPermissionGranted={handleStartSession}
            />
          </motion.div>

        </div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-6 text-center"
      >
        <div className="flex items-center justify-center gap-6 text-sm text-white/80">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <span>4 Foto</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Privasi Terjamin</span>
          </div>
        </div>
      </motion.footer>

      {/* Device Warning Modal */}
      {isMobile && <DeviceWarning />}
    </div>
  );
};

export default VideoStartPage;