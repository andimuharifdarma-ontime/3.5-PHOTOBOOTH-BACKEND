'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  isPaymentEnabled?: boolean;
  canManageThemes?: boolean;
  canManageFilters?: boolean;
}

interface AdminProfileContextType {
  profile: AdminProfile | null;
  userProfile: AdminProfile | null;
  setProfile: (profile: AdminProfile | null) => void;
  isLoading: boolean;
  isAccountDeleted: boolean;
}

const AdminProfileContext = createContext<AdminProfileContextType>({
  profile: null,
  userProfile: null,
  setProfile: () => {},
  isLoading: true,
  isAccountDeleted: false,
});

export function AdminProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading profile
    const timer = setTimeout(() => {
      setProfile({
        id: '1',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
      });
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AdminProfileContext.Provider value={{ profile, userProfile: profile, setProfile, isLoading, isAccountDeleted: false }}>
      {children}
    </AdminProfileContext.Provider>
  );
}

export function useAdminProfile() {
  const context = useContext(AdminProfileContext);
  if (context === undefined) {
    throw new Error('useAdminProfile must be used within an AdminProfileProvider');
  }
  return context;
}

export default AdminProfileContext;