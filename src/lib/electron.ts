/**
 * Electron Bridge Utility
 * 
 * Digunakan oleh frontend (React/Next.js) untuk berkomunikasi dengan
 * Electron main process secara aman melalui preload script.
 */

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  quitApp: () => void;
  on: (channel: string, callback: (...args: any[]) => void) => void;
}

/**
 * Cek apakah aplikasi berjalan di dalam Electron
 */
export function isElectron(): boolean {
  // Check user agent
  const isElectronUA = typeof navigator !== 'undefined' && 
    navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
  
  // Check for the exposed electron object from preload script
  const hasElectronBridge = typeof window !== 'undefined' && 
    !!(window as any).electron;

  return isElectronUA || hasElectronBridge;
}

/**
 * Ambil instance API Electron (hanya tersedia jika isElectron() true)
 */
export function getElectron(): ElectronAPI | null {
  if (typeof window !== 'undefined' && (window as any).electron) {
    return (window as any).electron as ElectronAPI;
  }
  return null;
}

/**
 * Helper untuk menjalankan fungsi hanya di Electron
 */
export function runInElectron(callback: (api: ElectronAPI) => void) {
  const api = getElectron();
  if (api) {
    callback(api);
  }
}
