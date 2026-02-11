import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Booking, Venue, DisabledSlot } from '../types';
import { usePagination } from '@/hooks/usePagination';
import { getLocalDateString, addDays } from '@/utils/dateUtils';


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
  monthlyBookings: Booking[];
  chartBookings: Booking[]; // Bookings for the last 7 days for the revenue chart
  disabledSlots?: DisabledSlot[];
  venue: Venue;
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  bookings,
  monthlyBookings,
  chartBookings,
  disabledSlots,
  venue,
  selectedDate,
  onDateChange,
  selectedMonth,
  onMonthChange
}) => {
  const [showActiveBookingsModal, setShowActiveBookingsModal] = useState(false);
  const [showCustomersRankingModal, setShowCustomersRankingModal] = useState(false);

  // Memoize daily stats
  const { dailyBookings, dailyActiveBookings, dailyRevenue } = useMemo(() => {
    const dailyBookings = bookings.filter(b => b.date === selectedDate);
    const dailyActiveBookings = dailyBookings.filter(b => b.status === 'ACTIVE' || b.status === 'COMPLETED');
    const dailyRevenue = dailyActiveBookings.reduce((sum, b) => sum + b.price, 0);
    return { dailyBookings, dailyActiveBookings, dailyRevenue };
  }, [bookings, selectedDate]);

  // Memoize previous day stats
  const { revenueGrowth } = useMemo(() => {
    const prevDate = addDays(selectedDate, -1);

    const prevDayBookings = bookings.filter(b => b.date === prevDate && (b.status === 'ACTIVE' || b.status === 'COMPLETED'));
    const prevDayRevenue = prevDayBookings.reduce((sum, b) => sum + b.price, 0);

    const growth = prevDayRevenue === 0 ? 100 : ((dailyRevenue - prevDayRevenue) / prevDayRevenue) * 100;
    return { revenueGrowth: growth };
  }, [bookings, selectedDate, dailyRevenue]);

  // Memoize Chart Data
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const dStr = addDays(selectedDate, -i);

      const dayRevenue = chartBookings
        .filter(b => b.date === dStr && (b.status === 'ACTIVE' || b.status === 'COMPLETED'))
        .reduce((sum, b) => sum + b.price, 0);

      data.push({ name: dStr, revenue: dayRevenue });
    }
    return data;
  }, [chartBookings, selectedDate]);

  // Memoize Monthly History and Revenue
  const { monthlyHistory, monthlyRevenue } = useMemo(() => {
    // Use monthlyBookings prop directly (already filtered by month in the parent component)

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
        return `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
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
  }, [monthlyBookings]);

  // Memoize Unique Customers and Customer Ranking for the month
  const { uniqueCustomersCount, customersRanking } = useMemo(() => {
    // Get only ACTIVE or COMPLETED bookings from the month
    const activeMonthlyBookings = monthlyBookings.filter(b => b.status === 'ACTIVE' || b.status === 'COMPLETED');

    // Count bookings per customer
    const customerBookingCount = new Map<string, { name: string; phone: string; count: number; totalRevenue: number }>();

    activeMonthlyBookings.forEach(b => {
      const customerId = b.player_id || b.player_name || 'Anónimo';
      const customerName = b.player_name || 'Cliente Anónimo';
      const customerPhone = b.player_phone || '-';

      if (customerBookingCount.has(customerId)) {
        const existing = customerBookingCount.get(customerId)!;
        existing.count += 1;
        existing.totalRevenue += b.price;
      } else {
        customerBookingCount.set(customerId, {
          name: customerName,
          phone: customerPhone,
          count: 1,
          totalRevenue: b.price
        });
      }
    });

    // Convert to array and sort by booking count (descending)
    const ranking = Array.from(customerBookingCount.values())
      .sort((a, b) => b.count - a.count);

    return {
      uniqueCustomersCount: customerBookingCount.size,
      customersRanking: ranking
    };
  }, [monthlyBookings]);

  // Funciones de navegación mensual
  const goToPreviousMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2); // month - 2 porque necesitamos ir al mes anterior
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
  };

  const goToNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month); // month es 1-indexed en el string, así que esto nos da el siguiente mes
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
  };

  const goToCurrentMonth = () => {
    const today = new Date();
    const newMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
  };


  // Memoize Schedule Items (Grouped)
  const scheduleItems = useMemo(() => {
    // 1. Convert bookings to a processable format
    const rawItems: ScheduleItem[] = [
      ...dailyBookings.map(b => ({
        id: b.id,
        time: b.start_time,
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

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Add Header
    doc.setFontSize(18);
    doc.text(`Reporte de Reservas Activas`, 14, 22);

    doc.setFontSize(12);
    doc.text(`Fecha: ${selectedDate}`, 14, 30);
    doc.text(`Complejo: ${venue.name}`, 14, 36);

    // Define columns
    const columns = [
      { header: 'Hora', dataKey: 'time' },
      { header: 'Cancha', dataKey: 'court' },
      { header: 'Cliente', dataKey: 'player' },
      { header: 'Teléfono', dataKey: 'phone' },
      { header: 'Precio', dataKey: 'price' },
      { header: 'Estado', dataKey: 'status' }
    ];

    // Group bookings by player and court
    const bookingsByPlayerCourt = new Map<string, Booking[]>();

    dailyActiveBookings.forEach(booking => {
      const key = `${booking.player_id || booking.player_name}-${booking.court_id}`;
      if (!bookingsByPlayerCourt.has(key)) {
        bookingsByPlayerCourt.set(key, []);
      }
      bookingsByPlayerCourt.get(key)!.push(booking);
    });

    // Prepare grouped data
    const tableData: any[] = [];

    bookingsByPlayerCourt.forEach((bookings) => {
      // Sort by time
      const sorted = [...bookings].sort((a, b) => a.start_time.localeCompare(b.start_time));

      // Check if consecutive hours
      const isConsecutive = sorted.length > 1 && sorted.every((booking, index) => {
        if (index === 0) return true;
        const prevEnd = sorted[index - 1].end_time?.substring(0, 5);
        const currentStart = booking.start_time.substring(0, 5);
        return prevEnd === currentStart;
      });

      if (isConsecutive && sorted.length > 1) {
        // Group consecutive bookings
        const firstStart = sorted[0].start_time.substring(0, 5);
        const lastEnd = sorted[sorted.length - 1].end_time?.substring(0, 5) || '??:??';
        const totalPrice = sorted.reduce((sum, b) => sum + b.price, 0);
        const hoursCount = sorted.length;

        tableData.push({
          time: `${firstStart} - ${lastEnd} (${hoursCount}h)`,
          court: sorted[0].court_name || 'Cancha',
          player: sorted[0].player_name || 'Cliente',
          phone: sorted[0].player_phone || '-',
          price: totalPrice.toLocaleString('es-PY'),
          status: sorted[0].status
        });
      } else {
        // Add individual bookings (not consecutive)
        sorted.forEach(booking => {
          tableData.push({
            time: `${booking.start_time.substring(0, 5)} - ${booking.end_time ? booking.end_time.substring(0, 5) : '??:??'}`,
            court: booking.court_name || 'Cancha',
            player: booking.player_name || 'Cliente',
            phone: booking.player_phone || '-',
            price: booking.price.toLocaleString('es-PY'),
            status: booking.status
          });
        });
      }
    });

    // Sort by time
    tableData.sort((a, b) => {
      const timeA = a.time.split(' - ')[0];
      const timeB = b.time.split(' - ')[0];
      return timeA.localeCompare(timeB);
    });

    // Add total revenue row
    const totalRevenue = dailyActiveBookings.reduce((sum, b) => sum + b.price, 0);

    // Generate table
    autoTable(doc, {
      head: [columns.map(c => c.header)],
      body: tableData.map(row => Object.values(row)),
      startY: 45,
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
      foot: [['', '', '', 'Total', totalRevenue.toLocaleString('es-PY'), '']],
      footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.save(`reservas-activas-${selectedDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Date Filter Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800">Resumen Diario</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onDateChange(addDays(selectedDate, -1));
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
              onDateChange(addDays(selectedDate, 1));
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
        <div
          onClick={() => setShowActiveBookingsModal(true)}
          className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition group"
        >
          <p className="text-gray-500 text-xs md:text-sm font-medium group-hover:text-indigo-600 transition">Reservas Activas</p>
          <h4 className="text-xl md:text-3xl font-bold text-gray-900 mt-1">{dailyActiveBookings.length}</h4>
          <span className="text-blue-500 text-[10px] md:text-xs font-semibold">Para el {selectedDate}</span>
          <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Ver detalles
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs md:text-sm font-medium">Cancelaciones</p>
          <h4 className="text-xl md:text-3xl font-bold text-gray-900 mt-1">{dailyBookings.filter(b => b.status === 'CANCELLED').length}</h4>
          <span className="text-red-500 text-[10px] md:text-xs font-semibold">En este día</span>
        </div>
        <div
          onClick={() => setShowCustomersRankingModal(true)}
          className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition group"
        >
          <p className="text-gray-500 text-xs md:text-sm font-medium group-hover:text-indigo-600 transition">Clientes</p>
          <h4 className="text-xl md:text-3xl font-bold text-gray-900 mt-1">{uniqueCustomersCount}</h4>
          <span className="text-purple-500 text-[10px] md:text-xs font-semibold">Este mes</span>
          <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Ver ranking
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
                    <td className="px-6 py-4 font-bold text-gray-900">{item.timeRange}</td>
                    <td className="px-6 py-4 text-gray-600">{item.courtName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.status === 'CANCELLED' ? 'bg-gray-200 text-gray-500 line-through' :
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
                      <span className={`inline-block w-2 h-2 rounded-full ${item.status === 'ACTIVE' ? 'bg-green-500' :
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
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.status === 'CANCELLED' ? 'bg-gray-200 text-gray-500 line-through' :
                  item.type === 'Reserva' ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'
                  }`}>
                  {item.type}
                </span>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${item.status === 'ACTIVE' ? 'bg-green-500' :
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
            <ResponsiveContainer width="100%" height="100%">
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
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <div className="flex-1 w-full md:w-auto">
              <h5 className="text-lg font-bold text-gray-800 mb-2">Historial del Mes</h5>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousMonth}
                  className="p-1 hover:bg-gray-100 rounded transition text-gray-600 hover:text-gray-900"
                  title="Mes anterior"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <p className="text-sm text-gray-700 font-medium capitalize min-w-[120px] text-center">
                  {(() => {
                    const [year, month] = selectedMonth.split('-').map(Number);
                    const date = new Date(year, month - 1);
                    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                  })()}
                </p>
                <button
                  onClick={goToNextMonth}
                  className="p-1 hover:bg-gray-100 rounded transition text-gray-600 hover:text-gray-900"
                  title="Mes siguiente"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
                <button
                  onClick={goToCurrentMonth}
                  className="ml-2 px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition font-medium"
                  title="Ir al mes actual"
                >
                  Hoy
                </button>
              </div>
            </div>
            <div className="w-full md:w-auto mt-4 md:mt-0 flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end text-right">
              <p className="text-xs text-gray-500 font-medium">Total Ingresos</p>
              <p className={`${monthlyRevenue.toString().length > 9 ? 'text-sm' :
                  monthlyRevenue.toString().length > 7 ? 'text-base' :
                    'text-xl'
                } font-bold text-green-600 transition-all duration-300`}>
                Gs. {monthlyRevenue.toLocaleString('es-PY')}
              </p>
            </div>
          </div>

          {(() => {
            // Aplicar paginación solo si hay más de 10 items
            const shouldPaginate = monthlyHistory.length > 10;
            const pagination = usePagination(monthlyHistory, 10);
            const displayItems = shouldPaginate ? pagination.paginatedItems : monthlyHistory;

            return (
              <>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {displayItems.length > 0 ? (
                    <div className="space-y-3">
                      {displayItems.map((booking) => (
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
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${booking.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
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

                {/* Paginación - Solo mostrar si hay más de 10 items */}
                {shouldPaginate && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>
                        Página {pagination.currentPage} de {pagination.totalPages}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={pagination.prevPage}
                          disabled={!pagination.hasPrevPage}
                          className={`px-2 py-1 rounded ${pagination.hasPrevPage
                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                          ←
                        </button>
                        <button
                          onClick={pagination.nextPage}
                          disabled={!pagination.hasNextPage}
                          className={`px-2 py-1 rounded ${pagination.hasNextPage
                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Active Bookings Modal */}
      {showActiveBookingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowActiveBookingsModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Reservas Activas</h3>
                <p className="text-sm text-gray-500">{selectedDate} • {dailyActiveBookings.length} reservas</p>
              </div>
              <button onClick={() => setShowActiveBookingsModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 bg-white flex justify-end">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium text-sm shadow-sm hover:shadow"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Descargar Reporte PDF
              </button>
            </div>

            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="text-xs uppercase font-bold text-gray-500 border-b border-gray-200">
                    <th className="px-6 py-3">Hora</th>
                    <th className="px-6 py-3">Cancha</th>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3 text-right">Precio</th>
                    <th className="px-6 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dailyActiveBookings.length > 0 ? (
                    dailyActiveBookings.map((booking, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                          {booking.start_time.substring(0, 5)} - {booking.end_time ? booking.end_time.substring(0, 5) : '??:??'}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{booking.court_name || 'Cancha'}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{booking.player_name || 'Cliente'}</div>
                          <div className="text-xs text-gray-500">{booking.player_phone || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          Gs. {booking.price.toLocaleString('es-PY')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${booking.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                            booking.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        No hay reservas activas para esta fecha.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50 font-bold text-gray-900 sticky bottom-0 border-t border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-right">Total:</td>
                    <td className="px-6 py-3 text-right">
                      Gs. {dailyActiveBookings.reduce((sum, b) => sum + b.price, 0).toLocaleString('es-PY')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Customers Ranking Modal */}
      {showCustomersRankingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowCustomersRankingModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">🏆 Ranking de Clientes</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {(() => {
                    const [year, month] = selectedMonth.split('-').map(Number);
                    const date = new Date(year, month - 1);
                    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                  })()} • {uniqueCustomersCount} clientes
                </p>
              </div>
              <button onClick={() => setShowCustomersRankingModal(false)} className="p-2 hover:bg-white rounded-full transition text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-0">
              {customersRanking.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {customersRanking.map((customer, index) => (
                    <div
                      key={index}
                      className={`p-4 hover:bg-gray-50 transition ${index < 3 ? 'bg-gradient-to-r from-yellow-50/30 to-transparent' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Ranking Position */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg' :
                          index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md' :
                            index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md' :
                              'bg-gray-100 text-gray-600'
                          }`}>
                          {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </div>

                        {/* Customer Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900 truncate">{customer.name}</h4>
                            {index < 3 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                Top {index + 1}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">📞 {customer.phone}</p>
                        </div>

                        {/* Stats */}
                        <div className="flex-shrink-0 text-right">
                          <div className="flex items-center gap-2 justify-end mb-1">
                            <span className="text-sm font-medium text-gray-500">Reservas:</span>
                            <span className="text-lg font-bold text-indigo-600">{customer.count}</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            <span className="font-semibold">Gs. {customer.totalRevenue.toLocaleString('es-PY')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm font-medium">No hay clientes este mes</p>
                </div>
              )}
            </div>

            {/* Footer with summary */}
            {customersRanking.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-gray-500">Total clientes:</span>
                      <span className="ml-2 font-bold text-gray-900">{uniqueCustomersCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total reservas:</span>
                      <span className="ml-2 font-bold text-gray-900">
                        {customersRanking.reduce((sum, c) => sum + c.count, 0)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Ingresos totales:</span>
                    <span className="ml-2 font-bold text-green-600">
                      Gs. {customersRanking.reduce((sum, c) => sum + c.totalRevenue, 0).toLocaleString('es-PY')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
};
