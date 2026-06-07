/**
 * Offline Queue Service
 * 
 * Menyimpan data order ke IndexedDB / localStorage saat aplikasi offline,
 * lalu mengirimkan ke server saat koneksi internet kembali.
 * 
 * Digunakan oleh aplikasi desktop (Electron) untuk mode hybrid.
 */

// Types
export interface OfflineOrder {
  localId: string;
  userName: string;
  frameId: string;
  frameName: string;
  quantity: number;
  pricePerFrame: number;
  totalPrice: number;
  costPrice: number;
  imageUrl: string;
  paymentStatus: string;
  printedAt: string;
  createdAt: string;
  synced: boolean;
  syncedAt?: string;
  serverId?: string;
}

const STORAGE_KEY = 'photobooth.offlineQueue';

/**
 * Ambil semua order dari offline queue
 */
export function getOfflineQueue(): OfflineOrder[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Tambahkan order ke offline queue
 */
export function addToOfflineQueue(order: Omit<OfflineOrder, 'localId' | 'synced' | 'createdAt'>): OfflineOrder {
  const queue = getOfflineQueue();
  const newOrder: OfflineOrder = {
    ...order,
    localId: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    synced: false,
    createdAt: new Date().toISOString(),
  };
  queue.push(newOrder);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  console.log('📦 Order added to offline queue:', newOrder.localId);
  return newOrder;
}

/**
 * Tandai order sebagai sudah di-sync
 */
export function markAsSynced(localId: string, serverId: string): void {
  const queue = getOfflineQueue();
  const index = queue.findIndex((o) => o.localId === localId);
  if (index !== -1) {
    queue[index].synced = true;
    queue[index].syncedAt = new Date().toISOString();
    queue[index].serverId = serverId;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }
}

/**
 * Ambil order yang belum di-sync
 */
export function getUnsyncedOrders(): OfflineOrder[] {
  return getOfflineQueue().filter((o) => !o.synced);
}

/**
 * Hapus order yang sudah di-sync (cleanup)
 */
export function cleanupSyncedOrders(): void {
  const queue = getOfflineQueue().filter((o) => !o.synced);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  console.log('🧹 Cleaned up synced orders from offline queue');
}

/**
 * Cek apakah ada order yang menunggu sync
 */
export function hasPendingSync(): boolean {
  return getUnsyncedOrders().length > 0;
}

/**
 * Hitung jumlah order yang menunggu sync
 */
export function getPendingSyncCount(): number {
  return getUnsyncedOrders().length;
}
