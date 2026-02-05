'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { AdminVenueData, AdminProfileData, AdminSubscriptionData, AdminPaymentData, SubscriptionPlan, SubscriptionStatus, Subscription } from '@/types';
import { getAdminDashboardData, getAdminClientsData, getAdminSubscriptionsData, getAdminPaymentsData, updateSubscription, updateUserProfile, createPayment, createSubscription } from '@/services/dataService';

const AdminDashboard = () => {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    // Tab State
    const [activeTab, setActiveTab] = useState<'venues' | 'clients' | 'subscriptions' | 'payments'>('venues');

    // Data States
    const [venueData, setVenueData] = useState<AdminVenueData[]>([]);
    const [clientData, setClientData] = useState<AdminProfileData[]>([]);
    const [subscriptionData, setSubscriptionData] = useState<AdminSubscriptionData[]>([]);
    const [paymentData, setPaymentData] = useState<AdminPaymentData[]>([]);

    const [isLoading, setIsLoading] = useState(true);

    // Edit Subscription State
    const [isEditSubModalOpen, setIsEditSubModalOpen] = useState(false);
    const [editingSub, setEditingSub] = useState<AdminSubscriptionData | null>(null);
    const [subForm, setSubForm] = useState({
        plan: 'FREE',
        price: 0,
        endDate: '',
        status: 'ACTIVE'
    });

    // Edit RUC State
    const [editingRuc, setEditingRuc] = useState<string | null>(null); // userId being edited
    const [rucValue, setRucValue] = useState('');

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'ADMIN')) {
            router.push('/');
            return;
        }

        if (user?.role === 'ADMIN') {
            loadData();
        }
    }, [user, authLoading, router]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [venues, clients, subs, payments] = await Promise.all([
                getAdminDashboardData(),
                getAdminClientsData(),
                getAdminSubscriptionsData(),
                getAdminPaymentsData()
            ]);

            setVenueData(venues);
            setClientData(clients);
            setSubscriptionData(subs);
            setPaymentData(payments);
        } catch (error) {
            console.error("Error loading admin data", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Subscription Management
    const openEditSubModal = (sub: AdminSubscriptionData) => {
        setEditingSub(sub);
        setSubForm({
            plan: sub.plan_type,
            price: sub.price_per_month,
            endDate: sub.end_date || '',
            status: sub.status
        });
        setIsEditSubModalOpen(true);
    };

    const handleCreateSub = async (clientId: string) => {
        const toastId = toast.loading('Creando suscripción...');
        const newSub = await createSubscription({
            owner_id: clientId,
            plan_type: 'FREE',
            price_per_month: 0,
            status: 'ACTIVE',
            start_date: new Date().toISOString().split('T')[0],
            max_venues: 1,
            max_courts_per_venue: 2
        });

        if (newSub) {
            // Refresh data to show new sub
            const [subs] = await Promise.all([getAdminSubscriptionsData()]);
            setSubscriptionData(subs);
            toast.success('Suscripción creada', { id: toastId });
        } else {
            toast.error('Error al crear suscripción', { id: toastId });
        }
    };

    const handleSaveSub = async () => {
        if (!editingSub) return;

        const currentSub = editingSub;
        const toastId = toast.loading('Actualizando suscripción...');

        const success = await updateSubscription(currentSub.id, {
            plan_type: subForm.plan as SubscriptionPlan,
            price_per_month: subForm.price,
            end_date: subForm.endDate || undefined,
            status: subForm.status as SubscriptionStatus
        });
        if (success) {
            setSubscriptionData(prev => prev.map(s => s.id === currentSub.id ? {
                ...s,
                plan_type: subForm.plan as SubscriptionPlan,
                price_per_month: subForm.price,
                end_date: subForm.endDate || undefined,
                status: subForm.status as SubscriptionStatus
            } : s));
            setIsEditSubModalOpen(false);
            setEditingSub(null);
            toast.success('Suscripción actualizada', { id: toastId });
        } else {
            toast.error('Error al actualizar la suscripción', { id: toastId });
        }
    };

    const markAsPaid = async (sub: AdminSubscriptionData) => {
        if (!confirm(`¿Confirmar pago para ${sub.owner.full_name}? Se extenderá la suscripción por 30 días.`)) return;

        const toastId = toast.loading('Procesando pago...');

        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + 30);
        const endDateStr = newEndDate.toISOString().split('T')[0];

        // 1. Create Payment Record
        const paymentSuccess = await createPayment({
            payment_type: 'SUBSCRIPTION',
            subscription_id: sub.id,
            payer_id: sub.owner_id,
            amount: sub.price_per_month,
            currency: 'PYG',
            payment_method: 'CASH', // Default to CASH for manual admin entry, could be enhanced with a modal
            status: 'COMPLETED',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        if (!paymentSuccess) {
            toast.error('Error al registrar el pago', { id: toastId });
            return;
        }

        // 2. Update Subscription
        const success = await updateSubscription(sub.id, {
            status: 'ACTIVE',
            end_date: endDateStr
        });

        if (success) {
            setSubscriptionData(prev => prev.map(s => s.id === sub.id ? {
                ...s,
                status: 'ACTIVE',
                end_date: endDateStr
            } : s));
            toast.success('Pago registrado y suscripción extendida', { id: toastId });

            // Refresh payments data to show new payment immediately
            getAdminPaymentsData().then(setPaymentData);
        } else {
            toast.error('Error al actualizar la suscripción', { id: toastId });
        }
    };

    // RUC Management
    const startEditRuc = (client: AdminProfileData) => {
        setEditingRuc(client.id);
        setRucValue(client.ruc || '');
    };

    const cancelEditRuc = () => {
        setEditingRuc(null);
        setRucValue('');
    };

    const handleSaveRuc = async (userId: string) => {
        const toastId = toast.loading('Guardando RUC...');
        const success = await updateUserProfile(userId, { ruc: rucValue });
        if (success) {
            setClientData(prev => prev.map(c => c.id === userId ? { ...c, ruc: rucValue } : c));
            // Update other states that might contain this user
            setVenueData(prev => prev.map(v => v.owner_id === userId ? { ...v, owner: { ...v.owner, ruc: rucValue } } : v));
            setSubscriptionData(prev => prev.map(s => s.owner_id === userId ? { ...s, owner: { ...s.owner, ruc: rucValue } } : s));
            setEditingRuc(null);
            toast.success('RUC actualizado correctamente', { id: toastId });
        } else {
            toast.error('Error al guardar RUC', { id: toastId });
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-PY', {
            style: 'currency',
            currency: 'PYG',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('es-PY').format(num);
    };

    const getDaysRemaining = (dateStr?: string) => {
        if (!dateStr) return -1;
        const end = new Date(dateStr);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getTrialInfo = (sub?: Subscription | AdminSubscriptionData) => {
        if (!sub || !sub.start_date) return null;
        const start = new Date(sub.start_date);
        const now = new Date();
        const trialEnd = new Date(start);
        trialEnd.setDate(trialEnd.getDate() + 30);
        
        if (now < trialEnd) {
            const diff = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return { isTrial: true, daysLeft: diff, endDate: trialEnd };
        }
        return { isTrial: false };
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Cargando panel de administrador...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
            <Toaster position="top-right" />
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900">Panel de Administrador</h1>
                        <p className="text-gray-500 mt-1">Gestión general de complejos y suscripciones</p>
                    </div>
                    <button
                        onClick={loadData}
                        className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition shadow-sm"
                        title="Actualizar datos"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-500 mb-1">Total Complejos</p>
                        <p className="text-3xl font-bold text-gray-900">{venueData.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-500 mb-1">Total Reservas Completadas</p>
                        <p className="text-3xl font-bold text-gray-900">
                            {venueData.reduce((acc, curr) => acc + curr.total_bookings, 0)}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">Mes actual de facturación</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-500 mb-1">Comisiones (TuCancha)</p>
                        <p className="text-3xl font-bold text-indigo-600">
                            {formatCurrency(venueData.reduce((acc, curr) => acc + (curr.platform_commission || 0), 0))}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">* 5.000 Gs por hora reservada (Mes actual)</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-500 mb-1">Suscripciones Activas</p>
                        <p className="text-3xl font-bold text-green-600">
                            {subscriptionData.filter(s => s.status === 'ACTIVE').length}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {['venues', 'clients', 'subscriptions', 'payments'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`${activeTab === tab
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                            >
                                {tab === 'venues' ? 'Complejos' :
                                    tab === 'clients' ? 'Clientes (Dueños)' :
                                        tab === 'subscriptions' ? 'Suscripciones' :
                                            'Facturación y Pagos'}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'venues' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">Detalle de Comisiones por Complejo</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Complejo / Dueño</th>
                                        <th className="px-6 py-4">Suscripción</th>
                                        <th className="px-6 py-4 text-right">Ingresos Dueño</th>
                                        <th className="px-6 py-4 text-right text-indigo-600">Comisión TuCancha</th>
                                        <th className="px-6 py-4 text-right">Reservas</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {venueData.map((venue) => (
                                        <tr key={venue.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{venue.name}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Dueño: {venue.owner?.full_name || 'Sin nombre'}<br />
                                                    {venue.owner?.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {venue.subscription ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-indigo-600">{venue.subscription.plan_type}</span>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {(() => {
                                                                const trial = getTrialInfo(venue.subscription);
                                                                if (trial?.isTrial) {
                                                                    return (
                                                                        <>
                                                                            <span className="inline-flex items-center text-blue-600 font-bold">
                                                                                ★ Prueba Gratis ({trial.daysLeft} días)
                                                                            </span>
                                                                            <span className="block mt-0.5 text-gray-400">
                                                                                Fin: {trial.endDate?.toLocaleDateString('es-PY')}
                                                                            </span>
                                                                        </>
                                                                    );
                                                                }
                                                                return (
                                                                    <>
                                                                        {venue.subscription.status === 'ACTIVE' && (
                                                                            <span className="inline-flex items-center text-green-600">
                                                                                ● {venue.subscription.status}
                                                                            </span>
                                                                        )}
                                                                        {venue.subscription.end_date && (
                                                                            <span className="block mt-0.5">
                                                                                Vence: {new Date(venue.subscription.end_date).toLocaleDateString('es-PY')}
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Sin suscripción</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-gray-900">{formatCurrency(venue.total_revenue)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right bg-indigo-50/30">
                                                <span className="font-bold text-indigo-700">{formatCurrency(venue.platform_commission)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-gray-700">{venue.total_bookings}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${venue.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {venue.is_active ? 'Publicado' : 'Oculto'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {venueData.length === 0 && (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No hay complejos registrados.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'clients' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">Lista de Dueños de Canchas</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4">Contacto</th>
                                        <th className="px-6 py-4">Rol</th>
                                        <th className="px-6 py-4">Fecha Registro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {clientData.map((client) => (
                                        <tr key={client.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{client.full_name || 'Sin nombre'}</div>
                                                <div className="text-xs text-gray-500">{client.id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900">{client.email}</div>
                                                <div className="text-gray-500 text-xs">{client.phone || 'Sin teléfono'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                    {client.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {new Date(client.created_at).toLocaleDateString('es-PY')}
                                            </td>
                                        </tr>
                                    ))}
                                    {clientData.length === 0 && (
                                        <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No hay clientes (dueños) registrados.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'subscriptions' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">Gestión de Suscripciones</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4">Plan Actual</th>
                                        <th className="px-6 py-4">Precio Mes</th>
                                        <th className="px-6 py-4">Vencimiento</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {clientData.map((client) => {
                                        const sub = subscriptionData.find(s => s.owner_id === client.id);
                                        return (
                                            <tr key={client.id} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900">{client.full_name}</div>
                                                    <div className="text-xs text-gray-500">{client.email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {sub ? (
                                                        <span className={`font-medium ${sub.plan_type === 'PREMIUM' ? 'text-indigo-600' :
                                                                sub.plan_type === 'ENTERPRISE' ? 'text-purple-600' : 'text-gray-600'
                                                            }`}>
                                                            {sub.plan_type}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Sin Plan</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {sub ? formatCurrency(sub.price_per_month) : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {(() => {
                                                        if (!sub) return '-';
                                                        const trial = getTrialInfo(sub);
                                                        if (trial?.isTrial) {
                                                            return <span className="text-blue-600 font-medium" title="Fin de prueba">{trial.endDate?.toLocaleDateString('es-PY')}</span>;
                                                        }
                                                        return sub.end_date ? new Date(sub.end_date).toLocaleDateString('es-PY') : '-';
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {sub ? (
                                                        (() => {
                                                             const trial = getTrialInfo(sub);
                                                             if (trial?.isTrial) {
                                                                 return (
                                                                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                                                         ★ Prueba ({trial.daysLeft}d)
                                                                     </span>
                                                                 );
                                                             }
                                                             return (
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sub.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                                                        sub.status === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                                                                            'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                    {sub.status}
                                                                </span>
                                                             );
                                                        })()
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                                            N/A
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {sub ? (
                                                        (() => {
                                                            const trial = getTrialInfo(sub);
                                                            if (trial?.isTrial) {
                                                                return <span className="text-xs text-blue-600 font-bold">En Prueba</span>;
                                                            }
                                                            
                                                            const daysLeft = getDaysRemaining(sub.end_date);
                                                            const isExpiringSoon = sub.status === 'ACTIVE' && daysLeft <= 5 && daysLeft >= 0;
                                                            const isExpired = sub.status === 'EXPIRED' || (sub.status === 'ACTIVE' && daysLeft < 0) || sub.status === 'PENDING_PAYMENT';

                                                            // ALWAYS show action button for Premium plans to allow manual payment recording
                                                            // Logic:
                                                            // 1. Expired/Late -> Red Button "Vencido - Pagar"
                                                            // 2. Expiring Soon -> Yellow Button "Renovar"
                                                            // 3. Up to date -> Blue/Gray Button "Adelantar Pago" or "Extender"
                                                            
                                                            if (sub.plan_type === 'PREMIUM') {
                                                                let buttonColorClass = 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
                                                                let buttonText = 'Registrar Pago';
                                                                
                                                                if (isExpired || sub.status !== 'ACTIVE') {
                                                                    buttonColorClass = 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
                                                                    buttonText = 'Vencido - Pagar';
                                                                } else if (isExpiringSoon) {
                                                                    buttonColorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
                                                                    buttonText = 'Renovar';
                                                                }

                                                                return (
                                                                    <button
                                                                        onClick={() => markAsPaid(sub as AdminSubscriptionData)}
                                                                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded border transition ${buttonColorClass}`}
                                                                        title="Extender suscripción por 30 días"
                                                                    >
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                        {buttonText}
                                                                    </button>
                                                                );
                                                            }
                                                            
                                                            return <span className="text-xs text-green-600 font-bold">Al día</span>;
                                                        })()
                                                    ) : (
                                                        <span className="text-xs text-gray-400">Sin suscripción</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {clientData.length === 0 && (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No hay clientes registrados.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">Facturación y Estado de Pagos</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4">Contacto</th>
                                        <th className="px-6 py-4">RUC (Facturación)</th>
                                        <th className="px-6 py-4">Estado de Cuenta</th>
                                        <th className="px-6 py-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {subscriptionData.map((sub) => {
                                        const daysLeft = getDaysRemaining(sub.end_date);
                                        const isExpiringSoon = sub.status === 'ACTIVE' && daysLeft <= 5 && daysLeft >= 0;
                                        const isExpired = sub.status === 'EXPIRED' || (sub.status === 'ACTIVE' && daysLeft < 0);

                                        return (
                                            <tr key={sub.id} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900">{sub.owner?.full_name}</div>
                                                    <div className="text-xs text-gray-500">Plan: {sub.plan_type}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-gray-900">{sub.owner?.email}</div>
                                                    <div className="text-gray-500 text-xs">{sub.owner?.phone || 'Sin teléfono'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {editingRuc === sub.owner_id ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={rucValue}
                                                                onChange={(e) => setRucValue(e.target.value)}
                                                                className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                                placeholder="RUC..."
                                                            />
                                                            <button onClick={() => handleSaveRuc(sub.owner_id)} className="text-green-600 hover:text-green-800">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                            </button>
                                                            <button onClick={cancelEditRuc} className="text-red-600 hover:text-red-800">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 group">
                                                            <span className="text-gray-700 font-mono">{sub.owner?.ruc || '---'}</span>
                                                            <button
                                                                onClick={() => startEditRuc(sub.owner as AdminProfileData)}
                                                                className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title="Editar RUC"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        {(() => {
                                                            const trial = getTrialInfo(sub);
                                                            if (trial?.isTrial) {
                                                                return (
                                                                    <>
                                                                        <span className="inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                                                            ★ Prueba Gratis
                                                                        </span>
                                                                        <span className="text-xs text-gray-500">
                                                                            Fin: {trial.endDate?.toLocaleDateString('es-PY')}
                                                                        </span>
                                                                    </>
                                                                );
                                                            }
                                                            return (
                                                                <>
                                                                    {sub.status === 'ACTIVE' && !isExpiringSoon && !isExpired && (
                                                                        <span className="inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                            Pagado (Activo)
                                                                        </span>
                                                                    )}
                                                                    {isExpiringSoon && (
                                                                        <span className="inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                            ⚠️ Por vencer ({daysLeft} días)
                                                                        </span>
                                                                    )}
                                                                    {isExpired && (
                                                                        <span className="inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                            Vencido
                                                                        </span>
                                                                    )}
                                                                    <span className="text-xs text-gray-500">
                                                                        Vence: {sub.end_date ? new Date(sub.end_date).toLocaleDateString('es-PY') : '-'}
                                                                    </span>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {(() => {
                                                        const trial = getTrialInfo(sub);
                                                        if (trial?.isTrial) {
                                                            return <span className="text-xs text-blue-600 font-bold">En Prueba</span>;
                                                        }
                                                        
                                                        if (sub.status !== 'ACTIVE' || isExpiringSoon || isExpired) {
                                                            return (
                                                                <button
                                                                    onClick={() => markAsPaid(sub as AdminSubscriptionData)}
                                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded border border-green-200 hover:bg-green-100 transition"
                                                                    title="Marcar como pagado (Extender 30 días)"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                                    Registrar Pago
                                                                </button>
                                                            );
                                                        }
                                                        return <span className="text-xs text-gray-400">Al día</span>;
                                                    })()}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {subscriptionData.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No hay datos de facturación.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Subscription Modal */}
            {isEditSubModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Editar Suscripción</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                                <select
                                    value={subForm.plan}
                                    onChange={(e) => {
                                        const newPlan = e.target.value;
                                        let newPrice = subForm.price;

                                        if (newPlan === 'PREMIUM' && editingSub) {
                                            // Auto-calculate commissions for this owner
                                            const ownerVenues = venueData.filter(v => v.owner_id === editingSub.owner_id);
                                            const totalCommissions = ownerVenues.reduce((sum, v) => sum + (v.platform_commission || 0), 0);
                                            newPrice = totalCommissions;
                                        } else if (newPlan === 'FREE') {
                                            newPrice = 0;
                                        }

                                        setSubForm({ ...subForm, plan: newPlan, price: newPrice });
                                    }}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="FREE">FREE</option>
                                    <option value="PREMIUM">PREMIUM (PRO)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Precio Mensual (Gs)</label>
                                <input
                                    type="text"
                                    value={subForm.price === 0 ? '' : formatNumber(subForm.price)}
                                    onChange={(e) => {
                                        const rawValue = e.target.value.replace(/\D/g, '');
                                        setSubForm({ ...subForm, price: Number(rawValue) });
                                    }}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento</label>
                                <input
                                    type="date"
                                    value={subForm.endDate}
                                    onChange={(e) => setSubForm({ ...subForm, endDate: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                <select
                                    value={subForm.status}
                                    onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="ACTIVE">Activo</option>
                                    <option value="EXPIRED">Vencido</option>
                                    <option value="CANCELLED">Cancelado</option>
                                    <option value="PENDING_PAYMENT">Pendiente de Pago</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsEditSubModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveSub}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
