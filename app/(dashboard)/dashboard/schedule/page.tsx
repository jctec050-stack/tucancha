'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { useRouter } from 'next/navigation';
import { getLocalDateString } from '@/utils/dateUtils';
import { Venue, Booking, DisabledSlot } from '@/types';
import { toggleSlotAvailability } from '@/services/dataService';
import { useOwnerVenues, useOwnerBookings, useDisabledSlots } from '@/hooks/useData';
import { ScheduleManager } from '@/components/ScheduleManager';
import { Toast } from '@/components/Toast';
import dynamic from 'next/dynamic';

// Lazy load modal
const RecurringBookingModal = dynamic(() => import('@/components/RecurringBookingModal').then(mod => ({ default: mod.RecurringBookingModal })), { ssr: false });

export default function SchedulePage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const { venues, isLoading: venuesLoading } = useOwnerVenues(user?.id);
    const { bookings, isLoading: bookingsLoading, mutate: mutateBookings } = useOwnerBookings(user?.id);
    const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
    const { disabledSlots, isLoading: slotsLoading, mutate: mutateSlots } = useDisabledSlots(venues[0]?.id || null, selectedDate);
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
        if (!user || !venues[0]) return;

        const success = await toggleSlotAvailability(venues[0].id, courtId, date, timeSlot, reason);

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

    if (isLoading || venuesLoading || bookingsLoading || (venues.length > 0 && slotsLoading)) {
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
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900">Gestión de Horarios</h1>
                <button
                    onClick={() => setIsRecurringModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition text-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Reserva Mensual/Fija
                </button>
            </div>

            <ScheduleManager
                venue={venues[0]}
                bookings={bookings}
                disabledSlots={disabledSlots}
                onToggleSlot={handleToggleSlot}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
            />

            <RecurringBookingModal
                isOpen={isRecurringModalOpen}
                onClose={() => setIsRecurringModalOpen(false)}
                venueId={venues[0].id}
                courts={venues[0].courts}
                onSuccess={handleRecurringSuccess}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </main>
    );
}
