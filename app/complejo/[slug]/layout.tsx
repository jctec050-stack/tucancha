// app/complejo/[slug]/layout.tsx
// Layout público mínimo — sin navbar de autenticación, sin sidebar
// Cualquier persona puede acceder sin login

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'TuCancha — Complejos Deportivos',
};

export default function ComplejoPublicoLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
            {/* Minimal Header */}
            <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', background: 'rgba(15,23,42,0.8)' }} className="sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    {/* Logo */}
                    <a href="/" className="flex items-center gap-2 no-underline">
                        <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px', padding: '6px 10px' }}>
                            <span style={{ color: 'white', fontWeight: 900, fontSize: '14px', letterSpacing: '-0.5px' }}>Tu</span>
                            <span style={{ color: '#c4b5fd', fontWeight: 900, fontSize: '14px' }}>Cancha</span>
                        </div>
                    </a>

                    {/* CTA Login */}
                    <a
                        href="/login"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white',
                            padding: '8px 20px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '14px',
                            textDecoration: 'none',
                            transition: 'opacity 0.2s ease',
                        }}
                    >
                        Iniciar Sesión
                    </a>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 py-8">
                {children}
            </main>

            {/* Footer mínimo */}
            <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', margin: 0 }}>
                    Powered by <strong style={{ color: 'rgba(255,255,255,0.5)' }}>TuCancha</strong> — La plataforma de reservas deportivas del Paraguay
                </p>
            </footer>
        </div>
    );
}
