/**
 * Sync Manager Service
 * 
 * Background sync service yang otomatis mengirim data dari offline queue ke server
 * saat koneksi internet tersedia. Mendukung mode hybrid (online/offline).
 * 
 * Digunakan oleh aplikasi desktop (Electron) untuk sinkronisasi otomatis.
 */

import {
  getUnsyncedOrders,
  markAsSynced,
  cleanupSyncedOrders,
  getPendingSyncCount,
  type OfflineOrder,
} from './offline-queue';

export type ConnectionStatus = 'online' | 'offline' | 'syncing';

type StatusChangeCallback = (status: ConnectionStatus, pendingCount: number) => void;

class SyncManager {
  private isRunning = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private statusCallbacks: StatusChangeCallback[] = [];
  private currentStatus: ConnectionStatus = 'online';
  private apiBaseUrl: string = '';
  /**
   * Inisialisasi sync manager
   */
  init(config: { apiBaseUrl: string }) {
    this.apiBaseUrl = config.apiBaseUrl;

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());

      // Set initial status
      this.updateStatus(navigator.onLine ? 'online' : 'offline');
    }
  }

  /**
   * Start periodic sync (default setiap 30 detik)
   */
  start(intervalMs: number = 30000) {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🔄 Sync Manager started');

    // Immediate sync attempt
    this.syncNow();

    // Periodic sync
    this.intervalId = setInterval(() => {
      if (navigator.onLine && getPendingSyncCount() > 0) {
        this.syncNow();
      }
    }, intervalMs);
  }

  /**
   * Stop periodic sync
   */
  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('⏹️ Sync Manager stopped');
  }

  /**
   * Register callback untuk perubahan status koneksi
   */
  onStatusChange(callback: StatusChangeCallback) {
    this.statusCallbacks.push(callback);
    // Immediately notify with current status
    callback(this.currentStatus, getPendingSyncCount());
  }

  /**
   * Remove status change callback
   */
  offStatusChange(callback: StatusChangeCallback) {
    this.statusCallbacks = this.statusCallbacks.filter((cb) => cb !== callback);
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.currentStatus;
  }

  /**
   * Force sync now
   */
  async syncNow(): Promise<{ success: boolean; synced: number; failed: number }> {
    const unsyncedOrders = getUnsyncedOrders();
    if (unsyncedOrders.length === 0) {
      return { success: true, synced: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      console.log('📴 Offline - skipping sync');
      return { success: false, synced: 0, failed: unsyncedOrders.length };
    }

    this.updateStatus('syncing');
    console.log(`🔄 Syncing ${unsyncedOrders.length} orders...`);

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/sync`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orders: unsyncedOrders.map((order) => ({
            localId: order.localId,
            userName: order.userName,
            frameId: order.frameId,
            frameName: order.frameName,
            quantity: order.quantity,
            pricePerFrame: order.pricePerFrame,
            totalPrice: order.totalPrice,
            costPrice: order.costPrice,
            imageUrl: order.imageUrl,
            paymentStatus: order.paymentStatus,
            printedAt: order.printedAt,
            createdAt: order.createdAt,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed with status ${response.status}`);
      }

      const data = await response.json();

      // Mark synced orders
      let synced = 0;
      let failed = 0;
      if (data.results) {
        for (const result of data.results) {
          if (result.success) {
            markAsSynced(result.localId, result.serverId);
            synced++;
          } else {
            failed++;
          }
        }
      }

      // Cleanup old synced orders
      cleanupSyncedOrders();

      this.updateStatus('online');
      console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`);

      return { success: true, synced, failed };
    } catch (error) {
      console.error('❌ Sync error:', error);
      this.updateStatus(navigator.onLine ? 'online' : 'offline');
      return { success: false, synced: 0, failed: unsyncedOrders.length };
    }
  }

  private handleOnline() {
    console.log('🟢 Internet connection restored');
    this.updateStatus('online');

    // Trigger immediate sync when coming back online
    if (getPendingSyncCount() > 0) {
      setTimeout(() => this.syncNow(), 2000); // Small delay to ensure stable connection
    }
  }

  private handleOffline() {
    console.log('🔴 Internet connection lost');
    this.updateStatus('offline');
  }

  private updateStatus(status: ConnectionStatus) {
    this.currentStatus = status;
    const pendingCount = getPendingSyncCount();
    for (const callback of this.statusCallbacks) {
      try {
        callback(status, pendingCount);
      } catch (err) {
        console.error('Status callback error:', err);
      }
    }
  }

  /**
   * Destroy: stop sync and remove all listeners
   */
  destroy() {
    this.stop();
    this.statusCallbacks = [];
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', () => this.handleOnline());
      window.removeEventListener('offline', () => this.handleOffline());
    }
  }
}

// Singleton instance
export const syncManager = new SyncManager();
export default syncManager;
