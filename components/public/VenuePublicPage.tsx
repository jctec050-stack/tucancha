'use client';
// components/public/VenuePublicPage.tsx
// Vista completa de la página pública del complejo.
// Client Component para manejar estado de fecha y selección de cancha.

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Venue } from '@/types';
import { CourtAvailabilityGrid } from '@/components/public/CourtAvailabilityGrid';

// ============================================
// TIPOS
// ============================================
interface BookedSlot {
    court_id: string;
    start_time: string;
    end_time: string;
}

interface VenuePublicPageProps {
    venue: Venue;
    bookedSlots: BookedSlot[];
    selectedDate: string;
}

// ============================================
// HELPERS
// ============================================
const SPORT_ICONS: Record<string, string> = {
    'Padel': '🎾',
    'Beach Tennis': '🏖️',
    'Tenis': '🎾',
    'Futbol': '⚽',
};

const SPORT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'Padel': { bg: 'rgba(99,102,241,0.15)', text: '#a5b4fc', border: 'rgba(99,102,241,0.3)' },
    'Beach Tennis': { bg: 'rgba(245,158,11,0.15)', text: '#fcd34d', border: 'rgba(245,158,11,0.3)' },
    'Tenis': { bg: 'rgba(16,185,129,0.15)', text: '#6ee7b7', border: 'rgba(16,185,129,0.3)' },
    'Futbol': { bg: 'rgba(239,68,68,0.15)', text: '#fca5a5', border: 'rgba(239,68,68,0.3)' },
};

const formatPrice = (price: number): string =>
    new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(price);

const formatDate = (dateStr: string): string => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-PY', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
};

