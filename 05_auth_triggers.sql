-- ============================================
-- PASO 5: TRIGGER PARA AUTO-CREAR PROFILES
-- ============================================
-- Este trigger crea automáticamente un perfil cuando se registra un usuario

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'PLAYER')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TRIGGER PARA AUTO-CREAR SUSCRIPCIÓN FREE
-- ============================================
-- Este trigger crea automáticamente una suscripción FREE cuando se crea un OWNER

CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'OWNER' THEN
        INSERT INTO subscriptions (
            owner_id,
            plan_type,
            status,
            start_date,
            price_per_month,
            max_venues,
            max_courts_per_venue,
            features
        ) VALUES (
            NEW.id,
            'FREE',
            'ACTIVE',
            CURRENT_DATE,
            0,
            1,
            5,
            '{"analytics": false, "priority_support": false}'::jsonb
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_subscription_on_owner_signup ON profiles;
CREATE TRIGGER create_subscription_on_owner_signup
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_subscription();

COMMENT ON FUNCTION handle_new_user() IS 'Crea automáticamente un perfil cuando se registra un usuario';
COMMENT ON FUNCTION create_default_subscription() IS 'Crea automáticamente una suscripción FREE cuando se registra un OWNER';
