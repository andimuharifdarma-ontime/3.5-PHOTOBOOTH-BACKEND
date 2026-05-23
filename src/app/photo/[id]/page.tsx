"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Camera,
  Play,
  Sparkles,
  X,
  AlertCircle,
  Clock,
  Eye,
} from "lucide-react";

interface PhotoPageProps {
  params: Promise<{ id: string }>;
}

interface PhotoData {
  id: string;
  customerName: string | null;
  mainUrl: string | null;
  bonusUrl: string | null;
  liveUrl: string | null;
  expired: boolean;
}

export default function PhotoViewPage({ params }: PhotoPageProps) {
  const [photoData, setPhotoData] = useState<PhotoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"photo" | "bonus" | "live">(
    "photo"
  );
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const loadPhoto = async () => {
      try {
        const { id } = await params;
        const cleanId = id?.replace(/\.+$/, "") || "";

        const res = await fetch(`/api/photo/${cleanId}`);
        const data = await res.json();

        if (!res.ok) {
          if (data.expired) {
            setError("expired");
          } else {
            setError(data.error || "Gagal memuat foto");
          }
          return;
        }

        setPhotoData(data);
      } catch (err) {
        console.error("Error loading photo:", err);
        setError("Gagal memuat foto. Silakan coba lagi.");
      } finally {
        setIsLoading(false);
      }
    };
    loadPhoto();
  }, [params]);

  const handleDownload = async (url: string, type: string) => {
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Gagal memuat file");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const ext = type === "photo" ? "png" : "mp4";
      const name = photoData?.customerName?.replace(/\s/g, "-") || "photobooth";
      const fileName = `${name}-${type}.${ext}`;

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="photo-viewer-page">
        <div className="photo-viewer-loading">
          <motion.div
            className="photo-viewer-spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="photo-viewer-loading-text">Memuat foto...</p>
        </div>
      </div>
    );
  }

  // Expired / Not found
  if (error === "expired" || !photoData) {
    return (
      <div className="photo-viewer-page">
        <div className="photo-viewer-expired">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <Clock className="photo-viewer-expired-icon" />
          </motion.div>
          <h1 className="photo-viewer-expired-title">Foto Tidak Tersedia</h1>
          <p className="photo-viewer-expired-desc">
            {error === "expired"
              ? "Foto ini sudah melewati batas waktu penyimpanan dan telah dihapus secara otomatis."
              : error || "Foto tidak ditemukan."}
          </p>
          <p className="photo-viewer-expired-contact">
            Hubungi admin jika Anda memerlukan foto ini.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && error !== "expired") {
    return (
      <div className="photo-viewer-page">
        <div className="photo-viewer-error">
          <AlertCircle className="photo-viewer-error-icon" />
          <h1>Terjadi Kesalahan</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "photo" as const, label: "Foto", icon: Camera, url: photoData.mainUrl },
    ...(photoData.bonusUrl
      ? [{ id: "bonus" as const, label: "Bonus", icon: Sparkles, url: photoData.bonusUrl }]
      : []),
    ...(photoData.liveUrl
      ? [{ id: "live" as const, label: "Live Photo", icon: Play, url: photoData.liveUrl }]
      : []),
  ];

  const activeUrl = tabs.find((t) => t.id === activeTab)?.url;
  const isVideo = activeTab === "bonus" || activeTab === "live";

  return (
    <div className="photo-viewer-page">
      {/* Header */}
      <div className="photo-viewer-header">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="photo-viewer-header-inner"
        >
          <Camera className="photo-viewer-header-icon" />
          <div>
            <h1 className="photo-viewer-title">
              {photoData.customerName
                ? `Foto ${photoData.customerName}`
                : "Foto Anda"}
            </h1>
            <p className="photo-viewer-subtitle">
              Tap untuk lihat & download foto
            </p>
          </div>
        </motion.div>
      </div>

      {/* Tab Selector */}
      {tabs.length > 1 && (
        <div className="photo-viewer-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`photo-viewer-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Photo/Video Preview */}
      <motion.div
        className="photo-viewer-preview"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="photo-viewer-media-wrapper"
          >
            {isVideo && activeUrl ? (
              <video
                ref={videoRef}
                src={activeUrl}
                className="photo-viewer-media"
                controls
                playsInline
                loop
                autoPlay
                muted
                onClick={() => setShowPreview(activeUrl)}
              />
            ) : activeUrl ? (
              <img
                src={activeUrl}
                alt="Foto Photobooth"
                className="photo-viewer-media"
                onClick={() => setShowPreview(activeUrl)}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>

        {/* Tap to preview hint */}
        <div className="photo-viewer-hint">
          <Eye size={14} />
          <span>Tap untuk preview lebih besar</span>
        </div>
      </motion.div>

      {/* Download Buttons */}
      <div className="photo-viewer-actions">
        {photoData.mainUrl && (
          <motion.button
            className="photo-viewer-btn photo-viewer-btn-primary"
            onClick={() => handleDownload(photoData.mainUrl!, "photo")}
            disabled={isDownloading}
            whileTap={{ scale: 0.95 }}
          >
            <Download size={20} />
            <span>{isDownloading ? "Mengunduh..." : "Download Foto"}</span>
          </motion.button>
        )}

        {photoData.bonusUrl && (
          <motion.button
            className="photo-viewer-btn photo-viewer-btn-secondary"
            onClick={() => handleDownload(photoData.bonusUrl!, "bonus")}
            disabled={isDownloading}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles size={20} />
            <span>Download Bonus Video</span>
          </motion.button>
        )}

        {photoData.liveUrl && (
          <motion.button
            className="photo-viewer-btn photo-viewer-btn-secondary"
            onClick={() => handleDownload(photoData.liveUrl!, "live-photo")}
            disabled={isDownloading}
            whileTap={{ scale: 0.95 }}
          >
            <Play size={20} />
            <span>Download Live Photo</span>
          </motion.button>
        )}
      </div>

      {/* Footer */}
      <div className="photo-viewer-footer">
        <p>Powered by DoveLens Photobooth</p>
      </div>

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            className="photo-viewer-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPreview(null)}
          >
            <button
              className="photo-viewer-modal-close"
              onClick={() => setShowPreview(null)}
            >
              <X size={24} />
            </button>
            {isVideo ? (
              <video
                src={showPreview}
                className="photo-viewer-modal-media"
                controls
                playsInline
                loop
                autoPlay
              />
            ) : (
              <img
                src={showPreview}
                alt="Preview"
                className="photo-viewer-modal-media"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .photo-viewer-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 0 2rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .photo-viewer-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 1.5rem;
        }

        .photo-viewer-spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #a78bfa;
          border-radius: 50%;
        }

        .photo-viewer-loading-text {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.95rem;
        }

        .photo-viewer-expired,
        .photo-viewer-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          text-align: center;
          padding: 2rem;
          gap: 1rem;
        }

        .photo-viewer-expired-icon {
          width: 72px;
          height: 72px;
          color: #f59e0b;
          margin-bottom: 0.5rem;
        }

        .photo-viewer-error-icon {
          width: 72px;
          height: 72px;
          color: #ef4444;
        }

        .photo-viewer-expired-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
        }

        .photo-viewer-expired-desc {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.6);
          max-width: 320px;
          line-height: 1.6;
        }

        .photo-viewer-expired-contact {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 0.5rem;
        }

        .photo-viewer-header {
          width: 100%;
          padding: 1.5rem 1.25rem;
          background: linear-gradient(180deg, rgba(167, 139, 250, 0.15) 0%, transparent 100%);
        }

        .photo-viewer-header-inner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          max-width: 500px;
          margin: 0 auto;
        }

        .photo-viewer-header-icon {
          width: 32px;
          height: 32px;
          color: #a78bfa;
          flex-shrink: 0;
        }

        .photo-viewer-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        .photo-viewer-subtitle {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0.15rem 0 0;
        }

        .photo-viewer-tabs {
          display: flex;
          gap: 0.5rem;
          padding: 0 1.25rem;
          max-width: 500px;
          width: 100%;
          margin: 0 auto 1rem;
        }

        .photo-viewer-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.6rem 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .photo-viewer-tab.active {
          background: rgba(167, 139, 250, 0.2);
          border-color: rgba(167, 139, 250, 0.4);
          color: #a78bfa;
        }

        .photo-viewer-preview {
          width: 100%;
          max-width: 500px;
          padding: 0 1.25rem;
          margin-bottom: 1.5rem;
        }

        .photo-viewer-media-wrapper {
          border-radius: 16px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .photo-viewer-media {
          width: 100%;
          display: block;
          cursor: pointer;
        }

        .photo-viewer-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          margin-top: 0.75rem;
          color: rgba(255, 255, 255, 0.35);
          font-size: 0.75rem;
        }

        .photo-viewer-actions {
          width: 100%;
          max-width: 500px;
          padding: 0 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .photo-viewer-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          padding: 0.9rem 1.5rem;
          border-radius: 14px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .photo-viewer-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .photo-viewer-btn-primary {
          background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(167, 139, 250, 0.3);
        }

        .photo-viewer-btn-primary:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(167, 139, 250, 0.5);
          transform: translateY(-1px);
        }

        .photo-viewer-btn-secondary {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .photo-viewer-btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .photo-viewer-footer {
          margin-top: 2rem;
          text-align: center;
          color: rgba(255, 255, 255, 0.25);
          font-size: 0.75rem;
        }

        .photo-viewer-modal {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .photo-viewer-modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          z-index: 10;
        }

        .photo-viewer-modal-media {
          max-width: 100%;
          max-height: 90vh;
          object-fit: contain;
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}