// Extraer número de teléfono del contact_info (puede ser número directo o texto con número)
const extractPhone = (contact: string | undefined): string | null => {
    if (!contact) return null;
    // Remover espacios, guiones, paréntesis y el prefijo +595 o 0
    const cleaned = contact.replace(/[\s\-\(\)\+]/g, '');
    // Buscar secuencia de al menos 8 dígitos
    const match = cleaned.match(/\d{8,}/);
    if (!match) return null;
    // Asegurar formato Paraguay 595XXXXXXXXX
    let number = match[0];
    if (number.startsWith('0')) number = '595' + number.slice(1);
    if (!number.startsWith('595')) number = '595' + number;
    return number;
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function VenuePublicPage({ venue, bookedSlots, selectedDate: initialDate }: VenuePublicPageProps) {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [selectedCourtId, setSelectedCourtId] = useState<string | null>(
        venue.courts.length > 0 ? venue.courts[0].id : null
    );
    const [copyFeedback, setCopyFeedback] = useState(false);

    const today = new Date().toISOString().split('T')[0];
    const whatsappPhone = extractPhone(venue.contact_info);
    const selectedCourt = venue.courts.find(c => c.id === selectedCourtId) || venue.courts[0];

    const handleDateChange = useCallback((newDate: string) => {
        setSelectedDate(newDate);
        // Actualizar URL sin perder el slug
        router.push(`?fecha=${newDate}`, { scroll: false });
    }, [router]);

    const handleReserve = useCallback((time: string) => {
        // Guardar intención de reserva y redirigir a login
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('tc_reserve_intent', JSON.stringify({
                venue_id: venue.id,
                court_id: selectedCourtId,
                date: selectedDate,
                time,
                return_to: window.location.pathname + `?fecha=${selectedDate}`,
            }));
        }
        router.push(`/login?redirect=/complejo/${venue.slug}&reserva=1`);
    }, [venue.id, venue.slug, selectedCourtId, selectedDate, router]);

    const handleCopyLink = useCallback(() => {
        const url = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';
        navigator.clipboard.writeText(url).then(() => {
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
        });
    }, []);

    // Géneros únicos de canchas para badges
    const uniqueTypes = Array.from(new Set(venue.courts.map(c => c.type)));

    return (
        <div style={{ color: 'white', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

            {/* ═══════════════════════ HERO ═══════════════════════ */}
            <div style={{
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                marginBottom: '32px',
                minHeight: '280px',
                background: venue.image_url
                    ? `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(15,23,42,0.95)), url(${venue.image_url}) center/cover no-repeat`
                    : 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))',
                border: '1px solid rgba(255,255,255,0.08)',
            }}>
                {/* Overlay gradient bottom */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,1) 0%, transparent 60%)' }} />

                {/* Content */}
                <div style={{ position: 'relative', padding: '40px 32px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '280px' }}>
                    {/* Sport Type Badges */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        {uniqueTypes.map(type => {
                            const colors = SPORT_COLORS[type] || SPORT_COLORS['Padel'];
                            return (
                                <span key={type} style={{
                                    background: colors.bg,
                                    color: colors.text,
                                    border: `1px solid ${colors.border}`,
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    letterSpacing: '0.3px',
                                }}>
                                    {SPORT_ICONS[type]} {type}
                                </span>
                            );
                        })}
                    </div>

                    {/* Nombre del complejo */}
                    <h1 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-1px', lineHeight: 1.1 }}>
                        {venue.name}
                    </h1>

                    {/* Dirección */}
                    <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0 0 20px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {venue.address}
                    </p>

                    {/* Botones de acción */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {/* WhatsApp */}
                        {whatsappPhone && (
                            <a
                                href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Hola! Vi ${venue.name} en TuCancha y quiero consultar disponibilidad.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    background: 'linear-gradient(135deg, #25D366, #128C7E)',
                                    color: 'white', padding: '10px 20px', borderRadius: '12px',
                                    fontWeight: 700, fontSize: '14px', textDecoration: 'none',
                                    boxShadow: '0 4px 20px rgba(37,211,102,0.35)',
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                            >
                                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                </svg>
                                Contactar por WhatsApp
                            </a>
                        )}

                        {/* Copiar link */}
                        <button
                            onClick={handleCopyLink}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                background: copyFeedback ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
                                border: `1px solid ${copyFeedback ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)'}`,
                                color: copyFeedback ? '#6ee7b7' : 'rgba(255,255,255,0.8)',
                                padding: '10px 20px', borderRadius: '12px',
                                fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {copyFeedback ? (
                                <>✓ ¡Link copiado!</>
                            ) : (
                                <>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                    Compartir
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════ INFO CARDS ═══════════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '40px' }}>
                {/* Horarios */}
                <InfoCard
                    icon={<svg width="20" height="20" fill="none" stroke="#6366f1" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    label="Horario"
                    value={venue.opening_hours}
                    color="#6366f1"
                />

                {/* Canchas */}
                <InfoCard
                    icon={<svg width="20" height="20" fill="none" stroke="#8b5cf6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    label="Canchas"
                    value={`${venue.courts.length} ${venue.courts.length === 1 ? 'cancha' : 'canchas'}`}
                    color="#8b5cf6"
                />

                {/* Contacto */}
                {venue.contact_info && (
                    <InfoCard
                        icon={<svg width="20" height="20" fill="none" stroke="#06b6d4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                        label="Contacto"
                        value={venue.contact_info}
                        color="#06b6d4"
                    />
                )}

                {/* Amenidades */}
                {venue.amenities && venue.amenities.length > 0 && (
                    <InfoCard
                        icon={<svg width="20" height="20" fill="none" stroke="#f59e0b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
                        label="Servicios"
                        value={venue.amenities.slice(0, 3).join(' · ')}
                        color="#f59e0b"
                    />
                )}
            </div>

            {/* ═══════════════════════ CANCHAS ═══════════════════════ */}
            <section style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px', letterSpacing: '-0.5px' }}>
                    🏟️ Canchas Disponibles
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                    {venue.courts.map(court => {
                        const colors = SPORT_COLORS[court.type] || SPORT_COLORS['Padel'];
                        const isSelected = court.id === selectedCourtId;
                        return (
                            <button
                                key={court.id}
                                onClick={() => setSelectedCourtId(court.id)}
                                style={{
                                    background: isSelected
                                        ? `linear-gradient(135deg, ${colors.bg.replace('0.15', '0.35')}, ${colors.bg})`
                                        : 'rgba(255,255,255,0.04)',
                                    border: `2px solid ${isSelected ? colors.border.replace('0.3', '0.7') : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: '16px',
                                    padding: '0',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s ease',
                                    overflow: 'hidden',
                                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                    boxShadow: isSelected ? `0 8px 32px ${colors.bg.replace('0.15', '0.4')}` : 'none',
                                }}
                            >
                                {/* Imagen de cancha */}
                                {court.image_url && (
                                    <div style={{ height: '120px', background: `url(${court.image_url}) center/cover` }} />
                                )}
                                {!court.image_url && (
                                    <div style={{ height: '80px', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                                        {SPORT_ICONS[court.type] || '🏟️'}
                                    </div>
                                )}

                                <div style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 800, fontSize: '15px', color: 'white' }}>{court.name}</span>
                                        {isSelected && (
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.text, display: 'block' }} />
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{
                                            background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
                                            padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700
                                        }}>
                                            {court.type}
                                        </span>
                                        <span style={{ color: colors.text, fontWeight: 800, fontSize: '15px' }}>
                                            {formatPrice(court.price_per_hour)}<span style={{ fontWeight: 400, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>/hr</span>
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* ═══════════════════════ DISPONIBILIDAD ═══════════════════════ */}
            <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                        📅 Disponibilidad — <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '16px' }}>{formatDate(selectedDate)}</span>
                    </h2>

                    {/* Date Picker */}
                    <input
                        type="date"
                        value={selectedDate}
                        min={today}
                        max={venue.limit_future_bookings ? today : undefined}
                        onChange={e => handleDateChange(e.target.value)}
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '10px',
                            color: 'white',
                            padding: '8px 14px',
                            fontSize: '14px',
                            fontWeight: 600,
                            outline: 'none',
                            cursor: 'pointer',
                            colorScheme: 'dark',
                        }}
                    />
                </div>

                {selectedCourt ? (
                    <CourtAvailabilityGrid
                        court={selectedCourt}
                        openingHours={venue.opening_hours}
                        bookedSlots={bookedSlots.filter(s => s.court_id === selectedCourt.id)}
                        selectedDate={selectedDate}
                        onReserve={handleReserve}
                    />
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                        Seleccioná una cancha para ver disponibilidad
                    </div>
                )}
            </section>

            {/* ═══════════════════════ CTA RESERVAR ═══════════════════════ */}
            <div style={{
                marginTop: '40px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '20px',
                padding: '32px',
                textAlign: 'center',
            }}>
                <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                    ¿Listo para reservar?
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 24px', fontSize: '15px' }}>
                    Iniciá sesión o creá tu cuenta para confirmar tu reserva en segundos.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a
                        href={`/login?redirect=/complejo/${venue.slug}`}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white', padding: '14px 32px', borderRadius: '14px',
                            fontWeight: 800, fontSize: '15px', textDecoration: 'none',
                            boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
                            display: 'inline-block',
                            transition: 'transform 0.15s ease',
                        }}
                    >
                        🔐 Iniciar Sesión para Reservar
                    </a>
                    <a
                        href={`/register?redirect=/complejo/${venue.slug}`}
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: 'rgba(255,255,255,0.8)', padding: '14px 32px', borderRadius: '14px',
                            fontWeight: 700, fontSize: '15px', textDecoration: 'none',
                            display: 'inline-block',
                        }}
                    >
                        Crear Cuenta Gratis
                    </a>
                </div>
            </div>
        </div>
    );
}

// ============================================
// SUB-COMPONENTE: InfoCard
// ============================================
function InfoCard({ icon, label, value, color }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
        }}>
            <div style={{ background: `${color}22`, borderRadius: '10px', padding: '8px', flexShrink: 0 }}>
                {icon}
            </div>
            <div style={{ minWidth: 0 }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 4px' }}>{label}</p>
                <p style={{ color: 'white', fontWeight: 700, fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
            </div>
        </div>
    );
}
