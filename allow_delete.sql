-- Permitir a los dueños borrar sus propios complejos
CREATE POLICY "Owners can delete own venues"
ON public.venues
FOR DELETE
USING (auth.uid() = owner_id);
