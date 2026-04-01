// app/complejo/[slug]/not-found.tsx
// Página 404 amigable cuando el slug del complejo no existe

import Link from 'next/link';

export default function ComplejoNoEncontrado() {
    return (
        <div style={{ textAlign: 'center', padding: '80px 16px' }}>
            {/* Icono */}
            <div style={{
                width: '80px', height: '80px',
                background: 'rgba(99,102,241,0.15)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
            }}>
                <svg width="36" height="36" fill="none" stroke="#6366f1" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>

            {/* Texto */}
            <h1 style={{ color: 'white', fontSize: '28px', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.5px' }}>
                Complejo no encontrado
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', maxWidth: '400px', margin: '0 auto 32px', lineHeight: 1.6 }}>
                El complejo que buscás no existe o ya no está disponible en TuCancha.
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link
                    href="/"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: 'white',
                        padding: '12px 28px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '15px',
                        textDecoration: 'none',
                        display: 'inline-block',
                    }}
                >
                    Buscar Complejos
                </Link>
                <Link
                    href="/login"
                    style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.8)',
                        padding: '12px 28px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '15px',
                        textDecoration: 'none',
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'inline-block',
                    }}
                >
                    Iniciar Sesión
                </Link>
            </div>
        </div>
    );
}
