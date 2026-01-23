-- Script completo para configurar CASCADE DELETE en todas las tablas
-- Esto hace que eliminar un complejo sea instantáneo

-- 1. BOOKINGS: Eliminar automáticamente cuando se elimina venue o court
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_venue_id_fkey,
DROP CONSTRAINT IF EXISTS bookings_court_id_fkey;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_venue_id_fkey
    FOREIGN KEY (venue_id)
    REFERENCES public.venues(id)
    ON DELETE CASCADE;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_court_id_fkey
    FOREIGN KEY (court_id)
    REFERENCES public.courts(id)
    ON DELETE CASCADE;

-- 2. COURTS: Eliminar automáticamente cuando se elimina venue
ALTER TABLE public.courts
DROP CONSTRAINT IF EXISTS courts_venue_id_fkey;

ALTER TABLE public.courts
ADD CONSTRAINT courts_venue_id_fkey
    FOREIGN KEY (venue_id)
    REFERENCES public.venues(id)
    ON DELETE CASCADE;

-- 3. DISABLED_SLOTS: Eliminar automáticamente cuando se elimina venue o court
ALTER TABLE public.disabled_slots
DROP CONSTRAINT IF EXISTS disabled_slots_venue_id_fkey,
DROP CONSTRAINT IF EXISTS disabled_slots_court_id_fkey;

ALTER TABLE public.disabled_slots
ADD CONSTRAINT disabled_slots_venue_id_fkey
    FOREIGN KEY (venue_id)
    REFERENCES public.venues(id)
    ON DELETE CASCADE;

ALTER TABLE public.disabled_slots
ADD CONSTRAINT disabled_slots_court_id_fkey
    FOREIGN KEY (court_id)
    REFERENCES public.courts(id)
    ON DELETE CASCADE;
