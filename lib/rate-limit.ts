/**
 * Rate Limiting In-Memory para API Routes
 * 
 * IMPORTANTE: Esta implementación es para desarrollo/testing.
 * Para producción con múltiples instancias, usar Upstash Redis o similar.
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// Map para almacenar contadores por IP/identifier
const rateLimitMap = new Map<string, RateLimitEntry>();

// Limpiar entradas expiradas cada 5 minutos
setInterval(() => {
    const now = Date.now();
    // Convertir a array para evitar error de iteración con Map
    Array.from(rateLimitMap.entries()).forEach(([key, entry]) => {
        if (now > entry.resetTime) {
            rateLimitMap.delete(key);
        }
    });
}, 5 * 60 * 1000); // 5 minutos

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    reset: number;
}

/**
 * Verificar si una solicitud está dentro del límite de rate
 * 
 * @param identifier - Identificador único (IP, user ID, etc.)
 * @param limit - Número máximo de requests permitidos
 * @param windowMs - Ventana de tiempo en milisegundos
 * @returns Resultado del check con success, remaining requests y reset time
 */
export function checkRateLimit(
    identifier: string,
    limit: number = 10,
    windowMs: number = 60000 // 1 minuto por defecto
): RateLimitResult {
    const now = Date.now();
    const entry = rateLimitMap.get(identifier);

    // Si no existe o ya expiró, crear nueva entrada
    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(identifier, {
            count: 1,
            resetTime: now + windowMs,
        });

        return {
            success: true,
            remaining: limit - 1,
            reset: now + windowMs,
        };
    }

    // Si ya alcanzó el límite
    if (entry.count >= limit) {
        return {
            success: false,
            remaining: 0,
            reset: entry.resetTime,
        };
    }

    // Incrementar contador
    entry.count += 1;
    rateLimitMap.set(identifier, entry);

    return {
        success: true,
        remaining: limit - entry.count,
        reset: entry.resetTime,
    };
}

/**
 * Obtener IP del cliente desde headers de Next.js
 * Soporta x-forwarded-for, x-real-ip y conexión directa
 */
export function getClientIP(request: Request): string {
    // Vercel y la mayoría de proxies usan x-forwarded-for
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    // Cloudflare y otros usan x-real-ip
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }

    // Fallback para desarrollo local
    return 'anonymous';
}
