'use client';
// components/VenuePublicLinkCard.tsx
// Componente para el dashboard del OWNER que muestra el link público
// del complejo con opciones de copiar, compartir por WhatsApp y editar el slug.

import React, { useState, useCallback } from 'react';
import type { Venue } from '@/types';
import { updateVenueSlug } from '@/services/dataService';
import { sanitizeSlug, isValidSlug } from '@/utils/slugUtils';

interface VenuePublicLinkCardProps {
    venue: Venue;
    onSlugUpdated?: (newSlug: string) => void;
}

const BASE_URL = 'https://tucancha.com.py';

export function VenuePublicLinkCard({ venue, onSlugUpdated }: VenuePublicLinkCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [slugInput, setSlugInput] = useState(venue.slug || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [copyFeedback, setCopyFeedback] = useState(false);

    const publicUrl = venue.slug ? `${BASE_URL}/complejo/${venue.slug}` : null;

    // Extraer número de WhatsApp del contact_info
    const extractPhone = (contact: string | undefined): string | null => {
        if (!contact) return null;
        const cleaned = contact.replace(/[\s\-\(\)\+]/g, '');
        const match = cleaned.match(/\d{8,}/);
        if (!match) return null;
        let number = match[0];
        if (number.startsWith('0')) number = '595' + number.slice(1);
        if (!number.startsWith('595')) number = '595' + number;
        return number;
    };

    const whatsappPhone = extractPhone(venue.contact_info);

    const handleCopy = useCallback(() => {
        if (!publicUrl) return;
        navigator.clipboard.writeText(publicUrl).then(() => {
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
        });
    }, [publicUrl]);

    const handleShareWhatsApp = useCallback(() => {
        if (!publicUrl) return;
        const msg = `¡Reservá tu cancha en ${venue.name}! 🎾\n${publicUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }, [publicUrl, venue.name]);

    const handleSaveSlug = useCallback(async () => {
        const newSlug = sanitizeSlug(slugInput);

        if (!isValidSlug(newSlug)) {
            setSaveError('El link debe tener al menos 3 caracteres y solo letras, números y guiones.');
            return;
        }

        setIsSaving(true);
        setSaveError(null);

        const result = await updateVenueSlug(venue.id, newSlug);

        setIsSaving(false);

        if (result.success) {
            setIsEditing(false);
            setSlugInput(newSlug);
            onSlugUpdated?.(newSlug);
        } else {
            setSaveError(
                result.error === 'SLUG_TAKEN'
                    ? 'Ese link ya está en uso por otro complejo. Elegí uno diferente.'
                    : 'Ocurrió un error al guardar. Intentá de nuevo.'
            );
        }
    }, [slugInput, venue.id, onSlugUpdated]);

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '24px',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(99,102,241,0.15)', borderRadius: '10px', padding: '8px' }}>
                    <svg width="20" height="20" fill="none" stroke="#818cf8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#c7d2fe' }}>Tu Página Pública</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'rgba(199,210,254,0.5)' }}>Compartí este link para que tus clientes vean la disponibilidad</p>
                </div>
            </div>

            {/* URL Display */}
            {!isEditing ? (
                <>
                    {publicUrl ? (
                        <div style={{
                            background: 'rgba(15,23,42,0.5)',
                            border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '16px',
                            overflow: 'hidden',
                        }}>
                            <span style={{ color: 'rgba(99,102,241,0.6)', fontSize: '13px', flexShrink: 0 }}>🔗</span>
                            <span style={{
                                color: '#818cf8',
                                fontSize: '13px',
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                            }}>
                                {publicUrl}
                            </span>
                            <button
                                onClick={() => setIsEditing(true)}
                                title="Editar link"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'rgba(129,140,248,0.6)', flexShrink: 0 }}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            background: 'rgba(245,158,11,0.1)',
                            border: '1px solid rgba(245,158,11,0.25)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            marginBottom: '16px',
                            color: '#fcd34d',
                            fontSize: '13px',
                        }}>
                            ⚠️ Tu complejo aún no tiene un link público generado. Guardá el complejo nuevamente para generar tu link.
                        </div>
                    )}

                    {/* Action Buttons */}
                    {publicUrl && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {/* Copiar */}
                            <button
                                onClick={handleCopy}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    background: copyFeedback ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.15)',
                                    border: `1px solid ${copyFeedback ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.3)'}`,
                                    color: copyFeedback ? '#6ee7b7' : '#a5b4fc',
                                    padding: '8px 16px', borderRadius: '10px',
                                    fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {copyFeedback ? '✓ Copiado' : '📋 Copiar Link'}
                            </button>

                            {/* Compartir WhatsApp */}
                            <button
                                onClick={handleShareWhatsApp}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    background: 'rgba(37,211,102,0.15)',
                                    border: '1px solid rgba(37,211,102,0.3)',
                                    color: '#4ade80',
                                    padding: '8px 16px', borderRadius: '10px',
                                    fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                </svg>
                                Compartir
                            </button>

                            {/* Ver página */}
                            <a
                                href={publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    background: 'rgba(6,182,212,0.15)',
                                    border: '1px solid rgba(6,182,212,0.3)',
                                    color: '#67e8f9',
                                    padding: '8px 16px', borderRadius: '10px',
                                    fontWeight: 700, fontSize: '13px', textDecoration: 'none',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Ver Página
                            </a>
                        </div>
                    )}
                </>
            ) : (
                /* Editor de Slug */
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'rgba(199,210,254,0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Personalizar Link
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15,23,42,0.6)', border: `1px solid ${saveError ? 'rgba(239,68,68,0.5)' : 'rgba(99,102,241,0.3)'}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
                        <span style={{ color: 'rgba(129,140,248,0.5)', fontSize: '13px', padding: '10px 8px 10px 14px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                            tucancha.com.py/complejo/
                        </span>
                        <input
                            type="text"
                            value={slugInput}
                            onChange={e => {
                                setSlugInput(sanitizeSlug(e.target.value));
                                setSaveError(null);
                            }}
                            placeholder="mi-complejo-asuncion"
                            maxLength={60}
                            style={{
                                flex: 1, background: 'none', border: 'none', outline: 'none',
                                color: '#a5b4fc', fontSize: '13px', fontWeight: 700,
                                padding: '10px 14px 10px 0',
                                minWidth: 0,
                            }}
                        />
                    </div>

                    {saveError && (
                        <p style={{ color: '#fca5a5', fontSize: '12px', margin: '0 0 10px' }}>{saveError}</p>
                    )}

                    <p style={{ color: 'rgba(199,210,254,0.4)', fontSize: '11px', margin: '0 0 14px' }}>
                        Solo letras minúsculas, números y guiones. Mínimo 3 caracteres.
                    </p>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleSaveSlug}
                            disabled={isSaving}
                            style={{
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: 'white', padding: '8px 20px', borderRadius: '10px',
                                fontWeight: 700, fontSize: '13px', cursor: isSaving ? 'not-allowed' : 'pointer',
                                border: 'none', opacity: isSaving ? 0.7 : 1,
                                transition: 'opacity 0.2s',
                            }}
                        >
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                            onClick={() => { setIsEditing(false); setSlugInput(venue.slug || ''); setSaveError(null); }}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.5)',
                                padding: '8px 16px', borderRadius: '10px',
                                fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
