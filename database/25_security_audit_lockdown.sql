-- ==============================================================================
-- AUDITORÍA Y BLINDAJE DE SEGURIDAD (SECURITY LOCKDOWN)
-- FECHA: 2026-02-05
-- DESCRIPCIÓN: Este script es la VERDAD ÚNICA sobre la seguridad de la base de datos.
--              1. Elimina TODAS las políticas previas (limpia parches viejos).
--              2. Asegura RLS en todas las tablas críticas.
--              3. Reinstala la función anti-recursión `get_my_role`.
--              4. Aplica políticas estrictas para Admin, Dueños y Jugadores.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. FUNCIÓN DE UTILIDAD CRÍTICA (Anti-Recursión)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos de superusuario para saltar RLS
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN v_role;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. LIMPIEZA TOTAL (DROP de políticas existentes para evitar conflictos)
-- ------------------------------------------------------------------------------

-- Profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Venues
DROP POLICY IF EXISTS "Venues are viewable by everyone" ON venues;
DROP POLICY IF EXISTS "Owners can insert their own venues" ON venues;
DROP POLICY IF EXISTS "Owners can insert venues" ON venues;
DROP POLICY IF EXISTS "Owners can update their own venues" ON venues;
DROP POLICY IF EXISTS "Owners can update own venues" ON venues;
DROP POLICY IF EXISTS "Owners can delete their own venues" ON venues;
DROP POLICY IF EXISTS "Owners can delete own venues" ON venues;
DROP POLICY IF EXISTS "Admins can manage all venues" ON venues;

-- Courts
DROP POLICY IF EXISTS "Courts are viewable by everyone" ON courts;
DROP POLICY IF EXISTS "Owners can insert courts for their venues" ON courts;
DROP POLICY IF EXISTS "Owners can update courts for their venues" ON courts;
DROP POLICY IF EXISTS "Owners can delete courts for their venues" ON courts;
DROP POLICY IF EXISTS "Owners can manage courts" ON courts;

-- Bookings
DROP POLICY IF EXISTS "Users can view their own bookings and owners can view venue bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings and owners can manage venue bookings" ON bookings;
DROP POLICY IF EXISTS "Users can delete own bookings and owners can manage venue bookings" ON bookings;
DROP POLICY IF EXISTS "Bookings Visibility" ON bookings;
DROP POLICY IF EXISTS "Authenticated can create bookings" ON bookings;
DROP POLICY IF EXISTS "Bookings Management" ON bookings;
DROP POLICY IF EXISTS "Bookings Deletion" ON bookings;

-- Subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Owners can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Owners can update own subscription" ON subscriptions;
DROP POLICY IF EXISTS "System can insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Subscriptions Visibility" ON subscriptions;
DROP POLICY IF EXISTS "Subscriptions Management" ON subscriptions;
DROP POLICY IF EXISTS "Subscriptions Creation" ON subscriptions;

-- Payments
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Payments Visibility" ON payments;
DROP POLICY IF EXISTS "Payments Creation" ON payments;
DROP POLICY IF EXISTS "Payments Admin Update" ON payments;

-- Disabled Slots
DROP POLICY IF EXISTS "Disabled slots are viewable by everyone" ON disabled_slots;
DROP POLICY IF EXISTS "Owners can manage disabled slots" ON disabled_slots;
DROP POLICY IF EXISTS "Disabled slots viewable" ON disabled_slots;
DROP POLICY IF EXISTS "Manage disabled slots" ON disabled_slots;

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications (mark read)" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications for others" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Own notifications" ON notifications;
DROP POLICY IF EXISTS "Create notifications" ON notifications;


-- ------------------------------------------------------------------------------
-- 3. HABILITACIÓN FORZOSA DE RLS (Seguridad por defecto)
-- ------------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE disabled_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------------------------
-- 4. APLICACIÓN DE POLÍTICAS ESTRICTAS (POLICIES)
-- ------------------------------------------------------------------------------

-- === PROFILES ===
-- Lectura pública para que la UI pueda mostrar nombres en reservas/complejos
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT USING (true);

-- Escritura: Solo el dueño de la cuenta o un Admin
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE USING (auth.uid() = id OR get_my_role() = 'ADMIN');

-- Insert: Permitir al registrarse
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);


-- === VENUES (Complejos) ===
-- Lectura pública
CREATE POLICY "Venues are viewable by everyone" 
ON venues FOR SELECT USING (true);

-- Escritura: Solo Dueños (sus propios complejos) o Admins
CREATE POLICY "Owners can insert venues" 
ON venues FOR INSERT 
WITH CHECK (
  (auth.uid() = owner_id AND get_my_role() = 'OWNER') OR get_my_role() = 'ADMIN'
);

