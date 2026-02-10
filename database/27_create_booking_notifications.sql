-- ============================================
-- MIGRACIÓN: Crear tabla booking_notifications
-- ============================================
-- Fecha: 2026-02-10
-- Propósito: Rastrear notificaciones de recordatorio enviadas a jugadores

-- Crear tabla
CREATE TABLE booking_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('EMAIL', 'SMS', 'WHATSAPP')) DEFAULT 'EMAIL',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED', 'DELIVERED', 'READ')) DEFAULT 'SENT',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_booking_notifications_booking ON booking_notifications(booking_id);
CREATE INDEX idx_booking_notifications_sent ON booking_notifications(sent_at);
CREATE INDEX idx_booking_notifications_status ON booking_notifications(status);
CREATE INDEX idx_booking_notifications_type ON booking_notifications(notification_type);

-- Comentarios
COMMENT ON TABLE booking_notifications IS 'Registro de notificaciones de recordatorio enviadas';
COMMENT ON COLUMN booking_notifications.booking_id IS 'Referencia a la reserva';
COMMENT ON COLUMN booking_notifications.notification_type IS 'Tipo de notificación (EMAIL, SMS, WHATSAPP)';
COMMENT ON COLUMN booking_notifications.status IS 'Estado del envío';

-- Verificación
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'booking_notifications'
ORDER BY ordinal_position;
