-- ============================================
-- MIGRACIÓN: Agregar columnas player_name y player_phone a bookings
-- ============================================
-- Fecha: 2026-02-10
-- Propósito: Permitir almacenar información del jugador directamente en la reserva
--            para reservas manuales y recurrentes sin necesidad de crear un perfil.

-- Agregar columnas opcionales
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS player_name TEXT,
ADD COLUMN IF NOT EXISTS player_phone TEXT;

-- Comentarios
COMMENT ON COLUMN bookings.player_name IS 'Nombre del jugador (opcional, para reservas manuales)';
COMMENT ON COLUMN bookings.player_phone IS 'Teléfono del jugador (opcional, para reservas manuales)';

-- Verificación
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name IN ('player_name', 'player_phone', 'notes')
ORDER BY column_name;
