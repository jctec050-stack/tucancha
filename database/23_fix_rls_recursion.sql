-- ============================================
-- FIX DEFINITIVO: Timeout y Recursión en RLS
-- ============================================
-- Este script soluciona el error "Profile fetch timed out".
-- El problema es causado por políticas RLS que se llaman a sí mismas en bucle
-- (ej: para ver si soy admin, consulto profiles, lo cual dispara la política de profiles que consulta si soy admin...)

-- PASO 1: Función Segura para obtener el Rol
-- Usamos SECURITY DEFINER para saltarnos las políticas RLS al leer el rol.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- ¡Crucial! Ejecuta con permisos de sistema, ignorando RLS
SET search_path = public -- Seguridad: fuerza el esquema public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Si no hay usuario logueado, retorna null
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN v_role;
END;
$$;

-- PASO 2: Simplificar Políticas de Profiles (Romper el ciclo en el origen)
-- Hacemos la lectura 100% pública y sin condiciones complejas.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- PASO 3: Corregir Políticas que dependen del Rol (Usar la función segura)

-- Bookings (Reservas)
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
CREATE POLICY "Admins can view all bookings" ON bookings FOR SELECT 
USING (get_my_role() = 'ADMIN');

-- Subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON subscriptions FOR SELECT 
USING (get_my_role() = 'ADMIN');

-- Payments
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
CREATE POLICY "Admins can view all payments" ON payments FOR SELECT 
USING (get_my_role() = 'ADMIN');

-- Venues
-- Anteriormente: EXISTS (SELECT 1 FROM profiles ...) -> CAUSA RECURSIÓN
-- Ahora: get_my_role() = 'OWNER' -> SEGURO
DROP POLICY IF EXISTS "Owners can insert their own venues" ON venues;
CREATE POLICY "Owners can insert their own venues" ON venues FOR INSERT 
WITH CHECK (auth.uid() = owner_id AND get_my_role() = 'OWNER');
