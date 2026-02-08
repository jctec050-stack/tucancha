/** @type {import('next').NextConfig} */
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

    // Optimización de fuentes
    optimizeFonts: true,

    // Configuración de producción
    poweredByHeader: false,

    // SWC minification (más rápido que Terser)
    swcMinify: true,
}

module.exports = nextConfig
