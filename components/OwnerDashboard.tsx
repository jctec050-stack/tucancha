
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Booking, Venue, DisabledSlot } from '../types';


interface OwnerDashboardProps {
  bookings: Booking[];
  disabledSlots?: DisabledSlot[];
  venue: Venue;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ bookings, disabledSlots, venue, selectedDate, onDateChange }) => {
  // Memoize daily stats
  const { dailyBookings, dailyActiveBookings, dailyRevenue } = useMemo(() => {
    const dailyBookings = bookings.filter(b => b.date === selectedDate);
    const dailyActiveBookings = dailyBookings.filter(b => b.status === 'ACTIVE' || b.status === 'COMPLETED');
    const dailyRevenue = dailyActiveBookings.reduce((sum, b) => sum + b.price, 0);
    return { dailyBookings, dailyActiveBookings, dailyRevenue };
  }, [bookings, selectedDate]);

  // Memoize previous day stats
  const { revenueGrowth } = useMemo(() => {
    const prevDateObj = new Date(selectedDate);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDate = prevDateObj.toISOString().split('T')[0];

    const prevDayBookings = bookings.filter(b => b.date === prevDate && (b.status === 'ACTIVE' || b.status === 'COMPLETED'));
    const prevDayRevenue = prevDayBookings.reduce((sum, b) => sum + b.price, 0);

    const growth = prevDayRevenue === 0 ? 100 : ((dailyRevenue - prevDayRevenue) / prevDayRevenue) * 100;
    return { revenueGrowth: growth };
  }, [bookings, selectedDate, dailyRevenue]);

  // Memoize Chart Data
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];

      const dayRevenue = bookings
        .filter(b => b.date === dStr && (b.status === 'ACTIVE' || b.status === 'COMPLETED'))
        .reduce((sum, b) => sum + b.price, 0);

      data.push({ name: dStr, revenue: dayRevenue });
    }
    return data;
  }, [bookings, selectedDate]);

  // Memoize Sport Distribution
  const sportDistribution = useMemo(() => {
    return dailyActiveBookings.reduce((acc: any[], b) => {
      const sport = (b.court_name || '').includes('Beach') ? 'Beach Tennis' : 'Padel';
      const existing = acc.find(item => item.name === sport);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: sport, value: 1 });
      }
      return acc;
    }, []);
  }, [dailyActiveBookings]);

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'];

  // Memoize Schedule Items
  const scheduleItems = useMemo(() => {
    return [
      ...dailyBookings.map(b => ({
        id: b.id,
        time: b.start_time,
        courtName: b.court_name || 'Cancha',
        type: 'Reserva',
        status: b.status,
        details: b.player_name || 'Cliente',
        price: b.price
      })),
      ...(disabledSlots || []).map(s => {
        const court = venue.courts.find(c => c.id === s.court_id);
        return {
          id: s.id,
          time: s.time_slot,
          courtName: court ? court.name : 'Cancha',
          type: 'Bloqueo',
          status: 'DISABLED',
          details: s.reason || 'Mantenimiento',
          price: 0
        };
      })
    ].sort((a, b) => a.time.localeCompare(b.time));
  }, [dailyBookings, disabledSlots, venue.courts]);

  return (
    <div className="space-y-6">
      {/* Date Filter Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800">Resumen Diario</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              onDateChange(d.toISOString().split('T')[0]);
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500"
          >
            ←
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="font-bold text-gray-700 border-none focus:ring-0 cursor-pointer bg-transparent"
          />
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              onDateChange(d.toISOString().split('T')[0]);
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Ingresos ({selectedDate})</p>
          <h4 className="text-3xl font-bold text-gray-900 mt-1">Gs. {dailyRevenue.toLocaleString('es-PY')}</h4>
          <span className={`text-xs font-semibold ${revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(revenueGrowth).toFixed(1)}% vs ayer
          </span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Reservas Activas</p>
          <h4 className="text-3xl font-bold text-gray-900 mt-1">{dailyActiveBookings.length}</h4>
          <span className="text-blue-500 text-xs font-semibold">Para el {selectedDate}</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Cancelaciones</p>
          <h4 className="text-3xl font-bold text-gray-900 mt-1">{dailyBookings.filter(b => b.status === 'CANCELLED').length}</h4>
          <span className="text-red-500 text-xs font-semibold">En este día</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm font-medium">Canchas</p>
          <h4 className="text-3xl font-bold text-gray-900 mt-1">{venue.courts.length}</h4>
          <span className="text-gray-400 text-xs">{venue.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h5 className="text-lg font-bold text-gray-800 mb-6">Ingresos (Últimos 7 días hasta {selectedDate})</h5>
          <div className="h-64">
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} tickFormatter={(val) => val.split('-')[2] + '/' + val.split('-')[1]} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: any) => [`Gs. ${(value || 0).toLocaleString('es-PY')}`, 'Ingresos']} />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h5 className="text-lg font-bold text-gray-800 mb-6">Distribución por Deporte ({selectedDate})</h5>
          <div className="h-64 flex flex-col items-center">
            {sportDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="99%" height={256}>
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
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No hay datos para este día
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Schedule Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Detalle de Actividad ({selectedDate})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                <th className="px-6 py-4">Hora</th>
                <th className="px-6 py-4">Cancha</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Detalle / Cliente</th>
                <th className="px-6 py-4 text-right">Monto</th>
                <th className="px-6 py-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scheduleItems.length > 0 ? (
                scheduleItems.map((item, index) => (
                  <tr key={`${item.id}-${index}`} className={`hover:bg-gray-50 transition ${item.status === 'CANCELLED' ? 'bg-red-50/50' : ''}`}>
                    <td className="px-6 py-4 font-bold text-gray-900">{item.time}</td>
                    <td className="px-6 py-4 text-gray-600">{item.courtName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        item.status === 'CANCELLED' ? 'bg-gray-200 text-gray-500 line-through' :
                        item.type === 'Reserva' ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-medium ${item.status === 'CANCELLED' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                        {item.details}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {item.price > 0 ? `Gs. ${item.price.toLocaleString('es-PY')}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        item.status === 'ACTIVE' ? 'bg-green-500' :
                        item.status === 'COMPLETED' ? 'bg-blue-500' :
                        item.status === 'CANCELLED' ? 'bg-red-500' :
                        item.status === 'DISABLED' ? 'bg-orange-500' : 'bg-gray-300'
                      }`}></span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No hay actividad registrada para este día
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Schedule List */}
      <div className="md:hidden space-y-4">
        <h3 className="text-lg font-bold text-gray-800 px-2">Detalle de Actividad ({selectedDate})</h3>
        {scheduleItems.length > 0 ? (
            scheduleItems.map((item, index) => (
            <div key={`${item.id}-${index}`} className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm ${item.status === 'CANCELLED' ? 'bg-red-50/50' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                <div>
                    <span className="text-lg font-bold text-gray-900 block">{item.time}</span>
                    <span className="text-sm text-gray-500">{item.courtName}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    item.status === 'CANCELLED' ? 'bg-gray-200 text-gray-500 line-through' :
                    item.type === 'Reserva' ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'
                }`}>
                    {item.type}
                </span>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                            item.status === 'ACTIVE' ? 'bg-green-500' :
                            item.status === 'COMPLETED' ? 'bg-blue-500' :
                            item.status === 'CANCELLED' ? 'bg-red-500' :
                            item.status === 'DISABLED' ? 'bg-orange-500' : 'bg-gray-300'
                        }`}></span>
                        <span className={`font-medium text-sm ${item.status === 'CANCELLED' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                            {item.details}
                        </span>
                    </div>
                    <span className="font-bold text-gray-900">
                        {item.price > 0 ? `Gs. ${item.price.toLocaleString('es-PY')}` : '-'}
                    </span>
                </div>
            </div>
            ))
        ) : (
            <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-gray-100">
                No hay actividad registrada
            </div>
        )}
      </div>

    </div>
  );
};
