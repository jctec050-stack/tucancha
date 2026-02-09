import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

/**
 * Sitemap dinámico para TuCancha
 * Next.js generará automáticamente el sitemap.xml en /sitemap.xml
 * Se ejecuta en build time y en revalidación
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://tucancha.com.py';

    // Rutas estáticas principales
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ];

    // Obtener venues activos para incluir en el sitemap
    let venueRoutes: MetadataRoute.Sitemap = [];

    try {
        const { data: venues, error } = await supabase
            .from('venues')
            .select('id, updated_at')
            .eq('is_active', true)
            .order('updated_at', { ascending: false });

        if (!error && venues) {
            venueRoutes = venues.map((venue) => ({
                url: `${baseUrl}/?venue=${venue.id}`,
                lastModified: new Date(venue.updated_at),
                changeFrequency: 'weekly' as const,
                priority: 0.8,
            }));
        }
    } catch (error) {
        console.error('Error fetching venues for sitemap:', error);
        // Si falla, continuar sin venues dinámicos
    }

    return [...staticRoutes, ...venueRoutes];
}

// Revalidar el sitemap cada 24 horas
export const revalidate = 86400; // 24 horas en segundos
