"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';

interface CameraPermissionButtonProps {
  onPermissionGranted: () => void;
  className?: string;
  label?: string;
}

const CameraPermissionButton: React.FC<CameraPermissionButtonProps> = ({
  onPermissionGranted,
  className = '',
  label = 'Izinkan Akses Kamera'
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const requestPermission = async () => {
    setIsRequesting(true);

    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      // If successful, stop the stream immediately (we just wanted permission)
      stream.getTracks().forEach(track => track.stop());

      setPermissionStatus('granted');
      onPermissionGranted();
    } catch (error) {
      console.error('Permission denied:', error);
      setPermissionStatus('denied');
    } finally {
      setIsRequesting(false);
    }
  };

  const getButtonContent = () => {
    if (isRequesting) {
      return (
        <>
          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <span>Meminta Permission...</span>
        </>
      );
    }

    if (permissionStatus === 'granted') {
      return (
        <>
          <CheckCircle className="w-5 h-5" />
          <span>Permission Diberikan</span>
        </>
      );
    }

    if (permissionStatus === 'denied') {
      return (
        <>
          <AlertCircle className="w-5 h-5" />
          <span>Permission Ditolak</span>
        </>
      );
    }

    return (
      <>
        <Shield className="w-5 h-5" />
        <span>{label}</span>
      </>
    );
  };

  const getButtonColor = () => {
    if (permissionStatus === 'granted') return 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800';
    if (permissionStatus === 'denied') return 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800';
    return 'from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800';
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={requestPermission}
      disabled={isRequesting || permissionStatus === 'granted'}
      className={`
        w-full bg-gradient-to-r ${getButtonColor()}
        disabled:opacity-50 disabled:cursor-not-allowed
        text-white font-semibold py-3 px-6 rounded-xl shadow-lg 
        transition-all flex items-center justify-center gap-2
        ${className}
      `}
    >
      {getButtonContent()}
    </motion.button>
  );
};

export default CameraPermissionButton;