import { useState, useEffect, useCallback, useRef } from 'react';

interface SettingsCacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_TTL = 30000; // 30 seconds
const cache = new Map<string, SettingsCacheEntry>();

export function useAdminSettings() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSettings = useCallback(async () => {
    // Check cache first
    const cached = cache.get('admin-settings');
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setIsLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch('/api/admin/settings', {
        signal: abortController.signal,
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch settings');
      }

      const settings = await res.json();
      
      // Update cache
      cache.set('admin-settings', {
        data: settings,
        timestamp: Date.now(),
      });

      setData(settings);
      setIsLoading(false);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch admin settings:', error);
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSettings]);

  const mutate = useCallback(() => {
    // Invalidate cache
    cache.delete('admin-settings');
    return fetchSettings();
  }, [fetchSettings]);

  return { data, isLoading, mutate };
}