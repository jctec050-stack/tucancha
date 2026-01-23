-- ============================================
-- ARREGLO FINAL: CREAR BUCKETS FALTANTES
-- ============================================
-- El diagnóstico reveló que los buckets NO EXISTEN en la base de datos (Error 404).
-- Este script los crea forzadamente y aplica las políticas de acceso correctas.

-- 1. Insertar Buckets (Si no existen)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('venue-images', 'venue-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('court-images', 'court-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE 
SET public = true, file_size_limit = 5242880;

-- 2. Limpiar políticas antiguas (para evitar duplicados o conflictos)
DROP POLICY IF EXISTS "Owners can upload venue images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload venue images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view venue images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload court images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload court images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view court images" ON storage.objects;

-- 3. Aplicar Políticas Simplificadas (Permisivas para usuarios logueados)

-- venue-images
CREATE POLICY "Public can view venue images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'venue-images');

CREATE POLICY "Authenticated can upload venue images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'venue-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update venue images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'venue-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete venue images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'venue-images' AND auth.role() = 'authenticated');

-- court-images
CREATE POLICY "Public can view court images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'court-images');

CREATE POLICY "Authenticated can upload court images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'court-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update court images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'court-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete court images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'court-images' AND auth.role() = 'authenticated');
