-- ============================================
-- PASO 3: POLÍTICAS RLS (Row Level Security)
-- ============================================
-- Este script configura todas las políticas de seguridad a nivel de fila.

-- ============================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE disabled_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA: profiles
-- ============================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Los usuarios pueden insertar su propio perfil (al registrarse)
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Los admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- ============================================
-- POLÍTICAS PARA: venues
-- ============================================

-- Todos pueden ver venues activos (para jugadores)
CREATE POLICY "Anyone can view active venues"
    ON venues FOR SELECT
    USING (is_active = true);

-- Los dueños pueden ver sus propios venues (incluso inactivos)
CREATE POLICY "Owners can view own venues"
    ON venues FOR SELECT
    USING (
        auth.uid() = owner_id OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Los dueños pueden crear venues
CREATE POLICY "Owners can create venues"
    ON venues FOR INSERT
    WITH CHECK (
        auth.uid() = owner_id AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'OWNER'
        )
    );

-- Los dueños pueden actualizar sus propios venues
CREATE POLICY "Owners can update own venues"
    ON venues FOR UPDATE
    USING (auth.uid() = owner_id);

-- Los dueños pueden eliminar sus propios venues
CREATE POLICY "Owners can delete own venues"
    ON venues FOR DELETE
    USING (auth.uid() = owner_id);

-- ============================================
-- POLÍTICAS PARA: courts
-- ============================================

-- Todos pueden ver courts de venues activos
CREATE POLICY "Anyone can view courts of active venues"
    ON courts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM venues
            WHERE venues.id = courts.venue_id AND venues.is_active = true
        )
    );

-- Los dueños pueden ver todas sus courts
CREATE POLICY "Owners can view own courts"
    ON courts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM venues
            WHERE venues.id = courts.venue_id AND venues.owner_id = auth.uid()
        )
    );

-- Los dueños pueden crear courts en sus venues
CREATE POLICY "Owners can create courts in own venues"
    ON courts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM venues
            WHERE venues.id = courts.venue_id AND venues.owner_id = auth.uid()
        )
    );

-- Los dueños pueden actualizar sus courts
CREATE POLICY "Owners can update own courts"
    ON courts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM venues
            WHERE venues.id = courts.venue_id AND venues.owner_id = auth.uid()
        )
    );

-- Los dueños pueden eliminar sus courts
CREATE POLICY "Owners can delete own courts"
    ON courts FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM venues
            WHERE venues.id = courts.venue_id AND venues.owner_id = auth.uid()
        )
    );

-- ============================================
-- POLÍTICAS PARA: bookings
-- ============================================

-- Los jugadores pueden ver sus propias reservas
CREATE POLICY "Players can view own bookings"
    ON bookings FOR SELECT
    USING (auth.uid() = player_id);

-- Los dueños pueden ver reservas de sus venues
CREATE POLICY "Owners can view venue bookings"
    ON bookings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM venues
            WHERE venues.id = bookings.venue_id AND venues.owner_id = auth.uid()
        )
    );

-- Los admins pueden ver todas las reservas
CREATE POLICY "Admins can view all bookings"
    ON bookings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Los jugadores pueden crear reservas
CREATE POLICY "Players can create bookings"
    ON bookings FOR INSERT
    WITH CHECK (
        auth.uid() = player_id AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'PLAYER'
        )
    );

-- Los jugadores pueden actualizar sus propias reservas (cancelar)
CREATE POLICY "Players can update own bookings"
    ON bookings FOR UPDATE
    USING (auth.uid() = player_id);

-- Los dueños pueden actualizar reservas de sus venues
CREATE POLICY "Owners can update venue bookings"
    ON bookings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM venues
            WHERE venues.id = bookings.venue_id AND venues.owner_id = auth.uid()
        )
    );

-- Los jugadores pueden eliminar sus propias reservas canceladas
CREATE POLICY "Players can delete own cancelled bookings"
    ON bookings FOR DELETE
    USING (auth.uid() = player_id AND status = 'CANCELLED');

-- Los dueños pueden eliminar reservas de sus venues
CREATE POLICY "Owners can delete venue bookings"
    ON bookings FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM venues
            WHERE venues.id = bookings.venue_id AND venues.owner_id = auth.uid()
        )
    );

-- ============================================
-- POLÍTICAS PARA: disabled_slots
-- ============================================

-- Todos pueden ver slots bloqueados (para evitar reservas)
CREATE POLICY "Anyone can view disabled slots"
    ON disabled_slots FOR SELECT
    USING (true);

-- Los dueños pueden crear slots bloqueados en sus venues
CREATE POLICY "Owners can create disabled slots"
    ON disabled_slots FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM venues
            WHERE venues.id = disabled_slots.venue_id AND venues.owner_id = auth.uid()
        ) AND
        auth.uid() = created_by
    );

-- Los dueños pueden eliminar slots bloqueados de sus venues
CREATE POLICY "Owners can delete disabled slots"
    ON disabled_slots FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM venues
            WHERE venues.id = disabled_slots.venue_id AND venues.owner_id = auth.uid()
        )
    );

-- ============================================
-- POLÍTICAS PARA: subscriptions
-- ============================================

-- Los dueños pueden ver sus propias suscripciones
CREATE POLICY "Owners can view own subscriptions"
    ON subscriptions FOR SELECT
    USING (auth.uid() = owner_id);

-- Los admins pueden ver todas las suscripciones
CREATE POLICY "Admins can view all subscriptions"
    ON subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Solo admins pueden crear suscripciones
CREATE POLICY "Admins can create subscriptions"
    ON subscriptions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Solo admins pueden actualizar suscripciones
CREATE POLICY "Admins can update subscriptions"
    ON subscriptions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- ============================================
-- POLÍTICAS PARA: payments
-- ============================================

-- Los usuarios pueden ver sus propios pagos
CREATE POLICY "Users can view own payments"
    ON payments FOR SELECT
    USING (auth.uid() = payer_id);

-- Los dueños pueden ver pagos relacionados con sus venues
CREATE POLICY "Owners can view venue payments"
    ON payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bookings b
            JOIN venues v ON b.venue_id = v.id
            WHERE b.id = payments.booking_id AND v.owner_id = auth.uid()
        )
    );

-- Los admins pueden ver todos los pagos
CREATE POLICY "Admins can view all payments"
    ON payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Los usuarios pueden crear pagos para sus propias transacciones
CREATE POLICY "Users can create own payments"
    ON payments FOR INSERT
    WITH CHECK (auth.uid() = payer_id);

-- Solo admins pueden actualizar pagos
CREATE POLICY "Admins can update payments"
    ON payments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- ============================================
-- POLÍTICAS PARA: notifications
-- ============================================

-- Los usuarios pueden ver sus propias notificaciones
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias notificaciones (marcar como leídas)
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- El sistema puede crear notificaciones para cualquier usuario
-- (esto se manejará desde el backend con service_role key)
CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- Los usuarios pueden eliminar sus propias notificaciones
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- VERIFICACIÓN DE POLÍTICAS
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Este query debe mostrar todas las políticas creadas
