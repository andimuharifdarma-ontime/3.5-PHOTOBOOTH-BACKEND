"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { syncManager, ConnectionStatus } from '@/services/sync-manager';
import { isElectron } from '@/lib/electron';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SyncProvider
 * 
 * Mengelola status sinkronisasi background dan menampilkan indikator
 * koneksi untuk aplikasi desktop (Electron).
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [pendingCount, setPendingCount] = useState(0);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Hanya aktifkan sync manager di environment Electron (Desktop App)
    if (isElectron()) {
      setShowIndicator(true);
      
      const apiBaseUrl = window.location.origin;
      const authToken = (session as any)?.accessToken || '';

      syncManager.init({
        apiBaseUrl,
        authToken,
      });

      syncManager.onStatusChange((newStatus, count) => {
        setStatus(newStatus);
        setPendingCount(count);
      });

      syncManager.start();

      return () => {
        syncManager.destroy();
      };
    }
  }, [session]);

  return (
    <>
      {children}
      
      {/* Indikator Status Sync (Hanya muncul di Electron) */}
      <AnimatePresence>
        {showIndicator && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 z-[9999] pointer-events-none"
          >
            <div className="flex items-center gap-3 px-4 py-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-full shadow-2xl">
              {status === 'online' && pendingCount === 0 && (
                <div className="flex items-center gap-2 text-green-400">
                  <Wifi size={16} />
                  <span className="text-xs font-medium uppercase tracking-wider">Online</span>
                </div>
              )}
              
              {status === 'offline' && (
                <div className="flex items-center gap-2 text-red-400">
                  <WifiOff size={16} />
                  <span className="text-xs font-medium uppercase tracking-wider">Offline</span>
                </div>
              )}
              
              {status === 'syncing' && (
                <div className="flex items-center gap-2 text-blue-400">
                  <RefreshCw size={16} className="animate-spin" />
                  <span className="text-xs font-medium uppercase tracking-wider">Syncing...</span>
                </div>
              )}

              {pendingCount > 0 && (
                <div className="flex items-center gap-2 px-2 py-0.5 bg-white/10 rounded-md">
                  <span className="text-[10px] font-bold text-white/70">
                    {pendingCount} PENDING
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
