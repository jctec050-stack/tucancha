import { Inter } from 'next/font/google';
import { AuthProvider } from '@/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'TuCancha! - Reservá tu Cancha',
    description: 'Sistema de gestión y reserva de canchas de padel y beach tennis',
    metadataBase: new URL('https://tucancha.com.py'),
    // Viewport configuration para optimización móvil
    viewport: {
        width: 'device-width',
        initialScale: 1,
        maximumScale: 5,
        userScalable: true,
    },
    icons: {
        icon: [
            { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
            { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
            { url: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
        ],
        shortcut: '/favicon-32x32.png',
        apple: '/apple-touch-icon.png',
    },
    openGraph: {
        title: 'TuCancha! - Reservá tu Cancha',
        description: 'Sistema de gestión y reserva de canchas de padel y beach tennis',
        url: 'https://tucancha.com.py',
        siteName: 'TuCancha',
        images: [
            {
                url: '/logo.png',
                width: 800,
                height: 600,
                alt: 'TuCancha Logo',
            },
        ],
        locale: 'es_PY',
        type: 'website',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body className={inter.className}>
                <ErrorBoundary>
                    <AuthProvider>
                        <div className="flex flex-col min-h-screen">
                            <Navbar />
                            <div className="flex-grow">
                                {children}
                            </div>
                            <Footer />
                        </div>
                    </AuthProvider>
                </ErrorBoundary>
            </body>
        </html>
    );
}
