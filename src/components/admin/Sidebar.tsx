'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import {
    LogOut,
    X,
    LayoutDashboard,
    Palette,
    ShoppingCart,
    TrendingUp,
    Settings,
    Users,
    Cloud,
    Monitor,
    History,
    ClipboardList,
    Filter,
    Paintbrush,
    Menu,
    Images,
} from 'lucide-react';
import { useIsLgScreen } from '@/hooks/useIsLgScreen';
import { useAdminNavPrefetch } from '@/hooks/useAdminNavPrefetch';

interface SidebarProps {
    session: any;
    status: string;
    userProfile: any;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    pathname: string;
    handleSignOut: () => void;
    sidebarCollapsed?: boolean;
    setSidebarCollapsed?: (collapsed: boolean) => void;
}

export const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'ANALYTICS' },
    { href: '/admin/reports', icon: TrendingUp, label: 'Income Report', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'ANALYTICS' },
    { href: '/admin/track-record', icon: History, label: 'Track Record', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'ANALYTICS' },
    { href: '/admin/offline-reports', icon: ClipboardList, label: 'Session History', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'ANALYTICS' },
    { href: '/admin/themes', icon: Palette, label: 'Tema & Frame', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'STUDIO', permission: 'canManageThemes' },
    { href: '/admin/filters', icon: Filter, label: 'Filter Foto', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'STUDIO', permission: 'canManageFilters' },
    { href: '/admin/orders', icon: ShoppingCart, label: 'Print Orders', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'STUDIO' },
    { href: '/admin/kiosk', icon: Monitor, label: 'Kontrol Kiosk', roles: ['ADMIN', 'CLIENT'], category: 'SYSTEM' },
    { href: '/admin/settings', icon: Settings, label: 'Pengaturan', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'SYSTEM' },
    { href: '/admin/users', icon: Users, label: 'Kelola Akun', roles: ['ADMIN'], category: 'SYSTEM' },
    { href: '/admin/kiosk-themes', icon: Paintbrush, label: 'Kustomisasi Kiosk', roles: ['ADMIN'], category: 'SYSTEM' },
    { href: '/admin/oauth-setup', icon: Cloud, label: 'Cloud Backup', roles: ['ADMIN'], category: 'SYSTEM' },
    { href: '/admin/cloud-gallery', icon: Images, label: 'Galeri Cloud', roles: ['ADMIN'], category: 'SYSTEM' },
];

