import { Inter } from 'next/font/google';
import { AuthProvider } from '@/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'TuCancha! - Reservá tu Cancha',
    description: 'Sistema de gestión y reserva de canchas de padel y beach tennis',
    metadataBase: new URL('https://tucancha.com.py'),
    icons: {
        icon: '/logo.png',
        shortcut: '/logo.png',
        apple: '/logo.png',
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
                <AuthProvider>
                    <div className="flex flex-col min-h-screen">
                        <Navbar />
                        <div className="flex-grow">
                            {children}
                        </div>
                        <Footer />
                    </div>
                </AuthProvider>
            </body>
        </html>
    );
}
