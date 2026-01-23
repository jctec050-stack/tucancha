-- ============================================
-- PASO 2: CREAR NUEVA ESTRUCTURA DE BASE DE DATOS
-- ============================================
-- Este script crea todas las tablas, índices, triggers y funciones necesarias.

-- ============================================
-- 1. FUNCIÓN PARA ACTUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. TABLA: profiles
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('PLAYER', 'OWNER', 'ADMIN')) DEFAULT 'PLAYER',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Trigger
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. TABLA: venues (Complejos Deportivos)
-- ============================================
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    opening_hours TEXT NOT NULL,
    amenities TEXT[],
    contact_info TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_venues_owner ON venues(owner_id);
CREATE INDEX idx_venues_active ON venues(is_active);
CREATE INDEX idx_venues_location ON venues(latitude, longitude);

-- Trigger
CREATE TRIGGER update_venues_updated_at 
    BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. TABLA: courts (Canchas)
-- ============================================
CREATE TABLE courts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Padel', 'Beach Tennis', 'Tenis', 'Futbol 5', 'Futbol 7')),
    price_per_hour INTEGER NOT NULL CHECK (price_per_hour > 0),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_courts_venue ON courts(venue_id);
CREATE INDEX idx_courts_type ON courts(type);
CREATE INDEX idx_courts_active ON courts(is_active);

-- Trigger
CREATE TRIGGER update_courts_updated_at 
    BEFORE UPDATE ON courts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. TABLA: bookings (Reservas)
-- ============================================
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')) DEFAULT 'ACTIVE',
    payment_status TEXT CHECK (payment_status IN ('PENDING', 'PAID', 'REFUNDED')) DEFAULT 'PENDING',
    payment_method TEXT CHECK (payment_method IN ('CASH', 'CARD', 'TRANSFER', 'QR')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint para evitar reservas duplicadas
    CONSTRAINT unique_booking UNIQUE (court_id, date, start_time)
);

-- Índices
CREATE INDEX idx_bookings_court_date ON bookings(court_id, date);
CREATE INDEX idx_bookings_player ON bookings(player_id);
CREATE INDEX idx_bookings_venue ON bookings(venue_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(date);

-- Trigger
CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. TABLA: disabled_slots (Horarios Bloqueados)
-- ============================================
CREATE TABLE disabled_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot TIME NOT NULL,
    reason TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint para evitar bloqueos duplicados
    CONSTRAINT unique_disabled_slot UNIQUE (court_id, date, time_slot)
);

-- Índices
CREATE INDEX idx_disabled_slots_court_date ON disabled_slots(court_id, date);
CREATE INDEX idx_disabled_slots_venue ON disabled_slots(venue_id);

-- ============================================
-- 7. TABLA: subscriptions (Suscripciones)
-- ============================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE')) DEFAULT 'FREE',
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED', 'SUSPENDED')) DEFAULT 'ACTIVE',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    price_per_month INTEGER NOT NULL DEFAULT 0,
    max_venues INTEGER NOT NULL DEFAULT 1,
    max_courts_per_venue INTEGER NOT NULL DEFAULT 5,
    features JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_subscriptions_owner ON subscriptions(owner_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);

-- Trigger
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. TABLA: payments (Pagos)
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('BOOKING', 'SUBSCRIPTION')),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    payer_id UUID NOT NULL REFERENCES profiles(id),
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'PYG',
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'TRANSFER', 'QR')),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')) DEFAULT 'PENDING',
    transaction_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_type ON payments(payment_type);
CREATE INDEX idx_payments_created ON payments(created_at);

-- Trigger
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. TABLA: notifications (Notificaciones)
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('BOOKING', 'PAYMENT', 'SYSTEM', 'PROMOTION')),
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================
-- 10. VISTA MATERIALIZADA: platform_revenue
-- ============================================
CREATE MATERIALIZED VIEW platform_revenue AS
SELECT 
    v.id AS venue_id,
    v.name AS venue_name,
    v.owner_id,
    p.full_name AS owner_name,
    COUNT(DISTINCT b.id) AS total_bookings,
    COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.price ELSE 0 END), 0) AS total_revenue,
    COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.price * 0.10 ELSE 0 END), 0) AS platform_commission,
    DATE_TRUNC('month', b.created_at) AS month
FROM venues v
LEFT JOIN bookings b ON v.id = b.venue_id
LEFT JOIN profiles p ON v.owner_id = p.id
GROUP BY v.id, v.name, v.owner_id, p.full_name, DATE_TRUNC('month', b.created_at);

-- Índices en la vista materializada
CREATE INDEX idx_platform_revenue_venue ON platform_revenue(venue_id);
CREATE INDEX idx_platform_revenue_month ON platform_revenue(month);

-- ============================================
-- COMENTARIOS EN LAS TABLAS
-- ============================================
COMMENT ON TABLE profiles IS 'Perfiles de usuario extendidos de auth.users';
COMMENT ON TABLE venues IS 'Complejos deportivos';
COMMENT ON TABLE courts IS 'Canchas individuales dentro de los complejos';
COMMENT ON TABLE bookings IS 'Reservas de canchas por jugadores';
COMMENT ON TABLE disabled_slots IS 'Horarios bloqueados por los dueños';
COMMENT ON TABLE subscriptions IS 'Suscripciones de los dueños de complejos';
COMMENT ON TABLE payments IS 'Registro de todos los pagos';
COMMENT ON TABLE notifications IS 'Notificaciones para usuarios';
COMMENT ON MATERIALIZED VIEW platform_revenue IS 'Vista de ingresos por complejo para administradores';

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Este query debe mostrar todas las tablas creadas
