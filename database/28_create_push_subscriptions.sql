-- Migración: Crear tabla para almacenar push subscriptions
-- Descripción: Tabla para guardar las subscriptions de Web Push API de los usuarios
-- Fecha: 2026-02-10

-- ============================================
-- 1. CREAR TABLA push_subscriptions
-- ============================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    keys JSONB NOT NULL, -- Guarda {p256dh, auth} del subscription
    user_agent TEXT, -- Para debugging
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Un usuario puede tener múltiples subscriptions (diferentes dispositivos)
    -- pero cada endpoint debe ser único para ese usuario
    UNIQUE(user_id, endpoint)
);

-- ============================================
-- 2. ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
ON push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_created_at 
ON push_subscriptions(created_at DESC);

-- ============================================
-- 3. COMENTARIOS
-- ============================================

COMMENT ON TABLE push_subscriptions IS 'Almacena las subscriptions de Web Push API por usuario y dispositivo';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'URL única del push service para este subscription';
COMMENT ON COLUMN push_subscriptions.keys IS 'Claves p256dh y auth para encriptar mensajes push';
COMMENT ON COLUMN push_subscriptions.user_agent IS 'User agent del navegador para identificar dispositivo';
