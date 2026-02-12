-- 1. Eliminar la restricción UNIQUE actual que bloquea incluso las reservas canceladas
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS unique_booking;

-- 2. Eliminar también la constraint por defecto si existiera (por si acaso no se llamó unique_booking)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_court_id_date_start_time_key;

-- 3. Crear un índice único parcial que solo aplica a reservas ACTIVAS o COMPLETADAS
-- Esto permite tener múltiples reservas CANCELLED en el mismo horario, pero solo una activa.
CREATE UNIQUE INDEX unique_active_booking 
ON bookings (court_id, date, start_time) 
WHERE status != 'CANCELLED';
