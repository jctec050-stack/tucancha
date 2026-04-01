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

    // Obtener venues activos con slug para incluir en el sitemap
    let venueRoutes: MetadataRoute.Sitemap = [];

    try {
        const { data: venues, error } = await supabase
            .from('venues')
            .select('slug, updated_at')
            .eq('is_active', true)
            .not('slug', 'is', null)
            .order('updated_at', { ascending: false });

        if (!error && venues) {
            venueRoutes = venues
                .filter(v => v.slug) // solo venues con slug generado
                .map((venue) => ({
                    url: `${baseUrl}/complejo/${venue.slug}`,
                    lastModified: new Date(venue.updated_at),
                    changeFrequency: 'daily' as const,  // disponibilidad cambia frecuente
                    priority: 0.9,                       // alta prioridad (páginas clave)
                }));
        }
    } catch (error) {
        console.error('Error fetching venues for sitemap:', error);
        // Si falla, continuar sin venues dinámicos
    }

    return [...staticRoutes, ...venueRoutes];
}

// Revalidar el sitemap cada 6 horas (más frecuente porque se agregan complejos)
export const revalidate = 21600;
