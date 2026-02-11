/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    importScripts: ['/custom-sw.js'], // Import custom logic
    disable: process.env.NODE_ENV === 'development',
    runtimeCaching: [
        {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'google-fonts',
                expiration: {
                    maxEntries: 4,
                    maxAgeSeconds: 365 * 24 * 60 * 60 // 1 año
                }
            }
        },
        {
            urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'static-font-assets',
                expiration: {
                    maxEntries: 4,
                    maxAgeSeconds: 7 * 24 * 60 * 60 // 1 semana
                }
            }
        },
        {
            urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'static-image-assets',
                expiration: {
                    maxEntries: 64,
                    maxAgeSeconds: 24 * 60 * 60 // 24 horas
                }
            }
        },
        {
            urlPattern: /\.(?:js)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'static-js-assets',
                expiration: {
                    maxEntries: 32,
                    maxAgeSeconds: 24 * 60 * 60 // 24 horas
                }
            }
        },
        {
            urlPattern: /\.(?:css|less)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'static-style-assets',
                expiration: {
                    maxEntries: 32,
                    maxAgeSeconds: 24 * 60 * 60 // 24 horas
                }
            }
        },
        {
            urlPattern: /\/api\/.*$/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'apis',
                expiration: {
                    maxEntries: 16,
                    maxAgeSeconds: 24 * 60 * 60 // 24 horas
                },
                networkTimeoutSeconds: 10
            }
        },
        {
            urlPattern: /.*/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'others',
                expiration: {
                    maxEntries: 32,
                    maxAgeSeconds: 24 * 60 * 60 // 24 horas
                },
                networkTimeoutSeconds: 10
            }
        }
    ]
});

const nextConfig = {
    // Optimización de imágenes
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'aynoabizwajdhrxjnhgq.supabase.co',
                pathname: '/storage/v1/object/public/**',
            },
        ],
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },

    // Optimización de compilación
    reactStrictMode: true,

    // Comprimir outputs
    compress: true,

    // Configuración de producción
    poweredByHeader: false,
}

module.exports = withPWA(nextConfig)