export default function Sidebar({
    session,
    status,
    userProfile,
    sidebarOpen,
    setSidebarOpen,
    pathname,
    handleSignOut,
    sidebarCollapsed = false,
    setSidebarCollapsed,
}: SidebarProps) {
    const isLg = useIsLgScreen();
    const { prefetchRoute, prefetchAllRoutes } = useAdminNavPrefetch();
    /** Collapse mode is desktop-only; mobile drawer always shows full labels. */
    const collapsed = sidebarCollapsed && isLg;

    useEffect(() => {
        prefetchAllRoutes();
    }, [prefetchAllRoutes]);

    const isActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin';
        return pathname.startsWith(href);
    };

    const userRole = userProfile?.role || (session?.user as any)?.role || 'KARYAWAN';
    const isPaymentEnabled = userProfile?.isPaymentEnabled !== undefined
        ? userProfile.isPaymentEnabled
        : (session?.user as any)?.isPaymentEnabled;

    const filteredNavItems = navItems.filter(item => {
        if (!item.roles.includes(userRole)) return false;

        if (userRole !== 'ADMIN' && (item as any).permission) {
            const hasPermission = userProfile?.[(item as any).permission] || (session?.user as any)?.[(item as any).permission];
            if (!hasPermission) return false;
        }

        if (userRole === 'CLIENT') {
            if (item.href === '/admin/reports' && !isPaymentEnabled) return false;
            if (item.href === '/admin/offline-reports' && isPaymentEnabled) return false;
        }
        return true;
    });

    return (
        <aside
            className={`fixed top-0 left-0 z-50 flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#1C1917] text-white shadow-[40px_0_80px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0
                ${collapsed ? 'w-[min(100vw-1rem,18rem)] lg:w-20' : 'w-[min(100vw-1rem,18rem)] lg:w-72'}
                pt-[env(safe-area-inset-top,0px)]
            `}
        >
            {/* Logo */}
            <div className="shrink-0 border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4 lg:p-6">
                <div className="flex items-center justify-between gap-2">
                    {!collapsed ? (
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[#A68B67]/30 bg-[#A68B67]/10 shadow-2xl">
                                    <img src="/logo/LOGO5.png" alt="Dove Logo" className="h-8 w-8 object-contain" />
                                </div>
                                <div className="min-w-0 flex flex-col">
                                    <h1 className="truncate font-sans text-sm italic tracking-wide text-[#FDFBF7] sm:text-base">
                                        Dove <span className="font-sans text-[10px] font-black not-italic uppercase tracking-[0.2em] text-[#A68B67]">Photobooth</span>
                                    </h1>
                                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-[#A68B67] opacity-70">part of Dovelens.ft</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSidebarCollapsed?.(true)}
                                className="hidden shrink-0 rounded-sm p-2 text-white/50 transition-colors hover:bg-white/5 hover:text-white lg:flex"
                                title="Collapse Sidebar"
                                aria-label="Collapse sidebar"
                            >
                                <Menu className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex w-full flex-col items-center gap-2">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[#A68B67]/30 bg-[#A68B67]/10 shadow-2xl">
                                <img src="/logo/LOGO5.png" alt="Dove Logo" className="h-8 w-8 object-contain" />
                            </div>
                            <button
                                type="button"
                                onClick={() => setSidebarCollapsed?.(false)}
                                className="flex items-center justify-center rounded-sm p-2 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                                title="Expand Sidebar"
                                aria-label="Expand sidebar"
                            >
                                <Menu className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        className="shrink-0 rounded-full border border-white/10 p-2.5 transition-colors hover:bg-white/5 lg:hidden"
                        aria-label="Tutup menu"
                    >
                        <X className="h-5 w-5 text-white/50" />
                    </button>
                </div>
            </div>

            {/* Profile */}
            <div className="shrink-0 flex justify-center bg-white/[0.02] px-3 py-3 sm:px-4 sm:py-4">
                <div className={`flex w-full items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#A68B67]/30 bg-[#A68B67]/20 font-sans text-lg italic text-[#A68B67]">
                        {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    {!collapsed && (
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-black uppercase tracking-widest">
                                {session?.user?.name || 'User Studio'}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 rounded-full ${status === 'authenticated' ? 'bg-green-500' : 'bg-red-500'}`} />
                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A68B67]">{userRole}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Nav scroll + sign out pinned — admin menu stays scrollable without hiding footer */}
            <div className="flex min-h-0 flex-1 flex-col">
                <nav
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3 lg:p-4"
                    aria-label="Menu admin"
                >
                    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                        {['ANALYTICS', 'STUDIO', 'SYSTEM'].map((category) => {
                            const items = filteredNavItems.filter(i => i.category === category);
                            if (items.length === 0) return null;

                            return (
                                <div key={category} className="space-y-0.5">
                                    {!collapsed ? (
                                        <p className="mb-1.5 px-3 text-[8px] font-black uppercase tracking-[0.4em] text-white/20 sm:px-4">
                                            {category === 'STUDIO' ? 'Studio Asset' : category}
                                        </p>
                                    ) : (
                                        <div className="mx-2 my-2 h-px bg-white/5" />
                                    )}
                                    {items.map((item) => {
                                        const Icon = item.icon;
                                        const active = isActive(item.href);
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                prefetch
                                                onMouseEnter={() => prefetchRoute(item.href)}
                                                onFocus={() => prefetchRoute(item.href)}
                                                onClick={() => setSidebarOpen(false)}
                                                title={collapsed ? item.label : undefined}
                                                className={`relative flex min-h-[44px] items-center rounded-sm transition-colors duration-150 group
                                                    ${collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5 sm:gap-4 sm:px-4'}
                                                    ${active ? 'bg-white/[0.05] text-white border-l-2 border-[#A68B67]' : 'text-white/40 hover:bg-white/[0.03] hover:text-white border-l-2 border-transparent'}
                                                `}
                                            >
                                                <Icon className={`relative z-10 h-5 w-5 shrink-0 transition-colors duration-150 sm:h-4 sm:w-4 ${active ? 'text-[#A68B67]' : 'group-hover:text-[#A68B67]'}`} />
                                                {!collapsed && (
                                                    <>
                                                        <span className={`relative z-10 text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-[0.15em] ${active ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>
                                                            {item.label}
                                                        </span>
                                                        {active && (
                                                            <div className="relative z-10 ml-auto h-1 w-1 rounded-full bg-[#A68B67]" />
                                                        )}
                                                    </>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </nav>

                <div
                    className={`shrink-0 border-t border-white/5 bg-[#1C1917] px-2 py-2 sm:px-3 lg:p-4 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]`}
                >
                    <button
                        type="button"
                        onClick={handleSignOut}
                        title={collapsed ? 'Sign Out Portal' : undefined}
                        className={`flex min-h-[44px] w-full items-center rounded-sm text-white/30 transition-all duration-200 group hover:bg-white/[0.03] hover:text-red-400
                            ${collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5 sm:gap-4 sm:px-4'}
                        `}
                    >
                        <LogOut className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-x-1 sm:h-4 sm:w-4" />
                        {!collapsed && (
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Sign Out Portal</span>
                        )}
                    </button>
                </div>
            </div>
        </aside>
    );
}
