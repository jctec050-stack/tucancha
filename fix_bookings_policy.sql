-- Permitir a los jugadores crear sus propias reservas
CREATE POLICY "Players can insert own bookings"
ON public.bookings
FOR INSERT
WITH CHECK (auth.uid() = player_id);

-- Opcional: Permitir a los dueños gestionar (Update/Delete) reservas de sus canchas
CREATE POLICY "Owners can manage bookings for their venues"
ON public.bookings
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = bookings.venue_id
        AND venues.owner_id = auth.uid()
    )
);
