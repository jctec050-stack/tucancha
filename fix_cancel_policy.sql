-- Permitir a los jugadores actualizar (cancelar) sus propias reservas
CREATE POLICY "Players can update own bookings"
ON public.bookings
FOR UPDATE
USING (auth.uid() = player_id)
WITH CHECK (auth.uid() = player_id);
