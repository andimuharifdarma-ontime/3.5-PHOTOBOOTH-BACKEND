"use client";
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePhotoStore } from '@/store/usePhotoStore';
import { Camera, AlertCircle, RefreshCw, Shield, Settings } from 'lucide-react';

interface CameraPreviewProps {
  className?: string;
  autoStart?: boolean;
  showGuides?: boolean;
  rounded?: boolean;
}

const CameraPreview: React.FC<CameraPreviewProps> = ({
  className = '',
  autoStart = false,
  showGuides = true,
  rounded = true
}) => {
  const { videoRef, startCamera } = usePhotoStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [permissionState, setPermissionState] = useState<string>('prompt');

  useEffect(() => {
    // Check camera permission status
    const checkPermission = async () => {
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setPermissionState(permission.state);

          permission.addEventListener('change', () => {
            setPermissionState(permission.state);
          });
        } catch (error) {
          console.warn('Permission API not available:', error);
        }
      }
    };

    checkPermission();

    if (autoStart) {
      handleStartCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const handleStartCamera = async () => {
    setIsLoading(true);
    setError('');

    try {
      await startCamera();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengakses kamera');
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorIcon = () => {
    if (error.includes('Permission') || error.includes('permission')) return Shield;
    if (error.includes('HTTPS') || error.includes('localhost')) return Shield;
    if (error.includes('sedang digunakan')) return Settings;
    return AlertCircle;
  };

  const getHelpText = () => {
    if (error.includes('Permission') || error.includes('permission')) {
      return (
        <div className="text-sm text-red-600 space-y-2">
          <p><strong>Cara memberikan permission:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Klik ikon kamera/kunci di address bar browser</li>
            <li>Pilih "Allow" atau "Izinkan" untuk kamera</li>
            <li>Refresh halaman jika perlu</li>
          </ul>
        </div>
      );
    }
    if (error.includes('HTTPS') || error.includes('localhost')) {
      return (
        <div className="text-sm text-red-600 space-y-2">
          <p><strong>Solusi keamanan:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Gunakan HTTPS untuk akses kamera</li>
            <li>Atau akses via localhost untuk development</li>
            <li>Browser memerlukan koneksi aman untuk kamera</li>
          </ul>
        </div>
      );
    }
    if (error.includes('sedang digunakan')) {
      return (
        <div className="text-sm text-red-600 space-y-2">
          <p><strong>Cara mengatasi:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Tutup aplikasi video call (Zoom, Teams, dll)</li>
            <li>Tutup tab browser lain yang menggunakan kamera</li>
            <li>Restart browser jika masih bermasalah</li>
          </ul>
        </div>
      );
    }
    return null;
  };

  if (error) {
    const ErrorIcon = getErrorIcon();

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center ${className}`}
      >
        <ErrorIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Kamera Tidak Tersedia
        </h3>
        <p className="text-red-600 mb-4">{error}</p>

        {getHelpText()}

        <div className="flex gap-2 justify-center mt-6">
          <button
            onClick={handleStartCamera}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Lagi
          </button>

          {permissionState === 'denied' && (
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
          )}
        </div>

        {/* Permission status indicator */}
        {permissionState && (
          <div className="mt-4 text-xs text-gray-600">
            Status Permission: <span className={`font-medium ${permissionState === 'granted' ? 'text-green-600' :
              permissionState === 'denied' ? 'text-red-600' : 'text-yellow-600'
              }`}>{permissionState}</span>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${rounded ? 'rounded-2xl' : ''} bg-gray-900 ${className}`}>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-primary-900 flex items-center justify-center z-10"
        >
          <div className="text-center text-white">
            <Camera className="w-16 h-16 mx-auto mb-4 animate-pulse" />
            <p className="text-lg font-medium">Memulai kamera...</p>
          </div>
        </motion.div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-cover scale-x-[-1]"
        playsInline
        muted
        autoPlay
      />

      {/* Camera overlay effects */}
      {showGuides && (
        <>
          <div className={`absolute inset-0 border-4 border-white/20 ${rounded ? 'rounded-2xl' : ''} pointer-events-none`} />
          <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
            <div className="w-6 h-6 border-l-4 border-t-4 border-white/50" />
            <div className="w-6 h-6 border-r-4 border-t-4 border-white/50" />
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex justify-between pointer-events-none">
            <div className="w-6 h-6 border-l-4 border-b-4 border-white/50" />
            <div className="w-6 h-6 border-r-4 border-b-4 border-white/50" />
          </div>
        </>
      )}
    </div>
  );
};

export default CameraPreview;