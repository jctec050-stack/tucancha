'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/AuthContext';
import { useRouter } from 'next/navigation';
import { Venue, Court } from '@/types';
import { createBooking, notifyOwnerOfBookingBatch } from '@/services/dataService';
import { TIME_SLOTS } from '@/constants';
import { CourtCard } from '@/components/CourtCard';
import { Toast } from '@/components/Toast';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { useVenues, useBookings, useDisabledSlots } from '@/hooks/useData';

export default function HomePage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    // SWR Hooks
    const { venues, isLoading: venuesLoading } = useVenues();
    const { bookings, isLoading: bookingsLoading, mutate: mutateBookings } = useBookings();
    
    // State
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    
    // Disabled slots depend on selected venue and date
    const { disabledSlots, isLoading: slotsLoading } = useDisabledSlots(selectedVenue?.id || null, selectedDate);

    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const [selectedSlots, setSelectedSlots] = useState<{ courtId: string, time: string, price: number, courtName: string }[]>([]);
    const [selectedPlayerCourtId, setSelectedPlayerCourtId] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Combine loading states
    const isLoadingData = venuesLoading || bookingsLoading || (selectedVenue ? slotsLoading : false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (!authLoading && user?.role === 'OWNER') {
            router.push('/dashboard');
            return;
        }
    }, [user, authLoading, router]);

    // Geolocation
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => console.warn('Geolocation error:', error),
                { timeout: 10000, maximumAge: 300000 }
            );
        }
    }, []);

    const isClosedDay = useMemo(() => {
        if (!selectedVenue || !selectedVenue.closed_days || selectedVenue.closed_days.length === 0) return false;
        // Parse date reliably for day of week
        const [year, month, day] = selectedDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        return selectedVenue.closed_days.includes(dateObj.getDay());
    }, [selectedVenue, selectedDate]);

    const sortedVenues = useMemo(() => {
        if (!userLocation || venues.length === 0) return venues;
        const { calculateDistance } = require('@/lib/geocoding'); // Dynamic import if possible or just use if available

        const venuesWithCoords = venues.filter(v => v.latitude && v.longitude);
        const venuesWithoutCoords = venues.filter(v => !v.latitude || !v.longitude);

        const sorted = venuesWithCoords.sort((a, b) => {
            const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude!, a.longitude!);
            const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude!, b.longitude!);
            return distA - distB;
        });

        return [...sorted, ...venuesWithoutCoords];
    }, [venues, userLocation]);

    const handleSlotSelect = (venue: Venue, court: Court, time: string) => {
        const isBooked = bookings.some(b =>
            b.venue_id === venue.id &&
            b.court_id === court.id &&
            b.date === selectedDate &&
            b.start_time === time &&
            b.status === 'ACTIVE'
        );

        const isDisabled = disabledSlots.some(s =>
            s.venue_id === venue.id &&
            s.court_id === court.id &&
            s.time_slot === time
        );

        if (isBooked || isDisabled) return;

        const isSelected = selectedSlots.some(s => s.courtId === court.id && s.time === time);

        if (isSelected) {
            setSelectedSlots(prev => prev.filter(s => !(s.courtId === court.id && s.time === time)));
        } else {
            setSelectedSlots(prev => [...prev, {
                courtId: court.id,
                time,
                price: court.price_per_hour,
                courtName: court.name
            }]);
        }
    };

    const handleConfirmBooking = () => {
        setShowConfirmModal(true);
    };

    const executeBooking = async () => {
        if (!user || selectedSlots.length === 0 || !selectedVenue) return;

        let successCount = 0;
        let failCount = 0;
        let lastError = '';
        const successfulBookings: any[] = [];

        for (const slot of selectedSlots) {
            const result = await createBooking({
                venue_id: selectedVenue.id,
                court_id: slot.courtId,
                player_id: user.id,
                date: selectedDate,
                start_time: slot.time,
                end_time: `${(parseInt(slot.time.split(':')[0]) + 1).toString().padStart(2, '0')}:00`,
                price: slot.price,
                status: 'ACTIVE',
                payment_status: 'PENDING'
            }, false); // Don't notify yet
            
            if (result.success && result.data) {
                successCount++;
                successfulBookings.push(result.data);
            } else {
                failCount++;
                if (result.error === 'HORARIO_OCUPADO') {
                    lastError = 'Uno o más horarios seleccionados ya fueron reservados por otro usuario.';
                } else {
                    lastError = 'Ocurrió un error al procesar la reserva.';
                }
            }
        }

        if (successCount > 0 || failCount > 0) {
            await mutateBookings(); // Refetch bookings to update availability
        }

        if (successCount > 0) {
            // Send batch notification
            // Group by Court to be safe, though usually same court.
            // But if user selected multiple courts, we should probably group by court or send multiple notifications.
            // For simplicity and typical use case (single court multiple hours), let's group by court.
            
            const bookingsByCourt: { [key: string]: any[] } = {};
            successfulBookings.forEach(b => {
                if (!bookingsByCourt[b.court_id]) bookingsByCourt[b.court_id] = [];
                bookingsByCourt[b.court_id].push(b);
            });

            for (const courtId in bookingsByCourt) {
                await notifyOwnerOfBookingBatch(selectedVenue.id, selectedDate, bookingsByCourt[courtId]);
            }

            setToast({ message: `¡${successCount} reserva(s) confirmada(s)!`, type: 'success' });
            setSelectedSlots([]);
        }

        if (failCount > 0) {
            setToast({ message: lastError || `Error al procesar ${failCount} reserva(s).`, type: 'error' });
        }
        setShowConfirmModal(false);
    };

    if (authLoading || (isLoadingData && venues.length === 0)) { // Show loading only if no data yet (SWR stale-while-revalidate)
         return (
             <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-20 h-20">
                        <img src="/logo.png" alt="TuCancha" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin opacity-50"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) return null; // Will redirect

    return (
        <main className="max-w-7xl mx-auto px-4 py-8 pb-32">
            {!selectedVenue ? (
                // View 1: Venue List
                <div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900">Busca tu Cancha</h2>
                            <p className="text-gray-500 mt-1">Explora complejos de padel y beach tennis cerca de ti.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedVenues.map((v) => (
                            <div key={v.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition group cursor-pointer" onClick={() => setSelectedVenue(v)}>
                                <div className="relative h-48">
                                    {v.image_url ? (
                                        <img src={v.image_url} alt={v.name} className="w-full h-full object-contain bg-gray-50 p-4 group-hover:scale-105 transition duration-500" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                                            <svg className="w-16 h-16 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    )}
                                    {userLocation && v.latitude && v.longitude && (() => {
                                         const { calculateDistance } = require('@/lib/geocoding');
                                         const distance = calculateDistance(userLocation.lat, userLocation.lng, v.latitude, v.longitude);
                                         return (
                                             <div className="absolute top-4 left-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                                 📍 {distance.toFixed(1)} km
                                             </div>
                                         );
                                     })()}
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-indigo-600 uppercase tracking-wider shadow-sm">
                                        Abierto: {v.opening_hours}
                                    </div>
                                </div>
                                <div className="p-4 md:p-6">
                                    <h3 className="text-lg font-bold text-gray-900">{v.name}</h3>
                                    <div className="flex items-start justify-between gap-2 mt-1 mb-4">
                                        <p className="text-gray-500 text-xs line-clamp-2">{v.address}</p>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${v.latitude && v.longitude ? `${v.latitude},${v.longitude}` : encodeURIComponent(v.address)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-indigo-600 hover:text-indigo-800 shrink-0 bg-indigo-50 p-2 rounded-lg hover:bg-indigo-100 transition active:scale-95 touch-manipulation"
                                            title="Ver en mapa"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-2 mb-6 flex-wrap">
                                        {Array.from(new Set(v.courts.map(c => c.type))).map(type => (
                                            <span key={type} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase tracking-tighter">
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                    <button className="w-full py-3 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-600 hover:text-white transition active:scale-95 touch-manipulation">
                                        Ver Disponibilidad
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // View 2: Venue Details & Booking
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => {
                            setSelectedVenue(null);
                            setSelectedPlayerCourtId(null);
                            setSelectedSlots([]);
                        }}
                        className="mb-6 flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Volver al listado
                    </button>
                    
                    <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100">
                        {/* Header Image */}
                        <div className="h-64 relative bg-gray-50">
                            {selectedVenue.image_url ? (
                                <img src={selectedVenue.image_url} alt={selectedVenue.name} className="w-full h-full object-contain p-4" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                                    <svg className="w-20 h-20 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                            <div className="absolute bottom-6 left-8 text-white">
                                <h2 className="text-4xl font-extrabold">{selectedVenue.name}</h2>
                                <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${selectedVenue.latitude && selectedVenue.longitude ? `${selectedVenue.latitude},${selectedVenue.longitude}` : encodeURIComponent(selectedVenue.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="opacity-80 font-medium hover:opacity-100 hover:underline block"
                                >
                                    {selectedVenue.address}
                                </a>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${selectedVenue.latitude && selectedVenue.longitude ? `${selectedVenue.latitude},${selectedVenue.longitude}` : encodeURIComponent(selectedVenue.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg text-white mt-2 transition backdrop-blur-sm"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    Ver en Google Maps
                                </a>
                                {selectedVenue.contact_info && (
                                    <a
                                        href={`tel:${selectedVenue.contact_info}`}
                                        className="inline-flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg text-white mt-2 ml-2 transition backdrop-blur-sm"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        {selectedVenue.contact_info}
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="p-8">
                            {/* Date Picker & Info */}
                            <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-8 border-b border-gray-100 gap-6 md:gap-4">
                                <div className="text-center md:text-left w-full md:w-auto">
                                    <div className="flex items-center justify-between md:justify-start gap-2 mb-1">
                                        <p className="text-xs font-bold text-gray-400 uppercase">Fecha Seleccionada</p>
                                        <button 
                                            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                                            className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded hover:bg-indigo-100 transition"
                                        >
                                            HOY
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-center md:justify-start gap-4 bg-gray-50 md:bg-transparent p-2 md:p-0 rounded-xl">
                                         <button
                                            onClick={() => {
                                                const d = new Date(selectedDate);
                                                d.setDate(d.getDate() - 1);
                                                setSelectedDate(d.toISOString().split('T')[0]);
                                            }}
                                            className="p-3 hover:bg-white md:hover:bg-gray-100 rounded-lg text-gray-500 transition shadow-sm md:shadow-none"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                        </button>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={selectedDate}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                                className="text-xl font-bold text-indigo-600 bg-transparent outline-none cursor-pointer text-center md:text-left w-full"
                                            />
                                        </div>
                                         <button
                                            onClick={() => {
                                                const d = new Date(selectedDate);
                                                d.setDate(d.getDate() + 1);
                                                setSelectedDate(d.toISOString().split('T')[0]);
                                            }}
                                            className="p-3 hover:bg-white md:hover:bg-gray-100 rounded-lg text-gray-500 transition shadow-sm md:shadow-none"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-4 w-full md:w-auto">
                                    <div className="text-center bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100 w-full md:w-auto">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Apertura</p>
                                        <p className="text-xl font-bold text-gray-800">{selectedVenue.opening_hours.split(' - ')[0]}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Courts & Slots */}
                            {!selectedPlayerCourtId ? (
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-xl">
                                        Elegí tu Cancha
                                    </h4>
                                    {isClosedDay && (
                                        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6 rounded-r-xl">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm text-orange-700 font-bold">
                                                        El complejo está cerrado este día.
                                                    </p>
                                                    <p className="text-xs text-orange-600 mt-1">
                                                        Por favor selecciona otra fecha para realizar tu reserva.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {selectedVenue.courts.map(court => (
                                            <CourtCard
                                                key={court.id}
                                                court={court}
                                                isSelected={false}
                                                onSelect={() => !isClosedDay && setSelectedPlayerCourtId(court.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                selectedVenue.courts.filter(c => c.id === selectedPlayerCourtId).map(court => (
                                    <div key={court.id} className="animate-in fade-in slide-in-from-right-8 duration-300">
                                        <button
                                            onClick={() => setSelectedPlayerCourtId(null)}
                                            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-bold mb-6 transition"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                            </svg>
                                            Volver a selección de canchas
                                        </button>

                                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                                            <h4 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                                {court.name}
                                                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded ml-2">{court.type}</span>
                                            </h4>
                                            <span className="text-indigo-600 font-bold bg-indigo-50 px-4 py-2 rounded-xl">
                                                Gs. {court.price_per_hour.toLocaleString('es-PY')}/h
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3">
                                            {TIME_SLOTS.map(slot => {
                                                const isBooked = bookings.some(b =>
                                                    b.venue_id === selectedVenue.id &&
                                                    b.court_id === court.id &&
                                                    b.date === selectedDate &&
                                                    b.start_time === slot &&
                                                    b.status === 'ACTIVE'
                                                );

                                                const isDisabled = disabledSlots.some(s =>
                                                    s.venue_id === selectedVenue.id &&
                                                    s.court_id === court.id &&
                                                    s.time_slot === slot
                                                );

                                                const isUnavailable = isBooked || isDisabled;
                                                const isSelected = selectedSlots.some(s => s.courtId === court.id && s.time === slot);

                                                return (
                                                    <button
                                                        key={slot}
                                                        disabled={isUnavailable}
                                                        onClick={() => handleSlotSelect(selectedVenue, court, slot)}
                                                        className={`
                                                        py-3 rounded-xl font-bold text-xs md:text-sm transition-all active:scale-95 touch-manipulation
                                                        ${isUnavailable
                                                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200 line-through'
                                                                : isSelected
                                                                    ? 'bg-indigo-600 text-white shadow-lg scale-105 ring-2 ring-indigo-300'
                                                                    : 'bg-white border-2 border-indigo-100 text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50 shadow-sm'}
                                                    `}
                                                    >
                                                        {slot} - {parseInt(slot.split(':')[0]) + 1}:00
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Booking Footer */}
                    {selectedSlots.length > 0 && (
                        <div className="fixed bottom-4 md:bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in">
                            <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-4 md:px-8 py-3 md:py-4 flex flex-col sm:flex-row items-center gap-3 md:gap-8 md:min-w-[320px]">
                                <div className="text-center sm:text-left">
                                    <p className="text-gray-400 text-xs font-bold uppercase mb-0.5">Total a Pagar</p>
                                    <p className="text-lg md:text-xl font-extrabold text-white">
                                        Gs. {selectedSlots.reduce((acc, curr) => acc + curr.price, 0).toLocaleString('es-PY')}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {selectedSlots.length} turno(s)
                                    </p>
                                </div>
                                <button
                                    onClick={handleConfirmBooking}
                                    className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition transform hover:scale-105 active:scale-95 touch-manipulation"
                                >
                                    Confirmar Reserva
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <ConfirmationModal
                isOpen={showConfirmModal}
                title="Confirmar Reserva"
                message={`Estás a punto de reservar ${selectedSlots.length} turno(s) para el ${selectedDate}. \n\n⚠️ OBSERVACIÓN IMPORTANTE:\nSe puede cancelar la reserva hasta 3hs antes del horario reservado. Posterior a eso, se aplicará una multa en la próxima reserva.`}
                onConfirm={executeBooking}
                onCancel={() => setShowConfirmModal(false)}
                confirmText="Aceptar y Reservar"
                cancelText="Cancelar"
            />

             {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </main>
    );
}
