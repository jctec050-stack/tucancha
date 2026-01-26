-- ============================================
-- PASO 20: AGREGAR TELÉFONO A PROFILES
-- ============================================

-- 1. Agregar columna phone si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN 
        ALTER TABLE profiles ADD COLUMN phone TEXT; 
    END IF; 
END $$;

-- 2. Actualizar función handle_new_user para incluir teléfono
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'PLAYER'),
        NEW.raw_user_meta_data->>'phone' -- Puede ser NULL
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Actualizar tipos/comentarios
COMMENT ON COLUMN profiles.phone IS 'Número de teléfono del usuario (para contacto)';
