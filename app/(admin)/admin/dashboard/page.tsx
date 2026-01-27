'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminVenueData, AdminProfileData, AdminSubscriptionData, AdminPaymentData } from '@/types';
import { getAdminDashboardData, getAdminClientsData, getAdminSubscriptionsData, getAdminPaymentsData } from '@/services/dataService';

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
            // Load all data in parallel for simplicity (or split by tab if optimizing)
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-PY', {
            style: 'currency',
            currency: 'PYG',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
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
                        <p className="text-sm font-medium text-gray-500 mb-1">Total Reservas</p>
                        <p className="text-3xl font-bold text-gray-900">
                            {venueData.reduce((acc, curr) => acc + curr.total_bookings, 0)}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-500 mb-1">Ingresos Totales (Plataforma)</p>
                        <p className="text-3xl font-bold text-indigo-600">
                            {formatCurrency(venueData.reduce((acc, curr) => acc + curr.total_revenue, 0))}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">* Suma de todas las reservas</p>
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
                        <button
                            onClick={() => setActiveTab('venues')}
                            className={`${
                                activeTab === 'venues'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Complejos
                        </button>
                        <button
                            onClick={() => setActiveTab('clients')}
                            className={`${
                                activeTab === 'clients'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Clientes
                        </button>
                        <button
                            onClick={() => setActiveTab('subscriptions')}
                            className={`${
                                activeTab === 'subscriptions'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Suscripciones
                        </button>
                        <button
                            onClick={() => setActiveTab('payments')}
                            className={`${
                                activeTab === 'payments'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Facturación y Pagos
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'venues' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">Detalle de Complejos</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4">Complejo / Dueño</th>
                                    <th className="px-6 py-4">Suscripción</th>
                                    <th className="px-6 py-4 text-center">Canchas</th>
                                    <th className="px-6 py-4 text-right">Ingresos (Total)</th>
                                    <th className="px-6 py-4 text-right">Reservas</th>
                                    <th className="px-6 py-4 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {venueData.map((venue) => (
                                    <React.Fragment key={venue.id}>
                                        <tr className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{venue.name}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Dueño: {venue.owner?.full_name || 'Sin nombre'}<br/>
                                                    {venue.owner?.email}<br/>
                                                    {venue.owner?.phone}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {venue.subscription ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-indigo-600">{venue.subscription.plan_type}</span>
                                                        <div className="text-xs text-gray-500 mt-1">
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
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Sin suscripción</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-gray-700">{venue.courts?.length || 0}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-gray-900">{formatCurrency(venue.total_revenue)}</span>
                                                {/* Revenue breakdown tooltip or summary */}
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {venue.courts?.map(court => (
                                                        <div key={court.id} className="flex justify-end gap-2">
                                                            <span>{court.name}:</span>
                                                            <span>{formatCurrency(venue.revenue_by_court[court.id] || 0)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-gray-700">{venue.total_bookings}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    venue.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {venue.is_active ? 'Publicado' : 'Oculto'}
                                                </span>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                                {venueData.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            No hay complejos registrados aún.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}

                {activeTab === 'clients' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">Lista de Clientes</h2>
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
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                client.role === 'OWNER' ? 'bg-purple-100 text-purple-800' : 
                                                client.role === 'ADMIN' ? 'bg-gray-800 text-white' : 
                                                'bg-blue-100 text-blue-800'
                                            }`}>
                                                {client.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(client.created_at).toLocaleDateString('es-PY')}
                                        </td>
                                    </tr>
                                ))}
                                {clientData.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                            No hay clientes registrados.
                                        </td>
                                    </tr>
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
                                    <th className="px-6 py-4">Dueño</th>
                                    <th className="px-6 py-4">Plan</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4">Periodo</th>
                                    <th className="px-6 py-4 text-right">Precio/Mes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {subscriptionData.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{sub.owner?.full_name || 'Desconocido'}</div>
                                            <div className="text-xs text-gray-500">{sub.owner?.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-indigo-600">{sub.plan_type}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                sub.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                                                sub.status === 'EXPIRED' ? 'bg-orange-100 text-orange-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(sub.start_date).toLocaleDateString('es-PY')} 
                                            {sub.end_date ? ` - ${new Date(sub.end_date).toLocaleDateString('es-PY')}` : ' (Indefinido)'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">
                                            {formatCurrency(sub.price_per_month)}
                                        </td>
                                    </tr>
                                ))}
                                {subscriptionData.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            No hay suscripciones registradas.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}

                {activeTab === 'payments' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">Historial de Pagos</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4">Pagador</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Método</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paymentData.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(payment.created_at).toLocaleDateString('es-PY')}
                                            <div className="text-xs text-gray-400">
                                                {new Date(payment.created_at).toLocaleTimeString('es-PY')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{payment.payer?.full_name || 'Desconocido'}</div>
                                            <div className="text-xs text-gray-500">{payment.payer?.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                {payment.payment_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {payment.payment_method}
                                        </td>
                                        <td className="px-6 py-4">
                                             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                                                payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                    </tr>
                                ))}
                                {paymentData.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            No hay pagos registrados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
