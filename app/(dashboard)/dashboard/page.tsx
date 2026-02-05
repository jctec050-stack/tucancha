'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { useRouter } from 'next/navigation';
import { Venue, Booking, DisabledSlot } from '@/types';
import { getDisabledSlots, getOwnerVenues } from '@/services/dataService'; // FIX: Imported getOwnerVenues
import { useOwnerBookings } from '@/hooks/useData';
import { OwnerDashboard } from '@/components/OwnerDashboard';
import { TermsModal } from '@/components/TermsModal';
import { Toaster, toast } from 'react-hot-toast';
import { ReactivationModal } from '@/components/ReactivationModal';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    // Manual fetching to avoid hook complexity if needed, but keeping hooks is fine if fixed.
    // Let's use local state for venues to simplify debugging if useOwnerVenues is acting up or missing
    const [venues, setVenues] = useState<Venue[]>([]);
    const [venuesLoading, setVenuesLoading] = useState(true);

    const { bookings, isLoading: bookingsLoading } = useOwnerBookings(user?.id);
    const [disabledSlots, setDisabledSlots] = useState<DisabledSlot[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Terms & Trial State
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showReactivationModal, setShowReactivationModal] = useState(false);
    const [checkingTerms, setCheckingTerms] = useState(true);
    const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
            return;
        }
        if (!isLoading && user?.role !== 'OWNER') {
            router.replace('/');
            return;
        }
    }, [user, isLoading, router]);

    // Check Terms Acceptance & Subscription Status
    useEffect(() => {
        const checkStatus = async () => {
            if (!user || user.role !== 'OWNER') return;

            try {
                // 1. Check if user accepted terms (using metadata or profile field)
                // For now, we'll check if they have a subscription created. 
                // If NO subscription exists for this owner, it means they haven't "started" properly or it's a new system.
                // We will create a FREE trial subscription upon acceptance.
                
                const { data: sub, error } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('owner_id', user.id)
                    .maybeSingle();

                if (!sub) {
                    // No subscription found -> Check if user is newly registered (e.g. within last minute) or simply hasn't accepted terms
                    // Logic: If no sub exists, it means they haven't accepted terms yet.
                    setShowTermsModal(true);
                } else if (sub.status === 'CANCELLED') {
                    // Subscription exists but is CANCELLED -> Show Reactivation Modal
                    setShowReactivationModal(true);
                } else {
                    // Subscription exists -> They have already accepted terms.
                    // Calculate Trial Status logic...
                    const startDate = new Date(sub.start_date);
                    const now = new Date();
                    // Assuming 30 days trial for everyone initially
                    const trialEndDate = new Date(startDate);
                    trialEndDate.setDate(trialEndDate.getDate() + 30);

                    if (now < trialEndDate) {
                        const diffTime = Math.abs(trialEndDate.getTime() - now.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                        setTrialDaysLeft(diffDays);
                        // Ensure modal is closed if they have a sub
                        setShowTermsModal(false);
                    } else {
                        setTrialDaysLeft(0); // Trial expired
                        setShowTermsModal(false);
                    }
                }
            } catch (err) {
                console.error('Error checking terms:', err);
            } finally {
                setCheckingTerms(false);
            }
        };

        if (user && !isLoading) {
            checkStatus();
        }
    }, [user, isLoading]);

    // Fetch Venues Manually to ensure stability
    useEffect(() => {
        const fetchVenues = async () => {
            if (user?.id) {
                setVenuesLoading(true);
                const data = await getOwnerVenues(user.id);
                setVenues(data);
                setVenuesLoading(false);
            }
        };
        if (user?.id) fetchVenues();
    }, [user?.id]);

    // Fetch Disabled Slots
    useEffect(() => {
        const fetchDisabledSlots = async () => {
            if (venues.length === 0) return;
            try {
                setLoadingSlots(true);
                const fetchedDisabledSlots = await getDisabledSlots(venues[0].id, selectedDate);
                setDisabledSlots(fetchedDisabledSlots);
            } catch (error) {
                console.error('Error fetching disabled slots:', error);
            } finally {
                setLoadingSlots(false);
            }
        };

        fetchDisabledSlots();
    }, [selectedDate, venues]);

    const handleAcceptTerms = async () => {
        if (!user) return;
        try {
            // Create a Trial Subscription
            const today = new Date().toISOString().split('T')[0];
            const { error } = await supabase.from('subscriptions').insert({
                owner_id: user.id,
                plan_type: 'FREE', // Trial is technically free plan initially
                status: 'ACTIVE',
                start_date: today,
                price_per_month: 0,
                max_venues: 1, // Default limits
                max_courts_per_venue: 5
            });

            if (error) throw error;

            setShowTermsModal(false);
            setTrialDaysLeft(30); // Set immediate feedback
            
            // Reload page to ensure everything syncs or just proceed
        } catch (error) {
            console.error('Error accepting terms:', error);
            toast.error('Ocurrió un error al procesar tu solicitud. Por favor intenta nuevamente.');
        }
    };

    const handleReactivateAccount = async () => {
        if (!user) return;
        try {
            // Reactivate Account
            // 1. Get current subscription ID
            const { data: sub } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('owner_id', user.id)
                .maybeSingle();

            if (!sub) return;

            // 2. Update Subscription to ACTIVE
            // IMPORTANT: We set start_date to 31 days ago to ensure Trial Logic calculates 0 days left
            // This effectively skips the trial period for reactivated accounts.
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 31);
            const pastDateStr = pastDate.toISOString().split('T')[0];

            const { error } = await supabase
                .from('subscriptions')
                .update({ 
                    status: 'ACTIVE',
                    start_date: pastDateStr, // Force trial expiration
                    plan_type: 'FREE', // Standard plan (commission based)
                })
                .eq('id', sub.id);

            if (error) throw error;

            setShowReactivationModal(false);
            setTrialDaysLeft(0); // Immediately reflect no trial
            toast.success('¡Cuenta reactivada exitosamente! Bienvenido de nuevo.', { duration: 4000 });
        } catch (error) {
            console.error('Error reactivating account:', error);
            toast.error('Error al reactivar la cuenta.');
        }
    };

    const handleRejectTerms = async () => {
        if (window.confirm('Si rechazas las condiciones, no podrás utilizar la plataforma para gestionar tu complejo. ¿Estás seguro que deseas salir?')) {
            await logout();
            router.push('/');
        }
    };

    if (isLoading || venuesLoading || bookingsLoading || checkingTerms) {
        return (
             <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!user || user.role !== 'OWNER') return null;

    return (
        <main className="max-w-7xl mx-auto px-4 py-8">
            <TermsModal 
                isOpen={showTermsModal} 
                onAccept={handleAcceptTerms} 
                onReject={handleRejectTerms} 
            />

            <ReactivationModal 
                isOpen={showReactivationModal}
                onReactivate={handleReactivateAccount}
                onLogout={handleRejectTerms}
            />
            <Toaster position="top-right" />

            {/* Trial Banner */}
            {trialDaysLeft !== null && trialDaysLeft > 0 && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg mb-8 flex items-center justify-between animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <p className="font-bold text-lg">¡Estás en tu periodo de prueba gratuito!</p>
                            <p className="text-green-100 text-sm">Disfruta de todas las funciones premium sin costo. Te quedan <span className="font-bold bg-white/20 px-2 py-0.5 rounded text-white">{trialDaysLeft} días</span>.</p>
                        </div>
                    </div>
                    <button onClick={() => router.push('/dashboard/billing')} className="bg-white text-green-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-50 transition shadow-sm">
                        Ver Detalles
                    </button>
                </div>
            )}
            
            {/* Expired Trial / Billing Info */}
            {trialDaysLeft === 0 && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 text-white shadow-lg mb-8 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <p className="font-bold text-lg">Plan Profesional Activo</p>
                            <p className="text-indigo-100 text-sm">Tu facturación se calcula en base a las reservas completadas.</p>
                        </div>
                    </div>
                     <button onClick={() => router.push('/dashboard/billing')} className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition shadow-sm">
                        Ver Facturación
                    </button>
                </div>
            )}

            {venues.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
                    <div className="inline-block p-4 bg-indigo-100 rounded-2xl text-indigo-600 mb-4">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No tienes complejos registrados</h3>
                    <p className="text-gray-500 mb-6">Debes crear un complejo primero para empezar a recibir reservas.</p>
                    <button
                        onClick={() => router.push('/dashboard/venues')}
                        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
                    >
                        Ir a Mis Complejos
                    </button>
                </div>
            ) : (
                <OwnerDashboard
                    bookings={bookings}
                    disabledSlots={disabledSlots}
                    venue={venues[0]} // Currently showing first venue, could add selector
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                />
            )}
        </main>
    );
}
