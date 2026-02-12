'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getLocalDateString } from '@/utils/dateUtils';
import { Venue, Booking, DisabledSlot } from '@/types';
import { getDisabledSlots, getOwnerVenues } from '@/services/dataService'; // FIX: Imported getOwnerVenues
import { useBookingsByDate, useMonthlyBookings, useBookingsForChart } from '@/hooks/useData';

// ✅ CODE SPLITTING: Cargar OwnerDashboard solo cuando sea necesario
const OwnerDashboard = dynamic(
    () => import('@/components/OwnerDashboard').then(mod => ({ default: mod.OwnerDashboard })),
    {
        loading: () => (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        ),
        ssr: false, // Dashboard no necesita SSR
    }
);

// Lazy load modals
const TermsModal = dynamic(() => import('@/components/TermsModal').then(mod => ({ default: mod.TermsModal })), { ssr: false });
const ReactivationModal = dynamic(() => import('@/components/ReactivationModal').then(mod => ({ default: mod.ReactivationModal })), { ssr: false });

import { Toaster, toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { getBookings } from '@/services/dataService';

export default function DashboardPage() {
    const { user, isLoading, logout } = useAuth();
    // ... existing state ...

    // ... existing effects ...

    // Update the buttons area
    // ...

    // ...
    const router = useRouter();
    // Manual fetching to avoid hook complexity if needed, but keeping hooks is fine if fixed.
    // Let's use local state for venues to simplify debugging if useOwnerVenues is acting up or missing
    const [venues, setVenues] = useState<Venue[]>([]);
    const [venuesLoading, setVenuesLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());

    // Estado para el mes seleccionado en el historial
    const [selectedMonth, setSelectedMonth] = useState<string>(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    });

    const { bookings, isLoading: bookingsLoading } = useBookingsByDate(user?.id, selectedDate);
    const { bookings: monthlyBookings, isLoading: monthlyLoading } = useMonthlyBookings(user?.id, selectedMonth);
    const { bookings: chartBookings, isLoading: chartLoading } = useBookingsForChart(user?.id, selectedDate);
    const [disabledSlots, setDisabledSlots] = useState<DisabledSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Terms & Trial State
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showReactivationModal, setShowReactivationModal] = useState(false);
    const [showExpiredModal, setShowExpiredModal] = useState(false); // New blocking modal
    const [checkingTerms, setCheckingTerms] = useState(true);
    const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
    const [debtAmount, setDebtAmount] = useState(0); // State for Debt Amount

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
                    .order('created_at', { ascending: false }) // Get the latest subscription
                    .limit(1)
                    .maybeSingle();



                if (error) {
                    console.error('❌ Error checking subscription:', error);
                    // If network error, don't assume they are new. Don't show TermsModal.
                    // Just show a subtle toast or retry could be better, but blocking false-positive is priority.
                    return;
                }

                if (!sub) {
                    // No subscription found -> Check if user is newly registered (e.g. within last minute) or simply hasn't accepted terms
                    // Logic: If no sub exists, it means they haven't accepted terms yet.
                    setShowTermsModal(true);
                } else if (sub.status === 'CANCELLED') {
                    // Subscription exists but is CANCELLED -> Show Reactivation Modal
                    // Set trial days to 0 immediately so no banner is shown behind
                    setTrialDaysLeft(0);

                    // --- DEBT CALCULATION LOGIC ---
                    try {
                        const ownerVenues = await getOwnerVenues(user.id);
                        // Even if no venues now, if they had bookings, we should check debt.
                        // But usually bookings are tied to venues.
                        if (ownerVenues.length > 0 || true) { // Force check even without venues logic if needed
                            const now = new Date();
                            // Use sub.start_date day to find current/last billing cycle
                            const [sY, sM, sD] = sub.start_date.split('-').map(Number);
                            const subStart = new Date(sY, sM - 1, sD);
                            const sDay = subStart.getDate();

                            // Calculate "Previous Cycle" that was interrupted or unpaid
                            // Since it's cancelled, we look for unpaid bookings in the last relevant period.
                            // Simple heuristic: Look at the current month cycle.
                            let billingStart = new Date(now.getFullYear(), now.getMonth(), sDay);
                            if (now < billingStart) {
                                billingStart.setMonth(billingStart.getMonth() - 1);
                            }
                            const billingEnd = new Date(billingStart);
                            billingEnd.setMonth(billingEnd.getMonth() + 1);

                            // Fetch bookings for this period
                            // NOTE: We fetch ALL bookings in range and filter by derived status in memory.
                            // Because DB status might be 'ACTIVE' but time has passed.
                            const { data: rawBookings } = await getBookings({
                                ownerId: user.id,
                                startDate: getLocalDateString(billingStart),
                                endDate: getLocalDateString(billingEnd)
                            });

                            // Filter in memory using the derived status (which handles time-based completion)
                            const cycleBookings = rawBookings.filter(b => b.status === 'COMPLETED');

                            // Calculate commissionable start date (Trial Logic Check)
                            // If plan is PREMIUM, check if bookings were during a potential trial period.
                            // Assumption: Trial starts at 'created_at'. Duration: 30 days.
                            const [cY, cM, cD] = sub.created_at.split('T')[0].split('-').map(Number);
                            const subscriptionCreated = new Date(cY, cM - 1, cD);
                            const trialEndDate = new Date(subscriptionCreated);
                            trialEndDate.setDate(trialEndDate.getDate() + 30);

                            // Calculate debt
                            let totalCommission = 0;
                            cycleBookings.forEach(b => {
                                // Check if booking date is commissionable
                                // If booking date <= trialEndDate, it's FREE.
                                const [bY, bM, bD] = b.date.split('-').map(Number);
                                const bookingDate = new Date(bY, bM - 1, bD);

                                // Only charge if booking is AFTER trial period
                                if (bookingDate > trialEndDate) {
                                    if (b.start_time && b.end_time) {
                                        const [startH, startM] = b.start_time.split(':').map(Number);
                                        const [endH, endM] = b.end_time.split(':').map(Number);
                                        let duration = (endH + endM / 60) - (startH + startM / 60);
                                        if (duration <= 0) duration = 1;
                                        totalCommission += duration * 5000;
                                    } else {
                                        totalCommission += 5000;
                                    }
                                }
                            });

                            if (totalCommission > 0) {
                                setDebtAmount(Math.round(totalCommission));
                            }
                        }
                    } catch (e) {
                        console.error('Error calculating debt for reactivation:', e);
                    }
                    // -----------------------------

                    setShowReactivationModal(true);
                } else {
                    // Subscription exists -> They have already accepted terms.

                    const now = new Date();
                    const endDate = sub.end_date ? new Date(sub.end_date) : null;
                    const isExpiredDate = endDate && endDate < now;

                    if (sub.status === 'EXPIRED' || (sub.plan_type !== 'FREE' && isExpiredDate && sub.status !== 'CANCELLED')) {
                        setShowExpiredModal(true);
                        setTrialDaysLeft(0);
                    }

                    // Calculate Trial Status logic...
                    if (sub.plan_type === 'FREE') {
                        const startDate = new Date(sub.start_date);
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
                            // Trial expired -> Show Billing Banner
                            // Check for Auto-Upgrade here too
                            if (sub.status !== 'CANCELLED') {
                                console.log('Trial expired in Dashboard. Auto-upgrading...');
                                const { error: upgradeError } = await supabase
                                    .from('subscriptions')
                                    .update({ plan_type: 'PREMIUM', status: 'ACTIVE' })
                                    .eq('id', sub.id);

                                if (!upgradeError) {
                                    // Notify user gently
                                    toast('Tu periodo de prueba ha finalizado. Ahora estás en el Plan Premium.', {
                                        icon: '✨',
                                        duration: 5000
                                    });
                                    sub.plan_type = 'PREMIUM';
                                }
                            }

                            setTrialDaysLeft(0);
                            setShowTermsModal(false);
                        }
                    } else {
                        // If not FREE (e.g. PREMIUM), no trial logic
                        setTrialDaysLeft(0);
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
        fetchDisabledSlots();
    }, [selectedDate, venues]);



    const handleAcceptTerms = async () => {
        if (!user) return;
        try {
            // Create a Trial Subscription
            const today = getLocalDateString();
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

            // 2. Update Subscription to ACTIVE PREMIUM
            // IMPORTANT: If reactivating, they lose trial benefits and go straight to PREMIUM.
            // We set the start_date to NOW so the billing cycle starts fresh today.
            const today = new Date();
            const todayStr = getLocalDateString(today);

            // Calculate end date (30 days from now) for billing cycle reference
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + 30);
            const endDateStr = getLocalDateString(endDate);

            const { error } = await supabase
                .from('subscriptions')
                .update({
                    status: 'ACTIVE',
                    plan_type: 'PREMIUM', // Force PREMIUM plan immediately
                    start_date: todayStr, // New billing cycle starts today
                    end_date: endDateStr, // Set clear expiration/renewal date
                    price_per_month: 0, // It's commission based, but plan is PREMIUM
                })
                .eq('id', sub.id);

            if (error) throw error;

            setShowReactivationModal(false);
            setTrialDaysLeft(0); // Immediately reflect no trial
            toast.success('¡Cuenta reactivada en Plan Premium! Ya puedes gestionar tus reservas.', { duration: 5000 });

            // Force a reload to ensure all states (including Admin view if they switch tabs) are synced
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('Error reactivating account:', error);
            toast.error('Error al reactivar la cuenta.');
        }
    };

    const handleRejectTerms = async () => {
        // Use a custom modal or toast instead of window.confirm if you want full consistency, 
        // but window.confirm is the only native alert left here.
        // Let's make it slightly nicer using a non-blocking approach if desired, 
        // but for a critical "Exit" action, native confirm is sometimes safer.
        // However, to match your request for NO native alerts:

        // We can't easily await a custom modal result here without more state.
        // For now, let's assume if they clicked the button they want to logout, 
        // or trigger a toast.

        // BETTER APPROACH: Just logout immediately with a toast message.
        toast('Cerrando sesión...', { icon: '👋' });
        await logout();
        router.push('/');
    };

    if (isLoading || venuesLoading || bookingsLoading || monthlyLoading || chartLoading || checkingTerms) {
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
                userEmail={user?.email}
            />

            <ReactivationModal
                isOpen={showReactivationModal}
                onReactivate={handleReactivateAccount}
                onLogout={handleRejectTerms}
                debtAmount={debtAmount}
            />

            {/* Expired/Blocking Modal */}
            {showExpiredModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Suscripción Vencida</h2>
                        <p className="text-gray-600 mb-6">
                            Tu plan ha vencido o hay un pago pendiente. Para continuar gestionando tu complejo, por favor regulariza tu situación.
                        </p>
                        <button
                            onClick={() => router.push('/dashboard/billing')}
                            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition"
                        >
                            Ir a Facturación
                        </button>
                    </div>
                </div>
            )}
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
                <>
                    <OwnerDashboard
                        bookings={bookings}
                        monthlyBookings={monthlyBookings}
                        chartBookings={chartBookings}
                        disabledSlots={disabledSlots}
                        venue={venues[0]} // Currently showing first venue, could add selector
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                        selectedMonth={selectedMonth}
                        onMonthChange={setSelectedMonth}
                    />
                </>
            )}
        </main>
    );
}
