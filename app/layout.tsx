import { Inter } from 'next/font/google';
import { AuthProvider } from '@/AuthContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Padel & Beach Tennis Pro Manager',
    description: 'Sistema de gestión de canchas deportivas',
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
