'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Venue, Booking, Notification, Court } from '@/types';
import { TIME_SLOTS } from '@/constants';
import { NotificationCenter } from '@/components/NotificationCenter';
import { OwnerDashboard } from '@/components/OwnerDashboard';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { AddCourtModal } from '@/components/AddCourtModal';
import { useAuth } from '@/AuthContext';
import { getVenues, createVenueWithCourts, getBookings, createBooking } from '@/services/dataService';

const MainApp: React.FC = () => {
    const { user, login, register, logout, isLoading } = useAuth();

    const [venues, setVenues] = useState<Venue[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [authView, setAuthView] = useState<'login' | 'register'>('login');
    const [showAddCourtModal, setShowAddCourtModal] = useState(false);

    // Initialize date
    useEffect(() => {
        setSelectedDate(new Date().toISOString().split('T')[0]);
    }, []);

    // Fetch Data (Venues & Bookings)
    const fetchData = useCallback(async () => {
        if (!user) return;

        // Load Venues
        const fetchedVenues = await getVenues();
        setVenues(fetchedVenues);

        // Load Bookings (optimize: filter by date or venue later)
        const fetchedBookings = await getBookings();
        setBookings(fetchedBookings);
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


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

    const handleBooking = async (venue: Venue, courtId: string, time: string) => {
        const court = venue.courts.find(c => c.id === courtId);
        if (!court || !user) return;

        // Check if slot is taken (Optimistic check, DB will implement constraints ideally or we verify again)
        const isTaken = bookings.some(b =>
            b.venueId === venue.id &&
            b.courtId === courtId &&
            b.date === selectedDate &&
            b.startTime === time &&
            b.status === 'ACTIVE'
        );

        if (isTaken) {
            alert("Este horario ya está reservado.");
            return;
        }

        const success = await createBooking({
            venueId: venue.id,
            courtId,
            date: selectedDate,
            startTime: time,
            endTime: time, // Assume 1 hour
            price: court.pricePerHour,
            status: 'ACTIVE'
        });

        if (success) {
            // Refresh data
            await fetchData();

            // Notifications (Local only for now, could be DB trigger)
            addNotification('PLAYER', 'Reserva Confirmada', `Has reservado ${court.name} en ${venue.name} para el ${selectedDate} a las ${time}.`);
            addNotification('OWNER', 'Nueva Reserva Recibida', `${user.name} ha reservado ${court.name} para el ${selectedDate} a las ${time}.`);

            alert("¡Reserva realizada con éxito!");
        } else {
            alert("Error al realizar la reserva. Intenta de nuevo.");
        }
    };

    const handleCancel = (bookingId: string) => {
        // TODO: Implement cancelBooking in dataService (update status to CANCELLED)
        alert("Funcionalidad de cancelar pendiente de migración a DB.");
    };

    const handleSaveVenue = async (
        venueName: string,
        venueAddress: string,
        openingHours: string,
        imageUrl: string,
        amenities: string[],
        contactInfo: string,
        newCourts: Omit<Court, 'id'>[]
    ) => {
        if (!user) return;

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
            alert('¡Cambios guardados exitosamente!');
        } else {
            alert("Error al guardar el complejo.");
        }
    };

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
        );
    }

    const userNotifications = notifications.filter(n => n.userId === user.role);

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedVenue(null)}>
                    <div className="bg-indigo-600 p-2 rounded-lg text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </div>
                    <span className="font-bold text-xl text-gray-900 tracking-tight">PadelPro</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition relative"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
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
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
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
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {venues.map(v => (
                                <div key={v.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition group cursor-pointer" onClick={() => setSelectedVenue(v)}>
                                    <div className="relative h-48">
                                        <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-indigo-600 uppercase tracking-wider">
                                            Abierto: {v.openingHours}
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-xl font-bold text-gray-900">{v.name}</h3>
                                        <p className="text-gray-500 text-sm mt-1 mb-4 flex items-center gap-1">
                                            <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                            {v.address}
                                        </p>
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
                            ))}
                        </div>

                        {/* Current Bookings for Player */}
                        <div className="mt-12">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Mis Reservas Actuales</h3>
                            <div className="space-y-4">
                                {bookings.filter(b => b.status === 'ACTIVE').length === 0 ? (
                                    <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400">
                                        Aún no tienes reservas programadas
                                    </div>
                                ) : (
                                    bookings.filter(b => b.status === 'ACTIVE').map(b => (
                                        <div key={b.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{b.courtName}</p>
                                                <h4 className="text-lg font-bold text-gray-900">{b.venueName}</h4>
                                                <div className="flex gap-4 mt-1 text-sm text-gray-500 font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        {b.date}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        {b.startTime} - 1h
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 w-full md:w-auto">
                                                <span className="text-lg font-bold text-gray-900">${b.price}</span>
                                                <button
                                                    onClick={() => handleCancel(b.id)}
                                                    className="flex-1 md:flex-none px-6 py-2 border border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 transition"
                                                >
                                                    Cancelar
                                                </button>
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
                                <img src={selectedVenue.imageUrl} alt={selectedVenue.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                                <div className="absolute bottom-6 left-8 text-white">
                                    <h2 className="text-4xl font-extrabold">{selectedVenue.name}</h2>
                                    <p className="opacity-80 font-medium">{selectedVenue.address}</p>
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

                                                    return (
                                                        <button
                                                            key={slot}
                                                            disabled={isBooked}
                                                            onClick={() => handleBooking(selectedVenue, court.id, slot)}
                                                            className={`
                                py-3 rounded-xl font-bold text-sm transition-all
                                ${isBooked
                                                                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200 line-through'
                                                                    : 'bg-white border-2 border-indigo-100 text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50 shadow-sm active:scale-95'}
                              `}
                                                        >
                                                            {slot}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
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

                        {venues.length > 0 && <OwnerDashboard bookings={bookings} venue={venues[0]} />}

                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                                <h4 className="text-lg font-bold text-gray-900">Todas las Reservas</h4>
                                <div className="flex gap-2">
                                    <select className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none">
                                        <option>Hoy</option>
                                        <option>Últimos 7 días</option>
                                        <option>Este Mes</option>
                                    </select>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Jugador</th>
                                            <th className="px-6 py-4">Cancha</th>
                                            <th className="px-6 py-4">Fecha & Hora</th>
                                            <th className="px-6 py-4">Monto</th>
                                            <th className="px-6 py-4">Estado</th>
                                            <th className="px-6 py-4">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {bookings.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">No hay registros de reservas aún</td>
                                            </tr>
                                        ) : (
                                            bookings.map(b => (
                                                <tr key={b.id} className="hover:bg-gray-50/50 transition">
                                                    <td className="px-6 py-4 font-bold text-gray-700">{b.playerName}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-gray-600 font-medium">{b.courtName}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm">
                                                            <p className="font-bold text-gray-900">{b.date}</p>
                                                            <p className="text-gray-500">{b.startTime} - 1h</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-indigo-600">${b.price}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${b.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {b.status === 'ACTIVE' ? 'Activa' : 'Cancelada'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button className="text-gray-400 hover:text-indigo-600 transition">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
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
                    currentVenueName={venues[0]?.name || ''}
                    currentVenueAddress={venues[0]?.address || ''}
                    currentOpeningHours={venues[0]?.openingHours || '08:00 - 22:00'}
                    currentImageUrl={venues[0]?.imageUrl || ''}
                    currentAmenities={venues[0]?.amenities || []}
                    currentContactInfo={venues[0]?.contactInfo || ''}
                    onClose={() => setShowAddCourtModal(false)}
                    onSave={handleSaveVenue}
                />
            )}
        </div>
    );
};

export default MainApp;
