'use client';

import React, { useState, useEffect } from 'react';
import { Venue, DisabledSlot, Court } from '@/types';
import { TIME_SLOTS } from '@/constants';
import { DisableSlotModal } from './DisableSlotModal';
import { CourtCard } from './CourtCard';

interface ScheduleManagerProps {
    venue: Venue;
    bookings: any[];
    disabledSlots: DisabledSlot[];
    onToggleSlot: (courtId: string, date: string, timeSlot: string, reason?: string) => Promise<void>;
    selectedDate: string;
    onDateChange: (date: string) => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
    venue,
    bookings,
    disabledSlots,
    onToggleSlot,
    selectedDate,
    onDateChange
}) => {
    const [loading, setLoading] = useState<string>(''); // courtId-timeSlot being toggled
    const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [slotToDisable, setSlotToDisable] = useState<{
        courtId: string;
        timeSlot: string;
        courtName: string;
    } | null>(null);

    const isSlotBooked = (courtId: string, timeSlot: string) => {
        return bookings.some(b =>
            b.court_id === courtId &&
            b.date === selectedDate &&
            b.start_time === timeSlot &&
            b.status === 'ACTIVE'
        );
    };

    const isSlotDisabled = (courtId: string, timeSlot: string) => {
        return disabledSlots.some(ds =>
            ds.court_id === courtId &&
            ds.date === selectedDate &&
            ds.time_slot === timeSlot
        );
    };

    const getSlotStatus = (courtId: string, timeSlot: string) => {
        if (isSlotBooked(courtId, timeSlot)) return 'booked';
        if (isSlotDisabled(courtId, timeSlot)) return 'disabled';
        return 'available';
    };

    const handleSlotClick = async (courtId: string, timeSlot: string, courtName: string) => {
        const currentStatus = getSlotStatus(courtId, timeSlot);

        if (currentStatus === 'available') {
            // Open modal to ask for reason
            setSlotToDisable({ courtId, timeSlot, courtName });
            setIsModalOpen(true);
        } else if (currentStatus === 'disabled') {
            // Directly enable (remove disabled status)
            await processToggle(courtId, timeSlot);
        }
    };

    const processToggle = async (courtId: string, timeSlot: string, reason?: string) => {
        const loadingKey = `${courtId}-${timeSlot}`;
        setLoading(loadingKey);
        try {
            await onToggleSlot(courtId, selectedDate, timeSlot, reason);
        } finally {
            setLoading('');
        }
    };

    const handleConfirmDisable = async (reason: string) => {
        if (slotToDisable) {
            await processToggle(slotToDisable.courtId, slotToDisable.timeSlot, reason);
            setIsModalOpen(false);
            setSlotToDisable(null);
        }
    };

    // Filter courts to display (all or just the selected one)
    const courtsToDisplay = selectedCourtId
        ? venue.courts.filter(c => c.id === selectedCourtId)
        : venue.courts;

    return (
        <div className="space-y-6">
            {!selectedCourtId ? (
                // View 1: Court Selection Grid
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900">Elegí una cancha</h4>
                            <p className="text-gray-500">{venue.courts.length} disponibles para gestionar horarios</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {venue.courts.map(court => (
                            <CourtCard
                                key={court.id}
                                court={court}
                                isSelected={false}
                                onSelect={() => setSelectedCourtId(court.id)}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                // View 2: Schedule Management for Selected Court
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="p-6 border-b border-gray-50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <button
                                    onClick={() => setSelectedCourtId(null)}
                                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-bold mb-2 transition"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Volver a selección
                                </button>
                                <h4 className="text-xl font-bold text-gray-900">Gestión de Horarios</h4>
                            </div>
                            <div className="flex items-center gap-4">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => onDateChange(e.target.value)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-100">
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
                        {courtsToDisplay.map(court => (
                            <div key={court.id}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
                                    <div className="flex items-center gap-4">
                                        {court.image_url && (
                                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200">
                                                <img src={court.image_url} alt={court.name} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                                {court.name}
                                                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded ml-2 uppercase tracking-wide">{court.type}</span>
                                            </h4>
                                            <p className="text-gray-500 text-sm">Gestiona la disponibilidad de esta cancha</p>
                                        </div>
                                    </div>
                                    <span className="text-indigo-600 font-bold bg-indigo-50 px-4 py-2 rounded-xl">
                                        Gs. {court.price_per_hour.toLocaleString('es-PY')}/h
                                    </span>
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
                                                onClick={() => handleSlotClick(court.id, slot, court.name)}
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
                                                <span className={isLoading ? 'opacity-0' : ''}>
                                                    {slot} - {parseInt(slot.split(':')[0]) + 1}:00
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal for Reason */}
            <DisableSlotModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSlotToDisable(null);
                }}
                onConfirm={handleConfirmDisable}
                timeSlot={slotToDisable?.timeSlot || ''}
                courtName={slotToDisable?.courtName || ''}
                date={selectedDate}
            />
        </div>
    );
};
