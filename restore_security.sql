-- 1. Habilitar la seguridad de nuevo (Cerrar las puertas)
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

-- 2. Asegurarse de que las políticas son correctas

-- Resetear políticas de Venues
DROP POLICY IF EXISTS "Venues are viewable by everyone" ON public.venues;
DROP POLICY IF EXISTS "Owners can insert own venues" ON public.venues;
DROP POLICY IF EXISTS "Owners can update own venues" ON public.venues;

CREATE POLICY "Venues are viewable by everyone" ON public.venues FOR SELECT USING (true);
CREATE POLICY "Owners can insert own venues" ON public.venues FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own venues" ON public.venues FOR UPDATE USING (auth.uid() = owner_id);

-- Resetear políticas de Courts
DROP POLICY IF EXISTS "Courts are viewable by everyone" ON public.courts;
DROP POLICY IF EXISTS "Owners can manage courts" ON public.courts;

CREATE POLICY "Courts are viewable by everyone" ON public.courts FOR SELECT USING (true);
CREATE POLICY "Owners can manage courts" ON public.courts FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.venues
        WHERE venues.id = courts.venue_id
        AND venues.owner_id = auth.uid()
    )
);

-- Permitir a los dueños borrar sus propios complejos
DROP POLICY IF EXISTS "Owners can delete own venues" ON public.venues;
CREATE POLICY "Owners can delete own venues"
ON public.venues
FOR DELETE
USING (auth.uid() = owner_id);
