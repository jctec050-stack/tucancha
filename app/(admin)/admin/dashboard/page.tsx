'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/AuthContext';
import { useRouter } from 'next/navigation';
import { AdminVenueData, getAdminDashboardData } from '@/services/dataService';

const AdminDashboard = () => {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<AdminVenueData[]>([]);
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
        const dashboardData = await getAdminDashboardData();
        setData(dashboardData);
        setIsLoading(false);
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
                        <p className="text-3xl font-bold text-gray-900">{data.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-500 mb-1">Total Reservas</p>
                        <p className="text-3xl font-bold text-gray-900">
                            {data.reduce((acc, curr) => acc + curr.total_bookings, 0)}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-500 mb-1">Ingresos Totales (Plataforma)</p>
                        <p className="text-3xl font-bold text-indigo-600">
                            {formatCurrency(data.reduce((acc, curr) => acc + curr.total_revenue, 0))}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">* Suma de todas las reservas</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-500 mb-1">Suscripciones Activas</p>
                        <p className="text-3xl font-bold text-green-600">
                            {data.filter(v => v.subscription?.status === 'ACTIVE').length}
                        </p>
                    </div>
                </div>

                {/* Main Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">Detalle de Complejos</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Complejo / Dueño</th>
                                    <th className="px-6 py-4">Suscripción</th>
                                    <th className="px-6 py-4 text-center">Canchas</th>
                                    <th className="px-6 py-4 text-right">Ingresos Totales</th>
                                    <th className="px-6 py-4 text-right">Reservas</th>
                                    <th className="px-6 py-4 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.map((venue) => (
                                    <React.Fragment key={venue.id}>
                                        <tr className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-bold text-gray-900">{venue.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                                            {venue.owner?.full_name || 'Sin nombre'}
                                                        </span>
                                                        {venue.owner?.phone && (
                                                            <span className="text-xs text-gray-500">📞 {venue.owner.phone}</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-0.5">{venue.owner?.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {venue.subscription ? (
                                                    <div>
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            venue.subscription.plan_type === 'PREMIUM' || venue.subscription.plan_type === 'ENTERPRISE' 
                                                                ? 'bg-purple-100 text-purple-800' 
                                                                : venue.subscription.plan_type === 'BASIC'
                                                                    ? 'bg-blue-100 text-blue-800'
                                                                    : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {venue.subscription.plan_type}
                                                        </span>
                                                        <div className="mt-1 text-xs text-gray-500">
                                                            {venue.subscription.status === 'ACTIVE' ? (
                                                                <span className="text-green-600 flex items-center gap-1">
                                                                    ● Activo
                                                                </span>
                                                            ) : (
                                                                <span className="text-red-500 flex items-center gap-1">
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
                                {data.length === 0 && (
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
            </div>
        </div>
    );
};

export default AdminDashboard;
