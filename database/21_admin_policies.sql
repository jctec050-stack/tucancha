-- ============================================
-- PASO 21: POLÍTICAS PARA ADMINISTRADORES
-- ============================================

-- 1. BOOKINGS: Permitir a admins ver todas las reservas
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
CREATE POLICY "Admins can view all bookings" 
ON bookings FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- 2. SUBSCRIPTIONS: Habilitar RLS y políticas
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Admins ven todo
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
CREATE POLICY "Admins can view all subscriptions" 
ON subscriptions FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Dueños ven su propia suscripción
DROP POLICY IF EXISTS "Owners can view own subscription" ON subscriptions;
CREATE POLICY "Owners can view own subscription" 
ON subscriptions FOR SELECT 
USING (auth.uid() = owner_id);

-- 3. PAYMENTS: Habilitar RLS y políticas
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Admins ven todo
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
CREATE POLICY "Admins can view all payments" 
ON payments FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Usuarios ven sus propios pagos
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Users can view own payments" 
ON payments FOR SELECT 
USING (auth.uid() = payer_id);
