'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { useRouter } from 'next/navigation';
import { getLocalDateString } from '@/utils/dateUtils';
import { Venue, Booking, DisabledSlot } from '@/types';
import { toggleSlotAvailability } from '@/services/dataService';
import { useOwnerVenues, useBookingsByDate, useDisabledSlots } from '@/hooks/useData';
import { ScheduleManager } from '@/components/ScheduleManager';
import { Toast } from '@/components/Toast';
import dynamic from 'next/dynamic';

// Lazy load modal
const RecurringBookingModal = dynamic(() => import('@/components/RecurringBookingModal').then(mod => ({ default: mod.RecurringBookingModal })), { ssr: false });

export default function SchedulePage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const { venues, isLoading: venuesLoading } = useOwnerVenues(user?.id);
    const [selectedVenueIndex, setSelectedVenueIndex] = useState(0);
    const selectedVenue = venues[selectedVenueIndex] || venues[0] || null;
    const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
    const { bookings, isLoading: bookingsLoading, mutate: mutateBookings } = useBookingsByDate(user?.id, selectedDate);
    const { disabledSlots, isLoading: slotsLoading, mutate: mutateSlots } = useDisabledSlots(selectedVenue?.id || null, selectedDate);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
            return;
        }
        if (!isLoading && user?.role !== 'OWNER') {
            router.push('/');
            return;
        }
    }, [user, isLoading, router]);

    const handleToggleSlot = async (courtId: string, date: string, timeSlot: string, reason?: string) => {
        if (!user || !selectedVenue) return;

        const success = await toggleSlotAvailability(selectedVenue.id, courtId, date, timeSlot, reason);

        if (success) {
            await mutateSlots();
        } else {
            setToast({ message: "Error al actualizar el horario.", type: 'error' });
        }
    };

    const handleRecurringSuccess = async (message: string) => {
        await mutateBookings();
        setToast({ message, type: 'success' });
    };

    if (isLoading || venuesLoading || bookingsLoading || (selectedVenue && slotsLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!user || user.role !== 'OWNER') return null;

    if (venues.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No tienes complejos</h3>
                    <button
                        onClick={() => router.push('/dashboard/venues')}
                        className="text-indigo-600 font-bold hover:underline"
                    >
                        Crear uno ahora
                    </button>
                </div>
            </div>
        );
    }

    return (
        <main className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900">Gestión de Horarios</h1>
                <div className="flex items-center gap-3">
                    {venues.length > 1 && (
                        <select
                            value={selectedVenueIndex}
                            onChange={(e) => setSelectedVenueIndex(Number(e.target.value))}
                            className="px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm cursor-pointer transition text-sm"
                        >
                            {venues.map((v, i) => (
                                <option key={v.id} value={i}>
                                    {v.name} — {v.courts.map(c => c.type).filter((t, idx, arr) => arr.indexOf(t) === idx).join(', ')}
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={() => setIsRecurringModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition text-sm"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Reserva Mensual/Fija
                    </button>
                </div>
            </div>

            <ScheduleManager
                venue={selectedVenue!}
                bookings={bookings}
                disabledSlots={disabledSlots}
                onToggleSlot={handleToggleSlot}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
            />

            <RecurringBookingModal
                isOpen={isRecurringModalOpen}
                onClose={() => setIsRecurringModalOpen(false)}
                venueId={selectedVenue!.id}
                courts={selectedVenue!.courts}
                onSuccess={handleRecurringSuccess}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </main>
    );
}
