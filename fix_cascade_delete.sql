-- 1. Eliminar las restricciones viejas (que bloquean el borrado)
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_venue_id_fkey,
DROP CONSTRAINT IF EXISTS bookings_court_id_fkey;

-- 2. Agregar las nuevas restricciones con "CASCADE" (Borrado en cascada)
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
