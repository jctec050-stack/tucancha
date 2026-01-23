-- ============================================
-- FIX: RECURSIÓN INFINITA EN POLÍTICAS RLS
-- ============================================

-- 1. Crear función segura para verificar si es admin
-- SECURITY DEFINER permite que esta función se ejecute con los permisos del creador (postgres),
-- evitando las políticas RLS de la tabla profiles y rompiendo el ciclo.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Eliminar la política recursiva
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- 3. Crear nueva política usando la función segura
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (is_admin());

-- También vamos a optimizar las otras políticas de admin para usar esta función
-- y evitar duplicación de lógica

-- Subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON subscriptions FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can create subscriptions" ON subscriptions;
CREATE POLICY "Admins can create subscriptions" ON subscriptions FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update subscriptions" ON subscriptions;
CREATE POLICY "Admins can update subscriptions" ON subscriptions FOR UPDATE USING (is_admin());

-- Bookings
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
CREATE POLICY "Admins can view all bookings" ON bookings FOR SELECT USING (is_admin());

-- Payments
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
CREATE POLICY "Admins can view all payments" ON payments FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can update payments" ON payments;
CREATE POLICY "Admins can update payments" ON payments FOR UPDATE USING (is_admin());

-- Venues (Owner policy already handles admin via OR, but let's check it)
-- "Owners can view own venues" usa recursión explícita: 
-- EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
-- Vamos a reemplazarla también.
DROP POLICY IF EXISTS "Owners can view own venues" ON venues;
CREATE POLICY "Owners can view own venues"
    ON venues FOR SELECT
    USING (auth.uid() = owner_id OR is_admin());

COMMENT ON FUNCTION is_admin() IS 'Verifica si el usuario actual es admin de forma segura (Bypass RLS)';
