import { MetadataRoute } from 'next';

/**
 * Robots.txt dinámico para TuCancha
 * Next.js generará automáticamente el robots.txt en /robots.txt
 * Esto complementa el archivo estático en /public/robots.txt
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/dashboard/', '/admin/', '/api/', '/login', '/register', '/reset-password'],
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
            },
            {
                userAgent: ['AhrefsBot', 'SemrushBot'],
                crawlDelay: 10,
            },
            {
                userAgent: ['MJ12bot', 'DotBot'],
                disallow: '/',
            },
        ],
        sitemap: 'https://tucancha.com.py/sitemap.xml',
    };
}
