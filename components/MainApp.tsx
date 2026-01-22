'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Venue, Booking, Notification, Court, DisabledSlot } from '@/types';
import { TIME_SLOTS } from '@/constants';
import { NotificationCenter } from '@/components/NotificationCenter';
import { OwnerDashboard } from '@/components/OwnerDashboard';
import { ScheduleManager } from '@/components/ScheduleManager';
import { ManageVenues } from './ManageVenues';
import { Toast } from './Toast';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { AddCourtModal } from '@/components/AddCourtModal';
import SplashScreen from '@/components/SplashScreen';
import { ConfirmationModal } from './ConfirmationModal';
import { useAuth } from '@/AuthContext';
import { getVenues, createVenueWithCourts, updateVenue, getBookings, createBooking, getDisabledSlots, toggleSlotAvailability, cancelBooking, deleteBooking, addCourts, deleteCourt } from '@/services/dataService';

const MainApp: React.FC = () => {
    const { user, login, register, logout, isLoading } = useAuth();

    const [showSplash, setShowSplash] = useState(true);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [disabledSlots, setDisabledSlots] = useState<DisabledSlot[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [authView, setAuthView] = useState<'login' | 'register'>('login');
    const [showAddCourtModal, setShowAddCourtModal] = useState(false);
    const [ownerTab, setOwnerTab] = useState<'dashboard' | 'schedule' | 'venues'>('dashboard');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const [selectedSlots, setSelectedSlots] = useState<{ courtId: string, time: string, price: number, courtName: string }[]>([]);
    const [bookingToCancel, setBookingToCancel] = useState<string[] | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type });
    };

    const [venueToEdit, setVenueToEdit] = useState<Venue | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [locationPermission, setLocationPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');

    // Fetch Data (Venues & Bookings)
    const fetchData = useCallback(async () => {
        if (!user) return;

        // Load Venues
        const fetchedVenues = await getVenues();
        setVenues(fetchedVenues);

        // Load Bookings (optimize: filter by date or venue later)
        const fetchedBookings = await getBookings();
        setBookings(fetchedBookings);

        // Load Disabled Slots (for everyone, so players see blocked times)
        if (fetchedVenues.length > 0) {
            const fetchedSlots = await getDisabledSlots(fetchedVenues[0].id, selectedDate);
            setDisabledSlots(fetchedSlots);
        }
    }, [user, selectedDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Request user location for proximity sorting
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    setLocationPermission('granted');
                    console.log('✅ User location obtained:', position.coords);
                },
                (error) => {
                    console.warn('⚠️ Geolocation denied or unavailable:', error.message);
                    setLocationPermission('denied');
                },
                {
                    enableHighAccuracy: false, // Faster, less battery
                    timeout: 10000,
                    maximumAge: 300000 // Cache for 5 minutes
                }
            );
        } else {
            console.warn('⚠️ Geolocation not supported');
            setLocationPermission('denied');
        }
    }, []);

    // Sort venues by proximity to user location
    const sortedVenues = useMemo(() => {
        if (!userLocation || venues.length === 0) return venues;

        const { calculateDistance } = require('@/lib/geocoding');

        // Separate venues with and without coordinates
        const venuesWithCoords = venues.filter(v => v.latitude && v.longitude);
        const venuesWithoutCoords = venues.filter(v => !v.latitude || !v.longitude);

        // Sort venues with coordinates by distance
        const sorted = venuesWithCoords.sort((a, b) => {
            const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude!, a.longitude!);
            const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude!, b.longitude!);
            return distA - distB;
        });

        // Return sorted venues with coords first, then venues without coords
        return [...sorted, ...venuesWithoutCoords];
    }, [venues, userLocation]);


    // Logic to add notifications
    const addNotification = useCallback((userId: string, title: string, message: string) => {
        const newNotif: Notification = {
            id: Math.random().toString(36).substr(2, 9),
            userId,
            title,
            message,
            timestamp: Date.now(),
            read: false
        };
        setNotifications(prev => [newNotif, ...prev]);
    }, []);

    const formatTimeRange = (startTime: string) => {
        const start = startTime.substring(0, 5);
        const hour = parseInt(startTime.split(':')[0]);
        const end = `${(hour + 1).toString().padStart(2, '0')}:00`;
        return `${start} - ${end}`;
    };

    const handleSlotSelect = (venue: Venue, court: Court, time: string) => {
        // Check if slot is already booked (DB)
        const isBooked = bookings.some(b =>
            b.venueId === venue.id &&
            b.courtId === court.id &&
            b.date === selectedDate &&
            b.startTime === time &&
            b.status === 'ACTIVE'
        );

        const isDisabled = disabledSlots.some(s =>
            s.venueId === venue.id &&
            s.courtId === court.id &&
            s.timeSlot === time
        );

        if (isBooked || isDisabled) return;

        // Toggle selection
        const isSelected = selectedSlots.some(s => s.courtId === court.id && s.time === time);

        if (isSelected) {
            setSelectedSlots(prev => prev.filter(s => !(s.courtId === court.id && s.time === time)));
        } else {
            setSelectedSlots(prev => [...prev, {
                courtId: court.id,
                time,
                price: court.pricePerHour,
                courtName: court.name
            }]);
        }
    };

    const handleConfirmBooking = async () => {
        if (!user || selectedSlots.length === 0) return;

        let successCount = 0;
        let failCount = 0;

        for (const slot of selectedSlots) {
            const success = await createBooking({
                venueId: venues[0].id, // Limit to current venue context
                courtId: slot.courtId,
                date: selectedDate,
                startTime: slot.time,
                endTime: slot.time,
                price: slot.price,
                status: 'ACTIVE'
            });
            if (success) successCount++;
            else failCount++;
        }

        if (successCount > 0) {
            await fetchData();
            addNotification('OWNER', 'Nueva Reserva', `${user.name} ha realizado ${successCount} reserva(s).`);
            addNotification(user.role, 'Reserva Confirmada', `Has reservado ${successCount} turno(s) correctamente.`);
            showToast(`¡${successCount} reserva(s) confirmada(s)!`, 'success');
            setSelectedSlots([]); // Clear selection
        }

        if (failCount > 0) {
            showToast(`Error al procesar ${failCount} reserva(s).`, 'error');
        }
    };

    const getGroupedBookings = (bookings: Booking[]) => {
        // Do not filter by ACTIVE, allow all to show history
        const groups: { [key: string]: Booking[] } = {};

        bookings.forEach(b => {
            // Group by venue, court, date, status AND playerId (unique per user)
            const key = `${b.venueId}-${b.courtId}-${b.date}-${b.status}-${b.playerId}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(b);
        });

        return Object.values(groups).map(group => {
            // Sort by time
            const sorted = group.sort((a, b) => a.startTime.localeCompare(b.startTime));
            const first = sorted[0];
            const last = sorted[sorted.length - 1];

            // Calculate end time of the last slot (approximate +1h)
            const lastHour = parseInt(last.startTime.split(':')[0]);
            const endTime = `${(lastHour + 1).toString().padStart(2, '0')}:00`;

            return {
                id: sorted.map(b => b.id), // Array of IDs
                venueId: first.venueId,
                courtId: first.courtId,
                venueName: first.venueName,
                courtName: first.courtName,
                courtType: first.courtType,
                playerName: first.playerName,
                status: first.status, // Add status to group for display
                date: first.date,
                startTime: first.startTime,
                endTime: endTime, // Display range end
                price: sorted.reduce((sum, b) => sum + b.price, 0),
                count: sorted.length,
                timeRange: `${first.startTime.substring(0, 5)} - ${endTime}`
            };
        });
    };

    const handleCancelClick = (bookingIds: string[]) => {
        setBookingToCancel(bookingIds);
    };

    const confirmCancel = async () => {
        if (!bookingToCancel) return;

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
        const failCount = results.filter(r => !r).length;

        if (successCount > 0) {
            await fetchData();
            showToast(`${successCount} reserva(s) actualizadas.`, 'success');
        }

        if (failCount > 0) {
            showToast(`Error al procesar ${failCount} reserva(s). Revisa tu conexión.`, 'error');
        }
        setBookingToCancel(null);
    };

    const handleSaveVenue = async (
        venueName: string,
        venueAddress: string,
        openingHours: string,
        imageUrl: string,
        amenities: string[],
        contactInfo: string,
        newCourts: Omit<Court, 'id'>[],
        courtsToDelete: string[] = []
    ) => {
        if (!user) return;

        if (venueToEdit) {
            // Delete courts first if any
            if (courtsToDelete.length > 0) {
                console.log('🗑️ Attempting to delete courts:', courtsToDelete);
                const deletePromises = courtsToDelete.map(courtId => deleteCourt(courtId));
                const deleteResults = await Promise.all(deletePromises);
                console.log('🗑️ Delete results:', deleteResults);
                const failedDeletes = deleteResults.filter((r: boolean) => !r).length;

                if (failedDeletes > 0) {
                    console.error('❌ Failed to delete', failedDeletes, 'court(s)');
                    showToast(`Error al eliminar ${failedDeletes} cancha(s)`, 'error');
                    return;
                }
                console.log('✅ Successfully deleted', courtsToDelete.length, 'court(s)');
            }

            // Update existing venue
            const updates: Partial<Omit<Venue, 'id' | 'courts' | 'ownerId'>> = {
                name: venueName,
                address: venueAddress,
                openingHours: openingHours,
                imageUrl: imageUrl,
                amenities: amenities,
                contactInfo: contactInfo
            };

            const success = await updateVenue(venueToEdit.id, updates);

            if (success) {
                // If there are new courts added during edit, create them
                if (newCourts.length > 0) {
                    await addCourts(venueToEdit.id, newCourts);
                }
                await fetchData();
                const message = courtsToDelete.length > 0
                    ? `Complejo actualizado. ${courtsToDelete.length} cancha(s) eliminada(s).`
                    : 'Complejo actualizado correctamente';
                showToast(message, 'success');
                setVenueToEdit(null);
            } else {
                showToast('Error al actualizar el complejo', 'error');
            }
        } else {
            // Create New Venue
            const success = await createVenueWithCourts(
                {
                    ownerId: user.id,
                    name: venueName,
                    address: venueAddress,
                    imageUrl: imageUrl,
                    openingHours: openingHours,
                    amenities: amenities,
                    contactInfo: contactInfo
                },
                newCourts
            );

            if (success) {
                await fetchData();
                addNotification('OWNER', 'Configuración Guardada', 'Se han actualizado los datos del complejo.');
                showToast('¡Complejo creado exitosamente!', 'success');
            } else {
                showToast("Error al guardar el complejo.", 'error');
            }
        }
        setShowAddCourtModal(false);
    };

    const getCombinedHistory = (date: string) => {
        const dailyBookings = bookings.filter(b => b.date === date);
        const dailyDisabled = disabledSlots.filter(s => s.date === date);

        const groupedBookings = getGroupedBookings(dailyBookings);

        const disabledItems = dailyDisabled.map(ds => {
            const court = venues[0]?.courts.find(c => c.id === ds.courtId);
            const start = ds.timeSlot.substring(0, 5);
            const hour = parseInt(ds.timeSlot.split(':')[0]);
            const end = `${(hour + 1).toString().padStart(2, '0')}:00`;

            return {
                id: [ds.id],
                venueId: ds.venueId,
                courtId: ds.courtId,
                venueName: venues[0]?.name || '',
                courtName: court?.name || 'Cancha',
                courtType: court?.type,
                playerName: ds.reason ? `⛔ BLOQUEO: ${ds.reason}` : '⛔ BLOQUEO (Sin motivo)',
                status: 'DISABLED',
                date: ds.date,
                startTime: ds.timeSlot,
                endTime: end,
                price: 0,
                count: 1,
                timeRange: `${start} - ${end}`
            };
        });

        return [...groupedBookings, ...disabledItems].sort((a, b) => a.startTime.localeCompare(b.startTime));
    };

    const handleEditVenue = (venue: Venue) => {
        setVenueToEdit(venue);
        setShowAddCourtModal(true);
    };

    const handleToggleSlot = async (courtId: string, date: string, timeSlot: string, reason?: string) => {
        console.log('👆 Toggle Slot clicked:', { courtId, date, timeSlot });
        if (!user || !venues[0]) {
            console.error('❌ Missing user or venue[0]', { user, venue: venues[0] });
            return;
        }

        const success = await toggleSlotAvailability(venues[0].id, courtId, date, timeSlot, reason);

        if (success) {
            // Refresh disabled slots
            const fetchedSlots = await getDisabledSlots(venues[0].id, date);
            setDisabledSlots(fetchedSlots);
        } else {
            showToast("Error al actualizar el horario.", 'error');
        }
    };

    // Show splash screen
    if (showSplash) {
        return <SplashScreen onFinish={() => setShowSplash(false)} />;
    }

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                <div className="text-white text-xl">Cargando...</div>
            </div>
        );
    }

    // Show authentication screen if not logged in
    if (!user) {
        return (
            <>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
                    {authView === 'login' ? (
                        <LoginForm
                            onLogin={login}
                            onSwitchToRegister={() => setAuthView('register')}
                        />
                    ) : (
                        <RegisterForm
                            onRegister={register}
                            onSwitchToLogin={() => setAuthView('login')}
                        // Pass error if any
                        />
                    )}
                </div>
            </>
        );
    }

    const userNotifications = notifications.filter(n => n.userId === user.role);

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header - Mobile Optimized */}
            <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 px-3 md:px-8 py-2 md:py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => setSelectedVenue(null)}>
                    <img src="/logo.png" alt="TuCancha" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
                    <span className="font-bold text-lg md:text-2xl text-gray-900 tracking-tight">TuCancha!</span>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 md:p-2.5 text-gray-500 hover:bg-gray-100 rounded-full transition relative touch-manipulation"
                        >
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            {userNotifications.length > 0 && (
                                <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white"></span>
                            )}
                        </button>
                        {showNotifications && (
                            <NotificationCenter
                                notifications={userNotifications}
                                onClose={() => setShowNotifications(false)}
                                onClear={() => setNotifications(prev => prev.filter(n => n.userId !== user.role))}
                            />
                        )}
                    </div>
                    <div className="hidden md:flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
                        <div className="w-6 h-6 rounded-full bg-indigo-200 border border-indigo-300"></div>
                        <span className="text-sm font-medium text-gray-700">{user.name}</span>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition touch-manipulation"
                        title="Cerrar sesión"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="hidden md:inline">Salir</span>
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {user.role === 'PLAYER' && !selectedVenue && (
                    <div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                            <div>
                                <h2 className="text-3xl font-extrabold text-gray-900">Busca tu Cancha</h2>
                                <p className="text-gray-500 mt-1">Explora complejos de padel y beach tennis cerca de ti.</p>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-gray-200 shadow-sm">
                                <button
                                    onClick={() => {
                                        const d = new Date(selectedDate);
                                        d.setDate(d.getDate() - 1);
                                        setSelectedDate(d.toISOString().split('T')[0]);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-500"
                                >
                                    ←
                                </button>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="font-bold text-gray-700 border-none focus:ring-0 cursor-pointer bg-transparent text-sm"
                                />
                                <button
                                    onClick={() => {
                                        const d = new Date(selectedDate);
                                        d.setDate(d.getDate() + 1);
                                        setSelectedDate(d.toISOString().split('T')[0]);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-500"
                                >
                                    →
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sortedVenues.map((v, index) => {
                                return (
                                    <div key={v.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition group cursor-pointer" onClick={() => setSelectedVenue(v)}>
                                        <div className="relative h-48">
                                            {v.imageUrl ? (
                                                <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                                                    <svg className="w-16 h-16 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                            {/* Distance Badge */}
                                            {userLocation && v.latitude && v.longitude && (() => {
                                                const { calculateDistance } = require('@/lib/geocoding');
                                                const distance = calculateDistance(userLocation.lat, userLocation.lng, v.latitude, v.longitude);
                                                return (
                                                    <div className="absolute top-4 left-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                                        📍 {distance.toFixed(1)} km
                                                    </div>
                                                );
                                            })()}
                                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-indigo-600 uppercase tracking-wider">
                                                Abierto: {v.openingHours}
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <h3 className="text-xl font-bold text-gray-900">{v.name}</h3>
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-gray-500 hover:text-indigo-600 text-sm mt-1 mb-4 flex items-center gap-1 transition group w-fit"
                                            >
                                                <svg className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                                <span className="group-hover:underline">{v.address}</span>
                                                <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </a>
                                            <div className="flex items-center gap-2 mb-6">
                                                {Array.from(new Set(v.courts.map(c => c.type))).map(type => (
                                                    <span key={type} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase tracking-tighter">
                                                        {type}
                                                    </span>
                                                ))}
                                            </div>
                                            <button className="w-full py-3 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-600 hover:text-white transition">
                                                Ver Disponibilidad
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Current Bookings for Player */}
                        {/* Bookings for Player */}
                        <div className="mt-12">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Mis Reservas ({selectedDate})</h3>
                            <div className="space-y-4">
                                {bookings.filter(b => b.date === selectedDate && b.playerId === user?.id).length === 0 ? (
                                    <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400">
                                        No hay reservas para esta fecha
                                    </div>
                                ) : (
                                    getGroupedBookings(bookings.filter(b => b.date === selectedDate && b.playerId === user?.id)).map(group => (
                                        <div key={group.id[0]} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{group.courtName}</p>
                                                    {bookings.find(b => b.id === group.id[0])?.status !== 'ACTIVE' && (
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${bookings.find(b => b.id === group.id[0])?.status === 'COMPLETED'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {bookings.find(b => b.id === group.id[0])?.status === 'COMPLETED' ? 'Completada' : 'Cancelada'}
                                                        </span>
                                                    )}
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
                                                {bookings.find(b => b.id === group.id[0])?.status === 'ACTIVE' && (
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
                        </div>
                    </div>
                )}

                {user.role === 'PLAYER' && selectedVenue && (
                    <div className="max-w-4xl mx-auto">
                        <button
                            onClick={() => setSelectedVenue(null)}
                            className="mb-6 flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition font-medium"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Volver al listado
                        </button>
                        <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100">
                            <div className="h-64 relative">
                                {selectedVenue.imageUrl ? (
                                    <img src={selectedVenue.imageUrl} alt={selectedVenue.name} className="w-full h-full object-cover" />
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
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedVenue.address)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="opacity-80 font-medium hover:opacity-100 transition flex items-center gap-2 mt-1 group"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="group-hover:underline">{selectedVenue.address}</span>
                                        <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-8 border-b border-gray-100 gap-4">
                                    <div className="text-center md:text-left">
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Fecha Seleccionada</p>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="text-xl font-bold text-indigo-600 bg-transparent outline-none cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-center bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Canchas</p>
                                            <p className="text-lg font-bold text-gray-800">{selectedVenue.courts.length}</p>
                                        </div>
                                        <div className="text-center bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Apertura</p>
                                            <p className="text-lg font-bold text-gray-800">{selectedVenue.openingHours.split(' - ')[0]}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-100">
                                    <div>
                                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            Servicios
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedVenue.amenities && selectedVenue.amenities.length > 0 ? (
                                                selectedVenue.amenities.map(amenity => (
                                                    <span key={amenity} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                                                        {amenity}
                                                    </span>
                                                ))
                                            ) : (
                                                <p className="text-gray-400 text-sm">No especificado</p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                            Contacto
                                        </h4>
                                        <p className="text-gray-600 font-medium">
                                            {selectedVenue.contactInfo || 'No especificado'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-10">
                                    {selectedVenue.courts.map(court => (
                                        <div key={court.id} className="animate-in fade-in duration-500">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                                    <div className={`w-2 h-6 rounded-full ${court.type === 'Padel' ? 'bg-indigo-500' : 'bg-orange-400'}`}></div>
                                                    {court.name}
                                                    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded ml-2">{court.type}</span>
                                                </h4>
                                                <span className="text-indigo-600 font-bold">Gs. {court.pricePerHour.toLocaleString('es-PY')}/h</span>
                                            </div>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                                {TIME_SLOTS.map(slot => {
                                                    const isBooked = bookings.some(b =>
                                                        b.venueId === selectedVenue.id &&
                                                        b.courtId === court.id &&
                                                        b.date === selectedDate &&
                                                        b.startTime === slot &&
                                                        b.status === 'ACTIVE'
                                                    );

                                                    const isDisabled = disabledSlots.some(s =>
                                                        s.venueId === selectedVenue.id &&
                                                        s.courtId === court.id &&
                                                        s.timeSlot === slot
                                                    );

                                                    const isUnavailable = isBooked || isDisabled;

                                                    const isSelected = selectedSlots.some(s => s.courtId === court.id && s.time === slot);

                                                    return (
                                                        <button
                                                            key={slot}
                                                            disabled={isUnavailable}
                                                            onClick={() => handleSlotSelect(selectedVenue, court, slot)}
                                                            className={`
                                py-3 rounded-xl font-bold text-sm transition-all
                                ${isUnavailable
                                                                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200 line-through'
                                                                    : isSelected
                                                                        ? 'bg-indigo-600 text-white shadow-lg scale-105 ring-2 ring-indigo-300'
                                                                        : 'bg-white border-2 border-indigo-100 text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50 shadow-sm active:scale-95'}
                              `}
                                                        >
                                                            {slot} - {parseInt(slot.split(':')[0]) + 1}:00
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Floating Action Bar for Selections - Mobile Optimized */}
                        {selectedSlots.length > 0 && (
                            <div className="fixed bottom-4 md:bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in">
                                <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-4 md:px-8 py-3 md:py-4 flex flex-col sm:flex-row items-center gap-3 md:gap-8 md:min-w-[320px]">
                                    <div className="text-center sm:text-left">
                                        <p className="text-gray-400 text-xs font-bold uppercase mb-0.5">Total a Pagar</p>
                                        <p className="text-lg md:text-xl font-extrabold text-white">
                                            Gs. {selectedSlots.reduce((acc, curr) => acc + curr.price, 0).toLocaleString('es-PY')}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {selectedSlots.length} turno{selectedSlots.length > 1 ? 's' : ''} sel.
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

                {user.role === 'OWNER' && (
                    <div className="space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-extrabold text-gray-900">Panel de Control</h2>
                                <p className="text-gray-500">Bienvenido de nuevo{venues.length > 0 ? `, aquí tienes el resumen de ${venues[0].name}` : ''}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowAddCourtModal(true)}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    Agregar Cancha
                                </button>
                            </div>
                        </div>

                        {/* Tab Navigation - Mobile Optimized */}
                        <div className="flex gap-1 md:gap-2 border-b border-gray-200 overflow-x-auto">
                            <button
                                onClick={() => setOwnerTab('dashboard')}
                                className={`px-4 md:px-6 py-3 font-bold text-xs md:text-sm transition-all whitespace-nowrap touch-manipulation ${ownerTab === 'dashboard'
                                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                📊 Dashboard
                            </button>
                            <button
                                onClick={() => setOwnerTab('schedule')}
                                className={`px-4 md:px-6 py-3 font-bold text-xs md:text-sm transition-all whitespace-nowrap touch-manipulation ${ownerTab === 'schedule'
                                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                📅 <span className="hidden sm:inline">Gestión de </span>Horarios
                            </button>
                            <button
                                onClick={() => setOwnerTab('venues')}
                                className={`px-4 md:px-6 py-3 font-bold text-xs md:text-sm transition-all whitespace-nowrap touch-manipulation ${ownerTab === 'venues'
                                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                🏭 <span className="hidden sm:inline">Mis </span>Complejos
                            </button>
                        </div>

                        {/* Tab Content */}
                        {ownerTab === 'dashboard' && venues.length > 0 &&
                            <OwnerDashboard
                                bookings={bookings}
                                venue={venues[0]}
                                selectedDate={selectedDate}
                                onDateChange={setSelectedDate}
                            />
                        }

                        {ownerTab === 'schedule' && venues.length > 0 && (
                            <ScheduleManager
                                venue={venues[0]}
                                bookings={bookings}
                                disabledSlots={disabledSlots}
                                onToggleSlot={handleToggleSlot}
                                selectedDate={selectedDate}
                                onDateChange={setSelectedDate}
                            />
                        )}

                        {ownerTab === 'venues' && (
                            <ManageVenues
                                venues={venues}
                                onVenueDeleted={fetchData}
                                onEditVenue={handleEditVenue}
                            />
                        )}

                        {ownerTab === 'schedule' && venues.length === 0 && (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
                                <div className="inline-block p-4 bg-indigo-100 rounded-2xl text-indigo-600 mb-4">
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No tienes complejos registrados</h3>
                                <p className="text-gray-500 mb-6">Primero debes crear un complejo y agregar canchas para gestionar horarios</p>
                                <button
                                    onClick={() => setShowAddCourtModal(true)}
                                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    Crear Complejo
                                </button>
                            </div>
                        )}

                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 md:p-6 border-b border-gray-50 flex items-center justify-between">
                                <h4 className="text-base md:text-lg font-bold text-gray-900">Todas las Reservas ({selectedDate})</h4>
                            </div>
                            {/* Mobile-responsive table with horizontal scroll */}
                            <div className="overflow-x-auto -mx-px">
                                <table className="w-full text-left min-w-[640px]">
                                    <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                        <tr>
                                            <th className="px-4 md:px-6 py-4">Jugador</th>
                                            <th className="px-4 md:px-6 py-4">Cancha</th>
                                            <th className="px-4 md:px-6 py-4">Fecha & Hora</th>
                                            <th className="px-4 md:px-6 py-4">Monto</th>
                                            <th className="px-4 md:px-6 py-4">Estado</th>
                                            <th className="px-4 md:px-6 py-4">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {getCombinedHistory(selectedDate).length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">No hay registros de reservas ni bloqueos para esta fecha</td>
                                            </tr>
                                        ) : (
                                            getCombinedHistory(selectedDate).map(group => (
                                                <tr key={group.id[0]} className="hover:bg-gray-50/50 transition">
                                                    <td className="px-4 md:px-6 py-4 font-bold text-gray-700 text-sm">
                                                        {group.status === 'DISABLED' ? (
                                                            <span className="text-gray-500 italic">{group.playerName}</span>
                                                        ) : (
                                                            group.playerName
                                                        )}
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-gray-600 font-medium">{group.courtName}</span>
                                                            {group.courtType && (
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${group.courtType === 'Padel'
                                                                    ? 'bg-indigo-100 text-indigo-700'
                                                                    : 'bg-orange-100 text-orange-700'
                                                                    }`}>
                                                                    {group.courtType}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">
                                                        <div className="text-sm">
                                                            <p className="font-bold text-gray-900">{group.date}</p>
                                                            <p className="text-gray-500">{group.timeRange} {group.count > 1 ? `(${group.count} turnos)` : ''}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 font-bold text-indigo-600 text-sm">
                                                        {group.status === 'DISABLED' ? '-' : `$${group.price}`}
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${group.status === 'ACTIVE'
                                                            ? 'bg-green-100 text-green-700'
                                                            : group.status === 'COMPLETED'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : group.status === 'DISABLED'
                                                                    ? 'bg-gray-200 text-gray-600'
                                                                    : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {group.status === 'ACTIVE' ? 'Activa' : group.status === 'COMPLETED' ? 'Completada' : group.status === 'DISABLED' ? 'Bloqueado' : 'Cancelada'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">
                                                        <button
                                                            onClick={() => group.status === 'DISABLED' ? handleToggleSlot(group.courtId, group.date, group.startTime) : handleCancelClick(group.id)}
                                                            className="text-gray-400 hover:text-red-600 transition"
                                                            title={group.status === 'ACTIVE' ? "Cancelar Reserva" : group.status === 'DISABLED' ? "Habilitar Horario" : "Eliminar Reserva"}
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Add Court Modal */}
            {showAddCourtModal && (
                <AddCourtModal
                    currentVenueName={venueToEdit?.name || ''}
                    currentVenueAddress={venueToEdit?.address || ''}
                    currentOpeningHours={venueToEdit?.openingHours || '08:00 - 22:00'}
                    currentImageUrl={venueToEdit?.imageUrl || ''}
                    currentAmenities={venueToEdit?.amenities || []}
                    currentContactInfo={venueToEdit?.contactInfo || ''}
                    currentCourts={venueToEdit?.courts || []}
                    onClose={() => setShowAddCourtModal(false)}
                    onSave={handleSaveVenue}
                />
            )}

            {/* Cancel Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!bookingToCancel}
                title="Cancelar Reserva"
                message={`¿Estás seguro de que quieres cancelar ${bookingToCancel && bookingToCancel.length > 1 ? 'estas reservas' : 'esta reserva'}? Esta acción no se puede deshacer.`}
                confirmText="Sí, Cancelar"
                cancelText="Mantenerme Reservado"
                isDangerous={true}
                onConfirm={confirmCancel}
                onCancel={() => setBookingToCancel(null)}
            />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};
export default MainApp;
