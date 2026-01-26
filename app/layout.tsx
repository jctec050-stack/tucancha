import { Inter } from 'next/font/google';
import { AuthProvider } from '@/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'TuCancha! - Reserva tu Cancha',
    description: 'Sistema de gestión y reserva de canchas de padel y beach tennis',
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
                    <Navbar />
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
