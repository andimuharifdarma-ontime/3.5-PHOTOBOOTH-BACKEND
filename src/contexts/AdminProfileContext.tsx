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

const PROFILE_CACHE_KEY = 'admin.profile.cache.v1';

const AdminProfileContext = createContext<AdminProfileContextValue | undefined>(undefined);

function profileFromSessionUser(user: Record<string, unknown>): AdminProfile | null {
  if (!user?.email) return null;

  return {
    id: String(user.id ?? ''),
    name: String(user.name ?? ''),
    email: String(user.email ?? ''),
    role: String(user.role ?? 'KARYAWAN'),
    isPaymentEnabled: user.isPaymentEnabled as boolean | undefined,
    canManageThemes: user.canManageThemes as boolean | undefined,
    canManageFilters: user.canManageFilters as boolean | undefined,
    canInputCapital: user.canInputCapital as boolean | undefined,
    initialCapital: user.initialCapital as number | undefined,
  };
}

function readCachedProfile(): AdminProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AdminProfile) : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(profile: AdminProfile) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore quota errors
  }
}

export function AdminProfileProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState<AdminProfile | null>(() => readCachedProfile());
  const [profileLoaded, setProfileLoaded] = useState(() => Boolean(readCachedProfile()));
  const [isAccountDeleted, setIsAccountDeleted] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (isAccountDeleted) return;

    try {
      const res = await fetch('/api/admin/profile', { cache: 'no-store' });
      if (res.status === 404) {
        setIsAccountDeleted(true);
        setUserProfile(null);
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as AdminProfile;
        setUserProfile(data);
        writeCachedProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setProfileLoaded(true);
    }
  }, [isAccountDeleted]);

  useEffect(() => {
    if (status === 'loading') return;

    if (status !== 'authenticated' || !session?.user) {
      setUserProfile(null);
      setProfileLoaded(true);
      return;
    }

    const seeded = profileFromSessionUser(session.user as Record<string, unknown>);
    if (seeded) {
      setUserProfile((prev) => prev ?? seeded);
      setProfileLoaded(true);
    }

    void refreshProfile();
  }, [status, session?.user, refreshProfile]);

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
