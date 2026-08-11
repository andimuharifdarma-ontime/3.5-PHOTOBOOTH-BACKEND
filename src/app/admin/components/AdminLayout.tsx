'use client';

import { ReactNode, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import { ShieldAlert, LogOut } from 'lucide-react';
import Sidebar from '@/components/admin/Sidebar';
import MobileHeader from '@/components/admin/MobileHeader';
import { useAdminProfile } from '@/contexts/AdminProfileContext';
import { useIsLgScreen } from '@/hooks/useIsLgScreen';
import AdminPageSkeleton from '@/components/ui/AdminPageSkeleton';

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();
    const { userProfile, isAccountDeleted } = useAdminProfile();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const isLg = useIsLgScreen();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('admin.sidebarCollapsed');
            if (saved) {
                setSidebarCollapsedState(saved === 'true');
            }
        }
    }, []);

    useEffect(() => {
        if (!sidebarOpen || isLg) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [sidebarOpen, isLg]);

    useEffect(() => {
        if (!isLg) setSidebarOpen(false);
    }, [pathname, isLg]);

    const setSidebarCollapsed = (collapsed: boolean) => {
        setSidebarCollapsedState(collapsed);
        if (typeof window !== 'undefined') {
            localStorage.setItem('admin.sidebarCollapsed', String(collapsed));
        }
    };

    const handleAccountDeletedSignOut = async () => {
        setIsSigningOut(true);
        await signOut({ callbackUrl: '/login' });
    };

    // Redirection and Security logic
    useEffect(() => {
        if (status === 'authenticated' && session?.user) {
            const userRole = userProfile?.role || (session.user as any).role || 'KARYAWAN';
            const isPaymentEnabled = userProfile?.isPaymentEnabled !== undefined
                ? userProfile.isPaymentEnabled
                : (session?.user as any).isPaymentEnabled;

            // 1. Admin restricted paths
            const adminOnlyPaths = ['/admin/oauth-setup', '/admin/users'];
            const isTryingToAccessAdminPath = adminOnlyPaths.some(path => pathname.startsWith(path));

            if (isTryingToAccessAdminPath && userRole !== 'ADMIN') {
                router.push('/admin');
                return;
            }

            // 2. Permission-based paths (for KARYAWAN and CLIENT)
            if (userRole !== 'ADMIN') {
                const canManageThemes = userProfile?.canManageThemes || (session.user as any)?.canManageThemes;
                const canManageFilters = userProfile?.canManageFilters || (session.user as any)?.canManageFilters;

                if (pathname.startsWith('/admin/themes') && !canManageThemes) {
                    router.push('/admin');
                    return;
                }
                if (pathname.startsWith('/admin/filters') && !canManageFilters) {
                    router.push('/admin');
                    return;
                }
            }

            // 3. Client mode-based redirection
            if (userRole === 'CLIENT') {
                if (pathname === '/admin/reports' && !isPaymentEnabled) {
                    router.push('/admin/offline-reports');
                } else if (pathname === '/admin/offline-reports' && isPaymentEnabled) {
                    router.push('/admin/reports');
                }
            }
        } else if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [pathname, session, status, router, userProfile]);

    const handleSignOut = () => {
        signOut({ callbackUrl: '/login' });
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-[#FDFBF7] relative text-[#4A3F35]">
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#A68B67_1px,transparent_1px)] [background-size:24px_24px]" />
                <main className="min-h-screen lg:ml-72">
                    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
                        <AdminPageSkeleton />
                    </div>
                </main>
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    return (
        <div className="min-h-screen bg-[#FDFBF7] relative text-[#4A3F35]">
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#A68B67_1px,transparent_1px)] [background-size:24px_24px]"></div>

            <MobileHeader setSidebarOpen={setSidebarOpen} />

            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            <Sidebar
                session={session}
                status={status}
                userProfile={userProfile}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                pathname={pathname}
                handleSignOut={handleSignOut}
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
            />

            {/* Main Content */}
            <main className={`min-h-screen transition-[margin] duration-200 ease-out ${sidebarCollapsed && isLg ? 'lg:ml-20' : 'lg:ml-72'}`}>
                <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-10 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                    {children}
                </div>
            </main>

            {/* Account Deleted Modal */}
            <AnimatePresence>
                {isAccountDeleted && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/70 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="relative bg-[#FDFBF7] rounded-3xl w-full max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-br from-red-500 to-red-600 p-8 text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                                    className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
                                >
                                    <ShieldAlert className="w-8 h-8 text-white" />
                                </motion.div>
                                <h2 className="text-xl font-bold text-white">Akun Dihapus</h2>
                                <p className="text-white/70 text-xs mt-2 font-medium tracking-wide uppercase">Sesi Anda Berakhir</p>
                            </div>

                            {/* Body */}
                            <div className="p-8 space-y-6">
                                <div className="text-center space-y-3">
                                    <p className="text-[#4A3F35] font-medium text-sm leading-relaxed">
                                        Akun Anda telah <span className="font-bold text-red-500">dihapus oleh Admin</span>.
                                        Semua data terkait akun ini telah dihapus dari sistem.
                                    </p>
                                    <p className="text-[#8C7E6A] text-xs leading-relaxed">
                                        Silakan hubungi Admin untuk dibuatkan akun baru jika diperlukan.
                                    </p>
                                </div>

                                <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                                    <p className="text-red-600 text-[10px] font-bold uppercase tracking-widest text-center">
                                        Anda akan dialihkan ke halaman login
                                    </p>
                                </div>

                                <button
                                    onClick={handleAccountDeletedSignOut}
                                    disabled={isSigningOut}
                                    className="w-full bg-[#4A3F35] hover:bg-[#2D2824] text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSigningOut ? (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                            Mengalihkan...
                                        </>
                                    ) : (
                                        <>
                                            <LogOut className="w-4 h-4" />
                                            Kembali ke Login
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

