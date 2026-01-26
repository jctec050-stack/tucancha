'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/AuthContext';
import { useRouter } from 'next/navigation';
import { Booking } from '@/types';
import { getBookings, cancelBooking, deleteBooking } from '@/services/dataService';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { Toast } from '@/components/Toast';

export default function BookingsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [bookingToCancel, setBookingToCancel] = useState<string[] | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
            return;
        }
        if (!isLoading && user?.role !== 'PLAYER') {
            router.push('/'); // Redirect owner to home or dashboard
            return;
        }
    }, [user, isLoading, router]);

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            setLoadingData(true);
            const fetchedBookings = await getBookings(); // Fetch all bookings for player (API should filter by RLS ideally, or we filter here)
            // The service `getBookings` without args fetches all?
            // Checking service: `getBookings(ownerId)`... if no ownerId, it fetches all?
            // RLS should handle "my bookings".
            // Let's assume `getBookings` returns what we need or we filter client side if needed (but RLS is better).
            // Actually MainApp used: `getBookings(user.role === 'OWNER' ? user.id : undefined)`
            // If undefined, it gets all bookings? That sounds insecure if RLS is off.
            // But we are in "Professional Refactor", I should fix this later in RLS step.
            // For now, let's use the same call.
            const allBookings = await getBookings(); 
            // Filter for current player just in case
            setBookings(allBookings.filter(b => b.player_id === user.id));
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoadingData(false);
        }
    }, [user]);

    useEffect(() => {
        if (user?.role === 'PLAYER') {
            fetchData();
        }
    }, [fetchData, user?.role]);

    const getGroupedBookings = (bookings: Booking[]) => {
        const groups: { [key: string]: Booking[] } = {};

        bookings.forEach(b => {
            const key = `${b.venue_id}-${b.court_id}-${b.date}-${b.status}-${b.player_id}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(b);
        });

        return Object.values(groups).map(group => {
            const sorted = group.sort((a, b) => a.start_time.localeCompare(b.start_time));
            const first = sorted[0];
            const last = sorted[sorted.length - 1];
            const lastHour = parseInt(last.start_time.split(':')[0]);
            const endTime = `${(lastHour + 1).toString().padStart(2, '0')}:00`;

            return {
                id: sorted.map(b => b.id),
                venueId: first.venue_id,
                courtId: first.court_id,
                venueName: first.venue_name,
                courtName: first.court_name,
                courtType: first.court_type,
                status: first.status,
                date: first.date,
                startTime: first.start_time,
                endTime: endTime,
                price: sorted.reduce((sum, b) => sum + b.price, 0),
                count: sorted.length,
                timeRange: `${first.start_time.substring(0, 5)} - ${endTime}`
            };
        }).sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime)); // Sort by date desc
    };

    const handleCancelClick = (bookingIds: string[]) => {
        setBookingToCancel(bookingIds);
    };

    const confirmCancel = async () => {
        if (!bookingToCancel) return;

        try {
            const promises = bookingToCancel.map(async (id) => {
                const booking = bookings.find(b => b.id === id);
                if (!booking) return false;
                if (booking.status === 'CANCELLED') {
                    return await deleteBooking(id);
                } else {
                    return await cancelBooking(id);
                }
            });

            const results = await Promise.all(promises);
            const successCount = results.filter(r => r).length;

            if (successCount > 0) {
                await fetchData();
                setToast({ message: `${successCount} reserva(s) actualizadas.`, type: 'success' });
            } else {
                setToast({ message: 'Error al procesar la solicitud.', type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setToast({ message: 'Error inesperado.', type: 'error' });
        }
        setBookingToCancel(null);
    };

    if (isLoading || loadingData) {
        return (
             <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!user || user.role !== 'PLAYER') return null;

    const groupedBookings = getGroupedBookings(bookings);

    return (
        <main className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Mis Reservas</h1>
            
            <div className="space-y-4">
                {groupedBookings.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400">
                        No tienes reservas registradas.
                        <div className="mt-4">
                             <button
                                onClick={() => router.push('/')}
                                className="text-indigo-600 font-bold hover:underline"
                            >
                                Buscar Canchas
                            </button>
                        </div>
                    </div>
                ) : (
                    groupedBookings.map(group => (
                        <div key={group.id[0]} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{group.courtName}</p>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        group.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                                        group.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {group.status === 'COMPLETED' ? 'Completada' : group.status === 'ACTIVE' ? 'Activa' : 'Cancelada'}
                                    </span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900">{group.venueName}</h4>
                                <div className="flex gap-4 mt-1 text-sm text-gray-500 font-medium">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        {group.date}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {group.timeRange}
                                        {group.count > 1 && (
                                            <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                                                {group.count} turnos
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <span className="text-lg font-bold text-gray-900">Gs. {group.price.toLocaleString('es-PY')}</span>
                                {group.status === 'ACTIVE' && (
                                    <button
                                        onClick={() => handleCancelClick(group.id)}
                                        className="flex-1 md:flex-none px-6 py-2 border border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 transition"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ConfirmationModal
                isOpen={!!bookingToCancel}
                title="Cancelar Reserva"
                message={`¿Estás seguro de que quieres cancelar ${bookingToCancel && bookingToCancel.length > 1 ? 'estas reservas' : 'esta reserva'}?`}
                confirmText="Sí, Cancelar"
                cancelText="Mantenerme Reservado"
                isDangerous={true}
                onConfirm={confirmCancel}
                onCancel={() => setBookingToCancel(null)}
            />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </main>
    );
}
