'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { useRouter } from 'next/navigation';
import { Booking } from '@/types';
import { cancelBooking, deleteBooking } from '@/services/dataService';
import { usePlayerBookings } from '@/hooks/useData';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { Toast } from '@/components/Toast';

export default function BookingsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [page, setPage] = useState(1);
    const LIMIT = 20;
    
    const { bookings, totalCount, isLoading: isLoadingBookings, mutate } = usePlayerBookings(user?.id, page, LIMIT);
    
    const [bookingToCancel, setBookingToCancel] = useState<string[] | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const totalPages = Math.ceil(totalCount / LIMIT);

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

    const getGroupedBookings = (bookings: Booking[]) => {
        const singleGroups: { [key: string]: Booking[] } = {};
        const recurringGroups: { [key: string]: Booking[] } = {};

        bookings.forEach(b => {
            if (b.notes === 'Reserva Recurrente') {
                 // Group by Weekday + Time + Venue + Court
                const date = new Date(b.date + 'T12:00:00');
                const dayOfWeek = date.getDay();
                
                const key = `recurring-${b.venue_id}-${b.court_id}-${dayOfWeek}-${b.start_time}-${b.end_time}-${b.status}`;
                if (!recurringGroups[key]) recurringGroups[key] = [];
                recurringGroups[key].push(b);
            } else {
                const key = `${b.venue_id}-${b.court_id}-${b.date}-${b.status}-${b.player_id}`;
                if (!singleGroups[key]) singleGroups[key] = [];
                singleGroups[key].push(b);
            }
        });

        // Process Single Groups
        const processedSingle = Object.values(singleGroups).map(group => {
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
                venueAddress: first.venue_address,
                venueContact: first.venue_contact_info,
                venueLatitude: first.venue_latitude,
                venueLongitude: first.venue_longitude,
                courtName: first.court_name,
                courtType: first.court_type,
                status: first.status,
                date: first.date,
                startDate: first.date, // For sorting
                startTime: first.start_time,
                endTime: endTime,
                price: sorted.reduce((sum, b) => sum + b.price, 0),
                count: sorted.length,
                timeRange: `${first.start_time.substring(0, 5)} - ${endTime}`,
                isRecurring: false,
                dayName: ''
            };
        });

        // Process Recurring Groups
        const processedRecurring = Object.values(recurringGroups).map(group => {
            const sorted = group.sort((a, b) => a.date.localeCompare(b.date));
            const first = sorted[0];
            const last = sorted[sorted.length - 1];
            
            const date = new Date(first.date + 'T12:00:00');
            const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const dayName = days[date.getDay()];

            return {
                id: group.map(b => b.id),
                venueId: first.venue_id,
                courtId: first.court_id,
                venueName: first.venue_name,
                venueAddress: first.venue_address,
                venueContact: first.venue_contact_info,
                venueLatitude: first.venue_latitude,
                venueLongitude: first.venue_longitude,
                courtName: first.court_name,
                courtType: first.court_type,
                status: first.status,
                
                // Recurring specific display
                date: `Del ${first.date} al ${last.date}`,
                startDate: first.date, // For sorting
                startTime: first.start_time,
                endTime: first.end_time,
                
                timeRange: `${first.start_time.substring(0, 5)} - ${first.end_time.substring(0, 5)}`,
                price: group.reduce((sum, b) => sum + b.price, 0),
                count: group.length,
                isRecurring: true,
                dayName: dayName
            };
        });

        return [...processedSingle, ...processedRecurring].sort((a, b) => b.startDate.localeCompare(a.startDate));
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
                await mutate();
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

    if (isLoading || isLoadingBookings) {
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
                                    {group.isRecurring && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-700">
                                            Reserva Mensual
                                        </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        group.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                                        group.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {group.status === 'COMPLETED' ? 'Completada' : group.status === 'ACTIVE' ? 'Activa' : 'Cancelada'}
                                    </span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900">{group.venueName}</h4>
                                {group.venueAddress && (
                                    <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${group.venueLatitude && group.venueLongitude ? `${group.venueLatitude},${group.venueLongitude}` : encodeURIComponent(group.venueAddress)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-gray-500 hover:text-indigo-600 hover:underline block"
                                    >
                                        {group.venueAddress}
                                    </a>
                                )}
                                {((group.venueLatitude && group.venueLongitude) || group.venueAddress) && (
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${group.venueLatitude && group.venueLongitude ? `${group.venueLatitude},${group.venueLongitude}` : encodeURIComponent(group.venueAddress || '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-1"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        Ver ubicación
                                    </a>
                                )}
                                {group.venueContact && (
                                    <div className="flex items-center gap-1 mt-1">
                                         <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        <a href={`tel:${group.venueContact}`} className="text-xs text-gray-500 hover:text-indigo-600 hover:underline">
                                            {group.venueContact}
                                        </a>
                                    </div>
                                )}
                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-2 text-sm text-gray-500 font-medium">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        {group.isRecurring ? (
                                            <span>
                                                <span className="font-bold text-gray-700">{group.dayName}s</span> <span className="text-xs">({group.date})</span>
                                            </span>
                                        ) : (
                                            group.date
                                        )}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {group.timeRange}
                                        {group.count > 1 && (
                                            <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                                                {group.count} {group.isRecurring ? 'fechas' : 'turnos'}
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
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        Anterior
                    </button>
                    <span className="text-sm text-gray-600 font-medium">
                        Página {page} de {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        Siguiente
                    </button>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </main>
    );
}
