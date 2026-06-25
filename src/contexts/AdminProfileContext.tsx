'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';

export type AdminProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  isPaymentEnabled?: boolean;
  canManageThemes?: boolean;
  canManageFilters?: boolean;
  canInputCapital?: boolean;
  initialCapital?: number;
  createdAt?: string;
};

type AdminProfileContextValue = {
  userProfile: AdminProfile | null;
  profileLoaded: boolean;
  isAccountDeleted: boolean;
  refreshProfile: () => Promise<void>;
};

const AdminProfileContext = createContext<AdminProfileContextValue | undefined>(undefined);

export function AdminProfileProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [userProfile, setUserProfile] = useState<AdminProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isAccountDeleted, setIsAccountDeleted] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (isAccountDeleted) return;

    try {
      const res = await fetch('/api/admin/profile');
      if (res.status === 404) {
        setIsAccountDeleted(true);
        setUserProfile(null);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setProfileLoaded(true);
    }
  }, [isAccountDeleted]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setUserProfile(null);
      setProfileLoaded(status !== 'loading');
      return;
    }

    void refreshProfile();

    const onFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refreshProfile();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [status, refreshProfile]);

  const value = useMemo(
    () => ({ userProfile, profileLoaded, isAccountDeleted, refreshProfile }),
    [userProfile, profileLoaded, isAccountDeleted, refreshProfile],
  );

  return (
    <AdminProfileContext.Provider value={value}>
      {children}
    </AdminProfileContext.Provider>
  );
}

export function useAdminProfile() {
  const context = useContext(AdminProfileContext);
  if (!context) {
    throw new Error('useAdminProfile must be used within AdminProfileProvider');
  }
  return context;
}
