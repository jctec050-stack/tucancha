'use client';
// components/public/CourtAvailabilityGrid.tsx
// Grilla de horarios disponibles para una cancha en la página pública.
// Muestra slots LIBRES y OCUPADOS. El click en LIBRE redirige al login para reservar.

import React, { useMemo } from 'react';
import type { Court } from '@/types';

// ============================================
// TIPOS
// ============================================
interface BookedSlot {
    court_id: string;
    start_time: string;
    end_time: string;
}

interface CourtAvailabilityGridProps {
    court: Court;
    openingHours: string;           // Ej: "08:00 - 22:00"
    bookedSlots: BookedSlot[];
    selectedDate: string;
    onReserve: (time: string) => void;
}

interface TimeSlot {
    time: string;   // HH:mm
    isBooked: boolean;
    isPast: boolean;
}

// ============================================
// HELPERS
// ============================================
const parseHourFromOpeningHours = (openingHours: string): { start: number; end: number } => {
    // Formatos soportados: "08:00 - 22:00", "8am - 10pm", "08:00-22:00"
    const match = openingHours.match(/(\d{1,2})(?::(\d{2}))?\s*(?:am|AM)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(?:pm|PM)?/);
    if (!match) return { start: 7, end: 23 };

    let start = parseInt(match[1]);
    let end = parseInt(match[3]);

    // Detectar AM/PM
    const text = openingHours.toLowerCase();
    if (text.includes('pm') && end < 12) end += 12;
    if (text.includes('am') && start > 12) start -= 12;

    // Clamp razonable
    return { start: Math.max(5, start), end: Math.min(24, end) };
};

const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
};

const isSlotBooked = (slotTime: string, bookedSlots: BookedSlot[]): boolean => {
    const slotMinutes = timeToMinutes(slotTime);
    return bookedSlots.some(b => {
        const startMin = timeToMinutes(b.start_time);
        const endMin = timeToMinutes(b.end_time);
        // El slot está ocupado si cae dentro del rango [start, end)
        return slotMinutes >= startMin && slotMinutes < endMin;
    });
};

const isSlotPast = (slotTime: string, selectedDate: string): boolean => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (selectedDate > today) return false;
    if (selectedDate < today) return true;
    // Mismo día: comparar hora
    const [h, m] = slotTime.split(':').map(Number);
    const slotMinutes = h * 60 + m;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return slotMinutes <= nowMinutes;
};

const formatPrice = (price: number): string =>
    new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(price);

// ============================================
// COMPONENTE
// ============================================
export function CourtAvailabilityGrid({
    court,
    openingHours,
    bookedSlots,
    selectedDate,
    onReserve,
}: CourtAvailabilityGridProps) {

    // Generar slots de 1 hora según horarios del complejo
    const slots: TimeSlot[] = useMemo(() => {
        const { start, end } = parseHourFromOpeningHours(openingHours);
        const result: TimeSlot[] = [];

        for (let hour = start; hour < end; hour++) {
            const time = `${String(hour).padStart(2, '0')}:00`;
            result.push({
                time,
                isBooked: isSlotBooked(time, bookedSlots),
                isPast: isSlotPast(time, selectedDate),
            });
        }
        return result;
    }, [openingHours, bookedSlots, selectedDate]);

    const freeCount = slots.filter(s => !s.isBooked && !s.isPast).length;
    const bookedCount = slots.filter(s => s.isBooked).length;

    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '24px',
        }}>
            {/* Header stats */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'white' }}>
                    {court.name}
                </h3>
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    <StatBadge count={freeCount} label="libres" color="#10b981" />
                    <StatBadge count={bookedCount} label="ocupados" color="#ef4444" />
                </div>
            </div>

            {/* Leyenda */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <LegendItem color="#10b981" label="Disponible — click para reservar" />
                <LegendItem color="#ef4444" label="Ocupado" />
                <LegendItem color="rgba(255,255,255,0.15)" label="Pasado / No disponible" />
            </div>

            {/* Grid de slots */}
            {slots.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '14px' }}>
                    No se encontraron horarios para este complejo.
                </p>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '10px',
                }}>
                    {slots.map(slot => (
                        <SlotButton
                            key={slot.time}
                            slot={slot}
                            pricePerHour={court.price_per_hour}
                            onReserve={onReserve}
                        />
                    ))}
                </div>
            )}

            {/* Nota de precio */}
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '16px', marginBottom: 0, textAlign: 'center' }}>
                💡 Precio por hora: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{formatPrice(court.price_per_hour)}</strong>  — Iniciá sesión para reservar
            </p>
        </div>
    );
}

