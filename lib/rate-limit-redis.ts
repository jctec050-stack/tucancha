/**
 * Rate Limiting con Upstash Redis
 * 
 * Implementación distribuida de rate limiting que funciona 
 * correctamente con múltiples instancias en Vercel.
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Crear instancia de Redis
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * Rate limiter para API de envío de emails
 * Límite: 10 requests por minuto por IP
 */
export const emailRatelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests por minuto
    analytics: true, // Habilitar analytics en dashboard Upstash
    prefix: "ratelimit:email", // Namespace para organizar keys
})

/**
 * Obtener IP del cliente de forma confiable
 * Prioriza headers de Vercel que son más confiables
 * 
 * @param request - Request object de Next.js
 * @returns IP address del cliente
 */
export function getClientIP(request: Request): string {
    // 1. Priorizar header de Vercel (más confiable, no falsificable)
    const vercelIP = request.headers.get('x-vercel-forwarded-for')
    if (vercelIP) {
        return vercelIP.split(',')[0].trim()
    }

    // 2. Fallback a x-forwarded-for estándar
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
        return forwarded.split(',')[0].trim()
    }

    // 3. Fallback a x-real-ip
    const realIP = request.headers.get('x-real-ip')
    if (realIP) {
        return realIP
    }

    // 4. Último fallback
    return 'unknown'
}
