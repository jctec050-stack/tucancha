import { Inter } from 'next/font/google';
import { AuthProvider } from '@/AuthContext';
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
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
