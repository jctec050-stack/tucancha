'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationCenter } from '@/components/NotificationCenter';
import { Notification } from '@/types';

export const Navbar = () => {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [showNotifications, setShowNotifications] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]); // TODO: Implement Notification Context

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
            // Force reload as fallback
            window.location.href = '/login';
        }
    };

    if (!user) return null;

    // Define navigation items based on role
    let navItems: { label: string; href: string }[] = [];
    
    if (user.role === 'ADMIN') {
        navItems = [
            { label: '👮 Panel Admin', href: '/admin/dashboard' },
        ];
    } else if (user.role === 'OWNER') {
        navItems = [
            { label: '📊 Dashboard', href: '/dashboard' },
            { label: '📅 Horarios', href: '/dashboard/schedule' },
            { label: '🏭 Mis Complejos', href: '/dashboard/venues' },
        ];
    } else {
        navItems = [
            { label: '🔍 Buscar Cancha', href: '/' },
            { label: '📅 Mis Reservas', href: '/bookings' },
        ];
    }

    return (
        <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
            <div className="px-3 md:px-8 py-2 md:py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Mobile Menu Button */}
                    <button 
                        className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>

                    {/* Logo */}
                    <Link href={user.role === 'OWNER' ? '/dashboard' : '/'} className="flex items-center gap-2 md:gap-3 cursor-pointer">
                        <img src="/logo.png" alt="TuCancha" className="w-8 h-8 md:w-12 md:h-12 object-contain" />
                        <span className="font-bold text-lg md:text-2xl text-gray-900 tracking-tight">TuCancha!</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                                        isActive
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 md:gap-4">
                    {/* Notifications Toggle */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 md:p-2.5 text-gray-500 hover:bg-gray-100 rounded-full transition relative touch-manipulation"
                        >
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            {notifications.length > 0 && (
                                <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white"></span>
                            )}
                        </button>
                        {showNotifications && (
                            <NotificationCenter
                                notifications={notifications}
                                onClose={() => setShowNotifications(false)}
                                onClear={() => setNotifications([])}
                            />
                        )}
                    </div>

                    {/* User Info */}
                    <div className="hidden md:flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
                        <div className="w-6 h-6 rounded-full bg-indigo-200 border border-indigo-300"></div>
                        <span className="text-sm font-medium text-gray-700">{user.name}</span>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition touch-manipulation"
                        title="Cerrar sesión"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="hidden md:inline">Salir</span>
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white">
                    <div className="p-4 space-y-2">
                         <div className="flex items-center gap-3 mb-4 px-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-200 border border-indigo-300"></div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                        </div>
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`block px-4 py-3 rounded-lg font-bold text-base transition-all ${
                                        isActive
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </nav>
    );
};
