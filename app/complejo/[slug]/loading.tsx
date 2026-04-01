// app/complejo/[slug]/loading.tsx
// Skeleton mientras se carga la página pública del complejo

export default function ComplejoPublicoLoading() {
    return (
        <div style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}>
            {/* Hero Skeleton */}
            <div style={{ height: '280px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', marginBottom: '32px' }} />

            {/* Info Cards Skeleton */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }} />
                ))}
            </div>

            {/* Courts Grid Skeleton */}
            <div style={{ height: '24px', width: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '20px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }} />
                ))}
            </div>

            {/* Availability Skeleton */}
            <div style={{ height: '400px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px' }} />

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}
