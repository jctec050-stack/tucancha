'use client';

import React, { useState, useEffect } from 'react';
import { Venue, DisabledSlot } from '@/types';
import { TIME_SLOTS } from '@/constants';

interface ScheduleManagerProps {
    venue: Venue;
    bookings: any[];
    disabledSlots: DisabledSlot[];
    onToggleSlot: (courtId: string, date: string, timeSlot: string) => Promise<void>;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
    venue,
    bookings,
    disabledSlots,
    onToggleSlot
}) => {
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [loading, setLoading] = useState<string>(''); // courtId-timeSlot being toggled

    useEffect(() => {
        setSelectedDate(new Date().toISOString().split('T')[0]);
    }, []);

    const isSlotBooked = (courtId: string, timeSlot: string) => {
        return bookings.some(b =>
            b.courtId === courtId &&
            b.date === selectedDate &&
            b.startTime === timeSlot &&
            b.status === 'ACTIVE'
        );
    };

    const isSlotDisabled = (courtId: string, timeSlot: string) => {
        return disabledSlots.some(ds =>
            ds.courtId === courtId &&
            ds.date === selectedDate &&
            ds.timeSlot === timeSlot
        );
    };

    const handleToggle = async (courtId: string, timeSlot: string) => {
        const loadingKey = `${courtId}-${timeSlot}`;
        setLoading(loadingKey);
        try {
            await onToggleSlot(courtId, selectedDate, timeSlot);
        } finally {
            setLoading('');
        }
    };

    const getSlotStatus = (courtId: string, timeSlot: string) => {
        if (isSlotBooked(courtId, timeSlot)) return 'booked';
        if (isSlotDisabled(courtId, timeSlot)) return 'disabled';
        return 'available';
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h4 className="text-lg font-bold text-gray-900">Gestión de Horarios</h4>
                        <p className="text-sm text-gray-500 mt-1">Habilita o deshabilita horarios para tus canchas</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        />
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
                        <span className="text-xs font-medium text-gray-600">Disponible</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded"></div>
                        <span className="text-xs font-medium text-gray-600">Deshabilitado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded line-through"></div>
                        <span className="text-xs font-medium text-gray-600">Reservado</span>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-8">
                {venue.courts.map(court => (
                    <div key={court.id} className="animate-in fade-in duration-500">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <div className={`w-2 h-6 rounded-full ${court.type === 'Padel' ? 'bg-indigo-500' : 'bg-orange-400'}`}></div>
                                {court.name}
                                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded ml-2">{court.type}</span>
                            </h4>
                            <span className="text-indigo-600 font-bold">Gs. {court.pricePerHour.toLocaleString('es-PY')}/h</span>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {TIME_SLOTS.map(slot => {
                                const status = getSlotStatus(court.id, slot);
                                const loadingKey = `${court.id}-${slot}`;
                                const isLoading = loading === loadingKey;

                                return (
                                    <button
                                        key={slot}
                                        disabled={status === 'booked' || isLoading}
                                        onClick={() => handleToggle(court.id, slot)}
                                        className={`
                                            py-3 rounded-xl font-bold text-sm transition-all relative
                                            ${status === 'available'
                                                ? 'bg-green-50 border-2 border-green-500 text-green-700 hover:bg-green-100 active:scale-95'
                                                : status === 'disabled'
                                                    ? 'bg-red-50 border-2 border-red-500 text-red-700 hover:bg-red-100 active:scale-95'
                                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed border-2 border-gray-300 line-through'
                                            }
                                            ${isLoading ? 'opacity-50 cursor-wait' : ''}
                                        `}
                                    >
                                        {isLoading ? (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        ) : null}
                                        <span className={isLoading ? 'opacity-0' : ''}>{slot}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
