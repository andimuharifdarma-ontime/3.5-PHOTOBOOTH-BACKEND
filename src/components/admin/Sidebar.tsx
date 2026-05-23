'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Camera,
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
    Banknote,
    ClipboardList,
    Filter,
    Paintbrush,
    Menu
} from 'lucide-react';

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
    // ANALYTICS
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'ANALYTICS' },
    { href: '/admin/reports', icon: TrendingUp, label: 'Income Report', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'ANALYTICS' },
    { href: '/admin/track-record', icon: History, label: 'Track Record', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'ANALYTICS' },
    { href: '/admin/offline-reports', icon: ClipboardList, label: 'Session History', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'ANALYTICS' },

    // MANAGEMENT
    { href: '/admin/themes', icon: Palette, label: 'Tema & Frame', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'STUDIO', permission: 'canManageThemes' },
    { href: '/admin/filters', icon: Filter, label: 'Filter Foto', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'STUDIO', permission: 'canManageFilters' },
    { href: '/admin/orders', icon: ShoppingCart, label: 'Print Orders', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'STUDIO' },

    // SYSTEM
    { href: '/admin/kiosk', icon: Monitor, label: 'Kontrol Kiosk', roles: ['ADMIN', 'CLIENT'], category: 'SYSTEM' },
    { href: '/admin/settings', icon: Settings, label: 'Pengaturan', roles: ['ADMIN', 'KARYAWAN', 'CLIENT'], category: 'SYSTEM' },
    { href: '/admin/users', icon: Users, label: 'Kelola Akun', roles: ['ADMIN'], category: 'SYSTEM' },
    { href: '/admin/kiosk-themes', icon: Paintbrush, label: 'Kustomisasi Kiosk', roles: ['ADMIN'], category: 'SYSTEM' },
    { href: '/admin/oauth-setup', icon: Cloud, label: 'Cloud Backup', roles: ['ADMIN'], category: 'SYSTEM' },
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
    setSidebarCollapsed
}: SidebarProps) {

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

        // Special permission checks for KARYAWAN and CLIENT
        if (userRole !== 'ADMIN' && (item as any).permission) {
            const hasPermission = userProfile?.[(item as any).permission] || (session?.user as any)?.[(item as any).permission];
            if (!hasPermission) return false;
        }

        if (userRole === 'CLIENT') {
            // "Income Report" is only for payment-enabled stores
            if (item.href === '/admin/reports' && !isPaymentEnabled) return false;
            
            // "Session History" is only for non-payment/offline tracking
            if (item.href === '/admin/offline-reports' && isPaymentEnabled) return false;
            
            // Note: Track Record is now intentionally universal for all clients
        }
        return true;
    });

    return (
        <aside
            className={`fixed top-0 left-0 h-full bg-[#1C1917] text-white z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 shadow-[40px_0_80px_rgba(0,0,0,0.1)] 
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                ${sidebarCollapsed ? 'w-72 lg:w-20' : 'w-72'}
            `}
        >
            {/* Logo Section */}
            <div className="p-8 border-b border-white/5">
                <div className="flex items-center justify-between">
                    {!sidebarCollapsed ? (
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0 overflow-hidden bg-[#A68B67]/10 border border-[#A68B67]/30 shadow-2xl">
                                    <img src="/logo/LOGO5.png" alt="Dove Logo" className="w-8 h-8 object-contain" />
                                </div>
                                <div className="flex flex-col whitespace-nowrap">
                                    <h1 className="text-base font-serif italic tracking-wide text-[#FDFBF7]">Dove <span className="font-sans not-italic font-black text-[#A68B67] uppercase text-[10px] tracking-[0.2em]">Photobooth</span></h1>
                                    <p className="text-[7px] text-[#A68B67] font-black tracking-[0.2em] uppercase opacity-70">part of Dovelens.ft</p>
                                </div>
                            </div>
                            
                            {/* Toggle Button for Desktop */}
                            <button
                                onClick={() => setSidebarCollapsed?.(true)}
                                className="hidden lg:flex p-1.5 rounded-sm hover:bg-white/5 transition-colors text-white/50 hover:text-white"
                                title="Collapse Sidebar"
                            >
                                <Menu className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 w-full">
                            {/* Brand Logo */}
                            <div className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0 overflow-hidden bg-[#A68B67]/10 border border-[#A68B67]/30 shadow-2xl">
                                <img src="/logo/LOGO5.png" alt="Dove Logo" className="w-8 h-8 object-contain" />
                            </div>
                            
                            {/* Hamburger Menu Toggle Button Below Logo */}
                            <button
                                onClick={() => setSidebarCollapsed?.(false)}
                                className="p-1.5 rounded-sm hover:bg-white/5 transition-colors text-white/50 hover:text-white flex items-center justify-center"
                                title="Expand Sidebar"
                            >
                                <Menu className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-2 rounded-full hover:bg-white/5 transition-colors border border-white/10"
                    >
                        <X className="w-4 h-4 text-white/50" />
                    </button>
                </div>
            </div>

            {/* Profile Section */}
            <div className="px-4 py-6 bg-white/[0.02] flex justify-center">
                <div className="flex items-center gap-4 w-full justify-center">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-[#A68B67]/20 border border-[#A68B67]/30 flex items-center justify-center text-[#A68B67] font-serif italic text-lg">
                        {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    {!sidebarCollapsed && (
                        <div className="flex-1 min-w-0 transition-opacity duration-300">
                            <p className="text-[11px] font-black uppercase tracking-widest truncate">{session?.user?.name || 'User Studio'}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${status === 'authenticated' ? 'bg-green-500' : 'bg-red-500'}`} />
                                <p className="text-[9px] font-bold text-[#A68B67] uppercase tracking-[0.2em]">{userRole}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="p-2 lg:p-4 space-y-8 mt-4 overflow-y-auto max-h-[calc(100vh-250px)] scrollbar-hide">
                {['ANALYTICS', 'STUDIO', 'SYSTEM'].map((category) => {
                    const items = filteredNavItems.filter(i => i.category === category);
                    if (items.length === 0) return null;

                    return (
                        <div key={category} className="space-y-2">
                            {!sidebarCollapsed ? (
                                <p className="px-5 text-[8px] font-black text-white/20 uppercase tracking-[0.4em] mb-4">
                                    {category === 'STUDIO' ? 'Studio Asset' : category}
                                </p>
                            ) : (
                                <div className="h-px bg-white/5 my-4 mx-2" />
                            )}
                            {items.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                    <div key={item.href} className="px-1 lg:px-2">
                                        <Link
                                            href={item.href}
                                            target={item.href === '/' ? '_blank' : undefined}
                                            onClick={() => setSidebarOpen(false)}
                                            title={sidebarCollapsed ? item.label : undefined}
                                            className={`relative flex items-center ${sidebarCollapsed ? 'justify-center py-3' : 'gap-4 px-4 py-3'} rounded-sm transition-all duration-200 group ${active
                                                ? 'text-white'
                                                : 'text-white/40 hover:text-white hover:bg-white/[0.03]'
                                                }`}
                                        >
                                            {active && (
                                                <motion.div
                                                    layoutId="activeTab"
                                                    className="absolute inset-0 bg-white/[0.05] border-l-2 border-[#A68B67] rounded-sm"
                                                    transition={{ type: "spring", stiffness: 400, damping: 40 }}
                                                />
                                            )}
                                            <Icon className={`w-4 h-4 transition-all duration-200 ${active ? 'text-[#A68B67] scale-110' : 'group-hover:text-[#A68B67]'}`} />
                                            {!sidebarCollapsed && (
                                                <span className={`text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${active ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>{item.label}</span>
                                            )}
                                            {!sidebarCollapsed && active && (
                                                <div className="w-1 h-1 rounded-full bg-[#A68B67] ml-auto animate-pulse" />
                                            )}
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>

            {/* Bottom Section */}
            <div className={`absolute bottom-0 left-0 right-0 ${sidebarCollapsed ? 'p-4' : 'p-8'} border-t border-white/5 bg-black/20 flex justify-center transition-all duration-300`}>
                <button
                    onClick={handleSignOut}
                    title={sidebarCollapsed ? "Sign Out Portal" : undefined}
                    className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center py-3' : 'gap-4 px-4 py-3'} text-white/30 hover:text-red-400 group transition-all duration-200`}
                >
                    <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    {!sidebarCollapsed && (
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Sign Out Portal</span>
                    )}
                </button>
            </div>
        </aside>
    );
}
