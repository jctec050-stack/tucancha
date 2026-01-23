-- ============================================
-- FIX: PERMISOS DE TRIGGER DE SUSCRIPCIÓN
-- ============================================

-- El error ocurre porque el trigger create_default_subscription intenta insertar
-- en la tabla subscriptions, pero las políticas RLS solo permiten que ADMINs inserten.
-- Como el nuevo usuario es OWNER (no ADMIN), la inserción es bloqueada.

-- SOLUCIÓN: Hacer que la función del trigger sea SECURITY DEFINER.
-- Esto hace que la función se ejecute con permisos de superusuario (postgres),
-- saltándose las políticas RLS.

CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'OWNER' THEN
        INSERT INTO public.subscriptions (
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
$$ LANGUAGE plpgsql SECURITY DEFINER; -- ✅ Agregado SECURITY DEFINER

COMMENT ON FUNCTION create_default_subscription() IS 'Crea automáticamente una suscripción FREE cuando se registra un OWNER (con permisos elevados)';
