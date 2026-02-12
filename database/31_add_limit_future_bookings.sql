-- Agregar columna para limitar reservas futuras a solo el día actual
ALTER TABLE venues 
ADD COLUMN limit_future_bookings BOOLEAN DEFAULT FALSE;

-- Comentario para documentación
COMMENT ON COLUMN venues.limit_future_bookings IS 'Si es TRUE, los jugadores solo pueden reservar para el día actual.';
