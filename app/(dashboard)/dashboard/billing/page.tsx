'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getOwnerVenues, getBookings } from '@/services/dataService';
import { Venue, Subscription } from '@/types';

interface BillingSummary {
    cycleStart: Date;
    cycleEnd: Date;
    totalBookings: number;
    totalCommission: number;
    subscriptionStatus: string;
    subscriptionPlan: string;
    trialDaysLeft?: number;
}

export default function BillingPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);

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

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                setLoading(true);

                // 1. Fetch Subscription
                const { data: sub } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('owner_id', user.id)
                    .maybeSingle();
                
                setSubscription(sub as Subscription);

                // 2. Fetch Venues
                const ownerVenues = await getOwnerVenues(user.id);
                setVenues(ownerVenues);

                // 3. Calculate Billing Cycle
                const now = new Date();
                let billingStart = new Date(now.getFullYear(), now.getMonth(), 1); // Default
                let trialDays = 0;

                if (sub) {
                    const subStart = new Date(sub.start_date);
                    
                    if (sub.status === 'TRIAL' || (sub.plan_type === 'FREE' && sub.price_per_month === 0)) { // Assuming 'FREE' implies trial logic for now based on previous implementation
                         // Trial Logic
                         const trialEndDate = new Date(subStart);
                         trialEndDate.setDate(trialEndDate.getDate() + 30);
                         
                         if (now < trialEndDate) {
                             const diffTime = Math.abs(trialEndDate.getTime() - now.getTime());
                             trialDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                         }
                    }

                    // Cycle logic based on start_date day
                    const sDay = subStart.getDate();
                    const candidateStart = new Date(now.getFullYear(), now.getMonth(), sDay);
                    if (now < candidateStart) {
                        candidateStart.setMonth(candidateStart.getMonth() - 1);
                    }
                    billingStart = candidateStart;
                } else if (ownerVenues.length > 0) {
                     // Fallback to first venue creation
                     const createdDate = new Date(ownerVenues[0].created_at);
                     const sDay = createdDate.getDate();
                     const candidateStart = new Date(now.getFullYear(), now.getMonth(), sDay);
                     if (now < candidateStart) {
                        candidateStart.setMonth(candidateStart.getMonth() - 1);
                    }
                    billingStart = candidateStart;
                }

                const billingEnd = new Date(billingStart);
                billingEnd.setMonth(billingEnd.getMonth() + 1);

                // 4. Fetch Bookings & Calculate Commission
                const allBookings = await getBookings(user.id);
                
                const cycleBookings = allBookings.filter(b => {
                    const bDate = new Date(b.date);
                    // Filter by date range AND status COMPLETED
                    // Note: In real app, ensure 'status' is strictly checked. 
                    // Here we use the derived status logic if available or raw status
                    return bDate >= billingStart && bDate < billingEnd && b.status === 'COMPLETED';
                });

                let totalCommission = 0;
                // Commission logic: 5.000 Gs per hour
                cycleBookings.forEach(b => {
                    if (b.start_time && b.end_time) {
                        const [startH, startM] = b.start_time.split(':').map(Number);
                        const [endH, endM] = b.end_time.split(':').map(Number);
                        let duration = (endH + endM / 60) - (startH + startM / 60);
                        if (duration <= 0) duration = 1;
                        totalCommission += duration * 5000;
                    } else {
                        totalCommission += 5000;
                    }
                });

                // If in trial, commission is 0
                if (trialDays > 0) {
                    totalCommission = 0;
                }

                setBillingSummary({
                    cycleStart: billingStart,
                    cycleEnd: billingEnd,
                    totalBookings: cycleBookings.length,
                    totalCommission: Math.round(totalCommission),
                    subscriptionStatus: sub?.status || 'INACTIVE',
                    subscriptionPlan: sub?.plan_type || 'NONE',
                    trialDaysLeft: trialDays
                });

            } catch (error) {
                console.error('Error fetching billing data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    if (isLoading || loading || !billingSummary) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <main className="max-w-5xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Facturación y Suscripción</h1>
            <p className="text-gray-500 mb-8">Administra tu plan y revisa tus costos mensuales.</p>

            {/* Status Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 relative overflow-hidden">
                {billingSummary.trialDaysLeft && billingSummary.trialDaysLeft > 0 ? (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                        PRUEBA GRATUITA
                    </div>
                ) : (
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                        PLAN ACTIVO
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Estado de la cuenta</p>
                        <p className="text-xl font-bold text-gray-900">
                            {billingSummary.trialDaysLeft && billingSummary.trialDaysLeft > 0 
                                ? `Prueba Gratis (${billingSummary.trialDaysLeft} días restantes)`
                                : 'Plan Profesional'
                            }
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {subscription?.status === 'ACTIVE' ? 'Suscripción activa' : 'Estado desconocido'}
                        </p>
                    </div>
                    
                    <div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Ciclo de Facturación</p>
                        <p className="text-xl font-bold text-gray-900">
                            {billingSummary.cycleStart.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' })} - {billingSummary.cycleEnd.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Corte mensual</p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Total a Pagar (Mes Actual)</p>
                        <p className="text-3xl font-extrabold text-indigo-600">
                            Gs. {billingSummary.totalCommission.toLocaleString('es-PY')}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {billingSummary.totalBookings} reservas completadas
                        </p>
                    </div>
                </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Details */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                        Detalle del Mes
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-gray-50">
                            <div>
                                <p className="text-sm font-medium text-gray-700">Comisión por Reserva</p>
                                <p className="text-xs text-gray-400">Tarifa fija por hora</p>
                            </div>
                            <p className="text-sm font-bold text-gray-900">Gs. 5.000</p>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-50">
                            <div>
                                <p className="text-sm font-medium text-gray-700">Reservas vía App</p>
                                <p className="text-xs text-gray-400">Completadas en este ciclo</p>
                            </div>
                            <p className="text-sm font-bold text-gray-900">{billingSummary.totalBookings}</p>
                        </div>
                        {billingSummary.trialDaysLeft && billingSummary.trialDaysLeft > 0 && (
                             <div className="flex justify-between items-center py-3 border-b border-gray-50 bg-green-50 px-2 rounded-lg -mx-2">
                                <div>
                                    <p className="text-sm font-bold text-green-700">Descuento Prueba Gratis</p>
                                </div>
                                <p className="text-sm font-bold text-green-700">-100%</p>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-4">
                            <p className="text-base font-bold text-gray-900">Total Estimado</p>
                            <p className="text-xl font-extrabold text-indigo-600">Gs. {billingSummary.totalCommission.toLocaleString('es-PY')}</p>
                        </div>
                    </div>
                </div>

                {/* Payment History (Mock for now, could be real if payments table populated) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 opacity-70 relative">
                     {/* Overlay for "Coming Soon" or empty state if no history */}
                     {/* For now, let's just show it as empty or static example */}
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Historial de Pagos
                    </h3>
                    
                    <div className="text-center py-8">
                        <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <p className="text-gray-500 text-sm">Aún no se han generado facturas.</p>
                        <p className="text-xs text-gray-400 mt-1">Tus facturas cerradas aparecerán aquí.</p>
                    </div>
                </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-bold text-red-600 mb-2">Zona de Peligro</h3>
                <p className="text-gray-500 text-sm mb-4">Si cancelas tu suscripción, perderás el acceso a la gestión de reservas de inmediato.</p>
                <button 
                    onClick={async () => {
                        if (confirm('¿Estás seguro de que deseas cancelar tu suscripción? Perderás el acceso inmediato y si decides volver, ya no tendrás días de prueba gratuitos.')) {
                            setLoading(true);
                            try {
                                const { error } = await supabase
                                    .from('subscriptions')
                                    .update({ status: 'CANCELLED' })
                                    .eq('id', subscription?.id);
                                
                                if (error) throw error;
                                
                                alert('Suscripción cancelada correctamente.');
                                router.push('/dashboard'); // Will likely trigger reactivation modal or logout logic
                            } catch (err) {
                                console.error(err);
                                alert('Error al cancelar.');
                            } finally {
                                setLoading(false);
                            }
                        }
                    }}
                    className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition"
                >
                    Cancelar Suscripción
                </button>
            </div>
        </main>
    );
}