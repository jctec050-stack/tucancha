
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Booking, Venue } from '../types';
import { getPerformanceSummary } from '../services/geminiService';

interface OwnerDashboardProps {
  bookings: Booking[];
  venue: Venue;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ bookings, venue }) => {
  const [aiSummary, setAiSummary] = useState<string>('Generando análisis...');

  const activeBookings = bookings.filter(b => b.status === 'ACTIVE');
  const totalRevenue = activeBookings.reduce((sum, b) => sum + b.price, 0);
  
  const revenueByDay = bookings.reduce((acc: any[], b) => {
    if (b.status !== 'ACTIVE') return acc;
    const dateStr = b.date;
    const existing = acc.find(item => item.name === dateStr);
    if (existing) {
      existing.revenue += b.price;
    } else {
      acc.push({ name: dateStr, revenue: b.price });
    }
    return acc;
  }, []);

  const sportDistribution = activeBookings.reduce((acc: any[], b) => {
    const sport = b.courtName.includes('Beach') ? 'Beach Tennis' : 'Padel';
    const existing = acc.find(item => item.name === sport);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: sport, value: 1 });
    }
    return acc;
  }, []);

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'];

  useEffect(() => {
    const fetchAi = async () => {
      const summary = await getPerformanceSummary(bookings);
      setAiSummary(summary || 'No se pudo generar el análisis.');
    };
    fetchAi();
  }, [bookings]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Ingresos Totales</p>
          <h4 className="text-3xl font-bold text-gray-900 mt-1">${totalRevenue}</h4>
          <span className="text-green-500 text-xs font-semibold">↑ 12% vs mes anterior</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Reservas Activas</p>
          <h4 className="text-3xl font-bold text-gray-900 mt-1">{activeBookings.length}</h4>
          <span className="text-blue-500 text-xs font-semibold">{activeBookings.length > 5 ? 'Alta ocupación' : 'Normal'}</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Cancelaciones</p>
          <h4 className="text-3xl font-bold text-gray-900 mt-1">{bookings.filter(b => b.status === 'CANCELLED').length}</h4>
          <span className="text-red-500 text-xs font-semibold">Tasa: 4.5%</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Canchas</p>
          <h4 className="text-3xl font-bold text-gray-900 mt-1">{venue.courts.length}</h4>
          <span className="text-gray-400 text-xs">{venue.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h5 className="text-lg font-bold text-gray-800 mb-6">Ingresos por Fecha</h5>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h5 className="text-lg font-bold text-gray-800 mb-6">Distribución por Deporte</h5>
          <div className="h-64 flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sportDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {sportDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              {sportDistribution.map((entry: any, index: number) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-xs text-gray-600 font-medium">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h5 className="text-indigo-900 font-bold">Resumen Inteligente (AI)</h5>
        </div>
        <p className="text-indigo-800 text-sm leading-relaxed italic">
          "{aiSummary}"
        </p>
      </div>
    </div>
  );
};