CREATE POLICY "Owners can update own venues" 
ON venues FOR UPDATE 
USING (
  (auth.uid() = owner_id) OR get_my_role() = 'ADMIN'
);

CREATE POLICY "Owners can delete own venues" 
ON venues FOR DELETE 
USING (
  (auth.uid() = owner_id) OR get_my_role() = 'ADMIN'
);


-- === COURTS (Canchas) ===
-- Lectura pública
CREATE POLICY "Courts are viewable by everyone" 
ON courts FOR SELECT USING (true);

-- Escritura: Dueños del complejo padre o Admins
-- Usamos EXISTS para verificar la propiedad del venue padre
CREATE POLICY "Owners can manage courts" 
ON courts FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM venues 
    WHERE id = venue_id 
    AND owner_id = auth.uid()
  ) 
  OR get_my_role() = 'ADMIN'
);


-- === BOOKINGS (Reservas) ===
-- Lectura: Jugador propio, Dueño del complejo, o Admin
CREATE POLICY "Bookings Visibility" 
ON bookings FOR SELECT 
USING (
  auth.uid() = player_id 
  OR EXISTS (SELECT 1 FROM venues WHERE id = bookings.venue_id AND owner_id = auth.uid())
  OR get_my_role() = 'ADMIN'
);

-- Insert: Cualquier usuario autenticado (Jugadores o Admins/Dueños agendando)
CREATE POLICY "Authenticated can create bookings" 
ON bookings FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Update/Delete: Jugador (cancelar suya), Dueño (gestionar su cancha), Admin
CREATE POLICY "Bookings Management" 
ON bookings FOR UPDATE 
USING (
  auth.uid() = player_id 
  OR EXISTS (SELECT 1 FROM venues WHERE id = bookings.venue_id AND owner_id = auth.uid())
  OR get_my_role() = 'ADMIN'
);

CREATE POLICY "Bookings Deletion" 
ON bookings FOR DELETE 
USING (
  auth.uid() = player_id 
  OR EXISTS (SELECT 1 FROM venues WHERE id = bookings.venue_id AND owner_id = auth.uid())
  OR get_my_role() = 'ADMIN'
);


-- === SUBSCRIPTIONS (Suscripciones) ===
-- Lectura: Admin ve todo, Dueño ve la suya
CREATE POLICY "Subscriptions Visibility" 
ON subscriptions FOR SELECT 
USING (
  (owner_id = auth.uid()) OR get_my_role() = 'ADMIN'
);

-- Update: Dueño (para cancelar) o Admin (para aprobar/modificar)
CREATE POLICY "Subscriptions Management" 
ON subscriptions FOR UPDATE 
USING (
  (owner_id = auth.uid()) OR get_my_role() = 'ADMIN'
);

-- Insert: Admin o Sistema (normalmente via backend, pero permitimos insert autenticado si flujo es client-side)
CREATE POLICY "Subscriptions Creation" 
ON subscriptions FOR INSERT 
WITH CHECK (
  (owner_id = auth.uid()) OR get_my_role() = 'ADMIN'
);


-- === PAYMENTS (Pagos) ===
-- Lectura: Admin ve todo, Pagador ve los suyos
CREATE POLICY "Payments Visibility" 
ON payments FOR SELECT 
USING (
  (payer_id = auth.uid()) OR get_my_role() = 'ADMIN'
);

-- Insert: Pagador (al subir comprobante) o Admin
CREATE POLICY "Payments Creation" 
ON payments FOR INSERT 
WITH CHECK (
  (payer_id = auth.uid()) OR get_my_role() = 'ADMIN'
);

-- Update: Solo Admin (aprobar pagos)
CREATE POLICY "Payments Admin Update" 
ON payments FOR UPDATE 
USING (get_my_role() = 'ADMIN');


-- === DISABLED SLOTS (Bloqueos) ===
-- Lectura pública
CREATE POLICY "Disabled slots viewable" 
ON disabled_slots FOR SELECT USING (true);

-- Escritura: Dueño del complejo o Admin
CREATE POLICY "Manage disabled slots" 
ON disabled_slots FOR ALL 
USING (
  EXISTS (SELECT 1 FROM venues WHERE id = venue_id AND owner_id = auth.uid())
  OR get_my_role() = 'ADMIN'
);


-- === NOTIFICATIONS ===
-- Lectura/Update: Solo el receptor
CREATE POLICY "Own notifications" 
ON notifications FOR ALL 
USING (user_id = auth.uid());

-- Insert: Cualquiera autenticado (para enviar notificaciones a otros, ej: sistema de reservas)
CREATE POLICY "Create notifications" 
ON notifications FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');


COMMIT;