// ============================================
// SUB-COMPONENTES
// ============================================
function SlotButton({ slot, pricePerHour, onReserve }: {
    slot: TimeSlot;
    pricePerHour: number;
    onReserve: (time: string) => void;
}) {
    const { time, isBooked, isPast } = slot;
    const isDisabled = isBooked || isPast;

    // Calcular hora de fin para mostrar
    const [h] = time.split(':').map(Number);
    const endTime = `${String(h + 1).padStart(2, '0')}:00`;

    let bg = 'rgba(16,185,129,0.15)';
    let border = 'rgba(16,185,129,0.35)';
    let color = '#6ee7b7';
    let cursor = 'pointer';
    let hoverBg = 'rgba(16,185,129,0.3)';

    if (isBooked) {
        bg = 'rgba(239,68,68,0.1)';
        border = 'rgba(239,68,68,0.25)';
        color = 'rgba(252,165,165,0.6)';
        cursor = 'not-allowed';
        hoverBg = bg;
    } else if (isPast) {
        bg = 'rgba(255,255,255,0.04)';
        border = 'rgba(255,255,255,0.08)';
        color = 'rgba(255,255,255,0.2)';
        cursor = 'not-allowed';
        hoverBg = bg;
    }

    return (
        <button
            onClick={() => !isDisabled && onReserve(time)}
            disabled={isDisabled}
            title={isBooked ? 'Horario ocupado' : isPast ? 'Horario pasado' : `Reservar ${time} - ${endTime}`}
            style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: '12px',
                padding: '12px 8px',
                cursor,
                color,
                textAlign: 'center',
                transition: 'all 0.15s ease',
                position: 'relative',
                overflow: 'hidden',
            }}
            onMouseEnter={e => {
                if (!isDisabled) {
                    (e.currentTarget as HTMLElement).style.background = hoverBg;
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(16,185,129,0.3)';
                }
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = bg;
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
        >
            {/* Indicador de estado */}
            {isBooked && (
                <div style={{ position: 'absolute', top: '6px', right: '6px', width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
            )}
            {!isDisabled && (
                <div style={{ position: 'absolute', top: '6px', right: '6px', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse-dot 2s infinite' }} />
            )}

            <div style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '-0.5px' }}>{time}</div>
            <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{endTime}</div>

            {isBooked && (
                <div style={{ fontSize: '10px', fontWeight: 700, marginTop: '4px', color: 'rgba(252,165,165,0.7)', background: 'rgba(239,68,68,0.15)', borderRadius: '6px', padding: '2px 6px' }}>
                    Ocupado
                </div>
            )}

            {!isDisabled && (
                <div style={{ fontSize: '10px', fontWeight: 700, marginTop: '4px', color: 'rgba(110,231,183,0.8)', background: 'rgba(16,185,129,0.15)', borderRadius: '6px', padding: '2px 6px' }}>
                    Libre ✓
                </div>
            )}

            <style>{`
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
        </button>
    );
}

function StatBadge({ count, label, color }: { count: number; label: string; color: string }) {
    return (
        <div style={{
            background: `${color}18`,
            border: `1px solid ${color}40`,
            borderRadius: '20px',
            padding: '4px 12px',
            display: 'flex', alignItems: 'center', gap: '6px',
        }}>
            <span style={{ color, fontWeight: 800, fontSize: '14px' }}>{count}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{label}</span>
        </div>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: color, flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{label}</span>
        </div>
    );
}
