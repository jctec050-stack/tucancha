// app/complejo/[slug]/page.tsx
// Server Component — SSR con ISR (revalidate 60 seg)
// Accesible sin autenticación.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getVenueBySlug, getPublicAvailability } from '@/services/dataService';
import { VenuePublicPage } from '@/components/public/VenuePublicPage';

// ============================================
// TIPOS
// ============================================
interface PageProps {
    params: { slug: string };
    searchParams: { fecha?: string };
}

// ============================================
// SEO DINÁMICO POR COMPLEJO
// ============================================
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const venue = await getVenueBySlug(params.slug);

    if (!venue) {
        return {
            title: 'Complejo no encontrado | TuCancha',
            description: 'El complejo deportivo que buscás no existe en TuCancha.',
        };
    }

    const description = `Reserva canchas en ${venue.name}. Ubicado en ${venue.address}. Horarios: ${venue.opening_hours}. Canchas disponibles: ${venue.courts.map(c => c.type).join(', ')}.`;

    return {
        title: `${venue.name} — Reserva tu Cancha | TuCancha`,
        description,
        openGraph: {
            title: venue.name,
            description,
            images: venue.image_url ? [{ url: venue.image_url, width: 1200, height: 630, alt: venue.name }] : [],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${venue.name} | TuCancha`,
            description,
            images: venue.image_url ? [venue.image_url] : [],
        },
    };
}

// ============================================
// PAGE COMPONENT (Server Component)
// ============================================
export default async function ComplejoPublicoPage({ params, searchParams }: PageProps) {
    // 1. Obtener venue por slug (sin auth)
    const venue = await getVenueBySlug(params.slug);

    // 2. Si no existe o está inactivo → 404
    if (!venue) {
        notFound();
    }

    // 3. Fecha seleccionada (hoy por defecto)
    const today = new Date().toISOString().split('T')[0];
    const selectedDate = searchParams.fecha || today;

    // 4. Obtener disponibilidad pública (solo court_id + horarios, sin datos de jugadores)
    const bookedSlots = await getPublicAvailability(venue.id, selectedDate);

    return (
        <VenuePublicPage
            venue={venue}
            bookedSlots={bookedSlots}
            selectedDate={selectedDate}
        />
    );
}

// ISR: revalidar cada 60 segundos para mantener disponibilidad actualizada
export const revalidate = 60;
