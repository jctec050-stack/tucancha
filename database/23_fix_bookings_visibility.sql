-- ==============================================================================
-- FIX: VISIBILIDAD DE RESERVAS (Evitar doble reserva visual)
-- ==============================================================================
-- El problema actual es que un usuario "A" no puede ver las reservas del usuario "B"
-- debido a las políticas de seguridad (RLS). Por eso, en el calendario del usuario "A",
-- el horario aparece disponible (blanco) aunque el backend rechace el intento de reserva.
--
-- Esta corrección permite que TODOS puedan leer la tabla de reservas (SELECT),
-- de modo que el frontend pueda pintar de gris/bloqueado los horarios ocupados.

-- 1. Eliminar la política restrictiva anterior
DROP POLICY IF EXISTS "Users can view their own bookings and owners can view venue bookings" ON bookings;

-- 2. Crear nueva política permisiva para lectura (SELECT)
CREATE POLICY "Bookings are viewable by everyone" 
ON bookings FOR SELECT 
USING (true);

-- Nota: Esto permite ver qué horarios están ocupados.
-- La privacidad de datos sensibles (teléfono, email) sigue protegida en la tabla `profiles`
-- si se configura correctamente, aunque por defecto en este proyecto `profiles` también es público
-- para mostrar nombres en los torneos/partidos.
