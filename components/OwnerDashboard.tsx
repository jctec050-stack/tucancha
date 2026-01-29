
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Booking, Venue, DisabledSlot } from '../types';


interface ScheduleItem {
  id: string;
  time: string;
  startTimeMinutes: number;
  endTimeMinutes: number;
  courtName: string;
  type: string;
  status: string;
  details: string;
  phone?: string;
  price: number;
  rawTime: string;
  count?: number;
  timeRange?: string;
}

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

  // Memoize Monthly History and Revenue
  const { monthlyHistory, monthlyRevenue } = useMemo(() => {
    const [year, month] = selectedDate.split('-').map(Number);
    
    // Filter bookings for the selected month and year
    const monthlyBookings = bookings.filter(b => {
        const [bYear, bMonth] = b.date.split('-').map(Number);
        return bYear === year && bMonth === month;
    });

    // Calculate total revenue for the month (only ACTIVE or COMPLETED)
    const totalRevenue = monthlyBookings
        .filter(b => b.status === 'ACTIVE' || b.status === 'COMPLETED')
        .reduce((sum, b) => sum + b.price, 0);

    // Group consecutive bookings
    const sortedForGrouping = [...monthlyBookings].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
    });

    const groupedHistory: any[] = [];
    
    if (sortedForGrouping.length > 0) {
        // Helper to ensure end_time
        const getEndTime = (b: Booking) => {
            if (b.end_time) return b.end_time;
            const [h, m] = b.start_time.split(':').map(Number);
            return `${(h+1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
        };

        let current = { ...sortedForGrouping[0], end_time: getEndTime(sortedForGrouping[0]) };

        for (let i = 1; i < sortedForGrouping.length; i++) {
            const next = { ...sortedForGrouping[i], end_time: getEndTime(sortedForGrouping[i]) };

            const currentEnd = current.end_time.substring(0, 5);
            const nextStart = next.start_time.substring(0, 5);

            const isConsecutive = currentEnd === nextStart;
            const isSameDate = current.date === next.date;
            const isSamePlayer = (current.player_id && current.player_id === next.player_id) || (!current.player_id && current.player_name === next.player_name);
            const isSameCourt = current.court_id === next.court_id;
            const isSameStatus = current.status === next.status;

            if (isSameDate && isSamePlayer && isSameCourt && isSameStatus && isConsecutive) {
                // Merge
                current.end_time = next.end_time;
                current.price += next.price;
            } else {
                groupedHistory.push(current);
                current = next;
            }
        }
        groupedHistory.push(current);
    }

    // Sort by date descending, then time descending
    const finalHistory = groupedHistory.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.start_time.localeCompare(a.start_time);
    });

    return { monthlyHistory: finalHistory, monthlyRevenue: totalRevenue };
  }, [bookings, selectedDate]);

  // Memoize Schedule Items (Grouped)
  const scheduleItems = useMemo(() => {
    // 1. Convert bookings to a processable format
    const rawItems: ScheduleItem[] = [
      ...dailyBookings.map(b => ({
        id: b.id,
        time: b.start_time,
        // Assume end_time is 1 hour later if not provided (though backend usually provides start_time)
        // Actually, let's use the logic that slots are 1 hour.
        // We need to know the end time of each slot to check continuity.
        // Since we don't have explicit end_time in Booking type in this component context (it's in DB but let's check props),
        // we can infer it or use what's available.
        // Let's assume 1 hour duration per booking record if not specified.
        // Wait, looking at Booking type in other files, it might not have end_time.
        // But the user wants ranges "18:00 a 20:00".
        // We'll parse start_time.
        startTimeMinutes: parseInt(b.start_time.split(':')[0]) * 60 + parseInt(b.start_time.split(':')[1]),
        endTimeMinutes: parseInt(b.start_time.split(':')[0]) * 60 + parseInt(b.start_time.split(':')[1]) + 60, // Assume 1h
        courtName: b.court_name || 'Cancha',
        type: 'Reserva',
        status: b.status,
        details: b.player_name || 'Cliente',
        price: b.price,
        rawTime: b.start_time
      })),
      ...(disabledSlots || []).map(s => ({
        id: s.id,
        time: s.time_slot,
        startTimeMinutes: parseInt(s.time_slot.split(':')[0]) * 60 + parseInt(s.time_slot.split(':')[1]),
        endTimeMinutes: parseInt(s.time_slot.split(':')[0]) * 60 + parseInt(s.time_slot.split(':')[1]) + 60,
        courtName: venue.courts.find(c => c.id === s.court_id)?.name || 'Cancha',
        type: 'Bloqueo',
        status: 'DISABLED',
        details: s.reason || 'Mantenimiento',
        price: 0,
        rawTime: s.time_slot
      }))
    ].sort((a, b) => a.startTimeMinutes - b.startTimeMinutes);

    // 2. Group consecutive items
    const groupedItems: ScheduleItem[] = [];
    if (rawItems.length > 0) {
        let currentGroup = { ...rawItems[0], count: 1, endTimeMinutes: rawItems[0].endTimeMinutes };

        for (let i = 1; i < rawItems.length; i++) {
            const item = rawItems[i];
            
            // Check if same group: Court, Type, Status, Details (Player), and Consecutive Time
            const isConsecutive = item.startTimeMinutes === currentGroup.endTimeMinutes;
            const isSameGroup = 
                item.courtName === currentGroup.courtName &&
                item.type === currentGroup.type &&
                item.status === currentGroup.status &&
                item.details === currentGroup.details;

            if (isConsecutive && isSameGroup) {
                currentGroup.endTimeMinutes = item.endTimeMinutes;
                currentGroup.price += item.price;
                currentGroup.count += 1;
                // Keep the ID of the first one for key, or maybe combine? 
                // For UI keys, first ID is fine.
            } else {
                groupedItems.push(currentGroup);
                currentGroup = { ...item, count: 1, endTimeMinutes: item.endTimeMinutes };
            }
        }
        groupedItems.push(currentGroup);
    }

    // 3. Format output
    return groupedItems.map(item => {
        const startHour = Math.floor(item.startTimeMinutes / 60).toString().padStart(2, '0');
        const startMin = (item.startTimeMinutes % 60).toString().padStart(2, '0');
        const endHour = Math.floor(item.endTimeMinutes / 60).toString().padStart(2, '0');
        const endMin = (item.endTimeMinutes % 60).toString().padStart(2, '0');
        
        return {
            ...item,
            timeRange: `${startHour}:${startMin} a ${endHour}:${endMin}`
        };
    });

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs md:text-sm font-medium">Ingresos ({selectedDate})</p>
          <h4 className="text-xl md:text-3xl font-bold text-gray-900 mt-1">Gs. {dailyRevenue.toLocaleString('es-PY')}</h4>
          <span className={`text-[10px] md:text-xs font-semibold ${revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(revenueGrowth).toFixed(1)}% vs ayer
          </span>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs md:text-sm font-medium">Reservas Activas</p>
          <h4 className="text-xl md:text-3xl font-bold text-gray-900 mt-1">{dailyActiveBookings.length}</h4>
          <span className="text-blue-500 text-[10px] md:text-xs font-semibold">Para el {selectedDate}</span>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs md:text-sm font-medium">Cancelaciones</p>
          <h4 className="text-xl md:text-3xl font-bold text-gray-900 mt-1">{dailyBookings.filter(b => b.status === 'CANCELLED').length}</h4>
          <span className="text-red-500 text-[10px] md:text-xs font-semibold">En este día</span>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs md:text-sm font-medium">Canchas</p>
          <h4 className="text-xl md:text-3xl font-bold text-gray-900 mt-1">{venue.courts.length}</h4>
          <span className="text-gray-400 text-[10px] md:text-xs">{venue.name}</span>
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
                    <td className="px-6 py-4 font-bold text-gray-900">{item.timeRange}</td>
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
                    <span className="text-lg font-bold text-gray-900 block">{item.timeRange}</span>
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
                        <div className={`font-medium text-sm ${item.status === 'CANCELLED' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                            {item.details}
                            {item.phone && (
                                <div className="text-xs text-gray-500 font-normal mt-0.5">
                                    📞 {item.phone}
                                </div>
                            )}
                        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
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

        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-4">
             <div>
                <h5 className="text-lg font-bold text-gray-800">Historial del Mes</h5>
                <p className="text-xs text-gray-500 capitalize">{new Date(selectedDate).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
             </div>
             <div className="text-right">
                <p className="text-xs text-gray-500 font-medium">Total Ingresos</p>
                <p className="text-xl font-bold text-green-600">Gs. {monthlyRevenue.toLocaleString('es-PY')}</p>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {monthlyHistory.length > 0 ? (
                <div className="space-y-3">
                    {monthlyHistory.map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                                        {booking.date.split('-')[2]}/{booking.date.split('-')[1]}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium">
                                        {booking.start_time?.substring(0, 5)} {booking.end_time ? `- ${booking.end_time.substring(0, 5)}` : ''}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-gray-800 line-clamp-1">{booking.player_name || 'Cliente'}</p>
                                <p className="text-xs text-gray-500">{booking.court_name || 'Cancha'}</p>
                            </div>
                            <div className="text-right">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    booking.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                    booking.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                                    booking.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {booking.status === 'CANCELLED' ? 'Cancelado' : 
                                     booking.status === 'ACTIVE' ? 'Activo' : 
                                     booking.status === 'COMPLETED' ? 'Completado' : booking.status}
                                </span>
                                <p className={`text-sm font-bold mt-1 ${booking.status === 'CANCELLED' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                    Gs. {booking.price.toLocaleString('es-PY')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm">Sin movimientos este mes</p>
                </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
