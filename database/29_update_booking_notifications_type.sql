-- Migración: Actualizar tabla booking_notifications para soportar PUSH
-- Descripción: Agregar 'PUSH' como tipo de notificación válido
-- Fecha: 2026-02-10

-- ============================================
-- ACTUALIZAR CONSTRAINT
-- ============================================

-- Eliminar constraint antiguo
ALTER TABLE booking_notifications 
DROP CONSTRAINT IF EXISTS booking_notifications_notification_type_check;

-- Crear nuevo constraint con PUSH incluido
ALTER TABLE booking_notifications 
ADD CONSTRAINT booking_notifications_notification_type_check 
CHECK (notification_type IN ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH'));

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON COLUMN booking_notifications.notification_type IS 'Tipo de notificación: EMAIL, SMS, WHATSAPP, PUSH';
